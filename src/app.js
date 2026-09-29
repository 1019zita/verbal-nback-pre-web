import {shuffleBlocks, TrialCapture, validateParticipant, sessionCSV} from './core.js';
import {StorageController} from './storage.js';

const $ = id => document.getElementById(id);
const canvas = $('stage');
const ctx = canvas.getContext('2d', {alpha:false});
const store = new StorageController();
const images = new Map();
let config, session, active = false, capture = null, navigation = null;
let completedTrials = 0;

function setScreen(screen) { document.body.dataset.screen = screen; }
function setupError(message) { $('setup-error').textContent = message; $('setup-error').hidden = !message; }
function drawImage(name, settings) {
  const image = images.get(name);
  if (!image) throw new Error(`材料未加载：${name}`);
  ctx.fillStyle = settings.background;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  if (settings.stretch) ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
  else ctx.drawImage(image, (canvas.width - image.naturalWidth)/2, (canvas.height - image.naturalHeight)/2);
}

function drawTextScreen(screenConfig) {
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const lines = [];
  if (screenConfig.title) {
    lines.push({text: screenConfig.title, font: 'bold 36px -apple-system, BlinkMacSystemFont, "Microsoft YaHei", sans-serif', color: '#ffffff', spacing: 52});
  }
  if (screenConfig.paragraphs) {
    for (const p of screenConfig.paragraphs) {
      const pLines = p.split('\n');
      for (const pl of pLines) {
        lines.push({text: pl, font: '24px -apple-system, BlinkMacSystemFont, "Microsoft YaHei", sans-serif', color: '#dddddd', spacing: 38});
      }
      lines.push({text: '', font: '14px sans-serif', color: '#000000', spacing: 14});
    }
  }
  if (screenConfig.prompt) {
    lines.push({text: screenConfig.prompt, font: 'bold 24px -apple-system, BlinkMacSystemFont, "Microsoft YaHei", sans-serif', color: '#4ade80', spacing: 44});
  }

  const totalHeight = lines.reduce((acc, l) => acc + l.spacing, 0);
  let currentY = (canvas.height - totalHeight) / 2 + 10;

  for (const item of lines) {
    if (item.text) {
      ctx.font = item.font;
      ctx.fillStyle = item.color;
      ctx.fillText(item.text, canvas.width / 2, currentY + item.spacing / 2);
    }
    currentY += item.spacing;
  }
}

async function showSourcePage(object, screen, key = ' ') {
  capture = null;
  await new Promise(resolve => requestAnimationFrame(() => {
    if (config.text_screens && config.text_screens[object]) {
      drawTextScreen(config.text_screens[object]);
    } else {
      const settings = config.screens[object];
      drawImage(settings.filename, settings);
    }
    setScreen(screen);
    navigation = {key, resolve};
  }));
}

document.addEventListener('keydown', event => {
  if (!active || event.isComposing || event.ctrlKey || event.metaKey || event.altKey) return;
  const key = event.key.toLowerCase();
  if (capture && (key === 'z' || key === '/')) {
    event.preventDefault();
    capture.key(key, performance.now(), event.repeat);
  } else if (navigation && !event.repeat && (navigation.key === 'any' || key === navigation.key || (navigation.key === ' ' && (key === ' ' || event.code === 'Space')))) {
    event.preventDefault();
    const pending = navigation;
    navigation = null;
    pending.resolve();
  }
});

function runBlock(block, blockIndex) {
  return new Promise((resolve, reject) => {
    let trialIndex = 0, phase = 'start', blankOnset = null;
    function startTrial(now) {
      const trial = block.trials[trialIndex];
      drawImage(trial.stimulus, config.screens.ImageDisplay2);
      capture = new TrialCapture(trial.expected_key, now, config.timing.stimulus_input_ms, config.timing.blank_ms);
      phase = 'stimulus';
      setScreen('stimulus');
      document.body.dataset.n = block.n;
      document.body.dataset.trial = trial.trial;
      document.body.dataset.globalTrial = completedTrials + 1;
    }
    function step() {
      try {
        const now = performance.now();
        if (phase === 'start') startTrial(now);
        else if (phase === 'stimulus' && now >= capture.onset + config.timing.stimulus_ms) {
          ctx.fillStyle = 'black'; ctx.fillRect(0, 0, canvas.width, canvas.height);
          capture.beginBlank(now); blankOnset = now; phase = 'blank'; setScreen('blank');
        } else if (phase === 'blank' && now >= blankOnset + config.timing.blank_ms) {
          const trial = block.trials[trialIndex];
          const row = {...trial, block:blockIndex+1, n:block.n, list:block.list, global_trial:completedTrials+1, ...capture.finish(now)};
          capture = null;
          completedTrials++;
          if (session.logging_enabled) {
            session.trials.push(row);
            session.completed_trials = completedTrials;
            void store.saveTrial(session, row);
          }
          trialIndex++;
          if (trialIndex === block.trials.length) { resolve(); return; }
          // Next stimulus in this same animation frame: no additional ITI.
          startTrial(performance.now());
        }
        requestAnimationFrame(step);
      } catch (error) { capture = null; reject(error); }
    }
    requestAnimationFrame(step);
  });
}

