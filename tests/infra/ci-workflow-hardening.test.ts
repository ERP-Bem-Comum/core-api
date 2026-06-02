import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const wfUrl = new URL('../../.github/workflows/test-and-quality.yml', import.meta.url);
const load = (): Promise<string> => readFile(wfUrl, 'utf8');

test('declara permissions mínimas (contents: read) antes de jobs', async () => {
  const wf = await load();
  const permIdx = wf.indexOf('\npermissions:');
  const jobsIdx = wf.indexOf('\njobs:');
  assert.ok(permIdx !== -1, 'falta bloco permissions:');
  assert.ok(jobsIdx !== -1, 'falta bloco jobs:');
  assert.ok(permIdx < jobsIdx, 'permissions deve vir antes de jobs');
  assert.match(wf.slice(permIdx, jobsIdx), /contents:\s*read/);
});

test('todas as actions remotas estão pinadas por SHA de 40 hex', async () => {
  const wf = await load();
  const usesLines = wf.split('\n').filter((l) => /^\s*-?\s*uses:\s*/.test(l));
  assert.ok(usesLines.length > 0, 'esperava ao menos um uses:');
  for (const line of usesLines) {
    const ref = line.replace(/^\s*-?\s*uses:\s*/, '').trim();
    if (ref.startsWith('./') || ref.startsWith('docker://')) continue; // local/docker
    assert.match(
      ref,
      /^[\w.-]+\/[\w.-]+@[0-9a-f]{40}(\s+#.*)?$/,
      `action não pinada por SHA: ${ref}`,
    );
  }
});

test('tem concurrency com cancel-in-progress: true', async () => {
  const wf = await load();
  const cIdx = wf.indexOf('\nconcurrency:');
  assert.ok(cIdx !== -1, 'falta bloco concurrency:');
  assert.match(wf.slice(cIdx, cIdx + 200), /cancel-in-progress:\s*true/);
});

test('roda actionlint no CI', async () => {
  const wf = await load();
  assert.match(wf, /actionlint/i);
});

test('preserva a ordem dos gates de qualidade', async () => {
  const wf = await load();
  const order = ['typecheck', 'format:check', 'lint', 'audit', 'test'].map((g) =>
    wf.indexOf(`pnpm run ${g}`) === -1 ? wf.indexOf(`pnpm ${g}`) : wf.indexOf(`pnpm run ${g}`),
  );
  for (const idx of order) assert.ok(idx !== -1, 'gate ausente');
  const sorted = [...order].sort((a, b) => a - b);
  assert.deepEqual(order, sorted, 'gates fora de ordem');
});
