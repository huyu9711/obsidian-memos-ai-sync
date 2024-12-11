import { App, PluginSettingTab, Setting } from 'obsidian';
import { MemosPluginSettings, AIModelType } from '../models/settings';
import MemosSyncPlugin from '../models/plugin';
import { GEMINI_MODELS } from '../services/ai-service';

export class MemosSyncSettingTab extends PluginSettingTab {
    plugin: MemosSyncPlugin;

    constructor(app: App, plugin: MemosSyncPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const { containerEl } = this;
        containerEl.empty();

        // 基本设置
        containerEl.createEl('h2', { text: '基本设置' });
        
        new Setting(containerEl)
            .setName('Memos API URL')
            .setDesc('您的 Memos 服务器 API 地址')
            .addText(text => text
                .setPlaceholder('例如：https://demo.usememos.com/api/v1')
                .setValue(this.plugin.settings.memosApiUrl)
                .onChange(async (value) => {
                    this.plugin.settings.memosApiUrl = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('访问令牌')
            .setDesc('您的 Memos API 访问令牌')
            .addText(text => text
                .setPlaceholder('输入访问令牌')
                .setValue(this.plugin.settings.memosAccessToken)
                .onChange(async (value) => {
                    this.plugin.settings.memosAccessToken = value;
                    await this.plugin.saveSettings();
                }));

        // AI 功能设置
        containerEl.createEl('h2', { text: 'AI 功能设置' });

        new Setting(containerEl)
            .setName('启用 AI 功能')
            .setDesc('开启或关闭 AI 增强功能')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.ai.enabled)
                .onChange(async (value) => {
                    this.plugin.settings.ai.enabled = value;
                    await this.plugin.saveSettings();
                }));

        // AI 模型选择
        new Setting(containerEl)
            .setName('AI 模型')
            .setDesc('选择要使用的 AI 模型')
            .addDropdown(dropdown => dropdown
                .addOption('openai', 'OpenAI')
                .addOption('gemini', 'Google Gemini')
                .addOption('claude', 'Anthropic Claude')
                .addOption('ollama', 'Ollama')
                .setValue(this.plugin.settings.ai.modelType)
                .onChange(async (value: AIModelType) => {
                    this.plugin.settings.ai.modelType = value;
                    await this.plugin.saveSettings();
                    // 重新渲染子模型选择
                    this.display();
                }));

        // 根据选择的 AI 模型显示对应的子模型选项
        this.displayModelOptions(containerEl);

        new Setting(containerEl)
            .setName('API 密钥')
            .setDesc('您的 AI 服务 API 密钥')
            .addText(text => text
                .setPlaceholder('输入 API 密钥')
                .setValue(this.plugin.settings.ai.apiKey)
                .onChange(async (value) => {
                    this.plugin.settings.ai.apiKey = value;
                    await this.plugin.saveSettings();
                }));

        // AI 功能选项
        new Setting(containerEl)
            .setName('每周汇总')
            .setDesc('自动生成每周内容汇总')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.ai.weeklyDigest)
                .onChange(async (value) => {
                    this.plugin.settings.ai.weeklyDigest = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('自动标签')
            .setDesc('根据内容自动生成标签')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.ai.autoTags)
                .onChange(async (value) => {
                    this.plugin.settings.ai.autoTags = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('智能摘要')
            .setDesc('自动生成内容摘要')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.ai.intelligentSummary)
                .onChange(async (value) => {
                    this.plugin.settings.ai.intelligentSummary = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('摘要语言')
            .setDesc('选择摘要生成的语言')
            .addDropdown(dropdown => dropdown
                .addOption('zh', '中文')
                .addOption('en', '英文')
                .addOption('ja', '日文')
                .addOption('ko', '韩文')
                .setValue(this.plugin.settings.ai.summaryLanguage)
                .onChange(async (value: 'zh' | 'en' | 'ja' | 'ko') => {
                    this.plugin.settings.ai.summaryLanguage = value;
                    await this.plugin.saveSettings();
                }));
    }

    private displayModelOptions(containerEl: HTMLElement) {
        const modelType = this.plugin.settings.ai.modelType;
        let options: { [key: string]: string } = {};

        switch (modelType) {
            case 'gemini':
                // 使用预定义的 Gemini 模型列表
                GEMINI_MODELS.forEach(model => {
                    options[model.name] = `${model.displayName} - ${model.description}`;
                });
                break;
            case 'openai':
                options = {
                    'gpt-4-turbo-preview': 'GPT-4 Turbo',
                    'gpt-4': 'GPT-4',
                    'gpt-3.5-turbo': 'GPT-3.5 Turbo'
                };
                break;
            case 'claude':
                options = {
                    'claude-3-opus': 'Claude 3 Opus',
                    'claude-3-sonnet': 'Claude 3 Sonnet',
                    'claude-2.1': 'Claude 2.1'
                };
                break;
            case 'ollama':
                options = {
                    'llama2': 'Llama 2',
                    'mistral': 'Mistral',
                    'codellama': 'Code Llama'
                };
                break;
        }

        // 如果是 Gemini，添加模型说明
        if (modelType === 'gemini') {
            const selectedModel = GEMINI_MODELS.find(m => m.name === this.plugin.settings.ai.modelName);
            if (selectedModel) {
                containerEl.createEl('div', {
                    text: `支持的输入类型: ${selectedModel.inputTypes.join(', ')}`,
                    cls: 'setting-item-description'
                });
            }
        }

        new Setting(containerEl)
            .setName('模型版本')
            .setDesc('选择具体的模型版本')
            .addDropdown(dropdown => {
                Object.entries(options).forEach(([key, value]) => {
                    dropdown.addOption(key, value);
                });
                return dropdown
                    .setValue(this.plugin.settings.ai.modelName)
                    .onChange(async (value) => {
                        this.plugin.settings.ai.modelName = value;
                        await this.plugin.saveSettings();
                        if (modelType === 'gemini') {
                            this.display(); // 重新渲染以更新模型说明
                        }
                    });
            });
    }
} 