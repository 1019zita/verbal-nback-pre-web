import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {shuffleBlocks, TrialCapture, sessionCSV, validateParticipant} from '../src/core.js';

const config = JSON.parse(readFileSync(new URL('../data/experiment.json',import.meta.url)));
const original = readFileSync(new URL('../source/N-BACK_pre.es',import.meta.url));
const text = original.toString('utf8');

test('all 222 source rows are preserved and web keys follow the approved mapping', () => {
  assert.equal(createHash('sha256').update(original).digest('hex'),config.source_sha256);
  for (const block of config.blocks) {
    const section = text.split(/(?=^\[Object\d+\])/m).find(s=>s.includes(`Name="${block.list}"\r\nTypeName="List"`));
    assert.ok(section);
    const matches = [...section.matchAll(/^Levels\((\d+)\)\.ValueString="1\\t\\ttrialproc\\t([^\\]+)\\t([^\\]*)\\t"/gm)];
    assert.equal(matches.length,72+block.n);
    const expectedKey = source => source === 'j' ? 'z' : source === 'f' ? '/' : '';
    assert.deepEqual(block.trials.map(r=>[r.trial,r.stimulus,r.source_answer,r.expected_key]),matches.map(m=>[Number(m[1]),m[2],m[3],expectedKey(m[3])]));
    assert.equal(block.trials.filter(r=>r.source_answer==='f' && r.expected_key==='/').length,48);
    assert.equal(block.trials.filter(r=>r.source_answer==='j' && r.expected_key==='z').length,24);
    assert.deepEqual(block.trials.slice(0,block.n).map(r=>[r.source_answer,r.expected_key]),Array(block.n).fill(['','']));
  }
  assert.equal(config.blocks.reduce((s,b)=>s+b.trials.length,0),222);
});

test('source timing, cue scaling and source snapshots are locked', () => {
  assert.equal(config.version,'0.4.0-jatos.1');
  assert.deepEqual(config.timing,{stimulus_ms:500,blank_ms:2000,stimulus_input_ms:2500});
  assert.deepEqual(config.frame,{width:1024,height:768});
  for (const n of ['instruction','cueone','cuetwo','cuethree']) assert.equal(config.screens[n].stretch,true);
  for (const n of ['ImageDisplay2','rest','ImageDisplay1']) assert.equal(config.screens[n].stretch,false);
  assert.deepEqual(Object.keys(config.text_screens),['instruction','cueone','cuetwo','cuethree','rest','ImageDisplay1']);
  assert.ok(JSON.stringify(config.text_screens).includes('做出反应'));
  assert.ok(!JSON.stringify(config.text_screens).includes('反婴'));
  const manifest=JSON.parse(readFileSync(new URL('../source/manifest.json',import.meta.url)));
  for (const [name,hash] of Object.entries(manifest.files)) {
    assert.equal(createHash('sha256').update(readFileSync(new URL('../source/'+name,import.meta.url))).digest('hex'),hash);
  }
  assert.equal(manifest.runtime_asset_count,config.assets.length);
  assert.equal(createHash('sha256').update(readFileSync(new URL('../standalone.js',import.meta.url))).digest('hex'),manifest.standalone_sha256);
});

test('only needed assets exist and retain the imported checksums', () => {
  assert.equal(config.assets.length,71);
  const names = new Set(config.assets.map(a=>a.source_name));
  for (const block of config.blocks) for (const row of block.trials) assert.ok(names.has(row.stimulus));
  for (const asset of config.assets) {
    const url = new URL('../'+asset.url,import.meta.url);
    assert.ok(existsSync(fileURLToPath(url)));
    assert.equal(createHash('sha256').update(readFileSync(url)).digest('hex'),asset.png_sha256);
  }
});

test('block shuffle allows all 6 orders without changing source tables', () => {
  const before=JSON.stringify(config.blocks), orders=new Set();
  for(let a=0;a<3;a++) for(let b=0;b<2;b++) {
    const values=[a,b];
    const shuffled=shuffleBlocks(config.blocks,()=>values.shift());
    orders.add(shuffled.map(x=>x.n).join(','));
    assert.deepEqual(shuffled.map(x=>x.n).sort(),[1,2,3]);
    for(const block of shuffled) assert.strictEqual(block,config.blocks.find(b=>b.n===block.n));
  }
  assert.equal(orders.size,6);
  assert.equal(JSON.stringify(config.blocks),before);
});

test('rejection sampling avoids modulo bias', () => {
  const random=[0xffffffff,2,0];
  assert.deepEqual(shuffleBlocks([1,3,2],()=>random.shift()),[3,1,2]);
  assert.equal(random.length,0);
});

test('first stimulus-window key remains primary across blank and repeated responses', () => {
  const trial=new TrialCapture('z',100);
  trial.key('x',200);
  trial.key('z',330);
  trial.beginBlank(610);
  trial.key('/',710);
  trial.key('z',720,true);
  const row=trial.finish(2610);
  assert.equal(row.response,'z'); assert.equal(row.rt_ms,230); assert.equal(row.web_answer_match,1);
  assert.equal(row.blank_response_diagnostic,'/'); assert.equal(row.blank_rt_ms_diagnostic,100);
  assert.equal(row.key_events.length,3); assert.equal(row.key_events[2].repeat,true);
});

test('late blank response cannot extend the 2500 ms stimulus window', () => {
  const trial=new TrialCapture('/',100);
  trial.beginBlank(620);
  trial.key('/',2600); // exactly at deadline: not primary
  const row=trial.finish(2620);
  assert.equal(row.response,''); assert.equal(row.rt_ms,null); assert.equal(row.web_answer_match,0);
  assert.equal(row.blank_response_diagnostic,'/');
});

test('warmup rows retain events but do not invent E-Prime ACC', () => {
  const trial=new TrialCapture('',0); trial.key('/',100); trial.beginBlank(500);
  const row=trial.finish(2500);
  assert.equal(row.warmup,true); assert.equal(row.web_answer_match,null); assert.equal(row.response,'/');
});

test('participant source ranges, zero mode and leading-zero identity', () => {
  const input={Subject:'001',Session:'1',Name:'',Age:'0',Sex:'male',Handedness:'left'};
  assert.equal(validateParticipant(input).Subject,'001');
  assert.equal(validateParticipant({...input,Subject:'0'}).Subject,'0');
  for(const data of [{Subject:'32768'},{Session:'0'},{Age:'-1'},{Age:'1.2'},{Subject:''}]) assert.throws(()=>validateParticipant({...input,...data}));
});

test('CSV preserves source and web answers and escapes spreadsheet formula cells', () => {
  const run={id:'test',version:'test',source_sha256:'sha',status:'finished',participant:{Subject:'001',Name:'=SUM(1,2)\n"name"'},block_order:[1,3,2],trials:[{trial:1,source_answer:'j',expected_key:'z',web_answer_match:1,key_events:[]}]};
  const csv=sessionCSV(run);
  assert.ok(csv.startsWith('\ufeff')); assert.ok(csv.includes('"001"'));
  assert.ok(csv.includes('"source_answer","expected_key","answer"'));
  assert.ok(csv.includes('"j","z",""'));
  assert.ok(csv.includes('"\'=SUM(1,2)\n""name"""')); assert.ok(!csv.includes('undefined'));
});
