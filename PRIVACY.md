# PromptNote 隐私说明

最后更新：2026-08-10

本隐私说明用于 Microsoft Edge Add-ons 上发布的 PromptNote / 提词笺 1.0.0。PromptNote 是一款本地优先的 Microsoft Edge Side Panel Prompt 编辑器。本说明解释 PromptNote 会保存什么数据、什么时候访问网络、数据会发送到哪里，以及用户如何停止传输或删除本地数据。

## 1. 本地保存的数据

PromptNote 使用 Microsoft Edge 扩展提供的 `chrome.storage.local` 保存：

- 用户创建的 Prompt 文档与标题；
- 最近打开的文档信息；
- AI 辅助开关与补全偏好；
- 用户自行配置的 AI Provider、Model、API Base URL 与 API Key；
- 其他与编辑器体验有关的本地设置。

PromptNote 没有自有账号系统、云数据库、遥测服务器或 PromptNote 自有后端，因此不会把这些本地数据同步到 PromptNote 服务器。

`chrome.storage.local` 是浏览器扩展本地存储，不是专用加密保险库。用户不应把它视为高安全级别的密钥托管服务。

## 2. AI 网络请求与用户控制

AI 功能完全可选。PromptNote 只有在以下情况下才会向用户选择的 AI Provider 发送内容：

1. 用户主动执行 AI 建议、AI 检查等显式 AI 操作；
2. 用户已经配置并验证 AI 连接，并另外主动开启“编辑器内联补全”。

配置 AI 时，用户需要主动填写 Provider、Model、API Base URL 和 API Key，并由 Microsoft Edge 对对应 Provider 地址进行站点访问授权。PromptNote 不会在用户未配置和未授权 Provider 的情况下自行选择第三方 AI 服务。

请求直接发送到用户配置的 AI Provider / API Base URL，PromptNote 自身不代理这些请求，也不会收到这些请求内容。

发送范围取决于功能：

- 选区 AI 操作主要发送用户主动选中的内容；
- 全局 AI 操作可能发送当前 Prompt 的编译文本；
- 内联补全只发送当前文本块中受设置限制的局部 caret 上下文。

API Key 仅用于向用户所选择的 Provider 进行身份认证。第三方 AI Provider 如何保存、使用或处理请求内容与 API Key，由对应 Provider 的隐私政策和服务条款决定。

用户可以随时关闭“启用 AI 辅助”，停止 PromptNote 发起 AI 请求；也可以单独关闭“编辑器内联补全”，停止编辑停顿时的自动补全请求。

## 3. 网络传输安全

PromptNote 的可选公网 AI Provider 权限仅允许 `https://` 地址。

为支持用户在本机运行的模型服务，PromptNote 另外允许 `http://localhost/*` 和 `http://127.0.0.1/*` 本地回环地址。公网 `http://` Provider 不在扩展可申请的站点权限范围内。

PromptNote 不下载或执行远程 JavaScript、WASM 或其他远程可执行代码。AI Provider 返回内容仅作为文本数据处理。

## 4. 浏览器权限用途

固定权限只有：

- `storage`：保存 Prompt 文档和扩展设置；
- `sidePanel`：提供 Microsoft Edge Side Panel 编辑界面。

AI 自定义 Base URL 使用 `optional_host_permissions`。只有用户配置并使用对应 Provider 时，PromptNote 才申请访问该网络地址。

PromptNote 不请求 `activeTab`、`scripting`，也不使用 content script 向第三方网页输入框注入内容。

## 5. PromptNote 不内置的数据收集行为

PromptNote 1.0.0 没有内置：

- 用户账号或身份画像；
- 广告或广告追踪；
- 行为分析埋点；
- 第三方统计 SDK；
- PromptNote 自有遥测服务器；
- 数据经纪、出售或广告用途的数据共享；
- 跨设备云同步。

用户输入的 Prompt 可能自行包含个人信息或其他敏感内容。只有在用户主动使用对应 AI 功能时，该功能所需内容才会发送给用户选择的 AI Provider。用户应根据自己选择的 Provider 服务条款决定是否在 Prompt 中包含敏感信息。

## 6. 删除、导出与停止传输

用户可以在 PromptNote 中删除单个本地 Prompt，也可以导出 PromptDocument JSON 备份。

关闭 AI 辅助可以停止所有 AI 网络请求；关闭内联补全可以单独停止自动补全请求。

如需删除全部 PromptNote 本地数据，可以移除扩展并清除该扩展的本地数据。不同 Microsoft Edge 版本的入口名称可能略有差异。

## 7. 第三方服务

PromptNote 不指定或运营用户配置的第三方 AI Provider。用户选择使用 OpenAI-compatible、Anthropic 或其他兼容 Provider 时，相关请求受该第三方自身的隐私政策、数据保留政策和服务条款约束。

PromptNote 的源码和项目支持托管于 GitHub，用户访问 GitHub 页面时适用 GitHub 自身的隐私政策和服务条款。

## 8. 隐私说明变更

如果未来版本新增账号、云同步、遥测、PromptNote 自有后端、新的第三方数据用途或新的浏览器权限，本说明必须在对应版本发布前更新。

## 9. 联系

问题、隐私反馈与漏洞报告可通过本项目 GitHub Issues 提交：

`https://github.com/TAI-YE-1/PromptNote/issues`
