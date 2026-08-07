# TASKS — PromptNote V1

本文件是 PromptNote V1 **唯一开发任务账本**。

规则：

- 只有实现、真实调用方、必要测试、必要文档全部闭合后才能标记完成；
- 不在其他文档维护平行 TODO 清单；
- 新发现的 V1 工作先归入这里，再实施；
- PRODUCT 明确的 Non-goals 不得偷偷进入本账本；
- `partial` 不等于完成；
- 高成本全量验证放在高风险包或 V1 收口时，不为每个小任务重复执行。

状态：`[ ]` 未完成，`[x]` 完成，`[-]` 明确取消/移出 V1。

---

## P0 — 项目基线与防漂移文档

- [x] P0-01 建立 `README.md`，固定定位、V1 主链、Non-goals 与权威文档顺序。
- [x] P0-02 建立 `docs/PRODUCT.md`，固定产品目标、场景、边界与成功标准。
- [x] P0-03 建立 `docs/UX.md`，固定编辑、Slash Menu、AI suggestion、Compiler 与插入主链。
- [x] P0-04 建立 `docs/PROMPT-DOCUMENT-CONTRACT.md`，固定唯一内容源与 Schema 边界。
- [x] P0-05 建立 `docs/ARCHITECTURE.md`，固定模块职责、依赖方向和状态边界。
- [x] P0-06 建立 `docs/DECISIONS.md`，记录初始关键决策。
- [x] P0-07 建立 `TASKS.md` 唯一任务账本。
- [x] P0-08 建立 `AGENTS.md` AI 开发协作规则。

**关闭标准：** 8 个文件都存在，引用关系一致，无业务代码。

---

## P0.5 — 单文件 HTML 可交互 UX 原型验证

- [x] P0.5-01 建立 `docs/PROTOTYPE.md`，固定原型目标、范围、状态与验收标准。
- [x] P0.5-02 建立 `prototype/promptnote-prototype.html` 单文件原型；HTML/CSS/JS 全部内嵌，无 Node、React、CDN、后端依赖。
- [x] P0.5-03 完成约 440px 基准 Side Panel 主界面及 Empty / Writing / Slash Menu / Structured 四个核心编辑状态。
- [x] P0.5-04 完成 Selection Toolbar 与 AI Suggestion 接受/忽略/过期状态，AI 使用预置假数据。
- [x] P0.5-05 完成 Prompt Check / Lint finding 状态，不引入 Prompt 分数，不实现正式 lint 引擎。
- [x] P0.5-06 完成 Plain / Markdown / XML Preview，只读且不形成第二编辑入口。
- [x] P0.5-07 完成轻量 Document Switcher，不引入文件夹/团队/市场等平台化能力。
- [x] P0.5-08 完成 Insert 正常、目标输入已有内容、Adapter 失败→Copy 三种模拟状态；不得操作真实 ChatGPT DOM。
- [x] P0.5-09 使用统一 `state + render()` 或等价单状态模型跑通“自然书写 → Slash 结构化 → AI 建议 → Check → Preview → Insert”的可点击主链，不为各状态复制独立页面实现。
- [x] P0.5-10 增加仅用于评审的 Prototype Controls：重置、快速状态跳转、360/440/520 宽度、Adapter 可用性和输入冲突模拟。
- [ ] P0.5-11 在 Chrome 与 Edge 本地打开原型，检查完整主链、360/440/520 宽度及浏览器控制台无 JavaScript error。
- [ ] P0.5-12 按 `docs/PROTOTYPE.md` 8 条验收问题进行人工体验复核并记录结论。
- [ ] P0.5-13 将确认后的交互结论同步回 `docs/UX.md`；如产品边界变化，同步 PRODUCT / DECISIONS。

**关闭标准：** 单个 HTML 文件可直接打开并完整点击验证；用户原文与 AI 建议边界清楚；结构块仍具有文档感；360px 窄宽度主链可用；Chrome/Edge 控制台无 JavaScript error；没有引入 PRODUCT Non-goals。P0.5 关闭后才开始 P1 正式代码，原型代码不得直接复制进生产实现。

