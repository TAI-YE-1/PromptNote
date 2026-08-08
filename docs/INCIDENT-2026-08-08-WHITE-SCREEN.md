# Incident — 2026-08-08 Side Panel 白屏

## 用户真实症状

真实 Chrome 中，上一最终构建打开 PromptNote Side Panel 后先正常显示约 0.1 秒，随后整页白屏，产品不可用。

## 最近相关变更

上一轮刚把 TipTap/ProseMirror `PromptEditor` 从主 Side Panel bundle 改成 `React.lazy + dynamic import()` 的运行时 chunk。静态 CI 当时完全通过，但没有真实 Chrome 证据。

## 紧急修复

1. 撤销 PromptEditor 的运行时 lazy/dynamic import，恢复同步打包；保留同 ID 备份覆盖、revision guard、autosave version ownership、completion 等其它修复。
2. 新增根级 `RuntimeErrorBoundary`。未来 React 运行时异常必须显示 `PromptNote 运行失败`、真实 error message 与“重新打开”，不得再次无信息整页白屏。
3. 不调高 Vite `chunkSizeWarningLimit`。同步主 bundle 回到约 `618.05 kB / gzip 195.78 kB`，`>500KB` warning 明确保留。

## 静态验证

修复代码 HEAD `f53b2cb63f34bf28229104d063e3719ee7817ffe` 的 CI：

- dependency/license audit：通过；
- TypeScript：通过；
- ESLint：通过；
- 21 个测试文件 / 97 个测试：通过；
- Extension build：通过。

CI 不能证明真实 Chrome 白屏已经关闭。

## 下一步真实验证

1. `git pull`
2. `npm run build`
3. `chrome://extensions` 对 PromptNote 点击 Reload
4. 打开 Side Panel，至少观察 10 秒并尝试输入
5. 若仍白屏/崩溃，记录 Runtime Error Boundary 显示的完整错误；同时打开 Side Panel DevTools Console 获取首个 runtime error 和 stack

在真实 Chrome/Edge 稳定前，禁止重新引入 PromptEditor runtime lazy split。性能优化继续从可验证热路径入手。

## 文档债

README 已按本事故修正。`TASKS.md` 的整文件同步尝试被工具安全层拦截，因此其中关于 PromptEditor lazy split 已成功的旧描述可能仍存在；`DECISIONS.md` / `ARCHITECTURE.md` / `AGENTS.md` 也需要后续以最小 diff 撤销对应旧描述。不得把这些旧文档文字当成当前代码事实。
