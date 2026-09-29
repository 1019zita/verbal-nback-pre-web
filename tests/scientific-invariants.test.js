import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const config = JSON.parse(fs.readFileSync(new URL('../data/experiment.json', import.meta.url), 'utf8'));
const app = fs.readFileSync(new URL('../src/app.js', import.meta.url), 'utf8');

test('approved Verbal N-back pre design remains fixed', () => {
  assert.equal(config.experiment, 'Verbal_N_BACK_pre');
  assert.equal(config.version, '0.4.0-jatos.1');
  assert.deepEqual(config.timing, {stimulus_ms:500, blank_ms:2000, stimulus_input_ms:2500});
  assert.deepEqual(config.blocks.map(block => [block.n, block.trials.length]), [[1,73], [3,75], [2,74]]);
  assert.equal(config.blocks.flatMap(block => block.trials).length, 222);
  assert.equal(config.assets.length, 71);
  for (const block of config.blocks) {
    assert.equal(block.trials.filter(trial => trial.source_answer === '').length, block.n);
    assert.ok(block.trials.slice(block.n).every(trial => trial.source_answer === 'f' || trial.source_answer === 'j'));
    assert.ok(block.trials.every(trial => ({'':'', f:'/', j:'z'})[trial.source_answer] === trial.expected_key));
  }
});

test('debug and JATOS hooks use the same formal trial path', () => {
  assert.match(app, /oneBack\.trials\.slice\(0, 5\)/);
  assert.match(app, /expected_trials:runMode === 'debug' \? 5 : 222/);
  assert.match(app, /store\.saveTrial\(session, row\)/);
  assert.match(app, /store\.saveCheckpoint\(session, checkpoint\)/);
  assert.match(app, /store\.saveFinalResult\(session, csv\)/);
});
