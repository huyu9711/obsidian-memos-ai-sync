import { App, Plugin, Notice } from 'obsidian';
import { MemosPluginSettings, DEFAULT_SETTINGS } from './src/models/settings';
import { MemosSyncSettingTab } from './src/ui/settings-tab';
import { MemosService } from './src/services/memos-service';
import { FileService } from './src/services/file-service';

export default class MemosSyncPlugin extends Plugin {
    settings: MemosPluginSettings;
    private memosService: MemosService;
    private fileService: FileService;

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
                await this.fileService.saveMemoToFile(memo);
                syncCount++;
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