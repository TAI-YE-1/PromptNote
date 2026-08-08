# AGENTS — PromptNote 开发协作规则

本文件约束所有参与 PromptNote 开发的 AI / Agent / Codex 工作方式。目标是防止产品漂移、重复实现、状态源分裂和历史代码堆积。

## 1. 开发前必须阅读

按顺序：

1. `docs/PRODUCT.md`
2. `docs/UX.md`
3. 当前阶段若为 P0.5，额外阅读 `docs/PROTOTYPE.md`
4. `docs/PROMPT-DOCUMENT-CONTRACT.md`
5. `docs/ARCHITECTURE.md`
6. `docs/DECISIONS.md`
7. `TASKS.md`
8. 真实代码、配置、测试与当前调用链

`README.md` 只用于快速入口。

权威层级：

```text
PRODUCT
  ↓
UX
  ↓
PROTOTYPE（仅 P0.5）
  ↓
PROMPT-DOCUMENT-CONTRACT
  ↓
ARCHITECTURE
  ↓
DECISIONS
  ↓
TASKS
  ↓
code
```

代码不能因为“已经这样写了”反向定义产品。

## 2. V1 开发范围

V1 只围绕：

**写 → 整理 → 检查 → 编译 → 复制**

允许的 AI 增强包括显式 suggestion/lint，以及用户单独 opt-in 的编辑器内联补全。

PRODUCT Non-goals 不得顺手加入，尤其禁止：

- 后端、账号、云数据库；
- Prompt Marketplace / 社区 / 排行榜；
- 团队权限；
- Agent Workflow / MCP 平台；
- 模型 Playground / A-B Test；
- 云同步；
- 第三方网页 DOM 注入、Web Adapter、自动写入网页输入框；
- 自动发送/提交 Prompt。

D017 已明确退役 Web Insert。不得重新加入 `activeTab`、`scripting`、content script、page bridge 或站点 Adapter 来恢复该能力，除非先修改 PRODUCT 与 DECISIONS。

D018 已明确退役文字旁微型 `•••` 选区入口。不得重新用 `window.getSelection()`、viewport rect、`coordsAtPos` 浮动坐标或另一套 DOM selection 状态恢复它；选区操作入口固定为 Side Panel 主 actionbar 上方的稳定 SelectionActionBar。

D020 已明确把 completion idle debounce 与真实 Provider cadence 分开。不得通过继续缩短 debounce、隐藏错误 toast 或堆第二套缓存来“提高补全灵敏度”；持续输入场景先审查 IME composition、network cadence、stale request、Retry-After 和 transient/persistent error classification。

**D021 明确区分“刚输入的长文本”和“早已存在的长文本”。** 用户已经说明文本是预存内容时，禁止自动把问题归因到 typing request storm / IME。应先审查：context 读取复杂度 → caret/focus identity → Provider 实际响应 body → stale error / cache / ghost 生命周期。

## 3. 真实项目优先

涉及以下内容必须读取仓库真实定义，不得猜测：

- 文件路径、函数、类型；
- Schema、section kind；
- Manifest 权限；
- Chrome API；
- 依赖版本；
- 测试命令与 CI 结果；
- Provider 请求与真实响应格式；
- TipTap/ProseMirror transaction / focus / composition 行为。

用户提供的关键事实属于诊断前提。例如用户明确说“这段文字以前就写好了”，后续分析必须以预存文本场景为前提，不得继续沿“刚连续输入很多字”的假设执行。

未执行的验证不得描述为已通过。

## 4. PromptDocument 是唯一正文源

必须遵守：

- PromptDocument / TipTap JSON 是唯一持久正文；
- Markdown/XML/Plain 只由 Compiler 派生；
- AI suggestion 不是正文；
- ghost completion 不是正文；
- lint finding 不是正文；
- 不创建模型专用 Prompt 副本；
- 不同时维护 localStorage / IndexedDB / Chrome Storage 多份正文。

ghost completion 只有用户按 `Tab` 接受并通过真实 Editor transaction 写入后，才成为正文并进入 revision/autosave。

## 5. Schema / 契约变化

字段、顺序、枚举、Node、Schema、输出契约变化时必须：

