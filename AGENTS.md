# AGENTS — PromptNote 维护规则

本文件约束参与 PromptNote 维护的 AI / Agent / Codex。目标是保持产品边界、单一状态源和代码简洁度。

## 1. 开发前阅读顺序

1. `docs/PRODUCT.md`
2. `docs/UX.md`
3. `docs/PROMPT-DOCUMENT-CONTRACT.md`
4. `docs/ARCHITECTURE.md`
5. `docs/DECISIONS.md`
6. 真实代码、配置、测试与当前调用链

权威关系：

```text
PRODUCT → UX → PROMPT-DOCUMENT-CONTRACT → ARCHITECTURE → DECISIONS → code/tests
```

`README.md` 面向用户，不作为架构事实的最高权威。

## 2. 产品边界

PromptNote 是 manual-first、syntaxless、rich-text Prompt editor，核心主链是：

```text
写 → 结构化 → 检查 → 预览/编译 → 复制
```

未经产品决策不得重新加入：

- 第三方网页 DOM 注入、Web Adapter、content script、自动写入或自动发送；
- `activeTab` / `scripting` 权限；
- PromptNote 自有后端、账号、云数据库或云同步；
- Marketplace、团队权限、Agent Workflow、MCP 平台、模型 Playground / A-B Test。

新增能力必须明确增强现有主链，或者先修改产品权威文档。

## 3. 单一状态源

- PromptDocument / TipTap JSON 是唯一持久正文；
- Markdown / XML / Plain Text 只由 Compiler 派生；
- AI suggestion、ghost completion、lint finding、Preview 都不是第二正文源；
- 正文只通过 Repository 写 `chrome.storage.local`；
- 不创建 localStorage / IndexedDB / Chrome Storage 多份正文。

Ghost completion 只有通过真实 Editor transaction 接受后才进入正文。

## 4. 代码质量

优先根因修复和代码减法。禁止无必要的：

- `new` / `v2` / `fixed` 平行实现；
- wrapper / adapter / service；
- 重复状态源；
- 连续 CSS override 或 `!important` 补丁；
- 静默异常、假成功、默认值吞错；
- 已替代实现、兼容 alias、无调用方代码或测试；
- 为了让 CI 变绿而削弱正确测试。

替换实现时按顺序：确认权威定义 → 搜索调用方 → 迁移调用方 → 删除旧链 → 补测试 → 反向搜索残留。

## 5. Editor、Slash 与选区

- TipTap / ProseMirror 是编辑器权威状态；
- 选区业务状态只来自 ProseMirror EditorState；
- Slash Command 只在空选区、块/行首或空白后拦截 `/`；URL、日期、路径、`A/B` 等普通斜杠必须保留；
- PromptEditor 自身输入与外部同 ID 内容替换使用 content object identity 区分，不允许每次键入 stringify 全文；
- PromptEditor 当前同步打包；运行时加载边界变更必须经过真实 Chrome / Edge 验证。

## 6. Inline Completion

自动请求必须同时满足：

```text
settings.configured && settings.enabled && settings.completionEnabled
```

约束：

- `completionEnabled` 默认 false；
- 只读取/发送当前 text block 的有限 caret 局部上下文；
- IME composition 不生成请求；
- 新输入、移动 caret、切块、切文档、失焦或配置变化使旧 context / ghost / retry 失效；
- 临时网络错误只能有限重试；认证、配置、额度等持久错误不得无限重试；
- 调用方主动 Abort 必须保持取消语义；
- ghost 不写入 PromptDocument。

## 7. Storage 与 revision

- 同一 Prompt 的 `revision` 必须单调；
- Repository 拒绝旧 revision 覆盖新 revision；
- 异步保存结果只有在 document id + revision 仍对应当前 snapshot 时才能更新保存状态；
- 同 ID 备份显式覆盖先 rebase 为 `max(local, backup)+1`，不得增加 bypass 写通道。

## 8. AI、权限与隐私

- AI Provider、Model、Base URL、API Key 属于 Extension Preferences，不进入 PromptDocument；
- Provider 失败不得阻断编辑、保存、本地 lint、Compiler、Preview、Copy；
- 固定 Manifest 权限保持 `storage` + `sidePanel`；
- optional host permission 只服务用户配置的 AI Provider；
- 新增数据收集、遥测、后端、云同步或权限前，必须先更新 `PRIVACY.md` 和相关权威文档。

## 9. 验证与发布

普通修改优先执行：

```text
直接相关测试 → typecheck → lint → build
```

高风险或正式发布运行完整 CI。涉及 Side Panel 生命周期、Editor runtime、权限、storage、IME、selection 或 Provider 网络行为的高风险改动，需要真实 Chrome / Edge smoke，不能用静态 CI 代替。

正式发布操作见 `docs/PUBLISHING.md`。
