import { App, PluginSettingTab, Setting } from 'obsidian';
import type { AIModelType, MemosPluginSettings } from '../models/settings';
import type MemosSyncPlugin from '../../main';
import { GEMINI_MODELS, OPENAI_MODELS, OLLAMA_MODELS, MODEL_DESCRIPTIONS } from '../services/ai-service';

export class MemosSyncSettingTab extends PluginSettingTab {
    plugin: MemosSyncPlugin;

    constructor(app: App, plugin: MemosSyncPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const { containerEl } = this;
        containerEl.empty();

        new Setting(containerEl)
            .setName('Memos API URL')
            .setDesc('您的 Memos 服务器 API 地址,格式如：https://memose.com/api/v1 ')
            .addText(text => text
                .setPlaceholder('https://x.com/api/v1')
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

        new Setting(containerEl)
            .setName('同步目录')
            .setDesc('Memos 内容在 Obsidian 中的存储位置')
            .addText(text => text
                .setPlaceholder('例如：memos')
                .setValue(this.plugin.settings.syncDirectory)
                .onChange(async (value) => {
                    this.plugin.settings.syncDirectory = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('同步模式')
            .setDesc('选择手动同步或自动同步')
            .addDropdown(dropdown => dropdown
                .addOption('manual', '手动同步')
                .addOption('auto', '自动同步')
                .setValue(this.plugin.settings.syncFrequency)
                .onChange(async (value: 'manual' | 'auto') => {
                    this.plugin.settings.syncFrequency = value;
                    await this.plugin.saveSettings();
                    // 重新渲染以显示/隐藏自动同步间隔设置
                    this.display();
                }));

        if (this.plugin.settings.syncFrequency === 'auto') {
            new Setting(containerEl)
                .setName('同步间隔')
                .setDesc('自动同步的时间间隔（分钟）')
                .addText(text => text
                    .setPlaceholder('例如：30')
                    .setValue(String(this.plugin.settings.autoSyncInterval))
                    .onChange(async (value) => {
                        const interval = Number.parseInt(value, 10);
                        if (Number.isFinite(interval) && interval > 0) {
                            this.plugin.settings.autoSyncInterval = interval;
                            await this.plugin.saveSettings();
                        }
                    }));
        }

        new Setting(containerEl)
            .setName('同步条数')
            .setDesc('每次同步的最大条目数')
            .addText(text => text
                .setPlaceholder('例如：100')
                .setValue(String(this.plugin.settings.syncLimit))
                .onChange(async (value) => {
                    const limit = Number.parseInt(value, 10);
                    if (Number.isFinite(limit) && limit > 0) {
                        this.plugin.settings.syncLimit = limit;
                        await this.plugin.saveSettings();
                    }
                }));

        // AI 功能设置
        new Setting(containerEl)
            .setName('启用 AI 功能')
            .setDesc('开启或关闭 AI 增强功能')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.ai.enabled)
                .onChange(async (value) => {
                    this.plugin.settings.ai.enabled = value;
                    await this.plugin.saveSettings();
                    // 重新渲染以显示/隐藏相关设置
                    this.display();
                }));

        if (this.plugin.settings.ai.enabled) {
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
                        // 重新渲染以显示/隐藏相关设置
                        this.display();
                    }));

            // 只有在选择非 Ollama 模型时显示 API 密钥设置
            if (this.plugin.settings.ai.modelType !== 'ollama') {
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
            }

            // 显示特定模型的选项
            this.displayModelOptions(containerEl);

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
    }

