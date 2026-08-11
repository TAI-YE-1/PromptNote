# PromptNote 发布清单

本文件只记录当前正式发行需要的操作。Microsoft Edge Partner Center 的逐字段填写材料统一维护在 `docs/EDGE-SUBMISSION.md`，不在多个文档重复维护商店文案。

## 发布前

- 更新 `public/manifest.json` 的版本号；
- 更新对应版本 Release Notes；
- GitHub Actions 最新 `main` 构建通过；
- 使用同一份构建产物完成 Chrome / Edge smoke；
- 隐私政策指向根目录 `PRIVACY.md`；
- Edge 提交字段使用 `docs/EDGE-SUBMISSION.md`；
- 商店文案与实际权限、数据用途保持一致；
- 准备商店要求的图标和截图；
- 根目录保留完整 MPL-2.0 `LICENSE`，README 中的授权说明与之保持一致；
- 只上传经过 CI 验证的发行包，不从未验证的本地工作树临时打包。

CI 的发行 artifact 名称直接读取 `public/manifest.json` 的版本号，避免 manifest 与 ZIP / artifact 名称漂移。

## 当前技术边界

- 固定权限：`storage`、`sidePanel`；
- 公网 AI Provider 的 optional host permission 仅允许 HTTPS；
- 本地模型可使用 `http://localhost/*` 或 `http://127.0.0.1/*`；
- 无 content script、`activeTab`、`scripting`；
- 无远程可执行代码；
- 无 PromptNote 自有后端、账号或云同步。

## 发布后

- 缺陷与需求使用 GitHub Issue / PR 或新的明确实施计划追踪；
- 行为、权限、数据用途或 Schema 变化同步更新对应权威文档；
- 发行包必须能追溯到明确 commit 和 CI run；
- 源码许可证保持 MPL-2.0，许可证变更必须作为单独的显式项目决策处理；
- Edge 上架后的扩展 ID、商店 URL 和审核注意事项补回 `docs/EDGE-SUBMISSION.md`，作为下一次更新的基线。
