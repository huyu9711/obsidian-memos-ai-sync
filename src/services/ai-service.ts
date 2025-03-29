import type { GenerativeModel } from '@google/generative-ai';
import { GoogleGenerativeAI } from '@google/generative-ai';
import OpenAI from 'openai';
import { Notice, requestUrl } from 'obsidian';
import { Logger } from './logger';

export interface AIService {
    generateSummary(content: string, language?: string): Promise<string>;
    generateTags(content: string): Promise<string[]>;
    generateWeeklyDigest(contents: string[]): Promise<string>;
    initialize(apiKey: string, modelName?: string): Promise<void>;
}

export const GEMINI_MODELS = {
    'Gemini 1.5 Flash': 'gemini-1.5-flash',
    'Gemini 1.5 Flash-8B': 'gemini-1.5-flash-8b',
    'Gemini 1.5 Pro': 'gemini-1.5-pro',
    'Gemini 1.0 Pro': 'gemini-1.0-pro',
    'Text Embedding': 'text-embedding-004',
    'AQA': 'aqa',
    '自定义模型': 'custom'  // 新增：自定义模型选项
} as const;

export const OPENAI_MODELS = {
    // GPT-4o 系列
    'GPT-4o': 'gpt-4o',
    'GPT-4o (2024-11-20)': 'gpt-4o-2024-11-20',
    'GPT-4o Mini': 'gpt-4o-mini',
    'GPT-4o Mini (2024-07-18)': 'gpt-4o-mini-2024-07-18',
    'GPT-4o Realtime': 'gpt-4o-realtime-preview',
    'GPT-4o Realtime (2024-10-01)': 'gpt-4o-realtime-preview-2024-10-01',
    'ChatGPT-4o Latest': 'chatgpt-4o-latest',
    '自定义模型': 'custom'  // 已添加
} as const;

export const OLLAMA_MODELS = {
    'Llama 2': 'llama2',
    'Mistral': 'mistral',
    'Mixtral': 'mixtral',
    'CodeLlama': 'codellama',
    'Phi': 'phi',
    'Neural Chat': 'neural-chat',
    '自定义模型': 'custom'
} as const;

export const MODEL_DESCRIPTIONS = {
    // Gemini Models
    'gemini-1.5-flash': '音频、图片、视频和文本',
    'gemini-1.5-flash-8b': '音频、图片、视频和文本',
    'gemini-1.5-pro': '音频、图片、视频和文本',
    'gemini-1.0-pro': '文本 (将于 2025 年 2 月 15 日弃用)',
    'text-embedding-004': '文本',
    'aqa': '文本',
    'custom': '自定义模型',

    // OpenAI Models
    'gpt-4o': '标准版 GPT-4o，强大的推理能力',
    'gpt-4o-2024-11-20': '11月快照版本，稳定可靠',
    'gpt-4o-mini': '轻量级版本，性价比高',
    'gpt-4o-mini-2024-07-18': 'Mini 模型的稳定快照版本',
    'gpt-4o-realtime-preview': '实时预览版本，支持最新特性',
    'gpt-4o-realtime-preview-2024-10-01': '实时预览的稳定快照版本',
    'chatgpt-4o-latest': 'ChatGPT 使用的最新版本，持续更新',

    // Ollama Models
    'llama2': 'Llama 2 - 通用大语言模型',
    'mistral': 'Mistral - 高性能开源模型',
    'mixtral': 'Mixtral - 混合专家模型',
    'codellama': 'CodeLlama - 代码生成专用模型',
    'phi': 'Phi - 轻量级模型',
    'neural-chat': 'Neural Chat - 对话优化模型'
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
            if (error instanceof Error && error.message.includes('429')) {
                // 配额限制错误，等待更长时间
                const delay = initialDelay * (2 ** i);
                // console.log(`配额限制，等待 ${delay}ms 后重试...`);
                await sleep(delay);
                continue;
            }
            if (i === maxRetries - 1) {
                throw error; // 最后一次重试失败，抛出错误
            }
            // 其他错误，继续重试
            const delay = initialDelay * (2 ** i);
            // console.log(`操作失败，等待 ${delay}ms 后重试...`);
            await sleep(delay);
        }
    }
    throw new Error('重试次数已达上限');
}

class GeminiService implements AIService {
    private model: GenerativeModel;
    private logger: Logger;

