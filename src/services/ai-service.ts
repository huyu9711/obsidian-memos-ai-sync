import { GoogleGenerativeAI } from '@google/generative-ai';
import OpenAI from 'openai';
import { Notice } from 'obsidian';
import * as crypto from 'crypto';

export interface AIService {
    generateSummary(content: string, language?: string): Promise<string>;
    generateTags(content: string): Promise<string[]>;
    generateWeeklyDigest(contents: string[]): Promise<string>;
}

export const GEMINI_MODELS = {
    'Gemini 1.5 Flash': 'gemini-1.5-flash',
    'Gemini 1.5 Flash-8B': 'gemini-1.5-flash-8b',
    'Gemini 1.5 Pro': 'gemini-1.5-pro',
    'Gemini 1.0 Pro': 'gemini-1.0-pro',
    'Text Embedding': 'text-embedding-004',
    'AQA': 'aqa'
} as const;

export const OPENAI_MODELS = {
    // GPT-4o 系列
    'GPT-4o': 'gpt-4o',                    // 标准版
    'GPT-4o (2024-11-20)': 'gpt-4o-2024-11-20',  // 11月快照版本
    'GPT-4o Mini': 'gpt-4o-mini',          // 轻量级版本
    'GPT-4o Mini (2024-07-18)': 'gpt-4o-mini-2024-07-18',  // Mini 快照版本
    'GPT-4o Realtime': 'gpt-4o-realtime-preview',  // 实时预览版本
    'GPT-4o Realtime (2024-10-01)': 'gpt-4o-realtime-preview-2024-10-01',  // 实时预览快照版本
    'ChatGPT-4o Latest': 'chatgpt-4o-latest',  // ChatGPT 使用的最新版本
} as const;

export const MODEL_DESCRIPTIONS = {
    // Gemini Models
    'gemini-1.5-flash': '音频、图片、视频和文本',
    'gemini-1.5-flash-8b': '音频、图片、视频和文本',
    'gemini-1.5-pro': '音频、图片、视频和文本',
    'gemini-1.0-pro': '文本 (将于 2025 年 2 月 15 日弃用)',
    'text-embedding-004': '文本',
    'aqa': '文本',
    
    // OpenAI Models
    'gpt-4o': '标准版 GPT-4o，强大的推理能力',
    'gpt-4o-2024-11-20': '11月快照版本，稳定可靠',
    'gpt-4o-mini': '轻量级版本，性价比高',
    'gpt-4o-mini-2024-07-18': 'Mini 模型的稳定快照版本',
    'gpt-4o-realtime-preview': '实时预览版本，支持最新特性',
    'gpt-4o-realtime-preview-2024-10-01': '实时预览的稳定快照版本',
    'chatgpt-4o-latest': 'ChatGPT 使用的最新版本，持续更新'
} as const;

const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1秒

async function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function retryWithBackoff<T>(
    operation: () => Promise<T>,
    maxRetries: number = MAX_RETRIES,
    initialDelay: number = RETRY_DELAY
): Promise<T> {
    for (let i = 0; i < maxRetries; i++) {
        try {
            return await operation();
        } catch (error) {
            if (error.message.includes('429')) {
                // 配额限制错误，等待更长时间
                const delay = initialDelay * Math.pow(2, i);
                console.log(`配额限制，等待 ${delay}ms 后重试...`);
                await sleep(delay);
                continue;
            }
            if (i === maxRetries - 1) {
                throw error; // 最后一次重试失败，抛出错误
            }
            // 其他错误，继续重试
            const delay = initialDelay * Math.pow(2, i);
            console.log(`操作失败，等待 ${delay}ms 后重试...`);
            await sleep(delay);
        }
    }
    throw new Error('重试次数已达上限');
}

class GeminiService implements AIService {
    private model: any;

    constructor(apiKey: string, modelName?: string) {
        const genAI = new GoogleGenerativeAI(apiKey);
        this.model = genAI.getGenerativeModel({ model: modelName || GEMINI_MODELS['Gemini 1.5 Flash'] });
    }

    async generateSummary(content: string, language = 'zh'): Promise<string> {
        const prompt = `请用${language === 'zh' ? '中文' : 'English'}总结以下内容的要点：\n\n${content}`;
        return retryWithBackoff(async () => {
            const result = await this.model.generateContent(prompt);
            const text = result.response.text();
            return text.trim();
        });
    }

    async generateTags(content: string): Promise<string[]> {
        const prompt = `请为以下内容生成3-5个相关标签（不要带#号���：\n\n${content}`;
        return retryWithBackoff(async () => {
            const result = await this.model.generateContent(prompt);
            const text = result.response.text();
            return text.split(/[,，\s]+/).filter(Boolean);
        });
    }

    async generateWeeklyDigest(contents: string[]): Promise<string> {
        const combinedContent = contents.join('\n---\n');
        const prompt = `请对下一周的内容进行总结和分析，生成一份周报。重点关注：
1. 主要工作内容和成果
2. 重要事项和进展
3. 问题和解决方案
4. 下周计划和展望

内容：\n${combinedContent}`;
        
        return retryWithBackoff(async () => {
            const result = await this.model.generateContent(prompt);
            const text = result.response.text();
            return text.trim();
        });
    }
}

