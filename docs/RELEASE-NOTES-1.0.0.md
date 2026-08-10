# PromptNote 1.0.0 Release Notes

PromptNote 1.0.0 是第一个面向普通用户发布的稳定版本。

## 主要能力

- Chrome / Edge Side Panel；
- 富文本 Prompt 编辑与语义结构块；
- contextual Slash Command；
- 本地自动保存、文档管理、JSON 备份与恢复；
- Plain Text / Markdown / XML 预览与复制；
- 本地 Prompt Check；
- 选区和全局 AI suggestion；
- 用户主动开启的 IDE 风格内联补全；
- OpenAI-compatible / Anthropic Provider。

## Slash Command

在块首、行首或空白后输入 `/` 打开结构菜单。普通正文中的 `/` 保持普通字符，例如 URL、日期和 `A/B`。菜单支持键盘选择；按 `Esc` 可以取消命令并保留普通 `/`。

## 数据与隐私

- Prompt 文档和设置默认保存在浏览器扩展本地存储；
- 没有 PromptNote 自有账号、后端或云数据库；
- 没有广告或第三方统计 SDK；
- AI 请求直接发往用户配置的 Provider；
- 固定 Manifest 权限只有 `storage` 与 `sidePanel`。

完整说明见根目录 `PRIVACY.md`。

## 开源许可

PromptNote 源码采用 Mozilla Public License 2.0（MPL-2.0）发布，完整条款见根目录 `LICENSE`。第三方依赖继续遵循各自许可证。

## 已知限制

- 当前没有账号、云同步或多设备同步；
- `chrome.storage.local` 不是专用加密保险库；
- PromptNote 不向第三方网页输入框自动注入内容；
- Side Panel 宽度范围由浏览器宿主控制；
- AI 效果与可用性依赖用户配置的 Provider、Model、网络与额度。
