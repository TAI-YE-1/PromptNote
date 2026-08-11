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
- 后续 Edge smoke 又暴露 `Inserted content deeper than insertion position`：Slash 菜单在空白后、hard break 或嵌套 textblock 中仍可能把 block node 插入 inline depth。`sectionInsertion.ts` 已统一改为 block-depth transaction：合法块首 `setNodeMarkup`，其余先 `splitBlock` 再 `setBlockType`；AI append 改为 document depth `tr.insert`。CI `#426` 的 typecheck、lint、27 个 test files / 125 tests、extension build 与发布产物全部通过，覆盖块首、空白后、hard break、嵌套 list 与 append 场景。

## P2 — Tauri 2 Desktop Shell 基础

- [x] 初始化 `src-tauri/`，固定 Tauri 2；
- [x] Windows 10/11 x64 build target 可编译；
- [x] 配置单实例，第二次启动只唤起已有实例；
- [x] 建立最小 Tauri capabilities；
- [x] 明确禁止通用 shell execution 与无边界文件系统权限；
- [x] 复用现有 React 入口与共享 Editor，不复制 Desktop Editor；
- [ ] Full Window 首次启动可完成现有核心主链；
- [ ] Windows 本机构建与启动 smoke 通过。

### P2 宿主基础证据 — 2026-08-11

- 新增独立 `src-tauri/` Tauri 2 crate、`desktop.html`、`src/desktop.tsx` 与 `vite.desktop.config.mjs`；Desktop 构建输出固定到 `dist-desktop`，Browser 继续使用 `sidepanel.html` / `src/main.tsx` / `dist`，两种宿主构建目录互不覆盖。
- `tauri-plugin-single-instance` 负责第二实例唤起；P4 新增官方 `tauri-plugin-http` 作为唯一 AI 网络宿主适配。没有 shell / fs 通用插件。
- `src-tauri/capabilities/main-window.json` 保留 `core:default`，仅额外开放 AI 所需的 HTTPS 与 `localhost` / `127.0.0.1` HTTP scope；Cargo 依赖不包含 `tauri-plugin-shell`、`tauri-plugin-fs`，也没有通用 shell command 或任意文件系统命令。
- `src/desktop.tsx` 已直接挂载同一个 `PromptNoteApp`，并注入 Desktop `PromptRepository`、`PreferencesRepository`、`SecretStore`、`AiTransport`；`PromptEditor`、Compiler、Check、Preview、Copy、AI suggestion / completion 都继续复用共享实现，没有 Desktop Editor 副本。
- P4 审查发现 `src-tauri/src/main.rs` 仍残留早期第二套 `tauri::Builder`，导致真实 exe 会绕开 `lib.rs` 中的 SQLite / Credential Manager / commands / HTTP plugin。该平行旧链已删除：`main.rs` 现在只调用 `promptnote_desktop::run()`；`tests/desktop-host-config.test.ts` 明确禁止 `main.rs` 再出现第二套 Builder。
- Windows 验证已收敛到主 `.github/workflows/ci.yml` 的 `desktop-host` job：`windows-latest` 构建完整 `dist-desktop`，并以 `x86_64-pc-windows-msvc` 执行 `cargo test --locked`；早期独立 `desktop-host-check.yml` 已删除，避免重复验证链。
- 剩余 2 项继续不勾选：代码与 Windows CI 已证明共享 Full Window 可构建，但“首次启动完整主链”和“Windows 本机构建与启动”仍要求真实 GUI smoke，不能用构建成功替代。

## P3 — Desktop Repository 与 SecretStore

- [x] 建立单个应用本地 SQLite 数据库；
- [x] 实现 Desktop `PromptRepository`；
- [x] revision 单调 / stale write reject 与 Browser 合同一致；
- [x] 实现文档列表、current id、创建、删除、恢复；
- [x] 实现 Desktop `PreferencesRepository`；
- [x] 选择并实现 Windows 安全凭据存储作为 `SecretStore`；
- [x] API Key 不写入 SQLite Prompt / preferences 业务字段；
- [x] API Key 不进入 JSON backup；
- [x] 数据库 schema / migration 有显式版本；
- [x] 应用重启后文档、当前文档与非敏感设置恢复测试通过；
- [x] credential 保存 / 读取 / 删除真实 Windows 验证通过。

