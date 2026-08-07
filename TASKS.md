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

---

## P0.5 — 单文件 HTML 可交互 UX 原型验证

- [x] P0.5-01 建立 `docs/PROTOTYPE.md`。
- [x] P0.5-02 建立 `prototype/promptnote-prototype.html` 单文件原型。
- [x] P0.5-03 完成约 440px 基准 Side Panel 和核心编辑状态。
- [x] P0.5-04 完成 Selection Toolbar 与 AI Suggestion 接受/忽略/过期状态；AI 只能显式触发。
- [x] P0.5-05 完成 AI 未配置 / 已连接 / 已关闭和轻量 AI Settings 原型。
- [x] P0.5-06 完成本地 Prompt Check + 可选 AI 深度检查原型。
- [x] P0.5-07 完成 Plain / Markdown / XML Preview。
- [x] P0.5-08 完成轻量 Document Switcher。
- [x] P0.5-09 完成 Insert 正常、输入冲突、Adapter 失败→Copy 模拟状态。
- [x] P0.5-10 跑通可点击主链，不复制独立页面状态实现。
- [x] P0.5-11 增加 Prototype Controls。
- [ ] P0.5-12 在 Chrome 与 Edge 本地打开原型，检查完整主链、360/440/520 宽度及控制台无 JavaScript error。
- [x] P0.5-13 用户已体验并确认 Forest Paper + AI 辅助方向，明确要求进入真实实现。
- [x] P0.5-14 已将 AI 设置、显式触发、无 AI 降级等确认结论同步回权威文档。

**当前说明：** 用户已确认原型方向并要求进入真实实现，因此 P1 已启动；P0.5-12 的双浏览器原型 smoke 仍保留为未完成证据，不伪造关闭。

---

## P1 — 最小 Extension 骨架

- [x] P1-01 初始化 React + TypeScript 项目，保持依赖最小化。
- [x] P1-02 配置 Chrome Manifest V3。
- [x] P1-03 建立 Side Panel 页面并可由 Extension action 打开。
- [x] P1-04 建立最小 background service worker，只保留 Side Panel 生命周期职责。
- [x] P1-05 建立最小 content script 与受控消息桥。
- [x] P1-06 建立 TypeScript、ESLint、Prettier、Vitest 与 GitHub Actions 基线。
- [x] P1-07 增加开发态构建与 Chrome/Edge 本地加载说明。
- [ ] P1-08 验证 Chrome 与 Edge 至少各完成一次真实手动加载。

**关闭标准：** Chrome 已完成真实手动加载并进入 Side Panel；当前只缺 Edge 的对应加载证据。

---

## P2 — PromptDocument 与本地持久化

- [x] P2-01 实现 `PromptDocument` V1 权威 TypeScript Schema。
- [x] P2-02 实现 `promptSection.kind` 单一权威定义。
- [x] P2-03 实现 schemaVersion 校验，未知版本 fail-closed。
- [x] P2-04 实现 `PromptRepository` 接口。
- [x] P2-05 使用 `chrome.storage.local` 实现 Repository。
- [x] P2-06 实现新建、读取、列表、保存、删除。
- [x] P2-07 实现 450ms 自动保存、防抖、切换前显式 flush 和串行写入顺序保护。
- [x] P2-08 保存失败在 UI 可见，不假装成功。
- [x] P2-09 实现 PromptDocument JSON 备份导出/恢复导入；同 ID 冲突明确询问覆盖或另存副本。
- [x] P2-10 增加 Schema、备份契约、Repository、并发保存聚焦测试。

**关闭标准：** PromptDocument 是唯一持久正文源；无 localStorage/IndexedDB 第二正文源。浏览器重启后的真实恢复证据放到 P8-06。

---

## P3 — 富文本编辑器与语义块

- [x] P3-01 接入 TipTap，完成普通富文本编辑基础。
- [x] P3-02 实现单一 `promptSection` TipTap Node。
- [x] P3-03 从权威 `sectionKinds` 派生中文显示名与语义元数据。
- [x] P3-04 实现 Slash Menu。
- [x] P3-05 支持 Goal / Context / Instruction / Constraint / Example / Output Format / Acceptance。
- [x] P3-06 支持自由文本与语义块混写。
- [x] P3-07 支持普通段落与语义块之间的显式转换，转换不得丢正文。
- [x] P3-08 验证 undo/redo 对语义块转换、选区 suggestion 替换和 AI 追加验收块的行为。
- [x] P3-09 实现选区与编辑命令基础，AI suggestion 只通过 Editor command 应用。
- [x] P3-10 增加 PromptSection、Slash Menu、转换、undo/redo 聚焦测试；菜单项直接从权威 `sectionKinds` 派生。

---

## P4 — Compiler 与预览

- [x] P4-01 实现统一 Compiler API。
- [x] P4-02 实现 Plain Text 输出。
- [x] P4-03 实现 Markdown 输出。
- [x] P4-04 实现 XML 输出。
- [x] P4-05 section 标签/标题映射从同一权威 kind 定义派生。
- [x] P4-06 实现只读 Preview，不形成第二编辑源。
- [x] P4-07 实现 Copy。
- [x] P4-08 补齐空块、嵌套列表与 hard break、代码块、Markdown/Plain 特殊字符和完整 XML 转义边界测试。

