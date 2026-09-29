(function (global) {
  'use strict';

  global.NBackStorageFactories = global.NBackStorageFactories || {};
  global.NBackStorageFactories.jatos = function createJatosStorage(deploymentMetadata) {
    let context = null;
    let queue = Promise.resolve();
    let firstWriteError = null;
    let readyPromise = null;
    const recordedTrials = [];

    function ready() {
      if (readyPromise) return readyPromise;
      readyPromise = new Promise((resolve, reject) => {
        if (!global.jatos || typeof global.jatos.onLoad !== 'function') {
          reject(new Error('jatos.js is unavailable'));
          return;
        }
        global.jatos.onLoad(resolve);
      });
      return readyPromise;
    }

    function jatosIds() {
      if (typeof global.jatos.addJatosIds === 'function') return global.jatos.addJatosIds({});
      return {
        studyId:global.jatos.studyId,
        componentId:global.jatos.componentId,
        workerId:global.jatos.workerId,
        studyResultId:global.jatos.studyResultId,
        componentResultId:global.jatos.componentResultId,
      };
    }

    function envelope(recordType, data = {}) {
      const ids = jatosIds();
      const session = context?.session || {};
      return {
        record_type:recordType,
        participant_id:String(session.participant?.Subject ?? ''),
        session_identifier:String(ids.studyResultId ?? global.jatos.studyResultId ?? ''),
        run_id:session.id,
        experiment:session.experiment,
        experiment_version:deploymentMetadata.experimentVersion,
        git_commit:deploymentMetadata.gitCommit,
        timestamp:new Date().toISOString(),
        ...ids,
        ...data,
      };
    }

    function append(record) {
      const line = JSON.stringify(record) + '\n';
      queue = queue.then(() => global.jatos.appendResultData(line)).catch(error => {
        if (!firstWriteError) firstWriteError = error;
      });
      return queue;
    }

    async function flush() {
      await queue;
      if (firstWriteError) throw firstWriteError;
    }

    return {
      async initialize(initialContext) {
        await ready();
        context = initialContext;
        if (typeof global.jatos.showBeforeUnloadWarning === 'function') global.jatos.showBeforeUnloadWarning(true);
        if (!context.loggingEnabled) return;
        const session = context.session;
        await append(envelope('session_start', {
          version:session.version,
          source_sha256:session.source_sha256,
          started_at:session.started_at,
          run_mode:session.run_mode,
          expected_trials:session.expected_trials,
          block_order:session.block_order,
          participant:session.participant,
          environment:session.environment,
          conventions:session.conventions,
        }));
        await flush();
      },
      saveTrial(row) {
        const record = envelope('trial', row);
        recordedTrials.push(record);
        return append(record);
      },
      saveCheckpoint(checkpoint) { return append(envelope('checkpoint', checkpoint)); },
      async saveFinalResult(payload) {
        await append(envelope('final', {
          status:payload.status,
          ended_at:payload.ended_at,
          completed_trials:payload.completed_trials,
          expected_trials:payload.expected_trials,
          block_order:payload.block_order,
          environment:payload.environment,
          environment_events:payload.environment_events,
          conventions:payload.conventions,
          error:payload.error,
          trial_count:recordedTrials.length,
        }));
        const session = context.session;
        const mode = session.run_mode === 'debug' ? '_debug' : '';
        const filename = `verbal-nback-pre${mode}_${session.id}.csv`;
        const hasUpload = typeof global.jatos.uploadResultFile === 'function';
        await append(envelope('csv_upload_attempt', {filename, has_upload_fn:hasUpload, recorded_trials_count:recordedTrials.length}));
        if (!hasUpload) {
          await append(envelope('csv_upload_status', {success:false, filename, error:'jatos.uploadResultFile is unavailable'}));
          await flush();
          throw new Error('JATOS CSV 上传接口不可用。');
        }
        try {
          const blob = new global.Blob([payload.csvContent], {type:'text/csv;charset=utf-8'});
          await global.jatos.uploadResultFile(blob, filename);
          await append(envelope('csv_upload_status', {success:true, filename}));
        } catch (error) {
          await append(envelope('csv_upload_status', {success:false, filename, error:error?.message || String(error)}));
          await flush();
          throw error;
        }
        await flush();
        return {message:'结果已保存到 JATOS，并上传逐 trial CSV。'};
      },
      flush,
      async finishExperiment(status) {
        await flush();
        if (typeof global.jatos.showBeforeUnloadWarning === 'function') global.jatos.showBeforeUnloadWarning(false);
        const successful = !status || status.successful !== false;
        const message = status?.message ? String(status.message).slice(0, 255) : '';
        if (typeof global.jatos.endStudyWithoutRedirect === 'function') {
          await global.jatos.endStudyWithoutRedirect(successful, message);
        } else if (typeof global.jatos.endStudyAjax === 'function') {
          await global.jatos.endStudyAjax(successful, message);
        } else {
          throw new Error('JATOS end-study function is unavailable');
        }
        return {message:''};
      },
    };
  };
})(window);