### P3 实施证据 — 2026-08-11

- `src-tauri/src/storage.rs` 在 Tauri `appLocalDataDir` 下维护唯一 `promptnote.sqlite3`。schema v1 只包含 `prompt_documents`、`app_state`、`preferences`，使用 `PRAGMA user_version = 1` 做显式迁移版本；没有 credential/secret 表。
- Desktop `PromptRepository` / `PreferencesRepository` 由 `src/platform/desktop/` 通过官方 `@tauri-apps/api/core` 的 `invoke` 映射到窄 Tauri commands；共享 PromptDocument、默认 AI preferences、解析规则与 Browser 使用同一份定义，没有 Desktop 平行业务模型。
- stale write 在 SQLite 边界原子执行：`ON CONFLICT(id) ... WHERE prompt_documents.revision <= excluded.revision`；revision 仍保持共享合同的非负整数语义，在 SQLite 边界执行 `u64 ↔ i64` 受检转换，超出 INTEGER 上限明确拒绝。
- SecretStore 使用 `keyring-core` + `windows-native-keyring-store`，生产只接受 `ai.apiKey`，后端为 Windows Credential Manager；credential 调用串行化。API Key 不进入 SQLite，`preferences_save` 也显式拒绝 `apiKey` 字段。
- JSON backup 继续只使用既有 `PromptDocumentExport { exportedAt, document }`，没有 Preferences/SecretStore 字段，因此 API Key 无结构性入口进入备份。
- `src-tauri/Cargo.lock` 由 Cargo 自动生成并正式入库；主 Windows CI 使用 `cargo test --locked`，避免每次重新解析未锁定的 Rust 依赖。
- GitHub Actions `ci` run `#433`（commit `d3a4882153f88ac167f9c84119ce5762a1dcb58c`）在 Windows Server 2025 / `x86_64-pc-windows-msvc` 完整通过：Desktop shell frontend build 成功；Rust `cargo test` 6/6 通过，包括 `windows_credential_manager_round_trip`、SQLite schema version、stale-write、preferences+API key reject、revision 越界拒绝、documents/current-id reopen 恢复。Browser verify 同一 run 也全部通过。
- P4 期间删除了实际 exe 的早期平行 Builder，当前 `src-tauri/src/main.rs → promptnote_desktop::run()` 已确保上述 P3 commands、SQLite 与 Credential Manager 真正进入唯一运行时，而不是只存在于可测试的 library 中。

## P4 — Desktop AI Transport

- [x] Desktop `AiTransport` 支持现有 OpenAI-compatible；
- [x] Desktop `AiTransport` 支持现有 Anthropic；
- [x] 复用共享 provider request / error semantics，不复制 AI 业务逻辑；
- [x] timeout / abort / transient retry 保持现有语义；
- [x] inline completion 仍要求 `configured && enabled && completionEnabled`；
- [x] localhost / 127.0.0.1 本地 Provider 可按 Desktop 规则访问；
- [x] AI 失败不阻断编辑 / 保存 / Check / Preview / Copy；
- [ ] 真实 HTTPS Provider 与本地 Provider smoke 有证据。

### P4 实施证据 — 2026-08-11

