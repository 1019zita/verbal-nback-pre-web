# JATOS smoke test

日期：2026-09-29 至 2026-09-30。版本：`0.4.0-jatos.1`。本文件包含初始本地适配验证，以及从精确 Git commit 重建后的最终本地与 MindProbe 在线 smoke 证据。

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

环境：三个相互隔离的 JATOS 3.11.1 Windows bundled-JRE 实例，均只绑定 `127.0.0.1`。没有启动或修改 CLT 的既有实例。

第一实例新建，最终发布核验前把标题由 DEV 改为正式标题：

- Study：本地 ID 1，标题 `Verbal N-back pre`；
- Study UUID：`0219e18d-ad8c-4bde-bed4-f4859bc536fe`；
- Component：本地 ID 1，标题 `Verbal N-back pre`；
- entry：`index.html`。

纠正完成页 DOM ID 后，早期 Study Result 4 / Component Result 4 首次通过。精确 commit 重建后的最终 Study Result 33 / Component Result 33：

- 状态 `FINISHED`，message `Verbal N-back completed`；
- 10 条 NDJSON：1 session、5 trials、1 checkpoint、1 final、2 CSV status；
- 全部记录的 `git_commit` 为 `6e8334b0b7328996873b6b1a197c02d766981878`；
- JATOS result file 与浏览器 CSV 字节一致，SHA-256 为 `1E00984B2BB87F6FBF296A185B8E7DC9047AD13DBD1FFE4E49A1BF09658D0124`；
- 页面错误 0。

先前发现的 `require is not defined` 来自完成页的 `id="exports"` 被浏览器暴露为 `window.exports`，导致 JATOS 自带 `jquery.ajax-retry` 误入 CommonJS 分支。0.4.0 已改名为 `export-actions` 并在真实 JATOS 中确认消失。

## 官方 JZIP 与干净导入

JZIP 由 JATOS 官方 Study export endpoint 生成，未手工构造 metadata：

```text
release/build/Verbal-NBack-Pre-0.4.0-jatos.1.jzip
SHA-256: 5ACD315458079E458B98C6B4F4718BD8EB499865E96794307AEC858EA26492AE
```

扫描结果：86 个 archive entries，恰好一个 `.jas`；标题 `Verbal N-back pre`、UUID `0219e18d-ad8c-4bde-bed4-f4859bc536fe`；`build-info.json` 固定到 commit `6e8334b0b7328996873b6b1a197c02d766981878`；没有 `.env`、token、result、`.edat`、`.txt` 或 `source/`。

最终包在第三套全新 JATOS 3.11.1 实例通过 GUI 正式导入。导入后的 Study Result 1 / Component Result 1 再次完成调试：`FINISHED`、10 records、5 trials、CSV upload success，全部记录带精确 commit；服务器与浏览器 CSV SHA-256 均为 `C72A00136CFBBAA976D0FB8DB7EC79606CC452FF7F0D63EF0D9969A798B62F60`。

首次自动化导入后运行曾在指导页前超时，因为 Playwright fake clock 在 JATOS 初始化完成前介入；先等待真实 `jatos.onLoad`/`session_start` 完成，再安装 fake clock 后通过。该问题属于测试工具顺序，不是实验运行错误。

## GitHub 与 MindProbe 发布

- GitHub：private repository `https://github.com/1019zita/verbal-nback-pre-web`，部署源码 commit `6e8334b0b7328996873b6b1a197c02d766981878`。
- MindProbe Study：ID `28772`，UUID `0219e18d-ad8c-4bde-bed4-f4859bc536fe`，标题 `Verbal N-back pre`。
- Component：ID `49421`，entry `index.html`；Default Batch：ID `32591`。
- import 前 health check 只看到既有三个可访问 Study；dry-run 证实新 UUID/标题无冲突，`--apply` 返回新 Study ID `28772`，未覆盖既有实验。
- online smoke 使用独立 Personal Multiple code `AFXJre4As0V`；Study Result `1257471` / Component Result `1748208` 为 `FINISHED`。
- online smoke 事件流 10 条、trial 5 条、CSV 5 行、`run_mode=debug`、`n=1`、CSV upload success、控制台错误 0；全部记录指向部署 commit。
- MindProbe 服务器 CSV 与浏览器 CSV SHA-256 均为 `cf34e8c7371336acb538bbd11a89f03b3f6e23f3be9bab3692759b50f11aa097`，字节完全一致。
- repository 外 smoke Results Archive 为 `verbal-nback-pre-smoke_jatos_results_20260930T080109Z.zip`，SHA-256 `7a836c42269ab5f997094e7665bfb00af52b1bcf5b1480b476c7c973b6c0bf27`。
- 正式 Personal Multiple 入口另行生成：`https://jatos.mindprobe.eu/publix/rdgdulJsPmb`，尚未产生正式结果。

本轮只完成在线调试 smoke。正式 222-trial 在线人工验收、E-Prime 双输入 mask/显示对照和实验室批准的长期结果云盘仍是收集前门槛。
