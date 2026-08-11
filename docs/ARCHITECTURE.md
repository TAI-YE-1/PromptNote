# ARCHITECTURE — PromptNote

本文件定义 PromptNote 当前与目标技术边界、模块职责和依赖方向。目标是保持轻量、单向数据流、单一正文源，并让 Browser Extension 与 Windows Desktop 共享同一个产品核心。

## 1. 系统形态

当前已交付：

- Chrome / Edge Manifest V3 Extension；
- Side Panel 主界面；
- React + TypeScript；
- TipTap / ProseMirror 编辑器；
- `chrome.storage.local` 本地持久化；
- 用户直连自定义 AI Provider；
- 无 PromptNote 自有后端、账号或云数据库；
- 不注入第三方网页 DOM。

下一阶段目标：

- 保留 Browser Extension；
- 新增 Windows Desktop Host；
- Desktop runtime 固定为 Tauri 2，不使用 Electron；
- Browser / Desktop 复用同一 React 编辑核心；
- 桌面宿主只承担窗口、托盘、快捷键、本机持久化、安全凭据与桌面网络传输等平台职责。

## 2. 目标逻辑架构

```text
                         PromptNote Shared Core
┌────────────────────────────────────────────────────────────┐
│ React UI / PromptEditor / PromptDocument / Compiler        │
│ Prompt Check / AI semantics / Suggestion / Completion      │
└──────────────────────────────┬─────────────────────────────┘
                               │
                     narrow platform contracts
                               │
             ┌─────────────────┴─────────────────┐
             │                                   │
     Browser Extension Host              Windows Desktop Host
     chrome.storage.local                 Tauri 2
     chrome.sidePanel                     Desktop Repository
     optional host permission             Secure Secret Store
     browser fetch                        Desktop AI Transport
                                          Orb/Panel/Window/Tray
                                          Global Shortcut
```

核心依赖方向只能是：

```text
host implementation → platform contract ← shared core consumer
```

`editor/`、`prompt/`、Compiler 与共享 AI 语义层不得直接 import `chrome.*`、Tauri API 或 Rust bridge。

## 3. 平台合同

只为真实宿主差异建立最小合同，不制造抽象层级。

至少需要以下边界：

```text
PromptRepository
PreferencesRepository
SecretStore
AiTransport
```

Desktop 专属的 Shell / Tray / Shortcut 控制不进入共享 Prompt 领域模型，由 Desktop Host 自己持有。

### PromptRepository

负责 PromptDocument 的列表、读取、保存、删除与 revision 约束。Browser 与 Desktop 可以有不同实现，但语义必须一致。

### PreferencesRepository

负责非正文设置。Browser 当前使用扩展本地存储；Desktop 使用本机应用数据存储。

### SecretStore

API Key 等认证信息不进入 PromptDocument 或 JSON 备份。Desktop 不得把 API Key 以明文业务字段写进 Prompt 数据库；具体安全存储实现属于 Desktop Host。

### AiTransport

Provider 的请求语义、错误归一化、超时与取消尽量共享；实际网络传输由宿主实现。Browser 继续受 optional host permission 约束，Desktop 不复刻浏览器权限模型。

## 4. 目标目录职责

当前目录继续作为共享核心的基础，不为桌面版复制一套 `desktop-editor` 或 `desktop-prompt`。

目标结构：

```text
src/
├─ app/          共享应用编排与 host-neutral use cases
├─ editor/       TipTap 节点、Editor、Slash、选区、ghost、block conversion
├─ prompt/       PromptDocument、section kinds、Compiler、纯文本派生
├─ storage/      平台无关 Repository contracts 与共享 revision 规则
├─ ai/           Provider 语义、instructions、lint、suggestions、types、补全
├─ platform/
│  ├─ browser/   Chrome storage / permission / browser transport
│  └─ desktop/   Desktop bridge adapters（仅前端侧）
├─ extension/    Manifest service worker 入口
├─ ui/           Sheets、ActionBar、SlashMenu、Preview、Lint、Suggestion UI
└─ main.tsx      React 启动入口

src-tauri/
├─ src/          Tauri commands、window/tray/shortcut、desktop transport
├─ capabilities/ 最小权限能力配置
└─ tauri.conf.*  Desktop build / window 配置
```

实际迁移按调用方逐步完成；禁止为了“看起来像架构”一次创建没有消费者的空接口、wrapper 或目录。

## 5. 状态边界

### PromptDocument

唯一持久正文源。Schema 见 `PROMPT-DOCUMENT-CONTRACT.md`。Browser 与 Desktop 必须使用同一个 Schema。

### Editor state

ProseMirror EditorState 是 caret、selection、block 操作和 ghost decoration 的权威状态。Editor 不直接访问 Storage、Chrome、Tauri 或 AI Transport。

