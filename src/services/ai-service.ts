import { AIModelType } from '../models/settings';

// AI 服务接口
export interface AIService {
    generateSummary(content: string, language: string): Promise<string>;
    generateTags(content: string): Promise<string[]>;
    generateWeeklyDigest(contents: string[]): Promise<string>;
}

// AI 服务工厂
export class AIServiceFactory {
    static createService(modelType: AIModelType, apiKey: string, modelName: string): AIService {
        switch (modelType) {
            case 'openai':
                return new OpenAIService(apiKey, modelName);
            case 'gemini':
                return new GeminiService(apiKey, modelName);
            case 'claude':
                return new ClaudeService(apiKey, modelName);
            case 'ollama':
                return new OllamaService(apiKey, modelName);
            default:
                throw new Error(`Unsupported AI model type: ${modelType}`);
        }
    }
}

// OpenAI 服务实现
class OpenAIService implements AIService {
    constructor(private apiKey: string, private modelName: string) {}

    async generateSummary(content: string, language: string): Promise<string> {
        // TODO: 实现 OpenAI 的摘要生成
        return '';
    }

    async generateTags(content: string): Promise<string[]> {
        // TODO: 实现 OpenAI 的标签生成
        return [];
    }

    async generateWeeklyDigest(contents: string[]): Promise<string> {
        // TODO: 实现 OpenAI 的周报生成
        return '';
    }
}

// Gemini 服务实现
class GeminiService implements AIService {
    constructor(private apiKey: string, private modelName: string) {}

    async generateSummary(content: string, language: string): Promise<string> {
        // TODO: 实现 Gemini 的摘要生成
        return '';
    }

    async generateTags(content: string): Promise<string[]> {
        // TODO: 实现 Gemini 的标签生成
        return [];
    }

    async generateWeeklyDigest(contents: string[]): Promise<string> {
        // TODO: 实现 Gemini 的周报生成
        return '';
    }
}

// Claude 服务实现
class ClaudeService implements AIService {
    constructor(private apiKey: string, private modelName: string) {}

    async generateSummary(content: string, language: string): Promise<string> {
        // TODO: 实现 Claude 的摘要生成
        return '';
    }

    async generateTags(content: string): Promise<string[]> {
        // TODO: 实现 Claude 的标签生成
        return [];
    }

    async generateWeeklyDigest(contents: string[]): Promise<string> {
        // TODO: 实现 Claude 的周报生成
        return '';
    }
}

// Ollama 服务实现
class OllamaService implements AIService {
    constructor(private apiKey: string, private modelName: string) {}

    async generateSummary(content: string, language: string): Promise<string> {
        // TODO: 实现 Ollama 的摘要生成
        return '';
    }

    async generateTags(content: string): Promise<string[]> {
        // TODO: 实现 Ollama 的标签生成
        return [];
    }

    async generateWeeklyDigest(contents: string[]): Promise<string> {
        // TODO: 实现 Ollama 的周报生成
        return '';
    }
} 