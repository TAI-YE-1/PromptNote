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
- [x] P0-06 建立 `docs/DECISIONS.md`；D017 退役 Web Insert，D018 固定 SelectionActionBar，D019 固定真实性能收口，D020 固定持续输入 cadence/IME，D021 固定预存长文本诊断边界，D022 固定异步 revision 所有权、显式覆盖 revision rebase 与 Editor lazy split。
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
- [ ] P1-08 验证 Chrome 与 Edge 至少各完成一次**当前最终 Manifest（固定权限仅 storage + sidePanel）**真实手动加载。

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
- [x] P2-12 修复同 ID 显式备份覆盖与 revision 单调保护冲突：覆盖时 rebase 到 `max(local, backup)+1`；拒绝覆盖生成新 id；新增 3 个纯逻辑测试。
- [x] P2-13 收口 autosave callback 的版本所有权：只有当前 id+revision 对应的 save 结果才能修改 save badge；旧 snapshot 不得回退文档列表或用旧失败污染新 revision。

**关闭标准：** PromptDocument 是唯一持久正文源；真实浏览器重启恢复仍由 P8-06 验收。

---

## P3 — 富文本编辑器与语义块

- [x] P3-01 接入 TipTap，完成普通富文本编辑基础。
- [x] P3-02 实现单一 `promptSection` TipTap Node。
- [x] P3-03 从权威 `sectionKinds` 派生显示名与语义元数据。
- [x] P3-04 实现 Slash Menu。
- [x] P3-05 支持 Goal / Context / Instruction / Constraint / Example / Output Format / Acceptance。
- [x] P3-06 支持自由文本与语义块混写。
- [x] P3-07 支持普通段落与语义块无损转换。
- [x] P3-08 验证 undo/redo 对转换、AI 替换/追加的行为。
- [x] P3-09 AI suggestion 只通过 Editor command 应用。
- [x] P3-10 增加 PromptSection、Slash、转换、history 测试。
- [x] P3-11 语义块常态可见边界。
- [x] P3-12 修复同 document id 外部正文替换：Editor 以 content object identity 区分自身输入和外部替换；本地键入 O(1) 跳过整份 `setContent()`，同 ID 导入则真实重灌并增加 editor generation。

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
- [ ] P5-11 真实浏览器验证未配置/禁用/HTTP/transport/30s timeout 下核心主链仍可用；已有“无 AI 正常”和错误 Base URL 失败证据，仍缺最终构建全链。
- [x] P5-12 suggestion UI Accept/Ignore/stale/advisory 测试。
- [x] P5-13 streaming compatibility/capability cache/SSE 测试。
- [x] P5-14 `AiRequestError` transient/persistent/status/Retry-After/error body 分类。

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
- [x] P6-16 context identity 绑定 document generation + block + caret；不跨块。
- [x] P6-17 块首/中/尾/单字符双向 context；streaming widget key 持续刷新。
- [x] P6-18 `completionContextChars` 显式贯穿 Editor 并进入 identity。
- [x] P6-19 streaming partial 约 48ms 合并刷新；删除 Hook 第二套裁剪。
- [x] P6-20 **持续输入稳定性加固，不作为预存长文本根因：** debounce/cadence 分离、IME suppression、transient retry/Retry-After。
- [x] P6-21 **预存长文本链根修：** bounded context scan、body sniff、删除 cross-context persistent cooldown、真实 error/recovery、blur/composition 清 ghost、cache fast-path。
- [x] P6-22 删除 `completionSettingsKey()` 复合字符串 identity；补全设置变化直接依赖稳定不可变 `AiSettings` 对象 identity，不再每 render 拼接 Provider/URL/model/API Key。
- [ ] P6-15 真实 Chrome 配置可用 AI，验证块首/中/尾、context budget、streaming growth、Tab/Esc、stale cancellation、block-local；独立验证 A：预存长 Prompt 不输入只点 caret；独立验证 B：中文 IME 持续输入不形成 request storm；关闭补全后无自动请求。最新 P6-16～P6-22 构建待复测。

---

## P7 — V1 体验收口

