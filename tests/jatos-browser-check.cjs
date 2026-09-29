const {chromium} = require(process.env.PLAYWRIGHT_PATH || 'C:/Users/ASUS/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert = require('node:assert/strict');

const url = process.env.NBACK_JATOS_URL || 'http://127.0.0.1:8766/build/study-assets/index.html';

async function tickScreen(page, wanted) {
  for (let i = 0; i < 100; i++) {
    await page.clock.runFor(32);
    if (await page.getAttribute('body', 'data-screen') === wanted) return;
  }
  throw new Error(`Did not reach ${wanted}`);
}

(async () => {
  const browser = await chromium.launch({headless:true, channel:'msedge'});
  const context = await browser.newContext({viewport:{width:1440,height:1000}, acceptDownloads:true});
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.route('**/jatos.js', route => route.fulfill({
    contentType:'application/javascript',
    body:`
      window.__jatosTest = {lines:[], uploads:[], warnings:[], endings:[]};
      window.jatos = {
        studyResultId: 901,
        onLoad(callback) { callback(); },
        addJatosIds(target) { return {...target, studyId:90, componentId:91, workerId:92, studyResultId:901, componentResultId:902}; },
        showBeforeUnloadWarning(value) { window.__jatosTest.warnings.push(value); },
        async appendResultData(line) { window.__jatosTest.lines.push(line); },
        async uploadResultFile(blob, filename) { window.__jatosTest.uploads.push({filename, text:await blob.text(), size:blob.size}); },
        async endStudyWithoutRedirect(successful, message) { window.__jatosTest.endings.push({successful, message}); }
      };
    `,
  }));
  await page.goto(url);
  await page.locator('#start:not([disabled])').waitFor();
  await page.clock.install({time:new Date('2026-09-29T02:00:00Z')});
  await page.locator('#debug-mode').click();
  await page.locator('#debug-mode').click();
  await tickScreen(page, 'instruction');
  await page.keyboard.press('Space'); await tickScreen(page, 'cue');
  await page.keyboard.press('Space'); await tickScreen(page, 'stimulus');
  await page.clock.runFor(20000);
  assert.equal(await page.getAttribute('body', 'data-screen'), 'rest');
  await page.keyboard.press('Space'); await tickScreen(page, 'end');
  const download = page.waitForEvent('download');
  await page.keyboard.press('Space');
  await download;
  await tickScreen(page, 'finished');
  await page.locator('#save-status').filter({hasText:'结果已保存到 JATOS'}).waitFor();

  const result = await page.evaluate(() => window.__jatosTest);
  const records = result.lines.map(line => JSON.parse(line));
  assert.deepEqual(records.map(record => record.record_type), [
    'session_start', 'trial', 'trial', 'trial', 'trial', 'trial', 'checkpoint', 'final', 'csv_upload_attempt', 'csv_upload_status',
  ]);
  assert.ok(records.filter(record => record.record_type === 'trial').every(record => record.run_mode === 'debug' && record.n === 1));
  assert.equal(records.find(record => record.record_type === 'final').completed_trials, 5);
  assert.equal(result.uploads.length, 1);
  assert.match(result.uploads[0].filename, /^verbal-nback-pre_debug_.+\.csv$/);
  assert.equal(result.uploads[0].text.split('\r\n').length, 6);
  assert.deepEqual(result.warnings, [true, false]);
  assert.deepEqual(result.endings, [{successful:true, message:'Verbal N-back completed'}]);
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({records:records.length, trial_records:5, csv_uploaded:true, ended:true, errors}, null, 2));
  await browser.close();
})().catch(error => { console.error(error); process.exitCode = 1; });
