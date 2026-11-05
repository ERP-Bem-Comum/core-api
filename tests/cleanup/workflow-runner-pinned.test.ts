/**
 * WORKFLOW-RUNNER-PINNED (#1105) — todo job do CI declara um runner Ubuntu explícito, e o mesmo em
 * todos os workflows.
 *
 * Molde: tests/cleanup/*.test.ts. Irmão de `node-version-single-source.test.ts`, que varre os mesmos
 * workflows pela versão do Node.
 *
 * ## Por que existe
 *
 * `ubuntu-latest` é um alias que o GitHub reatribui. Entre 28/10 e 03/11/2026 ele passou de 24.04
 * (Docker Engine 28.0.4) para 26.04 (Engine 29.4.2) sem commit nosso, e o Mailpit morreu no seccomp
 * do Engine novo (#1103). As actions já eram pinadas por SHA e as imagens por digest (ADR-0011
 * §"Pin de versões"); o runner era a única dependência do CI que mudava em silêncio.
 *
 * ## O que o gate exige
 *
 * 1. Todo `runs-on` é um label `ubuntu-NN.NN` literal — nem alias móvel, nem expressão `${{ }}`,
 *    que esconderia o valor do gate.
 * 2. A versão é a MESMA em todos os jobs. Subir de runner é um único ato, visível em diff, com os
 *    checks do PR medindo o ambiente novo antes do merge — nunca metade do CI num SO e metade noutro.
 *
 * ## O que NÃO cobre, e é declarado
 *
 * Se a versão pinada ainda é suportada pelo GitHub — isso exige rede, e o gate é offline. Runner
 * aposentado falha o job na hora, ruidoso, sem precisar de teste.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { execFileSync } from 'node:child_process';

import { PROJECT_ROOT, readSource } from '../support/source-scan.ts';

type Workflow = Readonly<{ path: string; content: string }>;
type RunsOn = Readonly<{ path: string; line: number; value: string }>;

const PINNED_UBUNTU = /^ubuntu-\d{2}\.\d{2}$/;

/** Workflows VERSIONADOS — `git ls-files`, não `readdirSync` (rule `testing.md`). */
const workflowFiles = (): readonly string[] =>
  execFileSync(
    'git',
    ['-C', PROJECT_ROOT, 'ls-files', '.github/workflows/*.yml', '.github/workflows/*.yaml'],
    { encoding: 'utf-8' },
  )
    .split('\n')
    .filter((l) => l.length > 0);

const collectRunsOn = (workflows: readonly Workflow[]): readonly RunsOn[] =>
  workflows.flatMap(({ path, content }) =>
    content.split('\n').flatMap((text, i) => {
      const m = /^\s*runs-on:\s*(.+?)\s*(?:#.*)?$/.exec(text);
      const value = m?.[1]?.replace(/^['"]|['"]$/g, '');
      return value === undefined ? [] : [{ path, line: i + 1, value }];
    }),
  );

/** Violações em PT-BR, uma por linha ofensora — vazio quando o CI está pinado e coerente. */
const runnerViolations = (workflows: readonly Workflow[]): readonly string[] => {
  const all = collectRunsOn(workflows);
  const notPinned = all
    .filter((r) => !PINNED_UBUNTU.test(r.value))
    .map((r) => `${r.path}:${String(r.line)} usa \`${r.value}\` — exige \`ubuntu-NN.NN\` literal`);
  const versions = [...new Set(all.map((r) => r.value).filter((v) => PINNED_UBUNTU.test(v)))];
  const divergent =
    versions.length > 1
      ? [`versões divergentes entre jobs: ${versions.join(', ')} — a troca é de todos de uma vez`]
      : [];
  return [...notPinned, ...divergent];
};

const repoWorkflows = (): readonly Workflow[] =>
  workflowFiles().map((path) => ({ path, content: readSource(path) }));

describe('WORKFLOW-RUNNER-PINNED — o runner do CI é explícito e único (#1105)', () => {
  it('CA1/CA3: todo runs-on dos workflows versionados é o mesmo ubuntu-NN.NN literal', () => {
    assert.deepEqual(runnerViolations(repoWorkflows()), []);
  });

  it('guarda contra verde por vacuidade: a varredura enxerga os jobs', () => {
    assert.ok(
      collectRunsOn(repoWorkflows()).length >= 10,
      'menos de 10 runs-on encontrados — a varredura deixou de enxergar os workflows',
    );
  });

  it('CA2 (contraprova): acusa alias móvel e expressão, com arquivo e linha', () => {
    const v = runnerViolations([
      { path: 'a.yml', content: 'jobs:\n  x:\n    runs-on: ubuntu-latest\n' },
      { path: 'b.yml', content: 'jobs:\n  y:\n    runs-on: ${{ matrix.os }}\n' },
    ]);
    assert.equal(v.length, 2);
    assert.match(v[0] ?? '', /a\.yml:3 .*ubuntu-latest/);
    assert.match(v[1] ?? '', /b\.yml:3 .*matrix\.os/);
  });

  it('CA3 (contraprova): acusa versões diferentes entre jobs', () => {
    const v = runnerViolations([
      { path: 'a.yml', content: '    runs-on: ubuntu-24.04\n' },
      { path: 'b.yml', content: "    runs-on: 'ubuntu-26.04' # comentário\n" },
    ]);
    assert.deepEqual(v.length, 1);
    assert.match(v[0] ?? '', /divergentes.*ubuntu-24\.04.*ubuntu-26\.04/);
  });

  it('aceita a mesma versão pinada em vários jobs, com aspas ou comentário', () => {
    assert.deepEqual(
      runnerViolations([
        { path: 'a.yml', content: '    runs-on: ubuntu-26.04\n    runs-on: "ubuntu-26.04"\n' },
        { path: 'b.yml', content: '    runs-on: ubuntu-26.04 # fixo\n' },
      ]),
      [],
    );
  });
});
