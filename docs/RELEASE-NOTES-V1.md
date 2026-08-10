# PromptNote 1.0.0 Release Notes

PromptNote 1.0.0 是第一个面向普通用户发布的稳定版本。

## 主要能力

- Chrome / Edge Manifest V3 Side Panel Extension；
- TipTap / ProseMirror 富文本编辑器；
- contextual Slash Command 与 Prompt 语义块；
- 本地 Prompt 文档管理、自动保存、JSON 备份与恢复；
- Plain Text / Markdown / XML Preview 与 Copy；
- 本地 Prompt Check；
- 选区 AI suggestion 与全局 AI 辅助；
- 用户主动开启的 IDE 风格内联补全：block-local context、streaming、Tab 接受、Esc 忽略、IME suppression、stale cancellation 与短时错误恢复；
- OpenAI-compatible / Anthropic Provider；
- 根级 Runtime Error Boundary。

## Slash Command

在块首 / 行首或空白后输入 `/` 打开结构菜单。菜单支持方向键、Home / End、Enter 与 Esc。

普通正文中的 `/` 保持普通字符，例如 URL、日期与 `A/B`。菜单打开后按 Esc 可以写回一个普通 `/`。

## 数据与隐私

- Prompt 文档和设置默认保存在浏览器扩展本地存储；
- 没有 PromptNote 自有账号、后端或云数据库；
- 没有广告或第三方统计 SDK；
- AI 请求直接发往用户配置的 Provider；
- 固定 Manifest 权限只有 `storage` 与 `sidePanel`。

完整隐私说明见仓库根目录 `PRIVACY.md`。

## 验收状态

1.0.0 已完成真实 Chrome / Edge 主链验证，包括：编辑、Slash、AI suggestion、内联补全、Prompt Check、Preview、Copy、文档切换、备份恢复、浏览器重启恢复、AI 禁用 / 失败降级、快速 autosave 与窄 Side Panel。

最新生产门禁包含 dependency license audit、TypeScript、ESLint、unit tests 与 Extension build。

## Known Limitations

- 当前没有账号、云同步或多设备同步；
- `chrome.storage.local` 不是专用加密保险库；
- PromptNote 不向第三方网页输入框自动注入内容；外部交付统一通过 Copy；
- Side Panel 实际宽度范围由 Chrome / Edge 宿主控制；
- AI 效果与可用性依赖用户配置的 Provider、Model、网络与额度；
- PromptEditor 当前采用稳定优先的同步打包，生产构建保留 Vite `>500KB` warning。该 warning 不影响已经完成的真实浏览器功能验收。
