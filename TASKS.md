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
- [x] P0-06 建立 `docs/DECISIONS.md`；D017 退役 Web Insert，D018 固定 SelectionActionBar，D019 固定真实性能收口，D020 固定持续输入 cadence/IME，D021 固定预存长文本诊断边界，D022 固定异步 revision 所有权与显式覆盖 revision rebase，D023 supersede D022 中仅与 PromptEditor runtime lazy split 有关的决定并固定 V1 同步 Editor。
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
- [x] P0.5-09 原型曾模拟 Web Insert / conflict / fallback；D017 后正式退役。
- [x] P0.5-10 跑通可点击主链。
- [x] P0.5-11 增加 Prototype Controls。
- [-] P0.5-12 不再为历史 HTML 原型补双浏览器 smoke；正式 Extension P7/P8 覆盖真实实现。
- [x] P0.5-13 用户已体验并确认 Forest Paper + AI 辅助方向。
- [x] P0.5-14 已将确认结论同步回权威文档。

---

## P1 — 最小 Extension 骨架

- [x] P1-01 初始化 React + TypeScript 项目，保持依赖最小化。
- [x] P1-02 配置 Chrome Manifest V3。
- [x] P1-03 建立 Side Panel 页面并可由 Extension action 打开。
- [x] P1-04 background service worker 只负责打开 Side Panel。
- [-] P1-05 page bridge/content script 随 D017 退役。
- [x] P1-06 建立 TypeScript、ESLint、Prettier、Vitest 与 GitHub Actions 基线。
- [x] P1-07 增加开发态构建与 Chrome/Edge 本地加载说明。
- [x] P1-08 Chrome 与 Edge 均完成当前最终 Manifest 真实手动加载；固定权限仍只有 `storage + sidePanel`，optional host 仅服务 Provider。

---

## P2 — PromptDocument 与本地持久化

- [x] P2-01 实现 `PromptDocument` V1 权威 TypeScript Schema。
- [x] P2-02 实现 `promptSection.kind` 单一权威定义。
- [x] P2-03 实现 schemaVersion 校验，未知版本 fail-closed。
- [x] P2-04 实现 `PromptRepository` 接口。
- [x] P2-05 使用 `chrome.storage.local` 实现 Repository。
- [x] P2-06 实现新建、读取、列表、保存、删除。
- [x] P2-07 实现 450ms 自动保存、防抖、切换前 flush 和串行写入顺序保护。
- [x] P2-08 保存失败 UI 可见。
- [x] P2-09 实现 PromptDocument JSON 备份导出/恢复；同 ID 冲突明确询问覆盖或另存副本。
- [x] P2-10 增加 Schema、备份契约、Repository、并发保存测试。
- [x] P2-11 `ensureCurrent()` 批量读取 documents/current id；Repository 拒绝旧 revision 覆盖新 revision。
- [x] P2-12 修复同 ID 显式备份覆盖与 revision 单调保护冲突：覆盖时 rebase 到 `max(local, backup)+1`；拒绝覆盖生成新 id；新增纯逻辑测试。
- [x] P2-13 收口 autosave callback 的版本所有权：只有当前 id+revision 对应的 save 结果才能修改 save badge；旧 snapshot 不得回退文档列表或用旧失败污染新 revision。

**关闭标准已满足：** PromptDocument 是唯一持久正文源；真实浏览器关闭/重启恢复由 P8-06 完成。

---

## P3 — 富文本编辑器与语义块

