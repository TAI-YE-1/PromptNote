# PROMPT-DOCUMENT-CONTRACT — PromptNote

本文件定义 PromptNote 当前唯一正文数据契约。任何字段、节点类型、Schema、持久化或导入导出结构变化，都必须先更新本文件并迁移真实调用方与测试。

> `schemaVersion: 1` 是文档数据 Schema 版本，不等同于产品版本号。

## 1. 唯一正文源

唯一可持久化正文源是 `PromptDocument`。

以下内容不得成为第二份可独立编辑或持久化的正文：

- Plain Text / Markdown / XML Preview；
- AI suggestion；
- inline ghost completion；
- lint finding；
- 临时 UI draft；
- 模型专用 Prompt 副本。

所有输出都从 PromptDocument 派生。ghost completion 只有被用户接受并通过 Editor transaction 写入后，才成为正文。

## 2. PromptDocument Schema

当前真实结构：

```ts
interface PromptDocument {
  id: string;
  title: string;
  schemaVersion: 1;
  revision: number;
  content: PromptNodeJSON;
  createdAt: string;
  updatedAt: string;
}
```

约束：

- `id` 在文档生命周期内稳定；
- `title` 是文档元数据，不从正文反向推断；
- `schemaVersion` 未知时 fail-closed；
- `revision` 是非负整数，同一文档修改后单调递增；
- `content` 是 TipTap / ProseMirror JSON 文档树；
- 时间字段使用 ISO 8601 字符串；
- Provider、API Key、AI 开关、补全设置等运行环境字段不得进入 PromptDocument。

标准备份结构：

```ts
interface PromptDocumentExport {
  exportedAt: string;
  document: PromptDocument;
}
```

该导出结构必须保持宿主中立：Browser 与 Desktop 使用同一个 PromptDocument Schema，宿主设置、认证信息和 shell 状态不得进入标准 Prompt 备份。

## 3. 内容模型

普通文档节点可以包括 paragraph、heading、bulletList、orderedList、listItem、codeBlock、blockquote、hardBreak、text 等 TipTap 节点。

Prompt 语义结构统一使用一个 `promptSection` 节点，通过 `attrs.kind` 表达语义。

当前 `kind` 集合：

| kind | 显示名 | 语义 |
|---|---|---|
| `goal` | 目标 | 最终希望 AI 完成什么 |
| `context` | 背景 | 必要上下文与当前状态 |
| `instruction` | 任务 | 需要执行的具体动作 |
| `constraint` | 约束 | 必须遵守或不能做的事 |
| `example` | 示例 | 输入、输出或参考样例 |
| `output_format` | 输出格式 | 希望结果如何呈现 |
| `acceptance` | 验收标准 | 什么情况下算完成 |

`sectionKinds.ts` 是运行时代码权威。Slash、渲染、Compiler、Lint 和测试不得维护不同的平行列表。

## 4. 内容与展示分离

`promptSection.kind` 只表达语义，不保存 UI 颜色、CSS class、emoji、Markdown 标题或 XML 标签字符串。

ghost completion 的文本、位置和 Decoration DOM 都属于短生命周期 Editor 状态，不进入 PromptDocument。

## 5. revision 与持久化

Repository 是 PromptDocument 的唯一持久化入口。

- 旧 revision 不得覆盖已经持久化的新 revision；
- autosave 的异步结果只有在 document id + revision 仍对应当前 snapshot 时才能更新保存状态；
- 用户明确恢复同 ID 备份并选择覆盖时，导入文档 revision 必须提升为 `max(local.revision, backup.revision) + 1` 后再走正常 `save()`；
- 拒绝覆盖时生成新的 document id；
- 不增加绕过 revision 校验的 force-save / bypass 写路径；
- Browser / Desktop 只能替换 Repository 实现，不能替换 revision 语义或正文 Schema。

## 6. Editor 外部替换

Editor 必须区分：

1. 自身输入产生的 content；
2. 导入/恢复等外部 content 替换。

本地普通键入不得每次 stringify 全文或重新 `setContent()`。外部 content 变化即使 document id 相同，也必须作为真实外部替换同步到 Editor，并清理相关 transient selection/completion 状态。

## 7. Compiler

Compiler 是纯派生转换：

```ts
PromptDocument → plain | markdown | xml
```

Compiler 不修改 PromptDocument，不读取 Storage，不访问网页 DOM，不调用 AI，也不读取未接受的 ghost completion。

## 8. AI 派生状态

`PromptSuggestion` 带 `sourceRevision`，用户接受前不进入正文。来源 revision 已过期时不得应用。

Inline completion 与 PromptSuggestion 分离：它不产生 PromptDocument revision、不进入 autosave、Compiler 或 JSON 备份；只有接受后通过 Editor transaction 写入正文。

Lint finding 同样是派生数据，不持久化为正文，也不阻止编译。

## 9. Host Preferences 与 Secrets

Provider、Model、Base URL、AI 总开关、补全开关、补全上下文、延迟、补全模型和指令覆盖使用独立宿主设置存储，不得混入 PromptDocument。

Browser 与 Desktop 可以使用不同的 PreferencesRepository / SecretStore 实现，但必须满足：

- 设置语义一致；
- API Key 等认证信息不进入 PromptDocument；
- API Key 不进入标准 Prompt JSON 备份；
- Desktop credential 按 `DESKTOP.md` 使用独立安全存储，不作为明文业务字段写入 Desktop SQLite；
- shell 状态、窗口位置、悬浮球位置等 Desktop 专属状态不进入 PromptDocument。

## 10. Schema 变化规则

任何 Schema 变化必须：

1. 先修改本文件；
2. 全仓搜索类型、调用方、Compiler、Storage、导入导出、测试和文档；
3. 明确迁移策略；
4. 更新所有真实调用方；
5. 删除旧字段和旧定义；
6. 反向搜索确认不存在旧引用；
7. 增加或更新聚焦测试。

禁止通过 `schemaV2` / `newDocument` 等双轨结构长期兼容，也禁止用默认值静默吞掉未知 Schema。
