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
PRODUCT → UX → PROTOTYPE（仅 P0.5） → PROMPT-DOCUMENT-CONTRACT
→ ARCHITECTURE → DECISIONS → TASKS → code
```

代码不能因为“已经这样写了”反向定义产品。

## 2. V1 开发范围

V1 只围绕：**写 → 整理 → 检查 → 编译 → 复制**。

允许的 AI 增强包括显式 suggestion/lint，以及用户单独 opt-in 的编辑器内联补全。

PRODUCT Non-goals 不得顺手加入，尤其禁止：后端/账号/云数据库、Marketplace、团队权限、Agent Workflow/MCP、模型 Playground/A-B Test、云同步、第三方网页 DOM 注入/Web Adapter/自动写入输入框、自动发送 Prompt。

D017 已退役 Web Insert；不得重新加入 `activeTab`、`scripting`、content script、page bridge 或站点 Adapter。

D018 已退役文字旁 `•••` 选区入口；只保留 `SelectionActionBar`。**不存在外部兼容要求时，不得通过 `SelectionActionBar as SelectionContextMenu` 之类 alias 把退役命名留在生产 API。**

D020 把 completion idle debounce 与真实 Provider cadence 分开；D021 又明确区分“刚输入的长文本”和“早已存在的长文本”。用户已经说明是预存内容时，禁止继续自动归因到 typing request storm / IME。

D022 要求所有异步用户可见状态按 document id + revision 收口；显式覆盖通过合法新 revision 表达，不绕开 Repository；重型运行时允许真实代码分割，但 lazy boundary 不能复制业务状态。

## 3. 真实项目优先

涉及以下内容必须读取仓库真实定义，不得猜测：文件路径、函数/类型、Schema/section kind、Manifest 权限、Chrome API、依赖版本、测试/CI、Provider 请求与真实响应格式、TipTap/ProseMirror transaction/focus/composition 行为。

用户提供的关键事实属于诊断前提。例如用户明确说“这段文字以前就写好了”，后续必须以预存文本场景为前提。

未执行的验证不得描述为已通过。中间 CI 失败必须说明真实原因并修复，不能只报告后续绿色结果仿佛中间没有发现问题。

## 4. PromptDocument 是唯一正文源

必须遵守：

- PromptDocument / TipTap JSON 是唯一持久正文；
- Markdown/XML/Plain 只由 Compiler 派生；
- AI suggestion、ghost completion、lint finding 都不是正文；
- 不创建模型专用 Prompt 副本；
- 不同时维护 localStorage / IndexedDB / Chrome Storage 多份正文。

ghost completion 只有 `Tab` 接受并通过真实 Editor transaction 写入后，才成为正文并进入 revision/autosave。

## 5. Schema / 契约变化

字段、顺序、枚举、Node、Schema、输出契约变化时必须：

1. 搜索权威定义；
2. 搜索全部调用方；
3. 搜索测试、配置、导入导出、文档；
4. 判断兼容需求；
5. 先更新 Contract；
6. 修改唯一权威定义；
7. 迁移真实调用方；
8. 删除旧字段/定义；
9. 反向搜索残留；
10. 更新聚焦测试。

禁止实现和测试各自维护 section kind、schemaVersion、输出格式等平行列表。

## 6. 代码必须优雅、干净，并优先根因修复

“能跑”不是完成标准。代码必须职责清楚、状态单一、调用链直接、可读，并持续删除被替代复杂度。

原则上禁止：

- `new` / `v2` / `fixed` 平行实现；
- 大量 if/else 掩盖职责混乱；
- 复制相似函数、组件、状态或样式；
- 同一交互由多套状态源控制；
- 连续 CSS override / `!important` / 后置补丁；
- 无价值 wrapper / adapter / service；
- 静默异常、假成功、默认值吞错；
- 重复刷新/保存/同步掩盖状态问题；
- 注释旧代码代替删除；
- 保留无调用方的旧组件、函数、CSS、状态、测试或**兼容 alias**；
- 只改测试迁就错误实现。

发现旧代码不符合要求时：定位根因 → 明确唯一职责/状态 → 迁移调用方 → 删除旧链 → 补测试 → 反向搜索。

每个任务包结束前必须做代码减法审查。

## 7. 模块职责

### `prompt/`

权威 Schema、section kind、Compiler 和纯逻辑。不得依赖 React、Chrome API、AI Provider。

### `editor/`

TipTap、Slash Menu、语义块、编辑命令、selection、ghost completion decoration。

不得直接访问 Storage 或 Provider。Ghost Extension 只负责展示/接受/忽略/失效，不负责发请求。

选区业务状态只能从 ProseMirror EditorState 派生：selected text、from/to、single-block format。不得把 DOM selection 或屏幕坐标当第二状态源。

`completionContextChars` 同时约束发送上下文和 Editor **读取成本**。对长 block，先根据 caret 建 bounded scan window，再 `textBetween()`；禁止整块 materialize 后 slice。

Editor 在 `view.composing=true` 或失焦时必须同时撤销 completion context 并清 ghost。

**受控 Editor 外部同步不得用全文 stringify 判断。** Editor 自身 `onUpdate` 产生的 content object identity 作为“已经应用”标记；App 本地更新沿用同一 content 对象时 O(1) 跳过 `setContent()`。同 ID 导入/外部替换产生新的 content object 时才执行一次受控 `setContent()`，同时增加 editor generation、清 selection/completion transient state。

`LazyPromptEditor.tsx` 只允许作为 `Suspense + ref` 代码加载边界，不得创建第二份 TipTap state、PromptDocument 或 Editor API。

### `app/`

组合应用状态和 UI。`useInlineCompletion` 只负责补全请求调度，不保存正文；`importDocument.ts` 只做纯导入冲突解析。

补全调度消费 Editor 稳定 context；新 context 取消旧 request/wait/retry。请求 cadence/retry 数值只来自 `ai/completionTuning.ts`。

同一 context cache hit 在 prompt/provider/request 构造前 fast-path。completion error 向 App 双向报告 error/recovery，成功后清 stale `aiError`。

**所有异步回调在修改用户可见状态前都要证明“自己仍拥有当前版本”。** 对 autosave：只有当前 document id + revision 与当初的 save snapshot 完全一致时，成功才可显示“已保存”，失败才可显示“未保存”。旧 revision 的晚到 callback 不得回退 badge、error 或 document list。

文档列表的增量更新必须保持 revision 单调；默认使用线性定位/插入，不为每次 autosave 全量 `.sort()`。

### `storage/`

正文持久化唯一入口；AI preferences 使用独立 repository/namespace。UI 不得散落 Chrome Storage 调用。同一 Prompt 的旧 revision 不得覆盖已持久化的新 revision。

用户显式“覆盖同 ID 备份”时**禁止**增加 force/bypass API 或放松 revision guard。先将导入文档 rebase 为 `max(local, backup)+1`，再走正常 `save()`；拒绝覆盖则生成新 id。

### `ai/`

Provider、Suggestion、Lint 与错误归一化。

普通 AI 编辑结果必须先返回 Suggestion/Finding，不得直接修改 PromptDocument。

Provider 网络错误至少能区分 transient/persistent；429 `Retry-After`、HTTP status 与可读 message 不得丢失。JSON error body 不整坨展示。

Streaming/non-streaming 以真实 body 为权威，不只相信 `Content-Type`；同时支持 `text/plain` 实际 SSE 和 `text/event-stream` 实际 JSON。

`AiSettings` 是不可变 React state 对象时，直接用对象 identity 驱动 Hook 失效。**不得每次 render 拼接 Provider/URL/model/API Key 形成第二套 settings key**，尤其不得把 credential 放进仅用于 identity 的字符串。

### `extension/`

V1 只保留 Extension 生命周期与 Side Panel 打开入口，不演变成网页消息/DOM 自动化层。

### `ui/`

临时底部 UI 遵守 `AI busy > suggestion > lint > selection action bar` 单一视觉优先级。

AI Settings / Document Sheet 可按打开时 lazy-load；lazy boundary 不得持有自己的 settings/documents 业务副本。

## 8. Inline Completion 特别规则

自动请求条件必须是：

```text
settings.configured && settings.enabled && settings.completionEnabled
```

强制规则：

- `completionEnabled` 默认 false；
- 修改 Provider / Model / Base URL / API Key 后 configured 和 completionEnabled 失效；
- 输入/移动 caret 后旧请求取消或丢弃结果；
- IME composition 不生成 context；
- `completionDelayMs` 只是 debounce，真实请求另有 cadence；
- 只读取/发送当前 text block、受 `completionContextChars` 限制的 caret 局部上下文；
- context budget 显式贯穿 Editor 并进入 request identity；
- transient 429/5xx/timeout/transport 有限指数退避并尊重 `Retry-After`；
- persistent auth/config/quota error 不无限重试，不给新 context 强加人为 cooldown；
- failure 显示长度受控真实原因，成功清 stale error；
- ghost 不写 PromptDocument、不触发 autosave/Compiler/revision；
- `Tab` 接受、`Esc` 忽略；
- doc/selection/context budget/focus/composition 变化使 stale context/ghost 失效；
- streaming partial 可短窗口合并，但不得等完整回复才显示；
- streaming capability cache 区分 Provider + endpoint + actual completion model，并有容量上限；
- stream parser 从 body sniff SSE/JSON；
- success cache hit 直接恢复，不构造无意义 Provider request。

### 8.1 “长文本不补全”的诊断顺序

先确认：A 刚刚持续输入形成；B 之前已存在、只是打开/聚焦/移动 caret。

A 类看 D020：IME、debounce、network cadence、Abort、Retry-After、限流。

B 类看 D021：context 是否整块读取、focus/caret/document generation identity、Provider body、stale cooldown/error/ghost、cache hit fast-path。

没有证据不得把 B 类写成“用户刚才停顿很多导致请求风暴”。

## 9. AI Assistance 规则

除 opt-in completion 外，AI 默认不自动调用、不自动改文。Suggestion 原文与建议明确区分，接受后才应用，必须检查 source revision；Provider 失败不得影响核心编辑主链。

确定性 Lint 优先本地实现，语义判断再用 AI。

## 10. 依赖、文件与性能控制

保持项目小。新增依赖前先判断标准 API/现有依赖是否足够、bundle/维护成本、是否直接服务 V1。

性能审查至少检查：

- 是否每次键入做当前 UI 不需要的派生计算；
- 是否重复读整个 Storage；
- 是否重复 listener；
- 是否为局部补全 materialize 整个已有 block；
- 是否每次 render 构造复合 identity/credential string；
- 是否 cache hit 仍重建 request/provider；
- 是否每个用户停顿发真实 AI 请求；
- 是否 IME 中间态请求；
- 是否 token 粒度根组件 render；
- 是否 decoration 被当正文；
- 是否首屏同步加载可拆的大型 runtime；
- 是否旧 revision 覆盖新 revision或其 callback 回退 UI；
- 是否每次 autosave 全量 sort 文档列表；
- 是否为检测外部 Editor content 每次 stringify 整篇正文；
- 是否用提高 warning threshold、隐藏错误、延长 loading/cooldown 掩盖问题。

优化以真实热路径和可验证收益为依据，不为“优化”引入复杂缓存或第二状态源。

当前构建已经通过真实 lazy split 把同步 `sidepanel` 从约 616.97 kB / gzip 195.41 kB 降到约 228.57 kB / gzip 73.72 kB，并把约 388.80 kB / gzip 122.57 kB 的 PromptEditor runtime 放入异步 chunk。**这不是总 JS 减少 63%，而是首屏同步 chunk 降低。** `>500KB` warning 已因真实拆包消失，禁止以后通过调 warningLimit“继续优化”。最终性能仍以真实浏览器启动/输入体感为准。

## 11. Manifest 与权限

固定权限保持：

```text
storage
sidePanel
```

`optional_host_permissions` 仅用于用户配置的 AI Provider Base URL。新增 `activeTab`、`scripting`、content_scripts 或第三方网页 host 权限属于产品/架构变化，必须先改权威文档。

## 12. 测试与验证

普通修改优先：type/static check → 直接相关聚焦测试 → 必要 build。高风险任务/里程碑/RC 再执行完整验证。

测试失败必须区分实现缺陷、测试假设错误、浏览器环境差异、依赖版本问题。不得削弱有效测试来变绿。

当前至少覆盖：Schema/Compiler、Repository revision、同 ID import rebase/copy、Editor history/conversion、selection snapshot/actionbar、Provider/error/stream compatibility、completion context/cadence/ghost、Suggestion/Lint、AI preferences。

最终真实浏览器证据必须额外验证：

- Editor lazy chunk 首次出现时主链可用；
- 快速连续输入期间 save badge 不被旧 revision 晚到结果误报；
- 导出后用同 ID 备份选择覆盖，当前 Editor 即时换成备份正文，重开后仍一致；
- 打开预存长 Prompt 后旧文本 caret completion；
- 中文 IME 持续输入稳定性；
- Chrome / Edge 当前最终 Manifest。

fixture/单测不能冒充 E2E。

## 13. P0.5 原型规则

`prototype/promptnote-prototype.html` 只用于历史 UX reference。已退役能力不得因为原型仍存在而恢复。

## 14. TASKS 是唯一账本

任务完成前确认：实现、调用方迁移、旧链删除、必要测试、真实验证、文档同步全部闭合。新工作写回 TASKS，不建立平行 TODO。

## 15. 文档必须跟代码一起更新

任务包结束前检查 PRODUCT / UX / CONTRACT / ARCHITECTURE / DECISIONS / TASKS / AGENTS / README。禁止“先改代码，文档以后再说”。
