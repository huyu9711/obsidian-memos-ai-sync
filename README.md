# Obsidian Memos AI Sync

一个用于同步和增强 Memos 内容的 Obsidian 插件。

## 功能特点

- 从 Memos 服务器同步笔记到 Obsidian
- 支持多种 AI 服务（OpenAI、Gemini、Ollama）
- 自动生成标签和摘要
- 支持资源文件同步（图片和附件）
- 智能错误处理和重试机制
- 完整的日志系统

## 最新更新

- 优化了日志系统，提供更清晰的错误追踪
- 改进了类型安全性和错误处理
- 统一了中文错误消息
- 优化了 AI 服务的重试机制
- 支持开发环境和生产环境的不同日志级别

## 安装

1. 在 Obsidian 中打开设置
2. 进入第三方插件设置
3. 搜索 "Memos AI Sync"
4. 点击安装

## 配置

### Memos 设置
- API URL: 您的 Memos 服务器地址
- Access Token: Memos API 访问令牌
- 同步限制: 每次同步的最大条目数

### AI 服务设置
支持以下 AI 服务：

1. OpenAI
   - API Key
   - 可选自定义模型

2. Google Gemini
   - API Key
   - 支持多种模型选项

3. Ollama
   - 本地运行的 Ollama 服务
   - 支持多种开源模型

## 使用方法

1. 配置 Memos 和 AI 服务设置
2. 点击同步按钮开始同步
3. 笔记将按年/月分类保存
4. 支持图片和附件的自动下载

## 开发者信息

- 使用 TypeScript 开发
- 遵循 Obsidian 插件开发规范
- 完整的错误处理和日志系统
- 类型安全的代码实现

## 贡献

欢迎提交 Issue 和 Pull Request！

## 许可证

MIT License