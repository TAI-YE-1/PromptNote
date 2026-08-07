# PROTOTYPE — PromptNote P0.5 单文件 HTML 可交互原型规格

本文件定义 PromptNote 在正式进入 P1 代码实现前的 P0.5 原型验证范围。原型用于验证用户体验，不作为生产代码来源，不建立第二套产品或技术实现。

## 1. 原型目标

P0.5 只回答以下问题：

1. Side Panel 单栏编辑布局是否舒服；
2. 自由文本与 Prompt 语义块能否自然混写；
3. Slash Menu 是否比固定表单更自然；
4. AI 配置、局部辅助和全局辅助是否可发现但不过度打扰；
5. 用户是否能清楚分辨原文与 AI suggestion；
6. Prompt Check、Preview、Copy、Insert 是否足够直接；
7. AI 未配置、关闭或失败时，核心主链是否仍完整；
8. 360px 窄 Side Panel 下核心操作是否仍可发现和可用。

P0.5 不验证：真实 TipTap Schema、PromptDocument 持久化、正式 Compiler 正确性、Chrome Storage、真实网页 DOM Adapter、真实 AI Provider API、后台或账号系统。

## 2. 原型载体

P0.5 使用单文件 HTML：

`prototype/promptnote-prototype.html`

要求：

- HTML / CSS / JavaScript 全部内嵌；
- 可直接在 Chrome / Edge 打开；
- 不依赖 Node、npm、React、Vite、CDN、后端；
- AI、Lint、Compiler、Adapter 均使用本地假数据或轻量模拟；
- 不发送真实网络请求；
- 使用单一 `state + render()` 或等价状态模型；
- 不为每个状态复制一套独立页面；
- 正式开发时不得直接复制原型代码进入生产实现。

基准 Side Panel 约 440px，同时检查 360px 与 520px。

## 3. 视觉方向

关键词：**Forest Paper / 森林纸张、轻、安静、文档感、低工具感**。

原则：

- 主色为低饱和深森林绿；
- 页面采用暖灰与暖纸白，而不是 SaaS 蓝灰后台风；
- Prompt Section 默认不做重卡片；
- 结构标签弱强调，hover / focus 时再出现更明显的结构提示；
- `检查 / 预览 / 复制` 为轻操作，`插入` 是唯一主要实心按钮；
- AI 使用同一套森林绿辅助语义，不使用强紫色渐变或“魔法”视觉；
- Prototype Controls 默认收起，不能抢 PromptNote 本体视觉重心。

## 4. 主界面信息架构

```text
PromptNote Side Panel
├─ Top Bar
│  ├─ 文档入口
│  ├─ Prompt 标题
│  └─ AI 状态入口
├─ Editor
│  ├─ 自由文本
│  ├─ Prompt Section
│  ├─ Slash Menu
│  └─ Selection Toolbar
├─ Contextual Feedback
│  ├─ Local lint
│  ├─ AI suggestion
│  └─ AI semantic check
└─ Bottom Action Bar
   ├─ Check
   ├─ Preview
   ├─ Copy
   └─ Insert
```

不做 Dashboard、常驻 AI Chat、大型文档树、模型 Playground、模板市场。

## 5. 编辑体验

默认是普通文档，不要求用户先选择 Role / Goal / Context 表单。

示例：

```text
目标
修复 owner 权限判断错误

背景
当前 owner 被错误提示无法管理角色…

约束
先检查真实代码和当前调用链，不要先改。
```

Prompt Section 使用轻语义标签；正文仍连续阅读。

## 6. Slash Menu

输入 `/` 后提供：

- 目标；
- 背景；
- 任务；
- 约束；
- 示例；
- 输出格式；
- 验收标准；
- 普通段落。

P0.5 只模拟交互感受，不复刻正式 TipTap command 行为。

## 7. AI 状态入口

Top Bar 必须有一个轻量 AI 状态入口，而不是把 AI 配置藏到看不见的低频菜单。

至少模拟：

- `AI 未配置`；
- `AI 已连接`；
- `AI 已关闭`。

点击逻辑：

- 未配置 → AI Settings；
- 已配置 → AI 辅助菜单；
- 已关闭 → 显示关闭状态，并允许进入设置重新启用。

AI 状态入口的视觉权重必须低于编辑正文与 Insert。

## 8. AI Settings

P0.5 必须模拟以下设置：

- 启用 / 关闭 AI 辅助；
- Provider；
- Model；
- API Base URL（可选）；
- API Key；
- 默认发送范围；
- 测试连接；
- 保存配置。

默认发送范围：

1. 仅选中文字（默认）；
2. 选区 + 相邻上下文。

需要完整 Prompt 的动作必须在动作入口明确说明，例如“检查当前 Prompt 的歧义”。

原型中的 API Key 和连接测试均为假数据；不得发送网络请求。

原型需明确提示：AI 配置属于扩展偏好，不属于 PromptDocument。

## 9. 选区 AI 辅助

用户选中文字后：

