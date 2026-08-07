# PromptNote / 提词笺

> 像写文档一样写 Prompt。

PromptNote 是一个 **manual-first、syntaxless、rich-text** 的 Prompt 编辑器。用户像编辑普通文档一样组织提示词，不需要学习 Markdown、XML 或 Prompt Engineering 语法。

用户始终是作者。普通 AI 编辑动作只产生可接受/忽略的建议；只有用户另外开启“编辑器内联补全”后，才会出现 IDE 风格的灰色续写。

## 当前实现状态

当前真实 Extension 已实现：

- Manifest V3 + Chrome / Edge Side Panel；
- React + TypeScript + TipTap / ProseMirror；
- 单一 `promptSection.kind` 语义块模型；
- `/` Slash Menu；
- 普通段落 ↔ 语义块无损转换；
- 常态可见的语义块边界与标签；
- `PromptDocument` 唯一正文源；
- `chrome.storage.local` 自动保存、文档列表、新建/切换/删除；
- PromptDocument JSON 备份/恢复；
- Plain Text / Markdown / XML Compiler 与只读 Preview；
- 本地 deterministic Prompt lint；
- OpenAI-compatible / Anthropic Provider；
- 选区 AI：改清楚、缩短、拆成约束；
- 全局 AI：歧义检查、验收标准、结构建议；
- source revision 过期建议保护；
- 独立 opt-in 的编辑器内联补全：灰色 ghost text、Tab 接受、Esc 忽略；
- completion 防抖、旧请求取消、短请求与失败退避；
- GitHub Actions：许可证审计、TypeScript、ESLint、单测、Extension build。

**Web Insert 已从 V1 删除。** PromptNote 不再向 ChatGPT/Claude/Gemini 等网页输入框注入内容，也没有 Web Adapter/content script/page bridge。外部交付统一使用 Copy。

V1 尚未标记完成；最终 Chrome / Edge、真实 AI 补全、浏览器重启恢复、异常降级和发布文档仍以 `TASKS.md` 为准。

## 本地开发

要求 Node.js 22：

```bash
npm ci
npm run typecheck
npm run lint
npm test
npm run build
```

构建输出：`dist/`。

### Chrome

1. 打开 `chrome://extensions`；
2. 开启开发者模式；
3. “加载已解压的扩展程序”；
4. 选择 `dist/`；
5. 点击 PromptNote 扩展图标打开 Side Panel。

### Edge

1. 打开 `edge://extensions`；
2. 开启开发人员模式；
3. “加载解压缩的扩展”；
4. 选择 `dist/`；
5. 点击 PromptNote 扩展图标打开 Side Panel。

当前固定 Manifest 权限只有：

```text
storage
sidePanel
```

AI 自定义 Base URL 使用 optional host permission，按实际 Provider origin 请求。PromptNote 不再需要 `activeTab`、`scripting` 或第三方网页 DOM 权限。

## V1 主链

1. 打开 PromptNote Side Panel；
2. 自然书写 Prompt；
3. 使用 `/` 插入目标、背景、任务、约束、示例、输出格式、验收标准等语义块；
4. 可选使用 selection/global AI suggestion；
5. 可选开启 IDE 风格内联补全；
6. 使用本地 Prompt Check，必要时显式调用 AI 深度检查；
7. 编译/预览 Plain Text、Markdown、XML；
8. Copy 到目标 AI 工具。

## 内联补全

补全不是 AI 总开关的默认行为。

只有以下条件全部成立时才会自动请求短续写：

```text
AI 已配置成功
AND AI 辅助已启用
AND 编辑器内联补全已开启
```

补全开关默认关闭。

开启后：

- 光标停顿约 750ms 后可出现灰色 ghost text；
- `Tab` 接受；
- `Esc` 忽略；
- 继续输入或移动光标会使旧补全失效；
- 过期请求会取消；
- Provider 失败后会退避，不连续刷请求；
- ghost text 不属于 PromptDocument，不自动保存、不进入 Compiler；
- 只有接受后才成为真实正文。

修改 Provider / Model / Base URL / API Key 会使原连接状态和补全开关失效，需要重新确认配置。

## AI 与隐私边界

- API Key 与 PromptDocument 分离，保存在扩展本地设置；
- `chrome.storage.local` 不是加密保险库；
- 普通 selection/global AI 动作只有用户显式触发时才发送内容；
- 只有用户额外开启补全后，编辑停顿才会自动请求短 continuation；
- 补全只使用 caret 前有限上下文；
- AI 未配置、关闭或失败不影响编辑、保存、本地 lint、Compiler、Preview、Copy；
- AI Provider 网络错误和 30 秒超时不会伪装成功。

## Copy 与 Preview

编辑页底部只保留：

```text
检查      预览      复制
```

编辑页“复制”固定复制 Plain Text，避免 Preview 里曾选过 Markdown/XML 后产生不可见格式状态。

Preview 可以显式选择 Plain / Markdown / XML，并复制当前格式。

## 性能策略

默认编辑热路径避免无意义工作：

- 450ms autosave 后用已知 PromptDocument 增量更新文档列表，不整库重读；
- 检查关闭时不每次键入运行 lint；
- Preview 关闭时不每次键入编译；
- ghost decoration 不触发正文保存；
- completion 采用 750ms 防抖、Abort 旧请求、短 token 上限和失败退避；
- 不存在网页 bridge/content script 常驻开销。

TipTap / React 主 Side Panel bundle 仍有约 600KB 级 minified chunk 的已知优化空间；不通过调高 Vite warning limit 掩盖。是否 code splitting 以真实启动性能为准。

## V1 明确不做

- Prompt Marketplace / 社区 / 排行榜
- 团队协作与企业权限
- Agent Workflow / MCP 平台
- 模型 Playground / A-B Test
- 云端账号体系 / 后端数据库 / 云同步
- 与单一模型绑定的专有编辑格式
- 第三方网页 DOM 注入 / Web Adapter / 自动写入输入框
- 自动发送/提交 Prompt

任何新增能力如果不能直接增强“写、整理、检查、编译、复制”，默认不进入 V1。

## 权威文档

开发前按顺序阅读：

1. `docs/PRODUCT.md`
2. `docs/UX.md`
3. `docs/PROMPT-DOCUMENT-CONTRACT.md`
4. `docs/ARCHITECTURE.md`
5. `docs/DECISIONS.md`
6. `TASKS.md`
7. `AGENTS.md`

权威层级：

`PRODUCT → UX → PROMPT-DOCUMENT-CONTRACT → ARCHITECTURE → DECISIONS → TASKS → code`

## 借鉴边界

PromptNote 不直接 Fork 现成 Prompt 平台。可定向借鉴 TipTap 等编辑器体验和 flompt 的 Prompt Block/Compiler 产品思路。

原则：**借能力，不继承代码债。**
