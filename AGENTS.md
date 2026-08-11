# AGENTS — PromptNote 维护规则

本文件约束参与 PromptNote 维护的 AI / Agent / Codex。目标是保持产品边界、单一状态源、Browser/Desktop 共享核心和代码简洁度。

## 1. 开发前阅读顺序

所有改动先读：

1. `docs/PRODUCT.md`
2. `docs/UX.md`
3. `docs/PROMPT-DOCUMENT-CONTRACT.md`
4. `docs/ARCHITECTURE.md`
5. `docs/DECISIONS.md`
6. 真实代码、配置、测试与当前调用链

涉及 Desktop 时必须在 `PRODUCT.md` 后额外读：

1. `docs/DESKTOP.md`
2. `docs/UX.md`
3. `docs/PROMPT-DOCUMENT-CONTRACT.md`
4. `docs/ARCHITECTURE.md`
5. `docs/DECISIONS.md`
6. `docs/DESKTOP-TASKS.md`
7. 真实代码、配置、测试与当前调用链

Desktop 权威关系：

```text
PRODUCT → DESKTOP → UX → PROMPT-DOCUMENT-CONTRACT → ARCHITECTURE → DECISIONS → DESKTOP-TASKS → code/tests
```

`README.md` 面向用户，不作为架构事实的最高权威。`DESKTOP-TASKS.md` 是实施账本，不得覆盖产品 / 架构定义。

## 2. 产品边界

PromptNote 是 manual-first、syntaxless、local-first 的文档式 Prompt editor，核心主链是：

```text
写 → 结构化 → 检查 → 预览/编译 → 复制
```

Browser Extension 与 Windows Desktop 是两个宿主，不是两套产品。

未经产品决策不得重新加入：

- 第三方网页 / 桌面应用 DOM 或 UI 自动注入、自动写入、自动发送；
- Browser `activeTab` / `scripting` 权限；
- PromptNote 自有后端、账号、云数据库或云同步；
- Marketplace、团队权限、Agent Workflow、MCP 平台、模型 Playground / A-B Test；
- Desktop V1 的划词捕获、OCR、全局键盘记录、自动读剪贴板、Accessibility / UI Automation；
- Electron Desktop；
- Desktop V1 的 macOS / Linux / ARM64。

新增能力必须明确增强现有主链，或者先修改产品权威文档。

## 3. 单一状态源

- PromptDocument / TipTap JSON 是唯一持久正文；
- Markdown / XML / Plain Text 只由 Compiler 派生；
- AI suggestion、ghost completion、lint finding、Preview 都不是第二正文源；
- 正文只通过 `PromptRepository` 写当前宿主持久化；
- Browser Repository 当前实现为 `chrome.storage.local`；
- Desktop Repository 按 `DESKTOP.md` 使用本地 SQLite；
- 不创建 localStorage / IndexedDB / SQLite / Chrome Storage 多份平行正文；
- Browser 与 Desktop V1 不做自动同步，JSON backup 是显式迁移入口。

Ghost completion 只有通过真实 Editor transaction 接受后才进入正文。

## 4. Browser / Desktop 共享核心

Desktop 开发禁止复制以下实现：

- PromptDocument Schema；
- PromptEditor / TipTap extensions；
- section kinds；
- Compiler；
- Prompt Check；
- AI suggestion / inline completion 业务语义；
- revision / backup 规则。

宿主差异只通过真实需要的最小平台合同隔离。`editor/`、`prompt/`、Compiler 不得直接 import `chrome.*` 或 Tauri API。

不要为了抽象而先建空 adapter / wrapper；必须从真实调用方迁移产生接口。

## 5. 代码质量

优先根因修复和代码减法。禁止无必要的：

- `new` / `v2` / `fixed` 平行实现；
- wrapper / adapter / service；
- 重复状态源；
- 连续 CSS override 或 `!important` 补丁；
- 静默异常、假成功、默认值吞错；
- 已替代实现、兼容 alias、无调用方代码或测试；
- 为了让 CI 变绿而削弱正确测试。

