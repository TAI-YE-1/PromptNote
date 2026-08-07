# PROMPT-DOCUMENT-CONTRACT — PromptNote

本文件定义 PromptNote 的唯一内容数据契约。任何字段、节点类型、顺序、Schema 或持久化结构变化，必须先更新本文件并全仓迁移真实调用方、测试和文档。

## 1. 唯一内容源

PromptNote 的唯一可持久化正文源是 `PromptDocument`。

以下内容不得成为第二份可独立编辑或持久化的正文状态：

- Markdown 预览；
- XML 预览；
- Plain Text 预览；
- AI suggestion；
- inline ghost completion；
- Lint finding；
- 临时表单字段；
- 模型专用 Prompt 副本。

所有输出都必须从 `PromptDocument` 派生。ghost completion 只有在用户按 `Tab` 接受、通过 Editor transaction 写入后，才成为 PromptDocument 的真实正文。

## 2. PromptDocument V1

概念 Schema：

```ts
interface PromptDocument {
  schemaVersion: 1;
  id: string;
  title: string;
  content: TiptapDocument;
  createdAt: string;
  updatedAt: string;
}
```

约束：

- `schemaVersion` 是数据迁移入口，不允许通过猜测结构做兼容；
- `id` 在本地文档生命周期内稳定；
- `title` 是文档元数据，不从正文标题反向推断；
- `content` 是 TipTap JSON 文档树；
- 时间使用 ISO 8601 字符串；
- 不在 V1 添加模型、网站、API Key、补全开关等运行环境字段到 PromptDocument。

## 3. TipTap 内容模型

PromptDocument 使用一棵 TipTap / ProseMirror 文档树。

普通文档节点可包括：

- `paragraph`
- `heading`
- `bulletList`
- `orderedList`
- `listItem`
- `codeBlock`
- `blockquote`
- `hardBreak`
- `text`

Prompt 语义结构统一使用一个 `promptSection` 节点，不为每个语义类型复制一套 Node 实现。

概念结构：

```ts
interface PromptSectionAttrs {
  kind:
    | 'goal'
    | 'context'
    | 'instruction'
    | 'constraint'
    | 'example'
    | 'output_format'
    | 'acceptance';
}
```

## 4. Section Kind 权威定义

V1 的 `kind` 集合只有：

| kind | 中文显示 | 语义 |
|---|---|---|
| `goal` | 目标 | 想最终达到什么结果 |
| `context` | 背景 | 任务所需上下文与现状 |
| `instruction` | 任务 | 需要执行的动作 |
| `constraint` | 约束 | 必须遵守或禁止的规则 |
| `example` | 示例 | 输入、输出或行为示例 |
| `output_format` | 输出格式 | 对回答结构和格式的要求 |
| `acceptance` | 验收标准 | 如何判断任务完成 |

Slash Menu、渲染器、Compiler、Lint、测试不得各自硬编码另一份不同列表。

## 5. 内容与展示分离

`promptSection.kind` 表达语义，不保存：

- emoji；
- UI 颜色；
- CSS class；
- Markdown 标题文本；
- XML 标签字符串。

同样，ghost completion 的灰色样式、Decoration DOM 和临时文本都属于 Editor 展示/派生状态，不进入 PromptDocument JSON。

## 6. Compiler 契约

Compiler 是纯派生转换：

```ts
compile(document, format, options) -> string
```

V1 `format`：

```ts
type PromptOutputFormat = 'plain' | 'markdown' | 'xml';
```

约束：

- Compiler 不修改 PromptDocument；
- Compiler 不读 DOM；
- Compiler 不访问 Storage；
- Compiler 不调用 AI；
- Compiler 不读取未接受的 ghost completion；
- 同一输入与相同 options 必须得到稳定输出。

## 7. AI Suggestion 与 Inline Completion 契约

### 7.1 Suggestion / Finding

普通 AI assistance 的编辑结果不是 PromptDocument。

概念结构：

```ts
interface PromptSuggestion {
  id: string;
  sourceRevision: number;
  action:
    | 'clarify'
    | 'shorten'
    | 'split_constraints'
    | 'draft_acceptance'
    | 'ambiguity'
    | 'structure';
  target: 'selection' | 'append-section' | 'advisory';
  replacementText: string;
}
```

规则：

- suggestion 不能直接持久化覆盖正文；
- 用户接受后，由 Editor command 将变更应用到当前 PromptDocument；
- 必须校验 source revision；
- AI 失败不得影响 PromptDocument 的读写。

### 7.2 Inline Completion

Inline completion 是与 PromptSuggestion 分离的短生命周期 Editor 状态。

```ts
interface GhostCompletionState {
  text: string | null;
  position: number | null;
}
```

规则：

- 不带 PromptDocument 持久字段；
- 不触发 PromptDocument revision；
- 不进入 autosave；
- 不进入 Compiler；
- 不进入 PromptDocument JSON 导入/导出；
- doc/selection 变化后必须失效；
- `Esc` 只清除 ghost；
- `Tab` 接受后，通过真实 Editor transaction 把文本写入 PromptDocument，此时才产生正常正文 revision/save。

`completionEnabled` 是 Extension Preference，不是 PromptDocument 字段。

## 8. Prompt Lint 契约

Lint finding 是派生数据：

```ts
interface PromptLintFinding {
  id: string;
  severity: 'info' | 'warning';
  message: string;
  detail?: string;
  source: 'local' | 'ai';
}
```

Lint 结果默认不持久化为正文，也不阻止编译。

## 9. Storage 契约

V1 本地正文持久化只保存 `PromptDocument`，不保存独立 Markdown/XML 正文或 ghost completion。

Storage API 概念上保持：

```ts
interface PromptRepository {
  get(id: string): Promise<PromptDocument | null>;
  list(): Promise<PromptDocument[]>;
  save(document: PromptDocument): Promise<void>;
  remove(id: string): Promise<void>;
}
```

AI preferences 使用独立 namespace/repository，可保存 `completionEnabled`，但不得混入 PromptDocument。

## 10. 导入 / 导出

### 10.1 可恢复导出

用于备份与迁移的标准格式是带 `schemaVersion` 的 PromptDocument JSON。

### 10.2 文本输出

Plain Text / Markdown / XML 是复制/发布格式，不保证无损还原所有 PromptDocument 语义，因此不得重新定义成主存储格式。

## 11. Schema 变化规则

任何 Schema 变化必须：

1. 先修改本文件；
2. 全仓搜索权威类型、调用方、Compiler、Storage、导入导出、测试和文档；
3. 明确迁移策略；
4. 更新所有真实调用方；
5. 删除旧字段和旧定义；
6. 反向搜索确认不存在旧引用；
7. 增加或更新聚焦测试。

禁止：

- 保留 `schemaV2` / `newDocument` 双轨实现；
- 在多个模块重复硬编码 section kind；
- 把 ghost completion 写进 PromptDocument；
- 用默认值静默吞掉未知版本；
- 因单个测试失败就认定测试过期。
