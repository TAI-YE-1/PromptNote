# ARCHITECTURE — PromptNote

本文件定义 PromptNote 当前技术边界、模块职责和依赖方向。目标是保持轻量、单向数据流和单一状态源。

## 1. 系统形态

- Chrome / Edge Manifest V3 Extension；
- Side Panel 主界面；
- React + TypeScript；
- TipTap / ProseMirror 编辑器；
- `chrome.storage.local` 本地持久化；
- 用户直连自定义 AI Provider；
- 无 PromptNote 自有后端、账号或云数据库；
- 不注入第三方网页 DOM。

## 2. 逻辑架构

```text
Side Panel UI
    │
    ├─ PromptEditor ──> PromptDocument ──> Repository ──> chrome.storage.local
    │                         │
    │                         ├─> Compiler ──> Plain / Markdown / XML
    │                         └─> AI explicit actions ──> Suggestion / Finding
    │
    └─ caret context ──> Inline Completion ──> AI Provider
                              │
                              └─> ghost decoration（非正文）
```

Extension Preferences 与 PromptDocument 分离，负责 Provider、credential、AI 开关和补全设置。

## 3. 目录职责

```text
src/
├─ app/        应用编排、导入逻辑、inline completion 调度
├─ editor/     TipTap 节点、Editor、Slash、选区、ghost、block conversion
├─ prompt/     PromptDocument、section kinds、Compiler、纯文本派生
├─ storage/    PromptRepository 与 AI settings repository
├─ ai/         Provider、instructions、lint、suggestions、types、补全调优
├─ extension/  Manifest service worker 相关入口
├─ ui/         Sheets、ActionBar、SlashMenu、Preview、Lint、Suggestion UI
└─ main.tsx    React 启动入口
```

文件按真实职责拆分，不为“架构感”制造空 wrapper 或平行旧链。

## 4. 状态边界

### PromptDocument

唯一持久正文源。Schema 见 `PROMPT-DOCUMENT-CONTRACT.md`。

### Editor state

ProseMirror EditorState 是 caret、selection、block 操作和 ghost decoration 的权威状态。Editor 不直接访问 Storage 或 AI Provider。

### Extension Preferences

保存 AI Provider、Model、Base URL、API Key、AI 开关、补全设置和指令覆盖。它们不进入 PromptDocument。

### 派生状态

Preview、Compiler 输出、lint finding、AI suggestion、ghost completion 都可以重新计算或失效，不是第二正文源。

## 5. Editor

`editor/` 负责：

- `promptSection` 单一语义节点；
- contextual Slash 判定；
- 选区快照与 block conversion；
- completion caret context；
- ghost decoration；
- Editor command。

选区只来自 ProseMirror，不重新读取 `window.getSelection()` 或 viewport 坐标作为业务状态。

PromptEditor 自身输入与外部内容替换通过 content object identity 区分。本地键入不执行整文档 `setContent()`；真正外部替换执行一次受控同步并使相关 transient state 失效。

## 6. Storage 与 revision

`storage/` 是持久化唯一入口。

Repository 必须保证：

- 同一文档 revision 单调；
- 旧 revision 不覆盖新 revision；
- 启动恢复 documents/current id；
- 同 ID 显式备份覆盖先完成 revision rebase，再走正常保存。

App 中的异步 save callback 只有在对应 document id + revision 仍是当前版本时，才允许修改用户可见保存状态。

## 7. Compiler

Compiler 只做：

```text
PromptDocument → Plain / Markdown / XML
```

不得修改 Editor、读写 Storage、调用 AI 或访问网页 DOM。

## 8. AI Assistance

AI 有两类调用：

1. 用户显式触发的 selection/global suggestion 或 AI lint；
2. 用户单独开启的 inline completion。

Provider Adapter 统一处理 Provider 差异、Base URL、credential、请求、超时、streaming 和错误归一化。

Inline completion 调度必须检查：

```text
settings.configured && settings.enabled && settings.completionEnabled
```

completion context 绑定当前文档、Editor generation、block、caret 和上下文预算。只要这些身份变化，旧 partial、旧请求、旧 retry 和旧 ghost 就失效。

AI 失败不得阻断编辑、保存、本地 lint、Compiler、Preview 或 Copy。

## 9. Runtime loading

当前边界：

- PromptEditor 同步加载；
- AI Settings / Document Sheet 等非首屏 Sheet 可以按需加载；
- lazy boundary 不得复制 PromptDocument、Editor 或保存状态。

运行时加载边界属于高风险改动，变更后需要真实 Chrome / Edge 验证。

## 10. Extension 权限

固定 Manifest 权限：

```text
storage
sidePanel
```

AI 网络访问使用 optional host permission。不得为了便利重新加入 `activeTab`、`scripting`、第三方网页 content script 或页面 bridge。

## 11. 错误与恢复

- Repository/Provider 错误必须显式传播到 UI；
- 不伪造成功；
- React 子树运行时异常由根级 error boundary 提供可见错误界面；
- 主编辑能力必须能够在 AI 不可用时降级运行。

## 12. 性能原则

优先减少真实热路径工作，而不是增加第二状态源或隐藏 warning：

- autosave 使用增量文档状态；
- Editor 本地键入不整文档 stringify/setContent；
- completion context 按预算局部读取；
- 过期 AI 请求及时取消；
- 非首屏 UI 可以按需加载；
- 构建 warning 保持可见，不通过简单提高阈值掩盖。

## 13. 验证边界

CI 覆盖依赖安装、许可证审计、typecheck、lint、单测、build 和发行 artifact。

涉及浏览器生命周期、权限、storage、Editor runtime、IME、selection 或真实 Provider 网络行为的变更，需要补真实 Chrome / Edge 验证。
