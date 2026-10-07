# 本地与 JATOS 结果字段

适用版本：0.4.1-jatos.1。完整 JSON 是原始记录；CSV 是逐呈现位的平表。正式完整运行 222 行，调试运行 5 行。没有计算总准确率、排除标准或 K 值。本机 CSV/JSON 字段含义保持不变；JATOS 只增加部署追溯与记录类型字段。

## 逐试次字段

| 字段 | 含义 |
|---|---|
| `block` / `n` | 实际执行的第几个 block（1 起始）/ n-back 条件 |
| `trial` / `global_trial` | 源列表内序号 / 本次运行全局序号，均从 1 起始 |
| `list` / `source_line` | 原 ES List 名称 / 对应源定义行号 |
| `stimulus` | 原 BMP 文件名 |
| `source_answer` | 原 E-Prime List 的答案：`j`（读音一致）、`f`（不一致）或空字符串 |
| `expected_key` | 经批准的网页期望键：`z`（一致）、`/`（不一致）或空字符串 |
| `answer` | 仅为兼容 0.1/0.2.0 本机历史记录保留的 CSV 列；0.2.1 新记录不写此字段 |
| `warmup` | 仅标记源答案为空的起始位；不是新增练习或自动排除决定 |
| `response` | stimulus onset 后 2500 ms 内首个 Z//；未响应为空字符串 |
| `rt_ms` | 主反应相对 stimulus onset 的毫秒数；未响应为 null |
| `web_answer_match` | 非空 `expected_key` 与主反应相同为 1，否则为 0；`expected_key` 为空则为 null。不是经过验证的 E-Prime ACC |
| `stimulus_onset_ms` / `blank_onset_ms` / `trial_end_ms` | 本页 `performance.now()` 时钟上的呈现/空屏/结束时刻；不是 Unix 时间 |
| `actual_stimulus_ms` / `actual_blank_ms` | 两阶段实际软件计时长度；包含帧调度延迟，不能证明显示器发光时间 |
| `blank_response_diagnostic` | blank onset 后 2000 ms 内独立观察到的首个 Z//；未响应为空字符串 |
| `blank_rt_ms_diagnostic` | 独立空屏反应相对 blank onset 的毫秒数；未响应为 null |
| `key_events` | 本 trial 所有 Z// keydown：`key`、相对 stimulus onset 的 `onset_relative_ms`、是否自动重复 `repeat` |

空屏诊断反应可能与主反应是同一次键盘事件。它用于核验尚未实测的双输入对象行为，不是源程序另存的 prob 反应字段，也不能当作第二条独立试次。窗口采用左闭右开区间；恰好到截止时间的按键不成为窗口反应。

## 运行层字段

JSON 包含 `id`、实验名、版本、源文件 SHA-256、`run_mode`、`expected_trials`、ISO 起止时间、运行状态、六个原表单字段、实际 `block_order`、完成数量、试次、block checkpoints、环境事件和实现约定。`run_mode` 为 `main` 时是正式 3 block/222 次流程，为 `debug` 时固定使用 1-back 前 5 条。`running`、`interrupted`、`failed` 均应视为未完整完成；页面强制退出时，最后状态写入不保证完成。编号 0 没有持久化结果。

`environment_events` 记录隐藏、失焦、窗口变化和全屏变化；不会自动暂停或排除。`conventions.research_acceptance` 当前为 `pending`，表示仍需原环境对照与科研验收。

CSV 会重复附上 run ID、版本、源 hash、`run_mode`、状态、表单字段及 block 顺序，并同时输出 `source_answer` 与 `expected_key`。调试自动下载文件名带 `_debug`。null 输出为空单元格，`key_events` 输出 JSON 文本；潜在公式文本加前导单引号，完整原值以 JSON 为准。编号列按文本导入，防止丢失前导零。

## JATOS 记录字段

JATOS Result Data 为 NDJSON。每行都有：

| 字段 | 含义 |
|---|---|
| `record_type` | `session_start`、`trial`、`checkpoint`、`final`、`csv_upload_attempt` 或 `csv_upload_status` |
| `participant_id` | participant `Subject` 的字符串表示；保留前导零 |
| `session_identifier` | JATOS `studyResultId` 的字符串表示 |
| `run_id` | 与本机 JSON/CSV 相同的 UUID |
| `experiment` / `experiment_version` | 实验名与部署版本 |
| `git_commit` | `build-info.json` 的构建 commit；生产不得为 `uncommitted` |
| `timestamp` | 该记录封装时的 ISO 时间 |
| JATOS IDs | `studyId`、`componentId`、`workerId`、`studyResultId`、`componentResultId` 等平台标识 |

`trial` 行再包含本机 CSV 的 run/participant 字段和全部 trial 字段。`final` 保存完成状态、数量、block 顺序、环境、环境事件与实现约定。服务器 CSV 直接使用同一 `sessionCSV(session)`，不是从 NDJSON 二次推导。
