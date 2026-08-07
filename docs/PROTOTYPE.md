# PROTOTYPE — PromptNote P0.5 单文件 HTML 可交互原型规格

本文件定义 PromptNote 在正式进入 P1 代码实现前的 P0.5 原型验证范围。原型用于验证用户体验，不作为生产代码来源，不建立第二套产品或技术实现。

## 1. 原型目标

P0.5 只回答以下问题：

1. Side Panel 的单栏编辑布局是否舒服；
2. 自由文本与 Prompt 语义块能否自然混写；
3. Slash Menu 是否比固定表单更自然；
4. AI suggestion 是否清楚表达“用户是作者，AI 只是助手”；
5. Preview / Copy / Insert 是否足够直接；
6. 窄 Side Panel 下核心操作是否仍可发现和可用。

P0.5 不验证：真实 TipTap Schema、PromptDocument 持久化、Compiler 正确性、Chrome Storage、真实网页 DOM Adapter、AI Provider API、后台或账号系统。

## 2. 原型载体

P0.5 使用 **单文件 HTML 可交互原型**，文件建议放在：

`prototype/promptnote-prototype.html`

该文件必须：

- 单文件包含 HTML、CSS、JavaScript；
- 可直接双击在 Chrome / Edge 打开；
- 不依赖 Node、npm、Vite、React、CDN 或远程资源；
- 不需要后端或登录；
- 使用假数据和前端内存状态模拟交互；
- 允许使用 `localStorage` 仅保存“原型演示状态”，但不得将其误认为正式 PromptDocument 存储设计；默认优先纯内存状态；
- 原型结束后不复制进入正式 Extension 实现。

### 2.1 为什么不用 Figma

当前原型的目的不是交付视觉设计文件，而是低成本验证真实交互。单文件 HTML 可以直接模拟输入、点击、菜单、选择、抽屉、预览和状态切换，且无需 Figma 额度。

### 2.2 为什么不用 React

P0.5 不能提前演变为正式代码。若使用 React / TipTap / Extension API，会把“原型验证”提前变成 P1-P3 实现，导致 UX 未确认前就产生代码债。

### 2.3 原型内部实现原则

建议使用最简单的状态驱动模式：

```text
const state = { ... }

用户事件
   ↓
更新 state
   ↓
render()
   ↓
刷新当前原型视图
```

允许拆少量纯函数，但仍保留在同一个 HTML 文件中。不要引入组件框架、路由库、状态库或构建系统。

原型基础视口以约 440px 宽的 Side Panel 为主视图，同时必须检查约 360px 与 520px 两个宽度状态。这里是设计验证尺寸，不是浏览器 API 的硬编码约束。

## 3. 信息架构

V1 原型只保留一个主工作面，不做 Dashboard。

```text
PromptNote Side Panel
├─ Top Bar
│  ├─ 当前 Prompt 标题
│  ├─ 文档切换入口
│  └─ More
├─ Editor
│  ├─ 自由文本
│  ├─ Prompt Section
│  ├─ Slash Menu
│  └─ Selection Toolbar
├─ Contextual Feedback
│  ├─ Lint finding
│  └─ AI suggestion
└─ Bottom Action Bar
   ├─ Check
   ├─ Preview
   ├─ Copy
   └─ Insert
```

不在主界面长期占用空间显示格式选项、AI 设置、Prompt 模板市场或大型文档树。

## 4. 主界面设计

### 4.1 Top Bar

最小结构：

```text
[☰/文档]  修复权限问题                 [···]
```

要求：

- 标题可直接点击编辑；
- 左侧入口打开轻量文档列表，不常驻侧栏；
- `···` 只放低频操作，例如重命名、导出、删除；
- 不放账号头像、团队、统计、模型选择等 V1 Non-goals。

### 4.2 Editor

编辑器是视觉中心，占据绝大多数高度。

默认空状态：

```text
开始写你的 Prompt…
输入 / 可以添加目标、背景、约束等结构
```

不得先显示 Role / Context / Goal 等输入框。

普通段落保持接近文档编辑器的视觉；Prompt 语义块使用“轻语义提示”，而不是重卡片。

推荐样式：

```text
目标
修复 owner 权限判断错误

背景
当前 owner 被错误提示无法管理角色…

约束
• 先检查真实代码
• 不扩大修改范围
```

语义标签使用较小、较弱的标题或左侧标记。正文仍像普通文档连续阅读。

