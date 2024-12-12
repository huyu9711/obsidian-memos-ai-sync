import { Plugin, Notice } from 'obsidian';
import { MemosPluginSettings, DEFAULT_SETTINGS } from 'src/models/settings';
import { MemosSyncSettingTab } from 'src/ui/settings-tab';
import { MemosService } from 'src/services/memos-service';
import { FileService } from 'src/services/file-service';
import { ContentService } from 'src/services/content-service';
import { StatusService } from 'src/services/status-service';
import { AIService, createAIService, createDummyAIService } from 'src/services/ai-service';

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
        if (this.settings.ai.enabled && this.settings.ai.apiKey) {
            try {
                const modelName = this.settings.ai.modelName === 'custom' 
                    ? this.settings.ai.customModelName 
                    : this.settings.ai.modelName;
                    
                aiService = createAIService(
                    this.settings.ai.modelType,
                    this.settings.ai.apiKey,
                    modelName
                );
            } catch (error) {
                console.error('Failed to initialize AI service:', error);
                this.statusService.setError('AI 服务初始化失败，AI 功能将被禁用');
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
                this.statusService.updateProgress(syncCount, '正在生成每周汇总...');
                const weeklyDigest = await this.contentService.generateWeeklyDigest(memos);
                if (weeklyDigest) {
                    const weeklyDir = `${this.settings.syncDirectory}/weekly`;
                    const weeklyFile = `${weeklyDir}/weekly-digest-${new Date().toISOString().slice(0, 10)}.md`;
                    
                    if (!(await this.app.vault.adapter.exists(weeklyDir))) {
                        await this.app.vault.adapter.mkdir(weeklyDir);
                    }
                    
                    await this.app.vault.create(weeklyFile, weeklyDigest);
                }
            }

            this.statusService.setSuccess(`成功同步 ${syncCount} 条 memos`);
        } catch (error) {
            console.error('Sync failed:', error);
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