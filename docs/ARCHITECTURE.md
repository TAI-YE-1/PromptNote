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
│  ├─ importDocument.ts
│  └─ useInlineCompletion.ts
├─ editor/
│  ├─ LazyPromptEditor.tsx   # TipTap/ProseMirror 运行时按需加载边界
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

文件拆分按真实职责，不为“架构感”制造空 wrapper；`components.tsx` 只保留稳定聚合入口，避免再次退化成巨型 UI 文件。已经被替代的 `SelectionContextMenu`、viewport rect 定位和独立 floating-panel stylesheet 不得以别名或兼容导出的形式残留为平行旧链。

## 4. 依赖方向

### 4.1 Prompt 核心层

`prompt/` 定义 PromptDocument Schema、section kind、Compiler 与纯文本派生逻辑。

不得依赖 React、Chrome API、页面 DOM 或 AI Provider。

### 4.2 Editor 层

`editor/` 负责 TipTap Extension、Slash Menu、编辑命令、选区、语义块转换和 ghost completion decoration。

Editor 不直接读写 Storage，也不直接调用 Provider。`completionContext.ts` 负责从当前 EditorState 产生补全 context identity；ghost completion 只接收已经绑定到该 identity 的短字符串并负责显示、失效、`Tab` 接受、`Esc` 忽略。

补全 context 必须至少绑定：document id、editor document generation、当前 block 起点、caret position、用户当前 `completionContextChars`、当前 block 的光标前/后文本和 section kind。AI 返回结果不得在到达时重新读取“当前 selection”决定位置。

**已有长文本不能放大 context 构建成本。** `completionContext.ts` 必须先按 caret + `completionContextChars` 建立有限 ProseMirror scan window，再调用 `textBetween()`；禁止先 materialize 整个现有 block 后再 slice。小幅 bounded overscan 只用于兼容 hard-break/inline node separator，不改变最终字符预算。

**IME composition 与 focus 都是 Editor 层的稳定性边界。** 当 ProseMirror `view.composing=true` 或 Editor 失焦时，Editor 必须同时发布 `null` completion context 并清除 ghost decoration。composition 完成/focus 恢复后再按当前真实 caret 重建 context。

**Editor 必须区分自身产生的正文与外部替换。** `PromptEditor` 在 `onUpdate` 产生的 JSON 对象作为当前已应用 content identity；App 把同一个 content 对象装入新的 PromptDocument 时，Editor 用 O(1) identity 判断这是自身输入，不执行整份 `setContent()`。导入备份等外部操作即使保持相同 document id，只要 content 对象改变，Editor 就必须执行一次受控 `setContent()`、增加 editor generation，并清除 selection/completion transient state。禁止为了区分两者在每次键入时 `JSON.stringify` 整份文档。

`selectionSnapshot.ts` 只从 ProseMirror EditorState 产生选区快照。选区文本、from/to 与单块类型以 ProseMirror selection 为唯一权威；不得重新读取 `window.getSelection()`、`getBoundingClientRect()` 或维护 viewport rect 作为业务状态。跨块选区可以用于文本 AI 动作，但 block type 为 `null`，禁止类型转换。

### 4.3 App 层

`app/PromptNoteApp.tsx` 负责组合 UI 与应用状态；`importDocument.ts` 只负责导入冲突的纯 revision/id 解析；`useInlineCompletion.ts` 只负责补全请求调度。

补全调度必须同时检查：

```text
settings.configured
&& settings.enabled
&& settings.completionEnabled
```

否则不得发自动请求。

流式 partial 和最终结果都必须携带请求发起时的 context identity；只要当前 editor context key 已变化，旧 partial、旧等待和旧自动重试必须直接失效，不能重新挂到新的 caret。

`ai/completionTuning.ts` 是补全 context/delay/cadence/retry policy 的唯一数值权威。`useInlineCompletion.ts` 不得再平行维护另一套 request interval、退避基数、最大退避或重试次数常量。

`AiSettings` 由 React state 以不可变对象替换。补全缓存/请求重置直接依赖稳定 settings 对象 identity；不得为了 Hook identity 每次 render 拼接 Provider、URL、模型、credential 等复合字符串，更不得把 API Key 放入临时 identity string。

