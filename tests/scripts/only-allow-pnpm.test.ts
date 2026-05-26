/**
 * CTR-PNPM-ONLY-ALLOW — W0 (RED)
 *
 * Cobre CA1, CA2, CA3 do ticket.
 *
 * Estado W0: RED — `scripts/only-allow-pnpm.ts` não existe → `node` sai com
 *   código 1 e stderr "Cannot find module", sem a mensagem PT-BR esperada.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const SCRIPT = fileURLToPath(new URL('../../scripts/only-allow-pnpm.ts', import.meta.url));
const CWD = resolve(fileURLToPath(new URL('../../', import.meta.url)));

const runWith = (userAgent: string) =>
  spawnSync('node', ['--experimental-strip-types', '--no-warnings', SCRIPT], {
    cwd: CWD,
    encoding: 'utf-8',
    timeout: 30_000,
    // sobrescreve qualquer npm_config_user_agent herdado do runner pnpm
    env: { ...process.env, npm_config_user_agent: userAgent },
  });

describe('only-allow-pnpm guard', () => {
  it('CA1: aborta (exit ≠ 0) quando o user agent é npm', () => {
    const r = runWith('npm/10.0.0 node/v24.16.0 linux x64');
    assert.notEqual(r.status, 0);
    assert.match(r.stderr, /ADR-0012/);
  });

  it('CA1: aborta (exit ≠ 0) quando o user agent é yarn', () => {
    const r = runWith('yarn/4.0.0 npm/? node/v24.16.0 linux x64');
    assert.notEqual(r.status, 0);
  });

  it('CA1: aborta (exit ≠ 0) quando o user agent está vazio', () => {
    const r = runWith('');
    assert.notEqual(r.status, 0);
  });

  it('CA2: permite (exit 0) quando o user agent é pnpm', () => {
    const r = runWith('pnpm/10.33.4 npm/? node/v24.16.0 linux x64');
    assert.equal(r.status, 0);
  });

  it('CA3: mensagem de erro está em PT-BR e cita ADR-0012', () => {
    const r = runWith('npm/10.0.0 node/v24.16.0 linux x64');
    assert.match(r.stderr, /pnpm/);
    assert.match(r.stderr, /ADR-0012/);
  });
});
