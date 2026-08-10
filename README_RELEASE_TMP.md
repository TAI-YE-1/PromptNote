# PromptNote / 提词笺

> 像写文档一样写 Prompt。

PromptNote 是一款本地优先的 Chrome / Edge Side Panel Prompt 编辑器。你可以像写普通文档一样组织 Prompt，不需要先学习 Markdown、XML 或复杂的 Prompt Engineering 语法。

当前正式版本：**1.0.0**

## 你可以用它做什么

- 像普通文档一样自由书写 Prompt；
- 使用 `/` 快速插入目标、背景、任务、约束、示例、输出格式、验收标准等结构块；
- 选中文字后进行“改清楚 / 缩短 / 拆约束”等可选 AI 辅助；
- 主动开启 IDE 风格内联补全，`Tab` 接受、`Esc` 忽略；
- 使用本地 Prompt Check 检查常见问题；
- 预览并复制 Plain Text / Markdown / XML；
- 本地保存多个 Prompt，并导出 / 恢复 JSON 备份。

PromptNote 不向 ChatGPT、Claude、Gemini 等网页输入框自动注入内容。最终输出统一通过 **Copy** 完成。

## 安装

### 正式发行包

在浏览器商店上架前，仓库的 `main` CI 会生成与当前正式版本对应的安装包 artifact：

1. 打开本仓库的 **Actions**；
2. 进入最新一次成功的 `ci`；
3. 在 Artifacts 下载 `promptnote-1.0.0`；
4. 解压得到扩展目录；
5. Chrome 打开 `chrome://extensions`，Edge 打开 `edge://extensions`；
6. 开启开发者模式，选择“加载已解压的扩展程序”，选择解压后的目录。

后续浏览器商店版本上线后，普通用户应优先通过商店安装和自动更新。

### 从源码构建

仅开发者需要：

```bash
npm ci
npm run build
```

构建输出位于 `dist/`。

## 基本使用

### 1. 直接写

打开 Side Panel 后直接输入内容即可。标题可以直接点击修改，正文会自动保存到浏览器本地。

### 2. 使用 `/` 结构化

在块首 / 行首或空白后输入 `/` 会打开结构菜单，可用方向键选择并按 `Enter` 插入。

普通正文中的 `/` 不会被抢占，例如：

```text
https://openai.com
2026/08/10
A/B 测试
```

如果菜单打开后只是想输入一个普通 `/`，按 `Esc` 即可。

### 3. 使用 AI（可选）

AI 不是必需功能。未配置或关闭 AI 时，编辑、保存、检查、预览和复制仍可正常使用。

PromptNote 支持 OpenAI-compatible / Anthropic Provider。你需要自行提供 Provider、Model、API Base URL 与 API Key。

只有以下情况会发送内容到 AI Provider：

- 你主动执行 AI 建议 / AI 检查；
- 你已经配置 AI，并主动打开“编辑器内联补全”。

内联补全默认关闭。

### 4. 备份

Prompt 文档自动保存在浏览器扩展本地存储中。建议重要 Prompt 定期导出 JSON 备份。

同 ID 备份恢复支持明确覆盖或另存副本。

## 隐私

PromptNote V1.0：

- 没有账号系统；
- 没有 PromptNote 自有后端；
- 没有云数据库；
- 没有广告或第三方统计 SDK；
- Prompt 与 AI 设置默认保存在 `chrome.storage.local`；
- AI 请求直接发往你配置的 Provider。

完整说明见 [`PRIVACY.md`](PRIVACY.md)。

## 浏览器权限

固定权限只有：

```text
storage
sidePanel
```

AI 自定义地址使用 optional host permission。

PromptNote 不需要 `activeTab`、`scripting` 或第三方网页 content script。

## 已知限制

- 当前没有账号、云同步或多设备同步；
- `chrome.storage.local` 不是专用加密保险库；
- AI 效果、速度与可用性取决于你配置的 Provider / Model / 网络 / 额度；
- Side Panel 的最小和最大宽度由浏览器宿主控制；
- 当前 PromptEditor 为稳定优先的同步打包，生产构建仍保留 Vite `>500KB` warning，该 warning 不影响已完成的 Chrome / Edge 功能验收。

## 版本说明

见 [`docs/RELEASE-NOTES-V1.md`](docs/RELEASE-NOTES-V1.md)。

## 开发与维护

面向维护者的架构资料保留在 `docs/`：

- `PRODUCT.md`
- `UX.md`
- `PROMPT-DOCUMENT-CONTRACT.md`
- `ARCHITECTURE.md`
- `DECISIONS.md`

AI / Agent 参与维护前请阅读 [`AGENTS.md`](AGENTS.md)。正式发布操作见 [`docs/PUBLISHING.md`](docs/PUBLISHING.md)。

## 授权

当前仓库尚未声明开源许可证。源码复制、修改、再分发或商业使用的授权方式，需由项目所有者另行明确。