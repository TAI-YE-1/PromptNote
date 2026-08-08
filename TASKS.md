# TASKS — PromptNote V1

本文件是 PromptNote V1 **唯一开发任务账本**。

规则：

- 只有实现、真实调用方、必要测试、必要文档全部闭合后才能标记完成；
- 不在其他文档维护平行 TODO 清单；
- 新发现的 V1 工作先归入这里，再实施；
- PRODUCT 明确的 Non-goals 不得偷偷进入本账本；
- `partial` 不等于完成；
- 高成本全量验证放在高风险包或 V1 收口时，不为每个小任务重复执行。

状态：`[ ]` 未完成，`[x]` 完成，`[-]` 明确取消、退役或移出 V1。

---

## P0 — 项目基线与防漂移文档

- [x] P0-01 建立 `README.md`，固定定位、V1 主链、Non-goals 与权威文档顺序。
- [x] P0-02 建立 `docs/PRODUCT.md`，固定产品目标、场景、边界与成功标准。
- [x] P0-03 建立 `docs/UX.md`，固定编辑、Slash Menu、AI suggestion、Compiler 与 Copy 主链。
- [x] P0-04 建立 `docs/PROMPT-DOCUMENT-CONTRACT.md`，固定唯一内容源与 Schema 边界。
- [x] P0-05 建立 `docs/ARCHITECTURE.md`，固定模块职责、依赖方向和状态边界。
- [x] P0-06 建立 `docs/DECISIONS.md`，记录关键产品/架构决策；D017 明确退役 Web Insert 并引入 opt-in inline completion。
- [x] P0-07 建立 `TASKS.md` 唯一任务账本。
- [x] P0-08 建立 `AGENTS.md` AI 开发协作规则。

---

## P0.5 — 单文件 HTML 可交互 UX 原型验证

- [x] P0.5-01 建立 `docs/PROTOTYPE.md`。
- [x] P0.5-02 建立 `prototype/promptnote-prototype.html` 单文件原型。
- [x] P0.5-03 完成约 440px 基准 Side Panel 和核心编辑状态。
- [x] P0.5-04 完成 Selection Toolbar 与 AI Suggestion 接受/忽略/过期状态。
- [x] P0.5-05 完成 AI 未配置 / 已连接 / 已关闭和轻量 AI Settings 原型。
- [x] P0.5-06 完成本地 Prompt Check + 可选 AI 深度检查原型。
- [x] P0.5-07 完成 Plain / Markdown / XML Preview。
- [x] P0.5-08 完成轻量 Document Switcher。
- [x] P0.5-09 原型曾模拟 Web Insert / conflict / fallback 状态；该能力后续由 D017 明确退役，不进入正式 V1。
- [x] P0.5-10 跑通可点击主链，不复制独立页面状态实现。
- [x] P0.5-11 增加 Prototype Controls。
- [-] P0.5-12 不再为已退役的 HTML 原型补 Chrome/Edge 双浏览器 smoke；正式 Extension 的 P7/P8 浏览器验收覆盖真实实现。
- [x] P0.5-13 用户已体验并确认 Forest Paper + AI 辅助方向，明确要求进入真实实现。
- [x] P0.5-14 已将确认结论同步回权威文档。

---

## P1 — 最小 Extension 骨架

- [x] P1-01 初始化 React + TypeScript 项目，保持依赖最小化。
- [x] P1-02 配置 Chrome Manifest V3。
- [x] P1-03 建立 Side Panel 页面并可由 Extension action 打开。
- [x] P1-04 background service worker 收敛为“点击扩展图标 → 打开 Side Panel”，不承载业务逻辑。
- [-] P1-05 早期 page bridge/content script 边界随 D017 Web Insert 退役；生产文件与构建入口已删除。
- [x] P1-06 建立 TypeScript、ESLint、Prettier、Vitest 与 GitHub Actions 基线。
- [x] P1-07 增加开发态构建与 Chrome/Edge 本地加载说明。
- [ ] P1-08 验证 Chrome 与 Edge 至少各完成一次**当前最终 Manifest（固定权限仅 storage + sidePanel）**的真实手动加载。

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

**关闭标准：** PromptDocument 是唯一持久正文源；浏览器重启后的真实恢复证据放到 P8-06。

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
- [x] P3-10 增加 PromptSection、Slash Menu、转换、undo/redo 聚焦测试。
- [x] P3-11 语义块常态使用可见边框、左侧强调线、标签底色与明确块间距；不依赖 hover 才显示模块边界。

---

## P4 — Compiler 与预览

- [x] P4-01 实现统一 Compiler API。
- [x] P4-02 实现 Plain Text 输出。
- [x] P4-03 实现 Markdown 输出。
- [x] P4-04 实现 XML 输出。
- [x] P4-05 section 标签/标题映射从同一权威 kind 定义派生。
- [x] P4-06 实现只读 Preview，不形成第二编辑源。
- [x] P4-07 实现 Copy；编辑页默认 Plain，Preview 按当前显式格式 Copy，避免隐藏格式状态。
- [x] P4-08 补齐空块、嵌套列表与 hard break、代码块、Markdown/Plain 特殊字符和完整 XML 转义边界测试。

