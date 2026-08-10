# PromptNote / 提词笺

> 像写文档一样写 Prompt。

PromptNote 是一个 **manual-first、syntaxless、rich-text** 的 Prompt 编辑器。用户像编辑普通文档一样组织提示词，不需要学习 Markdown、XML 或 Prompt Engineering 语法。

用户始终是作者。普通 AI 编辑动作只产生可接受/忽略的建议；只有用户另外开启“编辑器内联补全”后，才会出现 IDE 风格的灰色续写。

## 当前实现状态

PromptNote V1 已完成实现与真实浏览器验收。发布说明与已知限制见 `docs/RELEASE-NOTES-V1.md`。

当前真实 Extension 已实现：

- Manifest V3 + Chrome / Edge Side Panel；
- React + TypeScript + TipTap / ProseMirror；
- 单一 `promptSection.kind` 语义块模型与 contextual `/` Slash Menu；
- Slash Menu 支持方向键、Home/End、Enter、Esc；URL、日期、`A/B` 等普通正文中的 `/` 不会被错误拦截；
- 普通段落 ↔ 语义块无损转换与常态可见块边界；
- `PromptDocument` 唯一正文源；
- `chrome.storage.local` 自动保存、文档列表、新建/切换/删除；
- PromptDocument JSON 备份/恢复；**同 ID 显式覆盖会生成合法更新 revision，不会被防回退规则静默拒绝**；
- 同 ID 外部内容替换可立即同步到当前 TipTap Editor，本地普通键入不会反复整文档 `setContent()`；
- autosave 的“已保存/未保存”只由当前最新 document id + revision 对应的异步结果更新，旧 revision 晚到 callback 不得误报；
- Plain Text / Markdown / XML Compiler 与只读 Preview；
- 本地 deterministic Prompt lint；
- OpenAI-compatible / Anthropic Provider；
- 稳定 `SelectionActionBar`；旧 `SelectionContextMenu` 实现与兼容 alias 均已退役；
- 全局 AI：歧义检查、验收标准、结构建议；
- source revision 过期建议保护；
- 独立 opt-in 编辑器内联补全：ghost text、Tab 接受、Esc 忽略；
- completion 可配置上下文/延迟/独立模型，支持 streaming-first、旧请求取消、独立网络 cadence、IME suppression 和 transient recovery；
- 预存长文本补全按局部 caret context 读取，不为了发送有限上下文 materialize 整个已有 block；
- Provider 流式兼容以实际 response body 为准，可处理 `text/plain` SSE、误标成 `text/event-stream` 的普通 JSON，以及可恢复的 response body 读取中断；
- 根级 Runtime Error Boundary：运行时异常应显示真实错误与“重新打开”，不得再次无信息整页白屏；
- GitHub Actions：许可证审计、TypeScript、ESLint、单测、Extension build。

**Web Insert 已从 V1 删除。** PromptNote 不再向 ChatGPT/Claude/Gemini 等网页输入框注入内容，也没有 Web Adapter/content script/page bridge。外部交付统一使用 Copy。

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

AI 自定义 Base URL 使用 optional host permission，按实际 Provider origin 请求。PromptNote 不需要 `activeTab`、`scripting` 或第三方网页 DOM 权限。

## V1 主链

1. 打开 PromptNote Side Panel；
2. 自然书写 Prompt；
3. 在块/行首或空白后使用 `/` 打开结构菜单，插入目标、背景、任务、约束、示例、输出格式、验收标准等语义块；普通 URL、日期、路径和 `A/B` 中的 `/` 仍是普通字符；
4. 可选选中文字并从 SelectionActionBar 使用局部 AI / 类型转换；
5. 可选使用 global AI suggestion；
6. 可选开启 IDE 风格内联补全；
7. 使用本地 Prompt Check，必要时显式调用 AI 深度检查；
8. 编译/预览 Plain Text、Markdown、XML；
9. Copy 到目标 AI 工具。

## 保存、备份与恢复

正文编辑后 450ms 防抖自动保存。Repository 对同一 Prompt 使用 revision 单调保护，更旧 revision 不会覆盖更新 revision。

顶部保存状态还有第二层约束：一次异步保存完成后，只有它保存的 document id + revision 仍然就是当前编辑版本，才允许显示“已保存”或“未保存”。因此快速连续输入时，旧 revision 的晚到成功不会把仍未持久化的新正文误标为已保存，旧失败也不会污染已经继续编辑的新 revision。

电脑 JSON 备份与浏览器自动保存是两件事。恢复同 ID 备份时：

- 选择“覆盖” → 导入文档 revision 提升到 `max(本地 revision, 备份 revision) + 1`，再经过同一个 Repository 正常保存；
- 选择“不覆盖” → 生成新 id，作为独立导入副本保存；
- 即使选择覆盖后 document id 没变，当前 Editor 也会立即显示导入内容；普通本地输入不会因此每次重灌整个 TipTap 文档。

## 选区操作

选中文字后，主操作栏上方显示稳定工具条：

```text
已选 N 字    类型 [当前类型]
改清楚   缩短   拆约束   更多 AI
```

选区状态以 ProseMirror 为唯一权威。跨多个文本块选择时仍可做文本 AI 动作，但类型转换禁用。旧文字旁 `•••` 和 `SelectionContextMenu` 命名均不再保留。

## 内联补全

只有以下条件全部成立时才会自动请求短续写：

```text
AI 已配置成功
AND AI 辅助已启用
AND 编辑器内联补全已开启
```

