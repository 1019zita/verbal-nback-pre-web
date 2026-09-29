# JATOS smoke test

日期：2026-09-29。版本：`0.4.0-jatos.1`。本轮只验证本地 JATOS 适配；未连接或修改 MindProbe 生产环境。

## 自动检查

| 检查 | 结果 |
|---|---|
| Node 单元、adapter、科研不变量 | 15/15 通过 |
| Python 构建/JZIP tests | 2/2 通过 |
| JS/Python 语法检查 | 通过 |
| 本地浏览器完整回归 | 通过：file:// 调试 5 trial、正式 222 trial、Subject=0、真实 4 trial、缺失材料保护；errors=0 |
| mock JATOS 构建入口 | 通过：10 records、5 trials、CSV upload、endStudy；errors=0 |
| study assets | 85 个文件；无 source snapshot、结果、secret 或远端配置 |

完整浏览器报告位于 ignored 的 `test-output/browser-report.json`。正式流程一次随机顺序为 3 → 2 → 1；此顺序不是固定设计。

## 真实本地 JATOS

环境：两个相互隔离的 JATOS 3.11.1 Windows bundled-JRE 实例，均只绑定 `127.0.0.1`。没有启动或修改 CLT 的既有实例。

第一实例新建：

- Study：本地 ID 1，标题 `Verbal N-back pre DEV`；
- Study UUID：`0219e18d-ad8c-4bde-bed4-f4859bc536fe`；
- Component：本地 ID 1，标题 `Verbal N-back pre`；
- entry：`index.html`。

纠正完成页 DOM ID 后，Study Result 4 / Component Result 4：

- 状态 `FINISHED`，message `Verbal N-back completed`；
- 10 条 NDJSON：1 session、5 trials、1 checkpoint、1 final、2 CSV status；
- JATOS result file 与浏览器自动 CSV 字节一致，1,898 bytes；
- 页面错误 0。

先前发现的 `require is not defined` 来自完成页的 `id="exports"` 被浏览器暴露为 `window.exports`，导致 JATOS 自带 `jquery.ajax-retry` 误入 CommonJS 分支。0.4.0 已改名为 `export-actions` 并在真实 JATOS 中确认消失。

## 官方 JZIP 与干净导入

JZIP 由 JATOS 官方 Study export endpoint 生成，未手工构造 metadata：

```text
release/build/Verbal-NBack-Pre-0.4.0-jatos.1.jzip
SHA-256: A523AF29ECEF0ED7CE9521ABBE1FA6063B5267C5F1C649C3745A12C86541232A
```

扫描结果：86 个 archive entries，恰好一个 `.jas`；标题/UUID 与源 Study 一致；没有 `.env`、token、result、`.edat`、`.txt` 或 `source/`。

第二个全新 JATOS 3.11.1 实例通过 GUI 正式导入该 JZIP。导入后的 Study Result 2 / Component Result 2 再次完成调试：`FINISHED`、10 records、5 trials、远端/本机 CSV 一致、页面错误 0。

首次自动化导入后运行曾在指导页前超时，因为 Playwright fake clock 在 JATOS 初始化完成前介入；先等待真实 `jatos.onLoad`/`session_start` 完成，再安装 fake clock 后通过。该问题属于测试工具顺序，不是实验运行错误。

## 发布边界

当前构建记录 `git_commit: uncommitted`，因为本目录尚未建立正式 Git repository。该 JZIP证明本地结构、导入和运行有效，但不能作为最终生产可追溯包。GitHub repository/commit 确认后必须重新构建、重新完成本地 JATOS smoke、官方 export 和 checksum，再进行 MindProbe dry-run。