---

## P5 — Prompt Lint、AI Settings 与 Suggestion

- [x] P5-01 实现无需 AI 的本地 deterministic lint 框架。
- [x] P5-02 补齐首批本地规则：模糊词、较长任务缺目标/验收、明显重复、可能未定义的上下文引用、长文本无结构；规则只提示不阻断主链。
- [x] P5-03 定义 AI Provider 最小适配接口，UI 不直接依赖具体 SDK。
- [x] P5-04 实现 AI preferences：enabled、completionEnabled、Provider、Model、Base URL、credential、默认发送范围；不进入 PromptDocument。
- [x] P5-05 实现 AI 设置 UI、连接测试、按 Provider origin 请求 optional host permission 和真实错误展示。
- [x] P5-06 实现 `PromptSuggestion` / `PromptLintFinding` 权威类型。
- [x] P5-07 实现选区动作：clarify / shorten / split constraints。
- [x] P5-08 实现全局动作：ambiguity check / draft acceptance / structure suggestion。
- [x] P5-09 UI 明确展示原文与建议，必须接受后才修改；结构建议保持 advisory。
- [x] P5-10 实现共享 source revision guard，拒绝应用过期 suggestion。
- [ ] P5-11 完整验证未配置 AI、禁用 AI、Provider HTTP/transport 失败、30 秒超时情况下的**真实浏览器主链**仍可编辑/保存/lint/Compiler/Copy；用户已验证无 AI 可正常使用和错误 Base URL 会失败，仍缺禁用/超时及当前最终构建全链证据。
- [x] P5-12 补齐 suggestion UI 行为测试：Accept / Ignore、过期禁用、advisory 不修改正文。

---

## P6 — Inline Completion（Web Insert 已退役）

### 历史 Web Insert

- [-] P6-01 WebPromptAdapter / shared caret insert engine 已由 D017 退役并从生产代码删除。
- [-] P6-02 不再要求 ChatGPT 线上 DOM Adapter 验证；第三方网页写入不属于 V1。
- [-] P6-03 “插入不自动发送”随 Web Insert 整体删除。
- [-] P6-04 append/replace/caret 网页插入交互随 Web Insert 整体删除。
- [-] P6-05 page bridge / Adapter fallback 随 Web Insert 整体删除；外部交付统一 Copy。
- [-] P6-06 textarea/contenteditable/ChatGPT DOM fixture 已删除，不保留测试旧链。
- [-] P6-07 第二、第三站点 Adapter 不再进入 V1。
- [-] P6-08 content script / bridge 职责已删除；Manifest 不再需要对应权限。

### 当前 Inline Completion

- [x] P6-09 新增独立 `completionEnabled` 偏好，默认 false；旧设置自动补 false，不污染 PromptDocument。
- [x] P6-10 补全只有在 `configured && enabled && completionEnabled` 三条件同时成立时才允许自动请求 Provider。
- [x] P6-11 实现 ProseMirror ghost completion decoration：不进入正文；Tab 接受、Esc 忽略；doc/selection 变化立即失效。
- [x] P6-12 补全调度支持可配置 delay/context、当前 block 隔离、旧请求 Abort、streaming-first partial、短输出、短退避与可选 completion model；Provider 支持外部 cancellation 和不支持 streaming 时的兼容降级。
- [x] P6-13 修改 Provider/Model/Base URL/API Key 后使 configured/补全开关失效；关闭 AI 同时关闭补全。
- [x] P6-14 增加 completion preference、流式/降级/model route、Tab/Esc、stale invalidation、英文前导空格、当前 block context 隔离和移动 caret 后拒绝旧 ghost 的测试。
- [x] P6-16 深排查真实浏览器补全错位/串块问题：context identity 绑定 document generation + block + caret；流式 partial 只可更新原 context；当前语义块不再隐式读取前一块正文；退避窗口内的新 context 不再静默丢弃。
- [x] P6-17 深排查真机“只在部分 caret 触发 / 只显示首批两三个字”：补全上下文改为当前 block 的 caret 前后双向窗口并支持块首/块中/单字符；用户设置的 context 数值真正限制 Provider payload；流式 ghost decoration key 随 partial 文本更新，禁止 ProseMirror 复用首批 widget DOM；补全指令显式使用 `<光标>` 并要求非空、有用续写。
- [ ] P6-15 在真实 Chrome 中配置可用 AI，开启“编辑器内联补全”，验证块首/块中/块尾均能产生合理灰色续写，流式文字持续增长而非停在首批两三个字，Tab 接受、Esc 忽略、继续输入/移动 caret/切换块会取消旧建议，且不同语义块之间不串上下文；关闭补全后确认不再自动请求。此前真机暴露的问题已进入 P6-16/P6-17，最新构建待复测。

