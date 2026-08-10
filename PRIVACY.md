# PromptNote 隐私说明

最后更新：2026-08-10

PromptNote / 提词笺是一款本地优先的 Chrome / Edge Side Panel Prompt 编辑器。本说明解释 PromptNote 在 V1.0 中会保存什么数据、什么时候会访问网络，以及如何删除数据。

## 1. 本地保存的数据

PromptNote 使用浏览器扩展提供的 `chrome.storage.local` 保存：

- 用户创建的 Prompt 文档与标题；
- 最近打开的文档信息；
- AI 辅助开关与补全偏好；
- 用户自行配置的 AI Provider、Model、API Base URL 与 API Key；
- 其他与编辑器体验有关的本地设置。

PromptNote V1.0 没有账号系统、云数据库或 PromptNote 自有后端，因此不会把上述数据同步到 PromptNote 自有服务器。

`chrome.storage.local` 是浏览器本地扩展存储，不是专用加密保险库。请不要把它视为高安全级别的密钥托管服务。

## 2. AI 网络请求

PromptNote 只有在以下情况下才会把内容发送到网络：

1. 用户主动执行 AI 建议、AI 检查等显式 AI 操作；或
2. 用户已经配置 AI，并主动开启“编辑器内联补全”。

请求会直接发送到用户在 PromptNote 中配置的 AI Provider / API Base URL。PromptNote 自身不代理这些请求，也没有中转服务器。

发送范围取决于功能：

- 选区 AI 操作主要发送用户主动选中的内容；
- 全局 AI 操作可能发送当前 Prompt 的编译文本；
- 内联补全只发送当前文本块中、受用户设置限制的局部 caret 上下文，不会为了补全自动上传整个文档库。

第三方 AI Provider 如何处理请求内容与 API Key，由对应 Provider 的隐私政策和服务条款决定。

## 3. 权限用途

PromptNote V1.0 的固定浏览器权限只有：

- `storage`：保存 Prompt 文档和扩展设置；
- `sidePanel`：提供浏览器侧边栏编辑界面。

AI 自定义 Base URL 使用 `optional_host_permissions`。只有用户配置并使用对应 Provider 时，PromptNote 才需要访问该网络地址。

PromptNote 不请求 `activeTab`、`scripting`，也不使用 content script 向 ChatGPT、Claude、Gemini 或其他第三方网页输入框注入内容。

## 4. 不收集的数据

PromptNote V1.0 没有内置：

- 用户账号或身份画像；
- 广告或广告追踪；
- 行为分析埋点；
- 第三方统计 SDK；
- PromptNote 自有遥测服务器；
- 跨设备云同步。

## 5. 删除与导出

用户可以在 PromptNote 中删除单个本地 Prompt，也可以导出 PromptDocument JSON 备份。

如需删除 PromptNote 在浏览器中的全部本地数据，可以移除扩展并清除该扩展的站点/扩展数据。不同浏览器版本的入口名称可能略有差异。

## 6. 变更

如果未来版本新增账号、云同步、遥测、PromptNote 自有后端或新的数据用途，本隐私说明必须在对应版本发布前更新。

## 7. 联系

问题、隐私反馈与漏洞报告可通过本项目 GitHub 仓库提交 Issue。