function recordEnvironment(type) {
  if (!active || !session?.logging_enabled) return;
  session.environment_events.push({type,time_ms:performance.now(),visibility:document.visibilityState,width:innerWidth,height:innerHeight,fullscreen:!!document.fullscreenElement});
  // Only record; do not introduce a scientific pause/resume/exclusion policy.
  void store.save(session);
}
document.addEventListener('visibilitychange', () => recordEnvironment('visibilitychange'));
document.addEventListener('fullscreenchange', () => recordEnvironment('fullscreenchange'));
window.addEventListener('resize', () => recordEnvironment('resize'));
window.addEventListener('blur', () => recordEnvironment('blur'));
window.addEventListener('beforeunload', event => { if (active) { event.preventDefault(); event.returnValue = ''; } });
window.addEventListener('pagehide', () => {
  if (active && session?.logging_enabled) {
    session.status = 'interrupted';
    session.ended_at = new Date().toISOString();
    void store.save(session);
  }
});

async function finish(error = null) {
  capture = null; navigation = null; active = false;
  session.status = error ? 'failed' : 'finished';
  session.ended_at = new Date().toISOString();
  session.completed_trials = completedTrials;
  if (error) session.error = error.message;
  let saveError = null;
  try {
    const csv = session.logging_enabled ? sessionCSV(session) : '';
    await store.saveFinalResult(session, csv);
    await store.flush();
    await store.finishExperiment({successful:!error, message:error ? `Verbal N-back failed: ${error.message}` : 'Verbal N-back completed'});
  } catch (e) { saveError = e; }
  document.body.classList.remove('running');
  $('experiment').hidden = true; $('finished').hidden = false;
  setScreen('finished');
  $('finish-title').textContent = error ? '运行已停止' : session.run_mode === 'debug' ? '调试完成' : '谢谢参与';
  $('finish-status').textContent = error ? `已完成 ${completedTrials} 次呈现。${error.message}` : `已完成 ${session.block_order.length} 个 block，共 ${completedTrials} 次呈现。`;
  $('save-status').textContent = !session.logging_enabled ? '本次被试编号为 0，未保存数据。' : saveError ? `保存未完成：${saveError.message}。请立即使用下方按钮导出当前数据。` : store.backend === 'jatos' ? '结果已保存到 JATOS，并保留本机导出副本。' : '结果已保存在当前浏览器。请导出文件，浏览器记录不能代替长期备份。';
  $('save-status').className = saveError ? 'error' : 'muted';
  $('export-actions').hidden = !session.logging_enabled;
  if (!error && session.logging_enabled) {
    try { download(session, 'csv'); } catch (e) { console.error('自动下载 CSV 失败:', e); }
  }
}

async function startExperiment(runMode = 'main') {
  if (active || !config) return;
  setupError('');
  let participant;
  try {
    participant = validateParticipant(Object.fromEntries(new FormData($('participant-form'))));
    if (innerWidth < config.frame.width || innerHeight < config.frame.height) throw new Error('实验需要至少 1024 × 768 的浏览器内容区域。请切换全屏或放大窗口后再开始。');
  } catch (error) { setupError(error.message); return; }
  const oneBack = config.blocks.find(block => block.n === 1);
  const blocks = runMode === 'debug' ? [{...oneBack, trials:oneBack.trials.slice(0, 5)}] : shuffleBlocks(config.blocks);
  completedTrials = 0;
  session = {
    id:crypto.randomUUID(),experiment:config.experiment,version:config.version,source_sha256:config.source_sha256,
    started_at:new Date().toISOString(),ended_at:null,status:'running',run_mode:runMode,expected_trials:runMode === 'debug' ? 5 : 222,participant,
    logging_enabled:Number(participant.Subject) !== 0,block_order:blocks.map(b=>b.n),completed_trials:0,trials:[],checkpoints:[],environment_events:[],
    environment:{user_agent:navigator.userAgent,device_pixel_ratio:devicePixelRatio,viewport:[innerWidth,innerHeight],frame:[1024,768]},
    conventions:{key_mapping:'source_answer j -> expected_key z (match); source_answer f -> expected_key / (mismatch); Space navigates',web_answer_match:'null for blank expected_key; otherwise first stimulus-window response equals expected_key',response_window:'2500ms from stimulus onset; first keydown z//; auto-repeat events retained',prob_response:'independent diagnostic first-key observation; not an original logged prob field',rendering:'1024x768 frame; approved Canvas text screens; intrinsic stimulus images centered and clipped',randomization:runMode === 'debug' ? 'debug: fixed 1-back source block, first 5 rows, original row order' : 'unbiased crypto Fisher-Yates of [1,3,2], within-block order unchanged; not E-Prime PRNG equivalence',research_acceptance:'pending'},
  };
  $('start').disabled = true; $('debug-mode').disabled = true;
  try {
    await store.start(session); await store.save(session); await store.flush();
  } catch (error) { setupError(`无法准备保存通道，尚未开始实验：${error.message}`); $('start').disabled = false; $('debug-mode').disabled = false; return; }
  active = true;
  $('setup').hidden = true; $('experiment').hidden = false;
  document.body.classList.add('running'); document.body.dataset.runMode = runMode; canvas.focus();
  try {
    await showSourcePage('instruction', 'instruction');
    for (let i = 0; i < blocks.length; i++) {
      const block = blocks[i];
      document.body.dataset.block = i + 1;
      document.body.dataset.n = block.n;
      await showSourcePage({1:'cueone',2:'cuetwo',3:'cuethree'}[block.n], 'cue');
      await runBlock(block, i);
      if (session.logging_enabled) {
        const checkpoint = {block:i+1,n:block.n,completed_trials:completedTrials,time_ms:performance.now()};
        session.checkpoints.push(checkpoint);
        void store.saveCheckpoint(session, checkpoint);
      }
      // The source includes a rest screen even after the third block.
      await showSourcePage('rest', 'rest');
    }
    await showSourcePage('ImageDisplay1', 'end', 'any');
    await finish();
  } catch (error) { await finish(error); }
}