---

## P7 — V1 体验收口

- [x] P7-01 完成轻量文档切换/列表/搜索/新建/删除入口，不扩成 Prompt 管理后台。
- [x] P7-02 完成最近文档恢复逻辑。
- [ ] P7-03 检查当前最终构建真实 Side Panel 360px 等窄宽度可用性；选区命令菜单与本地检查结果已改为 viewport-safe 浮层，需最新构建真机确认不裁剪、不被底部 actionbar 遮挡。
- [ ] P7-04 检查键盘可达性和关键操作可发现性；重点含 Slash、Tab 接受 ghost、Esc 忽略 ghost/关闭顶层临时 UI。
- [ ] P7-05 完整审查错误路径无假成功、无静默失败；当前重点为 Storage、Copy、AI suggestion、inline completion Provider 失败/退避。
- [ ] P7-06 检查 Copy / Save 的连续、重复操作与状态一致性；Web Insert 状态链已删除。
- [ ] P7-07 做最终代码减法审查；已删除 Web Adapter/content script/messages/DOM fixtures/activeTab/scripting/旧 App runtime，待最终浏览器 smoke 后再反查一次。
- [x] P7-08 反向搜索 Non-goals：无 backend/auth/team/marketplace/cloud-sync/model-playground，Web DOM 注入也已成为明确 Non-goal。
- [ ] P7-09 README、PRODUCT、UX、ARCHITECTURE、DECISIONS、AGENTS、TASKS 最终实现态收口；当前已同步 block-local/context identity 规则，待最终浏览器验收后最后复核一次。
- [ ] P7-10 完成真实浏览器性能收口：已减少 Storage/Lint/Compiler 默认热路径工作；补全使用可配置 delay/context、streaming-first、取消、context identity、短退避与可选低延迟模型。仍需验证 Side Panel 启动/输入流畅度及真实 Provider 首 partial 体感；主 bundle 仍需以真实启动数据决定是否 code splitting，不调高 warningLimit 掩盖。

---

## P8 — V1 最终验证与发布候选

- [x] P8-01 GitHub Actions TypeScript/static check 通过。
- [x] P8-02 GitHub Actions 当前 unit/focused tests 全集通过。
- [x] P8-03 GitHub Actions Extension build 通过。
- [ ] P8-04 在 Chrome 完成当前最终构建真实主链 E2E：编辑 → Slash/结构转换 → AI suggestion/可选补全 → lint → Preview → Copy → 文档操作。
- [ ] P8-05 在 Edge 完成当前最终构建真实主链 smoke。
- [ ] P8-06 验证浏览器关闭/重启后的最近 Prompt 恢复。
- [ ] P8-07 验证 AI 未配置/禁用/失败时的真实浏览器降级主链，以及补全开关关闭时无自动请求。
- [ ] P8-08 验证 opt-in inline completion 在真实 Provider 下的最终端到端行为；重点包含 block-local、任意 caret、流式 partial 持续更新、旧 caret 失效和可选 completion model；不再验证 Web Adapter。
- [x] P8-09 Manifest 权限审查：固定权限仅 `storage` / `sidePanel`；无 `activeTab`、`scripting`、content script。optional host permission 只用于用户配置的 AI Provider origin。
- [x] P8-10 审查全部直接/传递依赖许可证与借鉴代码归属；lockfile + `npm ci` + 跨平台许可证 CI 门禁持续有效。
- [ ] P8-11 生成 V1 release notes / Known Limitations。

**V1 完成定义：** `docs/PRODUCT.md` 的成功标准全部有真实验证证据，且 P0-P8 所有未取消任务完成。

---

## 当前状态

当前阶段：**Web Insert 已按 D017 从 V1 完整退役，相关 Adapter、content script、消息协议、DOM fixture、`activeTab/scripting` 权限和 UI 按钮均已删除。正式外部输出统一为 Copy。编辑器 opt-in inline completion 已完成 P6-16/P6-17 深修：当前 block 隔离、caret 前后双向上下文、document/block/caret identity、流式 partial DOM 持续刷新、可配置上下文/延迟/独立补全模型；选区命令与本地检查结果改为 viewport-safe transient panels。代码门禁已通过，最新修复仍需真实 Chrome 复测，再继续 Edge、重启恢复和异常降级验收。**

当前最优先剩余工作：

1. Chrome 真机复测 P6-17：同一长块的块首/块中/块尾、单字符块均能触发；流式 ghost 不再只停在最初两三个字；移动 caret/切块后旧流不出现；
2. 真机确认选区命令菜单不再越出 Side Panel，本地“检查”结果始终位于 actionbar 上方可见；
3. Edge 当前最终 Manifest smoke + 360px/键盘；
4. 浏览器重启恢复与 AI 禁用/错误/超时降级；
5. Copy/Save 重复操作、错误路径、真实性能收口、最终代码减法、release notes 与 Known Limitations。