- Desktop 网络适配使用官方 `@tauri-apps/plugin-http` / `tauri-plugin-http` `2.5.9`；`DesktopAiTransport` 只负责宿主访问策略和 `request()`，不重新实现 OpenAI-compatible / Anthropic 的 endpoint、headers、body、SSE、错误分类或 fallback。
- Desktop 允许任意 HTTPS Provider；明文 HTTP 只允许 `localhost` 与 `127.0.0.1`。这一限制同时存在于 `DesktopAiTransport.ensureAccess/request` 与 Tauri capability scope；远程/LAN 明文 HTTP 不开放。
- `src/desktop.tsx` 把 `DesktopAiTransport` 注入同一个 `PromptNoteApp`。`getAiProvider()`、OpenAI-compatible `/v1/chat/completions`、Anthropic `/v1/messages`、30 秒 timeout、AbortSignal、SSE streaming、transient retry / fallback 都继续使用共享实现。
- `useInlineCompletion` 的 gate 仍是 `settings.enabled && settings.configured && settings.completionEnabled`；未为 Desktop 增加旁路。AI selection/global action 的异常仍只写 `aiError`，不会把应用切回 boot error，因此编辑、autosave、Check、Preview、Copy 主链不依赖 AI 成功。
- `tests/desktop-ai-transport.test.ts` 覆盖 HTTPS、自定义 HTTPS port、localhost/127.0.0.1、拒绝远程 HTTP/非法 scheme、AbortSignal 透传，并实际调用共享 `getAiProvider()` 验证 OpenAI-compatible 与 Anthropic 都经过 Desktop transport；CI `#447` 的 Browser verify 为 29 个 test files / 137 tests 全通过。
- GitHub Actions `ci` run `#446`（commit `8a291037187d651cbfde3e8b22c86521bfad32fb`）在 Windows Server 2025 上执行真实本地网络 smoke：测试启动 `127.0.0.1` 临时 OpenAI-compatible HTTP 服务，HTTP backend 实际 POST `/v1/chat/completions` 并读取 JSON 响应；Rust tests 7/7 通过，同时继续通过 Credential Manager 与全部 SQLite tests。
- 最后一项保持未完成：本地 Provider 已有真实 Windows round-trip，但尚未用真实 HTTPS AI Provider + 有效 API Key 在 Windows Desktop GUI 中完成连接/请求 smoke。不得用 mock、公共 HTTPS 请求或“理论可达”替代。

## P5 — Shell 状态机：Tray / Orb / Panel / Window

- [x] 建立唯一 Desktop shell state controller；
- [x] System Tray 菜单完成 Open / New Prompt / Show-Hide Orb / Settings / Exit；
- [x] Orb 使用正式 PromptNote 森林绿图标；
- [ ] Orb 单击展开 / 收起，不使用 hover 自动展开；
- [ ] Orb 可拖动并吸附左右屏幕边缘；
- [x] Orb 记忆显示器、边缘、纵向相对位置；
- [ ] Orb 空闲半隐藏但仍可发现 / 点击；
- [x] Docked Panel 默认 420 px 且不覆盖 Taskbar；
- [x] Panel 与 Full Window 切换复用同一编辑状态；
- [x] Panel Always-on-top 可关闭；
- [x] Full Window 使用正常最大化 / 最小化行为；
- [x] 普通 close 回 Orb / Tray；
- [x] 只有明确 Exit 才终止进程；
- [x] Orb 可永久隐藏，仅保留 Tray / Shortcut；
- [ ] 独占 / 全屏内容时 Orb 默认隐藏；
- [x] shell 切换期间 autosave、selection、ghost 不产生平行状态或丢失。

### P5 实施证据 — 2026-08-11