export class OpenAIService implements AIService {
    private client: OpenAI;
    private model: string;
    private encryptionKey: string;

    // 加密 API 密钥
    private encryptApiKey(apiKey: string): string {
        const iv = crypto.randomBytes(16);
        const cipher = crypto.createCipheriv('aes-256-gcm', Buffer.from(this.encryptionKey), iv);
        let encrypted = cipher.update(apiKey, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        const tag = cipher.getAuthTag();
        return `${iv.toString('hex')}:${encrypted}:${tag.toString('hex')}`;
    }

    // 解密 API 密钥
    private decryptApiKey(encryptedKey: string): string {
        const [ivHex, encrypted, tagHex] = encryptedKey.split(':');
        const iv = Buffer.from(ivHex, 'hex');
        const tag = Buffer.from(tagHex, 'hex');
        const decipher = crypto.createDecipheriv('aes-256-gcm', Buffer.from(this.encryptionKey), iv);
        decipher.setAuthTag(tag);
        let decrypted = decipher.update(encrypted, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
    }

    constructor() {
        // 生成唯一的加密密钥（在插件初始化时）
        this.encryptionKey = crypto.randomBytes(32).toString('hex');
    }

    async initialize(apiKey: string, modelName?: string) {
        try {
            if (!apiKey) {
                throw new Error('API 密钥不能为空');
            }

            // 基本的 API 密钥格式验证
            if (!apiKey.startsWith('sk-') || apiKey.length < 20) {
                throw new Error('无效的 API 密钥格式');
            }

            // 加密存储 API 密钥
            const encryptedKey = this.encryptApiKey(apiKey);
            
            this.client = new OpenAI({
                apiKey: this.decryptApiKey(encryptedKey),
                baseURL: 'https://api.openai.com/v1',
                dangerouslyAllowBrowser: true
            });

            // 验证 API 密钥
            try {
                await this.client.models.list();
            } catch (error) {
                throw new Error('API 密钥验证失败');
            }

            this.model = modelName || OPENAI_MODELS['GPT-4o'];
            console.log('OpenAI 服务初始化成功，使用模型:', this.model);
            new Notice('AI 服务初始化成功');
        } catch (error) {
            console.error('OpenAI 服务初始化失败:', error);
            new Notice('AI 服务初始化失败: ' + error.message);
            throw error;
        }
    }

    async generateSummary(content: string, language = 'zh'): Promise<string> {
        const prompt = `请用${language === 'zh' ? '中文' : 'English'}总结以下内容的要点：\n\n${content}`;
        return retryWithBackoff(async () => {
            const response = await this.client.chat.completions.create({
                model: this.model,
                messages: [{ role: 'user', content: prompt }],
                temperature: 0.7,
                max_tokens: 500
            });
            return response.choices[0]?.message?.content?.trim() || '';
        });
    }

    async generateTags(content: string): Promise<string[]> {
        const prompt = `请为以下内容生成3-5个相关标签（不要带#号）：\n\n${content}`;
        return retryWithBackoff(async () => {
            const response = await this.client.chat.completions.create({
                model: this.model,
                messages: [{ role: 'user', content: prompt }],
                temperature: 0.7,
                max_tokens: 100
            });
            const text = response.choices[0]?.message?.content || '';
            return text.split(/[,，\s]+/).filter(Boolean);
        });
    }

    async generateWeeklyDigest(contents: string[]): Promise<string> {
        const combinedContent = contents.join('\n---\n');
        const prompt = `请对以下一周的内容进行总结和分析，生成一份周报。要求：
1. 主要工作内容和成果
2. 重要事项和进展
3. 问题和解决方案
4. 下周计划和展望

内容：\n${combinedContent}`;

        return retryWithBackoff(async () => {
            const response = await this.client.chat.completions.create({
                model: this.model,
                messages: [{ role: 'user', content: prompt }],
                temperature: 0.7,
                max_tokens: 1000
            });
            return response.choices[0]?.message?.content?.trim() || '';
        });
    }
}

export function createAIService(type: string, apiKey: string, modelName?: string): AIService {
    console.log('创建 AI 服务:', type, '模型:', modelName || '默认');
    
    try {
        switch (type) {
            case 'gemini':
                return new GeminiService(apiKey, modelName);
            case 'openai':
                if (!apiKey) {
                    throw new Error('未配置 API 密钥');
                }
                return new OpenAIService(apiKey, modelName);
            default:
                console.log('使用默认的空 AI 服务');
                return createDummyAIService();
        }
    } catch (error) {
        console.error(`${type} 服务初始化失败:`, error);
        throw error; // 让上层处理错误
    }
}

export function createDummyAIService(): AIService {
    return {
        generateSummary: async () => '',
        generateTags: async () => [],
        generateWeeklyDigest: async () => ''
    };
} 