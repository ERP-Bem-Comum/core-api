/**
 * INTEGRATION-ORPHANS — todo teste que depende de infra roda em algum lugar.
 *
 * Molde: tests/cleanup/*.test.ts (varrem o fonte e exigem um estado desejado).
 *
 * Um teste gated por `*_INTEGRATION` (MySQL, MinIO, Mailpit, ETL, compose) é PULADO pelo
 * `pnpm test`, que não sobe infra. Ele só executa se uma suíte de `scripts/ci/test-integration.ts`
 * o listar e passar a variável — e essa suíte só executa no CI se estiver na matrix de
 * `.github/workflows/integration.yml`. Fora dos dois, o teste passa sem fazer nada em toda parte:
 * typecheck verde, lint verde, `pnpm test` verde, e cobertura que só existe no papel.
 *
 * Medido em 06/11/2026: 20 arquivos nessa situação, de 4 módulos e 13 commits diferentes. Alguns
 * nunca rodaram desde que foram escritos. Uma nota de memória já tinha medido 3 em 20/10 — o
 * número só cresceu, porque nada o cobrava. O replanejamento de cada um vive em
 * `.tmp/replanejamento-integracao/PLANO.md` da épica (fora do git) e na mensagem deste commit.
 *
 * Três afirmações:
 *   1. arquivo gated ⇒ está nos `paths` de alguma suíte (ou em `KNOWN_ORPHANS`, que só encolhe);
 *   2. suíte ⇒ está na matrix do CI (ou em `OFF_MATRIX`, com o motivo);
 *   3. suíte da matrix ⇒ existe no runner (senão o job morre com EX_USAGE).
 *
 * As duas listas têm entrada morta acusada: o que deixa de ser órfão ou entra na matrix TEM de
 * sair da lista no mesmo commit — é isso que faz a lista encolher em vez de virar cemitério.
 */

import { describe, it } from 'bun:test';
import { strict as assert } from 'node:assert';
import { execFileSync } from 'node:child_process';
import { globSync } from 'node:fs';

import { SUITES } from '../../scripts/ci/test-integration.ts';
import { PROJECT_ROOT, readSource } from '../support/source-scan.ts';

/**
 * As DUAS formas de ler a variável. O `integration-rerun-safety.test.ts` reconhece só a de
 * colchete e, medido em 06/11, deixa de fora 18 arquivos que usam `process.env.MYSQL_INTEGRATION`.
 */
