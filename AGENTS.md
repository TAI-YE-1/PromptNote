# AGENTS — PromptNote 开发协作规则

本文件约束所有参与 PromptNote 开发的 AI / Agent / Codex 工作方式。目标是防止产品漂移、重复实现、状态源分裂和历史代码堆积。

## 1. 每次开始开发前必须阅读

按顺序：

1. `docs/PRODUCT.md`
2. `docs/UX.md`
3. 当前阶段若为 P0.5，额外阅读 `docs/PROTOTYPE.md`
4. `docs/PROMPT-DOCUMENT-CONTRACT.md`
5. `docs/ARCHITECTURE.md`
6. `docs/DECISIONS.md`
7. `TASKS.md`
8. 真实代码、配置、测试与当前调用链

`README.md` 用于快速入口，但不能替代上述权威文档。

## 2. 权威层级

```text
PRODUCT
  ↓
UX
  ↓
PROTOTYPE（仅 P0.5 UX 验证阶段）
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

`PROTOTYPE.md` 只约束 P0.5 原型验证，不得覆盖 PRODUCT / UX 已定义的产品原则，也不得成为运行时 Schema 或正式代码权威来源。

当代码与文档冲突时，不得因为代码“已经这样写了”就反向认定代码正确。

先判断：

- 是否有明确的新产品决策；
- 是否文档确实过期；
- 还是实现偏离。

没有明确变更依据时，按实现缺陷处理。

## 3. 开发范围

V1 只围绕：

**写 → 整理 → 检查 → 编译 → 复制/插入**

不得擅自加入 `docs/PRODUCT.md` Non-goals 中的能力。

尤其禁止顺手扩展：

- 后端；
- 登录/账号；
- 云数据库；
- Prompt Marketplace；
- 团队权限；
- Agent Workflow；
- MCP 平台；
- Playground；
- A/B Test；
- 云同步。

如果未来确实需要，应先修改产品与决策文档，再实施。

## 4. 真实项目优先

涉及以下内容时必须以仓库真实内容为准，不得猜测：

- 文件路径；
- 函数名；
- 类型；
- Schema；
- section kind；
- Manifest 权限；
- DOM selector；
- Chrome API；
- 依赖版本；
- 测试命令；
- 构建状态；
- 执行结果。

无法检查时必须明确说明未验证，不得描述为已经读取、修改或通过。

## 5. PromptDocument 是唯一正文源

任何实现必须遵守：

- PromptDocument / TipTap JSON 是唯一可持久正文；
- Markdown / XML / Plain Text 只由 Compiler 派生；
- AI suggestion 不是正文；
- Web Adapter 输入缓存不是正文；
- 不创建模型专用 Prompt 副本；
- 不同时维护 localStorage / IndexedDB / Chrome Storage 多份正文。

发现第二状态源时优先消除，而不是同步更多副本。

## 6. Schema / 契约变化

涉及字段、顺序、数量、枚举、Node、Schema、输出契约时：

1. 先全仓搜索权威定义；
2. 搜索所有真实调用方；
3. 搜索测试、配置、导入导出和文档；
4. 判断兼容需求；
5. 先更新 `PROMPT-DOCUMENT-CONTRACT.md`；
6. 修改唯一权威定义；
7. 迁移所有真实引用；
8. 删除旧字段/旧定义；
9. 反向搜索确认无遗漏；
10. 更新聚焦测试。

禁止在实现与测试中分别重复硬编码 section kind、输出格式或 schemaVersion。

## 7. 代码必须优雅、干净，并优先根因修复

“功能能跑”不是完成标准。正式代码必须保持职责清楚、状态单一、调用链直接、实现可读，并持续删除已经被替代的复杂度。

原则上禁止：

- 新增 `new` / `v2` / `fixed` 平行实现；
- 大量 if/else 掩盖职责混乱；
- 复制相似函数、组件、状态或样式；
- 同一个交互由多个独立状态源或多套定位逻辑共同控制；
- 为修复布局/交互问题持续叠加 CSS override、`!important` 或后置补丁样式；
- 用额外 wrapper、adapter、service 只做无价值转发；
- 静默异常、假成功、默认值吞掉错误；
- 重复刷新、重复保存、重复同步来“修”状态一致性；
- 注释旧代码代替删除；
- 保留已经没有真实调用方的旧组件、旧函数、旧 CSS、旧状态；
- 只修改测试来迁就错误实现。

发现现有代码不符合这些要求时，不得因为“这是之前已经写好的”就继续沿用。应在当前任务允许的最小范围内：

1. 定位根因与重复职责；
2. 明确唯一状态源、唯一组件职责或唯一调用链；
3. 迁移所有真实调用方；
4. 删除被替代的旧实现、旧样式和冗余状态；
5. 补充或更新聚焦测试；
6. 反向搜索确认旧链没有残留。

如果一个问题需要连续打第二层、第三层 UI/CSS/状态补丁才能维持，应停止补丁式修复，重新检查组件边界和状态设计。

完成每个任务包前必须做一次代码减法审查：能删除的旧逻辑、重复样式、重复状态和无效抽象必须删除，而不是留给以后。

## 8. 模块职责

### `prompt/`

权威 Schema、section kind、Compiler 和纯逻辑。

不得依赖 React、Chrome API、DOM、AI Provider SDK。

### `editor/`

TipTap、Slash Menu、编辑命令、Suggestion 接受动作。

不得直接访问 Storage 或目标网页 DOM。

### `storage/`

正文持久化唯一入口。

UI 不得散落 Chrome Storage API 调用。

### `ai/`

只返回 Suggestion / Lint Finding。

不得直接修改或持久化 PromptDocument。

### `adapters/`

只处理目标网站 DOM 差异和插入。

不得复制 Compiler、Storage、Editor 逻辑，不得自动发送。

### `extension/`

只放浏览器扩展生命周期、消息桥和必要 Content Script 入口，不得演变成业务逻辑仓库。

## 9. 依赖与文件控制

保持项目小。

新增依赖前先判断：

- 标准 API 或现有依赖是否已经能解决；
- 是否引入明显 bundle / maintenance 成本；
- 是否与当前 V1 目标直接相关。

避免：

- 无必要框架；
- 大量碎片文件；
- 巨型组件或巨型工具文件；
- 空包装层；
- 一层只转发一层的 service；
- 与当前目标无关的基础设施。

文件拆分以职责边界为准，不以“文件越多越架构化”为目标；同样也不得把多个独立职责塞进一个巨型组件。

完成任务包后做代码减法审查。

## 10. 测试与验证

普通修改优先：

1. static/type check；
2. 直接相关聚焦测试；
3. 必要 build。

高风险任务、里程碑收口或发布候选再执行完整验证。

测试失败必须区分：

- 实现缺陷；
- 测试假设错误；
- 浏览器/环境差异；
- 依赖或框架版本变化。

不得删除、削弱或篡改有效测试来让 CI 变绿。

未执行的验证不得描述为通过。

## 11. Web Adapter 特别规则

网页 DOM 必须基于真实当前页面或可靠 fixture 实现，不猜 selector。

每个 Adapter 的站点特有逻辑只留在 Adapter 内。

插入：

- 必须用户主动触发；
- 不自动发送；
- 不静默覆盖现有输入；
- 失败时明确报告并允许 Copy 降级。

## 12. AI Assistance 特别规则

AI 默认不自动改文。

Suggestion：

- 必须和原文区分；
- 必须由用户接受才应用；
- 必须检查来源 revision；
- 过期 suggestion 不得硬应用；
- Provider 调用失败不得影响核心编辑主链。

确定性 Lint 优先本地实现，语义判断再考虑 AI。

## 13. P0.5 原型特别规则

P0.5 只用于 UX 验证：

- 使用 `prototype/promptnote-prototype.html` 单文件 HTML 可交互原型；
- 原型使用内嵌 HTML / CSS / JavaScript，不引入正式 React / Extension 运行时；
- 不实现真实 PromptDocument、Storage、Compiler、Adapter 或 AI API；
- 不因为原型方便而引入 PRODUCT Non-goals；
- 原型完成后将确认结论回写 `docs/UX.md`；
- 正式实现从 P1 干净开始，不复制临时代码；
- 原型只作为 UX reference，不作为运行时状态、Schema、Compiler 或架构权威来源。

## 14. TASKS 是唯一账本

开发只能沿 `TASKS.md` 的当前实施包推进。

完成任务前确认：

- 实现已完成；
- 所有真实调用方已迁移；
- 被替代旧链已删除；
- 必要测试已增加或更新；
- 实际执行了所需验证；
- 相关文档已同步。

全部满足才能勾选 `[x]`。

新发现工作属于 V1 时写回 `TASKS.md`，不要另建平行 TODO 文档。

## 15. 文档必须跟代码一起更新

每个任务包结束前检查：

- 产品边界是否变化 → `PRODUCT.md`；
- 体验是否变化 → `UX.md`；
- P0.5 原型范围或结论变化 → `PROTOTYPE.md`；
- Schema 是否变化 → `PROMPT-DOCUMENT-CONTRACT.md`；
- 模块职责/数据流是否变化 → `ARCHITECTURE.md`；
- 重大技术或产品选择是否变化 → `DECISIONS.md`；
- 实施状态 → `TASKS.md`；
- 使用方式变化 → `README.md`。

不要创建新的文档来逃避更新现有权威来源。

## 16. 完成汇报要求

每个开发任务停止时明确说明：

- 实际检查了什么；
- 修改了什么；
- 删除了什么；
- 实际执行了哪些命令/测试；
- 验证结果；
- 哪些内容没有验证；
- 当前遗留风险；
- commit / push 状态。

不得把计划、推测、建议或未执行操作描述为已经完成。
