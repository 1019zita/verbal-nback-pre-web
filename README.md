# 言语 N-back pre：网页版 / JATOS 适配

本项目是一个心理学工作记忆 N-back 实验网页版，本版本仅改编 `n-back/言语N-back/N-BACK_pre.es`，源程序及同名生成代码的只读快照位于 `source/`。用户于 2026-09-27 指定先做这一版本，并于 2026-09-28 批准文字指导页、Z/“/”/空格键映射及 5 trial 调试模式。0.4.0 已完成本地版与 MindProbe/JATOS 版共用逻辑、真实本地 JATOS smoke test、官方 JZIP 导出和干净实例导入验证；2026-09-30 已备份到 public GitHub repository、发布 GitHub Pages，并以新 Study 部署到 MindProbe。2026-10-06 经用户批准，将每个 trial 原有 2000 ms 黑屏改为黑色背景中央白色注视点“+”，不增加时间段。

## 运行

最直接的方式是双击本目录的 `index.html`。0.3.0 已把实验配置和运行代码打包进 `standalone.js`，可以通过 `file://` 加载，不会再停在“正在加载原始材料”。请保持 `index.html`、`standalone.js` 和 `assets/` 的相对位置不变。

也可以在此目录用 PowerShell 启动本地服务器：

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\start-local.ps1
```

打开 [本地实验](http://127.0.0.1:8766/)。关闭运行服务器的终端或 Ctrl+C 可停止服务。可用 `-Port 8767` 指定其他端口；浏览器存储按 origin 隔离，更换端口会看到另一份记录列表。

本地入口仅使用本地静态资源，无 CDN、远端数据库或账号需求。可直接双击 HTML，也可使用只监听 `127.0.0.1` 的本地服务器；两种方式都不接收结果上传。浏览器存储按 origin 隔离，因此双击模式和 `http://127.0.0.1:8766/` 会分别显示各自的本机记录。

## JATOS / MindProbe 构建

JATOS 不直接使用源码入口。先运行：

```powershell
python scripts/import_source.py
python scripts/build_study_assets.py
```

构建目录为 `build/study-assets/`，Component entry 是 `index.html`。构建入口加载 `jatos.js` 和 `src/jatos-storage.js`，同时保留本机 IndexedDB、CSV/JSON 导出及完全相同的实验代码。`build-info.json` 记录版本、Git commit、入口和正式/调试 trial 数，`MANIFEST.sha256` 记录全部运行资产。当前 MindProbe 构建对应 Git commit `6e8334b0b7328996873b6b1a197c02d766981878`，最终官方 JZIP SHA-256 为 `5ACD315458079E458B98C6B4F4718BD8EB499865E96794307AEC858EA26492AE`。

## 已部署目标