---

## P1 — 最小 Extension 骨架

- [ ] P1-01 初始化 React + TypeScript 项目，保持依赖最小化。
- [ ] P1-02 配置 Chrome Manifest V3。
- [ ] P1-03 建立 Side Panel 页面并可从扩展入口打开。
- [ ] P1-04 建立最小 background service worker，只保留 Extension 生命周期/消息职责。
- [ ] P1-05 建立最小 content script 与受控消息桥。
- [ ] P1-06 建立 TypeScript、lint、format、unit test 基线。
- [ ] P1-07 增加开发态构建与本地加载说明。
- [ ] P1-08 验证 Chrome 与 Edge 至少各完成一次手动加载。

**关闭标准：** 扩展可安装、Side Panel 可打开、无 Prompt 业务逻辑重复进入 background/content script。

---

## P2 — PromptDocument 与本地持久化

- [ ] P2-01 实现 `PromptDocument` V1 权威 TypeScript Schema。
- [ ] P2-02 实现 `promptSection.kind` 单一权威定义。
- [ ] P2-03 实现 schemaVersion 校验，未知版本 fail-closed，不静默猜测。
- [ ] P2-04 实现 `PromptRepository` 接口。
- [ ] P2-05 使用 `chrome.storage.local` 实现 Repository。
- [ ] P2-06 实现新建、读取、列表、保存、删除最小能力。
- [ ] P2-07 实现自动保存调度、防抖和保存顺序保护。
- [ ] P2-08 保存失败必须在 UI 可见。
- [ ] P2-09 实现 PromptDocument JSON 备份导出与恢复导入。
- [ ] P2-10 增加 Schema、Repository、并发保存聚焦测试。

**关闭标准：** PromptDocument 是唯一持久正文源；关闭/重开 Side Panel 后内容可恢复；无 localStorage/IndexedDB 第二正文源。

---

## P3 — 富文本编辑器与语义块

- [ ] P3-01 接入 TipTap，完成普通富文本编辑。
- [ ] P3-02 实现单一 `promptSection` TipTap Node。
- [ ] P3-03 从权威 `sectionKinds` 派生中文显示名与语义元数据。
- [ ] P3-04 实现 Slash Menu。
- [ ] P3-05 支持 Goal / Context / Instruction / Constraint / Example / Output Format / Acceptance。
- [ ] P3-06 支持自由文本与语义块混写。
- [ ] P3-07 支持普通段落与语义块之间的转换，转换不得丢正文。
- [ ] P3-08 支持撤销/重做并验证语义块行为。
- [ ] P3-09 实现选区与编辑命令基础，为后续 suggestion 应用提供唯一入口。
- [ ] P3-10 增加 PromptSection、Slash Menu、转换、undo/redo 聚焦测试。

**关闭标准：** 不懂 Markdown 的用户能完成结构化 Prompt；没有 goalNode/contextNode 等平行 Node 实现。

---

## P4 — Compiler 与预览

- [ ] P4-01 实现统一 Compiler API。
- [ ] P4-02 实现 Plain Text 输出。
- [ ] P4-03 实现 Markdown 输出。
- [ ] P4-04 实现 XML 输出。
- [ ] P4-05 所有 section 标签/标题映射从同一权威 kind 定义派生。
- [ ] P4-06 实现只读 Preview，禁止形成第二可编辑正文源。
- [ ] P4-07 实现 Copy。
- [ ] P4-08 增加稳定输出、特殊字符、空块、嵌套普通 block 等边界测试。

**关闭标准：** 相同 PromptDocument 可稳定编译三种格式；切换格式不修改文档。

---

## P5 — Prompt Lint 与 AI Suggestion