- `src-tauri/src/shell.rs` 是唯一 Desktop shell controller，统一持有 `TrayBackground / Orb / DockedPanel / FullWindow` 四种状态。Panel 与 Full Window 始终复用同一个 `main` WebView；Orb 只是加载 `orb.html` 的轻量入口，不挂第二份 `PromptNoteApp`，因此没有 Desktop Editor / Panel Editor 平行状态链。
- Tray 菜单固定为 Open PromptNote / New Prompt / Show-Hide Floating Orb / Settings / Exit PromptNote。New Prompt 与 Settings 通过宿主事件进入同一个共享 `PromptNoteApp`，分别复用既有 `createDocument()` 与 AI Settings 状态；`app.exit(0)` 只存在于明确 Exit 路径，普通窗口关闭被拦截并回到 Orb / Tray。
- Orb 使用现有正式 `icon-48.png`，独立 capability 只有 `core:default`；实现 48 logical px、点击打开 Panel、5 px 拖动阈值、Tauri 原生拖窗、松手按最近左右屏幕边缘吸附，并把 monitor / edge / yRatio 保存到同一 SQLite `preferences` 表的 `desktop_shell` key。空闲 1600 ms 后仅保留 20 logical px 可见，pointer enter 只恢复可见状态，不触发展开。
- Docked Panel 使用 monitor `work_area()` 而不是完整显示器高度，默认宽度 420 logical px，因而避开 Taskbar；Panel Always-on-top 默认开启但可在 UI 中关闭。Full Window 恢复正常 decorations / resizable / maximize / minimize / taskbar 行为并关闭 Always-on-top。
- 审查还发现 P2 早期 `src-tauri/frontend/index.html` 占位页仍是实际 Tauri frontend。该旧链已删除，`tauri.conf.json` 现在把唯一 `frontendDist` 指向 `../dist-desktop`，Vite 同时构建 `desktop.html + orb.html`；Windows 验证必须先生成真实 frontendDist，Tauri `generate_context!()` 才允许 Rust host 编译，避免再次出现“前端单独绿但 exe 没加载”的假闭环。
- `src-tauri/src/fullscreen.rs` 只使用 Win32 前台窗口/进程 ID/窗口矩形/显示器矩形判断外部独占全屏：排除 PromptNote 自身与普通最大化窗口，不读取键盘、剪贴板、选区，也不使用 OCR / Accessibility / UI Automation。全屏期间只临时隐藏 Orb，不修改 `orbEnabled` 或 shell mode；退出全屏后按原状态恢复。
- Windows finalizer `finalize-fullscreen-lock` 已用真实 `dist-desktop` 生成新 Cargo.lock，并在 `x86_64-pc-windows-msvc` 执行 `cargo test --locked` 成功后才提交 commit `b6c623f88832af94b0307693b9510ddaa0b8ee3c`。`tests/desktop-shell-boundary.test.ts` 继续锁定唯一 controller、Tray surface、Panel/Full 同 WebView、420px/work-area、AOT、Orb 行为、能力隔离与全屏检测安全边界。
- 4 个交互项继续保持未完成：Orb 实际点击展开/收起、真实拖动吸边、空闲半隐藏的可发现性、以及外部全屏应用中的自动隐藏/恢复。它们已有实现和自动测试，但根据本账本完成规则仍要求真实 Windows GUI smoke，不能用静态断言或 CI 编译替代。

## P6 — Global Shortcut、启动与窗口恢复

- [ ] 默认 `Ctrl + Alt + P` 注册成功时可 toggle compact shell；
- [ ] 快捷键冲突显示真实错误；
- [x] 不读取全局按键内容、当前选区或剪贴板；
- [x] 开机启动设置默认关闭；
- [ ] 用户开启后可开机进入 Orb / Tray 且不抢焦点；
- [ ] 手动启动恢复上次 shell 偏好；
- [ ] 显示器拔插 / 主屏切换后窗口位置安全回退；
- [ ] 100% / 125% / 150% DPI smoke；
- [ ] 多显示器不同 DPI smoke；
- [ ] Taskbar 不同位置 smoke；
- [ ] 全屏视频 / 应用 smoke。

### P6 实施证据 — 2026-08-11

