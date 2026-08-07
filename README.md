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
- 通用网页插入：标准 `input / textarea / contenteditable` 按当前选区或光标位置插入；
- ChatGPT 特殊 Adapter 只保留必要的输入框 selector 兼容；
- 用户点击扩展图标时使用 `activeTab + scripting` 按需注入轻量网页 bridge，不向所有网页常驻 Content Script；
- GitHub Actions：许可证审计、TypeScript、ESLint、单测、Extension build。

尚未把 V1 标记为完成。新的 caret-first 通用插入链、浏览器重启恢复、AI 全异常降级、最终 Chrome / Edge 主链与键盘可达性仍需真实浏览器收口。以 `TASKS.md` 为唯一完成度账本。

## 本地开发

要求：Node.js 22。

```bash
npm ci
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
5. 在目标网页点击 PromptNote 扩展图标打开 Side Panel；该明确用户动作同时为当前标签页授予临时 `activeTab` 访问并预热网页插入 bridge。

### Edge 本地加载

1. 打开 `edge://extensions`；
2. 开启“开发人员模式”；
3. 选择“加载解压缩的扩展”；
4. 选择构建后的 `dist/` 目录；
5. 在目标网页点击 PromptNote 扩展图标打开 Side Panel。

## V1 主链

1. 在 Chrome / Edge 中打开 PromptNote Side Panel。
2. 使用富文本编辑器自然书写 Prompt。
3. 通过 `/` 插入目标、背景、任务、约束、示例、输出格式、验收标准等结构块。
4. 可选使用 AI 做局部改写或全局建议；结果先显示 suggestion，由用户接受后才改正文。
5. 使用本地 Prompt Check，必要时再显式触发 AI 深度检查。
6. 将同一份 PromptDocument 编译为 Plain Text、Markdown 或 XML。
7. 复制结果，或把结果插入当前网页的文本输入位置；不会自动发送消息。

## AI 与隐私边界

- AI 未配置或被关闭时，编辑、保存、本地 lint、Compiler、Copy 与 Web Insert 仍可工作；
- API Key 与 PromptDocument 分离，保存在扩展本地设置中；
- `chrome.storage.local` 是浏览器本地存储，不应被视为加密保险库；
- 只有用户明确触发 AI 动作时才发送所需内容；
- 自定义 AI Base URL 使用 Chrome optional host permission，按实际配置的 origin 请求权限；
- AI 请求设置可见超时与错误，不伪造成功。

## 网页插入

PromptNote 的默认插入心智与普通“粘贴”一致，而不是按网站维护一套“追加/替换整个输入框”的流程：

- 输入框存在选中文字 → 只替换当前选区；
- 输入框存在光标 → 插入到当前光标；
- 空输入框 → 直接插入；
- 能确定目标但无法恢复光标 → 退化到输入框末尾并明确提示；
- 无法确定目标输入框 → 提示先点击目标输入框，不猜测、不覆盖；
- 永远不会自动点击发送/提交。

通用能力覆盖标准 `input / textarea / contenteditable`。站点 Adapter 只负责确有必要的特殊 DOM 发现，例如 ChatGPT 当前优先识别 `#prompt-textarea`；插入算法只有共享的一份。

PromptNote 不向所有网页常驻 Content Script。用户点击扩展图标后，Extension 使用 `activeTab + scripting` 对当前标签页临时注入轻量 bridge；这和 AI Provider 使用的 optional host permission 是两个不同权限边界。

## 性能策略

默认编辑热路径避免无意义工作：

- 450ms 自动保存后直接用已知 PromptDocument 增量更新文档列表，不再每次重新读取整个 Storage；
- “检查”未打开时不在每次键入后运行本地 lint；
- “预览”未打开时不在每次键入后编译预览字符串；
- 正常 Web Insert 使用一次原子消息完成定位与插入，不先查询再第二次写入；
- 网页 bridge 按用户动作注入，不在所有页面长期运行。

当前 TipTap / React Side Panel 生产 bundle 仍有约 600KB 级别的 minified 主 chunk；这是已知的构建体积优化空间，不通过提高 Vite warning limit 掩盖。是否进一步 code splitting 应以真实 Side Panel 启动性能为依据。

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
