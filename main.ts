import { App, Plugin, PluginSettingTab, Setting, Notice } from 'obsidian';

interface MemosPluginSettings {
    memosApiUrl: string;
    syncDirectory: string;
    syncFrequency: 'manual' | 'auto';
    autoSyncInterval: number; // in minutes
}

const DEFAULT_SETTINGS: MemosPluginSettings = {
    memosApiUrl: '',
    syncDirectory: 'memos',
    syncFrequency: 'manual',
    autoSyncInterval: 30
}

export default class MemosSyncPlugin extends Plugin {
    settings: MemosPluginSettings;

    async onload() {
        await this.loadSettings();

        // Add settings tab
        this.addSettingTab(new MemosSyncSettingTab(this.app, this));

        // Add ribbon icon for manual sync
        this.addRibbonIcon('sync', 'Sync Memos', async () => {
            await this.syncMemos();
        });

        // Initialize auto sync if enabled
        if (this.settings.syncFrequency === 'auto') {
            this.initializeAutoSync();
        }
    }

    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }

    async saveSettings() {
        await this.saveData(this.settings);
    }

    private initializeAutoSync() {
        // Set up interval for auto sync
        const interval = this.settings.autoSyncInterval * 60 * 1000; // Convert to milliseconds
        setInterval(() => this.syncMemos(), interval);
    }

    async syncMemos() {
        try {
            // Ensure sync directory exists
            await this.ensureSyncDirectoryExists();
            
            // TODO: Implement sync logic
            // 1. Fetch memos from API
            // 2. Convert to markdown
            // 3. Save to sync directory
            
            // Temporary notification for testing
            this.displayMessage('Sync started');
        } catch (error) {
            console.error('Sync failed:', error);
            this.displayMessage('Sync failed: ' + error.message, true);
        }
    }

    private async ensureSyncDirectoryExists() {
        const adapter = this.app.vault.adapter;
        const dirPath = this.settings.syncDirectory;
        
        if (!(await adapter.exists(dirPath))) {
            await adapter.mkdir(dirPath);
        }
    }

    private displayMessage(message: string, isError = false) {
        new Notice(message);
    }
}

class MemosSyncSettingTab extends PluginSettingTab {
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
            .setDesc('Enter your Memos API URL')
            .addText(text => text
                .setPlaceholder('https://your-memos-instance/api')
                .setValue(this.plugin.settings.memosApiUrl)
                .onChange(async (value) => {
                    this.plugin.settings.memosApiUrl = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Sync Directory')
            .setDesc('Directory where memos will be synced')
            .addText(text => text
                .setPlaceholder('memos')
                .setValue(this.plugin.settings.syncDirectory)
                .onChange(async (value) => {
                    this.plugin.settings.syncDirectory = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Sync Frequency')
            .setDesc('Choose how often to sync')
            .addDropdown(dropdown => dropdown
                .addOption('manual', 'Manual')
                .addOption('auto', 'Automatic')
                .setValue(this.plugin.settings.syncFrequency)
                .onChange(async (value: 'manual' | 'auto') => {
                    this.plugin.settings.syncFrequency = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Auto Sync Interval')
            .setDesc('How often to sync (in minutes) when auto sync is enabled')
            .addText(text => text
                .setPlaceholder('30')
                .setValue(String(this.plugin.settings.autoSyncInterval))
                .onChange(async (value) => {
                    const numValue = parseInt(value);
                    if (!isNaN(numValue) && numValue > 0) {
                        this.plugin.settings.autoSyncInterval = numValue;
                        await this.plugin.saveSettings();
                    }
                }));
    }
}
