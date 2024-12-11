# Obsidian Memos Sync Plugin

将 Memos 内容同步到 Obsidian 的插件，提供无缝集成体验。

## 功能特点

### 核心功能
- 一键同步 Memos 内容到 Obsidian
- 支持手动和自动同步模式
- 智能的文件组织（年/月结构）
- 可自定义同步间隔

### 内容处理
- 清晰可读的文件命名：`content_preview (YYYY-MM-DD HH-mm).md`
- Markdown 内容优化
- 标签转换（从 Memos 格式 #tag# 到 Obsidian 格式 #tag）
- 支持图片和文件附件

### 资源管理
- 自动下载图片和附件
- 本地资源存储（组织化目录结构）
- 正确的相对路径生成
- 支持多种文件类型

### 文档结构
- 内容优先的格式设计
- 图片内联显示
- 专门的"附件"区域
- 元数据存储在可折叠的 callout 中

## 安装

1. 打开 Obsidian 设置
2. 进入社区插件并关闭安全模式
3. 点击浏览并搜索 "Memos Sync"
4. 安装插件
5. 启用插件

## 配置

### 必需设置
- **Memos API URL**: 您的 Memos 服务器 API 端点
- **Access Token**: 您的 Memos API 访问令牌
- **同步目录**: Memos 内容在 Obsidian 中的存储位置

### 可选设置
- **同步模式**: 选择手动或自动同步
- **同步间隔**: 设置自动同步的频率（如果启用）
- **同步限制**: 一次同步的最大条目数

## 使用方法

### 手动同步
1. 点击工具栏中的同步图标
2. 等待同步过程完成
3. 您的 memos 将按组织结构保存

### 自动同步
1. 在设置中启用自动同步
2. 设置您偏好的同步间隔
3. 插件将按配置自动同步

### 文件组织
- 文件按年月组织: `sync_directory/YYYY/MM/`
- 资源文件存储在专门的目录中
- 文件名包含内容预览和时间戳
- 示例：`Meeting notes for project (2024-01-10 15-30).md`

## 项目结构

```
obsidian-memos-sync/
├── src/
│   ├── models/          # 类型定义和接口
│   │   ├── settings.ts  # 设置和类型定义
│   │   └── plugin.ts    # 插件接口定义
│   ├── services/        # 核心服务实现
│   │   ├── memos-service.ts    # Memos API 服务
│   │   └── file-service.ts     # 文件处理服务
│   └── ui/             # 用户界面组件
│       └── settings-tab.ts     # 设置页面
├── main.ts            # 主插件文件
├── manifest.json      # 插件清单
└── package.json       # 项目配置
```

### 代码结构说明

- **models**: 包含所有类型定义和接口
  - `settings.ts`: 定义插件设置和数据模型
  - `plugin.ts`: 定义插件接口

- **services**: 核心功能实现
  - `memos-service.ts`: 处理与 Memos API 的所有交互
  - `file-service.ts`: 处理文件系统操作和内容格式化

- **ui**: 用户界面组件
  - `settings-tab.ts`: 实现插件设置界面

## 兼容性
- 支持 Memos 版本：最高至 0.16.3
- Memos v0.17.0 及以上版本需等待更新（由于 API 变更）
- 推荐使用 Memos v0.16.3 以获得最佳兼容性

## 故障排除

### 常见问题
1. **同步失败**
   - 检查 Memos API URL 和访问令牌
   - 确保 Obsidian 对同步目录有写入权限

2. **资源文件不加载**
   - 验证 Memos 服务器是否可访问
   - 检查网络连接
   - 确保认证正确

3. **文件组织问题**
   - 检查同步目录权限
   - 验证路径配置

## 支持

如果遇到问题或有建议：
1. 访问 [GitHub 仓库](https://github.com/leoleelxh/obsidian-memos-sync-plugin)
2. 创建 issue 并详细描述问题
3. 包含相关错误信息和配置

## 许可证

MIT
