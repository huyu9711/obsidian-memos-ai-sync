import { App, Plugin, Notice } from 'obsidian';
import { MemosPluginSettings, DEFAULT_SETTINGS } from './src/models/settings';
import { MemosSyncSettingTab } from './src/ui/settings-tab';
import { MemosService } from './src/services/memos-service';
import { FileService } from './src/services/file-service';
import { ContentService } from './src/services/content-service';
import { createAIService, AIService } from './src/services/ai-service';

export default class MemosSyncPlugin extends Plugin {
    settings: MemosPluginSettings;
    private memosService: MemosService;
    private fileService: FileService;
    private contentService: ContentService;

    async onload() {
        await this.loadSettings();
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

        // 初始化 AI 服务
        let aiService: AIService | null = null;
        if (this.settings.ai.enabled && this.settings.ai.apiKey) {
            try {
                aiService = createAIService(
                    this.settings.ai.modelType,
                    this.settings.ai.apiKey,
                    this.settings.ai.modelName
                );
            } catch (error) {
                console.error('Failed to initialize AI service:', error);
                new Notice('Failed to initialize AI service. AI features will be disabled.');
                this.settings.ai.enabled = false;
                this.saveSettings();
            }
        }

        this.contentService = new ContentService(
            aiService || createDummyAIService(),
            this.settings.ai.enabled && aiService !== null,
            this.settings.ai.intelligentSummary,
            this.settings.ai.autoTags,
            this.settings.ai.summaryLanguage
        );
        
        this.fileService = new FileService(
            this.app.vault,
            this.settings.syncDirectory,
            this.memosService
        );
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

    async syncMemos() {
        try {
            if (!this.settings.memosApiUrl) {
                throw new Error('Memos API URL is not configured');
            }
            if (!this.settings.memosAccessToken) {
                throw new Error('Memos Access Token is not configured');
            }

            this.displayMessage('Sync started');

            const memos = await this.memosService.fetchAllMemos();
            this.displayMessage(`Found ${memos.length} memos`);

            let syncCount = 0;
            for (const memo of memos) {
                // 使用 ContentService 处理内容
                const processedContent = await this.contentService.processMemoContent(memo);
                
                // 更新 memo 的内容
                const processedMemo = { ...memo, content: processedContent };
                
                // 保存到文件
                await this.fileService.saveMemoToFile(processedMemo);
                syncCount++;
            }

            // 如果启用了 AI 功能和每周汇总
            if (this.settings.ai.enabled && this.settings.ai.weeklyDigest) {
                const weeklyDigest = await this.contentService.generateWeeklyDigest(memos);
                if (weeklyDigest) {
                    const weeklyDir = `${this.settings.syncDirectory}/weekly`;
                    const weeklyFile = `${weeklyDir}/weekly-digest-${new Date().toISOString().slice(0, 10)}.md`;
                    
                    // 确保目录存在
                    if (!(await this.app.vault.adapter.exists(weeklyDir))) {
                        await this.app.vault.adapter.mkdir(weeklyDir);
                    }
                    
                    // 保存周报
                    await this.app.vault.create(weeklyFile, weeklyDigest);
                }
            }

            this.displayMessage(`Successfully synced ${syncCount} memos`);
        } catch (error) {
            console.error('Sync failed:', error);
            this.displayMessage(`Sync failed: ${error.message}`, true);
        }
    }

    private displayMessage(message: string, isError = false) {
        new Notice(message);
    }
}

// 创建一个空的 AI 服务实现
function createDummyAIService(): AIService {
    return {
        generateSummary: async () => '',
        generateTags: async () => [],
        generateWeeklyDigest: async () => ''
    };
}