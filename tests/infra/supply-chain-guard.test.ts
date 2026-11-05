/**
 * SUPPLY-CHAIN GUARD — as travas de supply-chain e de CI não podem ser afrouxadas em silêncio.
 *
 * Origem: incidente de 28/10/2026 (política espelhada do ADR-0023 do web-app). A `trustPolicy:
 * no-downgrade` foi o que recusou, no front, o `seroval@1.7.2` publicado sem provenance (possível
 * takeover). Uma trava que segura um ataque não pode depender de alguém lembrar de não apagá-la num PR
 * de "destravar o install". Esta suíte reprova se:
 *   - o `pnpm-workspace.yaml` perder a quarentena, a política de confiança ou o bloqueio de fonte exótica;
 *   - um workflow usar action por TAG (móvel) em vez de SHA de commit (ADR-0011 §"Pin de versões");
 *   - um workflow usar `--ignore-registry-errors` (o audit sai 0 sem ter auditado);
 *   - um workflow interpolar texto controlado por quem abre o PR (branch, título, corpo) num comando —
 *     injeção de comando no runner; o valor tem de passar por `env:`;
 *   - um workflow não declarar `permissions:` no topo (o GITHUB_TOKEN herdaria escrita).
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const workspace = readFileSync(join(root, 'pnpm-workspace.yaml'), 'utf8');
const workflowsDir = join(root, '.github', 'workflows');
const workflows = readdirSync(workflowsDir)
  .filter((f) => /\.ya?ml$/.test(f))
  .map((f) => ({ name: f, text: readFileSync(join(workflowsDir, f), 'utf8') }));

/** Valor de uma chave de topo do YAML (`chave: valor  # comentário`). */
const setting = (key: string): string | undefined => {
  const line = workspace.split('\n').find((l) => l.startsWith(`${key}:`));
  return line
    ?.slice(key.length + 1)
    .split('#')[0]
    ?.trim();
};

/** Workflow sem as linhas de comentário — comentário pode citar uma flag para explicar por que é proibida. */
const code = (text: string): string => text.replace(/^\s*#.*$/gm, '');

describe('supply-chain — pnpm-workspace.yaml', () => {
  it('quarentena de versões novas: minimumReleaseAge >= 1440 (1 dia) e estrita', () => {
    assert.ok(
      Number(setting('minimumReleaseAge')) >= 1440,
      'minimumReleaseAge abaixo de 1440 ou ausente',
    );
    assert.equal(setting('minimumReleaseAgeStrict'), 'true');
  });

  it('política de confiança: trustPolicy no-downgrade', () => {
    assert.equal(setting('trustPolicy'), 'no-downgrade');
  });

  it('bloqueio de fonte exótica em dependência transitiva', () => {
    assert.equal(setting('blockExoticSubdeps'), 'true');
  });

  it('nenhum build script liberado em massa', () => {
    assert.doesNotMatch(workspace, /dangerouslyAllowAllBuilds:\s*true/);
  });
});

describe('CI — workflows', () => {
  it('toda action externa pinada por SHA de commit (40 hex), nunca por tag', () => {
    const offenders = workflows.flatMap(({ name, text }) =>
      [...code(text).matchAll(/^\s*-?\s*uses:\s*([^\s#]+)/gm)]
        .map((m) => m[1] ?? '')
        .filter((ref) => !ref.startsWith('./') && !/@[0-9a-f]{40}$/.test(ref))
        .map((ref) => `${name}: ${ref}`),
    );
    assert.deepEqual(offenders, [], `Action por tag (móvel): ${offenders.join('; ')}`);
  });

  it('nenhum audit com --ignore-registry-errors (falha fechada)', () => {
    const offenders = workflows
      .filter(({ text }) => code(text).includes('--ignore-registry-errors'))
      .map((w) => w.name);
    assert.deepEqual(offenders, [], `--ignore-registry-errors em: ${offenders.join(', ')}`);
  });

  it('texto controlado pelo autor do PR só entra via env:, nunca interpolado em comando', () => {
    const untrusted =
      /\$\{\{\s*github\.(head_ref|event\.pull_request\.(head\.ref|title|body)|event\.issue\.(title|body)|event\.comment\.body)\s*\}\}/;
    const offenders = workflows.flatMap(({ name, text }) =>
      text
        .split('\n')
        .map((line, i) => ({ line, n: i + 1 }))
        .filter(({ line }) => untrusted.test(line) && !/^\s+[A-Z][A-Z0-9_]*:\s*\$\{\{/.test(line))
        .map(({ n }) => `${name}:${String(n)}`),
    );
    assert.deepEqual(offenders, [], `Interpolação insegura em: ${offenders.join(', ')}`);
  });

  it('todo workflow declara permissions: no topo', () => {
    const offenders = workflows
      .filter(({ text }) => !/^permissions:/m.test(text))
      .map((w) => w.name);
    assert.deepEqual(offenders, [], `Sem permissions: no topo: ${offenders.join(', ')}`);
  });
});
