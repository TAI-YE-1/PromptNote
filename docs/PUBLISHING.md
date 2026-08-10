# PromptNote 1.0 发布清单

本文件只保留正式发行需要的操作，不记录 V1 开发过程。

## 浏览器商店发布前

- Manifest 版本与发布版本一致；
- GitHub Actions 最新 `main` 构建通过；
- 使用最新构建产物完成一次 Chrome / Edge smoke；
- 隐私政策链接指向仓库根目录 `PRIVACY.md`；
- 准备浏览器商店要求的图标、截图与宣传素材；
- 明确项目源码许可证 / 授权方式；
- 上传同一份构建产物，不从未验证的本地工作树临时打包。

## 当前 V1.0 技术边界

- 固定权限：`storage`、`sidePanel`；
- AI 网络地址使用 optional host permission；
- 无 content script、`activeTab`、`scripting`；
- 无 PromptNote 自有后端、账号或云同步；
- PromptEditor 同步打包；Vite `>500KB` warning 当前为已知非阻塞项。

## 发布后

正式版本发布后，新增功能或行为变化使用 GitHub Issue / PR 或新的明确实施计划追踪，不恢复已完成的 V1 开发任务账本。