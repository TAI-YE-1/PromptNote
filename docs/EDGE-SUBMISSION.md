# PromptNote 1.0.0 — Microsoft Edge Add-ons 提交材料

本文件用于 Microsoft Partner Center 的 Edge 扩展提交。正式 Logo、商店截图方案和其余提交字段均已按 PromptNote 1.0.0 的真实行为准备好，可直接使用。

最后核对：2026-08-10

## 1. 上传包

GitHub Actions 下载 `promptnote-1.0.0` artifact 后，先解压外层 artifact，再上传其中真正的：

```text
promptnote-1.0.0.zip
```

ZIP 根目录必须直接包含 `manifest.json`、`sidepanel.html`、`icons/` 和构建后的 JS/CSS 文件，不要把外层 artifact ZIP 直接提交到 Partner Center。

## 2. Availability

- Visibility：`Public`
- Markets：`All markets`

PromptNote 的核心编辑能力不依赖地区性账号或 PromptNote 自有服务器，因此第一版没有必要限制市场。

## 3. Properties

### Category

推荐：`Productivity`

### Website

```text
https://github.com/TAI-YE-1/PromptNote
```

### Support contact detail

```text
https://github.com/TAI-YE-1/PromptNote/issues
```

### Mature content

```text
No
```

## 4. Privacy

### Single Purpose Description

```text
PromptNote 在 Microsoft Edge Side Panel 中帮助用户编写、组织、检查、预览和复制 Prompt，并在用户主动配置与启用时提供可选 AI 辅助。
```

### Permission justification — storage

```text
用于在 Microsoft Edge 扩展本地存储中保存 Prompt 文档、最近文档信息、AI 配置与编辑器偏好。PromptNote 没有自有云数据库，核心文档不会同步到 PromptNote 服务器。
```

### Permission justification — sidePanel

```text
用于提供 PromptNote 的主要编辑界面。用户通过 Microsoft Edge Side Panel 编写、结构化、检查、预览和复制 Prompt。
```

### Permission justification — optional host permissions

```text
仅用于访问用户在 AI 设置中主动填写并授权的 AI Provider。公网 Provider 只允许 HTTPS；HTTP 仅保留 localhost / 127.0.0.1 本地回环地址。PromptNote 不使用这些权限读取或修改第三方网页。
```

### Remote code

选择：

```text
No, I am not using remote code.
```

说明：PromptNote 是 Manifest V3 扩展，不下载、注入或执行远程 JavaScript/WASM。AI Provider 只返回文本数据，不作为可执行代码运行。

### Data usage

如果 Partner Center 询问扩展是否会访问、存储或传输个人信息，不要笼统选择“完全没有”。真实行为是：

```text
Prompt 文档、设置和 API Key 默认保存在 Microsoft Edge 扩展本地存储中，PromptNote 没有自有账号、后端、遥测或分析服务器。

只有用户主动配置 AI Provider、授予对应站点权限并启用 AI 后，PromptNote 才会把当前 AI 功能所需的 Prompt 内容和认证信息直接发送到用户选择的 Provider。普通 AI 动作由用户主动触发；编辑器内联补全默认关闭，只有用户另外开启后才会自动请求。关闭 AI 或关闭内联补全会立即停止对应 AI 请求。

PromptNote 不出售用户数据，不用于广告、画像、数据经纪或与 PromptNote 无关的用途。
```

数据类型复选框的名称可能随 Partner Center UI 调整。若页面出现对应选项：

- API Key 属于认证信息，应如实勾选与 authentication / credentials 对应的类别；
- Prompt 内容属于用户主动提供的内容；若页面提供 user-provided content / personal communications 等与实际含义匹配的类别，应如实选择；
- 不要勾选位置、浏览历史、金融、健康等 PromptNote 不主动采集的数据类型。

如页面字段名称与上述不同，以“如实披露本地存储 + 用户主动 AI 传输”的原则填写，不为了减少披露而选择不准确答案。

### Privacy Policy URL

```text
https://github.com/TAI-YE-1/PromptNote/blob/main/PRIVACY.md
```

## 5. Store listing — 中文

### Extension name

由 manifest 提供：

```text
PromptNote / 提词笺
```

### Short description

由 manifest 提供：

```text
像写文档一样写 Prompt：结构化编辑、检查、预览、复制，并提供可选 AI 辅助与内联补全。
```

### Description