| 项目 | 值 |
|---|---|
| GitHub | [1019zita/verbal-nback-pre-web](https://github.com/1019zita/verbal-nback-pre-web)（public，`main`） |
| GitHub Pages | [在线网页版](https://1019zita.github.io/verbal-nback-pre-web/) |
| MindProbe Study | ID `28772`，UUID `0219e18d-ad8c-4bde-bed4-f4859bc536fe`，标题 `Verbal N-back pre` |
| Component | ID `49421`，entry `index.html` |
| Default Batch | ID `32591` |
| 正式入口 | [Personal Multiple](https://jatos.mindprobe.eu/publix/rdgdulJsPmb) |

正式入口与 2026-09-30 的在线 smoke link 分离；在线 smoke 的 5-trial 结果保留在 JATOS，不删除。部署明细见 [JATOS smoke test](docs/JATOS_SMOKE_TEST.md) 和 [MindProbe 部署说明](docs/MINDPROBE_DEPLOYMENT.md)。

JATOS 结果采用追加式 NDJSON：1 条 `session_start`、每个完成 trial 1 条 `trial`、每个 block 1 条 `checkpoint`、1 条 `final`，以及 CSV 上传尝试/状态各 1 条。调试模式期望 10 条记录，正式模式期望 229 条记录。结束前排空写入队列、上传与本机相同的逐 trial CSV，再调用 JATOS 正常结束接口；任一追加或 CSV 上传失败都会阻止页面宣称服务器保存成功。详细设计、smoke 证据和部署流程见 [JATOS 存储设计](docs/JATOS_STORAGE_DESIGN.md)、[JATOS smoke test](docs/JATOS_SMOKE_TEST.md) 和 [MindProbe 部署说明](docs/MINDPROBE_DEPLOYMENT.md)。

使用实体键盘，浏览器内容区域至少 1024×768；不足时点击“切换全屏”或按 F11。刷新会开始新运行，不自动续做未完成的 trial。

## 调试模式

开始页的“进入调试 mode”采用两次点击：

1. 第一次点击会把 Subject、Session、Name、Age 四个文本信息框全部填为 `1`，按钮文字变为“确定”。
2. 第二次点击“确定”后进入调试模式。

调试模式固定使用正式 1-back List 的前 5 个 trial，顺序、材料、Z/“/”按键、500/2000/2500 ms 时序、指导语、休息页、结束页、IndexedDB 保存和 CSV/JSON 导出均调用正式实验同一套代码。它不会修改主实验的 3 block、222 次流程。

调试记录写入 `run_mode: "debug"`、`expected_trials: 5`，历史列表标记“调试”，自动下载文件名带 `_debug`。由于第一个 1-back trial 的源答案为空，五条调试记录包含 1 个起始空答案位和 4 个非空答案位。

## 实验流程与批准变更

| 项目 | 本版本 |
|---|---|
| 条件 | 1/2/3-back 各一个 block，block 随机顺序 |
| 序列 | 逐条保留原 List 表，不重新随机生成刺激 |
| 数量 | 1-back 73、2-back 74、3-back 75 次呈现，总计 222；各 block 前 n 个答案为空，共 216 个非空答案位 |
| 流程 | 总指导 → 每 block 的 cue → 固定 trial 表 → Space 继续休息；最后 block 也有休息；结束画面后任意键完成；结束后自动触发 CSV 下载 |
| 时长 | 汉字目标显示 500 ms → 黑色背景中央白色“+”注视点 2000 ms；stimulus 收键窗从 stimulus onset 起 2500 ms |
| 反应 | Z（一致）/ /（不一致）；首个有效 keydown 为 stimulus-window 反应，不提前结束 trial |
| 原材料 | 71 个汉字刺激 BMP 转为等尺寸 RGB PNG，逐张验证像素一致；原 6 张指导/阶段图片及其定义仍可在源快照和 `screens` 元数据中追溯 |
| 呈现 | 1024×768 Canvas；经批准的指导、cue、休息和结束页由清晰文字绘制；汉字刺激按源 Stretch=No 原尺寸居中，超出 frame 由 Canvas 裁切 |
| 练习/反馈 | 此源程序没有，不添加 lx 或其他练习 |
| 表单 | Subject、Session、Name、Age、Sex、Handedness；沿用原默认值及范围；Subject=0 不持久化、不导出 |
| 调试 | 两次点击进入；固定 1-back 前 5 条；保存/导出通道与正式实验相同并带 `debug` 标记 |

随机化使用 Web Crypto 驱动的无偏 Fisher–Yates，保留三个 block 不放回排列；导出实际顺序。不宣称复现 E-Prime PRNG 的同一 seed/序列，不把被试编号用作 seed。

## 当前已知科研差异与待验收项

这是可运行的**本地移植/核对版**，还不是已通过原环境对照的正式收集版。

1. **批准的网页键位和指导页**：原图片存在 F/J 冲突，源答案表为一致 J、不一致 F。0.2 系列经用户批准，运行时统一为一致 Z、不一致“/”、空格继续，并以 Canvas 文字替代 6 张原指导/阶段图片。每条 trial 分别保存 `source_answer`（原始 f/j）和 `expected_key`（网页 z/“/”），不伪装成原程序未改动复刻。
2. **双输入对象**：源 stimulus 与 prob 均收键，但指定言语 pre 的 `prob.Logging(*)=0`，EBS 最终仅保存 `ImageDisplay2` 属性。本版主反应取 stimulus onset 后 2500 ms 内首个 Z/“/”；额外保存 blank 独立首键及全部 Z/“/” keydown 作为诊断。两个 E-Prime mask 如何仲裁尚未旧版实测；网页的独立观察规则明确记入 JSON，不能视为已验证等价。
3. **准确率命名**：`web_answer_match` 是“网页主反应是否等于 `expected_key`”的比较值。`expected_key` 非空：相等 1，否则 0；为空：null。它不冒充原 E-Prime ACC，不自动为起始位决定科研评分、不新增总分/排除阈值。原始 `source_answer`、网页期望键和实际按键均保留，待确定评分后可分析。
4. **时序与显示**：requestAnimationFrame 以实际 onset 为基准切换 500/2000 ms 阶段；2000 ms 阶段保持黑色背景，并按 2026-10-06 的用户批准在中央显示白色“+”。帧边界会带来误差，记录实际时间。图片 Stretch 标志已保留，但原 E-Prime 1024×768 下的裁切/屏幕物理尺寸仍需人工对照。
5. **页面失焦**：只记录隐藏/失焦/缩放/全屏事件，不自动暂停、重做或排除数据。浏览器后台节流可能延长阶段，实际时序会反映；该次运行不可未经检查当作合格数据。
6. 导航空格/任意键忽略自动重复，避免长按跨过多个页面；trial 中所有 Z/“/” keydown（含 repeat）均可观察、仅取窗口首键。旧环境键盘重复与 buffer 语义仍需对照。

源定义在 `data/experiment.json`，不直接手改序列或答案。原 E-Prime 文件未修改。要修正科研冲突，先记录具体批准内容再实现。

## 本机保存与导出

详细字段见 [数据字典](docs/DATA_DICTIONARY.md)。

- IndexedDB 数据库 `verbal-nback-pre-local-v1`，每个 run 使用 UUID；逐 trial 异步保存，结束等待存储完成。
- 结果留在当前浏览器 origin；重开页面可展开“本机已保存的运行记录”，导出未完成记录。不会自动恢复实验，也不会自动删除/覆盖其他运行。
- CSV 为逐 trial 数据（正式完整运行 222 行、调试运行 5 行）；完整 JSON 还包括 `run_mode`、预期数量、表单、源 SHA-256、实际 block 顺序、浏览器信息、checkpoints、原始按键、环境事件及实现约定。
- CSV 对可能触发表格公式的文本加前导引号；JSON 保留原值。CSV 读取时须把 Subject/Session 按文本导入以保留前导零。
- Subject=0 仍完整运行，但不写 IndexedDB、不给结果下载。没有把某个被试编号设为缩短试次的调试捷径。
- 刷新/关闭时最近一次异步写入可能尚未完成；已提交行可导出，未完成状态保留，不声称浏览器存储是长期备份。清理站点数据/更换浏览器会影响本机记录。
- 真实结果应下载到实验室批准的仓库外目录，禁止放进源码或提交 Git。

## 开发检查

```powershell
node --test tests/core.test.js
node --check src/app.js
node --check src/core.js
node --check src/storage.js
node --check src/jatos-storage.js
node --check standalone.js
node --test tests/jatos-storage.test.js tests/scientific-invariants.test.js
python -m unittest tests/test_jatos_scripts.py
python -m compileall -q scripts tests
python scripts/build_study_assets.py
```

`scripts/import_source.py` 从工作区指定 ES 提取 222 行，保留原始 f/j 答案并生成批准的 z/“/”映射、Canvas 文字页、71 张运行时 PNG、只读源码快照、manifest 和可直接双击运行的 `standalone.js`（需 Pillow）。它不读 `.txt/.edat`。当前工程无需 npm install；运行时没有第三方 JS 依赖。

浏览器验证脚本 `tests/browser-check.cjs` 使用本机可用的 Playwright，仅产生合成测试记录。完整流程测试使用虚拟时钟推进原始时长，另外执行真实时钟短测；详见 `docs/LOCAL_VALIDATION.md`，不将虚拟时间测试当成硬件时序证明。

## 后续阶段

GitHub 备份、精确 commit 构建、MindProbe 新 Study 部署及在线 5-trial smoke 已完成。开始正式收集前仍需研究者完成原 E-Prime 双输入 mask/显示对照、正式 222-trial 在线人工验收，并确认实验室批准的结果云盘、权限与保存期限。空间 n-back 和其他言语版本仍属于后续独立任务，不能从本版本自动推断科研规则。