    private displayModelOptions(containerEl: HTMLElement) {
        const modelType = this.plugin.settings.ai.modelType;

        if (modelType === 'gemini') {
            new Setting(containerEl)
                .setName('Gemini 模型')
                .setDesc('选择要使用的 Gemini 模型')
                .addDropdown(dropdown => {
                    // 添加所有模型选项
                    for (const [displayName, modelId] of Object.entries(GEMINI_MODELS)) {
                        dropdown.addOption(modelId, `${displayName} - ${MODEL_DESCRIPTIONS[modelId]}`);
                    }

                    // 设置当前值或默认值
                    const currentModel = this.plugin.settings.ai.modelName || GEMINI_MODELS['Gemini 1.5 Flash'];
                    dropdown.setValue(currentModel);

                    dropdown.onChange(async (value) => {
                        this.plugin.settings.ai.modelName = value;
                        await this.plugin.saveSettings();
                        // 重新渲染以显示/隐藏自定义模型输入框
                        this.display();
                    });
                });

            // 如果选择了自定义模型，显示输入框
            if (this.plugin.settings.ai.modelName === 'custom') {
                new Setting(containerEl)
                    .setName('自定义模型名称')
                    .setDesc('输入要使用的自定义模型名称')
                    .addText(text => text
                        .setPlaceholder('例如：gemini-pro-latest')
                        .setValue(this.plugin.settings.ai.customModelName)
                        .onChange(async (value) => {
                            this.plugin.settings.ai.customModelName = value;
                            await this.plugin.saveSettings();
                        }));
            }
        } else if (modelType === 'openai') {
            new Setting(containerEl)
                .setName('OpenAI 模型')
                .setDesc('选择要使用的 OpenAI 模型')
                .addDropdown(dropdown => {
                    // 添加所有模型选项
                    for (const [displayName, modelId] of Object.entries(OPENAI_MODELS)) {
                        dropdown.addOption(modelId, `${displayName} - ${MODEL_DESCRIPTIONS[modelId]}`);
                    }

                    // 设置当前值或默认值
                    const currentModel = this.plugin.settings.ai.modelName || OPENAI_MODELS['GPT-4o'];
                    dropdown.setValue(currentModel);

                    dropdown.onChange(async (value) => {
                        this.plugin.settings.ai.modelName = value;
                        await this.plugin.saveSettings();
                        // 重新渲染以显示/隐藏自定义模型输入框
                        this.display();
                    });
                });

            // 如果选择了自定义模型，显示输入框
            if (this.plugin.settings.ai.modelName === 'custom') {
                new Setting(containerEl)
                    .setName('自定义模型名称')
                    .setDesc('输入要使用的自定义模型名称')
                    .addText(text => text
                        .setPlaceholder('例如：gpt-4-1106-preview')
                        .setValue(this.plugin.settings.ai.customModelName)
                        .onChange(async (value) => {
                            this.plugin.settings.ai.customModelName = value;
                            await this.plugin.saveSettings();
                        }));

				new Setting(containerEl)
					.setName('OpenAI API 基础链接')
					.setDesc('如果使用自定义 API 服务，请设置对应的基础链接')
					.addText(text => text
						.setPlaceholder('https://api.openai.com/v1')
						.setValue(this.plugin.settings.ai.openaiBaseUrl || 'https://api.openai.com/v1')
						.onChange(async (value) => {
							this.plugin.settings.ai.openaiBaseUrl = value;
							await this.plugin.saveSettings();
						}));
            }

        } else if (modelType === 'claude') {
            new Setting(containerEl)
                .setName('Claude 模型')
                .setDesc('选择要使用的 Claude 模型')
                .addDropdown(dropdown => {
                    dropdown.addOption('claude-3-opus-20240229', 'Claude 3 Opus')
                        .addOption('claude-3-sonnet-20240229', 'Claude 3 Sonnet')
                        .addOption('claude-3-haiku-20240307', 'Claude 3 Haiku')
                        .addOption('custom', '自定义模型 - 自定义模型名称');

                    const currentModel = this.plugin.settings.ai.modelName || 'claude-3-opus-20240229';
                    dropdown.setValue(currentModel);

                    dropdown.onChange(async (value) => {
                        this.plugin.settings.ai.modelName = value;
                        await this.plugin.saveSettings();
                        this.display();
                    });
                });

            if (this.plugin.settings.ai.modelName === 'custom') {
                new Setting(containerEl)
                    .setName('自定义模型名称')
                    .setDesc('输入要使用的自定义模型名称')
                    .addText(text => text
                        .setPlaceholder('例如：claude-3-opus-next')
                        .setValue(this.plugin.settings.ai.customModelName)
                        .onChange(async (value) => {
                            this.plugin.settings.ai.customModelName = value;
                            await this.plugin.saveSettings();
                        }));
            }
        } else if (modelType === 'ollama') {
            // 添加 Ollama 服务地址设置
            new Setting(containerEl)
                .setName('Ollama 服务地址')
                .setDesc('设置 Ollama 服务的地址（默认为 http://localhost:11434）')
                .addText(text => text
                    .setPlaceholder('http://localhost:11434')
                    .setValue(this.plugin.settings.ai.ollamaBaseUrl)
                    .onChange(async (value) => {
                        this.plugin.settings.ai.ollamaBaseUrl = value;
                        await this.plugin.saveSettings();
                    }));

            // Ollama 模型选择
            new Setting(containerEl)
                .setName('Ollama 模型')
                .setDesc('选择要使用的 Ollama 模型')
                .addDropdown(dropdown => {
                    // 添加所有模型选项
                    for (const [displayName, modelId] of Object.entries(OLLAMA_MODELS)) {
                        if (typeof modelId === 'string') {
                            dropdown.addOption(modelId, `${displayName} - ${MODEL_DESCRIPTIONS[modelId] || modelId}`);
                        }
                    }

                    // 设置当前值或默认值
                    const defaultModel = OLLAMA_MODELS['Llama 2'] as string;
                    const currentModel = this.plugin.settings.ai.modelName || defaultModel;
                    dropdown.setValue(currentModel);

                    dropdown.onChange(async (value) => {
                        this.plugin.settings.ai.modelName = value;
                        await this.plugin.saveSettings();
                        this.display();
                    });
                });

            // 如果选择了自定义模型，显示输入框
            if (this.plugin.settings.ai.modelName === 'custom') {
                new Setting(containerEl)
                    .setName('自定义模型名称')
                    .setDesc('输入要使用的自定义模型名称')
                    .addText(text => text
                        .setPlaceholder('例如：llama2:13b')
                        .setValue(this.plugin.settings.ai.customModelName)
                        .onChange(async (value) => {
                            this.plugin.settings.ai.customModelName = value;
                            await this.plugin.saveSettings();
                        }));
            }
        }
    }
}