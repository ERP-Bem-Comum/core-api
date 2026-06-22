/**
 * AUTH-TEST-INTEGRATION-SCRIPT — atualizado p/ Fase 1 (repo cleanup).
 *
 * A lógica de integração saiu do string inline do package.json para o orquestrador
 * `scripts/test-integration.ts`. Este teste garante que a suite 'auth' segue:
 *  - plugada no package.json (delega ao orquestrador), e
 *  - declarada no orquestrador com gate (MYSQL_INTEGRATION + concorrência 1), as 4 suites
 *    Drizzle/schema de auth, subida do MySQL via compose --wait e cleanup.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const pkg = JSON.parse(
  readFileSync(fileURLToPath(new URL('../../package.json', import.meta.url)), 'utf-8'),
) as { scripts?: Record<string, string> };
const script = pkg.scripts?.['test:integration:auth'] ?? '';
const orchestrator = readFileSync(
  fileURLToPath(new URL('../../scripts/test-integration.ts', import.meta.url)),
  'utf-8',
);

describe('test:integration:auth (orquestrador)', () => {
  it('CA1: o script existe e delega ao orquestrador com a suite auth', () => {
    assert.ok(script.length > 0, 'scripts["test:integration:auth"] ausente no package.json');
    assert.match(script, /scripts\/test-integration\.ts auth\b/);
  });

  it('CA2: o orquestrador aplica o gate de ambiente (MYSQL_INTEGRATION + concorrência 1)', () => {
    assert.match(orchestrator, /MYSQL_INTEGRATION/);
    assert.match(orchestrator, /concurrency1|--test-concurrency=1/);
  });

  it('CA3: cobre as 4 suites Drizzle/schema de auth', () => {
    assert.match(orchestrator, /refresh-token-repository\.drizzle/);
    assert.match(orchestrator, /user-repository\.drizzle/);
    assert.match(orchestrator, /role-repository\.drizzle/);
    assert.match(orchestrator, /schema-hardening/);
  });

  it('CA4: sobe mysql via compose --wait e faz cleanup (down -v + secrets)', () => {
    assert.match(orchestrator, /'compose', 'up'/);
    assert.match(orchestrator, /'--wait'/);
    assert.match(orchestrator, /'compose', 'down', '-v'/);
    assert.match(orchestrator, /removeTestSecrets/);
  });
});
