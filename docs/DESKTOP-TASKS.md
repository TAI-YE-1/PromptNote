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

- [x] 搜索并列出 `src/` 中所有直接 `chrome.*`、extension storage、host permission、window lifecycle 依赖；
- [x] 将 Prompt 正文持久化语义收敛到 `PromptRepository` contract；
- [x] 将非正文设置收敛到 `PreferencesRepository` contract；
- [x] 定义 `SecretStore` contract，确保 credential 不进入 PromptDocument；
- [x] 定义 `AiTransport` 最小 contract；
- [x] Browser adapter 接回现有 `chrome.storage.local` 行为，保持 revision / backup 语义不变；
- [x] Browser AI transport 保持 optional host permission 与现有错误语义；
- [x] 迁移共享调用方后删除直接散落的 host-specific 访问；
- [x] 反向搜索确认 `editor/`、`prompt/`、Compiler 不直接依赖 Chrome / Tauri；
- [x] 现有 Browser 单测、typecheck、lint、build 全通过；
- [x] 真实 Edge / Chrome smoke 确认平台抽取没有回归 1.0 主链。

### P1 实施证据 — 2026-08-11

- 审查确认的 Browser 平台依赖集中在四类真实调用链：Prompt 持久化、AI 设置/credential 存储、AI 网络访问与 optional host permission、extension service worker / Side Panel 生命周期；`PromptEditor`、PromptDocument、Compiler、Prompt Check、AI suggestion 与 inline completion 业务规则继续作为共享核心保留。
- `src/storage/promptRepository.ts` 只保留 `PromptRepository` contract；Browser 的 `chrome.storage.local` 实现迁移到 `src/platform/browser/promptRepository.ts`，继续使用 `promptnote.documents.v1` / `promptnote.currentDocumentId.v1`，并保留串行写入、revision stale-write reject 与 `ensureCurrent` 行为。
- 非敏感 AI 设置由 `PreferencesRepository` 承载；credential 通过独立 `SecretStore` 访问。Browser 为保持 1.0 数据兼容，`ChromeAiSettingsStore` 仍读写原 `promptnote.aiSettings.v1` 结构；共享层不再直接访问 `chrome.storage.local`，Desktop 后续按 P3 实现独立安全 `SecretStore`。
- `AiTransport` 只收敛宿主网络授权与 request；OpenAI-compatible / Anthropic 的 request body、streaming、timeout、abort、transient error 与 fallback 规则仍只有一份共享 provider 实现。Browser adapter 保留原 `origin/*` optional host permission 语义。
- `src/extension/background.ts` 的 `chrome.action` / `chrome.sidePanel` 生命周期调用保持在 Browser host 内，不为 Desktop 制造无调用方 wrapper。
- 删除旧 `src/storage/aiSettingsRepository.ts`；共享真实调用方已改为依赖平台合同，Browser composition 只在 `src/main.tsx` 注入 Browser adapters。新增 `tests/platform-boundary.test.ts` 防止 `src/app`、`src/ai`、`src/editor`、`src/prompt`、`src/storage` 重新出现直接 `chrome.*` / Tauri API。
- 自动验证基于 commit `0d191565cd82aaee6b163725e19890327a915ffe` 的 GitHub Actions `ci` run `#411`：license audit、typecheck、lint、25 个 test files / 114 tests、extension build、release artifact package/upload 全部通过。构建产物 digest：`sha256:132296e7bb8de0d7b27254ee621a3645cca614247804262d9a4ffdf4e0ce65f6`。
- 真实 Browser smoke 已于 Windows Edge 完成：用户基于当前 `main` 构建产物验证扩展可加载、Side Panel 与 1.0 主链可用；smoke 过程中发现“模块开头 `/` 更换类别会新增上方模块”的真实回归，随后以 commit `11ed32767ff8cab8db75c619fc424a99e6b5c425` 修复为块首原位转换，CI `#413` 的 typecheck、lint、unit tests、extension build 与发布产物打包均通过，用户重新加载 Edge 后确认问题已消失。至此 P1 平台抽取与真实宿主回归验证闭环。

## P2 — Tauri 2 Desktop Shell 基础

- [x] 初始化 `src-tauri/`，固定 Tauri 2；
- [x] Windows 10/11 x64 build target 可编译；
- [x] 配置单实例，第二次启动只唤起已有实例；
- [x] 建立最小 Tauri capabilities；
- [x] 明确禁止通用 shell execution 与无边界文件系统权限；
- [ ] 复用现有 React 入口与共享 Editor，不复制 Desktop Editor；
- [ ] Full Window 首次启动可完成现有核心主链；
- [ ] Windows 本机构建与启动 smoke 通过。

### P2 宿主基础证据 — 2026-08-11

- 新增独立 `src-tauri/` Tauri 2 crate、`desktop.html`、`src/desktop.tsx` 与 `vite.desktop.config.mjs`；Desktop 构建输出固定到 `dist-desktop`，Browser 继续使用 `sidepanel.html` / `src/main.tsx` / `dist`，两种宿主构建目录互不覆盖。
- `tauri-plugin-single-instance` 是当前唯一 Desktop plugin；第二实例回调只查找 `main` WebView window 并执行 `show`、`unminimize`、`set_focus`，不创建第二份应用进程状态。
- `src-tauri/capabilities/main-window.json` 当前只声明 `core:default`；Cargo 依赖不包含 `tauri-plugin-shell`、`tauri-plugin-fs`，也没有通用 shell command 或任意文件系统命令。
- 新增 `tests/desktop-host-config.test.ts`，锁定 Tauri 2、单一 `main` window、单实例回调、最小 capability 与 Desktop entry 不依赖 Browser adapter；现有 Browser typecheck/lint/unit/build 继续通过。
- 新增独立 `desktop-host-check` Windows workflow：`windows-latest` 上构建 Desktop shell 前端，并以 `x86_64-pc-windows-msvc` 对 `src-tauri/Cargo.toml` 执行真实 `cargo check`，当前 run 已通过；因此“Windows x64 build target 可编译”已有真实 Windows runner 证据。
- 暂不勾选剩余 3 项：`src/desktop.tsx` 当前只承担真实 Tauri shell 启动边界，尚未接入 `PromptNoteApp`，避免为 P2 制造随后必须删除的内存/localStorage Repository、假 SecretStore 或假 AI Transport。完整共享 Editor 主链将在真实 Desktop adapters 到位后接回；Windows 本机启动/第二实例行为仍需真实 GUI smoke。

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
