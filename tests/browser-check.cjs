// Integration checks run only in isolated headless contexts, with synthetic IDs.
const {chromium} = require(process.env.PLAYWRIGHT_PATH || 'C:/Users/ASUS/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs = require('node:fs/promises');
const path = require('node:path');
const {pathToFileURL} = require('node:url');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname,'..');
const out = path.join(root,'test-output');
const base = process.env.NBACK_URL || 'http://127.0.0.1:8766/';
const cfg = require('../data/experiment.json');
const report = {date:'2026-10-07', version:cfg.version, browser:'Edge headless', checks:[], full_run:null, realtime_short_run:null, errors:[]};

async function database(page) {
  return page.evaluate(() => new Promise((resolve,reject) => {
    const req=indexedDB.open('verbal-nback-pre-local-v1',1);
    req.onsuccess=()=>{
      const db=req.result;
      const rows=db.transaction('sessions').objectStore('sessions').getAll();
      rows.onsuccess=()=>{resolve(rows.result);db.close();}; rows.onerror=()=>reject(rows.error);
    }; req.onerror=()=>reject(req.error);
  }));
}
async function contents(download) {
  const stream=await download.createReadStream(), chunks=[];
  for await (const chunk of stream) chunks.push(chunk);
  return Buffer.concat(chunks).toString('utf8');
}
async function ready(page) {
  page.on('pageerror',e=>report.errors.push(e.message));
  await page.goto(base);
  await page.locator('#start:not([disabled])').waitFor();
}
async function tickScreen(page, wanted) {
  for(let i=0;i<80;i++) {
    await page.clock.runFor(32);
    if(await page.getAttribute('body','data-screen')===wanted) return;
  }
  throw Error('Did not reach '+wanted+', at '+await page.getAttribute('body','data-screen'));
}
async function virtualFull(context, subject, screenshots) {
  const page=await context.newPage();
  await ready(page);
  await page.locator('[name=Subject]').fill(subject);
  await page.locator('[name=Name]').fill('TEST_ONLY');
  await page.clock.install({time:new Date('2026-09-27T01:00:00Z')});
  await page.clock.pauseAt(new Date('2026-09-27T01:00:01Z'));
  await page.locator('#start').click({force:true});
  await tickScreen(page,'instruction');
  if(screenshots) await page.screenshot({path:path.join(out,'instruction.png')});
  await page.keyboard.press('Space'); await tickScreen(page,'cue');
  if(screenshots) await page.screenshot({path:path.join(out,'cue.png')});
  const order=[];
  for(let i=0;i<3;i++) {
    order.push(Number(await page.getAttribute('body','data-n')));
    await page.keyboard.press('Space'); await tickScreen(page,'stimulus');
    if(i===0) {
      if(screenshots) await page.screenshot({path:path.join(out,'stimulus.png')});
      await page.clock.runFor(100); await page.keyboard.press('z');
      await page.clock.runFor(500); await page.keyboard.press('/');
      assert.equal(await page.getAttribute('body','data-screen'),'blank');
      const blankPixels=await page.locator('#stage').evaluate(canvas=>{
        const context=canvas.getContext('2d');
        const center=context.getImageData(canvas.width/2-12,canvas.height/2-12,25,25).data;
        const corner=context.getImageData(0,0,1,1).data;
        let brightest=0;
        for(let p=0;p<center.length;p+=4) brightest=Math.max(brightest,center[p]+center[p+1]+center[p+2]);
        return {brightest,corner:[corner[0],corner[1],corner[2]]};
      });
      assert.ok(blankPixels.brightest>700); assert.deepEqual(blankPixels.corner,[0,0,0]);
      if(screenshots) await page.screenshot({path:path.join(out,'blank-fixation.png')});
    }
    await page.clock.runFor(200000);
    assert.equal(await page.getAttribute('body','data-screen'),'rest');
    if(screenshots && i===0) await page.screenshot({path:path.join(out,'rest.png')});
    await page.keyboard.press('Space');
    await tickScreen(page,i===2?'end':'cue');
  }
  assert.deepEqual([...order].sort(),[1,2,3]);
  let automaticCsv=null;
  if(subject==='0') await page.keyboard.press('Space');
  else {
    const automatic=page.waitForEvent('download');
    await page.keyboard.press('Space');
    const download=await automatic;
    assert.match(download.suggestedFilename(),/^verbal-nback-pre_.+\.csv$/);
    automaticCsv=await contents(download);
    assert.equal(automaticCsv.split('\r\n').length,223);
  }
  await tickScreen(page,'finished');
  await page.locator('#save-status').filter({hasText:subject==='0'?'未保存数据':'结果已保存在当前浏览器'}).waitFor();
  if(screenshots) await page.screenshot({path:path.join(out,'finished.png')});
  return {page, order, automaticCsv};
}