- [x] P3-01 接入 TipTap，完成普通富文本编辑基础。
- [x] P3-02 实现单一 `promptSection` TipTap Node。
- [x] P3-03 从权威 `sectionKinds` 派生显示名与语义元数据。
- [x] P3-04 实现 contextual Slash Menu。
- [x] P3-05 支持 Goal / Context / Instruction / Constraint / Example / Output Format / Acceptance。
- [x] P3-06 支持自由文本与语义块混写。
- [x] P3-07 支持普通段落与语义块无损转换。
- [x] P3-08 验证 undo/redo 对转换、AI 替换/追加的行为。
- [x] P3-09 AI suggestion 只通过 Editor command 应用。
- [x] P3-10 增加 PromptSection、Slash、转换、history 测试。
- [x] P3-11 语义块常态可见边界。
- [x] P3-12 修复同 document id 外部正文替换：Editor 以 content object identity 区分自身输入和外部替换；本地键入 O(1) 跳过整份 `setContent()`，同 ID 导入则真实重灌并增加 editor generation。
- [x] P3-13 Slash Command 收口：仅块/行首或空白后拦截 `/`；URL/日期/`A/B` 保留普通斜杠；方向键/Home/End/Enter/Esc 真机可用，Esc 可写回普通 `/`。

---

## P4 — Compiler 与预览

- [x] P4-01 实现统一 Compiler API。
- [x] P4-02 Plain Text。
- [x] P4-03 Markdown。
- [x] P4-04 XML。
- [x] P4-05 section 标签从同一 kind 派生。
- [x] P4-06 只读 Preview。
- [x] P4-07 Copy；编辑页默认 Plain，Preview 复制显式格式。
- [x] P4-08 边界测试覆盖空块、列表/hard break、代码、特殊字符、XML escaping。

---

## P5 — Prompt Lint、AI Settings 与 Suggestion

- [x] P5-01 deterministic lint 框架。
- [x] P5-02 首批规则：模糊词、目标/验收、重复、引用、长文本无结构。
- [x] P5-03 AI Provider 最小接口。
- [x] P5-04 AI preferences 独立于 PromptDocument。
- [x] P5-05 AI 设置、连接测试、optional host permission、真实错误。
- [x] P5-06 `PromptSuggestion` / `PromptLintFinding` 类型。
- [x] P5-07 选区 clarify/shorten/split constraints。
- [x] P5-08 全局 ambiguity/draft acceptance/structure。
- [x] P5-09 suggestion/advisory 用户接受后才修改。
- [x] P5-10 source revision guard。
- [x] P5-11 真实浏览器完成未配置/禁用/错误 Base URL/transport/timeout 降级验证；AI 失败时编辑、保存、Lint、Compiler、Preview、Copy 主链仍可用。
- [x] P5-12 suggestion UI Accept/Ignore/stale/advisory 测试。
- [x] P5-13 streaming compatibility/capability cache/SSE 测试。
- [x] P5-14 `AiRequestError` transient/persistent/status/Retry-After/error body 分类。
- [x] P5-15 response body 读取中断归一化为 transient provider error；caller 主动 Abort 仍保持取消语义，并有流兼容测试。

---

## P6 — Inline Completion（Web Insert 已退役）

### 历史 Web Insert

- [-] P6-01 WebPromptAdapter / shared insert engine 退役。
- [-] P6-02 ChatGPT DOM Adapter 验证移出 V1。
- [-] P6-03 插入不自动发送随 Web Insert 删除。
- [-] P6-04 append/replace/caret 网页插入删除。
- [-] P6-05 page bridge / fallback 删除；外部统一 Copy。
- [-] P6-06 textarea/contenteditable/ChatGPT fixture 删除。
- [-] P6-07 第二/第三站点 Adapter 移出 V1。
- [-] P6-08 content script / bridge 删除。

### 当前 Inline Completion

