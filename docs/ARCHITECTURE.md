# ARCHITECTURE — PromptNote

本文件定义 V1 的技术边界、模块职责和依赖方向。目标是保持项目轻量、单向数据流、单一状态源，并避免编辑器、AI 与持久化互相耦合。

## 1. V1 形态

- Chrome / Edge Extension
- Manifest V3
- Side Panel 主界面
- React + TypeScript
- TipTap / ProseMirror 编辑器
- `chrome.storage.local` 本地持久化
- 无后端、无账号系统、无云数据库
- 不注入第三方网页 DOM，不维护 Web Adapter / Content Script 插入链

## 2. 逻辑架构

```text
┌─────────────────────────────────┐
│          Side Panel UI          │
│ PromptEditor / Preview / Lint   │
│ AI Status / Settings            │
└───────────────┬─────────────────┘
                │
                ▼
         PromptDocument
         （唯一正文源）
        ┌───────┼──────────┐
        ▼       ▼          ▼
 Repository  Compiler  AI Assistance
        │       │          │
 chrome.storage string     ├─ Suggestion / Lint
                           └─ Inline Completion
                                  │
                                  ▼
                         AI Provider Adapter
```

内联补全只以 ProseMirror decoration / ghost text 存在。它不是 PromptDocument，也不触发保存；只有 `Tab` 接受后才通过 Editor transaction 成为正文。

另有与正文分离的 Extension Preferences：

```text
Extension Preferences
├─ AI enabled
├─ completionEnabled
├─ completionContextChars
├─ completionDelayMs
├─ completionModel
├─ instructionOverrides
├─ Provider
├─ Model
├─ API Base URL
├─ API credential
└─ default AI content scope
```

这些设置不得进入 PromptDocument、导出的 Prompt JSON 或 Compiler 输出。

## 3. 目录职责

```text
src/
├─ app/
│  ├─ PromptNoteApp.tsx
│  └─ useInlineCompletion.ts
├─ editor/
│  ├─ PromptEditor.tsx
│  ├─ promptSection.ts
│  ├─ completionContext.ts
│  ├─ ghostCompletion.ts
│  ├─ selectionSnapshot.ts
│  └─ blockConversion.ts
├─ prompt/
│  ├─ schema.ts
│  ├─ sectionKinds.ts
│  ├─ compiler.ts
│  └─ text.ts
├─ storage/
│  ├─ promptRepository.ts
│  └─ aiSettingsRepository.ts
├─ ai/
│  ├─ completionTuning.ts
│  ├─ instructions.ts
│  ├─ provider.ts
│  ├─ suggestions.ts
│  ├─ lint.ts
│  └─ types.ts
├─ extension/
│  └─ background.ts
├─ ui/
│  ├─ components.tsx        # 稳定 barrel，仅 re-export
│  ├─ LazySheets.tsx        # AI / Document sheet 按需加载边界
│  ├─ AiSheet.tsx
│  ├─ AiAdvancedSettings.tsx
│  ├─ DocumentSheet.tsx
│  ├─ SelectionActionBar.tsx
│  ├─ SlashMenu.tsx
│  ├─ SuggestionCard.tsx
│  ├─ LintCard.tsx
│  └─ Preview.tsx
└─ main.tsx
```

文件拆分按真实职责，不为“架构感”制造空 wrapper；`components.tsx` 只保留稳定聚合入口，避免再次退化成巨型 UI 文件。已经被替代的 `SelectionContextMenu`、viewport rect 定位和独立 floating-panel stylesheet 不得保留为平行旧链。

## 4. 依赖方向

### 4.1 Prompt 核心层

`prompt/` 定义 PromptDocument Schema、section kind、Compiler 与纯文本派生逻辑。

不得依赖 React、Chrome API、页面 DOM 或 AI Provider。

### 4.2 Editor 层

`editor/` 负责 TipTap Extension、Slash Menu、编辑命令、选区、语义块转换和 ghost completion decoration。

