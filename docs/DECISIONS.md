# DECISIONS — PromptNote

本文件记录已经确认、会影响后续实现方向的重要决策。它不是会议纪要，而是防止重复争论和架构回摆的轻量 ADR 索引。

格式：`Dxxx — 标题`，包含状态、决定、原因、影响。

---

## D001 — 重新建立项目，不 Fork 现成 Prompt 平台

**状态：Accepted**

### 决定

PromptNote 从干净仓库重新实现，不直接 Fork flompt、PromptLayer 等现成平台。

### 原因

现有产品通常包含 PromptOps、后端、模型调用、部署、市场、账号等超出 V1 的职责。直接 Fork 会继承无关代码和架构债。

### 影响

允许定向借鉴 SimplestPrompt 的 Side Panel 思路、TipTap/pagescms editor 的富文本体验和 flompt 的 Prompt Block/Compiler 产品思路。原则：借能力，不继承代码债。

---

## D002 — 产品名为“提词笺 / PromptNote”

**状态：Accepted**

中文名：提词笺。英文名：PromptNote。定位语：**“像写文档一样写 Prompt。”**

---

## D003 — V1 是 manual-first 编辑器，不是 AI Prompt 优化器

**状态：Accepted，内联补全例外由 D017 补充**

用户是作者。AI 不默认整篇重写，不直接覆盖正文。普通局部/全局 AI 动作仍必须显式触发。D017 允许严格受控的 opt-in inline completion，ghost 只有 `Tab` 接受后才进入正文。

---

## D004 — V1 使用 Chrome / Edge Extension + Side Panel

**状态：Accepted**

浏览器 Extension 是第一交付形态，Side Panel 是主要编辑界面。PromptNote 不因此承担修改第三方网页 DOM 的职责。

---

## D005 — 编辑器使用 TipTap

**状态：Accepted**

使用 TipTap / ProseMirror 作为富文本编辑内核，以支持 WYSIWYG、Slash Menu、自定义语义块、选区操作和结构化 JSON。

---

## D006 — PromptDocument 是唯一正文内容源

**状态：Accepted**

正文持久化只保存 PromptDocument / TipTap JSON。Markdown、Plain Text、XML、AI suggestion、ghost completion 都不是第二正文源；所有输出经 Compiler 派生。

---

## D007 — Prompt 语义块使用单一 promptSection Node

**状态：Accepted**

不同语义通过 `promptSection.kind` 表达，不创建 goalNode、constraintNode、exampleNode 等平行 Node 类型。

---

## D008 — V1 本地优先，无后端

**状态：Accepted**

V1 不建设账号、服务器、云数据库和同步后端。本地持久化通过 Repository 抽象，初始实现使用 `chrome.storage.local`。

---

## D009 — Compiler 独立于 UI、Storage、DOM 和 AI

**状态：Accepted**

Compiler 只做 `PromptDocument → Plain / Markdown / XML` 的纯派生转换。

---

## D010 — 网页差异集中在 Web Adapter

**状态：Superseded by D017**

曾计划把 ChatGPT / Claude / Gemini 等网页的 DOM 差异集中到 Adapter 层。D017 已将第三方网页 DOM 写入从 V1 删除。

---

## D011 — AI 只产生 Suggestion / Lint Finding

**状态：Accepted，内联补全例外由 D017 补充**

普通 AI 编辑能力返回 suggestion / lint finding，用户接受后 Editor command 才能修改 PromptDocument，并使用 source revision guard。D017 的 inline completion 以 ghost decoration 存在，同样不能直接成为正文。

---

## D012 — V1 不做 Prompt 平台化能力

**状态：Accepted**

Prompt Marketplace、团队协作、Agent Workflow、MCP 平台、模型 Playground、A/B Test、企业权限、云同步等不进入 V1。核心主链是：**写 → 结构化 → 检查 → 编译 → 复制**。

---

## D013 — P1 前先完成 P0.5 可交互 UX 原型验证

**状态：Superseded by D014**

正式 React / Extension 实现之前先做可交互原型，验证 Side Panel 核心编辑体验。

---

## D014 — P0.5 改为单文件 HTML 可交互原型

**状态：Accepted**

**Supersedes:** D013 中“使用 Figma 作为原型载体”的部分。

P0.5 使用 `prototype/promptnote-prototype.html` 单文件 HTML 原型，不依赖 Node、React、CDN、后端或真实 AI API。原型只作为 UX reference。

---

## D015 — AI 配置是扩展偏好，不属于 PromptDocument

**状态：Accepted**

AI enabled、inline completion enabled、Provider、Model、API Base URL、credential、默认内容发送范围都作为 Extension Preferences 独立保存，不进入 PromptDocument、导入导出或 Compiler。

修改 Provider / Model / Base URL / API Key 后，连接成功状态与补全开关必须失效；AI 未配置、关闭、失败不得阻断编辑、保存、Compiler、Copy。

---