    constructor(apiKey: string, modelName?: string) {
        const genAI = new GoogleGenerativeAI(apiKey);
        this.model = genAI.getGenerativeModel({ model: modelName || GEMINI_MODELS['Gemini 1.5 Flash'] });
        this.logger = new Logger('GeminiService');
    }

    async initialize(apiKey?: string, modelName?: string): Promise<void> {
        this.logger.debug('Gemini 服务初始化成功，使用模型:', this.model);
    }

    private async handleRateLimit(error: Error, retryCount: number): Promise<number> {
        const delay = Math.min(1000 * (2 ** retryCount), 30000);
        this.logger.warn(`配额限制，等待 ${delay}ms 后重试...`);
        return delay;
    }

    private async handleError(error: Error, retryCount: number): Promise<number> {
        const delay = Math.min(1000 * (2 ** retryCount), 30000);
        this.logger.error(`操作失败，等待 ${delay}ms 后重试...`, error);
        return delay;
    }

    async generateSummary(content: string, language = 'zh'): Promise<string> {
        const prompt = `请用${language === 'zh' ? '中文' : 'English'}总结以下内容的要点：\n\n${content}`;
        return retryWithBackoff(async () => {
            const result = await this.model.generateContent(prompt);
            const response = await result.response;
            return response.text().trim();
        });
    }

    async generateTags(content: string): Promise<string[]> {
        const prompt = `请为以下内容生成3-5个相关标签（不要带#号）：\n\n${content}`;
        return retryWithBackoff(async () => {
            const result = await this.model.generateContent(prompt);
            const response = await result.response;
            return response.text().split(/[,，\s]+/).filter(Boolean);
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
            const response = await result.response;
            return response.text().trim();
        });
    }
}

export class OpenAIService implements AIService {
    private client: OpenAI;
    private model: string;
    private encryptionKey: Uint8Array;
    private logger: Logger;

    // 生成随机 IV
    private async generateIV(): Promise<Uint8Array> {
        return crypto.getRandomValues(new Uint8Array(12));
    }

    // 生成加密密钥
    private async generateKey(): Promise<CryptoKey> {
        return crypto.subtle.generateKey(
            {
                name: 'AES-GCM',
                length: 256
            },
            true,
            ['encrypt', 'decrypt']
        );
    }

    // 加密 API 密钥
    private async encryptApiKey(apiKey: string): Promise<string> {
        const iv = await this.generateIV();
        const key = await this.generateKey();
        const encodedText = new TextEncoder().encode(apiKey);

        const encryptedData = await crypto.subtle.encrypt(
            {
                name: 'AES-GCM',
                iv
            },
            key,
            encodedText
        );

        const encryptedArray = new Uint8Array(encryptedData);
        return `${this.arrayBufferToBase64(iv)}:${this.arrayBufferToBase64(encryptedArray)}:${this.arrayBufferToBase64(await crypto.subtle.exportKey('raw', key))}`;
    }

    // 解密 API 密钥
    private async decryptApiKey(encryptedKey: string): Promise<string> {
        const [ivStr, encryptedStr, keyStr] = encryptedKey.split(':');
        const iv = this.base64ToArrayBuffer(ivStr);
        const encryptedData = this.base64ToArrayBuffer(encryptedStr);
        const keyData = this.base64ToArrayBuffer(keyStr);

        const key = await crypto.subtle.importKey(
            'raw',
            keyData,
            'AES-GCM',
            true,
            ['decrypt']
        );

        const decryptedData = await crypto.subtle.decrypt(
            {
                name: 'AES-GCM',
                iv: iv
            },
            key,
            encryptedData
        );

        return new TextDecoder().decode(decryptedData);
    }