1. 搜索权威定义；
2. 搜索所有调用方；
3. 搜索测试、配置、导入导出、文档；
4. 判断兼容需求；
5. 先更新 Contract；
6. 修改唯一权威定义；
7. 迁移真实调用方；
8. 删除旧字段/旧定义；
9. 反向搜索残留；
10. 更新聚焦测试。

禁止在实现和测试里各自维护 section kind、schemaVersion、输出格式等平行列表。

## 6. 代码必须优雅、干净，并优先根因修复

“能跑”不是完成标准。代码必须职责清楚、状态单一、调用链直接、可读，并持续删除被替代复杂度。

原则上禁止：

- `new` / `v2` / `fixed` 平行实现；
- 大量 if/else 掩盖职责混乱；
- 复制相似函数、组件、状态或样式；
- 同一交互由多套状态源/定位逻辑控制；
- 连续叠 CSS override、`!important` 或后置补丁；
- 无价值 wrapper / adapter / service；
- 静默异常、假成功、默认值吞错；
- 重复刷新、重复保存、重复同步来掩盖状态问题；
- 注释旧代码代替删除；
- 保留无真实调用方的旧组件、函数、CSS、状态、测试；
- 只改测试迁就错误实现。

发现旧代码不符合要求时，应在任务允许范围内：定位根因 → 明确唯一职责/状态 → 迁移调用方 → 删除旧链 → 补测试 → 反向搜索。

如果问题需要第二层、第三层 UI/CSS/状态补丁，应停止补丁式修复并重新检查组件边界。

每个任务包结束前必须做一次代码减法审查。

## 7. 模块职责

### `prompt/`

权威 Schema、section kind、Compiler 和纯逻辑。不得依赖 React、Chrome API、AI Provider。

### `editor/`

TipTap、Slash Menu、语义块、编辑命令、selection、ghost completion decoration。

不得直接访问 Storage 或 Provider。Ghost Extension 只负责展示/接受/忽略/失效，不负责发请求。

选区业务状态只能从 ProseMirror EditorState 派生：selected text、from/to、single-block format。不得把 DOM selection 或屏幕坐标当第二状态源。跨块 selection 的 block format 为 `null`，禁止类型转换。

`completionContextChars` 同时约束发送上下文和 Editor **读取成本**。对已经很长的 block，必须先根据 caret 建 bounded scan window，再 `textBetween()`；禁止整块 materialize 后再 slice。

Editor 在 `view.composing=true` 或失焦时必须同时撤销 completion context 并清 ghost，不得留下与当前 focus/context 不一致的 decoration。

### `app/`

组合应用状态和 UI。`useInlineCompletion` 只负责补全请求调度，不保存正文。

补全调度只能消费 Editor 已发布的稳定 context；新 context 必须取消旧 request、旧等待和旧 retry。请求 cadence / retry 数值必须从 `ai/completionTuning.ts` 读取，不在 Hook 里另建平行常量集。

同一 context 的 cache hit 必须在 prompt/provider/request 构造之前 fast-path；不得先清空同一 ghost 再恢复，制造无意义 render 和视觉闪烁。

completion error 必须能向 App 双向报告 error/recovery。成功 partial/final/cache hit 后清除 stale `aiError`；失败 toast 显示经过长度限制的真实 Provider 原因，而不是长期只显示通用“检查连接”。

### `storage/`

正文持久化唯一入口；AI preferences 使用独立 repository/namespace。UI 不得散落 Chrome Storage 调用。同一 Prompt 的旧 revision 不得覆盖已持久化的新 revision。

### `ai/`

Provider、Suggestion、Lint 与错误归一化。

普通 AI 编辑结果必须先返回 Suggestion/Finding；不得直接修改 PromptDocument。

Provider 网络错误必须保留足以调度的结构信息，至少能区分 transient/persistent；429 `Retry-After`、HTTP status 与可读错误 message 不得在 Adapter 层被丢掉。JSON error body 不直接整坨展示给用户。

Streaming/non-streaming 以真实 body 形态为权威，不只相信 `Content-Type`。必须同时支持 `text/plain` 实际 SSE，以及 `text/event-stream` 实际普通 JSON。Header 错误不能把有效补全误判成“流式返回空内容”。

### `extension/`

V1 只保留 Extension 生命周期与 Side Panel 打开入口。不得重新演变成网页消息/DOM 自动化业务层。

