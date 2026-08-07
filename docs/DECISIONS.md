# DECISIONS — PromptNote

本文件记录已经确认、会影响后续实现方向的重要决策。它不是会议纪要，而是防止重复争论和架构回摆的轻量 ADR 索引。

格式：`Dxxx — 标题`，包含状态、决定、原因、影响。

---

## D001 — 重新建立项目，不 Fork 现成 Prompt 平台

**状态：Accepted**

### 决定

PromptNote 从干净仓库重新实现，不直接 Fork flompt、PromptLayer 等现成平台。

### 原因

现有产品可以证明需求与交互方向，但通常包含 PromptOps、后端、模型调用、部署、市场、账号等超出 V1 的职责。直接 Fork 会继承无关代码和架构债。

### 影响

允许定向借鉴：

- SimplestPrompt 的 Chrome Side Panel / 注入思路；
- TipTap / pagescms editor 的富文本和 Slash Menu 体验；
- flompt 的 Prompt Block / Compiler 产品思路。

原则：借能力，不继承代码债。

---

## D002 — 产品名为“提词笺 / PromptNote”

**状态：Accepted**

### 决定

中文名：提词笺。

英文名：PromptNote。

### 定位语

“像写文档一样写 Prompt。”

---

## D003 — V1 是 manual-first 编辑器，不是 AI Prompt 优化器

**状态：Accepted**

### 决定

用户是作者。AI 只作为显式触发的局部辅助，不默认整篇重写，不直接覆盖正文。

### 原因

核心需求是“更舒服、更规范地自己写 Prompt”，而不是“让 AI 替我写 Prompt”。

---

## D004 — V1 使用 Chrome / Edge Extension + Side Panel

**状态：Accepted**

### 决定

浏览器 Extension 是第一交付形态，Side Panel 是主要编辑界面。

### 原因

用户主要在 ChatGPT / Claude / Gemini 等网页旁边使用 PromptNote。Side Panel 比大型悬浮编辑器更稳定，也更适合持续编辑。

### 影响

悬浮按钮可以作为打开 Side Panel 的入口，但不是独立编辑状态源。

---

## D005 — 编辑器使用 TipTap

**状态：Accepted**

### 决定

使用 TipTap / ProseMirror 作为富文本编辑内核。

### 原因

需要 WYSIWYG、Slash Menu、自定义语义块、选区操作和结构化 JSON，而不希望用户直接编辑 Markdown。

---

## D006 — PromptDocument 是唯一正文内容源

**状态：Accepted**

### 决定

正文持久化只保存 PromptDocument / TipTap JSON。

Markdown、Plain Text、XML、AI suggestion、网页输入框内容都不是第二正文源。

### 影响

所有输出必须经 Compiler 派生；输出预览不可独立编辑。

---

## D007 — Prompt 语义块使用单一 promptSection Node

**状态：Accepted**

### 决定

不同语义通过 `promptSection.kind` 表达，不创建 goalNode、constraintNode、exampleNode 等平行 Node 类型。

### 原因

减少重复 Node 实现，确保菜单、Compiler、Lint 和渲染共享同一权威 kind 定义。

---

## D008 — V1 本地优先，无后端

**状态：Accepted**

### 决定

V1 不建设账号、服务器、云数据库和同步后端。

本地持久化通过 Repository 抽象，初始实现使用 `chrome.storage.local`。

### 影响

业务组件不得直接调用 Chrome Storage API；未来若需要迁移存储，实现层可替换而不改变 PromptDocument。

---

## D009 — Compiler 独立于 UI、Storage、DOM 和 AI

**状态：Accepted**

### 决定

Compiler 只做 `PromptDocument → string` 的纯派生转换。

V1 输出：Plain Text、Markdown、XML。

### 原因

避免不同网站、不同模型和预览功能各自复制格式化逻辑。

---

## D010 — 网页差异集中在 Web Adapter

**状态：Accepted**

### 决定

ChatGPT / Claude / Gemini 等网页的 DOM 识别与插入逻辑只存在于 Adapter 层。

### 影响

Adapter 接收已编译字符串，不理解 PromptDocument，不自动发送消息。

---

## D011 — AI 只产生 Suggestion / Lint Finding

**状态：Accepted**

### 决定

AI 返回建议或检查结果；只有用户接受后，Editor command 才能修改 PromptDocument。

建议必须带来源 revision，避免应用到已经变化的正文。

---

## D012 — V1 不做 Prompt 平台化能力

**状态：Accepted**

### 决定

Prompt Marketplace、团队协作、Agent Workflow、MCP 平台、模型 Playground、A/B Test、企业权限、云同步等不进入 V1。

### 原因

这些能力会显著扩大职责，且不阻断“写 → 结构化 → 检查 → 编译 → 插入”的核心主链。

---

## D013 — P1 前先完成 P0.5 可交互 UX 原型验证

**状态：Superseded by D014**

### 决定

在正式初始化 React / Extension 代码之前，先完成一轮 Figma 可交互原型，验证 Side Panel 核心编辑体验。

原型范围以 `docs/PROTOTYPE.md` 为准。

### 原因

PromptNote 的核心差异不是技术可行性，而是“自己写 Prompt 是否舒服”。如果先进入 Extension / TipTap / Storage 实现，再发现结构块、AI suggestion、Preview 或底部操作布局不自然，会把 UX 返工扩大为代码返工。

### 影响

