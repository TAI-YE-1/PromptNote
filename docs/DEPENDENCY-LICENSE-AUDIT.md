# PromptNote V1 依赖许可证审计

## 1. 目的与口径

本文件记录 PromptNote V1 的依赖许可证审计证据，用于 `TASKS.md` 的 P8-10。

权威依赖解析以仓库提交的 `package-lock.json` 为准，而不是某一台机器当前安装出来的 `node_modules`。CI 使用：

```bash
npm ci --ignore-scripts
npm run license:audit
```

`scripts/audit-licenses.mjs` 直接读取 npm lockfile v3 的全部 `packages` 条目，因此会覆盖 Linux、Windows、macOS 等平台的 optional/transitive package，而不是只覆盖 CI runner 当前安装到磁盘的子集。

当前锁文件共审计 **223 个直接/传递依赖包**，所有条目均包含 license 元数据。

## 2. 当前许可证分布

| License | Packages |
| --- | ---: |
| MIT | 179 |
| Apache-2.0 | 15 |
| MPL-2.0 | 12 |
| ISC | 7 |
| BSD-2-Clause | 6 |
| BSD-3-Clause | 2 |
| BlueOak-1.0.0 | 1 |
| 0BSD | 1 |

当前没有发现 AGPL、GPL、SSPL、BUSL、Commons Clause 或缺失 license 元数据的锁定依赖。

CI 会对缺失 license 元数据和上述阻塞类许可证 fail-closed；LGPL、MPL、EPL、CDDL 等弱 copyleft/特殊许可证不会静默通过，而是输出为“需要显式发布审查”。

## 3. MPL-2.0 显式审查

当前 12 个 MPL-2.0 条目全部属于 `lightningcss@1.33.0` 及其跨平台 native binary 包：

- `lightningcss`
- `lightningcss-android-arm64`
- `lightningcss-darwin-arm64`
- `lightningcss-darwin-x64`
- `lightningcss-freebsd-x64`
- `lightningcss-linux-arm-gnueabihf`
- `lightningcss-linux-arm64-gnu`
- `lightningcss-linux-arm64-musl`
- `lightningcss-linux-x64-gnu`
- `lightningcss-linux-x64-musl`
- `lightningcss-win32-arm64-msvc`
- `lightningcss-win32-x64-msvc`

`package-lock.json` 将这些条目全部标记为 `dev: true`。`lightningcss` 是 Vite 的构建时传递依赖；PromptNote 的 `src/` 没有直接 import、vendor 或修改 `lightningcss` 源码。

Mozilla 对 MPL 2.0 的说明是 file-level copyleft；使用本身不触发额外义务，向组织外分发 MPL Covered Software 时才需要按 MPL 3.x 条款处理相应源码可用性/通知。官方参考：

- https://www.mozilla.org/en-US/MPL/2.0/
- https://www.mozilla.org/en-US/MPL/2.0/FAQ/
- https://github.com/parcel-bundler/lightningcss

基于当前 V1 依赖图，`lightningcss` 仅参与开发/构建，不作为 PromptNote Extension 的运行时模块被导入，也没有被 PromptNote 修改或 vendored。若未来发布工件开始直接携带其 Covered Software、源码或 native binary，应在发布前重新做 MPL 分发义务检查并提供所需通知/源码获取方式。

本节是工程许可证审计记录，不替代针对具体商业分发场景的法律意见。

## 4. 外部代码与借鉴边界

当前生产源码树只保留 PromptNote 自身模块和 npm 依赖边界，没有 vendored 的外部仓库源码子树，也没有为参考项目保留平行实现。

项目早期参考过同类产品/开源项目的产品形态、编辑体验、Extension shell 和 schema/compiler 思路；正式实现按 PromptNote 自己的 `PRODUCT / UX / PromptDocument / ARCHITECTURE` 权威文档重新实现。原型 `prototype/promptnote-prototype.html` 只作为 UX reference，不是生产 Extension 的源码来源。

第三方运行时能力通过 `package.json` / `package-lock.json` 中的 npm 依赖进入构建，不允许把第三方源文件复制进 `src/` 来规避依赖管理或许可证追踪。

## 5. 持续门禁

许可证审查不是一次性人工清单。以后任何依赖变更都必须同时满足：

1. `package-lock.json` 随 `package.json` 一起更新；
2. CI 使用 `npm ci` 验证固定解析；
3. `npm run license:audit` 必须通过；
4. 新出现的特殊许可证必须显式审查，不能仅扩大 allowlist 静默放行；
5. 若分发物开始包含需要额外 notice/source obligation 的 Covered Software，发布工件必须补齐相应通知。
