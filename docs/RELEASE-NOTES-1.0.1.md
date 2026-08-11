# PromptNote 1.0.1 Release Notes

PromptNote 1.0.1 是一个稳定性补丁版本，不新增产品权限或数据用途。

## 修复

- 修复 Slash Command 在模块开头切换结构类型时可能创建额外模块的问题，现在会在合法位置原地转换当前块；
- 修复部分 Slash / AI 追加场景可能触发 ProseMirror `Inserted content deeper than insertion position` 的问题；
- Slash Menu 现在以真实 ProseMirror caret 坐标定位，在编辑器中下部输入 `/` 时仍会跟随当前编辑位置；
- 修复 Slash Menu `↑` / `↓`、`Home` / `End`、`Enter` 键盘选择的可见反馈，当前选中项会清晰高亮；
- 保持普通正文中的 URL、日期、路径和 `A/B` 等 `/` 输入行为不变。

## 兼容与隐私

- PromptDocument Schema 未变化；
- `chrome.storage.local` 数据格式未变化；
- 固定 Manifest 权限仍只有 `storage` 与 `sidePanel`；
- optional host permission 范围未变化；
- AI Provider、API Key 和 Prompt 数据处理方式未变化；
- 不新增账号、后端、遥测、广告或云同步。

完整隐私说明见根目录 `PRIVACY.md`。