- `TASKS.md` 增加 P0.5，P0.5 关闭前不得开始 P1；
- 原型只验证交互，不实现真实 Schema、Storage、Compiler、Adapter 或 AI API；
- 原型确认后将结论回写 `docs/UX.md`；
- 正式代码仍从 P1 干净开始，不复制原型临时代码。

---

## D014 — P0.5 改为单文件 HTML 可交互原型

**状态：Accepted**

**Supersedes:** D013 中“使用 Figma 作为原型载体”的部分；P1 前先完成 P0.5 UX 验证的原则继续有效。

### 决定

P0.5 使用 `prototype/promptnote-prototype.html` 单文件 HTML 原型，不再依赖 Figma。

原型必须把 HTML、CSS、JavaScript 内嵌在一个文件中，可直接双击在 Chrome / Edge 打开，不依赖 Node、npm、React、CDN、后端或真实 AI API。

### 原因

- 当前不应让 Figma 额度成为 UX 验证的阻塞项；
- PromptNote 的原型需要真实模拟输入、Slash Menu、selection toolbar、suggestion、lint、preview、document switcher、insert conflict 等状态，HTML 比静态设计稿更容易直接体验；
- 单文件状态驱动原型可以保持极低依赖和低代码债；
- 使用 React / TipTap 会过早进入 P1-P3 正式实现，失去“先验证体验”的意义。

### 实现约束

- 使用单一前端状态模型和 `render()` 或等价机制驱动状态；
- 不为每个原型状态复制独立页面实现；
- AI、Lint、Compiler、Adapter 全部使用假数据或轻量模拟；
- 可以提供明确标记为 `Prototype Controls` 的评审控制区；
- P0.5 HTML 原型不是 PromptDocument Schema、正式 Compiler 或 Extension 代码的权威来源；
- 原型确认后只把 UX 结论同步到权威文档，正式代码仍从 P1 干净开始。

---

## D015 — AI 配置是扩展偏好，不属于 PromptDocument

**状态：Accepted**

### 决定

V1 的 AI Provider、Model、API Base URL、credential、启停状态和默认内容发送范围作为 Extension Preferences 独立保存。

这些配置不得写入：

- PromptDocument；
- PromptDocument JSON 导入导出；
- Compiler 输出；
- 模型专用 Prompt 副本。

### 原因

AI 是可选助手，不是正文的一部分。把 Provider 或 credential 放进 PromptDocument 会造成状态源污染、导出泄密风险和模型绑定。

### 交互约束

- Top Bar 提供轻量 `AI 未配置 / AI 已连接 / AI 已关闭` 状态入口；
- 选中文字只出现操作入口，不得自动调用 AI；
- 只有用户显式触发时才调用 Provider；
- 选区动作默认只发送选区；需要完整 Prompt 的动作必须明确提示；
- 本地 deterministic lint 不依赖 AI；AI semantic lint 是可选增强；
- AI 未配置、关闭或失败不得阻断编辑、保存、Compiler、Copy、Insert。

### 实现影响

- AI Provider 差异由统一 Adapter 处理；
- UI / Editor 不直接散落 Provider SDK 调用；
- preferences storage 与 PromptRepository 逻辑隔离；
- credential 不得出现在日志、Prompt export 或 Compiler 字符串中。

---

## D016 — Web Insert 使用通用 caret-first 语义，站点 Adapter 只做特殊兼容

**状态：Accepted**

### 决定

V1 的网页插入不再以“已有内容 → 追加整框 / 替换整框”作为主交互，也不把 ChatGPT Adapter 当作唯一插入入口。

统一语义改为：

- 有网页文本选区 → 只替换该选区；
- 有折叠 caret → 插入到 caret；
- 空输入框 → 直接插入；
- 无法恢复 caret 但目标输入框可靠 → 插入末尾并明确告知；
- 无法确定目标输入框 → 失败并要求用户先点击目标输入框；
- 永不自动发送。

标准 `input / textarea / contenteditable` 由通用 Adapter + 共享插入引擎处理；ChatGPT 等站点 Adapter 只保留必要的 selector / 特殊 DOM 发现逻辑。

### 原因

“插入”应与用户熟悉的粘贴心智一致。强制 append/replace 对话框增加操作步骤、破坏 caret 上下文，并导致 Side Panel 与 Content Script 在一次正常插入中进行不必要的多次消息往返。

同时，按站点复制完整插入算法会制造重复代码和持续 DOM 维护成本。

### 权限与性能影响

- Manifest 使用 `activeTab + scripting`，只在用户明确点击扩展图标时对当前标签页临时注入轻量 page bridge；
- 不向全部网页静态常驻 PromptNote content script；
- Side Panel 正常插入只发送一次原子 `PROMPTNOTE_INSERT_AT_CARET` 消息；Bridge 丢失时才尝试恢复注入；
- 自动保存成功后不再为每次输入重新读取全部文档列表；
- Preview/Lint 只在对应 UI 打开时计算，避免默认编辑热路径无意义重算。

### 影响

D010 的“网页差异集中在 Adapter”继续有效，但 Adapter 责任进一步收窄为目标编辑器发现/站点差异；通用 caret 写入算法只有一份。

---

## 决策变更规则

如果要推翻 Accepted 决策：

1. 不删除旧决策；
2. 新增一条决策并标明 supersedes 哪一条；
3. 写清楚为什么原假设失效；
4. 同步更新 PRODUCT / UX / CONTRACT / ARCHITECTURE；
5. 再修改实现。

禁止直接修改代码形成事实上的架构变更，却不更新决策文档。