Editor 不直接读写 Storage，也不直接调用 Provider。`completionContext.ts` 负责从当前 EditorState 产生补全 context identity；ghost completion 只接收已经绑定到该 identity 的短字符串并负责显示、失效、`Tab` 接受、`Esc` 忽略。

补全 context 必须至少绑定：document id、editor document generation、当前 block 起点、caret position、用户当前 `completionContextChars`、当前 block 的光标前/后文本和 section kind。AI 返回结果不得在到达时重新读取“当前 selection”决定位置。

**IME composition 是 Editor 层的稳定性边界。** 当 ProseMirror `view.composing=true` 时，Editor 必须发布 `null` completion context；不能把中文/日文输入法尚未提交的组词中间态交给补全调度。composition 完成后的正常 Editor update 再按真实 caret 重新建立 context。

`selectionSnapshot.ts` 只从 ProseMirror EditorState 产生选区快照。选区文本、from/to 与单块类型以 ProseMirror selection 为唯一权威；不得重新读取 `window.getSelection()`、`getBoundingClientRect()` 或维护 viewport rect 作为业务状态。跨块选区可以用于文本 AI 动作，但 block type 为 `null`，禁止类型转换。

### 4.3 App 层

`app/PromptNoteApp.tsx` 负责组合 UI 与应用状态；`useInlineCompletion.ts` 只负责补全请求调度。

补全调度必须同时检查：

```text
settings.configured
&& settings.enabled
&& settings.completionEnabled
```

否则不得发自动请求。

流式 partial 和最终结果都必须携带请求发起时的 context identity；只要当前 editor context key 已变化，旧 partial、旧等待和旧自动重试必须直接失效，不能重新挂到新的 caret。

`ai/completionTuning.ts` 是补全 context/delay/cadence/retry policy 的唯一数值权威。`useInlineCompletion.ts` 不得再平行维护另一套 request interval、退避基数、最大退避或重试次数常量。

Streaming partial 可以在短时间窗口内合并 UI 更新，当前实现以约 48ms 为上限合并连续 partial，避免每个 token 都触发根 React 树 render；最终结果、错误和 `Tab` 接受仍必须立即收口，不能为了减少 render 等待完整回复才显示。

### 4.4 Storage 层

`storage/` 是本地持久化唯一入口。

- `PromptRepository`：PromptDocument；
- AI settings repository：Provider、credential、AI 总开关、补全开关、补全调优数值、补全模型和每动作指令覆盖等扩展偏好。

禁止正文同时写 localStorage / IndexedDB / Chrome Storage 多份副本；禁止保存 Markdown/XML 派生副本。

同一 PromptDocument 的持久 revision 必须单调：Repository 收到更旧 revision 时不得覆盖已经持久化的更新 revision。启动恢复应优先批量读取 documents + current id，避免为了恢复当前文档反复进行 Storage round-trip。

### 4.5 Compiler 层

Compiler 只做：

`PromptDocument → Plain / Markdown / XML`

不得修改 Editor、读取 Storage、调用 AI 或读取网页 DOM。

### 4.6 AI Assistance 层

Provider Adapter 统一处理 Provider 差异、Base URL、Model、credential、请求、流式响应、超时与错误归一化。

AI 有两类调用：

1. **显式动作**：selection/global suggestion、AI lint；
2. **内联补全**：唯一允许自动调用的能力，但必须由独立补全开关显式 opt-in。

Suggestion 必须带来源 revision；过期 suggestion 不得应用。

内联补全不创建 PromptSuggestion，也不创建第二正文状态，只返回短 continuation 字符串。补全可以配置独立 `completionModel`；为空时沿用主 `Model`，非空时只有 `complete` action 使用该模型，其他 AI 动作保持主模型。OpenAI-compatible / Anthropic 补全优先流式显示首批可用文本；不支持 streaming 的模型/端点组合可回退非流式，但不得伪造流式成功。

Provider 网络错误必须归一化为可判断的错误类型。当前 `AiRequestError` 至少携带 HTTP status、`transient` 与可选 `retryAfterMs`：短时 429、408/409/425、5xx、timeout/transport 可作为临时错误；认证、参数、配置及可识别的额度/配额耗尽属于持久错误。Provider 返回 JSON error body 时优先提取可读 message，错误正文必须有长度上限。

