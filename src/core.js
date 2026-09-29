export function shuffleBlocks(blocks, randomUint32 = () => crypto.getRandomValues(new Uint32Array(1))[0]) {
  const result = [...blocks];
  for (let i = result.length - 1; i > 0; i--) {
    const range = i + 1;
    const limit = Math.floor(0x100000000 / range) * range;
    let value;
    do { value = randomUint32(); } while (value >= limit);
    const j = value % range;
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

// Keeps two independently timed first-response observations. These are web
// observations, not a claim about untested E-Prime overlapping-mask arbitration.
export class TrialCapture {
  constructor(expectedKey, onset, stimulusWindow = 2500, blankWindow = 2000) {
    this.expectedKey = expectedKey;
    this.onset = onset;
    this.stimulusWindow = stimulusWindow;
    this.blankWindow = blankWindow;
    this.blankOnset = null;
    this.response = null;
    this.blankResponse = null;
    this.events = [];
  }
  beginBlank(time) { this.blankOnset = time; }
  key(key, time, repeat = false) {
    if (!['z', '/'].includes(key)) return;
    const event = {key, onset_relative_ms: time - this.onset, repeat};
    this.events.push(event);
    if (!this.response && time >= this.onset && time < this.onset + this.stimulusWindow) {
      this.response = {key, rt_ms: time - this.onset};
    }
    if (this.blankOnset !== null && !this.blankResponse && time >= this.blankOnset && time < this.blankOnset + this.blankWindow) {
      this.blankResponse = {key, rt_ms: time - this.blankOnset};
    }
  }
  finish(end) {
    return {
      response: this.response?.key ?? '',
      rt_ms: this.response?.rt_ms ?? null,
      web_answer_match: this.expectedKey ? Number(this.response?.key === this.expectedKey) : null,
      warmup: this.expectedKey === '',
      stimulus_onset_ms: this.onset,
      blank_onset_ms: this.blankOnset,
      trial_end_ms: end,
      actual_stimulus_ms: this.blankOnset === null ? null : this.blankOnset - this.onset,
      actual_blank_ms: this.blankOnset === null ? null : end - this.blankOnset,
      blank_response_diagnostic: this.blankResponse?.key ?? '',
      blank_rt_ms_diagnostic: this.blankResponse?.rt_ms ?? null,
      key_events: this.events,
    };
  }
}

export function validateParticipant(values) {
  for (const [key, min, max] of [['Subject', 0, 32767], ['Session', 1, 32767], ['Age', 0, 150]]) {
    if (!/^\d+$/.test(values[key]) || Number(values[key]) < min || Number(values[key]) > max) throw new Error(`${key} 超出原程序允许的范围。`);
  }
  if (values.Name.length > 255) throw new Error('姓名不能超过 255 个字符。');
  if (!['male', 'female'].includes(values.Sex) || !['left', 'right'].includes(values.Handedness)) throw new Error('请检查性别和惯用手。');
  return {...values};
}

export function csvCell(value) {
  let s = value === null || value === undefined ? '' : typeof value === 'object' ? JSON.stringify(value) : String(value);
  // Prevent formula execution in spreadsheet apps. Raw values remain in JSON.
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
  return '"' + s.replaceAll('"', '""') + '"';
}

export function sessionCSV(session) {
  const columns = ['run_id','version','source_sha256','run_mode','status','Subject','Session','Name','Age','Sex','Handedness','block_order','block','n','trial','global_trial','list','stimulus','source_answer','expected_key','answer','warmup','response','rt_ms','web_answer_match','stimulus_onset_ms','blank_onset_ms','trial_end_ms','actual_stimulus_ms','actual_blank_ms','blank_response_diagnostic','blank_rt_ms_diagnostic','source_line','key_events'];
  const rows = session.trials.map(trial => ({run_id:session.id,version:session.version,source_sha256:session.source_sha256,run_mode:session.run_mode ?? '',status:session.status,...session.participant,block_order:session.block_order.join('-'),...trial}));
  return '\ufeff' + [columns.map(csvCell).join(','), ...rows.map(row => columns.map(c => csvCell(row[c])).join(','))].join('\r\n');
}