相同 context 的小容量 cache 是纯派生加速。cache hit 必须在 prompt string、Provider adapter、AbortController 和真实 request 调度之前 fast-path；命中时不得先 `setCompletion(null)` 再恢复同一个 ghost。

补全 error state 是双向状态：Hook 报告真实错误，成功 partial/final/cache hit 后报告 recovery；App 必须清掉已经失效的 `aiError`。用户可见 toast 使用经过长度限制的真实原因。

Streaming partial 可以在短时间窗口内合并 UI 更新，当前实现以约 48ms 为上限合并连续 partial，避免每个 token 都触发根 React 树 render。

**异步保存结果也必须带版本语义。** Repository 完成某个 document snapshot 的 `save()` 后，App 只有在当前 document id + revision 仍与该 snapshot 完全相同时，才允许把顶部状态置为“已保存”。同一文档已有更高 revision 时，旧 save 的晚到成功/失败都不得回退 save badge 或文档列表。文档列表更新必须保持 revision 单调，并使用线性插入更新而不是每次 autosave 重新全量排序。

### 4.4 Storage 层

`storage/` 是本地持久化唯一入口。

- `PromptRepository`：PromptDocument；
- AI settings repository：Provider、credential、AI 总开关、补全开关、补全调优数值、补全模型和每动作指令覆盖等扩展偏好。

禁止正文同时写 localStorage / IndexedDB / Chrome Storage 多份副本；禁止保存 Markdown/XML 派生副本。

同一 PromptDocument 的持久 revision 必须单调：Repository 收到更旧 revision 时不得覆盖已经持久化的更新 revision。启动恢复应优先批量读取 documents + current id，避免为了恢复当前文档反复进行 Storage round-trip。

用户明确对同 ID 备份选择“覆盖”时，不能削弱 Repository 的 revision 防回退。导入解析必须先把新文档 revision 提升到 `max(local.revision, backup.revision) + 1`，再走正常 `save()`；拒绝覆盖则生成新 id。这样“显式覆盖”仍遵守同一个持久化不变量，而不是建立 bypass 写路径。

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

内联补全不创建 PromptSuggestion，也不创建第二正文状态，只返回短 continuation 字符串。补全可以配置独立 `completionModel`；为空时沿用主 `Model`。OpenAI-compatible / Anthropic 补全优先流式显示首批可用文本；不支持 streaming 的模型/端点组合可回退非流式，但不得伪造流式成功。

Provider 网络错误必须归一化为可判断的错误类型。当前 `AiRequestError` 至少携带 HTTP status、`transient` 与可选 `retryAfterMs`：短时 429、408/409/425、5xx、timeout/transport 可作为临时错误；认证、参数、配置及可识别的额度/配额耗尽属于持久错误。Provider 返回 JSON error body 时优先提取可读 message，错误正文必须有长度上限。

Streaming body detection 以**实际 payload**为权威，不以 `Content-Type` 作为真相源：先 probe body，`data:`/`event:`/comment 进入 SSE；首个有效非空内容以 `{`/`[` 开头则按普通 JSON/text 处理。这样既兼容 `text/plain` SSE，也兼容错误标成 `text/event-stream` 的普通 JSON。

Streaming capability cache 必须至少区分 provider + endpoint + 实际 completion model，且有容量上限。

`ai/instructions.ts` 是内置 AI 动作指令的唯一权威。每个 action 可以在 Extension Preferences 中保存一个局部 override；空 override 使用默认。公共行为约束仍由代码统一附加。

### 4.7 Prompt Lint

本地 deterministic lint 不依赖 AI。AI semantic lint 只有用户显式触发时调用。

### 4.8 Lazy runtime boundaries

AI 设置 Sheet、本地 Prompt 管理 Sheet 和 TipTap/ProseMirror 编辑器运行时都允许通过 `React.lazy`/dynamic import 拆分。

- Sheet 只在用户打开时加载；
- Editor chunk 在 Side Panel shell/应用状态加载后异步获取；
- lazy boundary 只改变代码加载时机，不复制 AI settings、Prompt list、PromptDocument、save state 或 Editor 业务状态；
- Editor wrapper 只负责 `Suspense + ref` 转发，不创建第二 Editor 实现。

