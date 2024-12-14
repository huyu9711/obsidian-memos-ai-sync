# Change Log

All notable changes to this project will be documented in this file.

## [1.0.2] - 2024-01-13

### Fixed
- 修复了 GitHub Actions release 工作流配置
  - 移除了 `--draft` 标志，确保 release 直接发布
  - 修复了 Obsidian 插件验证器无法找到 release 的问题
- 优化了代码质量
  - 修复了类型检查相关问题
  - 改进了日志输出，减少不必要的控制台输出
  - 增强了类型安全性

### Changed
- 更新了版本相关文件
  - manifest.json: 版本号更新至 1.0.2
  - versions.json: 添加了 1.0.2 的兼容性记录
  - community-plugins.json: 确保插件信息正确

### Added
- 添加了 MIT 许可证文件
- 完善了插件发布流程的自动化

## [1.0.1] - 2024-01-12

### Added
- 初始版本发布
- 基本功能实现
  - Memos 内容同步
  - AI 增强功能
  - 基础设置界面

### Changed
- 优化了插件结构
- 完善了文档

## [1.0.0] - 2024-01-12

### Added
- 项目初始化
- 基础框架搭建