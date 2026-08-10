# PromptNote 发布清单

本文件只记录当前正式发行需要的操作。

## 发布前

- 更新 `public/manifest.json` 的版本号；
- 更新对应版本 Release Notes；
- GitHub Actions 最新 `main` 构建通过；
- 使用同一份构建产物完成 Chrome / Edge smoke；
- 隐私政策指向根目录 `PRIVACY.md`；
- 浏览器商店文案与实际权限、数据用途保持一致；
- 准备商店要求的图标、截图与宣传素材；
- 明确源码许可证 / 授权方式；
- 只上传经过 CI 验证的发行包，不从未验证的本地工作树临时打包。

## 当前技术边界

- 固定权限：`storage`、`sidePanel`；
- AI 网络地址使用 optional host permission；
- 无 content script、`activeTab`、`scripting`；
- 无 PromptNote 自有后端、账号或云同步。

## 发布后

- 缺陷与需求使用 GitHub Issue / PR 或新的明确实施计划追踪；
- 行为、权限、数据用途或 Schema 变化同步更新对应权威文档；
- 发行包必须能追溯到明确 commit 和 CI run。