当前真实构建由原单一 `sidepanel` 约 616.97 kB（gzip 195.41 kB）拆为约 228.57 kB（gzip 73.72 kB）的同步 shell 与约 388.80 kB（gzip 122.57 kB）的异步 PromptEditor chunk。该变化表示**首屏同步解析体积下降**，不等同于总 JavaScript 删除 63%。Vite `>500KB` warning 因真实拆包自然消失，未修改 warning limit；最终用户体感仍需真实 Chrome/Edge 验收。

## 5. 内联补全架构

### 5.1 请求条件

只有以下三个条件同时成立才允许调度：

```text
AI 已配置成功
AND AI 总开关开启
AND completionEnabled = true
```

默认 `completionEnabled=false`。修改 Provider / Model / Base URL / API Key 后，连接状态和补全开关必须失效。

补全上下文、触发延迟、补全模型和 action instruction override 属于行为偏好，不属于 Provider 身份；改变它们不要求重新验证主连接。

### 5.2 Context 隔离与请求身份

补全默认只读取**当前正在编辑的 text block**。如果当前 block 是 `promptSection`，可以把 section kind/中文模块标签作为语义提示发送给模型，但不得把前一个语义 block 正文静默拼入当前补全。

`completionContextChars` 是当前 block 内以 caret 为中心的最大上下文预算，不是“向前跨多个块取 N 字”。Editor 必须显式接收该配置。Context identity 必须记录实际 context budget。

现有 block 的总长度不属于 request identity 需要 materialize 的输入。只有 bounded scan 后得到的 `beforeText/afterText` 进入 identity。

每个 context 身份键至少包含：

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

流式响应到达时必须再次校验 identity。用户继续输入、移动 caret、切换 block、切换文档、正文其他位置变化、修改 context budget、进入 IME composition 或 Editor blur 后，旧请求/旧 ghost/旧 retry 都必须失效。

### 5.3 热路径

当前实现原则：

- 只读取和发送 `completionContextChars` 附近的当前 block 有限上下文；默认 320 字符；快捷预设 160 / 320 / 640，也允许 16–2000 自定义；
- caret 在块首/块中/块尾都允许利用当前块 before/after 双向上下文；
- 编辑停顿 `completionDelayMs` 后才允许启动候选请求；默认 300ms；
- 用户停顿防抖与真实网络 cadence 分开治理；
- IME composition 期间没有 completion context；
- preset 只是 UI 快捷选择，持久状态只保存最终整数；
- OpenAI-compatible 与 Anthropic 补全优先流式响应；
- 连续 streaming partial 合并到短渲染窗口；
- 不支持 streaming 时按 provider + endpoint + completion model 降级并缓存能力；
- streaming/non-streaming 由 body sniff 确认，不能只信 header；
- 新 context 取消旧 request/retry；
- 相同、仍有效 context 可短期小容量复用；cache hit 直接恢复，不构造 request/provider；
- Provider 请求保持短 continuation；
- transient failure 有限指数退避并尊重 `Retry-After`；
- persistent failure 不无限重试，也不设置跨 context 的人为 cooldown；
- 已有 usable partial 后再失败可保留当前有效 partial；
- 过期结果不得显示；
- ghost text 不触发 autosave / Compiler / revision。

### 5.4 Editor 状态

Ghost completion 使用 ProseMirror Plugin state + Decoration.widget：

- ghost state 保存原请求 caret position/context key；
- streaming partial 的 widget identity 随可见文本变化；
- `Tab` 仅在当前 selection 与 ghost position 完全一致时插入；
- `Esc` 只清 decoration；
- docChanged / selectionSet 清 stale ghost；
- Editor blur / composing 通过同一 invalidation 边界同时清 ghost + context；
- 保留有意义前导空格；
- 仅做有限多字符 overlap 去重。

## 6. 选区与 transient UI 状态

选区业务状态只保存：

```text
selected text
from / to
single-block format | null
```

不保存 viewport rect，不依赖 DOM selection。只要 ProseMirror selection 非空，`SelectionActionBar` 即可稳定存在；不再保留 `SelectionContextMenu` 兼容别名。

跨块 selection 的 `blockFormat=null`；允许局部 AI 文本动作，但类型转换必须禁用。

临时结果面板遵守单一视觉优先级：

```text
AI busy > suggestion > lint > selection action bar
```

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
- 当前 completion error / recovery 状态；
- 当前异步 save snapshot 的 document id + revision 语义；
- UI 打开/关闭状态。

临时状态不得反向成为正文源。