- [ ] P5-01 先实现无需 AI 的本地 deterministic lint 框架。
- [ ] P5-02 实现首批本地规则：模糊词、无结构长文本、明显重复等。
- [ ] P5-03 定义 AI Provider 最小适配接口，不让 UI 直接依赖具体 SDK。
- [ ] P5-04 实现 `PromptSuggestion` / `PromptLintFinding` 权威类型。
- [ ] P5-05 实现选区动作：clarify / shorten。
- [ ] P5-06 实现 split constraints / draft acceptance。
- [ ] P5-07 实现 AI ambiguity/lint 补充能力。
- [ ] P5-08 UI 明确展示原文与建议，并要求用户接受后才应用。
- [ ] P5-09 实现 source revision 校验，拒绝应用过期 suggestion。
- [ ] P5-10 验证无 AI 配置、调用失败、超时情况下核心主链不受影响。
- [ ] P5-11 增加 suggestion 接受/拒绝/过期和 AI failure 聚焦测试。

**关闭标准：** AI 永远不是正文权威源；AI 完全不可用时编辑、保存、Compiler、Copy 仍完整可用。

---

## P6 — Web Adapter 与真实网页插入

- [ ] P6-01 建立统一 `WebPromptAdapter` 接口。
- [ ] P6-02 完成第一个真实站点 Adapter，并以实际 DOM 为准，不猜 selector。
- [ ] P6-03 插入只由用户明确触发，不自动发送。
- [ ] P6-04 输入框已有内容时避免静默覆盖。
- [ ] P6-05 Adapter 失败时明确失败并可退化为 Copy。
- [ ] P6-06 建立 DOM fixture 测试，覆盖目标输入框变化的关键边界。
- [ ] P6-07 第一个 Adapter 稳定后再增加第二、第三站点，复用统一接口。
- [ ] P6-08 反向检查 content script 未复制 Compiler/Storage/Editor 逻辑。

**关闭标准：** 至少一个真实 AI 网页完成“编辑 → 编译 → 插入”端到端；网页 DOM 变化被限制在对应 Adapter。

---

## P7 — V1 体验收口

- [ ] P7-01 完成轻量文档切换/列表入口，不扩成 Prompt 管理后台。
- [ ] P7-02 完成最近文档恢复。
- [ ] P7-03 检查 Side Panel 窄宽度可用性。
- [ ] P7-04 检查键盘可达性和关键操作可发现性。
- [ ] P7-05 检查所有错误路径无假成功、无静默失败。
- [ ] P7-06 检查 Copy / Insert / Save 的重复操作与状态一致性。
- [ ] P7-07 做代码减法审查：删除临时逻辑、重复状态、无效配置、过期注释和未使用依赖。
- [ ] P7-08 反向搜索 Non-goals，确认未偷偷引入平台化能力。
- [ ] P7-09 更新 README 与全部相关权威文档到真实实现状态。

---

## P8 — V1 最终验证与发布候选

- [ ] P8-01 执行 TypeScript/static check。
- [ ] P8-02 执行 unit/focused tests 全集。
- [ ] P8-03 执行 extension build。
- [ ] P8-04 在 Chrome 完成真实主链 E2E。
- [ ] P8-05 在 Edge 完成真实主链 smoke。
- [ ] P8-06 验证浏览器重启后的数据恢复。
- [ ] P8-07 验证 AI 不可用的降级主链。
- [ ] P8-08 验证第一个真实 Web Adapter。
- [ ] P8-09 审查 Manifest 权限，删除非必要权限。
- [ ] P8-10 审查依赖、许可证与借鉴代码归属。
- [ ] P8-11 生成 V1 release notes / 已知限制。

**V1 完成定义：** `docs/PRODUCT.md` 的成功标准全部有真实验证证据，且 P0-P8 所有未取消任务完成。

---

## 当前状态

当前阶段：**P0 文档基线完成；P0.5 单文件 HTML 原型已实现，等待 Chrome/Edge 人工体验复核。**

下一实施包：**P0.5-11～P0.5-13 — 实际浏览器验收、UX 复核与权威文档回写。**
