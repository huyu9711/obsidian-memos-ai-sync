# Memos Al Sync

# 版本更新

· 2025.03.31 支持兼容OpenAI API 的语言大模型调用。开启AI功能--选择OpenAI--选择自定义模型--输入基础url。
· 2025.02.17 首次发布 

[English](README_EN.md) | 简体中文

将 Memos 内容同步到 Obsidian 的插件，提供无缝集成体验。

# 界面预览
## 设置界面
![设置界面](/examples/example01.png)
## AI 增强
可以进行memos的总结和自动打标签，便于管理

### 原memos内容
![原memos内容](/examples/example03.png)

### AI增强后内容
![AI 增强](/examples/example02.png)

## AI 周总结
对同步的内容进行统一梳理，形成每周总结，便于review。

### AI 周总结内容
![AI 周总结](/examples/example04.png)


## 功能特点

### 核心功能
- 一键同步 Memos 内容到 Obsidian
- 支持手动和自动同步模式
- 智能的文件组织（年/月结构）
- 可自定义同步间隔
- 智能同步控制
  - 自动跳过已同步的内容
  - 基于 Memo ID 的重复检测
  - 保护已同步文件不被覆盖

### 内容处理
- 智能文件命名
  - 自动提取内容预览作为文件名
  - 智能处理特殊字符，保持文件名简洁
  - 自动移除文件名开头的特殊字符
  - 保留时间戳便于识别：`(YYYY-MM-DD HH-mm)`
- Markdown 内容优化
- 标签转换（从 Memos 格式 #tag# 到 Obsidian 格式 #tag）
- 支持图片和文件附件

### AI 增强

```
目前已实现openai、gemini、ollama调用，claude还没测试。
```

#### AI 设置说明
1. **选择 AI 提供商**
   - OpenAI
   - Google Gemini
   - Ollama（本地部署）
   - Claude（开发中）

2. **配置说明**
   - OpenAI 设置
     - API Key：填入您的 OpenAI API 密钥
     - 模型选择：支持 gpt-3.5-turbo、gpt-4 等
   - Gemini 设置
     - API Key：填入您的 Google API 密钥
     - 模型：gemini-pro
   - Ollama 设置
     - 服务器地址：例如 http://localhost:11434
     - 模型：支持 llama2、mistral 等

3. **功能开关**
   - 自动总结：对每条 memo 生成摘要
   - 智能标签：自动推荐相关标签
   - 周报生成：自动生成每周总结
   - 提示词配置：可自定义 AI 提示词（开发中）

- 自动生成内容摘要
- 智能标签推荐
- 每周内容汇总
  - 按周维度生成独立的总结文件
  - 自动跳过已存在的周总结
  - 总结文件保存在 `{year}/weekly/` 目录下
  - 包含本周亮点、统计数据和展望
- 可配置的 AI 功能

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
- 周总结文件组织
  - 目录结构：`sync_directory/YYYY/weekly/第WW周总结.md`
  - 每周一个独立的总结文件
  - 包含周数、日期范围和统计信息

### 文件组织
- 文件按年月组织: `sync_directory/YYYY/MM/`
- 资源文件存储在专门的目录中
- 文件名包含内容预览和时间戳
- 示例：`Meeting notes for project (2024-01-10 15-30).md`
- 周总结文件结构：
```
sync_directory/
├── 2024/
│   ├── 01/
│   │   ├── memo1.md
│   │   └── resources/
│   │       └── attachments...
│   ├── 02/
│   │   └── memo2.md
│   └── weekly/
│       ├── 第01周总结.md
│       ├── 第02周总结.md
│       └── 第03周总结.md
└── 2023/
    └── ...
```

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

### 可选���置
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

- **services**: 核心服务实现
  - `memos-service.ts`: 处理与 Memos API 的所���交互
  - `file-service.ts`: 处理文件系统操作和内容格式化

- **ui**: 用户界面组件
  - `settings-tab.ts`: 实现插件设置界面

## 兼容性
- 支持 Memos 版本：最高至 0.22.5
- 推荐使用 Memos v0.22.5 以获得最佳兼容性

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

## 支持我的工作

如果这个插件对您有帮助，欢迎请我喝杯咖啡 ☕️ 这会让我更有动力持续改进这个插件！

<a href="https://www.buymeacoffee.com/leoleexhu" target="_blank">
  <img src="https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png" alt="Buy Me A Coffee" style="height: 60px !important;width: 217px !important;" >
</a>

您的每一份支持都是我继续开发的动力！ 🚀