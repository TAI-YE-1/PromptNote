# AGENTS — PromptNote 维护规则

本文件约束参与 PromptNote 后续维护的 AI / Agent / Codex。目标是保持已发布 V1.0 的产品边界、单一状态源和代码简洁度。

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

## 2. V1.0 已固定的产品边界

PromptNote 是 manual-first、syntaxless、rich-text Prompt editor，主链是：

```text
写 → 结构化 → 检查 → 编译 → 复制
```

禁止未经产品决策重新加入：

- 第三方网页 DOM 注入、Web Adapter、content script、自动写入或自动发送；
- `activeTab` / `scripting` 权限；
- 后端、账号、云数据库、云同步；
- Marketplace、团队权限、Agent Workflow、MCP 平台、模型 Playground / A-B Test。

新增能力必须明确增强现有主链，或者先修改产品权威文档。

## 3. PromptDocument 是唯一正文源

- PromptDocument / TipTap JSON 是唯一持久正文；
- Markdown / XML / Plain Text 只由 Compiler 派生；
- AI suggestion、ghost completion、lint finding、Preview 都不是第二正文源；
- 正文只通过 Repository 写 `chrome.storage.local`；
- 不创建 localStorage / IndexedDB / Chrome Storage 多份正文。

Ghost completion 只有通过真实 Editor transaction 接受后才进入正文和 autosave。

## 4. 代码质量

优先根因修复和代码减法。原则上禁止：

- `new` / `v2` / `fixed` 平行实现；
- 无价值 wrapper / adapter / service；
- 重复状态源；
- 连续 CSS override / `!important` 补丁；
- 静默异常、假成功、默认值吞错；
- 保留已替代实现、兼容 alias、无调用方代码或测试；
- 为了让 CI 变绿而削弱正确测试。

替换实现时：确认权威定义 → 搜索调用方 → 迁移调用方 → 删除旧链 → 补测试 → 反向搜索残留。

## 5. Editor 与选区

- TipTap / ProseMirror 是编辑器权威状态；
- 选区业务状态只来自 ProseMirror EditorState，不读取 `window.getSelection()` 或 viewport rect 作为第二状态源；
- Slash Command 只在空选区、块/行首或空白后拦截 `/`，URL、日期、路径、`A/B` 等普通斜杠必须保留；
- PromptEditor 自身输入与外部同 ID 内容替换使用 content object identity 区分，不允许每次键入 stringify 全文；
- PromptEditor 当前同步打包。不得仅为消除 bundle warning 重新引入 runtime lazy split；任何重新拆分必须先有真实 Chrome / Edge 验证方案。

## 6. Inline Completion

自动请求必须同时满足：

```text
settings.configured && settings.enabled && settings.completionEnabled
```

强制规则：

- `completionEnabled` 默认 false；
- 只读取/发送当前 text block 的有限 caret 局部上下文；
- `completionContextChars` 同时约束发送预算和 Editor 读取成本；
- IME composition 不生成请求；
- 新输入、移动 caret、切块、切文档、失焦或配置变化使旧 context / ghost / retry 失效；
- transient 429/5xx/timeout/transport 有限重试并尊重 `Retry-After`；
- persistent auth/config/quota error 不无限重试；
- streaming/non-streaming 以真实 response body 判断；
- response body 读取中断归一化为 transient transport error，但调用方主动 Abort 保持取消语义；
- 成功后清理已经失效的 completion error；
- ghost 不写入 PromptDocument。

## 7. Storage 与异步版本所有权

- 同一 Prompt revision 必须单调；
- Repository 拒绝旧 revision 覆盖新 revision；
- autosave 完成后，只有当前 document id + revision 与保存 snapshot 一致时才能修改当前 save badge / error；
- 旧 save callback 不得回退较新的文档列表；
- 同 ID 备份显式覆盖先 rebase 为 `max(local, backup)+1`，不得新增 bypass / force-save 通道。

## 8. AI、权限与隐私

- AI Provider、Model、Base URL、API Key 属于 Extension Preferences，不进入 PromptDocument；
- Provider 失败不得阻断编辑、保存、本地 lint、Compiler、Preview、Copy；
- 固定 Manifest 权限保持 `storage` + `sidePanel`；
- optional host permission 只服务用户配置的 AI Provider；
- 新增数据收集、遥测、后端、云同步或权限前，必须先更新 `PRIVACY.md` 和相关权威文档。

## 9. 测试与发布

普通修改优先执行：

```text
直接相关测试 → typecheck → lint → build
```

高风险或正式发布必须运行完整 CI，并区分静态验证与真实浏览器验证。涉及 Side Panel 生命周期、Editor runtime、权限、storage、IME、selection 或 Provider 网络行为的高风险改动，不能用 CI 冒充真实 Chrome / Edge smoke。

正式发布操作见 `docs/PUBLISHING.md`。

V1 开发任务账本已经关闭并从当前工作树移除。后续功能与缺陷使用 GitHub Issue / PR 或新的明确实施计划追踪，不恢复历史 V1 TODO 清单。