```text
PromptNote / 提词笺是一款本地优先的 Microsoft Edge Side Panel Prompt 编辑器，帮助你像写普通文档一样编写和整理 Prompt，而不必先学习 Markdown、XML 或复杂的 Prompt Engineering 语法。

你可以自由输入富文本，也可以使用 / 快速插入“目标、背景、任务、约束、示例、输出格式、验收标准”等结构块；选中文字后可以使用“改清楚、缩短、拆约束”等可选 AI 辅助；本地 Prompt Check 可以发现常见问题；同一份 Prompt 可预览并复制为 Plain Text、Markdown 或 XML。

PromptNote 默认把 Prompt 文档和设置保存在 Microsoft Edge 的扩展本地存储中，不需要注册账号，也没有 PromptNote 自有后端、云数据库、广告或第三方统计 SDK。你可以创建多个 Prompt，并通过 JSON 导出和恢复备份。

AI 功能完全可选。未配置 AI 时，编辑、结构化、保存、检查、预览和复制仍可正常使用。需要 AI 时，你可以自行配置 OpenAI-compatible 或 Anthropic Provider。普通 AI 动作只有在你主动触发时才会发送内容；内联补全默认关闭，只有你主动开启后才会在编辑停顿时请求短续写，Tab 接受、Esc 忽略。

PromptNote 不会向 ChatGPT、Claude、Gemini 等第三方网页输入框自动注入或自动发送 Prompt。最终内容由你通过 Copy 主动带到目标工具。
```

### Search terms

最多使用 7 个。建议：

```text
Prompt
提示词
Prompt 编辑器
结构化 Prompt
AI 写作
AI 辅助
提示词优化
```

### YouTube video

第一版留空。

## 6. 视觉素材

### 正式 Logo

Edge 商店上传用：

```text
docs/store-assets/icon-300.png
```

扩展安装包使用：

```text
public/icons/icon-16.png
public/icons/icon-32.png
public/icons/icon-48.png
public/icons/icon-128.png
```

`manifest.json` 已配置顶层 `icons` 和 `action.default_icon`。

### 商店截图

第一版使用 4 张 `1280 × 800` PNG：

```text
screenshot-01-editor.png
screenshot-02-slash-menu.png
screenshot-03-ai-assist.png
screenshot-04-preview-copy.png
```

内容依次覆盖：主编辑器、Slash Menu、AI 辅助 / 内联补全、Preview + Copy。截图不包含真实 API Key、私人 Prompt、邮箱、访问令牌或其他敏感信息。

仓库内可维护源文件：

```text
docs/store-assets/store-screenshots-source.html
```

Small promotional tile（`440 × 280`）和 Large promotional tile（`1400 × 560`）第一版均可不提交。

## 7. Notes for certification

```text
PromptNote is a local-first Microsoft Edge Side Panel prompt editor. No account or PromptNote-hosted backend is required.

Core test flow:
1. Open PromptNote from the Edge extension action to show the Side Panel.
2. Type normal text in the editor and edit the document title.
3. At the start of a block or after whitespace, type "/" and use the keyboard to insert a semantic section such as Goal, Context, Task, Constraint, Example, Output Format, or Acceptance Criteria.
4. Use Check to run the local Prompt Check.
5. Use Preview to switch between Plain Text, Markdown, and XML.
6. Use Copy to copy the compiled Prompt.
7. Open the document manager to create another Prompt and test JSON export/import.

AI is optional and is not required to test the core product. PromptNote does not provide or require a PromptNote account. If the reviewer wants to test AI features, they may configure their own OpenAI-compatible or Anthropic HTTPS API endpoint and API key. The extension requests host access only for the provider origin chosen by the user. Local HTTP is limited to localhost / 127.0.0.1.

The inline completion feature is disabled by default and must be explicitly enabled after a successful AI connection test. PromptNote does not inject content into third-party webpages, does not use remote executable code, and does not contain ads or analytics SDKs.

Source code is publicly available under MPL-2.0 at:
https://github.com/TAI-YE-1/PromptNote
```

## 8. 提交前最终检查

- [ ] 使用最新成功 CI 生成的 `promptnote-1.0.0.zip`；
- [ ] 上传包后确认 manifest 显示版本 `1.0.0`；
- [ ] Category = Productivity；
- [ ] Public + All markets；
- [ ] Mature content = No；
- [ ] Privacy URL 可匿名访问；
- [ ] Remote code = No；
- [ ] 权限说明与 manifest 完全一致；
- [ ] 数据使用声明没有把 AI 传输错误写成“完全不传数据”；
- [x] 正式 Logo 文件已准备；
- [x] 4 张商店截图已准备；
- [ ] Edge Partner Center 中已上传 Logo 和截图；
- [ ] Notes for certification 已粘贴；
- [ ] 最后点击 Publish 前再次核对扩展名、短描述和版本号。

## 9. 官方依据

- Microsoft Edge 扩展发布流程：`https://learn.microsoft.com/en-us/microsoft-edge/extensions/publish/publish-extension`
- Microsoft Edge Add-ons Developer Policies：`https://learn.microsoft.com/en-us/legal/microsoft-edge/extensions/developer-policies`
