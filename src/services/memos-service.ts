import type { MemoItem } from '../models/settings';

export interface MemosResponse {
    memos: MemoItem[];
    nextPageToken?: string;
}

export class MemosService {
    constructor(
        private apiUrl: string,
        private accessToken: string,
        private syncLimit: number
    ) {}

    async fetchAllMemos(): Promise<MemoItem[]> {
        try {
            console.log('开始获取 memos，API URL:', this.apiUrl);
            console.log('Access Token:', this.accessToken ? '已设置' : '未设置');
            console.log('同步限制:', this.syncLimit, '条');

            const allMemos: MemoItem[] = [];
            let pageToken: string | undefined;
            const pageSize = Math.min(100, this.syncLimit);

            // 验证 API URL 格式
            if (!this.apiUrl.includes('/api/v1')) {
                throw new Error('API URL 格式不正确，请确保包含 /api/v1');
            }

            do {
                const baseUrl = this.apiUrl;
                const url = `${baseUrl}/memos`;

                // 构建请求参数
                const params = new URLSearchParams({
                    'rowStatus': 'NORMAL',
                    'limit': pageSize.toString()
                });

                if (pageToken) {
                    params.set('pageToken', pageToken);
                }

                const finalUrl = `${url}?${params.toString()}`;
                console.log('请求 URL:', finalUrl);

                const response = await fetch(finalUrl, {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${this.accessToken}`,
                        'Accept': 'application/json'
                    }
                });

                if (!response.ok) {
                    const responseText = await response.text();
                    throw new Error(`HTTP ${response.status}: ${response.statusText}\n响应内容: ${responseText}`);
                }

                const responseData = await response.json();
                console.log('API 响应数据:', responseData);

                if (!responseData || !Array.isArray(responseData.memos)) {
                    throw new Error('响应格式无效: 返回数据不包含 memos 数组');
                }

                const memos = responseData.memos;
                pageToken = responseData.nextPageToken;

                if (memos.length === 0) {
                    break; // 没有更多数据了
                }

                // 只添加需要的数量
                const remainingCount = this.syncLimit - allMemos.length;
                const neededCount = Math.min(memos.length, remainingCount);
                allMemos.push(...memos.slice(0, neededCount));
                console.log(`本次获取 ${neededCount} 条 memos，总计: ${allMemos.length}/${this.syncLimit}`);

                // 如果已经达到同步限制或没有下一页，就退出
                if (allMemos.length >= this.syncLimit || !pageToken) {
                    break;
                }

            } while (true);

            console.log(`最终返回 ${allMemos.length} 条 memos`);
            return allMemos.sort((a, b) => 
                new Date(b.createTime).getTime() - new Date(a.createTime).getTime()
            );
        } catch (error) {
            console.error('获取 memos 失败:', error);
            if (error instanceof TypeError && error.message === 'Failed to fetch') {
                throw new Error(`网络错误: 无法连接到 ${this.apiUrl}。请检查 URL 是否正确且可访问。`);
            }
            throw error;
        }
    }

    async downloadResource(resource: { name: string; filename: string; type?: string }): Promise<ArrayBuffer | null> {
        try {
            const resourceId = resource.name.split('/').pop() || resource.name;
            const resourceUrl = `${this.apiUrl.replace('/api/v1', '')}/file/resources/${resourceId}/${encodeURIComponent(resource.filename)}`;

            console.log(`Downloading resource: ${resourceUrl}`);

            const response = await fetch(resourceUrl, {
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`
                }
            });

            if (!response.ok) {
                console.error(`Failed to download resource: ${response.status} ${response.statusText}`);
                return null;
            }

            return await response.arrayBuffer();
        } catch (error) {
            console.error('Error downloading resource:', error);
            return null;
        }
    }
} 