const GATE_READ =
  /process\.env(?:\.|\[['"])(MYSQL|STORAGE|NOTIFICATIONS|PARTNERS_ETL|COMPOSE)_INTEGRATION\b/;

/**
 * Órfãos conhecidos, cada um com o veredito do replanejamento (F3). Entrada sai quando o arquivo
 * entra numa suíte, é fundido ou apagado — o caso "entrada morta" abaixo obriga.
 */
const KNOWN_ORPHANS: Readonly<Record<string, string>> = {
  // financial
  'tests/jobs/financial/payable-view-backfill/backfill.integration.test.ts':
    'religar em `financial`; trocar `result.ok` (Result<_, never>, tautológico) por `failed === 0`',
  'tests/workers/payable-view-projection/projection.integration.test.ts':
    'religar em `financial`; limpar `fin_outbox` na entrada',
  'tests/modules/financial/adapters/persistence/document-repository-concurrency.drizzle-mysql.test.ts':
    'religar em `financial`; exige FINANCIAL_DATABASE_URL e a fase 2 virou verde vazio',
  'tests/modules/financial/adapters/http/approve-with-provisioned-role.http.test.ts':
    'religar em `financial`; buildVanStorage lança erro sem VAN_S3_*',
  'tests/modules/financial/adapters/persistence/document-repository-payment-detail.test.ts':
    'fundir em document-repository.drizzle-mysql.test.ts',
  // auth
  'tests/modules/auth/adapters/persistence/reset-lockout.integration.test.ts':
    'religar em `auth`; os irmãos precisam limpar reset/lockout antes de auth_user',
  'tests/jobs/auth/sync-permissions.drizzle-mysql.test.ts':
    'religar em `auth` com AUTH_SYNC_TEST_DATABASE_URL',
  'tests/jobs/auth/sync-permissions-seed-delegation.test.ts':
    'religar em `auth` com AUTH_SYNC_TEST_DATABASE_URL; limpar antes',
  'tests/modules/auth/adapters/persistence/user-read.drizzle.test.ts':
    'fundir em approver-authority.drizzle.test.ts',
  // budget-plans
  'tests/modules/budget-plans/adapters/persistence/remove-plan-atomic.drizzle-mysql.test.ts':
    'religar em `budget-plans`; tirar a URL real (BUDGET_PLANS_DATABASE_URL)',
  'tests/modules/budget-plans/adapters/persistence/planned-amounts-or-filter.drizzle-mysql.test.ts':
    'fundir em budget-plans-read-port.integration.test.ts',
  'tests/modules/budget-plans/adapters/persistence/cost-structure-deactivate.drizzle-mysql.test.ts':
    'fundir em cost-structure-repository.suite.ts; tirar a URL real',
  // partners
  'tests/modules/partners/adapters/persistence/collaborator-food-category-length.drizzle-mysql.test.ts':
    'religar em `partners`; usar mysqlTestConnectionString()',
  'tests/modules/partners/adapters/persistence/repos/partner-geography-repository.integration.test.ts':
    'religar em `partners`; usar mysqlTestConnectionString()',
  // contracts / shared / cleanup
  'tests/modules/contracts/adapters/persistence/repos/document-repository.drizzle.test.ts':
    'religar em `contracts`; migrar e limpar ctr_documents + ctr_outbox na entrada',
  'tests/modules/contracts/adapters/persistence/mysql-driver-tuning.test.ts':
    'CA-12 fundir em mysql-driver.test.ts, antes do CA-8 de lá (o CA-11 já saiu)',
  'tests/shared/persistence/mysql-pool-config.test.ts':
    'CA-8 religar medindo o corte de idleTimeout (hoje mede o de maxIdle)',
  'tests/cleanup/schema-collation.test.ts': 'trocar por gate estático (contra o banco não falha)',
};

/** Suítes fora da matrix de `integration.yml`, com o motivo. */
const OFF_MATRIX: Readonly<Record<string, string>> = {
  notifications: 'tem workflow próprio: .github/workflows/integration-notifications.yml',
  'etl:budget-plans': 'depende de dump legado ausente do repositório (#522)',
  infra:
    'mysql-compose sobe o compose por conta própria (COMPOSE_INTEGRATION); sem decisão registrada — decidir no F3',
};

/** Linhas de código — comentário fora, para menção em docblock não contar como dependência. */
const codeText = (rel: string): string =>
  readSource(rel)
    .split('\n')
    .filter((line) => {
      const t = line.trimStart();
      return !t.startsWith('//') && !t.startsWith('*') && !t.startsWith('/*');
    })
    .join('\n');

/** Testes VERSIONADOS — gate estrutural pergunta ao git (rule `testing.md`). */
const gatedTests = (): readonly string[] =>
  execFileSync('git', ['-C', PROJECT_ROOT, 'ls-files', 'tests/**/*.test.ts'], { encoding: 'utf-8' })
    .split('\n')
    .filter((f) => f.length > 0 && GATE_READ.test(codeText(f)))
    .sort();

const covered = (): ReadonlySet<string> =>
  new Set(
    Object.values(SUITES).flatMap((s) =>
      s.paths.flatMap((p) => globSync(p, { cwd: PROJECT_ROOT })),
    ),
  );

/** As suítes da matrix: os itens `- nome` sob `suite:` até `steps:`. */
const matrixSuites = (): readonly string[] => {
  const yml = readSource('.github/workflows/integration.yml');
  const block = /^\s+suite:\n([\s\S]*?)^\s+steps:/m.exec(yml)?.[1] ?? '';
  return [...block.matchAll(/^\s+-\s+([a-z][a-z0-9:-]*)/gm)].map((m) => m[1] ?? '');
};

describe('INTEGRATION-ORPHANS — teste gated tem suíte', () => {
  const gated = gatedTests();
  const inSuite = covered();

  it('a varredura enxerga os testes de integração (guarda contra verde por vacuidade)', () => {
    assert.ok(
      gated.length > 50,
      `esperado 50+ testes gated por *_INTEGRATION, achei ${gated.length}`,
    );
    assert.ok(Object.keys(SUITES).length > 5, 'o runner expõe menos de 6 suítes — leitura falhou?');
  });

  it('todo teste gated está nos paths de alguma suíte do runner', () => {
    const orphans = gated.filter((f) => !inSuite.has(f) && !(f in KNOWN_ORPHANS));
    assert.deepEqual(
      orphans,
      [],
      `${orphans.length} teste(s) dependem de *_INTEGRATION e nenhuma suíte de ` +
        '`scripts/ci/test-integration.ts` os executa — o `pnpm test` os pula e nada mais os roda:\n' +
        orphans.join('\n') +
        '\nIncluir nos `paths` da suíte do módulo (e passar a variável que o arquivo exige).',
    );
  });

  it('KNOWN_ORPHANS não tem entrada morta (a lista só encolhe)', () => {
    const dead = Object.keys(KNOWN_ORPHANS)
      .filter((f) => !gated.includes(f) || inSuite.has(f))
      .sort();
    assert.deepEqual(
      dead,
      [],
      `entrada(s) que já não são órfãs (entraram numa suíte, foram fundidas ou apagadas): ` +
        `${dead.join(', ')}. Remover de KNOWN_ORPHANS no mesmo commit.`,
    );
  });
});

describe('INTEGRATION-ORPHANS — suíte tem job no CI', () => {
  const matrix = matrixSuites();

  it('a matrix foi lida (guarda contra verde por vacuidade)', () => {
    assert.ok(matrix.length > 5, `li ${matrix.length} suíte(s) na matrix de integration.yml`);
  });

  it('toda suíte do runner está na matrix ou em OFF_MATRIX com motivo', () => {
    const missing = Object.keys(SUITES)
      .filter((s) => !matrix.includes(s) && !(s in OFF_MATRIX))
      .sort();
    assert.deepEqual(
      missing,
      [],
      `suíte(s) que existem no runner e não rodam no CI: ${missing.join(', ')}. Pôr na matrix de ` +
        '.github/workflows/integration.yml, ou em OFF_MATRIX com o motivo.',
    );
  });

  it('OFF_MATRIX não tem entrada morta', () => {
    const dead = Object.keys(OFF_MATRIX)
      .filter((s) => !(s in SUITES) || matrix.includes(s))
      .sort();
    assert.deepEqual(dead, [], `entrada(s) mortas em OFF_MATRIX: ${dead.join(', ')}.`);
  });

  it('toda suíte da matrix existe no runner', () => {
    const unknown = matrix.filter((s) => !(s in SUITES));
    assert.deepEqual(
      unknown,
      [],
      `a matrix chama suíte(s) que o runner não conhece: ${unknown.join(', ')} — o job sairia ` +
        'com EX_USAGE (64).',
    );
  });
});
