# PRODUCT — PromptNote / 提词笺

本文件是 PromptNote 的产品目标与范围权威来源。功能优先级、范围争议和“是否应该做”首先以本文件判断。

## 1. 产品定义

PromptNote 是一个 **manual-first、syntaxless、rich-text Prompt editor**。

它解决的问题不是“让 AI 替用户写 Prompt”，而是：

> 用户已经知道自己大致想说什么，但不想学习 Markdown、XML 或 Prompt Engineering 语法；PromptNote 负责让这些内容更容易书写、组织、检查并输出为标准结构。

一句话定位：**像写文档一样写 Prompt。**

## 2. 目标用户

V1 面向经常使用 ChatGPT、Claude、Gemini、Codex 等 AI 工具，但不希望把大量时间花在 Prompt 格式语法上的个人用户，尤其是：

- 需要写较长任务说明的开发者或产品人员；
- 经常写约束、验收条件、上下文和示例的用户；
- 不熟悉 Markdown，但希望 Prompt 结构清晰的用户；
- 不希望 AI 自动改写原意，希望自己保持最终控制权的用户。

V1 不为企业 PromptOps 团队、模型评测平台或 Agent 编排平台设计。

## 3. 核心产品原则

### P1. 用户是作者，AI 是助手

AI 的局部改写、结构建议、歧义检查必须由用户主动触发，并且先展示 suggestion / diff，再由用户接受。

编辑器内联补全是唯一允许自动请求 AI 的例外，但必须同时满足：

- AI 已配置成功；
- AI 辅助总开关已启用；
- 用户另行打开“编辑器内联补全”开关。

补全只以灰色 ghost text 展示，不进入正文；只有用户按 `Tab` 接受后才成为 PromptDocument 内容，`Esc` 可忽略。补全开关默认关闭。

### P2. 编辑格式与输出格式分离

用户编辑的是富文本 PromptDocument，不是 Markdown、XML 或 JSON。

Markdown / XML / Plain Text 是 Compiler 的输出，不得成为另一份可独立修改的内容状态。

### P3. 不要求用户学习语法

用户可以只输入自然文本。结构化能力通过视觉块、Slash Menu、快捷操作等提供。

### P4. 结构化是辅助，不是表单化

PromptNote 不是由 Role / Goal / Context 等输入框组成的固定表单。用户始终可以像普通文档一样自由写作；语义结构块是可选能力。

### P5. 轻量、打开即写

V1 不依赖注册、服务器或云端数据库。Chrome / Edge Extension 的 Side Panel 是主要入口。

### P6. 模型中立

PromptDocument 不与单一模型绑定。AI Provider 差异只存在于 AI assistance 层，不得产生模型专用正文副本。

### P7. 主链优先

任何新功能都必须能明确增强以下至少一个环节：写、整理、检查、编译、复制。

## 4. V1 核心场景

### 场景 A：自由写 Prompt

用户打开 Side Panel，像写普通文档一样直接输入长 Prompt，不需要理解任何特殊语法。

### 场景 B：快速结构化

用户输入 `/`，插入目标、背景、任务、约束、示例、输出格式、验收标准等语义块，或把已有段落转换为这些块。

### 场景 C：获得局部 AI 帮助

用户选中一段文字后，Side Panel 底部操作栏上方出现稳定的选区工具条，可直接执行“改清楚 / 缩短 / 拆约束 / 更多 AI”，并可在单一文本块内转换文本类型。选区操作不得依赖漂浮在文字旁的微型按钮、浏览器 DOM selection 坐标或二次展开入口。

全局 AI 动作包括检查歧义、补充验收标准和结构建议。AI 返回结果先作为建议呈现，不直接覆盖原文。

如果用户主动开启“编辑器内联补全”，光标停顿后可出现 IDE 风格灰色续写；`Tab` 接受，`Esc` 忽略。关闭补全后不得后台调用 Provider。

### 场景 D：输出标准 Prompt

同一 PromptDocument 可编译为：

- Plain Text；
- Markdown；
- XML。

用户通过 Copy 将结果带到目标 AI 工具；V1 不再维护网页 DOM 注入/写入链路。

## 5. V1 必须具备

- Chrome / Edge Manifest V3 Extension；
- Side Panel 主编辑界面；
- TipTap 富文本编辑器；
- Slash Menu；
- Prompt 语义块；
- 本地保存与恢复；
- PromptDocument 唯一内容源；
- Plain Text / Markdown / XML Compiler；
- Copy；
- AI assistance 接口边界和无 AI 降级路径；
- 可独立启停的 IDE 风格编辑器内联补全；
- 最基本的 Prompt lint；
- 导入/导出可恢复的 PromptDocument 数据。

## 6. V1 明确不做

以下内容除非本文件被明确修改，否则不得作为“顺便做”加入 V1：

- Prompt Marketplace；
- Prompt 社区、排行榜、公开分享平台；
- 团队协作、组织、RBAC；
- 云端账号体系；
- 后端数据库；
- Agent Workflow / Agent Builder；
- MCP 平台；
- 模型 Playground；
- 模型调用监控、成本分析；
- Prompt A/B Test；
- 大型模板市场；
- 自动整篇重写并覆盖用户原文；
- 每个模型维护一份独立 Prompt 内容；
- 复杂云同步；
- 网页 DOM 注入、Web Adapter、自动写入第三方网页输入框；
- 自动提交/发送 Prompt；
- 移动端原生 App；
- Electron 桌面端。

## 7. V1 成功标准

V1 不是以“功能数量”验收，而以主链验收：

1. 用户不懂 Markdown，也能完成一份结构清晰的 Prompt；
2. 用户可以从自由文本逐步增加结构，而不是先填表；
3. 用户可以清楚区分“自己的原文”“AI 建议”和“尚未接受的灰色补全”；
4. Plain Text / Markdown / XML 均由同一 PromptDocument 稳定编译；
5. 刷新或关闭 Side Panel 后，内容不会丢失；
6. 最终 Prompt 可以稳定复制到任意目标工具，不依赖目标网站 DOM；
7. 禁用 AI 或关闭补全时，核心编辑、结构化、编译和 Copy 仍完整可用；
8. 补全只有在 AI 已配置、AI 已启用且补全开关开启时才允许自动请求 Provider；
9. 选中文字后的局部操作入口在窄 Side Panel 中必须稳定可见、可点击，不依赖文字旁的浮动 `•••`。

## 8. 范围变更规则

任何超出当前 V1 的能力，应先回答：

- 它解决哪个已定义的核心场景？
- 不做它是否阻断主链？
- 是否引入新的状态源、后端、账号体系或平台职责？
- 是否可以放到 V1 之后？

如果不能直接证明其必要性，默认延期，而不是加入当前实现。
