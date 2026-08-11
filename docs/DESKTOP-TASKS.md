# DESKTOP TASKS — PromptNote Windows Desktop V1

本文件是 Desktop V1 的唯一实施账本。产品与架构定义分别以 `PRODUCT.md`、`DESKTOP.md`、`PROMPT-DOCUMENT-CONTRACT.md`、`ARCHITECTURE.md`、`DECISIONS.md` 为权威；本文件只记录实施闭环。

## 完成规则

一项任务只有同时满足以下条件才能勾选：

```text
实现完成
+ 调用方已迁移
+ 无平行旧链 / 临时 bypass
+ 相关自动测试通过
+ 需要真实 Windows 验证的任务已有实际证据
```

禁止为了进度勾选仅有 scaffold、TODO、mock 或“理论可行”的项目。

## P0 — 文档与边界冻结

- [x] `PRODUCT.md` 接受 Browser + Desktop 双宿主产品形态；
- [x] 新增 `DESKTOP.md` 并冻结 Desktop V1 shell / 范围；
- [x] `ARCHITECTURE.md` 定义共享核心与平台合同；
- [x] `UX.md` 对齐 Desktop shell 与共享 Editor UX；
- [x] `DECISIONS.md` 记录 Tauri、共享核心、悬浮球、存储、无同步等决策；
- [x] `AGENTS.md` 将 Desktop 文档加入开发权威链；
- [x] 建立本任务账本。

## P1 — 共享核心平台边界

- [ ] 搜索并列出 `src/` 中所有直接 `chrome.*`、extension storage、host permission、window lifecycle 依赖；
- [ ] 将 Prompt 正文持久化语义收敛到 `PromptRepository` contract；
- [ ] 将非正文设置收敛到 `PreferencesRepository` contract；
- [ ] 定义 `SecretStore` contract，确保 credential 不进入 PromptDocument；
- [ ] 定义 `AiTransport` 最小 contract；
- [ ] Browser adapter 接回现有 `chrome.storage.local` 行为，保持 revision / backup 语义不变；
- [ ] Browser AI transport 保持 optional host permission 与现有错误语义；
- [ ] 迁移共享调用方后删除直接散落的 host-specific 访问；
- [ ] 反向搜索确认 `editor/`、`prompt/`、Compiler 不直接依赖 Chrome / Tauri；
- [ ] 现有 Browser 单测、typecheck、lint、build 全通过；
- [ ] 真实 Edge / Chrome smoke 确认平台抽取没有回归 1.0 主链。

## P2 — Tauri 2 Desktop Shell 基础

- [ ] 初始化 `src-tauri/`，固定 Tauri 2；
- [ ] Windows 10/11 x64 build target 可编译；
- [ ] 配置单实例，第二次启动只唤起已有实例；
- [ ] 建立最小 Tauri capabilities；
- [ ] 明确禁止通用 shell execution 与无边界文件系统权限；
- [ ] 复用现有 React 入口与共享 Editor，不复制 Desktop Editor；
- [ ] Full Window 首次启动可完成现有核心主链；
- [ ] Windows 本机构建与启动 smoke 通过。

## P3 — Desktop Repository 与 SecretStore

- [ ] 建立单个应用本地 SQLite 数据库；
- [ ] 实现 Desktop `PromptRepository`；
- [ ] revision 单调 / stale write reject 与 Browser 合同一致；
- [ ] 实现文档列表、current id、创建、删除、恢复；
- [ ] 实现 Desktop `PreferencesRepository`；
- [ ] 选择并实现 Windows 安全凭据存储作为 `SecretStore`；
- [ ] API Key 不写入 SQLite Prompt / preferences 业务字段；
- [ ] API Key 不进入 JSON backup；
- [ ] 数据库 schema / migration 有显式版本；
- [ ] 应用重启后文档、当前文档与非敏感设置恢复测试通过；
- [ ] credential 保存 / 读取 / 删除真实 Windows 验证通过。

## P4 — Desktop AI Transport

- [ ] Desktop `AiTransport` 支持现有 OpenAI-compatible；
- [ ] Desktop `AiTransport` 支持现有 Anthropic；
- [ ] 复用共享 provider request / error semantics，不复制 AI 业务逻辑；
- [ ] timeout / abort / transient retry 保持现有语义；
- [ ] inline completion 仍要求 `configured && enabled && completionEnabled`；
- [ ] localhost / 127.0.0.1 本地 Provider 可按 Desktop 规则访问；
- [ ] AI 失败不阻断编辑 / 保存 / Check / Preview / Copy；
- [ ] 真实 HTTPS Provider 与本地 Provider smoke 有证据。