    private arrayBufferToBase64(buffer: ArrayBuffer): string {
        const bytes = new Uint8Array(buffer);
        let binary = '';
        for (let i = 0; i < bytes.byteLength; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return window.btoa(binary);
    }

    private base64ToArrayBuffer(base64: string): Uint8Array {
        const binaryString = window.atob(base64);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        return bytes;
    }

    constructor() {
        this.encryptionKey = crypto.getRandomValues(new Uint8Array(32));
        this.logger = new Logger('OpenAIService');
    }

    async initialize(apiKey?: string, modelName?: string, openaiBaseUrl?: string): Promise<void> {
        try {
            if (!apiKey) {
                throw new Error('API 密钥不能为空');
            }

            // 基本的 API 密钥格式验证
            if (!apiKey.startsWith('sk-') || apiKey.length < 20) {
                throw new Error('无效的 API 密钥格式');
            }

            // 加密存储 API 密钥
            const encryptedKey = await this.encryptApiKey(apiKey);

            this.client = new OpenAI({
                apiKey: await this.decryptApiKey(encryptedKey),
                baseURL: openaiBaseUrl,
                dangerouslyAllowBrowser: true
            });

            // 验证 API 密钥
            try {
                await this.client.models.list();
            } catch (error) {
                throw new Error('API 密钥验证失败');
            }

            // 如果是自定义模型，使用 customModelName
            this.model = modelName || OPENAI_MODELS['GPT-4o'];
            this.logger.debug('OpenAI 服务初始化成功，使用模型:', this.model);
            new Notice(`AI 服务初始化成功`);
        } catch (error) {
            this.logger.error('OpenAI 服务初始化失败:', error);
            new Notice(`AI 服务初始化失败: ${error instanceof Error ? error.message : String(error)}`);
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

class OllamaService implements AIService {
    private baseUrl: string;
    private model: string;
    private logger: Logger;

    constructor(baseUrl = 'http://localhost:11434', modelName?: string) {
        this.baseUrl = baseUrl;
        this.model = modelName || OLLAMA_MODELS['Llama 2'];
        this.logger = new Logger('OllamaService');
    }

    async initialize(apiKey?: string, modelName?: string): Promise<void> {
        this.logger.debug('Ollama 服务初始化成功，使用模型:', this.model);
    }

    private async handleRateLimit(error: Error, retryCount: number): Promise<number> {
        const delay = Math.min(1000 * (2 ** retryCount), 30000);
        this.logger.warn(`配额限制，等待 ${delay}ms 后重试...`);
        return delay;
    }

    private async handleError(error: Error, retryCount: number): Promise<number> {
        const delay = Math.min(1000 * (2 ** retryCount), 30000);
        this.logger.error(`操作失败，等待 ${delay}ms 后重试...`, error);
        return delay;
    }

    private async generateCompletion(prompt: string): Promise<string> {
        try {
            const response = await requestUrl({
                url: `${this.baseUrl}/api/generate`,
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    model: this.model,
                    prompt: prompt,
                    stream: false,
                    options: {
                        temperature: 0.7,
                        top_p: 0.9,
                        max_tokens: 1000,
                    }
                })
            });

            if (response.status !== 200) {
                throw new Error(`Ollama API error: ${response.status}`);
            }

            const data = response.json;
            return data.response;
        } catch (error) {
            this.logger.error('Ollama API error:', error);
            throw error;
        }
    }

    async generateSummary(content: string, language = 'zh'): Promise<string> {
        const prompt = `请用${language === 'zh' ? '中文' : 'English'}总结以下内容的要点：\n\n${content}`;
        return retryWithBackoff(async () => {
            const response = await this.generateCompletion(prompt);
            return response.trim();
        });
    }

    async generateTags(content: string): Promise<string[]> {
        const prompt = `请为以下内容生成3-5个相关标签（不要带#号）：\n\n${content}`;
        return retryWithBackoff(async () => {
            const response = await this.generateCompletion(prompt);
            return response.split(/[,，\s]+/).filter(Boolean);
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
            const response = await this.generateCompletion(prompt);
            return response.trim();
        });
    }
}

export function createAIService(type: string, apiKey: string, modelName?: string, openaiBaseUrl?: string): AIService {
    const serviceType = type.toLowerCase();

    switch (serviceType) {
        case 'gemini': {
            const service = new GeminiService(apiKey, modelName);
            void service.initialize(apiKey, modelName);
            return service;
        }
        case 'openai': {
            const service = new OpenAIService();
            void service.initialize(apiKey, modelName, openaiBaseUrl);
            return service;
        }
        case 'ollama': {
            const service = new OllamaService(apiKey || 'http://localhost:11434', modelName);
            void service.initialize(apiKey, modelName);
            return service;
        }
        default: {
            const service = createDummyAIService();
            void service.initialize('', '');
            return service;
        }
    }
}

export function createDummyAIService(): AIService {
    const logger = new Logger('DummyAIService');
    return {
        async generateSummary(): Promise<string> {
            logger.debug('使用空 AI 服务');
            return '';
        },
        async generateTags(): Promise<string[]> {
            logger.debug('使用空 AI 服务');
            return [];
        },
        async generateWeeklyDigest(): Promise<string> {
            logger.debug('使用空 AI 服务');
            return '';
        },
        async initialize(): Promise<void> {
            logger.debug('初始化空 AI 服务');
        }
    };
}