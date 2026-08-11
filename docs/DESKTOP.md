# DESKTOP — PromptNote Windows Desktop V1

本文件是 PromptNote Desktop V1 的产品与宿主交互权威。涉及 Desktop 范围、窗口状态、悬浮球、托盘、快捷键、启动、持久化或平台权限的争议，优先以本文件判断。

Desktop 实现仍受 `PRODUCT.md`、`PROMPT-DOCUMENT-CONTRACT.md`、`ARCHITECTURE.md` 与 `DECISIONS.md` 约束。

## 1. 目标

Desktop V1 的目标不是重做 PromptNote，而是让现有 Prompt 编辑主链脱离浏览器也能长期驻留在 Windows：

```text
随时唤起 → 写 / 结构化 → 检查 → 预览 → 复制 → 收起
```

核心价值：

- 不需要打开 Edge 才能使用；
- 低干扰常驻；
- 一键唤起；
- 复用现有 PromptDocument / Editor / Compiler / AI；
- 安装后像正常 Windows 工具一样运行。

## 2. 平台与技术边界

Desktop V1 固定：

- Windows 10 / 11 x64；
- Tauri 2；
- 复用 React + TypeScript + TipTap / ProseMirror；
- WebView2；
- 单实例；
- 本地优先；
- 不使用 Electron；
- 不要求 PromptNote 账号或自有服务器。

macOS、Linux、Windows ARM64 属于未来平台，不为了“顺手兼容”进入 V1 实施范围。

## 3. Shell 状态机

Desktop 进程只有一份共享应用 / 编辑状态，外层 shell 有四种可见状态：

```text
Tray Background
      │
      ├──────────────→ Orb
      │                 │ click
      │                 ↓
      │           Docked Panel
      │                 │ expand
      │                 ↓
      └──────────── Full Window
```

允许的关键转换：

```text
Orb click              → Docked Panel
Panel collapse         → Orb（若 Orb enabled）/ Tray Background
Panel expand           → Full Window
Full Window minimize   → normal Windows minimize
Full Window close      → Orb（若 enabled）/ Tray Background
Global Shortcut        → toggle last compact visible shell
Tray: Open             → Full Window
Tray: Show/Hide Orb    → Orb enabled state
Tray: Exit             → terminate process
```

Orb、Panel、Full Window 不能各自挂一份 PromptEditor 状态。窗口重建后必须从同一 App state / Repository 恢复。

## 4. 首次启动与开机启动

### 首次手动启动

首次安装后第一次启动打开 Full Window，用于让用户理解应用、完成必要设置并看到完整编辑器。

不在首次启动时强制开启开机启动。

### 后续手动启动

默认恢复用户上一次选择的 shell 偏好；如果没有有效偏好，显示 Orb。

### 开机启动

- 默认关闭；
- 用户显式开启后生效；
- 开机启动默认进入 Orb / Tray，不主动弹 Full Window；
- 不抢占输入焦点。

## 5. Floating Orb

悬浮球是 Desktop V1 的默认低干扰入口，不是 AI 聊天气泡，也不承载 Prompt 正文。

### 外观

- 使用正式森林绿 PromptNote 图标；
- 视觉主体约 44–48 px；
- 点击区域不得小于可可靠操作范围；
- 不显示常驻文字标签；
- 空闲后允许向吸附边缘半隐藏，但必须保留清楚可发现的可点击部分。

### 交互

- 单击：展开 / 收起 Docked Panel；
- 拖动：改变位置；
- 松手后：吸附最近的左 / 右屏幕边缘；
- 右键：显示轻量菜单；
- **禁止 hover 自动展开**；
- 禁止因为鼠标经过而抢焦点；
- 记忆显示器、左右边与纵向相对位置。

### 层级

Orb 默认 topmost，但：

- 不覆盖 Windows Taskbar；
- 检测到独占 / 全屏内容时默认隐藏；
- 用户可以关闭 Orb，仅使用 Tray + Global Shortcut。

## 6. Docked Panel

Docked Panel 是日常快速编辑形态。

- 默认宽度：420 px；
- 贴附在 Orb 所在显示器与边缘；
- 高度限制在当前工作区，不覆盖 Taskbar；
- 复用 Browser 已验证的窄布局，不另做简化编辑器；
- 单击收起回 Orb / Tray；
- 提供“展开为完整窗口”入口；
- 默认可保持在其他普通窗口之上，但必须提供关闭 Always on Top 的设置；
- 打开时允许获取焦点，收起后把焦点正常还给系统。

V1 不做复杂可拖拽 resize/docking framework。若需要改变默认宽度，先通过真实使用验证后再决策。

## 7. Full Window

Full Window 是完整管理与长文本编辑形态。