## P5 — Shell 状态机：Tray / Orb / Panel / Window

- [ ] 建立唯一 Desktop shell state controller；
- [ ] System Tray 菜单完成 Open / New Prompt / Show-Hide Orb / Settings / Exit；
- [ ] Orb 使用正式 PromptNote 森林绿图标；
- [ ] Orb 单击展开 / 收起，不使用 hover 自动展开；
- [ ] Orb 可拖动并吸附左右屏幕边缘；
- [ ] Orb 记忆显示器、边缘、纵向相对位置；
- [ ] Orb 空闲半隐藏但仍可发现 / 点击；
- [ ] Docked Panel 默认 420 px 且不覆盖 Taskbar；
- [ ] Panel 与 Full Window 切换复用同一编辑状态；
- [ ] Panel Always-on-top 可关闭；
- [ ] Full Window 使用正常最大化 / 最小化行为；
- [ ] 普通 close 回 Orb / Tray；
- [ ] 只有明确 Exit 才终止进程；
- [ ] Orb 可永久隐藏，仅保留 Tray / Shortcut；
- [ ] 独占 / 全屏内容时 Orb 默认隐藏；
- [ ] shell 切换期间 autosave、selection、ghost 不产生平行状态或丢失。

## P6 — Global Shortcut、启动与窗口恢复

- [ ] 默认 `Ctrl + Alt + P` 注册成功时可 toggle compact shell；
- [ ] 快捷键冲突显示真实错误；
- [ ] 不读取全局按键内容、当前选区或剪贴板；
- [ ] 开机启动设置默认关闭；
- [ ] 用户开启后可开机进入 Orb / Tray 且不抢焦点；
- [ ] 手动启动恢复上次 shell 偏好；
- [ ] 显示器拔插 / 主屏切换后窗口位置安全回退；
- [ ] 100% / 125% / 150% DPI smoke；
- [ ] 多显示器不同 DPI smoke；
- [ ] Taskbar 不同位置 smoke；
- [ ] 全屏视频 / 应用 smoke。

## P7 — Backup 兼容与 Browser 共存

- [ ] Desktop 导出沿用现有 Prompt JSON backup contract；
- [ ] Browser 导出的 backup 可导入 Desktop；
- [ ] Desktop 导出的 backup 可导入 Browser；
- [ ] 同 ID 覆盖继续执行 revision rebase；
- [ ] 明确无自动 Browser/Desktop sync；
- [ ] README / 用户文档说明 Browser 与 Desktop 数据独立、可手动迁移；
- [ ] 不引入 PromptNote account / cloud backend。

## P8 — Windows 打包、CI 与发布闭环

- [ ] GitHub Actions 增加 Windows Desktop build；
- [ ] 生成可分发 Windows installer（优先 NSIS；若选择 MSI 需记录决策）；
- [ ] 安装、升级同版本保护、卸载 smoke；
- [ ] 安装后图标、应用名、版本、Publisher metadata 正确；
- [ ] Browser release artifact 继续独立生成且不被 Desktop 构建污染；
- [ ] 共享核心测试在 Browser / Desktop 构建路径均执行；
- [ ] Desktop 安装包不包含 API Key、开发配置或本机路径；
- [ ] `PRIVACY.md` 在 Desktop 发布前核对 Desktop 数据 / SecretStore / AI transport 描述；
- [ ] 新增 Desktop 发布说明与安装文档；
- [ ] 完整 Windows V1 smoke checklist 有实际记录；
- [ ] 所有 P1–P8 未完成项清零后才标记 Desktop V1 完成。

## Future — 不进入 Desktop V1

以下项目只能作为未来提案，不得在上述包中“顺便实现”：

- Browser/Desktop 自动同步；
- PromptNote 账号与云端；
- 系统划词助手；
- OCR / 截屏读取；
- 自动读剪贴板；
- 自动写回第三方应用；
- Accessibility / UI Automation；
- Agent / MCP / workflow；
- macOS / Linux / Windows ARM64；
- 自动更新系统。