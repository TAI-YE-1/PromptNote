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

允许定向借鉴：

- SimplestPrompt 的 Chrome Side Panel 思路；
- TipTap / pagescms editor 的富文本和 Slash Menu 体验；
- flompt 的 Prompt Block / Compiler 产品思路。

原则：借能力，不继承代码债。

---

## D002 — 产品名为“提词笺 / PromptNote”

**状态：Accepted**

中文名：提词笺。英文名：PromptNote。

定位语：**“像写文档一样写 Prompt。”**

---

## D003 — V1 是 manual-first 编辑器，不是 AI Prompt 优化器

**状态：Accepted，内联补全例外由 D017 补充**

### 决定

用户是作者。AI 不默认整篇重写，不直接覆盖正文。普通局部/全局 AI 动作仍必须显式触发。

D017 允许一个严格受控例外：用户单独开启内联补全后，可在编辑停顿时自动请求短续写，但 ghost text 不是正文，只有 `Tab` 接受后才进入 PromptDocument。

---

## D004 — V1 使用 Chrome / Edge Extension + Side Panel

**状态：Accepted**

浏览器 Extension 是第一交付形态，Side Panel 是主要编辑界面。

Side Panel 适合在 ChatGPT / Claude / Gemini / Codex 等工具旁持续编辑，但 PromptNote 不因此承担修改这些网页 DOM 的职责。

---

## D005 — 编辑器使用 TipTap

**状态：Accepted**

使用 TipTap / ProseMirror 作为富文本编辑内核，以支持 WYSIWYG、Slash Menu、自定义语义块、选区操作和结构化 JSON。

---

## D006 — PromptDocument 是唯一正文内容源

**状态：Accepted**

正文持久化只保存 PromptDocument / TipTap JSON。

Markdown、Plain Text、XML、AI suggestion、ghost completion 都不是第二正文源。

所有输出经 Compiler 派生；Preview 不可独立编辑；ghost completion 只有被用户接受后才成为正文。

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

### 历史决定

曾计划把 ChatGPT / Claude / Gemini 等网页的 DOM 识别与插入逻辑集中到 Adapter 层。

### 现状

D017 已将第三方网页 DOM 写入整个能力从 V1 删除，因此 Web Adapter 不再存在于生产架构。

---

## D011 — AI 只产生 Suggestion / Lint Finding

**状态：Accepted，内联补全例外由 D017 补充**

普通 AI 编辑能力仍返回 suggestion / lint finding，只有用户接受后 Editor command 才能修改 PromptDocument，并继续使用 source revision guard。

D017 新增的 inline completion 不走 SuggestionCard，而以短生命周期 ghost decoration 存在；它同样不能直接成为正文。

---

## D012 — V1 不做 Prompt 平台化能力

**状态：Accepted**

Prompt Marketplace、团队协作、Agent Workflow、MCP 平台、模型 Playground、A/B Test、企业权限、云同步等不进入 V1。

核心主链现在是：**写 → 结构化 → 检查 → 编译 → 复制**。

---

## D013 — P1 前先完成 P0.5 可交互 UX 原型验证

**状态：Superseded by D014**

### 历史决定

正式 React / Extension 实现之前先做可交互原型，验证 Side Panel 核心编辑体验。

---

## D014 — P0.5 改为单文件 HTML 可交互原型

**状态：Accepted**

**Supersedes:** D013 中“使用 Figma 作为原型载体”的部分。

P0.5 使用 `prototype/promptnote-prototype.html` 单文件 HTML 原型，不依赖 Node、React、CDN、后端或真实 AI API。

原型只作为 UX reference，不是 PromptDocument、Compiler、正式 Extension 或当前产品范围的权威来源；后续正式产品决定可明确取代原型中的模拟能力。

---

## D015 — AI 配置是扩展偏好，不属于 PromptDocument

**状态：Accepted**

### 决定

以下均作为 Extension Preferences 独立保存：

- AI enabled；
- inline completion enabled；
- Provider；
- Model；
- API Base URL；
- credential；
- 默认内容发送范围。

这些配置不得写入 PromptDocument、Prompt JSON 导入导出或 Compiler 输出。

### 交互约束

- Top Bar 提供 AI 状态入口；
- 普通选区/全局 AI 动作必须显式触发；
- 内联补全是独立开关，默认关闭；
- 修改 Provider / Model / Base URL / API Key 后，连接成功状态与补全开关必须失效；
- AI 未配置、关闭、失败或补全关闭不得阻断编辑、保存、Compiler、Copy。

---

## D016 — Web Insert 使用通用 caret-first 语义，站点 Adapter 只做特殊兼容

**状态：Superseded by D017**

### 历史决定

曾将 Web Insert 从 append/replace 重构为通用 caret-first 插入，并尝试以 `activeTab + scripting` / page bridge 降低站点耦合。

### 被取代原因

真实浏览器验证显示，这条链路仍带来：

- 站点 DOM / 富编辑器兼容成本；
- Extension 注入权限与 receiver 生命周期问题；
- 与用户直接复制粘贴相比收益有限；
- 额外代码、测试、权限和性能维护负担。

D017 因此删除整个 Web Insert 能力，而不是继续叠加兼容补丁。

---

