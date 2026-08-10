# PromptNote V1 Release Notes

## V1 状态

PromptNote V1 主链已完成并经过真实 Chrome / Edge 验收：写作 → Slash 结构化 → AI suggestion / opt-in 内联补全 → Prompt lint → Preview → Copy → 本地文档管理与恢复。

## 主要能力

- Chrome / Edge Manifest V3 Side Panel Extension。
- TipTap / ProseMirror 富文本编辑器与单一 `promptSection.kind` 语义块模型。
- Contextual Slash Command：块首/行首或空白后 `/` 打开结构菜单；URL、日期、`A/B` 等正文中的 `/` 保持普通字符；菜单支持方向键、Home/End、Enter 与 Esc。
- `PromptDocument` 作为唯一持久正文源，`chrome.storage.local` 自动保存、文档切换、JSON 备份与恢复。
- Plain Text / Markdown / XML Compiler 与 Copy。
- 本地 Prompt lint、SelectionActionBar、全局/选区 AI suggestion。
- 用户显式开启的 IDE 风格内联补全：block-local context、streaming、Tab 接受、Esc 忽略、IME suppression、stale cancellation、transient retry 与错误恢复。
- 同 ID 备份覆盖使用合法递增 revision；旧 autosave callback 无权回退较新保存状态。
- 根级 Runtime Error Boundary，避免 React 运行时异常退化为无信息白屏。

## V1 验收

- Chrome 主链、补全、快速输入保存状态、同 ID 恢复覆盖、浏览器重启恢复、AI 禁用/失败降级已通过真实浏览器验证。
- Edge 已完成当前 Manifest / 主链 smoke。
- Chrome Side Panel 在实际可拖到的约 382px 宽度下仍可用，核心操作无遮挡、无横向溢出。
- Slash 键盘导航与普通 `/` 输入均已真机验证。
- GitHub Actions 门禁包含 license audit、TypeScript、ESLint、unit tests 与 production extension build。

## Known Limitations

- V1 本地优先，无账号、后端、云同步或多设备同步；数据保存在浏览器扩展本地存储中。
- `chrome.storage.local` 不是加密保险库；AI API Key 仍应视为本机扩展偏好，而不是高安全密钥托管。
- PromptNote 不向 ChatGPT、Claude、Gemini 等第三方网页输入框注入内容；V1 外部交付统一使用 Copy。
- Side Panel 的实际最小/最大宽度由浏览器宿主控制；PromptNote 只保证在浏览器允许的窄宽范围内布局可用。
- TipTap/ProseMirror `PromptEditor` 当前同步打包。2026-08-08 的真实 Chrome 回归证明 runtime `React.lazy + dynamic import()` 会导致 Side Panel 短暂显示后白屏，因此 V1 明确不采用该拆分。当前生产构建保留 Vite `>500KB` warning，不通过提高 warning limit 掩盖。
- AI 行为受用户配置的 Provider、模型、网络、额度与兼容网关影响；Provider 失败不会阻断编辑、保存、Lint、Compiler、Preview 或 Copy。
