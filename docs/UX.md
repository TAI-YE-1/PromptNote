# UX — PromptNote / 提词笺

本文件定义 PromptNote 共享用户体验主链和宿主交互边界。Desktop 的系统级 shell 细节以 `DESKTOP.md` 为权威。

## 1. 核心体验

无论从 Browser Side Panel 还是 Desktop 进入，核心主链保持一致：

```text
进入 PromptNote
  ↓
直接自然书写
  ↓
可选使用 / 增加结构
  ↓
可选使用 Prompt Check / AI 辅助 / 内联补全
  ↓
预览 Plain / Markdown / XML
  ↓
复制到目标 AI 工具
```

PromptNote 不向第三方网页或桌面应用输入框自动写入或自动发送内容。

## 2. 编辑器

默认体验接近普通文档：打开即可输入，不要求先选择模板、角色或 Prompt 类型。

支持标题、段落、列表、代码块、引用和 Prompt 语义块。语义块必须有常态可见的视觉边界，但不能把编辑器做成固定表单或重型卡片墙。

标题可以直接编辑。正文和标题都由同一 PromptDocument 驱动并通过当前宿主 PromptRepository 自动保存。

Browser 与 Desktop 不维护不同版本的 Editor UX。

## 3. Slash Command

`/` 是上下文命令，不是全局保留字符。

- 空选区且位于块/行首，或前一个字符为空白时输入 `/` → 打开结构菜单；
- URL、日期、路径、`A/B` 等正文中的 `/` → 正常输入；
- 菜单支持 `↑` / `↓`、`Home` / `End`、`Enter`；
- 菜单打开后按 `Esc` → 关闭菜单并保留普通 `/`。

当前语义块：目标、背景、任务、约束、示例、输出格式、验收标准。

自由文本和语义块可以混写、转换、删除标签并保留文字、任意调整顺序。

## 4. 选区操作

选中文字后，在主操作栏上方显示稳定的 `SelectionActionBar`。

主要操作：改清楚、缩短、拆约束、更多 AI、当前单块文本类型转换。

选区跨多个文本块时，文本 AI 动作仍可执行，但类型转换必须禁用。

不得重新引入依赖文字旁坐标的微型浮动入口或第二套选区状态。

Desktop V1 的悬浮球是应用入口，不是“选中文字旁的 AI 浮层”，两者不得混淆。

## 5. AI 辅助

### AI 总开关与内联补全分离

只有以下条件同时成立，才允许自动请求内联补全：

```text
AI 已配置
AND AI 辅助已开启
AND 内联补全已开启
```

内联补全默认关闭。关闭 AI 后，补全同时失效。

### Suggestion / advisory

选区与全局 AI 动作由用户显式触发。AI 结果先显示为 suggestion / advisory，只有用户接受后才能修改正文。正文已变化导致建议过期时，不得继续应用旧建议。

### Inline completion

- caret 稳定后可在当前位置显示低对比度 ghost text；
- 只基于当前正在编辑的文本块构建有限局部上下文；
- 不跨多个语义块偷偷拼接正文；
- IME composition 阶段不请求；
- `Tab` 接受，`Esc` 忽略；
- 新输入、移动 caret、切块、切文档、失焦或相关设置变化会使旧补全失效；
- ghost 不属于 PromptDocument，不自动保存，也不进入 Compiler；
- Provider 临时错误可以有限恢复，持久配置/认证/额度错误必须向用户显示真实原因；
- 用户关闭补全后不得继续自动请求。

补全应短、局部、延续当前意图，不自动生成整篇 Prompt。

## 6. AI 设置

顶部提供轻量状态入口：AI 未配置、AI 已连接、AI · 补全开、AI 已关闭。

设置包括：AI 总开关、内联补全独立开关、Provider、Model、API Base URL、API Key、内容范围、测试连接，以及补全模型、上下文长度、触发延迟等高级设置。

Provider、Model、credential 和补全设置属于宿主 Preferences / SecretStore，不属于 PromptDocument。

## 7. Prompt Check

本地 Prompt Check 用于提示潜在问题，不给 Prompt 打总分，也不阻止用户继续编辑或复制。

AI 深度检查是可选的显式动作。AI 未配置或失败时，本地检查仍可使用。

## 8. Preview 与 Copy

编辑页底部保留三个主动作：

```text
检查    预览    复制
```

编辑页“复制”固定复制 Plain Text。Preview 可切换 Plain Text / Markdown / XML，并复制当前格式。

Preview 是只读派生视图，不是第二编辑器。

## 9. 文档管理与备份

Document Sheet 支持文档列表、搜索、新建、切换、删除、导出和导入。

恢复同 ID 备份时必须明确让用户选择覆盖现有文档或另存副本，不允许静默覆盖。

Browser 与 Desktop V1 不自动同步；JSON 导出 / 导入是显式跨宿主迁移入口。

## 10. Browser Side Panel

Browser 核心交互必须在真实窄 Side Panel 下保持可用，不产生必须横向滚动才能完成的主操作。

Slash、Sheet、SelectionActionBar 和内联补全的关键操作都应可通过键盘完成。

Browser 不因 Desktop 上线而增加网页注入、页面读取或自动发送能力。

## 11. Desktop shell

Desktop 使用四种宿主状态：

```text
Tray Background
Orb
Docked Panel
Full Window
```

详细状态转换、尺寸、贴边、全屏、多显示器、Always-on-top、关闭与退出语义全部以 `DESKTOP.md` 为准。

共享 UX 只规定：

- Orb 只是低干扰入口，不承载正文；
- 单击 Orb 展开 / 收起 Docked Panel，不使用 hover 自动展开；
- Docked Panel 直接承载同一个 Prompt 编辑器；
- Full Window 仍编辑同一份 PromptDocument；
- Tray、Orb、Panel、Window 的切换不得复制正文或产生未同步编辑器；
- 用户必须能完全隐藏 Orb，只保留 Tray + Global Shortcut。

## 12. 错误与降级

- 保存失败必须可见；
- AI 失败必须显示真实、可理解的原因；
- AI 失败不能阻断编辑、保存、本地检查、Preview 或 Copy；
- React 运行时错误应显示错误界面和恢复入口，不能退化为空白页面；
- Desktop bridge / shell 失败不得显示假成功；
- 不显示假成功。