## D016 — Web Insert 使用通用 caret-first 语义，站点 Adapter 只做特殊兼容

**状态：Superseded by D017**

曾将 Web Insert 重构为通用 caret-first 插入并尝试减少站点耦合。真实浏览器验证仍显示 DOM 兼容、receiver 生命周期和权限成本过高，收益不如复制粘贴，因此被 D017 整体取代。

---

## D017 — 删除 Web Insert，改为 Copy + opt-in IDE 风格内联补全

**状态：Accepted**

**Supersedes:** D010、D016；并补充 D003、D011、D015。

### 决定

第三方网页写入退出 V1。删除 Web Adapter、ChatGPT Adapter、textarea/contenteditable 插入引擎、page bridge/content script、`activeTab`/`scripting` 权限与网页 fixture。外部交付统一使用 Copy。

AI 内联补全采用 IDE ghost text 心智：编辑停顿 → caret 后灰色短续写 → Tab 接受 → Esc 忽略。只有 `configured && enabled && completionEnabled` 同时成立才允许自动请求，补全开关默认关闭。

### 状态与性能边界

- ghost 不属于 PromptDocument，不参与 autosave/Compiler/revision；
- 修改 Provider / Model / Base URL / API Key 后补全开关失效；
- 每次只发送当前 text block 的有限局部上下文；
- 新输入/移动 caret 取消旧请求；
- stale completion 在 doc/selection/context budget 变化时失效；
- fixed permissions 收缩为 `storage` / `sidePanel`，optional host permission 只服务 AI Provider。

---

## D018 — 选区操作使用稳定底部工具条，不再使用文字旁 `•••`

**状态：Accepted**

选中文字后，在 Side Panel 主 actionbar 上方显示 `SelectionActionBar`，直接提供局部 AI 与单块类型转换。选区状态只来自 ProseMirror EditorState，不使用 DOM selection、viewport rect、`coordsAtPos`。

真实 Chrome 窄 Side Panel 证明旧浮动入口会偶发不出现、丢 selection、被滚动容器裁剪且多一次点击。继续修坐标属于维护失败交互，而不是修根因。

旧 `SelectionContextMenu` 与其兼容别名都不得保留；跨块选区允许文本 AI 动作但禁止 block type 转换。

---

## D019 — V1 收口采用单状态源性能优化，不以阈值掩盖问题

**状态：Accepted**

性能优化优先减少真实热路径工作，而不是调大 warning、增加隐藏缓存状态或制造第二实现：completion context budget 显式贯穿 Editor；streaming partial 合并刷新；Repository 批量恢复且 revision 单调；非首屏 UI 按需加载；`>500KB` warning 只能通过真实 bundle/启动问题解决后消失，不允许调高 `chunkSizeWarningLimit` 伪装优化。

---

## D020 — 内联补全将“用户停顿”与“网络请求”分开治理

**状态：Accepted，适用于持续输入稳定性；已有文本问题由 D021 单独定义**

`completionDelayMs` 只表示 caret 需要稳定多久，不等价于每次停顿都能发新请求。真实 Provider 请求有独立 cadence；IME composition 不发布 context；短时 429/5xx/timeout/transport 在原 context 有效时有限重试并尊重 `Retry-After`；新 context 取消旧 request/retry；persistent auth/config/quota error 不无限重试。

该规则解决持续输入中的请求风暴风险，但不能据此推断“早已存在的长文本聚焦失败”就是 IME/request storm。

---

## D021 — 已有长文本补全按局部 context 成本运行，不把输入历史当诊断依据

**状态：Accepted**

当 caret 放到之前已经存在的较长 block 中时：

- `completionContextChars` 同时是发送上限与 context 读取成本边界；
- streaming/non-streaming 由 body sniff 确认，不只信 `Content-Type`；
- persistent error 不给后续新 context 设置跨 context 30 秒 cooldown；
- success cache hit 在 prompt/provider/request 构造之前 fast-path；
- blur / IME composition 同时使 context 与 ghost 失效；
- failure 显示长度受控真实原因，成功恢复清 stale AI error。

以后收到“长文本不补全”必须先确认文本是刚输入还是预存；预存场景优先检查 context 构建复杂度、focus/caret identity、Provider body 兼容和 stale state。

---

## D022 — 异步结果必须按 revision 收口，重型运行时可拆包但不得复制状态

**状态：Accepted；决定 C 中 PromptEditor runtime lazy split 已由 D023 supersede**

### 决定 A：异步 UI 状态受 document version 所有权约束

Repository 的 revision 单调保护只解决“旧正文不能覆盖新正文”，还不够。任何异步 `save(snapshot)` 的成功/失败回调如果要修改顶部保存状态、文档列表或其他用户可见状态，必须先证明当前 document id + revision 仍与该 snapshot 对应。

因此：

- 旧 revision 晚到成功不得把正在编辑的新 revision 标成“已保存”；
- 旧 revision 晚到失败不得把新 revision 标成“未保存”；
- 旧 snapshot 不得把文档列表回退；
- 文档列表更新本身保持 revision 单调。

