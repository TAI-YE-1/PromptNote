# PromptNote / 提词笺

> 像写文档一样写 Prompt。

PromptNote 是一个 **manual-first、syntaxless、rich-text** 的 Prompt 编辑器。它让用户像编辑普通文档一样组织结构良好的提示词，而不要求用户学习 Markdown、XML 或 Prompt Engineering 语法。

用户始终是作者；AI 只作为显式触发的可选编辑助手，不默认接管、不整篇自动重写、不直接覆盖用户内容。

## 当前实现状态

仓库已经进入真实 Chrome / Edge Extension 实现阶段，不再只是 HTML 原型。

当前已经实现：

- Manifest V3 + Side Panel；
- React + TypeScript + TipTap 富文本编辑器；
- 单一 `promptSection.kind` 语义块模型；
- `/` Slash Menu；
- `PromptDocument` 唯一正文源；
- `chrome.storage.local` 本地保存、文档列表、新建/切换/删除；
- PromptDocument JSON 导入/导出；
- Plain Text / Markdown / XML Compiler 与只读 Preview；
- 本地 deterministic Prompt lint；
- OpenAI-compatible / Anthropic AI Provider 适配；
- AI Provider / Model / Base URL / API Key / 发送范围设置；
- 选区 AI：改清楚、缩短、拆成约束；
- 全局 AI：歧义检查、验收标准建议、结构建议；
- source revision 过期建议保护；
- 第一个 ChatGPT Web Adapter：探测输入框、追加/替换、冲突提示、失败退化为 Copy；
- GitHub Actions：TypeScript、ESLint、单测、Extension build。

尚未把 V1 标记为完成。真实 Chrome / Edge 手工加载、浏览器重启恢复、ChatGPT 当前线上 DOM 端到端、窄宽度/键盘可达性等仍需真实浏览器验收。以 `TASKS.md` 为唯一完成度账本。

## 本地开发

要求：Node.js 22。

```bash
npm install
npm run typecheck
npm run lint
npm test
npm run build
```

构建结果输出到 `dist/`。

### Chrome 本地加载

1. 打开 `chrome://extensions`；
2. 开启“开发者模式”；
3. 选择“加载已解压的扩展程序”；
4. 选择本项目构建后的 `dist/` 目录；
5. 点击 PromptNote 扩展图标打开 Side Panel。

### Edge 本地加载

1. 打开 `edge://extensions`；
2. 开启“开发人员模式”；
3. 选择“加载解压缩的扩展”；
4. 选择构建后的 `dist/` 目录。

## V1 主链

1. 在 Chrome / Edge 中打开 PromptNote Side Panel。
2. 使用富文本编辑器自然书写 Prompt。
3. 通过 `/` 插入目标、背景、任务、约束、示例、输出格式、验收标准等结构块。
4. 可选使用 AI 做局部改写或全局建议；结果先显示 suggestion，由用户接受后才改正文。
5. 使用本地 Prompt Check，必要时再显式触发 AI 深度检查。
6. 将同一份 PromptDocument 编译为 Plain Text、Markdown 或 XML。
7. 复制结果，或在支持的网站中显式插入；不会自动发送消息。

## AI 与隐私边界

- AI 未配置或被关闭时，编辑、保存、本地 lint、Compiler、Copy 与 Web Insert 仍可工作；
- API Key 与 PromptDocument 分离，保存在扩展本地设置中；
- `chrome.storage.local` 是浏览器本地存储，不应被视为加密保险库；
- 只有用户明确触发 AI 动作时才发送所需内容；
- 自定义 AI Base URL 使用 Chrome optional host permission，按实际配置的 origin 请求权限；
- AI 请求设置可见超时与错误，不伪造成功。

## 当前网页支持

第一个 Adapter 为 ChatGPT：

- `chatgpt.com`
- `chat.openai.com`

当前代码不会自动点击发送；输入框已有内容时，用户必须明确选择追加或替换。

Claude / Gemini 等站点只有在 ChatGPT Adapter 真实浏览器验证稳定后才进入后续实现，避免复制脆弱 DOM 逻辑。

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

任何新增能力如果不直接增强“写、整理、检查、编译、复制/插入 Prompt”这条主链，默认不进入 V1。

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

## 借鉴边界

PromptNote 不直接 Fork 现成 Prompt 平台。可以定向借鉴：

- SimplestPrompt：Chrome Side Panel、网页注入、浏览器存储方式；
- TipTap / pagescms editor：富文本、Slash Menu、WYSIWYG 编辑体验；
- flompt：Prompt Block 类型与 Compiler 产品思路。

原则是：**借能力，不继承代码债。**