Streaming capability cache 必须至少区分 provider + endpoint + 实际 completion model，不能因为某个模型拒绝 `stream=true` 就把同一网关的所有模型永久降级；该会话缓存本身也必须有容量上限。SSE 解析必须容忍合法 keep-alive/comment 行与错误 Content-Type，但普通 JSON 响应仍需正确降级。

`ai/instructions.ts` 是内置 AI 动作指令的唯一权威。每个 action 可以在 Extension Preferences 中保存一个局部 override；空 override 使用默认。公共行为约束仍由代码统一附加，避免每个 Provider 维护另一套 system prompt。

### 4.7 Prompt Lint

本地 deterministic lint 不依赖 AI。AI semantic lint 只有用户显式触发时调用。

### 4.8 Optional UI chunk

AI 设置 Sheet 和本地 Prompt 管理 Sheet 不属于首屏编辑必须代码，可以通过 `React.lazy`/dynamic import 按用户打开时加载。Lazy boundary 只改变模块加载时机，不得复制 AI settings、Prompt list 或当前文档状态。

## 5. 内联补全架构

### 5.1 请求条件

只有以下三个条件同时成立才允许调度：

```text
AI 已配置成功
AND AI 总开关开启
AND completionEnabled = true
```

默认 `completionEnabled=false`。修改 Provider / Model / Base URL / API Key 后，连接状态和补全开关必须失效，避免对未经重新确认的端点自动发请求。

补全上下文、触发延迟、补全模型和 action instruction override 属于行为偏好，不属于 Provider 身份；改变它们不要求重新验证主连接。

### 5.2 Context 隔离与请求身份

补全默认只读取**当前正在编辑的 text block**。如果当前 block 是 `promptSection`，可以把 section kind/中文模块标签作为语义提示发送给模型，但不得把前一个 Goal / Background / Task / Constraint / Output Format 等 block 的正文通过 `doc.textBetween(...)` 静默拼入当前补全。

`completionContextChars` 是当前 block 内以 caret 为中心的最大上下文预算，不是“向前跨多个块取 N 字”。Editor 必须显式接收该配置，禁止内部静默回退到更大的默认值。Context identity 必须记录实际 context budget，设置变化后旧 context 不得继续发送。

每个 context 生成不可复用的身份键，至少包含：

```text
documentId
editor document generation
blockStart
caret position
completionContextChars
sectionKind
beforeText
afterText
```

流式响应到达时必须再次校验 identity。用户继续输入、移动 caret、切换 block、切换文档、正文在其他位置发生变化、修改 context budget、进入 IME composition 或 Editor blur 后，旧请求/旧 ghost/旧 retry 都必须失效。

### 5.3 热路径

当前实现原则：