### `ui/`

临时底部 UI 必须遵守 `AI busy > suggestion > lint > selection action bar` 的单一视觉优先级。不得让多个 fixed panel 同时覆盖同一区域。

AI Settings / Document Sheet 可按打开时 lazy-load；lazy boundary 不得持有自己的 settings/documents 业务副本。

## 8. Inline Completion 特别规则

内联补全是普通“AI 必须显式动作触发”原则的唯一自动请求例外，但必须严格 opt-in。

自动请求条件必须是：

```text
settings.configured
&& settings.enabled
&& settings.completionEnabled
```

三者缺一不可。

强制规则：

- `completionEnabled` 默认 false；
- 只开 AI 总开关不得自动补全；
- 修改 Provider / Model / Base URL / API Key 后 configured 和 completionEnabled 必须失效；
- 关闭 AI 总开关必须停止补全；
- 输入/移动 caret 后旧请求必须取消或其结果必须丢弃；
- IME composition 期间不得生成 completion context 或发 Provider 请求；
- `completionDelayMs` 只是用户停顿 debounce，不得直接作为真实请求频率上限；
- 真实 Provider 请求必须另有最小 cadence，较长句子中的多个自然停顿不能形成请求风暴；
- 只读取并发送当前 text block 内、由 `completionContextChars` 限制的 caret 前后局部上下文；不能为了发送有限 context 先扫描/materialize 整个预存 block；
- `completionContextChars` 必须显式贯穿 Editor，并进入 request identity；禁止 UI 显示小值而 Editor 静默回退更大值；
- 使用短输出上限；
- transient 429/5xx/timeout/transport 应在同一 context 内有限次指数退避自动恢复，并尊重 `Retry-After`；
- persistent auth/config/quota error 不得无限重试，也不得给后续全新的 caret/context 强加额外 30 秒 cooldown；
- 单次 transient failure 不应立即弹通用“补全不可用”；不能用隐藏错误代替实际重试；
- 实际失败必须展示有用且长度受控的 Provider 原因；成功恢复必须清理 stale completion error；
- ghost text 不写 PromptDocument、不触发 autosave/Compiler/revision；
- `Tab` 接受，`Esc` 忽略；
- doc/selection/context budget/focus/composition 变化必须同时使 stale context/ghost 失效；
- 必须保留有意义的前导空格，兼容英文/代码续写；
- streaming partial 可以在很短窗口合并 UI 更新，但不得等待完整回复后才显示；
- streaming capability cache 必须至少区分 Provider、endpoint 与实际 completion model，并有容量上限；
- stream parser 必须从 body sniff SSE/JSON，容忍合法 keep-alive/comment 和错误 Content-Type；
- 相同成功 context 的小容量 cache 命中应直接恢复 ghost，不构造无意义的新 Provider request。

不要为了“更智能”自动接受补全、自动生成整篇 Prompt 或把 ghost 保存下来。

### 8.1 “长文本不补全”的诊断顺序

用户反馈“长文本不补全”时先确认是哪一种：

```text
A. 刚刚持续输入形成的长文本
B. 之前已经存在、现在只是打开/聚焦/移动 caret 的长文本
```

A 类优先看 D020：IME、debounce、network cadence、Abort、Retry-After、短时限流。

B 类优先看 D021：

1. `completionContext.ts` 是否整块 `textBetween()` 后再 slice；
2. focus/caret/document generation/context identity 是否稳定；
3. Provider 返回体实际是 SSE 还是 JSON，header 是否误标；
4. 是否存在上一次失败遗留的 cooldown / stale error / stale ghost；
5. 相同 context cache hit 是否真正 fast-path。

没有证据时不得把 B 类写成“因为用户刚才停顿很多次导致请求风暴”。

## 9. AI Assistance 规则

除第 8 节的 opt-in completion 外，AI 默认不自动调用、不自动改文。

Suggestion：

- 原文与建议明确区分；
- 用户接受后才应用；
- 必须检查 source revision；
- 过期 suggestion 不得硬应用；
- Provider 失败不得影响核心编辑主链。

确定性 Lint 优先本地实现，语义判断再用 AI。

## 10. 依赖、文件与性能控制

保持项目小。新增依赖前先判断标准 API/现有依赖是否足够、bundle/维护成本、是否直接服务 V1。