不推荐：每个 Section 都有明显边框、阴影、彩色大卡片。长 Prompt 不能变成表单堆叠。

## 5. Slash Menu

用户输入 `/` 后，在光标附近出现轻量菜单。

首屏优先 Prompt 语义块：

```text
Prompt 结构
🎯 目标
▣ 背景
→ 任务
⛓ 约束
◇ 示例
↳ 输出格式
✓ 验收标准

基础块
标题
列表
代码
引用
```

交互要求：

- 可键盘上下选择、Enter 插入、Esc 关闭；
- 支持输入 `/约` 等关键词过滤；
- 插入 Section 后立即进入正文输入；
- 不要求用户理解 Goal / Context 等英文术语；
- 语义块可转换回普通段落且正文不丢失。

P0.5 中不要求复刻 TipTap 的真实 selection / command 行为，只需要把交互感受模拟出来。

## 6. Prompt Section 视觉

采用“文档式 section”，不是“表单字段”。

默认态：

```text
约束
先检查真实代码，不要先修改。
```

Hover / Focus 时显示弱操作：

```text
⋮ 约束        转换类型 / 移除结构标签
```

结构标签只是语义元数据；正文排版保持连续。

原型至少演示：Goal、Context、Instruction、Constraint、Example、Acceptance。

## 7. Selection Toolbar

用户选中或点击原型中的演示文本后显示轻量浮动工具条：

```text
[B] [I]  |  改清楚  缩短  拆成约束  ···
```

原则：

- 常规格式和 AI 动作共处，但视觉分组；
- AI 不在未选择文本时主动弹出；
- 不用一个常驻“AI Chat”占据 Side Panel；
- `检查歧义`、`生成验收条件` 可放入 `···` 或 Check 流程。

## 8. AI Suggestion 设计

AI 结果不直接写入正文。

推荐使用贴近原文的 suggestion card / inline drawer：

```text
AI 建议

原文
不要乱改其他地方

建议
仅修改与本问题直接相关的代码；不得扩大修改范围。

[接受] [忽略]
```

要求：

- 原文与建议始终同时可见；
- `接受` 才让原型正文状态变化；
- `忽略` 直接关闭；
- 原型要能演示“正文已经变化，因此旧建议已过期”；
- 不做复杂 Track Changes，也不做对话式 AI 面板；
- P0.5 的建议内容是预置假数据，不调用真实 AI API。

## 9. Check / Prompt Lint

底部 `Check` 是结构检查入口，不是 Prompt 评分。

点击后出现 findings，例如：

```text
检查到 3 个可能问题

⚠ “尽量”表达比较模糊
  [查看]

⚠ 当前没有明确验收标准
  [添加验收标准]

○ 这段较长且没有结构
  [转换为结构块]
```

原则：

- 不给 72/100 之类分数；
- 不阻断 Copy / Insert；
- 能模拟定位原文；
- P0.5 findings 使用本地预置规则/假数据，不实现正式 lint 引擎。

## 10. Preview 设计

`Preview` 打开覆盖当前 Side Panel 的二级视图，而不是永久左右分栏。

```text
← 返回       Prompt Preview

[Plain] [Markdown] [XML]

--------------------------------
只读编译结果
--------------------------------

[复制]                 [插入]
```

要求：

- Preview 只读；
- 切换格式不修改原型编辑内容；
- Markdown 可显示源码，不把它变成第二编辑器；
- 返回后保持原先编辑状态；
- P0.5 可用预置转换函数模拟三种输出，不代表正式 Compiler 契约已经实现。

## 11. Bottom Action Bar

默认固定在底部：

```text
[检查]        [预览]      [复制 ▾]   [插入]
```

设计判断：

- `Insert` 视觉权重最高；
- `Copy` 必须始终存在，是 Adapter 失败的可靠降级路径；
- `Copy ▾` 可模拟选择输出格式；
- 不把 Plain / Markdown / XML 三个按钮常驻底栏。

P0.5 的 Insert 只模拟结果，不操作真实 ChatGPT DOM。

## 12. 文档切换

点击左上角文档入口，打开轻量 overlay / sheet：

```text
Prompt
[搜索…]

最近
修复权限问题
S15 数据规则
新建酒店流程

[+ 新建 Prompt]
```

只验证：最近文档、搜索、新建、切换。

P0.5 不设计文件夹、标签系统、收藏、共享、团队空间等管理后台能力。

## 13. Insert 冲突状态

