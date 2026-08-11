# PRODUCT — PromptNote / 提词笺

本文件定义 PromptNote 当前产品定位、范围和产品原则。功能范围争议首先以本文件判断。

## 1. 产品定义

PromptNote 是一个 **manual-first、syntaxless、local-first 的文档式 Prompt 编辑器**。

它解决的问题不是“让 AI 替用户写 Prompt”，而是让用户像写普通文档一样书写、组织、检查并输出 Prompt，而不必先学习 Markdown、XML 或复杂 Prompt Engineering 语法。

一句话定位：**像写文档一样写 Prompt。**

PromptNote 的产品本体不是某一个宿主。Browser Extension 与 Desktop 都只是承载同一 Prompt 编辑核心的宿主：

```text
PromptNote Core
├─ Browser Extension Host（已交付）
└─ Windows Desktop Host（下一阶段）
```

Browser 与 Desktop 必须共享 PromptDocument、Editor、Compiler、Prompt Check 和 AI assistance 核心语义，不发展成两套平行产品。

## 2. 目标用户

面向经常使用 ChatGPT、Claude、Gemini、Codex 等 AI 工具的个人用户，尤其是：

- 需要写较长任务说明的开发者、产品或内容工作者；
- 经常需要表达约束、上下文、示例和验收条件的用户；
- 希望结构清晰，但不想维护格式语法的用户；
- 希望自己保持最终控制权，不希望 AI 自动覆盖原意的用户；
- 希望 Prompt 工具可以独立于浏览器长期驻留在电脑上的用户。

PromptNote 当前不是企业 PromptOps、模型评测或 Agent 编排平台。

## 3. 产品原则

### 用户是作者，AI 是助手

普通 AI 动作由用户主动触发，并先产生 suggestion / advisory。内联补全是唯一允许自动请求 AI 的能力，但必须由用户单独开启；ghost text 只有接受后才进入正文。

### 编辑格式与输出格式分离

用户编辑的是富文本 PromptDocument。Plain Text、Markdown、XML 是 Compiler 输出，不是独立正文副本。

### 不要求学习语法

用户可以只写自然文本。结构化能力通过视觉语义块、Slash Command 和选区操作提供。

### 结构化是可选能力，不是固定表单

目标、背景、任务、约束、示例、输出格式和验收标准等语义块可以自由混写、转换和排序。

### 本地优先

PromptNote 不依赖 PromptNote 自有账号、后端或云数据库。Browser 与 Desktop 均默认在本机保存数据；跨宿主迁移首先通过显式 JSON 导出 / 导入完成，不在 Desktop V1 引入云同步。

### 宿主不改变核心语义

Browser 与 Desktop 可以拥有不同的窗口、权限、持久化和系统集成，但不得复制或分叉 PromptDocument、Editor、Compiler、AI suggestion、inline completion 等核心业务逻辑。

### 模型中立

PromptDocument 不与单一模型绑定。Provider 差异只存在于 AI assistance / transport 层。

### 主链优先

任何新能力都应直接增强以下至少一个环节：

```text
写 → 结构化 → 检查 → 预览/编译 → 复制
```

桌面悬浮球、托盘、快捷键等属于“进入主链的宿主入口”，本身不是新的产品主链。

## 4. 当前核心能力

共享核心能力：

- TipTap / ProseMirror 富文本编辑；
- 自由文本与 Prompt 语义块混写；
- contextual Slash Command；
- SelectionActionBar；
- PromptDocument 单一正文源；
- Plain Text / Markdown / XML Compiler；
- 本地 Prompt Check；
- OpenAI-compatible / Anthropic 可选 AI；
- suggestion/advisory；
- 用户主动开启的 block-local inline completion；
- 文档管理、JSON 备份与恢复；
- Copy 作为站点无关的外部交付方式。

当前已交付宿主：

- Chrome / Edge Manifest V3 Side Panel Extension；
- `chrome.storage.local` 本地持久化；
- optional host permission 直连用户配置的 AI Provider。

下一阶段宿主：

- Windows Desktop，技术与交互权威见 `DESKTOP.md`；
- Tauri 2；
- 悬浮球 / 侧边面板 / 完整窗口 / 系统托盘 / 全局快捷键；
- 本机持久化与桌面安装包。

## 5. 默认不进入当前产品范围

除非产品决策明确改变，以下能力不应“顺便加入”：

- Prompt Marketplace、社区、排行榜；
- 团队协作、组织、RBAC；
- PromptNote 自有账号体系、后端数据库、复杂云同步；
- Agent Workflow / Agent Builder / MCP 平台；
- 模型 Playground、调用监控、成本分析、A/B Test；
- 自动整篇重写并覆盖用户原文；
- 每个模型维护一份独立 Prompt 内容；
- 第三方网页 DOM 注入、自动写入或自动发送 Prompt；
- Electron 桌面端；
- Desktop V1 中的跨设备同步、浏览器与桌面实时同步；
- Desktop V1 中的系统级划词捕获、OCR、自动读取其他应用、自动粘贴；
- Desktop V1 中的 macOS / Linux / 原生移动端。

## 6. 产品成功标准

共享成功标准：

1. 用户不懂 Markdown 也能完成结构清晰的 Prompt；
2. 用户可以从自由文本逐步增加结构，而不是被迫填固定表单；
3. 用户可以清楚区分自己的正文、AI 建议和未接受的 ghost completion；
4. Plain Text / Markdown / XML 都稳定来自同一 PromptDocument；
5. 关闭并重新打开当前宿主后正文仍能恢复；
6. AI 未配置或失败时，核心编辑、结构化、检查、预览和复制仍可用；
7. 外部交付不依赖目标网站 DOM；
8. Browser 窄 Side Panel 与 Desktop 侧边面板下核心操作都可访问；
9. Browser 与 Desktop 不产生两套不兼容的 Prompt 正文模型。

Desktop V1 的宿主级验收标准见 `DESKTOP.md`。

## 7. 范围变更规则

新增能力前必须回答：

- 它增强了哪个核心场景，还是仅改变宿主入口？
- 是否引入新的持久状态源、权限、后端、账号或系统级访问职责？
- 是否能保持 manual-first 和本地优先？
- 是否会让 Browser / Desktop 形成平行业务实现？
- 是否值得增加长期维护成本？

不能直接证明必要性的能力，默认不进入当前主线。