---

## P5 — Prompt Lint、AI Settings 与 Suggestion

- [x] P5-01 实现无需 AI 的本地 deterministic lint 框架。
- [x] P5-02 补齐首批本地规则：模糊词、较长任务缺目标/验收、明显重复、可能未定义的上下文引用、长文本无结构；规则只提示不阻断主链。
- [x] P5-03 定义 AI Provider 最小适配接口，UI 不直接依赖具体 SDK。
- [x] P5-04 实现 AI preferences：enabled、Provider、Model、Base URL、credential、默认发送范围；不进入 PromptDocument。
- [x] P5-05 实现 AI 设置 UI、连接测试、按 origin 请求 optional host permission 和真实错误展示。
- [x] P5-06 实现 `PromptSuggestion` / `PromptLintFinding` 权威类型。
- [x] P5-07 实现选区动作：clarify / shorten / split constraints。
- [x] P5-08 实现全局动作：ambiguity check / draft acceptance / structure suggestion。
- [x] P5-09 UI 明确展示原文与建议，必须接受后才修改；结构建议保持 advisory。
- [x] P5-10 实现共享 source revision guard，拒绝应用过期 suggestion。
- [ ] P5-11 完整验证未配置 AI、禁用 AI、Provider HTTP 失败、30 秒超时情况下的**真实浏览器主链**仍可编辑/保存/lint/Compiler/Copy。
- [x] P5-12 补齐 suggestion UI 行为测试：可编辑 suggestion 显式 Accept / Ignore、过期 suggestion 禁止 Accept、advisory 只允许关闭且不得修改正文。

---

## P6 — Web Adapter 与真实网页插入

- [x] P6-01 建立统一 `WebPromptAdapter` 接口。
- [ ] P6-02 完成第一个真实站点 Adapter 的**线上 DOM 验证**；当前 ChatGPT Adapter 已实现，但尚未在真实 chatgpt.com 主链 smoke。
- [x] P6-03 插入只由用户明确触发，不自动发送。
- [x] P6-04 输入框已有内容时明确选择 append / replace，避免静默覆盖。
- [x] P6-05 Adapter 失败时明确失败并可退化为 Copy。
- [x] P6-06 建立更接近真实 ChatGPT DOM 的 fixture：覆盖 `#prompt-textarea` contenteditable/ProseMirror 风格、Range/Selection 插入、execCommand fallback、legacy textarea 与无输入框失败路径。
- [ ] P6-07 第一个 Adapter 稳定后再增加第二、第三站点。
- [x] P6-08 content script 只做 Adapter/消息职责，未复制 Compiler/Storage/Editor 逻辑。

---

## P7 — V1 体验收口

- [x] P7-01 完成轻量文档切换/列表/搜索/新建/删除入口，不扩成 Prompt 管理后台。
- [x] P7-02 完成最近文档恢复逻辑。
- [ ] P7-03 检查真实 Side Panel 360px 等窄宽度可用性。
- [ ] P7-04 检查键盘可达性和关键操作可发现性。
- [ ] P7-05 完整审查所有错误路径无假成功、无静默失败。
- [ ] P7-06 检查 Copy / Insert / Save 的重复操作与状态一致性。
- [ ] P7-07 做最终代码减法审查。
- [ ] P7-08 反向搜索 Non-goals，确认未偷偷引入平台化能力。
- [ ] P7-09 README 已更新；全部权威文档的最终实现态收口待真实浏览器验收后完成。

---

## P8 — V1 最终验证与发布候选

- [x] P8-01 GitHub Actions TypeScript/static check 通过。
- [x] P8-02 GitHub Actions 当前 unit/focused tests 全集通过。
- [x] P8-03 GitHub Actions Extension build 通过。
- [ ] P8-04 在 Chrome 完成真实主链 E2E。
- [ ] P8-05 在 Edge 完成真实主链 smoke。
- [ ] P8-06 验证浏览器重启后的数据恢复。
- [ ] P8-07 验证 AI 未配置/禁用/失败时的真实浏览器降级主链。
- [ ] P8-08 验证第一个真实 ChatGPT Web Adapter。
- [x] P8-09 Manifest 权限审查：固定权限仅 `storage` / `sidePanel`；AI 网络权限使用 optional host permission 按实际 origin 请求；Content Script 仅绑定 ChatGPT 域名。
- [ ] P8-10 审查全部直接/传递依赖许可证与借鉴代码归属。
- [ ] P8-11 生成 V1 release notes / 已知限制。

**V1 完成定义：** `docs/PRODUCT.md` 的成功标准全部有真实验证证据，且 P0-P8 所有未取消任务完成。

---

## 当前状态

当前阶段：**真实 Extension 核心实现已经进入 `main`，GitHub Actions 的依赖安装、TypeScript、ESLint、聚焦单测、Extension build 已通过；Chrome 已完成一次真实 Extension 加载，尚未宣称 V1 完成。**

当前最优先剩余工作：

1. Edge 真实加载与 Chrome/Edge 完整 Side Panel 主链；
2. ChatGPT 当前线上 DOM 的真实 Adapter 验证；
3. 浏览器重启恢复与无 AI 降级；
4. V1 体验错误路径、状态一致性与代码减法审查；
5. 许可证、release notes 和最终文档收口。
