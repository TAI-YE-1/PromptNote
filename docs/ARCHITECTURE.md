# ARCHITECTURE — PromptNote

本文件定义 V1 的技术边界、模块职责和依赖方向。目标是保持项目轻量、单向数据流、单一状态源，并避免浏览器集成、编辑器、AI 与持久化互相耦合。

## 1. V1 形态

- Chrome / Edge Extension
- Manifest V3
- Side Panel 主界面
- React + TypeScript
- TipTap / ProseMirror 编辑器
- `chrome.storage.local` 本地持久化
- 无后端、无账号系统、无云数据库

## 2. 逻辑架构

```text
┌──────────────────────────────┐
│         Side Panel UI        │
│                              │
│ PromptEditor  Preview/Lint   │
│ AI Status / AI Settings      │
└──────────────┬───────────────┘
               │
               ▼
        PromptDocument
        （唯一正文源）
          │          │
          │          ├──────────────┐
          ▼          ▼              ▼
      Repository   Compiler    AI Assistance
          │          │              │
 chrome.storage   string       Suggestion/Lint
          │                         │
          │                  AI Provider Adapter
          │                         │
          │                  Provider API（可选）
          │
          └──────────────┬──────────┘
                         ▼
                    UI actions
                         │
                         ▼
                    Web Adapter
                         │
                         ▼
              Shared Caret Insert Engine
```

另有一类与正文分离的 Extension Preferences：

```text
Extension Preferences
├─ AI enabled
├─ Provider
├─ Model
├─ API Base URL
├─ API credential reference / local secret
└─ default AI content scope
```

这些设置不得进入 PromptDocument。

## 3. 模块建议

初始目录保持小而明确：

```text
src/
├─ editor/
│  ├─ PromptEditor.tsx
│  ├─ promptSection.ts
│  └─ slashMenu.ts
├─ prompt/
│  ├─ schema.ts
│  ├─ sectionKinds.ts
│  └─ compiler.ts
├─ storage/
│  ├─ promptRepository.ts
│  └─ preferencesRepository.ts
├─ ai/
│  ├─ provider.ts
│  ├─ suggestion.ts
│  └─ lint.ts
├─ adapters/
│  ├─ types.ts
│  ├─ editable.ts
│  ├─ generic.ts
│  └─ ...
├─ extension/
│  ├─ background.ts
│  └─ content.ts
├─ App.tsx
└─ main.tsx
```

这只是职责边界，不要求机械拆成大量碎片文件。若一个模块很小，可合并相邻文件；禁止为“架构看起来漂亮”制造无价值包装层。

## 4. 依赖方向

### 4.1 Prompt 核心层

`prompt/` 定义：

- PromptDocument Schema；
- section kind 权威定义；
- Compiler；
- 与 UI 无关的纯逻辑。

它不得依赖：

- React；
- Chrome API；
- 页面 DOM；
- AI Provider SDK。

### 4.2 Editor 层

`editor/` 负责：

- TipTap Extension；
- Slash Menu；
- 编辑命令；
- 选区；
- 把用户接受的 suggestion 应用到当前文档。

Editor 不直接读写 `chrome.storage.local`，不直接操作目标网页 DOM，也不得因为出现选区就直接调用 AI。

### 4.3 Storage 层

`storage/` 是本地持久化唯一入口。

正文持久化使用 `PromptRepository`；扩展偏好使用独立 preferences repository / namespace。

V1 可以都基于 `chrome.storage.local` 实现，但必须逻辑隔离：

- PromptDocument 是正文权威状态；
- AI 设置是扩展偏好；
- API credential 不得写入 PromptDocument、导出的 PromptDocument JSON 或 Compiler 输出。

禁止：

- 组件中散落 `chrome.storage.local.get/set`；
- 同时用 localStorage、IndexedDB、Chrome Storage 保存正文；
- 保存 Markdown/XML 副本作为另一份内容状态；
- 把 Provider/Model/API Key 复制进每个 PromptDocument。

### 4.4 Compiler 层

Compiler 是纯函数式转换：

`PromptDocument → Plain / Markdown / XML`

Compiler 不允许：

- 修改 Editor state；
- 读取 DOM；
- 存储数据；
- 调用 AI；
- 根据当前网站偷偷改变正文。

### 4.5 AI Assistance 层

AI 层只接受当前内容/选区与操作意图，返回 suggestion 或 lint finding。

统一 Provider Adapter 负责：

- Provider 差异；
- Base URL / Model / credential 配置；
- 请求与错误归一化；
- 测试连接。

UI、Editor 和 Prompt 核心层不得直接散落多个 Provider SDK 调用。

AI Assistance 不能直接：

- 写 PromptRepository；
- 替换 TipTap state；
- 自动发送消息；
- 在 Provider 间维护不同 Prompt 正文副本。

只有用户明确触发 AI 动作后才允许调用 Provider。

选区动作默认只发送选区；如果某个全局动作需要完整 Prompt，该动作的 UI 必须明确表达发送范围，不能依赖隐式扩大上下文。

AI suggestion 必须带来源 revision；正文发生变化后，过期 suggestion 不得直接应用。

### 4.6 Prompt Lint

Prompt lint 分两层：

1. 本地 deterministic lint：无需 AI，可在离线/未配置 AI 时运行；
2. AI semantic lint：只在用户显式触发时调用，用于更复杂的歧义、冲突和完整性判断。

禁止把基础 lint 强制绑定到 AI Provider。

### 4.7 Web Adapter 与共享插入引擎

网页插入分成两层职责：

