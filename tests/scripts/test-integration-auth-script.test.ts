/**
 * AUTH-TEST-INTEGRATION-SCRIPT — W0 (RED)
 *
 * Cobre CA1-CA4 do ticket: garante que `package.json` declara um runner dedicado
 * `test:integration:auth` para as suites Drizzle gated do modulo auth.
 *
 * Estado W0: RED — o script `test:integration:auth` ainda nao existe no package.json,
 *   entao CA1 falha (string vazia) e os demais asserts de conteudo nao casam.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const pkgRaw = readFileSync(fileURLToPath(new URL('../../package.json', import.meta.url)), 'utf-8');
const pkg = JSON.parse(pkgRaw) as { scripts?: Record<string, string> };
const script = pkg.scripts?.['test:integration:auth'] ?? '';

describe('package.json -> test:integration:auth', () => {
  it('CA1: o script existe e nao e vazio', () => {
    assert.ok(script.length > 0, 'scripts["test:integration:auth"] ausente no package.json');
  });

  it('CA2: gate de ambiente (MYSQL_INTEGRATION=1 + --test-concurrency=1)', () => {
    assert.match(script, /MYSQL_INTEGRATION=1/);
    assert.match(script, /--test-concurrency=1/);
  });

  it('CA3: cobre as 4 suites Drizzle/schema de auth', () => {
    assert.match(script, /refresh-token-repository\.drizzle/);
    assert.match(script, /user-repository\.drizzle/);
    assert.match(script, /role-repository\.drizzle/);
    assert.match(script, /schema-hardening/);
  });

  it('CA4: sobe mysql via compose --wait e faz cleanup (down -v + rm secrets)', () => {
    assert.match(script, /docker compose up -d mysql --wait/);
    assert.match(script, /docker compose down -v/);
    assert.match(script, /rm -f secrets\/mysql_\*\.txt/);
  });
});
