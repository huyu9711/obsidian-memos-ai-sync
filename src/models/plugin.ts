import { Plugin } from 'obsidian';
import { MemosPluginSettings } from './settings';

export default interface MemosSyncPlugin extends Plugin {
    settings: MemosPluginSettings;
    loadSettings(): Promise<void>;
    saveSettings(): Promise<void>;
} 