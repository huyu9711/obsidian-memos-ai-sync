import { AIService } from './ai-service';
import { MemoItem } from '../models/settings';

export class ContentService {
    constructor(
        private aiService: AIService,
        private aiEnabled: boolean,
        private enableSummary: boolean,
        private enableTags: boolean,
        private summaryLanguage: string
    ) {}

    // 检查内容是否适合AI处理
    private isContentSuitableForAI(content: string): boolean {
        // 移除链接、图片等markdown语法
        const cleanContent = content
            .replace(/\[([^\]]*)\]\([^)]*\)/g, '') // 移除链接
            .replace(/!\[([^\]]*)\]\([^)]*\)/g, '') // 移除图片
            .replace(/```[\s\S]*?```/g, '') // 移除代码块
            .trim();

        // 如果清理后的内容少于10个字符，认为不适合AI处理
        return cleanContent.length >= 10;
    }

    // 处理单个 memo 内容
    async processMemoContent(memo: MemoItem): Promise<string> {
        let content = memo.content;
        let aiContent = '';

        // 只有在启用 AI 功能且内容适合处理时才处理
        if (this.aiEnabled && this.isContentSuitableForAI(content)) {
            // 如果启用了智能摘要
            if (this.enableSummary) {
                const summary = await this.aiService.generateSummary(content, this.summaryLanguage);
                if (summary && summary.trim()) {
                    aiContent += `> [!ai]- AI摘要\n> ${summary.replace(/\n/g, '\n> ')}\n\n`;
                }
            }

            // 如果启用了自动标签
            if (this.enableTags) {
                const tags = await this.aiService.generateTags(content);
                if (tags && tags.length > 0) {
                    aiContent += `> [!ai]- AI标签\n> ${tags.map(tag => `#${tag}`).join(' ')}\n\n`;
                }
            }
        }

        // 组合最终内容：原始内容在前，AI内容在后
        return `${content}\n\n${aiContent}`.trim();
    }

    // 生成每周汇总
    async generateWeeklyDigest(memos: MemoItem[]): Promise<string> {
        if (!this.aiEnabled) {
            return '';
        }

        // 过滤出适合AI处理的内容
        const suitableMemos = memos.filter(memo => this.isContentSuitableForAI(memo.content));
        if (suitableMemos.length === 0) {
            return '本周没有足够的内容生成摘要。';
        }

        // 按周分组
        const weekGroups = this.groupMemosByWeek(suitableMemos);
        let weeklyContent = '';

        for (const [weekKey, weekMemos] of Object.entries(weekGroups)) {
            const contents = weekMemos.map(memo => memo.content);
            const digest = await this.aiService.generateWeeklyDigest(contents);
            
            if (digest && digest.trim()) {
                weeklyContent += `# ${weekKey} 周报\n\n${digest}\n\n`;
            }
        }

        return weeklyContent || '本周没有生成摘要。';
    }

    // 将 memos 按周分组
    private groupMemosByWeek(memos: MemoItem[]): { [key: string]: MemoItem[] } {
        const groups: { [key: string]: MemoItem[] } = {};

        for (const memo of memos) {
            const date = new Date(memo.createTime);
            const year = date.getFullYear();
            const week = this.getWeekNumber(date);
            const key = `${year}-W${week.toString().padStart(2, '0')}`;

            if (!groups[key]) {
                groups[key] = [];
            }
            groups[key].push(memo);
        }

        return groups;
    }

    // 获取日期所在的周数
    private getWeekNumber(date: Date): number {
        const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
        const dayNum = d.getUTCDay() || 7;
        d.setUTCDate(d.getUTCDate() + 4 - dayNum);
        const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
        return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
    }
} 