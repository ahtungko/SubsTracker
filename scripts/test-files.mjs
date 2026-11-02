import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
export function testFiles(dir = 'tests') {
  return readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const path = join(dir, entry.name).replaceAll('\\', '/');
    return entry.isDirectory() ? testFiles(path) : path.endsWith('.test.js') ? [path] : [];
  });
}
export const nodeTests = testFiles().filter(path => /from ['"]node:test['"]/.test(readFileSync(path, 'utf8')));
export const workerTests = testFiles().filter(path => !nodeTests.includes(path));