(async()=>{
  await fs.mkdir(out,{recursive:true});
  const browser=await chromium.launch({headless:true,channel:'msedge'});
  try {
    if (!process.argv.includes('--realtime-only')) {
    const context=await browser.newContext({viewport:{width:1440,height:1000},acceptDownloads:true});
    const setup=await context.newPage(); await ready(setup);
    await setup.screenshot({path:path.join(out,'setup.png'),fullPage:true});
    assert.match(await setup.locator('#load-status').textContent(),/71/);
    await setup.setViewportSize({width:900,height:700});
    await setup.locator('#start').click();
    assert.match(await setup.locator('#setup-error').textContent(),/1024/);
    assert.equal(await setup.getAttribute('body','data-screen'),'setup');
    report.checks.push('preload all 71 runtime assets; prevent undersized viewport before start');
    await setup.close();

    const direct=await browser.newContext({viewport:{width:1440,height:1000},acceptDownloads:true});
    const local=await direct.newPage();
    local.on('pageerror',e=>report.errors.push(e.message));
    await local.goto(pathToFileURL(path.join(root,'index.html')).href);
    await local.locator('#start:not([disabled])').waitFor();
    await local.clock.install({time:new Date('2026-09-28T01:00:00Z')});
    await local.locator('#debug-mode').click();
    for(const name of ['Subject','Session','Name','Age']) assert.equal(await local.locator(`[name=${name}]`).inputValue(),'1');
    assert.equal(await local.locator('#debug-mode').textContent(),'确定');
    assert.equal(await local.locator('#debug-mode').getAttribute('aria-pressed'),'true');
    await local.screenshot({path:path.join(out,'debug-armed.png'),fullPage:true});
    await local.locator('#debug-mode').click();
    await tickScreen(local,'instruction');
    assert.equal(await local.getAttribute('body','data-run-mode'),'debug');
    await local.keyboard.press('Space'); await tickScreen(local,'cue');
    assert.equal(await local.getAttribute('body','data-n'),'1');
    await local.keyboard.press('Space'); await tickScreen(local,'stimulus');
    await local.clock.runFor(20000);
    assert.equal(await local.getAttribute('body','data-screen'),'rest');
    await local.keyboard.press('Space'); await tickScreen(local,'end');
    const debugDownload=local.waitForEvent('download');
    await local.keyboard.press('Space');
    const debugCsv=await contents(await debugDownload);
    await tickScreen(local,'finished');
    assert.equal(debugCsv.split('\r\n').length,6);
    const debugRuns=await database(local);
    assert.equal(debugRuns.length,1);
    const debugRun=debugRuns[0];
    assert.equal(debugRun.run_mode,'debug'); assert.equal(debugRun.expected_trials,5);
    assert.deepEqual(debugRun.block_order,[1]); assert.equal(debugRun.trials.length,5);
    assert.ok(debugRun.trials.every(row=>row.n===1 && row.block===1));
    assert.deepEqual(debugRun.trials.map(row=>[row.trial,row.stimulus,row.source_answer,row.expected_key]),cfg.blocks.find(block=>block.n===1).trials.slice(0,5).map(row=>[row.trial,row.stimulus,row.source_answer,row.expected_key]));
    report.debug_run={entry:'file:// double-click',trials:5,n:1,fields_defaulted_to:'1',automatic_csv:true,saved:true};
    report.checks.push('file:// direct open; two-click debug entry; fixed five-trial 1-back flow; normal save/export channel');
    await direct.close();

    const {page,order,automaticCsv}=await virtualFull(context,'32767',true);
    assert.ok(automaticCsv);
    const saved=await database(page);
    assert.equal(saved.length,1);
    const run=saved[0];
    assert.equal(run.status,'finished'); assert.equal(run.trials.length,222); assert.equal(run.checkpoints.length,3);
    assert.equal(run.trials.filter(r=>r.warmup).length,6);
    assert.equal(run.trials.filter(r=>!r.warmup).length,216);
    assert.equal(run.version,'0.4.1-jatos.1');
    assert.equal(run.trials[0].response,'z'); assert.equal(run.trials[0].blank_response_diagnostic,'/');
    for(let i=0;i<3;i++) {
      const expected=cfg.blocks.find(b=>b.n===order[i]);
      const actual=run.trials.filter(t=>t.block===i+1);
      assert.deepEqual(actual.map(t=>[t.trial,t.stimulus,t.source_answer,t.expected_key]),expected.trials.map(t=>[t.trial,t.stimulus,t.source_answer,t.expected_key]));
      assert.ok(actual.every(t=>t.actual_stimulus_ms>=500 && t.actual_blank_ms>=2000));
    }
    const jd=page.waitForEvent('download'); await page.locator('#download-json').click({force:true});
    const decoded=JSON.parse(await contents(await jd)); assert.equal(decoded.id,run.id); assert.equal(decoded.trials.length,222);
    const cd=page.waitForEvent('download'); await page.locator('#download-csv').click({force:true});
    const csv=await contents(await cd); assert.equal(csv.split('\r\n').length,223);
    report.full_run={clock:'virtual; original time constants unchanged',trials:222,warmup:6,nonblank_answer:216,checkpoints:3,block_order:order,automatic_csv:true,json_export:true,csv_rows:222};
    report.checks.push('full source flow including final rest/end; source/web answer fields preserved; automatic and manual downloads');
    await context.close();

    const zero=await browser.newContext({viewport:{width:1440,height:1000}});
    const noLog=await virtualFull(zero,'0',false);
    assert.equal((await database(noLog.page)).length,0);
    assert.equal(await noLog.page.locator('#export-actions').isVisible(),false);
    report.checks.push('Subject=0 completes all trials without saved rows or export');
    await zero.close();
    await fs.writeFile(path.join(out,'full-flow-report.json'),JSON.stringify(report,null,2));
    }

    const real=await browser.newContext({viewport:{width:1440,height:1000},acceptDownloads:true});
    const live=await real.newPage(); await ready(live);
    await live.locator('#start').click();
    // The running body has only a fixed-position canvas and no layout height.
    await live.locator('body[data-screen=instruction]').waitFor({state:'attached'}); await live.keyboard.press('Space');
    await live.locator('body[data-screen=cue]').waitFor({state:'attached'}); await live.keyboard.press('Space');
    await live.locator('body[data-screen=stimulus]').waitFor({state:'attached'}); await live.keyboard.press('z');
    await live.locator('body[data-screen=blank]').waitFor({state:'attached'}); await live.keyboard.press('/');
    await live.waitForFunction(()=>Number(document.body.dataset.globalTrial)>=5,undefined,{timeout:20000});
    let partial=await database(live);
    assert.ok(partial[0].trials.length>=4);
    const measured=partial[0].trials.slice(0,4);
    assert.ok(measured.every(t=>t.actual_stimulus_ms>=500 && t.actual_stimulus_ms<650));
    assert.ok(measured.every(t=>t.actual_blank_ms>=2000 && t.actual_blank_ms<2200));
    live.on('dialog',d=>d.accept());
    await live.reload(); await live.locator('#start:not([disabled])').waitFor();
    await live.locator('#history summary').click();
    assert.match(await live.locator('#history-list').textContent(),/未完成/);
    const pd=live.waitForEvent('download'); await live.locator('#history-list button').filter({hasText:'JSON'}).click();
    assert.ok(JSON.parse(await contents(await pd)).trials.length>=4);
    report.realtime_short_run={trials_checked:4,stimulus_ms:measured.map(t=>t.actual_stimulus_ms),blank_ms:measured.map(t=>t.actual_blank_ms),partial_survives_reload:true};
    report.checks.push('real-time 4-trial presentation; partial backup survives reload and exports');
    await real.close();

    const broken=await browser.newContext({viewport:{width:1440,height:1000}});
    const missing=await broken.newPage();
    await missing.route(`**/${cfg.assets[0].url}`,r=>r.abort());
    await missing.goto(base); await missing.locator('#setup-error:not([hidden])').waitFor();
    assert.equal(await missing.locator('#start').isDisabled(),true);
    report.checks.push('missing asset blocks start');
    await broken.close();
    assert.deepEqual(report.errors,[]);
    await fs.rm(path.join(out,'browser-failure.txt'),{force:true});
    await fs.writeFile(path.join(out,'browser-report.json'),JSON.stringify(report,null,2));
    console.log(JSON.stringify(report,null,2));
  } finally {await browser.close();}
})().catch(async error=>{console.error(error.stack);await fs.mkdir(out,{recursive:true});await fs.writeFile(path.join(out,'browser-failure.txt'),error.stack);process.exitCode=1;});