补全开关默认关闭。

开启后：

- 光标停顿到配置延迟后可出现灰色 ghost；默认 300ms，可选 150/300/600ms 或自定义 50–3000ms；
- 之前已经写好的文本也可以补全；把 caret 放到旧文本的块首/中/尾即可；
- 当前块上下文默认 320 字符，可选 160/320/640 或自定义 16–2000；该值同时限制发送内容和 Editor 读取局部范围；
- 不跨语义块拼正文；
- 持续输入的 debounce 与真实 Provider 请求 cadence 分开；IME composition 不触发请求；
- Provider 支持 streaming 时首批有效文字尽快显示，partial 做短窗口合并；
- streaming/non-streaming 从实际 body 识别，不只相信 `Content-Type`；
- 可单独指定低延迟补全模型；
- `Tab` 接受，`Esc` 忽略；
- 新输入、移动 caret、切块、context budget、focus/composition 变化使旧补全失效；
- transient 429/5xx/timeout/transport/body-read interruption 在原 context 有效时有限退避恢复并尊重 `Retry-After`；
- persistent auth/config/quota error 不无限重试，也不给新 context 人为 30 秒 cooldown；
- 真正失败显示长度受控的 Provider 原因，后续成功会清 stale AI error；
- 相同成功 context 的短缓存命中直接恢复 ghost；
- 补全设置失效直接依赖稳定 `AiSettings` 对象 identity，不再每次 render 拼接包含 API Key 的复合字符串；
- ghost 不属于 PromptDocument，不自动保存、不进入 Compiler。

## AI 与隐私边界

- API Key 与 PromptDocument 分离，保存在扩展本地设置；
- `chrome.storage.local` 不是加密保险库；
- 普通 selection/global AI 动作只有用户显式触发时才发送内容；
- 只有用户额外开启补全后，稳定 caret 才可能自动请求短 continuation；
- 补全只读取/发送当前 text block 受 context budget 限制的局部上下文；
- AI 未配置、关闭或失败不影响编辑、保存、本地 lint、Compiler、Preview、Copy；
- AI Provider 网络错误和 30 秒请求超时不会伪装成功。

## Copy 与 Preview

编辑页底部：

```text
检查      预览      复制
```

编辑页“复制”固定复制 Plain Text。Preview 可以显式选择 Plain / Markdown / XML 并复制当前格式。

## 性能策略

默认热路径持续做代码减法：

- autosave 使用已知 PromptDocument 增量更新列表，不整库重读；文档列表更新保持 revision 单调并线性插入，不在每次 autosave 全量 `.sort()`；
- Repository 批量恢复 documents/current id 并拒绝旧 revision 覆盖新 revision；
- 旧 autosave callback 无权修改新 revision 的保存状态；
- 检查关闭时不每键运行 lint，Preview 关闭时不每键编译；
- Editor 自身输入与外部同 ID 替换用 object identity 区分，不每键 stringify 全文；
- 预存长 block completion context 先按 caret/budget 限窗，再 `textBetween()`；
- completion cache hit 在 prompt/provider/request 构造前返回；
- completion settings 直接用不可变对象 identity，不构造 credential identity string；
- idle debounce 与 network cadence 分离，IME composition 不请求；
- streaming partial 约每 48ms 合并刷新；
- AI Settings / Document Sheet 仍按需加载；
- **PromptEditor 同步打包并由 App 直接 import。**

2026-08-08 的真实 Chrome 反馈显示：把 TipTap/ProseMirror `PromptEditor` 拆成运行时 `React.lazy + dynamic import()` 后，Side Panel 会先短暂正常显示约 0.1 秒，随后整页白屏。CI/typecheck/build 均无法捕获这个浏览器运行时回归。因此该拆包已撤销，`LazyPromptEditor` wrapper 也已删除。D023 supersede D022 中仅与 Editor runtime lazy split 有关的决定。

当前生产构建主 Side Panel bundle 约：

```text
sidepanel ≈ 620 kB / gzip ≈ 196 kB
```

`>500KB` Vite warning 明确保留。**不得通过调整 `chunkSizeWarningLimit` 掩盖；也不得在没有新的 Chrome + Edge 真机验证方案前重新引入 PromptEditor runtime lazy split。** 性能优化继续优先从真实热路径、依赖与可验证启动瓶颈入手。

## V1 真实浏览器验收

V1 已完成以下真实浏览器验证：

1. Chrome Side Panel 可持续稳定打开和编辑，不再出现“正常约 0.1 秒 → 白屏”；
2. 快速连续输入后保存状态只对应最新正文；
3. 导出 → 同 ID 导入 → 选择覆盖后，Editor 立即切换到备份内容，关闭/重开和浏览器重启后仍一致；
4. 预存长文本 caret completion、中文 IME 持续输入、Tab/Esc、stale cancellation、错误恢复可用；
5. AI 未配置、禁用、错误/超时情况下核心编辑链仍可用，关闭补全后不自动请求；
6. Chrome 当前 Side Panel 真机可缩到约 382px，布局和核心操作仍可用；
7. contextual Slash 的方向键/Enter/Esc 与普通 `/` 输入均通过；
8. Edge 当前 Manifest / 主链 smoke 通过。

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

权威层级：`PRODUCT → UX → PROMPT-DOCUMENT-CONTRACT → ARCHITECTURE → DECISIONS → TASKS → code`

## 借鉴边界

PromptNote 不直接 Fork 现成 Prompt 平台。原则：**借能力，不继承代码债。**
