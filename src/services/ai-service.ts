import { GoogleGenerativeAI } from '@google/generative-ai';

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

export const MODEL_DESCRIPTIONS = {
    'gemini-1.5-flash': '音频、图片、视频和文本',
    'gemini-1.5-flash-8b': '音频、图片、视频和文本',
    'gemini-1.5-pro': '音频、图片、视频和文本',
    'gemini-1.0-pro': '文本 (将于 2025 年 2 月 15 日弃用)',
    'text-embedding-004': '文本',
    'aqa': '文本'
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
        const prompt = `请为以下内容生成3-5个相关标签（不要带#号）：\n\n${content}`;
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

export function createAIService(type: string, apiKey: string, modelName?: string): AIService {
    switch (type) {
        case 'gemini':
            return new GeminiService(apiKey, modelName);
        default:
            return createDummyAIService();
    }
}

export function createDummyAIService(): AIService {
    return {
        generateSummary: async () => '',
        generateTags: async () => [],
        generateWeeklyDigest: async () => ''
    };
} 