- [x] P7-01 轻量文档切换/列表/搜索/新建/删除。
- [x] P7-02 最近文档恢复逻辑。
- [ ] P7-03 当前最终构建 360px 窄 Side Panel 真机可用性。
- [ ] P7-04 键盘可达性：Slash、Tab、Esc、SelectionActionBar。
- [ ] P7-05 完整错误路径无假成功/静默失败；当前新增关注同 ID 导入覆盖与 stale autosave callback。
- [ ] P7-06 Copy / Save 连续重复操作状态一致性；需验证快速输入时旧 save callback 不误报“已保存”。
- [ ] P7-07 最终代码减法审查；已删除旧 SelectionContextMenu 实现/viewport rect/旧 CSS/重复 completion 裁剪/floatingPanels/header-only stream/persistent cooldown/hasBlockContext；**本轮又删除 SelectionContextMenu 兼容 alias、`completionSettingsKey()`、autosave 文档列表全量 `.sort()` 热路径**；待真机后最后反查。
- [x] P7-08 Non-goals 反向搜索完成。
- [ ] P7-09 权威文档最终实现态收口；本轮代码态已同步，待浏览器验收后最终证据复核。
- [ ] P7-10 真实浏览器性能收口：代码侧已完成 bounded context、partial batching、Sheet lazy-load、**PromptEditor runtime lazy split**。构建从单一 sidepanel `616.97 kB / gzip 195.41 kB` 变为同步 shell `228.57 / 73.72` + async PromptEditor `388.80 / 122.57`，`>500KB` warning 因真实拆包消失且未调 warningLimit。该数据只证明首屏同步 chunk 大幅下降，不等同总 JS 删除 63%；仍需 Chrome/Edge 首开与输入体感验收。
- [x] P7-11 D018 选区根修：ProseMirror selection 唯一权威，固定 SelectionActionBar。
- [x] P7-12 第一组 5×代码审查/优化/减法/性能优化完成。
- [x] P7-13 第一组 5×文档同步完成。
- [x] P7-14 P6-20 第二组 5×代码收口完成。
- [x] P7-15 P6-20 第二组 5×文档同步完成。
- [x] P7-16 P6-21 第三组（纠正预存文本前提后）5×代码收口完成。
- [x] P7-17 P6-21 第三组 5×文档同步完成。
- [x] P7-18 **本轮新的 5×代码审查/优化/减法/性能优化完成：** ①删除退役 `SelectionContextMenu` alias 并迁移 App；②修同 ID 显式导入被 revision guard 静默拒绝；③修同 ID 外部 content 无法刷新 Editor，并以 O(1) object identity 避免本地键入重灌；④删除包含 API Key 的 `completionSettingsKey()` 每 render 拼接；⑤Editor 真实 lazy split + stale autosave result guard + revision-aware 线性 document-list upsert。中间 lazy wrapper TS4023 被 CI 捕获后通过导出真实 Props 契约根修，未绕过类型检查。
- [x] P7-19 **本轮 5×文档同步完成：** UX → ARCHITECTURE → DECISIONS/D022 → AGENTS → TASKS/README；不以 CI/fixture 冒充真实浏览器验收。

---

## P8 — V1 最终验证与发布候选

- [x] P8-01 GitHub Actions TypeScript/static check 通过。
- [x] P8-02 GitHub Actions unit/focused tests 全集通过。
- [x] P8-03 GitHub Actions Extension build 通过。
- [ ] P8-04 Chrome 当前最终构建主链 E2E：编辑 → Slash/转换 → AI suggestion/补全 → lint → Preview → Copy → 文档操作；**新增验证 Editor lazy chunk 首次加载后可立即编辑。**
- [ ] P8-05 Edge 当前最终构建 smoke。
- [ ] P8-06 浏览器关闭/重启最近 Prompt 恢复；**新增同 ID 备份覆盖后重启仍保持覆盖内容。**
- [ ] P8-07 AI 未配置/禁用/失败真实浏览器降级，补全关闭无自动请求。
- [ ] P8-08 opt-in completion 真实 Provider E2E：block-local、任意 caret、context budget、预存长文本、IME 持续输入、streaming growth、错误恢复、stale error、completion model。
- [x] P8-09 Manifest 固定权限仅 `storage` / `sidePanel`；optional host 只服务 Provider。
- [x] P8-10 依赖许可证审计与 CI 门禁。
- [ ] P8-11 V1 release notes / Known Limitations。
- [ ] P8-12 真实浏览器验证**快速连续输入 save badge**：旧 revision 晚到成功/失败不得把较新 revision 误标；验证导出 → 同 ID 导入 → 选择覆盖后 Editor 立即切换到备份内容，不出现假成功。

**V1 完成定义：** `docs/PRODUCT.md` 成功标准全部有真实验证证据，且 P0-P8 所有未取消任务完成。

---

## 当前状态

当前代码已经完成第三次追加 5× 收口。除补全链之外，本轮从代码一致性和性能继续发现并关闭了三类此前未暴露的问题：**同 ID 备份显式覆盖可能被 Repository revision guard 静默拒绝；同 ID 外部内容即使持久化也可能不刷新当前 TipTap Editor；旧 autosave callback 可能晚到并误报当前 save badge / 回退文档列表。** D022 已统一规定版本所有权与覆盖语义。

性能侧不再只有“保留 >500KB warning”：TipTap/ProseMirror Editor 已真实拆成 async chunk。最新代码门禁中同步 sidepanel 约 `228.57 kB / gzip 73.72 kB`，PromptEditor async chunk 约 `388.80 / 122.57`，原 `>500KB` warning 自然消失；这代表首屏同步解析体积降低，不代表总 JavaScript 同比例删除。

当前最优先剩余工作：

1. Chrome 拉最新构建后先确认 Side Panel 打开时 Editor lazy chunk 能正常出现并立即编辑；
2. 快速连续输入 5～10 秒，观察“保存中/已保存”最终只跟最新正文一致；
3. 导出当前 Prompt，再恢复同 ID 备份并选择“覆盖”，确认 Editor **立即**变为备份内容；关闭/重开后仍一致；
4. 继续独立复测预存长文本 caret completion 与 IME 持续输入稳定性；
5. Edge 最终 Manifest/360px/键盘、浏览器重启、AI 禁用/错误/超时降级、最后 release notes。
