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
│  ├─ ghostCompletion.ts
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
│  ├─ AiSheet.tsx
│  ├─ AiAdvancedSettings.tsx
│  ├─ DocumentSheet.tsx
│  ├─ SelectionContextMenu.tsx
│  ├─ SlashMenu.tsx
│  ├─ SuggestionCard.tsx
│  ├─ LintCard.tsx
│  └─ Preview.tsx
└─ main.tsx
```

文件拆分按真实职责，不为“架构感”制造空 wrapper；`components.tsx` 只保留稳定聚合入口，避免再次退化成巨型 UI 文件。

## 4. 依赖方向

### 4.1 Prompt 核心层

`prompt/` 定义 PromptDocument Schema、section kind、Compiler 与纯文本派生逻辑。

不得依赖 React、Chrome API、页面 DOM 或 AI Provider。

### 4.2 Editor 层

`editor/` 负责 TipTap Extension、Slash Menu、编辑命令、选区、语义块转换和 ghost completion decoration。

Editor 不直接读写 Storage，也不直接调用 Provider。ghost completion 只接收外部给出的短字符串并负责显示、失效、`Tab` 接受、`Esc` 忽略。

### 4.3 App 层

`app/PromptNoteApp.tsx` 负责组合 UI 与应用状态；`useInlineCompletion.ts` 只负责补全请求调度。

补全调度必须同时检查：

```text
settings.configured
&& settings.enabled
&& settings.completionEnabled
```

否则不得发自动请求。

### 4.4 Storage 层

`storage/` 是本地持久化唯一入口。

- `PromptRepository`：PromptDocument；
- AI settings repository：Provider、credential、AI 总开关、补全开关、补全调优数值和每动作指令覆盖等扩展偏好。

禁止正文同时写 localStorage / IndexedDB / Chrome Storage 多份副本；禁止保存 Markdown/XML 派生副本。

### 4.5 Compiler 层

Compiler 只做：

`PromptDocument → Plain / Markdown / XML`

不得修改 Editor、读取 Storage、调用 AI 或读取网页 DOM。

### 4.6 AI Assistance 层

Provider Adapter 统一处理 Provider 差异、Base URL、Model、credential、请求、超时与错误归一化。

AI 有两类调用：

1. **显式动作**：selection/global suggestion、AI lint；
2. **内联补全**：唯一允许自动调用的能力，但必须由独立补全开关显式 opt-in。

Suggestion 必须带来源 revision；过期 suggestion 不得应用。

内联补全不创建 PromptSuggestion，也不创建第二正文状态，只返回短 continuation 字符串。

`ai/instructions.ts` 是内置 AI 动作指令的唯一权威。每个 action 可以在 Extension Preferences 中保存一个局部 override；空 override 使用默认。公共行为约束仍由代码统一附加，避免每个 Provider 维护另一套 system prompt。

### 4.7 Prompt Lint

本地 deterministic lint 不依赖 AI。AI semantic lint 只有用户显式触发时调用。

## 5. 内联补全架构

### 5.1 请求条件

只有以下三个条件同时成立才允许调度：

```text
AI 已配置成功
AND AI 总开关开启
AND completionEnabled = true
```

默认 `completionEnabled=false`。修改 Provider / Model / Base URL / API Key 后，连接状态和补全开关必须失效，避免对未经重新确认的端点自动发请求。

补全上下文和触发延迟属于行为偏好，不属于 Provider 身份；改变它们或 action instruction override 不要求重新验证连接。

### 5.2 热路径

当前实现原则：

- caret 前只发送 `completionContextChars` 指定的有限上下文；默认 320 字符；快捷预设 160 / 320 / 640，也允许 16–2000 的自定义整数；
- 编辑停顿 `completionDelayMs` 后才请求；默认 300ms；快捷预设 150 / 300 / 600ms，也允许 50–3000ms 的自定义整数；
- preset 只是 UI 快捷选择，持久状态只保存最终整数，禁止维护第二套 preset/customValue 业务状态；
- 继续输入/移动 caret 时取消旧请求；
- 相同上下文允许短期小容量复用，避免无意义重复请求；
- Provider 请求保持短 continuation；
- 失败后短暂退避，避免连续失败造成请求风暴；
- 过期结果不得显示；
- ghost text 不触发 autosave / Compiler / revision。

### 5.3 Editor 状态

Ghost completion 使用 ProseMirror Plugin state + Decoration.widget：

- `Tab` → 把 ghost 插入当前 transaction，随后清除；
- `Esc` → 只清除 decoration；
- docChanged / selectionSet → 自动清除 stale ghost；
- 保留有意义的前导空格，避免英文/代码续写拼接错误。

## 6. 状态源

### 持久正文状态

`PromptDocument` 是唯一权威正文源。

### 持久扩展偏好

- AI enabled；
- completionEnabled；
- completionContextChars；
- completionDelayMs；
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
- 当前 selection；
- ghost completion；
- UI 打开/关闭状态；
- “自定义”输入编辑中的临时文本。

临时状态不得反向成为正文源。

## 7. 自动保存与默认热路径

自动保存以 PromptDocument 变化为输入，通过单一 Repository 调度入口保存。

必须避免：

- 每次键入后重新读取全部 Storage；
- Preview 关闭时仍编译 Preview；
- Lint 关闭时仍重跑 Lint；
- ghost decoration 变化触发正文保存；
- 每次键入立即发补全请求；
- 多个过期补全请求并发堆积；
- 明明配置了短上下文却仍向 Provider 发送更长上下文。

AI 配置保存和正文 autosave 是不同语义，不得共享 revision 或对象。

## 8. Extension 边界与权限

Background 只负责：

- 用户点击扩展图标时打开 Side Panel。

不注入网页、不监听页面正文、不传递 Prompt 内容。

Manifest 固定权限只允许：

```text
storage
sidePanel
```

`optional_host_permissions` 仅用于用户配置的 AI Provider Base URL 网络请求。不得重新引入 `activeTab`、`scripting`、Content Script 或网页 host 权限来做 Prompt DOM 写入，除非未来 PRODUCT/DECISIONS 明确重新改变范围。

## 9. 错误处理

原则：真实失败、明确降级。

- AI 未配置 → 显式 AI 动作进入设置；核心编辑继续可用；
- AI Provider 失败 → 显示真实错误；
- 补全失败 → 清除 ghost、短暂退避、编辑继续可用；
- Storage 保存失败 → 明确显示未保存；
- 未知 PromptDocument schemaVersion → fail-closed；
- Copy 失败 → 明确提示从 Preview 手动复制。

禁止静默异常和假成功。

## 10. 测试边界

V1 优先覆盖：

- Schema / Compiler；
- PromptSection / Slash Menu / block conversion；
- Repository 与 AI preferences；
- Provider HTTP / transport / timeout / cancellation；
- AI action instruction override 与默认公共约束组合；
- 自定义补全参数持久化、非法历史值回退；
- Suggestion 接受/忽略/revision guard；
- Ghost completion：默认偏好关闭、Tab 接受、Esc 忽略、doc change 失效、前导空格；
- Chrome / Edge 真实 Side Panel 主链。

Web Adapter、ChatGPT DOM fixture、contenteditable 插入 fixture 已随 Web Insert 退役删除，不保留测试旧链。

## 11. 架构变更规则

出现以下情况必须先更新权威文档和 DECISIONS：

- 新增后端；
- 新增第二正文持久化；
- 修改 PromptDocument 权威源；
- 改变 AI credential / Provider 存储边界；
- 改变内联补全自动调用条件；
- 重新引入第三方网页 DOM 注入；
- 引入新的框架级依赖；
- 跨模块职责迁移。

替代旧实现时必须迁移真实调用方并删除旧链，不保留无外部兼容需求的新旧双轨。
