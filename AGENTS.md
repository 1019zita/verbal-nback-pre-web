# Verbal N-back pre 网页 / JATOS 工程

- 当前只允许在此目录改编指定 `言语N-back/N-BACK_pre.es`；其他实验和原始 n-back 材料不动。
- 科研参数、序列、答案、指导语修订需用户明确授权。用户已于 2026-09-28 批准使用 Canvas 文字指导页、一致 Z/不一致“/”、空格继续，以及固定 1-back 前 5 条的调试模式；不得进一步改动。原始 f/j 必须保存在 `source_answer`，网页键保存在 `expected_key`；调试结果必须标记 `run_mode=debug`。
- `source/` 是源文件只读快照；`data/experiment.json`、`assets/` 和可双击运行的 `standalone.js` 由 `scripts/import_source.py` 生成。变更来源或运行代码后重新生成并核对 SHA-256 和科研批准。
- 本工程已完成本地 JATOS 适配、官方 JZIP 干净导入、GitHub public 备份、GitHub Pages 发布及 MindProbe 新 Study 部署。部署源码 commit 为 `6e8334b0b7328996873b6b1a197c02d766981878`；源码入口必须保持 local，JATOS 只能使用 `scripts/build_study_assets.py` 的构建入口。
- 默认检查：`node --test tests/core.test.js tests/jatos-storage.test.js tests/scientific-invariants.test.js`、全部 `src/*.js` 的 `node --check`、`python -m unittest tests/test_jatos_scripts.py` 和 JATOS assets 构建；影响流程/呈现时做完整浏览器检查。
- 数据只在浏览器、JATOS Results 或批准的仓库外导出目录；禁止提交被试数据、token或密码。`JATOS_BASE_URL`、`JATOS_API_TOKEN` 只能读环境变量，管理员 token 不得进入前端。
- GitHub repository `1019zita/verbal-nback-pre-web` 是源码 source of truth，MindProbe 只用于部署运行与结果收集。生产构建必须带精确 Git commit；不得从 MindProbe 资产反向覆盖 repository。
- 进展记录在本工程 README/CHANGELOG 和工作区 `n-back/MIGRATION_PLAN.md`。未建立 canonical ACTIVE_TASKS 系统，不从其他仓库导入其任务状态。
