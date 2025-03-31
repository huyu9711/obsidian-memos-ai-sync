import { Plugin, Notice } from 'obsidian';
import type { MemosPluginSettings } from 'src/models/settings';
import { DEFAULT_SETTINGS } from 'src/models/settings';
import { MemosSyncSettingTab } from 'src/ui/settings-tab';
import { MemosService } from 'src/services/memos-service';
import { FileService } from 'src/services/file-service';
import { ContentService } from 'src/services/content-service';
import { StatusService } from 'src/services/status-service';
import type { AIService } from 'src/services/ai-service';
import { createAIService, createDummyAIService } from 'src/services/ai-service';

export default class MemosSyncPlugin extends Plugin {
    settings: MemosPluginSettings;
    private memosService: MemosService;
    private fileService: FileService;
    private contentService: ContentService;
    private statusService: StatusService;

    async onload() {
        await this.loadSettings();

        // 创建状态栏项
        const statusBarItem = this.addStatusBarItem();
        this.statusService = new StatusService(statusBarItem);

        this.initializeServices();

        this.addSettingTab(new MemosSyncSettingTab(this.app, this));

        this.addRibbonIcon('sync', 'Sync Memos', async () => {
            await this.syncMemos();
        });

        if (this.settings.syncFrequency === 'auto') {
            this.initializeAutoSync();
        }
    }

    private initializeServices() {
        this.memosService = new MemosService(
            this.settings.memosApiUrl,
            this.settings.memosAccessToken,
            this.settings.syncLimit
        );

        let aiService: AIService | null = null;
        if (this.settings.ai.enabled) {
            try {
                // 如果选择了自定义模型，使用自定义模型名称
                const modelName = this.settings.ai.modelName === 'custom'
                    ? this.settings.ai.customModelName
                    : this.settings.ai.modelName;

                // 对于 Ollama，使用 ollamaBaseUrl 作为 apiKey
                const apiKey = this.settings.ai.modelType === 'ollama'
                    ? this.settings.ai.ollamaBaseUrl
                    : this.settings.ai.apiKey;

                if (this.settings.ai.modelType !== 'ollama' && !apiKey) {
                    aiService = createDummyAIService();
                    this.statusService.setWarning('AI 服务需要配置 API 密钥，请在设置中完成配置');
                } else {
                    aiService = createAIService(
                        this.settings.ai.modelType,
                        apiKey,
                        modelName,
                        this.settings.ai.openaiBaseUrl,
                    );
                }
            } catch (error) {
                console.error('Failed to initialize AI service:', error);
                this.statusService.setWarning('AI 服务初始化失败，请检查配置');
                // 不禁用 AI 功能，使用空服务
                aiService = createDummyAIService();
            }
        }

        this.contentService = new ContentService(
            aiService || createDummyAIService(),
            this.settings.ai.enabled && aiService !== null,
            this.settings.ai.intelligentSummary,
            this.settings.ai.autoTags,
            this.settings.ai.summaryLanguage,
            this.app.vault,
            this.settings.syncDirectory
        );

        this.fileService = new FileService(
            this.app.vault,
            this.settings.syncDirectory,
            this.memosService
        );
    }

    async syncMemos() {
        try {
            if (!this.settings.memosApiUrl) {
                throw new Error('未配置 Memos API URL');
            }
            if (!this.settings.memosAccessToken) {
                throw new Error('未配置访问令牌');
            }

            this.statusService.startSync(0);
            const memos = await this.memosService.fetchAllMemos();
            this.statusService.startSync(memos.length);

            let syncCount = 0;
            for (const memo of memos) {
                const processedContent = await this.contentService.processMemoContent(memo);
                const processedMemo = { ...memo, content: processedContent };
                await this.fileService.saveMemoToFile(processedMemo);
                syncCount++;
                this.statusService.updateProgress(syncCount);
            }

            if (this.settings.ai.enabled && this.settings.ai.weeklyDigest) {
                this.statusService.updateProgress(syncCount, '正在生成每周总结...');
                await this.contentService.generateWeeklyDigest(memos);
            }

            this.statusService.setSuccess(`同步完成，共同步 ${syncCount} 条记录`);
        } catch (error) {
            console.error('同步失败:', error);
            this.statusService.setError(error.message);
        }
    }

    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }

    async saveSettings() {
        await this.saveData(this.settings);
        this.initializeServices();
    }

    private initializeAutoSync() {
        const interval = this.settings.autoSyncInterval * 60 * 1000;
        setInterval(() => this.syncMemos(), interval);
    }
}