- 使用正常 Windows 窗口行为；
- 支持最大化 / 最小化；
- 不强制 always-on-top；
- 文档管理、备份、AI 设置等完整 Sheet / 页面在此形态必须可访问；
- 与 Docked Panel 编辑同一当前文档；
- 关闭窗口不等于退出进程。

真正退出只能通过明确的 `Exit PromptNote` 操作完成。

## 8. System Tray

只要 Desktop 进程仍运行，Tray 提供稳定恢复入口。

V1 菜单：

```text
Open PromptNote
New Prompt
Show / Hide Floating Orb
Settings
Exit PromptNote
```

Tray 不复制文档状态；菜单动作进入共享应用命令。

## 9. Global Shortcut

V1 默认快捷键：

```text
Ctrl + Alt + P
```

职责仅限：显示 / 隐藏 PromptNote 最近的 compact shell（优先 Panel，其次 Orb）。

约束：

- 不记录全局键盘输入；
- 不读取当前应用选区；
- 不读取剪贴板；
- 快捷键注册冲突必须显示真实错误，并允许用户关闭 / 修改后重试；
- 后续是否开放用户自定义快捷键可在 V1 实施中完成，但不得新增第二套快捷键状态源。

## 10. 多显示器、DPI 与全屏

Desktop V1 必须真实验证：

- 100% / 125% / 150% 常见 DPI；
- 多显示器不同 DPI；
- 主屏切换；
- 显示器拔插后位置恢复；
- Taskbar 在底部 / 侧边时的工作区；
- 全屏视频 / 游戏时 Orb 不持续压在内容上。

位置恢复使用显示器标识 + 边缘 + 相对纵向比例，不依赖永久绝对像素坐标。恢复位置失效时回落到当前主显示器右侧中部。

## 11. 数据与迁移

Desktop V1：

- PromptDocument / 文档索引 / 非敏感偏好：应用本地 SQLite；
- API Key 等敏感认证信息：Desktop SecretStore，使用系统安全存储能力；
- 数据不写入 PromptNote 云端；
- Browser 与 Desktop 不实时同步；
- 复用现有 JSON 备份作为跨宿主手动迁移格式；
- 导出文件不包含 API Key。

Desktop Repository 必须实现现有 revision 规则，不能因为 SQLite 改写 PromptDocument 语义。

## 12. AI 网络

Desktop 继续支持当前 OpenAI-compatible / Anthropic 配置语义。

Desktop 可以使用宿主 AI Transport 绕开浏览器 optional host permission / CORS 差异，但：

- 只向用户明确配置的 Provider 发请求；
- 不增加 PromptNote 中转服务器；
- 不执行 Provider 返回的代码；
- AI 失败不得阻断本地核心功能；
- inline completion 默认关闭的规则不变。

## 13. 安全与隐私

V1 不申请 / 实现以下能力：

- 系统级划词捕获；
- OCR / 屏幕读取；
- 全局键盘记录；
- 自动读取剪贴板；
- 自动粘贴到第三方应用；
- Accessibility / UI Automation 注入；
- 任意 shell command；
- 任意文件系统读写。

Tauri capabilities 必须按真实命令最小化。新增系统级能力前必须先修改本文件、`PRODUCT.md`、`DECISIONS.md`，必要时同步 `PRIVACY.md`。

## 14. Desktop V1 不做什么

明确排除：

- Browser/Desktop 实时同步；
- PromptNote 账号 / 云同步；
- 划词助手；
- OCR；
- 自动抓取其他应用上下文；
- 自动把 Prompt 写回第三方应用；
- Agent / MCP / workflow；
- macOS / Linux；
- Electron；
- 自动更新系统（除非发布前单独做出产品与安全决策）。

## 15. 验收标准

Desktop V1 只有同时满足以下条件才可宣称完成：

1. Windows 安装包可安装、卸载并正常启动；
2. 不打开浏览器也能完成写 → 结构化 → 检查 → 预览 → 复制；
3. Browser 与 Desktop 使用同一 PromptDocument / Editor / Compiler 核心；
4. Orb 可拖动、吸边、记忆位置、单击展开且不会 hover 误触；
5. Panel / Full Window 切换不丢当前文档、selection 或未保存正文；
6. Tray 与 Global Shortcut 能在窗口隐藏后恢复应用；
7. `Exit PromptNote` 才真正退出，普通关闭行为符合本文件；
8. 重启应用后文档与非敏感设置可恢复；
9. API Key 不进入 Prompt JSON 备份或 Desktop SQLite 明文业务字段；
10. AI 未配置 / 失败时核心功能完整可用；
11. 多显示器、常见 DPI、Taskbar、全屏场景完成真实 Windows smoke；
12. Desktop 不新增网页 / 其他应用自动读取与注入能力；
13. Windows Desktop CI / build 与共享核心测试全部通过。