替换实现时按顺序：确认权威定义 → 搜索调用方 → 迁移调用方 → 删除旧链 → 补测试 → 反向搜索残留。

## 6. Editor、Slash 与选区

- TipTap / ProseMirror 是编辑器权威状态；
- 选区业务状态只来自 ProseMirror EditorState；
- Slash Command 只在空选区、块/行首或空白后拦截 `/`；URL、日期、路径、`A/B` 等普通斜杠必须保留；
- PromptEditor 自身输入与外部同 ID 内容替换使用 content object identity 区分，不允许每次键入 stringify 全文；
- PromptEditor 当前同步打包；运行时加载边界变更必须经过真实宿主验证。

## 7. Inline Completion

自动请求必须同时满足：

```text
settings.configured && settings.enabled && settings.completionEnabled
```

约束：

- `completionEnabled` 默认 false；
- 只读取 / 发送当前 text block 的有限 caret 局部上下文；
- IME composition 不生成请求；
- 新输入、移动 caret、切块、切文档、失焦或配置变化使旧 context / ghost / retry 失效；
- 临时网络错误只能有限重试；认证、配置、额度等持久错误不得无限重试；
- 调用方主动 Abort 必须保持取消语义；
- ghost 不写入 PromptDocument。

## 8. Storage、revision 与 Secret

- 同一 Prompt 的 `revision` 必须单调；
- Repository 拒绝旧 revision 覆盖新 revision；
- 异步保存结果只有在 document id + revision 仍对应当前 snapshot 时才能更新保存状态；
- 同 ID 备份显式覆盖先 rebase 为 `max(local, backup)+1`，不得增加 bypass 写通道；
- API Key 等 credential 不进入 PromptDocument / Compiler / JSON backup；
- Desktop API Key 不得作为明文业务字段写入 SQLite，必须走 Desktop SecretStore。

## 9. Desktop shell 规则

涉及 Desktop 必须遵守 `DESKTOP.md`：

- 唯一 shell 状态控制器管理 Tray / Orb / Docked Panel / Full Window；
- Orb 是入口，不是第二编辑器；
- Orb 单击展开，不做 hover 自动展开；
- Panel / Window 切换不得复制 Editor / PromptDocument；
- Global Shortcut 只负责显示 / 隐藏，不获取当前应用内容；
- 普通 close 回 Orb / Tray，只有明确 Exit 才终止进程；
- 开机启动默认关闭；
- Tauri capability 最小化，不开放通用 shell / 任意文件系统能力。

Desktop 实施只能按 `DESKTOP-TASKS.md` 推进；完成一包后更新任务账本和验证证据，再进入下一包。

## 10. AI、权限与隐私

- Provider、Model、Base URL、AI 开关、补全设置属于 Preferences，不进入 PromptDocument；
- Provider 失败不得阻断编辑、保存、本地 lint、Compiler、Preview、Copy；
- Browser 固定 Manifest 权限保持 `storage` + `sidePanel`；
- Browser optional host permission 只服务用户配置的 AI Provider；
- Desktop AI 网络走最小 `AiTransport`，不得增加 PromptNote 中转后端；
- 新增数据收集、遥测、后端、云同步、系统读取能力或权限前，必须先更新 `PRIVACY.md` 和相关权威文档。

## 11. 验证与发布

普通共享修改优先执行：

```text
直接相关测试 → typecheck → lint → Browser build → Desktop build（若已建立）
```

Browser 高风险改动需要真实 Chrome / Edge smoke。

Desktop 高风险改动需要真实 Windows smoke，尤其是：安装 / 启动、单实例、Tray、Orb、Panel、Global Shortcut、DPI、多显示器、全屏、SQLite、SecretStore 与 Provider 网络。

静态 CI 不能代替真实宿主验证。

Browser 正式发布操作见 `docs/PUBLISHING.md`；Desktop 发布流程在 P8 实现时建立，不提前伪造已完成流程。
