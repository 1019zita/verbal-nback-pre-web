# JATOS 存储设计

版本：`0.4.0-jatos.1`。本设计只增加部署与保存通道，不改变言语 N-back pre 的刺激、条件、流程、按键、时序或科研字段。

## 双后端

源码 `index.html` 设置 `window.NBACK_STORAGE_BACKEND = 'local'`，双击或本地静态服务器运行时只使用 IndexedDB。`scripts/build_study_assets.py` 生成独立 JATOS 入口，把该标记改为 `jatos`，并在 `standalone.js` 前加载 `jatos.js` 与 `src/jatos-storage.js`。

`src/storage.js` 的 `StorageController` 始终保留 `LocalStore`，JATOS 模式再启用远端 adapter。实验代码通过以下调用点保存：

```text
start(session)
saveTrial(session, row)
saveCheckpoint(session, checkpoint)
saveFinalResult(session, csvContent)
flush()
finishExperiment(status)
```

远端写入不被 trial 状态机 `await`，所以网络延迟不延长 500/2000 ms 呈现；最终保存会等待全部队列。首个追加失败被保留，`flush()` 必须抛出，页面不会显示虚假成功。

## 记录顺序

JATOS Result Data 是逐行 JSON：

1. `session_start`：run ID、版本、源 hash、模式、预期 trial 数、block 顺序、participant、环境和实现约定；
2. `trial`：本地 CSV/JSON 的原 trial 字段及 participant/run 元数据；
3. `checkpoint`：每个 block 的 n、完成数量和软件时钟；
4. `final`：状态、完成/预期数量、block 顺序、环境事件、约定及错误；
5. `csv_upload_attempt`；
6. `csv_upload_status`。

每条记录另含 `participant_id`、JATOS study/component/worker/result IDs、`experiment_version`、`git_commit` 和 ISO timestamp。`source_answer`、`expected_key`、`response`、`rt_ms`、`web_answer_match`、时序诊断和 `key_events` 原样保留。

调试模式记录数为 `1 + 5 + 1 + 1 + 2 = 10`。正式模式为 `1 + 222 + 3 + 1 + 2 = 229`。其中 trial 仍是 222 条，起始 warm-up 位仍是 6 条，不新增科研计分。

## CSV 与结束

`saveFinalResult` 直接上传 `sessionCSV(session)` 的 UTF-8 BOM CSV，因此服务器 result file 与浏览器自动下载使用同一生成结果。文件名为：

```text
verbal-nback-pre[_debug]_<run UUID>.csv
```

CSV 上传失败被视为最终保存失败。成功后 `finishExperiment` 先再次 flush，再关闭 JATOS unload warning，并优先调用 `endStudyWithoutRedirect`，否则使用 `endStudyAjax`。

Subject=0 保留既有“不记录”语义：不写 IndexedDB、NDJSON 或 CSV，但在 JATOS 中仍正常结束 Study lifecycle。刷新/早退会保留已追加的 partial trial，不自动恢复实验。
