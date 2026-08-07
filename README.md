# PromptNote / 提词笺

> 像写文档一样写 Prompt。

PromptNote 是一个 **manual-first、syntaxless、rich-text** 的 Prompt 编辑器。它让用户像编辑普通文档一样组织结构良好的提示词，而不要求用户学习 Markdown、XML 或 Prompt Engineering 语法。

用户始终是作者；AI 只作为可选的编辑助手，不默认接管、不整篇自动重写、不直接覆盖用户内容。

## V1 目标

V1 聚焦一条完整而简单的主链：

1. 在 Chrome / Edge 中打开 PromptNote Side Panel。
2. 使用富文本编辑器自然书写 Prompt。
3. 通过 `/` 命令插入目标、背景、约束、示例、输出格式、验收标准等结构块。
4. 可选使用 AI 做局部改写、歧义检查、结构建议或 Prompt lint。
5. 将同一份 PromptDocument 编译为 Plain Text、Markdown 或 XML。
6. 一键复制，或插入 ChatGPT / Claude / Gemini 等网页输入框。

## V1 明确不做

- Prompt Marketplace
- 团队协作与企业权限
- Agent Workflow / Agent 平台
- MCP 平台
- 模型 Playground
- A/B Test
- 云端账号体系
- 后端数据库
- Prompt 排行榜或评分社区
- 与单一模型绑定的专有编辑格式

任何新增能力如果不直接增强“写、整理、检查、编译、插入 Prompt”这条主链，默认不进入 V1。

## 权威文档

开发前按以下顺序阅读：

1. `docs/PRODUCT.md` — 产品边界与优先级
2. `docs/UX.md` — 用户体验与交互主链
3. `docs/PROMPT-DOCUMENT-CONTRACT.md` — Prompt 数据契约
4. `docs/ARCHITECTURE.md` — 技术边界与模块职责
5. `docs/DECISIONS.md` — 已确认的重要决策
6. `TASKS.md` — 唯一开发任务账本
7. `AGENTS.md` — AI 开发协作规则

权威层级：

`PRODUCT → UX → PROMPT-DOCUMENT-CONTRACT → ARCHITECTURE → DECISIONS → TASKS → code`

代码不得反向定义产品。如果实现与权威文档冲突，应先判断产品是否发生了明确变更；否则按实现缺陷处理。

## 初始技术方向

- Chrome / Edge Extension，Manifest V3
- Side Panel 作为主编辑界面
- React + TypeScript
- TipTap 作为富文本编辑器
- PromptDocument 作为唯一内容源
- 本地优先存储；V1 不要求后端
- Compiler 独立输出 Plain Text / Markdown / XML
- 各网页集成集中在 Adapter 层
- AI 辅助只返回 suggestion / diff，不直接写持久化状态

## 借鉴边界

PromptNote 不直接 Fork 现成 Prompt 平台。可以定向借鉴：

- SimplestPrompt：Chrome Side Panel、网页注入、浏览器存储方式
- TipTap / pagescms editor：富文本、Slash Menu、WYSIWYG 编辑体验
- flompt：Prompt Block 类型与 Compiler 产品思路

原则是：**借能力，不继承代码债。**
