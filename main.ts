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
    nextPageToken?: string;
}

interface MemosPluginSettings {
    memosApiUrl: string;
    memosAccessToken: string;
    syncDirectory: string;
    syncFrequency: 'manual' | 'auto';
    autoSyncInterval: number;
    syncLimit: number;
}

const DEFAULT_SETTINGS: MemosPluginSettings = {
    memosApiUrl: '',
    memosAccessToken: '',
    syncDirectory: 'memos',
    syncFrequency: 'manual',
    autoSyncInterval: 30,
    syncLimit: 1000
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

    private async fetchAllMemos(): Promise<MemoItem[]> {
        try {
            console.log('Fetching memos from:', this.settings.memosApiUrl);
            
            const allMemos: MemoItem[] = [];
            let pageToken: string | undefined;
            const pageSize = 100; // 每页获取100条记录
            
            // 循环获取所有页面的数据，直到达到限制或没有更多数据
            while (allMemos.length < this.settings.syncLimit) {
                const url = new URL(`${this.settings.memosApiUrl}/memos`);
                url.searchParams.set('limit', pageSize.toString());
                url.searchParams.set('offset', '0');
                url.searchParams.set('rowStatus', 'NORMAL');
                url.searchParams.set('orderBy', 'createdTs');
                url.searchParams.set('orderDirection', 'DESC');
                if (pageToken) {
                    url.searchParams.set('pageToken', pageToken);
                }

                console.log('Fetching page with URL:', url.toString());
                
                const response = await fetch(url.toString(), {
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

                if (!data.memos || !Array.isArray(data.memos)) {
                    throw new Error(`Invalid response format: memos array not found\nResponse: ${responseText}`);
                }

                allMemos.push(...data.memos);
                console.log(`Fetched ${data.memos.length} memos, total: ${allMemos.length}`);

                // 如果没有下一页，或者已经达到限制，就退出
                if (!data.nextPageToken || allMemos.length >= this.settings.syncLimit) {
                    break;
                }
                pageToken = data.nextPageToken;
            }

            // 如果超过限制，只返回限制数量的条目
            const result = allMemos.slice(0, this.settings.syncLimit);
            console.log(`Returning ${result.length} memos after applying limit`);

            // 确保按创建时间倒序排序
            return result.sort((a, b) => 
                new Date(b.createTime).getTime() - new Date(a.createTime).getTime()
            );
        } catch (error) {
            if (error instanceof TypeError && error.message === 'Failed to fetch') {
                throw new Error(`Network error: Unable to connect to ${this.settings.memosApiUrl}. Please check if the URL is correct and accessible.`);
            }
            throw error;
        }
    }

    private sanitizeFileName(fileName: string): string {
        // 移除或替换不安全的字符
        return fileName
            .replace(/[\\/:*?"<>|#]/g, '_') // 替换 Windows 不允许的字符和 # 符号
            .replace(/\s+/g, ' ')           // 将多个空格替换为单个空格
            .trim();                        // 移除首尾空格
    }

    private async saveMemoToFile(memo: MemoItem) {
        const date = new Date(memo.createTime);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        
        const yearDir = `${this.settings.syncDirectory}/${year}`;
        const monthDir = `${yearDir}/${month}`;
        
        await this.ensureDirectoryExists(yearDir);
        await this.ensureDirectoryExists(monthDir);
        
        const timeStr = date.toISOString().replace(/[:.]/g, '-').slice(0, 19);
        const contentPreview = memo.content 
            ? this.sanitizeFileName(memo.content.slice(0, 20))
            : this.sanitizeFileName(memo.name.replace('memos/', ''));
        
        const fileName = this.sanitizeFileName(`${timeStr} ${contentPreview}.md`);
        const filePath = `${monthDir}/${fileName}`;
        
        let content = memo.content || '';
        
        // 处理标签：将 #tag# 格式转换为 #tag
        content = content.replace(/\#([^\#\s]+)\#/g, '#$1');
        
        if (memo.resources && memo.resources.length > 0) {
            content += '\n\n### Attachments\n';
            for (const resource of memo.resources) {
                content += `- [${resource.filename}](${this.settings.memosApiUrl.replace('/api/v1', '')}/o/r/${resource.name})\n`;
            }
        }

        // 提取标签
        const tags = (memo.content || '').match(/\#([^\#\s]+)(?:\#|\s|$)/g) || [];
        const cleanTags = tags.map(tag => tag.replace(/^\#|\#$/g, '').trim());
        
        const frontmatter = [
            '---',
            `id: ${memo.name}`,
            `created: ${memo.createTime}`,
            `updated: ${memo.updateTime}`,
            `visibility: ${memo.visibility}`,
            `type: memo`,
            cleanTags.length > 0 ? `tags: [${cleanTags.join(', ')}]` : 'tags: []',
            '---',
            '',
            content
        ].filter(line => line !== undefined).join('\n');

        try {
            const exists = await this.app.vault.adapter.exists(filePath);
            if (exists) {
                const file = this.app.vault.getAbstractFileByPath(filePath) as TFile;
                if (file) {
                    await this.app.vault.modify(file, frontmatter);
                }
            } else {
                await this.app.vault.create(filePath, frontmatter);
            }
        } catch (error) {
            console.error(`Failed to save memo to file: ${filePath}`, error);
            throw new Error(`Failed to save memo: ${error.message}`);
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

            await this.ensureDirectoryExists(this.settings.syncDirectory);
            
            const memos = await this.fetchAllMemos();
            this.displayMessage(`Found ${memos.length} memos`);

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
                    let url = value.trim();
                    if (url && !url.endsWith('/api/v1')) {
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
            .setName('Sync Limit')
            .setDesc('Maximum number of memos to sync (default: 1000)')
            .addText(text => text
                .setPlaceholder('1000')
                .setValue(String(this.plugin.settings.syncLimit))
                .onChange(async (value) => {
                    const numValue = parseInt(value);
                    if (!isNaN(numValue) && numValue > 0) {
                        this.plugin.settings.syncLimit = numValue;
                        await this.plugin.saveSettings();
                    }
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
