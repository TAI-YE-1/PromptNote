# DECISIONS — PromptNote

本文件只记录**当前仍然有效**、会影响后续实现方向的产品与架构决定。已被替代的历史方案、事故过程和阶段性实验保留在 Git 历史中，不继续占用当前权威文档。

## D001 — PromptNote 是 manual-first 文档式 Prompt 编辑器

**状态：Accepted**

用户是作者，AI 是助手。普通 AI 动作必须由用户显式触发；inline completion 是唯一允许自动请求 AI 的能力，但必须由用户单独开启。

## D002 — Browser Extension 是第一交付宿主，不是产品本体边界

**状态：Accepted**

Chrome / Edge Side Panel 是 PromptNote 1.0 的第一交付形态。下一阶段允许新增 Windows Desktop Host，但 Browser 与 Desktop 必须共享同一个 Prompt 编辑核心。PromptNote 不承担第三方网页或桌面应用的自动写入 / 自动发送职责。

## D003 — PromptDocument 是唯一持久正文源

**状态：Accepted**

正文只保存 PromptDocument / TipTap JSON。Plain Text、Markdown、XML、Preview、AI suggestion、lint finding、ghost completion 都是派生状态。不同宿主只能替换 Repository 实现，不能替换正文模型。

## D004 — Prompt 语义块使用单一 `promptSection` Node

**状态：Accepted**

不同语义通过 `promptSection.kind` 表达，不创建 goalNode、constraintNode 等平行 Node 类型。section kind 的运行时权威定义在 `src/prompt/sectionKinds.ts`。

## D005 — 本地优先，不建设 PromptNote 自有账号与后端

**状态：Accepted**

PromptDocument 与设置使用宿主本地持久化。Browser 当前使用扩展本地存储；Desktop V1 使用本机应用数据存储。新增账号、云同步或服务端能力必须先修改产品与隐私边界。

## D006 — Compiler 是纯派生层

**状态：Accepted**

Compiler 只负责 `PromptDocument → Plain / Markdown / XML`，不得修改 Editor、访问 Repository、调用 AI、读取网页 DOM 或调用桌面系统 API。

## D007 — 外部交付统一使用 Copy

**状态：Accepted**

不维护 Web Adapter、content script、页面 bridge、`activeTab`、`scripting` 或第三方网页 / 桌面应用自动注入链路。

## D008 — AI 配置属于宿主 Preferences，不属于 PromptDocument

**状态：Accepted**

Provider、Model、Base URL、API Key、AI 开关、补全设置与指令覆盖不进入 PromptDocument，也不进入 Prompt JSON 备份或 Compiler 输出。宿主可以使用不同的安全存储实现，但业务语义一致。

## D009 — Inline completion 是独立的 opt-in ghost 状态

**状态：Accepted**

只有 `configured && enabled && completionEnabled` 同时成立才允许自动请求。ghost 不属于正文；`Tab` 接受后才通过 Editor transaction 写入 PromptDocument，`Esc` 忽略。

## D010 — 选区状态以 ProseMirror 为唯一权威

**状态：Accepted**

SelectionActionBar 直接消费 Editor selection snapshot。不得重新维护 DOM selection、viewport rect 或另一套选区业务状态。

## D011 — revision 同时约束持久化和异步 UI 所有权

**状态：Accepted**

Repository 拒绝旧 revision 覆盖新 revision；异步保存结果只有在 document id + revision 仍对应当前 snapshot 时才能更新保存状态。

同 ID 备份显式覆盖通过 `max(local.revision, backup.revision) + 1` rebase 后走正常保存，不建立 bypass 通道。

## D012 — PromptEditor 同步加载，非首屏 Sheet 可按需加载

**状态：Accepted**

当前运行时边界以稳定性优先。任何重新划分 Editor runtime 加载边界的改动都必须保持单一状态源。Browser 需真实 Chrome / Edge 验证；Desktop 需真实 Windows WebView2 / Tauri 验证。

## D013 — 性能优化优先代码减法，不掩盖构建信号

**状态：Accepted**

优先减少真实热路径工作、删除冗余实现和避免重复状态。不得仅为了消除 warning 调高阈值或引入难以验证的平行缓存 / 状态链。

## D014 — 权限与数据边界必须最小化

**状态：Accepted**

Browser 固定 Manifest 权限保持 `storage` 与 `sidePanel`，AI 地址通过 optional host permission 访问。Desktop 只开放实现当前 shell、持久化、SecretStore 与 AI transport 所需的最小 Tauri capability。新增权限、遥测、后端或新的数据用途前，必须先更新 `PRIVACY.md` 与相应权威文档。

## D015 — Windows Desktop runtime 固定为 Tauri 2

**状态：Accepted**

Desktop V1 使用 Tauri 2 + 现有 React / TypeScript 前端，不使用 Electron，不重写 WinUI / .NET 原生前端。Windows 10/11 x64 是 Desktop V1 首发目标；macOS、Linux、ARM64 不进入 V1。

## D016 — Browser 与 Desktop 共享一个核心，不建立双实现

**状态：Accepted**

Editor、PromptDocument、Compiler、Prompt Check、AI suggestion、inline completion 与文档业务规则共享。宿主差异仅通过最小 `PromptRepository`、`PreferencesRepository`、`SecretStore`、`AiTransport` 等合同隔离。共享核心不得直接依赖 `chrome.*` 或 Tauri API。

## D017 — Desktop 常驻形态采用 Tray + Orb + Docked Panel + Full Window

**状态：Accepted**

悬浮球是默认低干扰入口之一，不是第二编辑器。单击 Orb 展开 / 收起 Docked Panel；不使用 hover 自动展开。用户可完全隐藏 Orb，仅保留 Tray 与 Global Shortcut。状态机与关闭语义以 `DESKTOP.md` 为权威。

## D018 — Desktop V1 本地数据使用 SQLite，凭据独立安全存储

**状态：Accepted**

PromptDocument 与非敏感 Desktop 应用数据由单个应用本地 SQLite 数据库实现 Repository。API Key 等认证信息不得作为明文字段写入该数据库，也不得进入 Prompt JSON 备份；由 Desktop SecretStore 使用系统安全存储能力保存。

## D019 — Desktop V1 不做 Browser/Desktop 实时同步

**状态：Accepted**

跨宿主迁移复用现有 JSON 导出 / 导入格式，保持人工、显式、可审计。云同步、共享账号和实时同步只有在未来单独产品决策后才能加入。

## D020 — Desktop V1 不读取其他应用内容

**状态：Accepted**

V1 不实现系统级划词捕获、OCR、全局键盘记录、屏幕读取、自动读取剪贴板、自动粘贴或辅助功能注入。Global Shortcut 只负责显示 / 隐藏 PromptNote shell，不获取当前应用内容。