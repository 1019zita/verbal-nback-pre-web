export class LocalStore {
  constructor() { this.queue = Promise.resolve(); this.error = null; }
  async open() {
    this.db = await new Promise((resolve, reject) => {
      const request = indexedDB.open('verbal-nback-pre-local-v1', 1);
      request.onupgradeneeded = () => request.result.createObjectStore('sessions', {keyPath:'id'});
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
      request.onblocked = () => reject(new Error('浏览器数据存储被其他页面阻塞。'));
    });
  }
  save(session) {
    if (!session.logging_enabled) return Promise.resolve();
    const snapshot = structuredClone(session);
    this.queue = this.queue.then(() => new Promise((resolve, reject) => {
      const tx = this.db.transaction('sessions', 'readwrite');
      tx.objectStore('sessions').put(snapshot);
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error || new Error('本机保存被中断。'));
    })).catch(error => { this.error = error; });
    return this.queue;
  }
  async flush() { await this.queue; if (this.error) throw this.error; }
  async list() {
    return new Promise((resolve, reject) => {
      const req = this.db.transaction('sessions').objectStore('sessions').getAll();
      req.onsuccess = () => resolve(req.result.sort((a,b) => b.started_at.localeCompare(a.started_at)));
      req.onerror = () => reject(req.error);
    });
  }
}

export class StorageController {
  constructor(localStore = new LocalStore(), runtime = globalThis) {
    this.local = localStore;
    this.runtime = runtime;
    this.remote = null;
    this.backend = runtime.NBACK_STORAGE_BACKEND || 'local';
    this.lastMessage = '';
  }
  async open() { await this.local.open(); }
  async list() { return this.local.list(); }
  async start(session) {
    if (this.backend !== 'jatos') return;
    const factory = this.runtime.NBackStorageFactories?.jatos;
    if (typeof factory !== 'function') throw new Error('JATOS 存储适配器未加载。');
    const response = await fetch('build-info.json', {cache:'no-cache'});
    if (!response.ok) throw new Error('JATOS 构建信息未找到。');
    const build = await response.json();
    this.remote = factory({
      experimentVersion: build.experiment_version || session.version,
      gitCommit: build.git_commit || 'unknown',
    });
    await this.remote.initialize({session, participant:session.participant, loggingEnabled:session.logging_enabled});
  }
  save(session) { return this.local.save(session); }
  saveTrial(session, row) {
    const localWrite = this.local.save(session);
    if (this.remote && session.logging_enabled) void this.remote.saveTrial({...this.commonFields(session), ...row});
    return localWrite;
  }
  saveCheckpoint(session, checkpoint) {
    const localWrite = this.local.save(session);
    if (this.remote && session.logging_enabled) void this.remote.saveCheckpoint({...this.commonFields(session), ...checkpoint});
    return localWrite;
  }
  async saveFinalResult(session, csvContent) {
    await this.local.save(session);
    if (this.remote && session.logging_enabled) {
      const result = await this.remote.saveFinalResult({
        ...this.commonFields(session),
        status:session.status,
        ended_at:session.ended_at,
        completed_trials:session.completed_trials,
        expected_trials:session.expected_trials,
        block_order:session.block_order,
        environment:session.environment,
        environment_events:session.environment_events,
        conventions:session.conventions,
        error:session.error,
        csvContent,
      });
      this.lastMessage = result?.message || '';
    }
  }
  async flush() {
    const writes = [this.local.flush()];
    if (this.remote) writes.push(this.remote.flush());
    await Promise.all(writes);
  }
  async finishExperiment(status) {
    if (!this.remote) return {message:''};
    const result = await this.remote.finishExperiment(status);
    if (result?.message) this.lastMessage = result.message;
    return result;
  }
  commonFields(session) {
    return {
      run_id:session.id,
      experiment:session.experiment,
      version:session.version,
      source_sha256:session.source_sha256,
      run_mode:session.run_mode,
      Subject:session.participant.Subject,
      Session:session.participant.Session,
      Name:session.participant.Name,
      Age:session.participant.Age,
      Sex:session.participant.Sex,
      Handedness:session.participant.Handedness,
    };
  }
}
