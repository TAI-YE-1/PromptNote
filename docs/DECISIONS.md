# DECISIONS — PromptNote

本文件只记录**当前仍然有效**、会影响后续实现方向的产品与架构决定。已被替代的历史方案、事故过程和阶段性实验保留在 Git 历史中，不继续占用当前权威文档。

## D001 — PromptNote 是 manual-first 文档式 Prompt 编辑器

**状态：Accepted**

用户是作者，AI 是助手。普通 AI 动作必须由用户显式触发；inline completion 是唯一允许自动请求 AI 的能力，但必须由用户单独开启。

## D002 — 第一交付形态是 Chrome / Edge Side Panel Extension

**状态：Accepted**

Side Panel 是主要编辑界面。PromptNote 不承担第三方网页 DOM 自动写入或自动发送职责。

## D003 — PromptDocument 是唯一持久正文源

**状态：Accepted**

正文只保存 PromptDocument / TipTap JSON。Plain Text、Markdown、XML、Preview、AI suggestion、lint finding、ghost completion 都是派生状态。

## D004 — Prompt 语义块使用单一 `promptSection` Node

**状态：Accepted**

不同语义通过 `promptSection.kind` 表达，不创建 goalNode、constraintNode 等平行 Node 类型。section kind 的运行时权威定义在 `src/prompt/sectionKinds.ts`。

## D005 — 本地优先，不建设 PromptNote 自有账号与后端

**状态：Accepted**

PromptDocument 和 Extension Preferences 使用浏览器扩展本地存储。新增账号、云同步或服务端能力必须先修改产品与隐私边界。

## D006 — Compiler 是纯派生层

**状态：Accepted**

Compiler 只负责 `PromptDocument → Plain / Markdown / XML`，不得修改 Editor、访问 Storage、调用 AI 或读取网页 DOM。

## D007 — 外部交付统一使用 Copy

**状态：Accepted**

不维护 Web Adapter、content script、页面 bridge、`activeTab`、`scripting` 或第三方网页输入框自动注入链路。

## D008 — AI 配置属于 Extension Preferences

**状态：Accepted**

Provider、Model、Base URL、API Key、AI 开关、补全设置与指令覆盖不进入 PromptDocument，也不进入 Prompt JSON 备份或 Compiler 输出。

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

当前运行时边界以稳定性优先。任何重新划分 Editor runtime 加载边界的改动都必须保持单一状态源，并完成真实 Chrome / Edge 验证。

## D013 — 性能优化优先代码减法，不掩盖构建信号

**状态：Accepted**

优先减少真实热路径工作、删除冗余实现和避免重复状态。不得仅为了消除 warning 调高阈值或引入难以验证的平行缓存/状态链。

## D014 — 权限与数据边界必须最小化

**状态：Accepted**

固定 Manifest 权限保持 `storage` 与 `sidePanel`。AI 地址通过 optional host permission 访问。新增权限、遥测、后端或新的数据用途前，必须先更新 `PRIVACY.md` 与相应权威文档。
