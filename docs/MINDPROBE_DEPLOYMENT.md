# MindProbe / JATOS 部署说明

本文件适用于言语 N-back pre。当前没有独立远程 DEV MindProbe；本地 JATOS 3.11.1 是 DEV/test，MindProbe 是托管部署目标。当前尚未创建或选定 MindProbe Study。

## 1. 发布前检查

```powershell
python scripts/import_source.py
node --test tests/core.test.js tests/jatos-storage.test.js tests/scientific-invariants.test.js
node --check src/app.js
node --check src/core.js
node --check src/storage.js
node --check src/jatos-storage.js
node --check standalone.js
python -m unittest tests/test_jatos_scripts.py
python -m compileall -q scripts tests
python scripts/build_study_assets.py
```

检查 `build/study-assets/build-info.json`：版本、精确 Git commit、`component_entry=index.html`、`formal_trials=222`、`debug_trials=5`。生产构建不得出现 `uncommitted`。核验 `MANIFEST.sha256`，并确认 assets 中没有 `.env`、token、result、participant CSV、E-Prime result 或 `source/`。

## 2. 本地 JATOS 与 JZIP

1. 在隔离 JATOS 3.11.1 创建 Study `Verbal N-back pre`（最终标题需在生产 dry-run 前确认）；
2. 创建单一 Component，entry 为 `index.html`；
3. 上传 `build/study-assets/` 内容；
4. 完整运行 debug，确认 10 records、5 trials、`FINISHED` 和 CSV result file；
5. 至少验证一次正式 222 trial 流程；
6. 用 JATOS 官方 Study export 生成 `.jzip`，不要手工构造；
7. 扫描 archive 并在第二个干净 JATOS 3.11.1 实例导入、重跑。

本轮本地 JZIP 仅对应 `uncommitted` 构建，不能直接发布。Git commit 后必须重建与重导出。

## 3. 凭据

真实值只从进程环境读取：

```powershell
$env:JATOS_BASE_URL = 'https://jatos.mindprobe.eu'
$env:JATOS_API_TOKEN = '<set locally>'
```

`.env.example` 只列变量名。token、密码、private key 和 participant data 不得进入 Git、文档、聊天记录、前端或 JZIP。

## 4. 首次 MindProbe import

先只读检查：

```powershell
python scripts/jatos_healthcheck.py
```

然后对由本地 JATOS 官方导出的、对应已审核 commit 的 JZIP做 dry-run：

```powershell
python scripts/jatos_deploy.py import `
  --jzip release/build/<APPROVED>.jzip `
  --expected-title "<CONFIRMED TITLE>"
```

只有在人工核对服务器、JZIP title/UUID、精确 Git commit、UUID 尚不存在以及这是新建 n-back Study 后，才加 `--apply`。本项目没有可复用的 MindProbe Study ID；不得覆盖 CDT-M、Full-Probe、Single-Probe 或 CLT 的 Study。

## 5. 已有 Study 的资产更新

仅 JS/CSS/assets 变化时：

```powershell
python scripts/jatos_deploy.py assets `
  --study-id <CONFIRMED_ID_OR_UUID> `
  --expected-title "<CONFIRMED TITLE>" `
  --assets-dir build/study-assets
```

脚本默认 dry-run，逐文件列出变化且不删除远端资产。人工核对后才加 `--apply`。Study/Component/Batch properties 变化不能用纯 assets 更新替代。

## 6. MindProbe 验收

- 页面、71 张刺激、指导/cue/休息/结束页和 console/network 正常；
- 调试模式固定 1-back 前 5 条，Results 为 `FINISHED`，10 条记录；
- 服务器 CSV 与设备 CSV 一致；
- 正式模式保持 3 block、222 trials、3 checkpoints，预期 229 条记录；
- `source_answer`、`expected_key`、响应、RT、时序、run mode、version、Git commit 和 JATOS IDs 可读取；
- 早退/刷新保留 partial data且不自动续做；
- 人工确认 Batch 和 participant link 类型、重复参与语义。

不得删除 smoke/partial results，除非用户另行明确授权。

## 7. 导出与回滚

结果必须导出到 repository 外的实验室批准云盘：

```powershell
python scripts/jatos_export_results.py `
  --study-id <CONFIRMED_ID_OR_UUID> `
  --expected-title "<CONFIRMED TITLE>" `
  --output-dir "<LAB_APPROVED_CLOUD_DIRECTORY>"
```

保留 ZIP、manifest 和 SHA-256。回滚前先导出 Results 和当前 Study，再从审核过的 Git commit 重建、dry-run、人工核对后更新；不得通过删除 Study 或 Results 回滚。

## 仍需人工确认

- GitHub 账号、repository 名和可见性；
- MindProbe 新建 Study 的最终标题、Component/Batch 与 link 类型；
- 精确生产 Study ID/UUID（首次 import 后生成）；
- 实验室批准的结果云盘目录、权限和 retention policy；
- 科研等价性中仍标记 pending 的 E-Prime 双输入 mask/显示对照。