$('participant-form').addEventListener('submit', event => {
  event.preventDefault();
  void startExperiment('main');
});

let debugArmed = false;
$('debug-mode').addEventListener('click', () => {
  if (!debugArmed) {
    for (const input of $('participant-form').querySelectorAll('input')) input.value = '1';
    debugArmed = true;
    $('debug-mode').textContent = '确定';
    $('debug-mode').classList.add('armed');
    $('debug-mode').setAttribute('aria-pressed', 'true');
    $('debug-status').textContent = '信息框已填为 1。再次点击“确定”进入 1-back、5 trial 调试模式。';
    $('debug-status').hidden = false;
    setupError('');
    return;
  }
  void startExperiment('debug');
});

$('fullscreen').addEventListener('click', async () => {
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
    else await document.documentElement.requestFullscreen();
    setupError('');
  } catch { setupError('浏览器未允许全屏。可用 F11 或手动放大窗口后开始。'); }
});

function download(run, format) {
  const contents = format === 'csv' ? sessionCSV(run) : JSON.stringify(run, null, 2);
  const blob = new Blob([contents], {type:format === 'csv' ? 'text/csv;charset=utf-8' : 'application/json;charset=utf-8'});
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const mode = run.run_mode === 'debug' ? '_debug' : '';
  link.href = url; link.download = `verbal-nback-pre${mode}_${run.id}.${format}`;
  link.click(); setTimeout(() => URL.revokeObjectURL(url), 60000);
}
$('download-csv').addEventListener('click', () => download(session, 'csv'));
$('download-json').addEventListener('click', () => download(session, 'json'));
$('new-run').addEventListener('click', () => location.reload());

async function showHistory() {
  const runs = await store.list();
  $('history-list').replaceChildren();
  if (!runs.length) { $('history-list').textContent = '暂无保存记录。'; return; }
  for (const run of runs) {
    const row = document.createElement('div'); row.className = 'history-row';
    const text = document.createElement('p');
    text.textContent = `${new Date(run.started_at).toLocaleString()} · ${run.run_mode === 'debug' ? '调试' : '正式'} · ${run.trials.length} 条 · ${run.status === 'finished' ? '已完成' : '未完成'} · ${run.id.slice(0,8)}`;
    row.append(text);
    for (const format of ['csv','json']) {
      const button = document.createElement('button'); button.className = 'secondary'; button.textContent = format.toUpperCase();
      button.addEventListener('click', () => download(run, format)); row.append(button);
    }
    $('history-list').append(row);
  }
}

async function initialize() {
  try {
    if (globalThis.EXPERIMENT_CONFIG) config = structuredClone(globalThis.EXPERIMENT_CONFIG);
    else {
      const response = await fetch('data/experiment.json', {cache:'no-cache'});
      if (!response.ok) throw new Error('实验配置未找到。');
      config = await response.json();
    }
    let loaded = 0;
    await Promise.all(config.assets.map(async asset => {
      const image = new Image(); image.src = asset.url;
      await image.decode();
      if (image.naturalWidth !== asset.width || image.naturalHeight !== asset.height) throw new Error(`材料尺寸不一致：${asset.source_name}`);
      images.set(asset.source_name, image);
      $('load-status').textContent = `正在加载材料 ${++loaded} / ${config.assets.length}…`;
    }));
    await store.open(); await showHistory();
    $('load-status').textContent = `材料已就绪 · ${config.assets.length} 张图片`;
    $('start').disabled = false; $('debug-mode').disabled = false;
  } catch (error) {
    $('load-status').textContent = '加载未完成';
    setupError(`无法准备实验：${error.message} 请通过本地启动脚本打开页面。`);
  }
}
void initialize();
