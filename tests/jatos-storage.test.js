import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

function harness(options = {}) {
  const lines = [];
  const uploads = [];
  const warnings = [];
  const endings = [];
  const jatos = {
    studyResultId:41,
    onLoad(callback) { callback(); },
    addJatosIds(target) { return {...target, studyId:10, componentId:20, workerId:30, studyResultId:41, componentResultId:42}; },
    showBeforeUnloadWarning(value) { warnings.push(value); },
    async appendResultData(line) {
      if (options.failAppendAt === lines.length) throw new Error('append failed');
      lines.push(line);
    },
    async uploadResultFile(blob, filename) {
      uploads.push({filename, text:await blob.text(), bytes:new Uint8Array(await blob.arrayBuffer())});
    },
    async endStudyWithoutRedirect(successful, message) { endings.push({successful, message}); },
  };
  const sandbox = {jatos, Blob, console, setTimeout, clearTimeout};
  sandbox.window = sandbox;
  vm.runInNewContext(fs.readFileSync(new URL('../src/jatos-storage.js', import.meta.url), 'utf8'), sandbox);
  return {sandbox, lines, uploads, warnings, endings};
}

function session() {
  return {
    id:'run-abc', experiment:'Verbal_N_BACK_pre', version:'0.4.0-jatos.1', source_sha256:'source-hash',
    started_at:'2026-09-29T00:00:00.000Z', run_mode:'debug', expected_trials:5,
    block_order:[1], participant:{Subject:'001', Session:'01', Name:'测试', Age:'20', Sex:'female', Handedness:'right'},
    environment:{frame:[1024,768]}, conventions:{key_mapping:'z/slash'},
  };
}

test('JATOS adapter appends ordered records, uploads exact CSV, and ends after flush', async () => {
  const h = harness();
  const adapter = h.sandbox.NBackStorageFactories.jatos({experimentVersion:'0.4.0-jatos.1', gitCommit:'abc123'});
  await adapter.initialize({session:session(), participant:session().participant, loggingEnabled:true});
  await adapter.saveTrial({run_id:'run-abc', block:1, n:1, trial:1, source_answer:'', expected_key:'', response:''});
  await adapter.saveTrial({run_id:'run-abc', block:1, n:1, trial:2, source_answer:'f', expected_key:'/', response:'/'});
  await adapter.saveCheckpoint({block:1, n:1, completed_trials:2});
  const csv = '\ufeff"run_id","trial"\r\n"run-abc","1"';
  await adapter.saveFinalResult({status:'finished', completed_trials:2, expected_trials:5, block_order:[1], csvContent:csv});
  await adapter.finishExperiment({successful:true, message:'done'});

  const records = h.lines.map(line => JSON.parse(line));
  assert.deepEqual(records.map(record => record.record_type), [
    'session_start', 'trial', 'trial', 'checkpoint', 'final', 'csv_upload_attempt', 'csv_upload_status',
  ]);
  assert.equal(records[1].source_answer, '');
  assert.equal(records[2].expected_key, '/');
  assert.equal(records[2].git_commit, 'abc123');
  assert.equal(records[2].participant_id, '001');
  assert.equal(records[4].trial_count, 2);
  assert.deepEqual(h.warnings, [true, false]);
  assert.deepEqual(h.endings, [{successful:true, message:'done'}]);
  assert.equal(h.uploads.length, 1);
  assert.equal(h.uploads[0].filename, 'verbal-nback-pre_debug_run-abc.csv');
  assert.equal(h.uploads[0].text, csv.slice(1));
  assert.deepEqual(Array.from(h.uploads[0].bytes.slice(0, 3)), [0xef, 0xbb, 0xbf]);
});

test('first append failure is retained and prevents successful completion', async () => {
  const h = harness({failAppendAt:0});
  const adapter = h.sandbox.NBackStorageFactories.jatos({experimentVersion:'test', gitCommit:'test'});
  await assert.rejects(
    adapter.initialize({session:session(), participant:session().participant, loggingEnabled:true}),
    /append failed/,
  );
  assert.deepEqual(h.endings, []);
});

test('Subject 0 ends JATOS lifecycle without participant result records', async () => {
  const h = harness();
  const adapter = h.sandbox.NBackStorageFactories.jatos({experimentVersion:'test', gitCommit:'test'});
  const zero = session(); zero.participant.Subject = '0';
  await adapter.initialize({session:zero, participant:zero.participant, loggingEnabled:false});
  await adapter.finishExperiment({successful:true, message:'no logging'});
  assert.equal(h.lines.length, 0);
  assert.deepEqual(h.endings, [{successful:true, message:'no logging'}]);
});