原型必须覆盖目标网页输入框已有文本时的情况，不能静默覆盖。

```text
当前输入框已有内容

○ 追加到现有内容后
○ 替换现有内容
○ 取消

[继续]
```

默认不预选“替换”。

Adapter 不可用时模拟：

```text
无法插入到当前页面。
你的 Prompt 没有丢失。

[复制到剪贴板]
```

## 14. 原型 State 清单

P0.5 至少包含以下可操作状态：

1. `A01 Empty` — 新 Prompt 空状态；
2. `A02 Writing` — 自由文本编辑；
3. `A03 Slash Menu` — 输入 `/`；
4. `A04 Structured` — 自由文本 + 多种 Prompt Section；
5. `A05 Selection Toolbar` — 选中文本；
6. `A06 Suggestion` — AI 建议对比与接受/忽略；
7. `A07 Check` — lint findings；
8. `A08 Preview Plain`；
9. `A09 Preview Markdown`；
10. `A10 Document Switcher`；
11. `A11 Insert Existing Content`；
12. `A12 Insert Failure → Copy`；
13. `A13 Narrow 360`；
14. `A14 Wide 520`。

这些状态必须由同一个 HTML 文件里的统一状态模型切换，不为每个状态复制一份独立页面代码。

## 15. 原型交互主链

原型必须真实可点击跑通：

```text
Empty
  ↓ 输入自然文本
Writing
  ↓ /
Slash Menu
  ↓ 选择约束
Structured
  ↓ 选择文本
Selection Toolbar
  ↓ 改清楚
Suggestion
  ↓ 接受
Structured
  ↓ Check
Lint Findings
  ↓ Preview
Preview
  ↓ Markdown
Markdown Preview
  ↓ 返回
Structured
  ↓ Insert
Insert success / conflict / failure
```

## 16. 原型辅助控制

为了方便评审，单文件 HTML 可以提供一个不进入正式产品的“原型控制区”，例如：

- 重置演示；
- 快速跳到 Empty / Structured / Suggestion / Preview / Insert Failure；
- 切换 360 / 440 / 520 宽度；
- 模拟 Adapter 可用 / 不可用；
- 模拟目标输入框已有内容。

这些控件必须明确标记为 `Prototype Controls`，不应被误认为 V1 产品功能。

## 17. 视觉方向

关键词：轻、安静、文档感、低工具感。

建议：

- 中性背景；
- 主要留白服务文字；
- 结构标签使用弱强调；
- AI 使用单一辅助标识，不让界面充满“魔法渐变”；
- 关键操作层级明确，但不把产品做成开发者 IDE；
- 图标只辅助识别，不替代文字。

原型阶段不先做品牌视觉系统，避免 Logo、插画、渐变等工作干扰编辑体验判断。

## 18. P0.5 验收问题

原型复核时必须逐条回答：

1. 第一次打开的人能否不看教程直接开始写？
2. 不使用任何结构块，能否正常完成 Prompt？
3. 使用结构块后，是否仍像一篇文档而不是表单？
4. 用户能否明显分清自己的文字与 AI 建议？
5. Preview 是否容易理解，但不会诱导用户维护 Markdown 第二状态？
6. Copy 与 Insert 是否始终容易找到？
7. 360px 宽度是否仍能完成完整主链？
8. 是否出现任何 PRODUCT Non-goal 的平台化入口？

只有这些问题被确认后，才能开始 P1。

## 19. 原型验证方式

完成 HTML 后至少执行：

1. Chrome 打开本地文件；
2. Edge 打开本地文件；
3. 跑通第 15 节完整主链；
4. 检查浏览器控制台无 JavaScript error；
5. 检查 360 / 440 / 520 三种宽度；
6. 检查重置演示后状态可恢复到初始态。

如果可用浏览器自动化，可补充自动点击 smoke，但不能用自动化通过替代人工体验复核。

## 20. 原型关闭后的处理

P0.5 HTML 原型不是正式实现。

确认后：

1. 将最终交互结论同步到 `docs/UX.md`；
2. 如产品边界变化，同步 `docs/PRODUCT.md` 与 `docs/DECISIONS.md`；
3. 更新 `TASKS.md`，关闭 P0.5；
4. 正式代码仍从 P1 新建，不复制原型临时代码；
5. HTML 原型保留为 UX reference，不作为运行时权威状态、PromptDocument Schema 或正式 Compiler 的来源。
