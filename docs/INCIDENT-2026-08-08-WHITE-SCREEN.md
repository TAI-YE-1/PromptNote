# Incident — 2026-08-08 Side Panel 白屏

## 用户真实症状

真实 Chrome 中，曾有一版 PromptNote Side Panel 打开后先正常显示约 0.1 秒，随后整页白屏，产品不可用。

## 根因关联变更

故障前刚把 TipTap/ProseMirror `PromptEditor` 从主 Side Panel bundle 改成 `React.lazy + dynamic import()` 的运行时 chunk。静态 CI 当时完全通过，但真实 Chrome 立即暴露运行时回归。

该事故证明：对 Extension Side Panel 的运行时模块加载变化，TypeScript、单测和 production build 只能作为静态门禁，不能替代真实 Chrome / Edge 验收。

## 修复

1. 撤销 PromptEditor 的运行时 lazy/dynamic import，恢复同步打包；保留同 ID 备份覆盖、revision guard、autosave version ownership、completion 等其它修复。
2. 新增根级 `RuntimeErrorBoundary`。未来 React 运行时异常必须显示 `PromptNote 运行失败`、真实 error message 与“重新打开”，不得再次无信息整页白屏。
3. 不调高 Vite `chunkSizeWarningLimit`。同步主 bundle 的 `>500KB` warning 明确保留。
4. 最终收口时 `PromptNoteApp` 直接 import `PromptEditor`，删除只剩 re-export 的 `LazyPromptEditor.tsx`，避免旧架构命名继续误导后续开发。
5. D023 正式 supersede D022 中仅与 PromptEditor runtime lazy split 有关的决定；D022 的 revision ownership、同 ID 覆盖与 Editor object identity 规则继续有效。

## 静态验证

紧急修复后和后续 V1 构建持续通过：

- dependency/license audit；
- TypeScript；
- ESLint；
- unit tests；
- Extension production build。

静态门禁本身不作为事故关闭证据。

## 真实浏览器关闭证据

后续最新同步 PromptEditor 构建已经在真实 Chrome 中持续使用并通过：

- Side Panel 稳定打开和持续编辑，不再出现“约 0.1 秒 → 白屏”；
- 预存长文本与普通输入的 AI 内联补全恢复正常；
- contextual Slash、方向键/Enter/Esc、普通 `/` 输入正常；
- 自动保存、同 ID 备份恢复、浏览器重启恢复、Preview/Copy 等其它主链正常；
- Chrome Side Panel 真机约 382px 窄宽下仍可用；
- Edge 当前构建完成主链 smoke。

因此本事故在 PromptNote V1 中已关闭。

## 后续约束

- V1 保持 PromptEditor 同步打包；
- AI Settings / Document Sheet 等非首屏 Sheet 可以继续按需加载；
- 禁止通过提高 warning limit 掩盖 bundle 体积；
- 若未来重新评估 PromptEditor runtime lazy split，必须先建立可重复的 Chrome + Edge 真机验证，并同时验证首次打开、持续输入、关闭/重开 Side Panel，不允许只凭 CI 通过接受该变化。

## 文档状态

原先 `TASKS.md`、`DECISIONS.md`、`ARCHITECTURE.md`、`AGENTS.md`、`UX.md` 中关于 PromptEditor lazy split 已成功的旧描述已在 V1 收口中修正；README 与 V1 release notes 也以同步 PromptEditor 为当前事实。
