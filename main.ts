import { App, Plugin, PluginSettingTab, Setting, Notice, TFile } from 'obsidian';

interface MemoItem {
    name: string;
    uid: string;
    content: string;
    visibility: string;
    createTime: string;
    updateTime: string;
    displayTime: string;
    creator: string;
    rowStatus: string;
    pinned: boolean;
    resources: Array<{
        name: string;
        uid: string;
        filename: string;
        type: string;
        size: string;
        createTime: string;
    }>;
    tags: string[];
}

interface MemosResponse {
    memos: MemoItem[];
}

interface MemosPluginSettings {
    memosApiUrl: string;
    memosAccessToken: string;
    syncDirectory: string;
    syncFrequency: 'manual' | 'auto';
    autoSyncInterval: number;
}

const DEFAULT_SETTINGS: MemosPluginSettings = {
    memosApiUrl: '',
    memosAccessToken: '',
    syncDirectory: 'memos',
    syncFrequency: 'manual',
    autoSyncInterval: 30
}

export default class MemosSyncPlugin extends Plugin {
    settings: MemosPluginSettings;

    async onload() {
        await this.loadSettings();

        this.addSettingTab(new MemosSyncSettingTab(this.app, this));

        this.addRibbonIcon('sync', 'Sync Memos', async () => {
            await this.syncMemos();
        });

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
        const interval = this.settings.autoSyncInterval * 60 * 1000;
        setInterval(() => this.syncMemos(), interval);
    }

    private async fetchMemos(): Promise<MemoItem[]> {
        try {
            console.log('Fetching memos from:', this.settings.memosApiUrl);
            
            // 获取所有 memos，按创建时间倒序排列
            const response = await fetch(`${this.settings.memosApiUrl}/memos?limit=1000&orderBy=created_ts&orderDirection=DESC`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${this.settings.memosAccessToken}`,
                    'Accept': 'application/json'
                }
            });

            console.log('Response status:', response.status);
            const responseText = await response.text();
            console.log('Response text:', responseText);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}\nResponse: ${responseText}`);
            }

            let data: MemosResponse;
            try {
                data = JSON.parse(responseText);
            } catch (e) {
                throw new Error(`Failed to parse JSON response: ${e.message}\nResponse: ${responseText}`);
            }

            // 确保按创建时间倒序排序（以防 API 排序不生效）
            return data.memos.sort((a, b) => 
                new Date(b.createTime).getTime() - new Date(a.createTime).getTime()
            );
        } catch (error) {
            if (error instanceof TypeError && error.message === 'Failed to fetch') {
                throw new Error(`Network error: Unable to connect to ${this.settings.memosApiUrl}. Please check if the URL is correct and accessible.`);
            }
            throw error;
        }
    }

    private async saveMemoToFile(memo: MemoItem) {
        // 使用创建时间作为文件名的一部分
        const date = new Date(memo.createTime);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        
        // 创建年月目录结构
        const yearDir = `${this.settings.syncDirectory}/${year}`;
        const monthDir = `${yearDir}/${month}`;
        
        // 确保目录存在
        await this.ensureDirectoryExists(yearDir);
        await this.ensureDirectoryExists(monthDir);
        
        // 使用创建时间和内容前20个字符（如果有）作为文件名
        const timeStr = date.toISOString().replace(/[:.]/g, '-').slice(0, 19);
        const contentPreview = memo.content 
            ? memo.content.slice(0, 20).replace(/[\\/:*?"<>|]/g, '_').trim() 
            : memo.name.replace('memos/', '');
        const fileName = `${timeStr} ${contentPreview}.md`;
        const filePath = `${monthDir}/${fileName}`;
        
        // 构建 Markdown 内容
        let content = memo.content || '';
        
        // 如果有资源文件，添加资源链接
        if (memo.resources && memo.resources.length > 0) {
            content += '\n\n### Attachments\n';
            for (const resource of memo.resources) {
                content += `- [${resource.filename}](${this.settings.memosApiUrl.replace('/api/v1', '')}/o/r/${resource.name})\n`;
            }
        }
        
        // 添加 frontmatter
        const frontmatter = [
            '---',
            `id: ${memo.name}`,
            `created: ${memo.createTime}`,
            `updated: ${memo.updateTime}`,
            `visibility: ${memo.visibility}`,
            `type: memo`,
            memo.tags && memo.tags.length > 0 ? `tags: [${memo.tags.join(', ')}]` : 'tags: []',
            '---',
            '',
            content
        ].filter(line => line !== undefined).join('\n');

        // 检查文件是否已存在
        const exists = await this.app.vault.adapter.exists(filePath);
        if (exists) {
            // 获取现有文件
            const file = this.app.vault.getAbstractFileByPath(filePath) as TFile;
            if (file) {
                await this.app.vault.modify(file, frontmatter);
            }
        } else {
            // 创建新文件
            await this.app.vault.create(filePath, frontmatter);
        }
    }

    private async ensureDirectoryExists(dirPath: string) {
        const adapter = this.app.vault.adapter;
        if (!(await adapter.exists(dirPath))) {
            await adapter.mkdir(dirPath);
        }
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

            // 确保同步目录存在
            await this.ensureDirectoryExists(this.settings.syncDirectory);
            
            // 获取所有 memos
            const memos = await this.fetchMemos();
            this.displayMessage(`Found ${memos.length} memos`);

            // 同步每个 memo
            let syncCount = 0;
            for (const memo of memos) {
                await this.saveMemoToFile(memo);
                syncCount++;
            }

            this.displayMessage(`Successfully synced ${syncCount} memos`);
        } catch (error) {
            console.error('Sync failed:', error);
            this.displayMessage('Sync failed: ' + error.message, true);
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
            .setDesc('Enter your Memos API URL (e.g., https://your-memos-host/api/v1)')
            .addText(text => text
                .setPlaceholder('https://your-memos-host/api/v1')
                .setValue(this.plugin.settings.memosApiUrl)
                .onChange(async (value) => {
                    // 验证并标准化 URL 格式
                    let url = value.trim();
                    if (url && !url.endsWith('/api/v1')) {
                        // 如果 URL 末尾没有 /api/v1，自动添加
                        url = url.replace(/\/?$/, '/api/v1');
                        text.setValue(url);
                    }
                    this.plugin.settings.memosApiUrl = url;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Memos Access Token')
            .setDesc('Enter your Memos Access Token')
            .addText(text => text
                .setPlaceholder('your-access-token')
                .setValue(this.plugin.settings.memosAccessToken)
                .onChange(async (value) => {
                    this.plugin.settings.memosAccessToken = value;
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
