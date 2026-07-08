/**
 * CI-NOTIFICATIONS-MAILPIT (#135 / US4 spec 033) — W0 RED.
 *
 * Garante que a suíte de integração de e-mail passa a rodar no CI:
 *  - o orquestrador `scripts/ci/test-integration.ts` sobe o serviço `mailpit` e exporta
 *    as envs SMTP apontando para ele (além do gate NOTIFICATIONS_INTEGRATION já existente);
 *  - existe um workflow dedicado `integration-notifications.yml` com path filter,
 *    `workflow_dispatch` e actions pinadas por SHA (padrão do repo — ADR-0011).
 *
 * Estilo: asserção de estrutura no source (molde de `test-integration-auth-script.test.ts`),
 * já que `SUITES` não é exportado.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const read = (rel: string): string =>
  readFileSync(fileURLToPath(new URL(rel, import.meta.url)), 'utf-8');
const tryRead = (rel: string): string => {
  try {
    return read(rel);
  } catch {
    return '';
  }
};

const pkg = JSON.parse(read('../../package.json')) as { scripts?: Record<string, string> };
const script = pkg.scripts?.['test:integration:notifications'] ?? '';
const orchestrator = read('../../scripts/ci/test-integration.ts');
const notifBlock = /notifications:\s*\{[\s\S]*?\n {2}\},/.exec(orchestrator)?.[0] ?? '';

describe('test:integration:notifications — suíte no orquestrador (CI Mailpit #135/US4)', () => {
  it('CA1a: o script existe e delega ao orquestrador com a suíte notifications', () => {
    assert.ok(
      script.length > 0,
      'scripts["test:integration:notifications"] ausente no package.json',
    );
    assert.match(script, /scripts\/ci\/test-integration\.ts notifications\b/);
  });

  it('CA1b: a suíte notifications sobe o serviço mailpit', () => {
    assert.ok(notifBlock.length > 0, 'bloco `notifications` não localizado no orquestrador');
    assert.match(notifBlock, /services:\s*\[[^\]]*'mailpit'/);
  });

  it('CA1c: a suíte notifications exporta as envs SMTP p/ o mailpit + mantém o gate', () => {
    assert.match(notifBlock, /NOTIFICATIONS_INTEGRATION/);
    assert.match(notifBlock, /SMTP_HOST/);
    assert.match(notifBlock, /SMTP_PORT/);
    assert.match(notifBlock, /1025/);
    assert.match(notifBlock, /SMTP_SECURE/);
  });
});

describe('workflow integration-notifications.yml (CI Mailpit #135/US4)', () => {
  const wf = tryRead('../../.github/workflows/integration-notifications.yml');

  it('CA2: existe, dispara em PRs que tocam notifications/email-dispatch + workflow_dispatch', () => {
    assert.ok(wf.length > 0, 'workflow .github/workflows/integration-notifications.yml ausente');
    assert.match(wf, /src\/modules\/notifications/);
    assert.match(wf, /workers\/email-dispatch/);
    assert.match(wf, /workflow_dispatch/);
    assert.match(wf, /test:integration:notifications/);
  });

  it('CA3: todas as actions estão pinadas por SHA (nenhuma tag mutável)', () => {
    const uses = [...wf.matchAll(/uses:\s*(\S+)/g)].map((m) => m[1] ?? '');
    assert.ok(uses.length > 0, 'nenhuma action `uses:` no workflow');
    for (const u of uses) {
      assert.match(u, /@[0-9a-f]{40}$/, `action não pinada por SHA: ${u}`);
    }
  });
});