1. 只出现 Selection Toolbar；
2. 不自动调用 AI；
3. 用户再显式选择动作。

至少模拟：

```text
改清楚 | 缩短 | 拆成约束 | AI…
```

如果 AI 未配置，点击 AI 动作应进入 AI Settings，而不是假装成功。

## 10. 全局 AI 辅助

AI 已配置后，Top Bar AI 入口打开轻量动作面板。

至少模拟：

- 检查当前 Prompt 的歧义；
- 补充验收标准；
- 给出结构整理建议；
- 进入设置。

禁止加入常驻聊天窗口，也禁止“一键整篇优化并覆盖”。

## 11. AI Suggestion

AI 结果不得直接写正文。

```text
AI 建议

原文
不要乱改其他地方

建议
仅修改与本问题直接相关的代码；不得扩大修改范围。

[忽略] [接受]
```

要求：

- 原文与建议同时可见；
- 只有接受才修改正文；
- 正文变化后 suggestion 变成过期状态，不可直接应用；
- AI 生成新的结构块时也必须先显示建议，再由用户接受。

## 12. Prompt Check

底部 `检查` 首先运行本地 deterministic lint。

原型至少模拟：

- 模糊词；
- 缺少验收标准；
- 内容结构较弱。

本地 Check 不依赖 AI，不提供分数。

Check 面板可提供：

`AI 深度检查`

若 AI 未配置 → 进入 AI Settings；已配置 → 模拟语义检查 suggestion。

## 13. Preview

Preview 是二级只读视图，不做左右永久分栏。

支持模拟：

- Plain；
- Markdown；
- XML。

切换格式不得修改编辑内容。

## 14. Copy / Insert

底栏：

```text
检查      预览      复制      [插入]
```

Insert：

- 用户主动触发；
- 不自动发送；
- 输入框已有内容时显示追加 / 替换 / 取消；
- Adapter 不可用时退化到 Copy。

P0.5 不操作真实网页 DOM。

## 15. Document Switcher

轻量 overlay / sheet 即可：

- 最近 Prompt；
- 搜索；
- 新建；
- 切换。

不增加文件夹、标签、团队、分享、市场。

## 16. Prototype Controls

原型控制区仅供评审，默认收起。

至少可快速进入：

- Empty；
- Slash；
- Selection AI；
- AI 未配置；
- AI 已配置；
- Check；
- Preview；
- Insert Failure。

同时支持：

- 360 / 440 / 520 宽度；
- Adapter 可用 / 不可用；
- 输入框是否已有内容；
- 重置演示。

## 17. 核心原型主链

### 无 AI 主链

```text
自然书写
→ Slash 结构化
→ Local Check
→ Preview
→ Copy / Insert
```

### 首次 AI 主链

```text
选中文字
→ Selection Toolbar
→ 改清楚
→ AI 未配置
→ AI Settings
→ Provider / Model / API Key
→ 测试连接
→ 保存
→ AI 已连接
→ 再次显式触发 AI 动作
→ Suggestion
→ 接受 / 忽略
```

### 已配置 AI 主链

```text
AI 已连接
→ 打开 AI 辅助
→ 检查歧义 / 生成验收标准 / 结构建议
→ Suggestion
→ 接受 / 忽略
```

## 18. P0.5 验收问题

原型复核至少回答：

1. 第一次打开能否不看教程直接写？
2. 不用结构块能否正常完成 Prompt？
3. 使用结构块后是否仍像文档而不是表单？
4. AI 配置入口是否容易找到，但不会抢正文注意力？
5. 选中文字后是否先出现动作，而不是自动调用 AI？
6. 用户能否理解 AI 会发送什么范围的内容？
7. 原文与 AI suggestion 是否明显区分？
8. AI 未配置 / 关闭 / 失败时，核心主链是否完整？
9. Local Check 与 AI 深度检查是否边界清楚？
10. Preview 是否只读且不会形成第二正文源？
11. Copy / Insert 是否始终容易找到？
12. 360px 是否仍能完成完整主链？
13. 是否出现 PRODUCT Non-goal 的平台化入口？

## 19. 验证方式

完成 HTML 后至少：

1. JavaScript syntax check；
2. Chrome 本地打开；
3. Edge 本地打开；
4. 跑无 AI 主链；
5. 跑首次 AI 配置主链；
6. 跑已配置 AI 主链；
7. 检查 360 / 440 / 520；
8. 检查控制台无 JavaScript error；
9. 人工体验复核。

自动化 smoke 不能替代人工体验判断。

## 20. 原型关闭后的处理

P0.5 HTML 原型不是正式实现。

确认后：

1. 最终交互结论同步到 `docs/UX.md`；
2. 技术边界同步到 `docs/ARCHITECTURE.md` / `docs/DECISIONS.md`；
3. 更新 `TASKS.md`；
4. 正式代码从 P1 干净开始；
5. HTML 只保留为 UX reference，不作为 PromptDocument Schema、AI Provider API 或正式 Compiler 的权威来源。