- 只发送 `completionContextChars` 指定的当前 block 有限上下文；默认 320 字符；快捷预设 160 / 320 / 640，也允许 16–2000 的自定义整数；
- caret 在块首/块中/块尾都允许利用当前块 before/after 双向上下文形成请求；
- 编辑停顿 `completionDelayMs` 后才允许启动候选请求；默认 300ms；快捷预设 150 / 300 / 600ms，也允许 50–3000ms 的自定义整数；
- **用户停顿防抖与真实网络 cadence 分开治理**：网络请求开始时间还受独立最小间隔约束，避免较长句子中多个自然停顿形成请求风暴；
- IME composition 期间没有 completion context，因此不会产生中间组词请求；
- preset 只是 UI 快捷选择，持久状态只保存最终整数，禁止维护第二套 preset/customValue 业务状态；
- OpenAI-compatible 与 Anthropic 补全均优先使用流式响应，第一批有效文本到达后尽快更新 ghost，不等待完整响应结束；
- 连续 streaming partial 可以合并到短渲染窗口，避免 token 粒度根组件 render；
- 流式模型/端点明确不支持 streaming 时自动降级为普通 completion，并按 provider + endpoint + completion model 记住能力，避免跨模型错误降级和每次重复探测；
- SSE parser 接受 `data:`/`event:` 及 keep-alive comment，并能识别被错误标成 `text/plain` 的 SSE；
- 继续输入/移动 caret 时取消旧请求；额外使用 request sequence + context identity guard，防止已经过期的回调覆盖新上下文；
- 相同、仍有效的 context 允许短期小容量复用，避免无意义重复请求；
- Provider 请求保持短 continuation；
- 临时 Provider 错误在原 context 仍有效时使用有限次指数退避自动恢复，并优先尊重 Provider `Retry-After`；达到自动重试上限才升级为用户可见的“补全暂不可用”；
- 持久错误不进行无止境自动重试，进入较长冷却并立即保留真实错误供设置页检查；
- 如果流已经返回可用 partial 后才发生连接中断，保留已到达且仍属于当前 identity 的 partial；
- 退避窗口内产生的新 context 会取消旧 context 的等待/重试，并由新 context 按统一 cadence 重新调度；
- 过期结果不得显示；
- ghost text 不触发 autosave / Compiler / revision。

### 5.4 Editor 状态

Ghost completion 使用 ProseMirror Plugin state + Decoration.widget：

- ghost state 保存原请求的 caret position/context key，不使用结果到达时的 selection 重新定位；
- streaming partial 的 widget identity 必须随可见文本变化，避免 ProseMirror 复用第一批两三个字的旧 DOM；
- `Tab` → 只有当前 selection 仍与 ghost position 完全一致时才插入，随后清除；流仍在进行时也允许接受当前 partial，正文变化后旧流立即取消；
- `Esc` → 只清除 decoration；
- docChanged / selectionSet → 自动清除 stale ghost；
- Editor blur → completion context 失效；focus 后按当前真实 caret 重新建立；
- Editor composing → completion context 失效，不向 Hook 暴露输入法中间态；
- 保留有意义的前导空格，避免英文/代码续写拼接错误；
- 对模型重复输出的明显多字符前缀可做有限 overlap 去重，但不得激进删除单字符正常续写。

## 6. 选区与 transient UI 状态

选区业务状态只保存：

```text
selected text
from / to
single-block format | null
```

不保存 viewport rect，不依赖 DOM selection。只要 ProseMirror selection 非空，选区操作条即可稳定存在；操作条采用固定在主 actionbar 上方的 Side Panel 内布局，不再把小按钮锚在文字旁。

跨块 selection 的 `blockFormat=null`；允许局部 AI 文本动作，但类型转换必须禁用。

临时结果面板遵守单一视觉优先级：

```text
AI busy > suggestion > lint > selection action bar
```

低优先级状态可以保留，但 UI 不得在同一底部空间叠放多个 fixed panel。

## 7. 状态源

### 持久正文状态

`PromptDocument` 是唯一权威正文源。

### 持久扩展偏好

- AI enabled；
- completionEnabled；
- completionContextChars；
- completionDelayMs；
- completionModel；
- instructionOverrides；
- Provider；
- Model；
- Base URL；
- credential；
- AI 内容范围。

### 临时派生状态

- Preview；
- lint findings；
- AI suggestions；
- 当前 ProseMirror selection snapshot；
- editor completion context identity；
- ghost completion；
- 当前流式补全 request sequence / partial；
- completion request cadence / retry deadline / transient failure count；
- UI 打开/关闭状态；
- “自定义”输入编辑中的临时文本。

临时状态不得反向成为正文源。

## 8. 自动保存与默认热路径

自动保存以 PromptDocument 变化为输入，通过单一 Repository 调度入口保存。

必须避免：