- `src-tauri/src/startup.rs` 固定 `Ctrl + Alt + P`，由 Rust `tauri-plugin-global-shortcut 2.3.2` 注册；只有 `Pressed` 事件进入同一个 `ShellController.toggle_compact()`。注册冲突不会让应用启动失败，而是保留真实错误到 `StartupState`，Windows 设置页直接显示 `shortcutRegistered / shortcutError`。
- 快捷键实现不读取按键内容：P6 边界明确不存在 `GetAsyncKeyState`、`SetWindowsHookEx`、剪贴板读取、OCR、Accessibility / UI Automation；共享 Editor 也不接收宿主全局输入。
- 开机启动使用 `tauri-plugin-autostart 2.5.1`，默认不调用 enable；只有 Windows 设置页显式开启时才调用 OS autostart，并在写入后重新读取 `is_enabled()` 校验实际状态，失败返回真实错误。Autostart 参数固定为 `--autostart`。
- `--autostart` 启动走 `show_background_launch()`：先隐藏 main，Orb 窗口 `focusable(false) / focused(false)`，仅进入 Orb 或 Tray，不覆盖用户手动启动的 `last_mode`。普通手动启动仍按 SQLite 中 `last_mode` 恢复。
- Full Window 恢复旧坐标前会检查与任一当前 monitor work area 至少存在 64x48 physical px 安全交集；完全离屏则居中。Windows 测试曾发现负交集转 `u32` 会形成超大正数的真实 bug，已改为 `right <= left || bottom <= top` 先拒绝，再计算无符号交集。
- Tray 的 Settings 已与 AI Provider Settings 分离：Tray 打开 Windows Desktop 设置（快捷键 / 开机启动 / Orb / Panel 置顶）；AI chip 继续只负责 AI 配置。不存在第二套 Settings 数据模型。
- 正式 CI `#505`（commit `fcc5b1773206384ac7212cebf20b252f3141acbc`）Browser verify 全绿，Windows `desktop-host` 的真实 `dist-desktop → cargo test --locked` 也通过；P6 插件 API、后台启动、离屏恢复与已有 P3/P4/P5 Rust tests 在同一 Windows x64 宿主链验证。
- 其余 9 项保持未完成：快捷键真实注册/冲突、开机登录、手动恢复、拔屏、多 DPI、多屏不同 DPI、Taskbar 位置、全屏视频/应用均需要真实 Windows GUI / OS 生命周期 smoke，不能用静态测试或 CI 编译替代。

## P7 — Backup 兼容与 Browser 共存

- [x] Desktop 导出沿用现有 Prompt JSON backup contract；
- [x] Browser 导出的 backup 可导入 Desktop；
- [x] Desktop 导出的 backup 可导入 Browser；
- [x] 同 ID 覆盖继续执行 revision rebase；
- [x] 明确无自动 Browser/Desktop sync；
- [x] README / 用户文档说明 Browser 与 Desktop 数据独立、可手动迁移；
- [x] 不引入 PromptNote account / cloud backend。

### P7 实施证据 — 2026-08-11

- Browser 与 Desktop 都挂载同一个 `PromptNoteApp`；导出统一使用 `createPromptDocumentExport()`，导入统一使用 `parsePromptDocumentExport()`，宿主 Repository 不实现第二套 backup serializer。
- `resolveImportedDocument()` 继续保持同 ID 覆盖的 `max(imported.revision, existing.revision) + 1` rebase；跨宿主测试以 existing=21 / imported=6 验证结果 revision=22。
- Browser persistence 仍是 `chrome.storage.local`，Desktop persistence 仍是 Tauri commands → appLocalDataDir 下独立 `promptnote.sqlite3`；两边不共享存储，也没有自动 sync bridge。
- README 已新增 Browser / Desktop 手动迁移说明：JSON backup 双向兼容、同 ID 覆盖行为、数据彼此独立、API Key / Windows settings / SecretStore 不进入备份，并明确 V1 没有 PromptNote account、cloud backend 或自动同步。
- `tests/backup-cross-host.test.ts` 直接 round-trip 同一 PromptDocumentExport、验证双向 JSON 合同、revision rebase、共享 App 调用链、两种本地存储隔离与无云后端依赖。
- 正式 CI `#510`（commit `9040b9706e1f04c303ffa69ed4468098642a61be`）完整通过：license audit、typecheck、lint、全部 unit tests、Browser build/package/upload，以及 Windows `desktop-host` 的真实 `dist-desktop → cargo test --locked` 均为 success。

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
