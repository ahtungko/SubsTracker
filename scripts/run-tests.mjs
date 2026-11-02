import { spawnSync } from 'node:child_process';
import { nodeTests, workerTests } from './test-files.mjs';
let failed = false;
// Bound concurrent workerd instances for reliable local runs on Windows.
for (let i = 0; i < workerTests.length; i += 4) {
  const result = spawnSync(process.execPath, ['node_modules/vitest/vitest.mjs', 'run', ...workerTests.slice(i, i + 4)], { stdio: 'inherit' });
  if (result.status !== 0) failed = true;
}
const result = spawnSync(process.execPath, ['--test', '--test-concurrency=1', ...nodeTests], { stdio: 'inherit' });
process.exitCode = failed || result.status !== 0 ? 1 : 0;