### 决定 B：显式覆盖继续遵守 Repository 不变量

用户从电脑恢复一个与本地同 ID 的备份并明确选择“覆盖”时，不增加 bypass/force-save API，也不放松 Repository 的旧 revision 拒绝规则。导入层把文档 revision 提升到：

```text
max(local.revision, backup.revision) + 1
```

然后继续走正常 `save()`。拒绝覆盖则生成新 id。

同 ID 外部替换必须立即进入当前 Editor；Editor 通过“自身刚产生的 content object identity vs 外部新 content object”区分本地输入和外部替换，本地每次键入不得 stringify 全文或反复 `setContent()`。

### 决定 C：重型运行时允许真实代码分割（历史决定，PromptEditor 部分由 D023 supersede）

TipTap/ProseMirror Editor 曾从 Side Panel shell 中拆为 lazy chunk。lazy wrapper 只负责 `Suspense + ref` 转发，不维护第二份 PromptDocument/Editor 状态。

当时静态构建从单一约 616.97 kB / gzip 195.41 kB 的主 Side Panel JS，拆为约：

```text
sidepanel shell   228.57 kB / gzip 73.72 kB
PromptEditor      388.80 kB / gzip 122.57 kB（async）
```

这只代表当时首屏同步解析体积下降，不代表总 JS 删除约 63%。随后真实 Chrome 运行验证暴露白屏回归，D023 因此撤销 PromptEditor runtime lazy split；非首屏 Sheet 仍可按需加载。

### 决定 D：不制造无必要的身份字符串和兼容别名

- React 中稳定、不可变的 `AiSettings` 对象 identity 足以作为补全设置失效边界，不再每次 render 拼接包含 URL/model/API Key 的 `completionSettingsKey`；
- 已退役的 `SelectionContextMenu` 不保留 `SelectionActionBar as SelectionContextMenu` 兼容别名，因为不存在外部 API 兼容需求。

### 原因

单独保证 Storage 不回退，仍可能出现“界面显示已保存但最新内容未保存”“选择覆盖但 Repository 实际拒绝”“同 ID 覆盖成功但 Editor 仍显示旧内容”等假成功。与此同时，长期保留巨型首屏 bundle、全文 stringify 和历史别名会把收口阶段重新拖回复杂实现。

### 影响

后续代码审查必须把**异步回调是否仍拥有当前版本**作为一等检查项；显式覆盖通过生成合法新 revision 表达，而不是绕开约束；性能报告必须区分同步首屏 chunk 与异步/总字节，不能用 code splitting 冒充代码删除。

---

## D023 — PromptEditor V1 保持同步打包，runtime lazy split 暂停

**状态：Accepted**

**Supersedes:** D022 决定 C 中“PromptEditor runtime 使用 `React.lazy + dynamic import()` 拆分”的部分。D022 的 revision ownership、显式覆盖 revision rebase、Editor content object identity 和无冗余 identity 规则继续有效。

### 决定

- V1 的 `PromptEditor` 由 `PromptNoteApp` 直接同步 import，不保留 `LazyPromptEditor` wrapper/re-export；
- `RuntimeErrorBoundary` 继续作为根级运行时错误边界；
- AI Settings / Document Sheet 等非首屏 Sheet 可以继续按需加载；
- Vite `>500KB` warning 明确保留，不通过提高 `chunkSizeWarningLimit` 掩盖；
- 未来若重新引入 PromptEditor runtime lazy split，必须先有可重复的 Chrome + Edge 真机验证方案，并在接受前证明首次打开、持续输入、重开 Side Panel 均稳定。

### 原因

2026-08-08 的真实 Chrome 验证显示：PromptEditor 改成运行时 `React.lazy + dynamic import()` 后，Side Panel 先正常显示约 0.1 秒，随后整页白屏。该构建当时 TypeScript、Lint、单测与 production build 全部通过，说明静态 CI 不能替代浏览器运行时证据。

在恢复同步 PromptEditor、保留 Runtime Error Boundary 后，后续真实 Chrome 验证持续稳定，补全、Slash、保存、恢复和其它主链均正常。因此 V1 以已验证的同步运行时为正确性基线。

### 影响

当前生产构建保持约 620 kB / gzip 196 kB 的同步 Side Panel 主包，并保留 Vite `>500KB` warning。该 warning 是已知性能债，不是通过冒险拆分 Editor 或调整阈值解决的发布阻塞项。后续性能优化继续以真实 profile、依赖体积和可验证启动瓶颈为依据。

---

## 决策变更规则

如果要推翻 Accepted 决策：

1. 不删除旧决策；
2. 新增一条决策并标明 supersedes 哪一条；
3. 写清楚为什么原假设失效；
4. 同步更新 PRODUCT / UX / CONTRACT / ARCHITECTURE；
5. 再修改实现。

禁止直接修改代码形成事实上的架构变更，却不更新决策文档。