- [x] P6-09 独立 `completionEnabled`，默认 false。
- [x] P6-10 仅 `configured && enabled && completionEnabled` 自动请求。
- [x] P6-11 ProseMirror ghost：Tab 接受、Esc 忽略、stale 失效。
- [x] P6-12 delay/context/block-local/Abort/streaming-first/短输出/补全模型。
- [x] P6-13 Provider 身份变动后连接/补全失效；关闭 AI 关闭补全。
- [x] P6-14 preference/stream/model/Tab/Esc/context/stale 测试。
- [x] P6-15 真实 Chrome 配置可用 AI，完成块首/中/尾、context budget、streaming、Tab/Esc、stale cancellation、block-local、预存长 Prompt caret、中文 IME 持续输入与关闭补全无自动请求的真机验证。
- [x] P6-16 context identity 绑定 document generation + block + caret；不跨块。
- [x] P6-17 块首/中/尾/单字符双向 context；streaming widget key 持续刷新。
- [x] P6-18 `completionContextChars` 显式贯穿 Editor 并进入 identity。
- [x] P6-19 streaming partial 约 48ms 合并刷新；删除 Hook 第二套裁剪。
- [x] P6-20 **持续输入稳定性加固，不作为预存长文本根因：** debounce/cadence 分离、IME suppression、transient retry/Retry-After。
- [x] P6-21 **预存长文本链根修：** bounded context scan、body sniff、删除 cross-context persistent cooldown、真实 error/recovery、blur/composition 清 ghost、cache fast-path。
- [x] P6-22 删除 `completionSettingsKey()` 复合字符串 identity；补全设置变化直接依赖稳定不可变 `AiSettings` 对象 identity，不再每 render 拼接 Provider/URL/model/API Key。

---

## P7 — V1 体验收口

- [x] P7-01 轻量文档切换/列表/搜索/新建/删除。
- [x] P7-02 最近文档恢复逻辑。
- [x] P7-03 当前最终构建在浏览器实际允许的窄 Side Panel 下真机可用；Chrome 当前真机测得 `sidepanel.html` `clientWidth ≈ 382px`，布局和核心操作正常。
- [x] P7-04 键盘可达性完成：contextual Slash 支持方向键/Home/End/Enter/Esc，Tab/Esc completion 和 SelectionActionBar 主链正常。
- [x] P7-05 完整错误路径无假成功/静默失败；同 ID 导入覆盖、Provider 错误恢复与 stale autosave callback 均已收口并完成真实验证。
- [x] P7-06 Copy / Save 连续重复操作状态一致；快速输入后旧 save callback 不误报当前“已保存”。
- [x] P7-07 最终代码减法审查完成：旧 SelectionContextMenu/viewport rect/旧 CSS/重复 completion 裁剪/floatingPanels/header-only stream/persistent cooldown/hasBlockContext/compat alias/`completionSettingsKey()` 均已删除；`LazyPromptEditor.tsx` 也已物理删除，App 直接 import `PromptEditor`。
- [x] P7-08 Non-goals 反向搜索完成。
- [x] P7-09 权威文档最终实现态收口完成：UX / ARCHITECTURE / DECISIONS(D023) / AGENTS / TASKS / README / white-screen incident / V1 release notes 与当前实现一致。
- [x] P7-10 真实浏览器性能收口：bounded context、partial batching、Sheet lazy-load 保留；PromptEditor runtime lazy split 曾在静态 CI 全绿后导致真实 Chrome 白屏，已由 D023 正式撤销并恢复同步 Editor。当前约 620 kB / gzip 196 kB 主包的 `>500KB` warning 明确保留，不调整阈值；同步构建已经完成 Chrome/Edge 真机稳定性验收。
- [x] P7-11 D018 选区根修：ProseMirror selection 唯一权威，固定 SelectionActionBar。
- [x] P7-12 第一组 5×代码审查/优化/减法/性能优化完成。
- [x] P7-13 第一组 5×文档同步完成。
- [x] P7-14 P6-20 第二组 5×代码收口完成。
- [x] P7-15 P6-20 第二组 5×文档同步完成。
- [x] P7-16 P6-21 第三组（纠正预存文本前提后）5×代码收口完成。
- [x] P7-17 P6-21 第三组 5×文档同步完成。
- [x] P7-18 **历史第四组 5×代码审查/优化/减法/性能优化完成：** 删除 SelectionContextMenu alias、修同 ID 导入 revision、修外部 content 同步、删除 credential settings key、收口 autosave ownership。该轮同时尝试 Editor runtime lazy split，后续真实 Chrome 白屏证明该子方案不成立，已由 D023 supersede 并删除 LazyPromptEditor；其它收口项继续有效。
- [x] P7-19 **历史第四组文档同步完成，并在 V1 最终收口中二次校正：** 旧 lazy-split 成功描述已被 D023、事故文档和最终权威文档 supersede，不以旧静态 CI 结果冒充浏览器事实。