性能属于代码质量。修改默认编辑热路径、Storage、Compiler/Lint 或 completion 时必须主动检查：

- 是否每次键入执行当前 UI 不需要的派生计算；
- 是否重复读取整个 Storage 或启动时重复读取相同 key；
- 是否重复注册 listener；
- 是否为了局部补全先 materialize 整个已有长 block；
- 是否 cache hit 仍先清空/重建 request/provider；
- 是否把每个用户停顿映射成一个真实 AI 网络请求；
- 是否在 IME composition 中产生无价值请求；
- 是否产生可取消却仍并发堆积的 AI 请求/重试；
- 是否每个 streaming token 都触发根组件 render；
- 是否把 decoration 变化误当正文变化；
- 是否首屏同步加载只有打开 Sheet 才需要的 UI；
- 是否让更旧 revision 覆盖更新 revision；
- 是否用提高 bundle warning threshold、隐藏真实错误、延长 loading/cooldown 掩盖问题。

优化以真实热路径和可验证收益为依据；不要为了“优化”引入复杂缓存或第二状态源。

当前主编辑器 bundle 仍有 `>500KB` 构建 warning。不得通过提高 `chunkSizeWarningLimit` 消除；应先以真实启动数据判断 TipTap/ProseMirror 是否需要进一步拆分。

## 11. Manifest 与权限

D017 后固定权限应保持最小：

```text
storage
sidePanel
```

`optional_host_permissions` 仅用于用户实际配置的 AI Provider Base URL。

新增 `activeTab`、`scripting`、content_scripts 或第三方网页 host 权限都属于产品/架构范围变化，必须先更新 PRODUCT / DECISIONS / ARCHITECTURE。

## 12. 测试与验证

普通修改优先：

1. type/static check；
2. 直接相关聚焦测试；
3. 必要 build。

高风险任务、里程碑或发布候选再执行完整验证。

测试失败必须区分：实现缺陷、测试假设错误、浏览器环境差异、依赖版本问题。不得削弱有效测试来变绿。

内联补全至少覆盖：

- 默认关闭 preference；
- legacy settings backfill；
- Provider short request；
- cancellation；
- 当前 block 的 caret 前/后 context 和配置 budget；
- **超大预存 block 的 bounded context 构建**；
- streaming partial / fallback / SSE keepalive；
- `text/plain` SSE 与 `text/event-stream` + 普通 JSON 双向错误 header 兼容；
- request cadence：首次 debounce、最小网络间隔、backoff/Retry-After；
- Provider transient/persistent 429/5xx/error body 分类；
- Tab accept；
- Esc dismiss；
- doc/focus/composition change stale invalidation；
- 前导空格。

选区至少覆盖：ProseMirror 非空 selection 可派生 snapshot；纯 caret 不显示操作；不得用浏览器 DOM selection fixture 冒充业务状态。

Storage 至少覆盖：并发保存、revision 单调性、启动 current/documents 批量读取。

最终仍必须有真实 Chrome/Edge 浏览器证据，fixture/单测不能冒充 E2E。当前新增一条独立真机用例：**打开已经存在的较长 Prompt，不继续输入，直接把 caret 放到旧文本块首/中/尾并等待补全**；如果失败，记录新的真实错误 toast。中文 IME 连续输入稳定性继续作为另一条独立用例，不与预存文本问题混为同一个根因。

## 13. P0.5 原型规则

`prototype/promptnote-prototype.html` 只用于历史 UX reference。原型中曾模拟的 Web Insert 已被 D017 正式取代，不得因为原型还存在该按钮而恢复正式功能。

## 14. TASKS 是唯一账本

任务完成前确认：实现、调用方迁移、旧链删除、必要测试、真实验证、文档同步全部闭合。

新工作写回 TASKS，不建立平行 TODO。

## 15. 文档必须跟代码一起更新

任务包结束前检查：

- 产品范围 → PRODUCT；
- UX → UX；
- Schema/正文状态 → CONTRACT；
- 模块/权限/数据流 → ARCHITECTURE；
- 关键取舍 → DECISIONS；
- 状态 → TASKS；
- 开发纪律 → AGENTS；
- 使用说明 → README。

禁止“先改代码，文档以后再说”。