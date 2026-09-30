# Changelog

## 0.4.0-jatos.1 deployment — 2026-09-30

- 建立并推送 GitHub repository `1019zita/verbal-nback-pre-web`；部署构建固定到 commit `6e8334b0b7328996873b6b1a197c02d766981878`。按用户要求将 repository 改为 public，并从 `main` 根目录发布 GitHub Pages。
- 从该 commit 重建 study assets，更新本地 Study 正式标题，真实 JATOS 调试得到 10 条记录、5 个 trial 和字节一致的服务器/浏览器 CSV。
- 重新由 JATOS 官方导出 JZIP；SHA-256 为 `5ACD315458079E458B98C6B4F4718BD8EB499865E96794307AEC858EA26492AE`，86 个 entries、单一 `.jas`，无结果、secret 或 source snapshot。
- 在第三套全新 JATOS 3.11.1 实例导入最终 JZIP 并重跑通过；记录中的 `git_commit` 全部为部署 commit。
- MindProbe 新建 Study `28772` / Component `49421` / Default Batch `32591`，未覆盖既有实验；在线调试为 `FINISHED`，10 条记录、5 行 CSV、上传成功、控制台错误 0，服务器与浏览器 CSV 字节一致。
- 创建独立的 Personal Multiple 正式入口 `https://jatos.mindprobe.eu/publix/rdgdulJsPmb`；smoke 结果和测试入口保留，未删除任何 JATOS 数据。

## 0.4.0-jatos.1 — 2026-09-29

- 新增与本机 IndexedDB 并行的 JATOS adapter：逐条追加 `session_start`、trial、checkpoint、final 和 CSV 上传状态，结束前排空队列并调用 JATOS 正常结束接口。
- JATOS 正式与调试模式继续调用同一实验路径；调试为固定 1-back 前 5 条，服务端期望 10 条 NDJSON 记录，正式模式保持 222 trial/3 checkpoint。
- 新增版本化 study-assets 构建、`build-info.json`、`MANIFEST.sha256`、环境变量 API 工具、dry-run-first 部署与结果/Study 导出脚本。
- 新增 JATOS adapter、科研不变量、构建/JZIP 和真实构建入口浏览器测试；15 项 Node 测试、2 项 Python 测试及完整本地浏览器回归通过。
- 在隔离 JATOS 3.11.1 完成真实调试，服务器 CSV 与浏览器 CSV 字节一致；官方 JZIP 导出后在第二个干净实例导入并再次通过。
- 将完成页容器 ID 从 `exports` 改为 `export-actions`，避免 JATOS 的 `jquery.ajax-retry` 把 `window.exports` 误判为 CommonJS 环境。
- 未改变刺激、3 个 block、222 trial、随机化、500/2000/2500 ms 时序、按键、指导语、计分字段或数据语义。

## 0.3.0-local — 2026-09-28

- 生成 `standalone.js` 并改用经典脚本入口，支持直接双击 `index.html`，不再因 `file://` 下模块和 `fetch()` 限制卡在材料加载。
- 开始页新增两次点击调试入口：首次把 Subject、Session、Name、Age 填为 1 并显示“确定”，再次点击进入调试。
- 调试模式固定执行正式 1-back List 的前 5 条，沿用正式材料、时序、键盘、指导语、存储和导出代码。
- 调试运行保存 `run_mode=debug` 和 `expected_trials=5`，历史列表及下载文件名带调试标记。
- 浏览器回归新增 `file://` 直接打开、两次点击、5 trial、IndexedDB 保存和自动 CSV 验证；正式 222 次流程保持通过。

## 0.2.1-local — 2026-09-28

- 修复文字指导页中四处“反婴”错字。
- 可重复导入脚本现生成批准的 Canvas 文字页、Z/“/”键位和 71 张运行时刺激资源。
- 每条 trial 分开保存原始 `source_answer`（f/j）与网页 `expected_key`（z/“/”），恢复来源可追溯性。
- 更新完整浏览器测试，覆盖空格导航、Z/“/”反应、71 张资源、自动 CSV、完整 222 次流程与缺失资源拦截。
- 同步页面、包、数据字典、验证记录和迁移计划版本。

## 0.2.0-local — 2026-09-28

- 将 6 张指导语与阶段过渡画面从位图全面替换为 Canvas 编程纯文本呈现，彻底消除原 BMP 模糊与缩放拉伸问题。
- 修正键位映射：反应键改为一致按 Z 键、不一致按 / 键，继续键改为 Space 键。
- 答案标准表同步升级为 z / /，并在单元测试中核验映射（0.2.1 起同时保留原始 f/j）。
- 实验结束后自动触发完整试次 CSV 下载至本机浏览器。

## 0.1.0-local — 2026-09-27

- 仅将言语 N-BACK_pre 移植到本地 HTML/Canvas/JavaScript。
- 导入 222 个原始序列条目和 77 张像素一致 PNG，保留 3 个随机顺序 block、500/2000 ms 呈现和 2500 ms stimulus 收键配置。
- 本机 IndexedDB 逐 trial 保存，CSV/JSON 导出，Subject=0 不记录，未完成记录可导出但不续做。
- 保留原图/答案冲突；明确标记 `web_answer_match`、双窗口诊断与原 E-Prime runtime 未实测的边界。
- 未接入 GitHub、JATOS 或 MindProbe。
