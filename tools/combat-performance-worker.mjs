import { parentPort } from 'node:worker_threads';
import { simulateBattle } from './combat-simulator.mjs';

parentPort.on('message', ({ id, jobs, maxActions }) => {
  try {
    const result = jobs.map(({ seed, configs }) => configs.map(config => config ? simulateBattle(config, seed, maxActions) : null));
    parentPort.postMessage({ id, result });
  } catch (error) {
    parentPort.postMessage({ id, error: error?.stack || error?.message || String(error) });
  }
});