---

## P8 — V1 最终验证与发布候选

- [x] P8-01 GitHub Actions TypeScript/static check 通过；V1 最终收口提交继续以最新 CI 为门禁。
- [x] P8-02 GitHub Actions unit/focused tests 全集通过；V1 最终收口提交继续以最新 CI 为门禁。
- [x] P8-03 GitHub Actions Extension build 通过；`>500KB` warning 明确保留，不作为假失败或通过调阈值隐藏。
- [x] P8-04 Chrome 当前最终构建主链 E2E：编辑 → contextual Slash/转换 → AI suggestion/补全 → lint → Preview → Copy → 文档操作，Side Panel 持续稳定无白屏。
- [x] P8-05 Edge 当前最终构建 smoke 通过。
- [x] P8-06 浏览器关闭/重启最近 Prompt 恢复通过；同 ID 备份覆盖后重启仍保持覆盖内容。
- [x] P8-07 AI 未配置/禁用/失败/timeout 真实浏览器降级通过，补全关闭无自动请求。
- [x] P8-08 opt-in completion 真实 Provider E2E 通过：block-local、任意 caret、context budget、预存长文本、IME 持续输入、streaming、错误恢复、stale invalidation、completion model 主链正常。
- [x] P8-09 Manifest 固定权限仅 `storage` / `sidePanel`；optional host 只服务 Provider。
- [x] P8-10 依赖许可证审计与 CI 门禁。
- [x] P8-11 已建立 `docs/RELEASE-NOTES-V1.md`，记录 V1 能力、真实验收与 Known Limitations。
- [x] P8-12 真实浏览器快速连续输入 save badge 与导出 → 同 ID 导入 → 覆盖即时刷新 Editor 验证通过，不出现假成功。

**V1 完成定义：** `docs/PRODUCT.md` 成功标准全部有实现、测试与真实浏览器证据；P0-P8 无未取消的 open task。最终 HEAD 仍必须通过 GitHub Actions 全门禁，若最终 CI 失败则 V1 状态立即回退为未完成并修复。

---

## 当前状态

PromptNote V1 的实现、代码减法、权威文档和真实浏览器验收已经收口。

真实验证结论：

1. Chrome Side Panel 同步 PromptEditor 构建持续稳定，无“约 0.1 秒后白屏”；D023 已 supersede D022 的 Editor runtime lazy-split 子决定。
2. Chrome 主链、AI suggestion、预存长文本/IME 内联补全、错误恢复、关闭补全、快速保存、同 ID 备份覆盖与浏览器重启恢复均已通过。
3. contextual Slash 支持方向键/Home/End/Enter/Esc；普通 URL、日期、`A/B` 的 `/` 输入正常。
4. Chrome Side Panel 自身 DevTools 实测 `location.href = chrome-extension://.../sidepanel.html`，实际窄宽 `clientWidth ≈ 382px`，核心布局和操作正常。
5. Edge 当前 Manifest / 主链 smoke 已通过。
6. 生产代码已删除 `LazyPromptEditor.tsx`，App 直接 import `PromptEditor`；Manifest 仍只有 `storage + sidePanel` 固定权限；Vite 未设置 `chunkSizeWarningLimit` 覆盖。
7. V1 release notes / Known Limitations 已写入 `docs/RELEASE-NOTES-V1.md`。

V1 不再有功能或人工验收阻塞项。当前唯一机械门禁是：本次最终账本/文档/代码收口后的最新 HEAD 必须再次通过 GitHub Actions；若绿色，则 V1 正式完成，后续新工作进入 V1 之后的独立范围。
