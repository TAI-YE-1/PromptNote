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

## 决策变更规则

如果要推翻 Accepted 决策：

1. 不删除旧决策；
2. 新增一条决策并标明 supersedes 哪一条；
3. 写清楚为什么原假设失效；
4. 同步更新 PRODUCT / UX / CONTRACT / ARCHITECTURE；
5. 再修改实现。

禁止直接修改代码形成事实上的架构变更，却不更新决策文档。
