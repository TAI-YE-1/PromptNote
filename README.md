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
- 选中文字后固定显示的选区工具条：改清楚、缩短、拆约束、更多 AI、文本类型；
- 全局 AI：歧义检查、验收标准、结构建议；
- source revision 过期建议保护；
- 独立 opt-in 的编辑器内联补全：灰色 ghost text、Tab 接受、Esc 忽略；
- completion 可配置上下文/延迟/独立补全模型，支持 streaming-first、旧请求取消、独立网络 cadence、IME composition 抑制和 transient error 自动恢复；
- GitHub Actions：许可证审计、TypeScript、ESLint、单测、Extension build。

**Web Insert 已从 V1 删除。** PromptNote 不再向 ChatGPT/Claude/Gemini 等网页输入框注入内容，也没有 Web Adapter/content script/page bridge。外部交付统一使用 Copy。

文字旁的浮动 `•••` 选区入口也已退役。真实窄 Side Panel 测试证明它容易受 selection/focus/viewport 影响；正式交互改为底部 actionbar 上方的稳定 SelectionActionBar。

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
4. 可选选中文字并从稳定工具条直接使用局部 AI / 类型转换；
5. 可选使用 global AI suggestion；
6. 可选开启 IDE 风格内联补全；
7. 使用本地 Prompt Check，必要时显式调用 AI 深度检查；
8. 编译/预览 Plain Text、Markdown、XML；
9. Copy 到目标 AI 工具。

## 选区操作

选中文字后，PromptNote 不再尝试把微型按钮贴在文字旁。主操作栏上方会显示稳定工具条：

```text
已选 N 字    类型 [当前类型]
改清楚   缩短   拆约束   更多 AI
```

选区状态以 ProseMirror 为唯一权威。跨多个文本块选择时仍可做文本 AI 动作，但“类型转换”会禁用；不会再用浏览器 DOM selection 或屏幕坐标维护另一份选区状态。

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

- 光标停顿到用户配置的触发延迟后，可出现灰色 ghost text；默认 300ms，可选 150/300/600ms 或自定义 50–3000ms；
- “停顿多久”只决定何时具备请求资格，真实 Provider 请求另有独立最小间隔，避免较长句子中多个自然停顿形成请求风暴；
- 中文、日文等输入法仍在组词/composition 时不会触发补全，输入法提交稳定正文后才重新建立 context；
- 当前块上下文默认 320 字符，可选 160/320/640 或自定义 16–2000；实际值从设置显式贯穿 Editor；
- caret 位于块首、块中、块尾时都使用当前 text block 的局部 before/after 上下文，不跨语义块拼正文；
- Provider 支持 streaming 时，首批有效文本尽快显示；连续 partial 在短窗口合并 UI 刷新，避免每个 token 重渲染整页；
- 可单独指定低延迟“补全模型”，留空沿用主 Model；
- `Tab` 接受；
- `Esc` 忽略；
- 继续输入、移动光标、切块或改变 context budget 会使旧补全和旧 retry 失效；
- 短时 429、5xx、timeout 或网络抖动会在原 caret/context 仍有效时有限次自动退避恢复，并尊重 Provider 的 `Retry-After`；
- 单次短时错误不会立即弹“AI 补全暂不可用”；连续自动恢复失败后才升级提示；
- 认证、配置、额度/配额耗尽等持久错误不会无限重试，会保留真实错误供 AI 设置检查；
- ghost text 不属于 PromptDocument，不自动保存、不进入 Compiler；
- 只有接受后才成为真实正文。

修改 Provider / Model / Base URL / API Key 会使原连接状态和补全开关失效，需要重新确认配置。

## AI 与隐私边界

- API Key 与 PromptDocument 分离，保存在扩展本地设置；
- `chrome.storage.local` 不是加密保险库；
- 普通 selection/global AI 动作只有用户显式触发时才发送内容；
- 只有用户额外开启补全后，编辑停顿且不处于 IME composition 时才可能自动请求短 continuation；
- 补全只使用当前 text block 内、受用户 context budget 限制的局部上下文；
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
- Repository 恢复当前文档时批量读取 documents/current id，并拒绝旧 revision 覆盖新 revision；
- 检查关闭时不每次键入运行 lint；
- Preview 关闭时不每次键入编译；
- ghost decoration 不触发正文保存；
- completion 的 idle debounce 与真实网络 cadence 分离；IME composition 不请求；旧 request/retry 可取消；
- transient Provider failure 使用有限指数退避，persistent failure 不无限重试；
- streaming partial 约每 48ms 合并 UI 刷新；
- streaming capability 按 Provider + endpoint + completion model 隔离且缓存有界，并兼容 SSE keep-alive；
- AI Settings 与本地 Prompt Sheet 只有打开时才 lazy-load；
- 不存在网页 bridge/content script 常驻开销。

AI / Document Sheet 已拆为独立按需 chunk；TipTap / React 主编辑器 chunk 仍有 `>500KB` 构建 warning。PromptNote 不通过调高 Vite warning limit 掩盖它，是否进一步拆 TipTap 以真实启动性能为准。

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