## D017 — 删除 Web Insert，改为 Copy + opt-in IDE 风格内联补全

**状态：Accepted**

**Supersedes:** D010、D016；并补充 D003、D011、D015。

### 决定 A：第三方网页写入退出 V1

V1 不再提供“插入网页”按钮，也不再维护：

- Web Adapter；
- ChatGPT 专用 Adapter；
- 通用 textarea/contenteditable 插入引擎；
- page bridge / content script；
- `activeTab` / `scripting` 注入权限；
- 网页 DOM fixture 与相关消息契约。

外部交付统一使用 Copy。用户把编译结果粘贴到任何 AI 工具，不依赖站点 DOM。

### 决定 B：增加独立 opt-in 的内联补全

AI 内联补全采用 IDE ghost text 心智：

```text
编辑停顿
→ caret 后出现灰色短续写
→ Tab 接受
→ Esc 忽略
```

只有以下三个条件同时成立才允许自动请求 Provider：

```text
AI 已配置成功
AND AI 辅助总开关已启用
AND 编辑器内联补全开关已开启
```

补全开关默认关闭。只打开 AI 总开关不等于同意自动补全。

### 状态与隐私边界

- ghost completion 不属于 PromptDocument；
- 不参与 autosave、Compiler、revision；
- 只有 `Tab` 接受后才通过 Editor transaction 成为正文；
- 修改 Provider / Model / Base URL / API Key 后，补全开关自动失效；
- `optional_host_permissions` 仅用于用户实际配置的 AI Provider origin。

### 性能约束

- 编辑停顿防抖后再请求；
- 每次只发送当前 text block 内受配置限制的 caret 局部上下文；
- 新输入/移动 caret 时取消旧请求；
- completion 使用短输出和低温度；
- 失败后短退避，避免请求风暴；
- stale completion 在 doc/selection/context budget 变化时立即清除。

### 权限影响

Manifest 固定权限收缩为：

```text
storage
sidePanel
```

不再需要 `activeTab`、`scripting` 或第三方网页 host access。任意 optional host permission 仅服务 AI Provider 网络请求。

### 产品原因

PromptNote 的核心价值是“舒服地写、整理和检查 Prompt”，而不是维护各网站输入框 DOM。删除 Web Insert 后：

- 权限更小；
- 运行时更轻；
- 代码和测试面显著缩小；
- 外部输出不再受网页改版影响；
- AI 能力转而强化编辑器内部体验，更接近 IDE 辅助而不是浏览器自动化。

---

## D018 — 选区操作使用稳定底部工具条，不再使用文字旁 `•••`

**状态：Accepted**

### 决定

选中文字后，在 Side Panel 主 actionbar 上方显示稳定的选区工具条，直接提供“改清楚 / 缩短 / 拆约束 / 更多 AI”和单块类型转换。

选区状态只来自 ProseMirror EditorState：selected text、from/to、single-block format。不得把 DOM selection、viewport rect、`coordsAtPos` 结果作为选区业务状态，也不得恢复文字旁微型 `•••` 二级入口。

### 原因

真实 Chrome 窄 Side Panel 测试多次证明文字旁浮动入口存在：

- 偶发不出现；
- 浏览器 focus/selection 与 ProseMirror selection 竞争；
- 出现后点击可能先丢失 selection；
- 浮层容易被滚动容器裁剪或挤出边界；
- 用户必须额外点击一次才能看到真正动作。

继续修坐标属于维护失败交互，而不是修根因。

### 影响

- 删除旧 `SelectionContextMenu` 与 viewport rect 状态；
- 跨块选区仍可执行文本 AI 动作，但禁止 block type 转换；
- 选区工具与 AI busy / suggestion / lint 共用明确的 transient surface 优先级，不得互相覆盖。

---

## D019 — V1 收口采用单状态源性能优化，不以阈值掩盖问题

**状态：Accepted**

### 决定

性能优化优先减少真实热路径工作，而不是调大 warning、增加隐藏缓存状态或制造第二实现：

- completion context budget 由 AI 设置显式传入 Editor，并进入 request identity；
- streaming partial 在短窗口合并 UI 刷新，避免 token 粒度根树 render；
- streaming capability 按 provider + endpoint + completion model 缓存，SSE 容忍 keep-alive；
- Repository 启动恢复批量读取 documents/current id，更旧 revision 不得覆盖更新 revision；
- AI 设置与本地 Prompt Sheet 按用户打开时 lazy-load，正文和设置状态仍由原有单一状态源提供；
- Vite `>500KB` 主 chunk warning 只有真实 bundle/启动问题解决后才可消失，不允许通过提高 `chunkSizeWarningLimit` 伪装优化。

### 影响

代码审查必须优先检查重复 IO、重复派生、token 级根组件 render、无必要首屏模块、过期异步结果和旧 revision 写回。

---

## 决策变更规则

如果要推翻 Accepted 决策：

1. 不删除旧决策；
2. 新增一条决策并标明 supersedes 哪一条；
3. 写清楚为什么原假设失效；
4. 同步更新 PRODUCT / UX / CONTRACT / ARCHITECTURE；
5. 再修改实现。

禁止直接修改代码形成事实上的架构变更，却不更新决策文档。