### Preferences

保存 Provider、Model、Base URL、AI 开关、补全设置和指令覆盖。认证信息通过宿主 SecretStore / 当前 Browser 本地设置策略处理，不进入 PromptDocument。

### Desktop shell state

Orb、Panel、Full Window、Tray Background 是宿主 UI 状态，不进入 PromptDocument，也不能形成第二份编辑正文。详细状态机见 `DESKTOP.md`。

### 派生状态

Preview、Compiler 输出、lint finding、AI suggestion、ghost completion 都可以重新计算或失效，不是第二正文源。

## 6. Storage 与 revision

`PromptRepository` 是正文持久化唯一入口。

所有宿主实现必须保证：

- 同一文档 revision 单调；
- 旧 revision 不覆盖新 revision；
- 启动恢复 documents/current id；
- 同 ID 显式备份覆盖先完成 revision rebase，再走正常保存；
- 不为了 Desktop 新建第二套正文 Schema。

Browser 实现继续使用 `chrome.storage.local`。

Desktop V1 使用应用本地 SQLite 作为 PromptDocument 与非敏感应用数据的持久化实现；数据库仅是 Repository 实现细节，不改变 PromptDocument 合同。API Key 等敏感凭据不写入该数据库。

Browser 与 Desktop V1 不做实时同步。跨宿主迁移通过现有 JSON 备份格式显式导入 / 导出，且备份不包含认证信息。

## 7. Compiler

Compiler 只做：

```text
PromptDocument → Plain / Markdown / XML
```

不得修改 Editor、读写 Repository、调用 AI、访问网页 DOM 或调用桌面系统 API。

## 8. AI Assistance

AI 有两类调用：

1. 用户显式触发的 selection/global suggestion 或 AI lint；
2. 用户单独开启的 inline completion。

Provider Adapter 统一处理 Provider 差异、请求语义、超时、streaming 和错误归一化；宿主网络差异收敛到 `AiTransport`。

Inline completion 调度必须检查：

```text
settings.configured && settings.enabled && settings.completionEnabled
```

completion context 绑定当前文档、Editor generation、block、caret 和上下文预算。只要这些身份变化，旧 partial、旧请求、旧 retry 和旧 ghost 就失效。

AI 失败不得阻断编辑、保存、本地 lint、Compiler、Preview 或 Copy。

## 9. Browser Host

Browser 固定 Manifest 权限保持：

```text
storage
sidePanel
```

AI 网络访问使用 optional host permission。不得为了 Desktop 功能重新向 Browser 加入 `activeTab`、`scripting`、第三方网页 content script 或页面 bridge。

PromptEditor 当前同步加载；浏览器 runtime loading 边界变更仍需要真实 Chrome / Edge 验证。

## 10. Desktop Host

Desktop V1 固定：

- Tauri 2；
- Windows 10/11 x64 首发；
- 单实例；
- System Tray；
- Global Shortcut；
- Orb / Docked Panel / Full Window；
- 可选开机启动；
- 不使用 Electron；
- 不自动读取其他应用、剪贴板、屏幕或选中文字；
- 不注入第三方应用。

桌面 shell 行为与尺寸权威见 `DESKTOP.md`。

Tauri capability / command 必须最小化；不得开放通用 shell execution、任意文件系统或无边界系统命令作为便利接口。

## 11. 错误与恢复

- Repository/Provider/Desktop bridge 错误必须显式传播到 UI；
- 不伪造成功；
- React 子树运行时异常由根级 error boundary 提供可见错误界面；
- 主编辑能力必须能够在 AI 不可用时降级运行；
- Desktop shell 崩溃或窗口重建不能产生第二份正文状态。

## 12. 性能原则

优先减少真实热路径工作，而不是增加第二状态源或隐藏 warning：

- autosave 使用增量文档状态；
- Editor 本地键入不整文档 stringify/setContent；
- completion context 按预算局部读取；
- 过期 AI 请求及时取消；
- 非首屏 UI 可以按需加载；
- Orb 常驻时不保持无必要的编辑器重渲染或后台 AI 请求；
- 构建 warning 保持可见，不通过简单提高阈值掩盖。

## 13. 验证边界

共享核心改动必须同时保护 Browser 与 Desktop 合同。

Browser：CI + 必要的真实 Chrome / Edge smoke。

Desktop：Windows 构建 + 安装 / 启动 / 单实例 / Orb / Panel / Tray / Global Shortcut / 本地持久化 smoke。

涉及 IME、selection、Editor runtime、系统窗口生命周期、DPI、多显示器、全屏隐藏或真实 Provider 网络行为的变更，不能只用静态单测代替真实宿主验证。