## 8. 自动保存与默认热路径

自动保存以 PromptDocument 变化为输入，通过单一 Repository 调度入口保存。

必须避免：

- 每次键入后重新读取全部 Storage；
- 恢复当前文档时重复读取同一 Storage key；
- 更旧 revision 覆盖持久化新 revision，或其晚到 callback 回退 UI save state/list；
- 每次 autosave 对文档列表做全量 sort；
- 同 ID 外部替换无法同步到 Editor；
- 为区分外部内容而每次键入 stringify 整份文档；
- Preview 关闭时仍编译 Preview；
- Lint 关闭时仍重跑 Lint；
- ghost decoration 变化触发正文保存；
- streaming 每个 token 触发根 React 树 render；
- 为局部 context 先 materialize 整个已有长 block；
- 每次 render 拼接包含 credential 的 completion settings key；
- cache hit 时仍构造 request/provider；
- 每个编辑停顿都直接发网络请求；
- IME composition 中间态触发补全；
- 多个过期补全请求/重试堆积；
- 短时 Provider 抖动立即升级为全局不可用；
- 持久错误给后续全新 context 人为添加 cooldown；
- 把旧 partial/ghost 留在失焦/composing Editor；
- 首屏同步加载可拆分的大型 Editor/Sheet 运行时代码。

AI 配置保存和正文 autosave 是不同语义，不得共享 revision 或对象。

## 9. Extension 边界与权限

Background 只负责用户点击扩展图标时打开 Side Panel。

Manifest 固定权限只允许：

```text
storage
sidePanel
```

`optional_host_permissions` 仅用于用户配置的 AI Provider Base URL 网络请求。不得重新引入 `activeTab`、`scripting`、Content Script 或网页 host 权限来做 Prompt DOM 写入。

## 10. 错误处理

原则：真实失败、明确降级、临时错误先恢复、异步状态不越权。

- AI 未配置 → 显式 AI 动作进入设置；核心编辑继续可用；
- AI Provider 持久失败 → 显示归一化且长度受控真实错误；
- 补全 transient failure → 原 context 有效时有限退避重试；
- 补全 persistent failure → 不无限重试，新 context 不继承人为 cooldown；
- 补全成功 → 清失效 completion error；
- Storage 最新 revision 保存失败 → 明确显示未保存；
- Storage 旧 revision 的晚到失败 → 不得把已经继续编辑的新 revision 标成失败；
- 同 ID 显式导入覆盖 → 先 rebase revision 再正常保存，不伪造成功；
- 未知 PromptDocument schemaVersion → fail-closed；
- Copy 失败 → 明确提示从 Preview 手动复制。

禁止静默异常、假成功、无限重试和 stale error/state。

## 11. 测试边界

V1 优先覆盖：

- Schema / Compiler；
- PromptSection / Slash Menu / block conversion；
- Repository、revision 单调性、启动批量读取与 AI preferences；
- 同 ID 导入冲突：覆盖时 revision rebase，拒绝覆盖时新 id；
- Editor 同 ID 外部 content replacement 与本地输入不重灌；
- Provider HTTP / transport / timeout / cancellation；
- Provider transient/persistent error classification、Retry-After、JSON error message；
- streaming partial、SSE keepalive、错误 Content-Type、非流式降级、completion model；
- AI instruction override；
- completion 参数持久化；
- completion cadence/backoff；
- Suggestion revision guard；
- Selection snapshot；
- Completion context bounded scan；
- Ghost completion；
- Chrome / Edge 真实主链，并增加 Editor lazy chunk 首次加载、快速连续编辑 save badge、同 ID 备份覆盖立即刷新 Editor 的 smoke。

Web Adapter 等退役链不保留测试。

## 12. 架构变更规则

出现以下情况必须先更新权威文档和 DECISIONS：

- 新增后端；
- 新增第二正文持久化；
- 修改 PromptDocument 权威源；
- 改变 AI credential / Provider 存储边界；
- 改变内联补全自动调用条件或从 block-local 改为跨 block 上下文；
- 重新引入第三方网页 DOM 注入；
- 重新引入 DOM selection/viewport rect 业务状态；
- 引入新的框架级依赖；
- 跨模块职责迁移。

替代旧实现时必须迁移真实调用方并删除旧链，不保留无外部兼容需求的新旧双轨。
