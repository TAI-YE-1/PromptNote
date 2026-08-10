# PromptNote 1.0.0 浏览器商店文案

用于 Chrome Web Store / Edge Add-ons 提交。提交时可以按商店字段长度微调，但不得改变产品事实。

## 名称

PromptNote / 提词笺

## 短描述

像写文档一样写 Prompt：结构化、检查、预览、复制，并提供可选 AI 辅助与内联补全。

## 详细描述

PromptNote 是一款本地优先的 Side Panel Prompt 编辑器。

你可以像写普通文档一样组织 Prompt，不需要先学习 Markdown、XML 或复杂 Prompt Engineering 语法。

主要能力：

- 自由富文本编辑；
- `/` 快速插入目标、背景、任务、约束、示例、输出格式、验收标准等结构块；
- 本地 Prompt Check；
- Plain Text / Markdown / XML 预览与复制；
- 多 Prompt 本地保存、JSON 备份与恢复；
- 可选 AI suggestion；
- 用户主动开启的 IDE 风格内联补全，Tab 接受、Esc 忽略；
- 支持用户自行配置 OpenAI-compatible / Anthropic Provider。

PromptNote 不向第三方网页输入框自动注入内容，也不会自动发送 Prompt。

当前版本没有 PromptNote 自有账号、后端、云数据库、广告或第三方统计 SDK。Prompt 文档与扩展设置默认保存在浏览器本地。

## 单一用途说明

PromptNote 的单一用途是：在浏览器 Side Panel 中帮助用户编写、组织、检查、预览和复制 Prompt，并在用户主动配置与启用时提供 AI 辅助。

## 权限说明

### storage

用于在浏览器本地保存 PromptDocument、最近文档和扩展设置。

### sidePanel

用于提供 PromptNote 的主要 Side Panel 编辑界面。

### optional host permissions

用户可以自行配置 AI Provider 的 API Base URL。只有使用对应 AI 功能时，PromptNote 才需要访问该 Provider 地址。

PromptNote 不使用 `activeTab`、`scripting` 或第三方网页 content script。

## 数据使用声明

- PromptNote 自身不收集、出售或共享用户数据用于广告；
- 没有 PromptNote 自有遥测 / 分析服务器；
- AI 内容仅在用户主动执行 AI 功能或主动开启内联补全时发往用户配置的第三方 Provider；
- API Key 与 AI 设置存放在浏览器扩展本地存储；
- 完整隐私政策使用仓库根目录 `PRIVACY.md` 的公开链接。

## 支持

问题、反馈与漏洞报告通过本项目 GitHub Issues 提交。
