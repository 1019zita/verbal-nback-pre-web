# 本地验证记录

日期：2026-09-29。版本：0.4.0-jatos.1。环境：Windows、Edge headless、1440×1000 浏览器内容区域；同时检查 `file://` 直接打开及本地测试地址 `http://127.0.0.1:8766/`。JATOS 专项证据见 [JATOS_SMOKE_TEST.md](JATOS_SMOKE_TEST.md)。

## 已通过

- 15 项 Node 测试：原 10 项单元/源一致性测试，加 JATOS 记录顺序、CSV 上传、失败阻断、Subject=0 lifecycle 和科研不变量。
- 可重复导入：连续运行 `scripts/import_source.py` 后，`data/experiment.json` SHA-256 保持 `C80132093CA0AA93FBAF6DE47F8EAD373D71487A1583DD3D6CF9792A3634702C`，`standalone.js` SHA-256 保持 `A4B60CCDDA706DCC6613FF8A6CA04ECC192B5A95F7D8F115015B903C58714495`；输出固定为 73/75/74、总计 222 条、71 张运行时图片。
- 71 张汉字 BMP 到 PNG 的导入逐张核对 RGB 像素与尺寸；ES/EBS 快照与原目录文件 SHA-256 一致。
- 应用、存储、核心逻辑和浏览器测试四个 JavaScript 文件语法检查通过。
- 完整虚拟时钟记录流程：3 个随机顺序 block、222 次呈现（6 个空答案起始位、216 个非空答案位）、3 个 checkpoint、最后 block 后休息、结束页；每个 block 的刺激、原答案和网页期望键逐行与配置一致。
- 完整流程自动 CSV 下载成功；手动 JSON/CSV 下载内容检查通过：JSON 222 条，CSV 222 个数据行。
- `file://` 直接打开 `index.html` 后材料正常就绪；第一次点击调试按钮把 Subject、Session、Name、Age 填为 1 并显示“确定”，第二次进入调试模式。
- 调试模式固定为 1-back 前 5 条，保存 `run_mode=debug` 和 `expected_trials=5`，5 条均来自正式 oneback List；IndexedDB 保存和带 `_debug` 文件名的自动 CSV 下载成功。
- Subject=0 在独立浏览器上下文中完成全部 222 次呈现，数据库无记录，结果导出隐藏，也不触发自动 CSV。
- 71 张运行时资源预加载完成；900×700 内容区域会在开始前提示尺寸不足；拦截任一真实刺激图片会禁用开始按钮。
- 真实时钟短测 4 个 trial，刷新后已提交的数据仍可从历史记录导出。
- 人工查看自动截图：准备表单、总指导语、3-back cue、汉字呈现、休息和完成页；文字清晰、无裁切，“反应”错字已修复。
- 浏览器页面脚本错误为 0，完整检查退出码为 0；JATOS 构建入口 mock 与两个真实 JATOS 3.11.1 实例同样为 0。

完整虚拟时钟测试的一次实际 block 顺序为 1 → 2 → 3。随机化测试另外覆盖全部 6 种可能顺序；此处记录的单次顺序不是固定顺序。

## 真实时钟短测

| trial | 刺激实际毫秒数 | 空屏实际毫秒数 |
|---|---:|---:|
| 1 | 516.5 | 2016.7 |
| 2 | 500.0 | 2016.3 |
| 3 | 516.4 | 2016.1 |
| 4 | 500.0 | 2000.1 |

目标值为 500/2000 ms；上述是软件时钟测量，切换发生于浏览器绘制帧。没有使用光电测量，也没有把虚拟时钟的全流程测试宣称为全程硬件时序验收。

## 复现命令

需先启动本地服务器，并有 Playwright/Edge：

```powershell
python scripts/import_source.py
node --test tests/core.test.js
node --check src/app.js
node --check src/core.js
node --check src/storage.js
node --check src/jatos-storage.js
node --check tests/browser-check.cjs
node --check tests/jatos-browser-check.cjs
node --check standalone.js
node --test tests/jatos-storage.test.js tests/scientific-invariants.test.js
python -m unittest tests/test_jatos_scripts.py
python scripts/build_study_assets.py
node tests/browser-check.cjs
```

Playwright 可通过 `PLAYWRIGHT_PATH` 指向已安装模块；默认使用本机捆绑依赖位置。截图和机器报告写入被忽略的 `test-output/`；所有浏览器记录均为隔离上下文中的合成测试数据。

## 验收边界

本轮完成可直接双击运行的本地移植、5 trial 调试模式、JATOS adapter、官方 JZIP 干净导入和自动化回归，不等于完成科研等价性。已获批把原 F/J 冲突统一为一致 Z、不一致“/”、空格继续，并用 Canvas 文字替代六张指导/阶段位图；调试模式固定截取正式 1-back 前 5 条并明确标记。原 E-Prime 双输入 mask 仲裁、计分含义和原设备显示仍需对照。GitHub 备份与 MindProbe 新 Study/在线 smoke 已于 2026-09-30 完成，部署证据见 `JATOS_SMOKE_TEST.md`。