- 每次键入后重新读取全部 Storage；
- 恢复当前文档时重复读取同一 Storage key；
- 更旧 revision 覆盖已经持久化的新 revision；
- Preview 关闭时仍编译 Preview；
- Lint 关闭时仍重跑 Lint；
- ghost decoration 变化触发正文保存；
- streaming 每个 token 都触发根 React 树 render；
- 每个编辑停顿都直接发网络请求；
- IME composition 中间态触发补全；
- 多个过期补全请求或重试并发堆积；
- 短时 Provider 抖动立即升级成全局不可用提示；
- 明明配置了短上下文却仍向 Provider 发送更长上下文；
- 为当前 block 补全隐式读取前一个语义块；
- 把旧流式 partial 挂到新 caret；
- 为等待完整补全文本而阻塞首批 ghost 展示；
- 首屏同步加载只有打开设置/文档管理才使用的大块 UI。

AI 配置保存和正文 autosave 是不同语义，不得共享 revision 或对象。

## 9. Extension 边界与权限

Background 只负责：

- 用户点击扩展图标时打开 Side Panel。

不注入网页、不监听页面正文、不传递 Prompt 内容。

Manifest 固定权限只允许：

```text
storage
sidePanel
```

`optional_host_permissions` 仅用于用户配置的 AI Provider Base URL 网络请求。不得重新引入 `activeTab`、`scripting`、Content Script 或网页 host 权限来做 Prompt DOM 写入，除非未来 PRODUCT/DECISIONS 明确重新改变范围。

## 10. 错误处理

原则：真实失败、明确降级、临时错误先恢复。

- AI 未配置 → 显式 AI 动作进入设置；核心编辑继续可用；
- AI Provider 持久失败 → 显示经过归一化的真实错误；
- 补全短时 429 / 5xx / timeout / transport → 原 context 仍有效时有限次自动退避重试，单次失败不弹通用“不可用”；
- 补全认证、配置、额度耗尽等持久失败 → 不无限重试，明确提示检查设置；
- 补全流已产生有效 partial 后再失败 → 优先保留仍属于当前 identity 的 partial；
- Storage 保存失败 → 明确显示未保存；
- 未知 PromptDocument schemaVersion → fail-closed；
- Copy 失败 → 明确提示从 Preview 手动复制。

禁止静默异常、假成功和无限重试。

## 11. 测试边界

V1 优先覆盖：

- Schema / Compiler；
- PromptSection / Slash Menu / block conversion；
- Repository、revision 单调性、启动批量读取与 AI preferences；
- Provider HTTP / transport / timeout / cancellation；
- Provider transient/persistent error classification、429 `Retry-After`、JSON error message 归一化；
- OpenAI-compatible / Anthropic streaming partial、SSE keepalive、非流式兼容降级和 dedicated completion model 路由；
- AI action instruction override 与默认公共约束组合；
- 自定义补全参数持久化、非法历史值回退；
- Completion cadence：首次 debounce、真实请求最小间隔、Provider backoff 优先级与指数退避；
- Suggestion 接受/忽略/revision guard；
- Selection snapshot：只依赖 ProseMirror state、空 caret 不显示操作、跨块类型不可转换；
- Completion context：当前 block 隔离、caret before/after、context budget、section kind、document generation/block/caret identity；
- Ghost completion：默认偏好关闭、Tab 接受、Esc 忽略、doc change 失效、前导空格、移动 caret 后拒绝旧 completion、streaming widget 持续刷新；
- Chrome / Edge 真实 Side Panel 主链，包含中文 IME 长句输入的真实补全 smoke。

Web Adapter、ChatGPT DOM fixture、contenteditable 插入 fixture 已随 Web Insert 退役删除，不保留测试旧链。

## 12. 架构变更规则

出现以下情况必须先更新权威文档和 DECISIONS：

- 新增后端；
- 新增第二正文持久化；
- 修改 PromptDocument 权威源；
- 改变 AI credential / Provider 存储边界；
- 改变内联补全自动调用条件或从 block-local 改为跨 block 上下文；
- 重新引入第三方网页 DOM 注入；
- 重新引入依赖 DOM selection/viewport rect 的选区操作业务状态；
- 引入新的框架级依赖；
- 跨模块职责迁移。

替代旧实现时必须迁移真实调用方并删除旧链，不保留无外部兼容需求的新旧双轨。