1. `WebPromptAdapter` 只负责“这个页面由谁识别目标编辑器”；
2. `adapters/editable.ts` 作为共享插入引擎，统一处理 caret / selection / fallback-end 的 DOM 写入。

统一接口：

```ts
interface WebPromptAdapter {
  id: string;
  canHandle(url: URL): boolean;
  findComposer(): HTMLElement | null;
}
```

选择顺序：

```text
站点特殊 Adapter（仅必要 selector / DOM 差异）
        ↓ 找不到则
通用 Web Input Adapter
        ↓
共享 Caret Insert Engine
```

通用 Adapter 优先覆盖标准：

- `textarea`；
- 常用文本 `input`；
- `contenteditable`。

共享插入规则：

- 有网页选区 → 只替换该选区；
- 有折叠 caret → 插入 caret；
- 无法恢复 caret 但目标唯一可靠 → 插入末尾并返回明确 placement；
- 多个候选且无法确定目标 → 失败，不猜测；
- 永不自动 submit/send。

要求：

- Adapter 只接收/定位 DOM，不理解 PromptDocument Schema；
- Compiler 决定输出字符串，Adapter 不决定格式；
- 站点 Adapter 不复制通用输入写入算法；
- 网站 DOM 变化只能影响目标网页桥，不得破坏 Editor/Storage。

## 5. 状态源

V1 状态分类：

### 持久正文状态

`PromptDocument`

它是唯一正文权威源。

### 持久扩展偏好

例如：

- AI enabled；
- Provider；
- Model；
- API Base URL；
- credential；
- 默认 AI 内容范围；
- UI preferences。

扩展偏好不是 Prompt 内容，不得进入 Compiler 或 PromptDocument 导入导出。

### 可派生临时状态

- 当前编译预览；
- lint findings；
- AI suggestions；
- 当前选区；
- 当前网页 Adapter 状态；
- UI 展开/收起等展示状态。

派生状态不得反向成为正文权威来源。

## 6. 自动保存与热路径

自动保存以 PromptDocument 变化为输入，通过单一保存调度入口调用 Repository。

必须考虑：

- 高频输入防抖；
- Side Panel 关闭前已有保存请求的完成状态；
- 保存失败可见；
- 并发保存顺序，避免旧版本覆盖新版本。

AI 配置的保存与正文自动保存是两个不同语义，不得共用一份对象或 revision。

默认编辑热路径必须避免无意义工作：

- 自动保存成功后，本地文档列表用已知 PromptDocument 增量更新，不为每次输入重新读取全部 Storage；
- Preview 未打开时不预先编译 Preview 文本；
- Lint 未打开时不在每次键入后重跑本地 Lint；
- Insert 点击时只编译一次并使用单次原子网页插入消息；
- 不用重复刷新、重复保存、重复 DOM 扫描来掩盖状态问题。

## 7. Extension 边界

### Background

Background 只处理 Extension 生命周期和用户动作入口：

- 用户点击扩展图标时打开 Side Panel；
- 利用 `activeTab + scripting` 对当前标签页进行一次轻量 page bridge 预热。

不常驻监听页面正文，不保存 Prompt 内容，不演变成消息业务中枢。

### Content Script / Page Bridge

V1 不向所有网页静态常驻注入 PromptNote content script。

Page Bridge 只在明确用户动作下对当前标签页注入，并负责：

- 记录/恢复最近的可编辑目标与 contenteditable 选区；
- 选择站点特殊 Adapter 或通用 Adapter；
- 执行共享 caret insert；
- Side Panel 与网页之间的单次受控消息桥接。

Bridge 必须有重复注入 guard，避免重复注册 message listener。

不得在 Content Script 复制 Compiler、Storage、Editor 或 AI Provider 业务逻辑。

Manifest 的 `activeTab` 提供用户动作触发的临时页面访问；`scripting` 只用于按需注入 page bridge。AI Provider 的任意 Base URL 继续通过 optional host permission 单独请求，两类权限语义不得混用。

## 8. 错误处理

原则：真实失败、明确降级。

例如：

- AI 未配置 → AI 动作进入设置，但核心功能继续可用；
- AI 连接测试失败 → 显示真实 Provider 错误，不伪装已连接；
- AI 调用失败 → 保留编辑能力并显示失败；
- Adapter/Bridge 失败 → 提示用户点击目标输入框/重新授权当前标签页，并提供 Copy，不伪造“已插入”；
- Storage 保存失败 → 明确未保存；
- 未知 PromptDocument schemaVersion → 拒绝静默加载并给出可恢复提示。

禁止静默异常、假成功、无边界默认值。

## 9. 测试边界

V1 优先：

- Schema / Compiler 单元测试；
- PromptSection TipTap 行为测试；
- Repository 与 preferences 聚焦测试；
- AI Provider adapter / connection test 的错误归一化测试；
- AI suggestion 接受、拒绝、过期 revision 测试；
- 通用 textarea / selection / contenteditable caret fixture；
- 站点特殊 Adapter 的 DOM 发现 fixture；
- 一个真实浏览器端到端主链测试。

普通改动优先跑静态检查和直接相关测试；不因小改动重复执行高成本全量验证。

## 10. 架构变更规则

出现以下情况必须先更新架构/决策文档，再改代码：

- 新增后端；
- 新增第二种正文持久化；
- 修改 PromptDocument 权威源；
- 新增模型专用 Prompt 状态；
- 改变 AI Provider 或 credential 的存储边界；
- 改变 Web Adapter 责任；
- 引入新的框架级依赖；
- 跨模块职责迁移。

替代旧实现时必须迁移全部真实调用方并删除旧链，不保留无明确外部兼容需求的新旧双轨。
