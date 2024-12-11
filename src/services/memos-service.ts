import { MemoItem } from '../models/settings';

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

            const allMemos: MemoItem[] = [];
            let pageToken: string | undefined;
            const pageSize = 100;

            // 验证 API URL 格式
            if (!this.apiUrl.includes('/api/v1')) {
                throw new Error('API URL 格式不正确，请确保包含 /api/v1');
            }

            while (allMemos.length < this.syncLimit) {
                // 使用标准的 REST API 路径
                const baseUrl = this.apiUrl;
                const url = `${baseUrl}/memos`;

                // 构建请求参数
                const params = new URLSearchParams({
                    'rowStatus': 'NORMAL',
                    'limit': pageSize.toString()
                });

                if (pageToken) {
                    params.set('offset', pageToken);
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

                console.log('响应状态:', response.status);
                const headers: { [key: string]: string } = {};
                response.headers.forEach((value, key) => {
                    headers[key] = value;
                });
                console.log('响应头:', JSON.stringify(headers, null, 2));

                const responseText = await response.text();
                console.log('原始响应内容:', responseText);

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}\n响应内容: ${responseText}`);
                }

                let data: MemosResponse;
                try {
                    data = JSON.parse(responseText);
                    console.log('解析后的响应数据:', JSON.stringify(data, null, 2));
                } catch (e) {
                    throw new Error(`JSON 解析失败: ${e.message}\n响应内容: ${responseText}`);
                }

                if (!data.memos || !Array.isArray(data.memos)) {
                    throw new Error(`响应格式无效: 未找到 memos 数组\n响应内容: ${responseText}`);
                }

                allMemos.push(...data.memos);
                console.log(`本次获取 ${data.memos.length} 条 memos，总计: ${allMemos.length}`);

                if (!data.nextPageToken || allMemos.length >= this.syncLimit) {
                    break;
                }
                pageToken = data.nextPageToken;
            }

            const result = allMemos.slice(0, this.syncLimit);
            console.log(`最终返回 ${result.length} 条 memos`);

            return result.sort((a, b) =>
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