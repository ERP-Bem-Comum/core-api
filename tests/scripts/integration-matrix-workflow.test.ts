/**
 * CI-INTEGRATION-MATRIX (#523) — W0 RED.
 *
 * Garante que o workflow `.github/workflows/integration.yml` (a criar no W1) roda as suítes
 * MySQL/MinIO de integração numa MATRIX do GitHub Actions, invocando o runner já existente
 * `scripts/ci/test-integration.ts` uma vez por suíte. Hoje 14 das 15 suítes do runner nunca
 * rodam em CI — o que deixou 4 defeitos latentes na `dev`, um deles bug de PRODUÇÃO (#519).
 *
 * Estilo: asserção de ESTRUTURA sobre o texto do arquivo (molde de
 * `test-integration-notifications-script.test.ts` / `test-integration-auth-script.test.ts`),
 * via `tryRead` — que devolve '' quando o arquivo ainda não existe. Sem parser YAML (ADR-0011:
 * zero dependência nova) — regex ancorada sobre o texto, exatamente como o molde.
 *
 * POR QUE RED AGORA: o workflow não existe → `tryRead` devolve '' → o guard `present()` de cada
 * `it()` falha com "workflow ... ausente". As invariantes específicas (matrix, gatilhos, gate,
 * SHA-pin, ausência de `|| true`) só passam depois que o W1 escrever o `integration.yml` honrando
 * o DRAFT da seção 8 de `.claude/.planning/ci-integration-gate-523/CI-INTEGRATION-DESIGN.md`.
 *
 * ─────────────────────────────────────────────────────────────────────────────────────────────
 * CA4 — MATRIZ DE RESULTADO ESPERADA (não asserível em unit; é comportamento de CI, verificável
 *        só no W3 com run real via `workflow_dispatch`). Documentada aqui e no REPORT:
 *
 *   VERDES esperados : contracts, auth, programs, etl:contracts, etl:financial, storage, photo, logo
 *   VERMELHOS         : financial → #519 (bug de PROD, errno 1406) · budget-plans → #520
 *                       partners  → #521 · etl → #522 · etl:orchestrate → #522
 *
 *   O "verde" do W3 é ESTA matriz reproduzida (report-only, `continue-on-error:true`), NÃO
 *   "tudo verde": os 4 defeitos ainda estão abertos.
 * ─────────────────────────────────────────────────────────────────────────────────────────────
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

const wf = tryRead('../../.github/workflows/integration.yml');

// Guard universal: enquanto o W1 não escrever o workflow, `wf` é '' e todo `it()` falha AQUI
// (RED por AUSÊNCIA do arquivo, nunca por erro de sintaxe do teste).
const present = (): void => {
  assert.ok(
    wf.length > 0,
    'workflow .github/workflows/integration.yml ausente — o W1 ainda não o escreveu (RED esperado)',
  );
};

// Texto sem linhas de COMENTÁRIO (as que começam, após indentação, com `#`). Usado nas asserções
// de AUSÊNCIA (`|| true`, ordenação de step): os comentários do DRAFT citam literalmente termos
// como "NÃO adicionar `|| true`" e "scripts/ci/test-integration.ts", que dariam falso-positivo.
const body = wf
  .split('\n')
  .filter((line) => !line.trim().startsWith('#'))
  .join('\n');

// Casa um item de MATRIX (`- <suite>`) como item de lista YAML, ancorado em linha (flag `m`):
// tolera aspas e comentário à direita, e NÃO casa comentários nem prefixos — `etl` não casa
// `etl:orchestrate` porque exige `\s*(#.*)?$` logo após o nome, e `:` quebra a âncora.
const matrixItem = (suite: string): RegExp =>
  new RegExp(`^\\s*-\\s*["']?${suite.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}["']?\\s*(#.*)?$`, 'm');

// 10 MySQL + 3 MinIO = 13 suítes que ENTRAM na matrix.
const MYSQL_SUITES = [
  'contracts',
  'auth',
  'partners',
  'programs',
  'budget-plans',
  'financial',
  'etl',
  'etl:orchestrate',
  'etl:contracts',
  'etl:financial',
] as const;
const MINIO_SUITES = ['storage', 'photo', 'logo'] as const;
// Ficam de FORA: etl:budget-plans (dump legado ausente, #522) e notifications (já coberta por
// integration-notifications.yml).
const EXCLUDED_SUITES = ['etl:budget-plans', 'notifications'] as const;

describe('integration.yml — CA1: matrix por suíte (10 MySQL + 3 MinIO)', () => {
  it('declara o job `integration` com strategy.matrix.suite e fail-fast:false', () => {
    present();
    assert.match(wf, /^\s*integration:/m, 'job `integration` ausente');
    assert.match(wf, /strategy:/, 'bloco `strategy:` ausente');
    assert.match(wf, /matrix:/, 'bloco `matrix:` ausente');
    assert.match(wf, /suite:/, 'eixo `suite:` da matrix ausente');
    assert.match(
      wf,
      /fail-fast:\s*false/,
      'fail-fast:false obrigatório — uma suíte vermelha não pode sumir as outras',
    );
  });

  it('inclui as 13 suítes esperadas (10 MySQL + 3 MinIO) na matrix', () => {
    present();
    for (const suite of [...MYSQL_SUITES, ...MINIO_SUITES]) {
      assert.match(wf, matrixItem(suite), `suíte \`${suite}\` ausente da matrix`);
    }
  });

  it('NÃO inclui `etl:budget-plans` nem `notifications` na matrix', () => {
    present();
    for (const suite of EXCLUDED_SUITES) {
      assert.doesNotMatch(
        wf,
        matrixItem(suite),
        `\`${suite}\` NÃO deve estar na matrix (etl:budget-plans=dump legado ausente #522; notifications=já coberta)`,
      );
    }
  });
});

describe('integration.yml — CA1: gatilhos (on:)', () => {
  it('dispara em PR para dev/main + schedule (cron) + workflow_dispatch', () => {
    present();
    assert.match(wf, /pull_request:/, '`on.pull_request` ausente');
    assert.match(wf, /branches:\s*\[dev,\s*main\]/, 'PR deve ser filtrado para [dev, main]');
    assert.match(wf, /schedule:/, '`on.schedule` (nightly) ausente');
    assert.match(wf, /cron:\s*["'][^"']+["']/, 'cron do schedule ausente');
    assert.match(wf, /workflow_dispatch/, '`on.workflow_dispatch` (run manual) ausente');
  });
});

describe('integration.yml — CA2: invoca o runner, sem `services:` nativo', () => {
  it('o step de execução chama scripts/ci/test-integration.ts com a suíte da matrix', () => {
    present();
    assert.match(
      wf,
      /scripts\/ci\/test-integration\.ts\s+["']?\$\{\{\s*matrix\.suite\s*\}\}/,
      'o runner deve ser invocado com "${{ matrix.suite }}"',
    );
  });

  it('NÃO usa `services:` nativo do Actions (mascararia a paridade conf.d/initdb.d → esconderia #519)', () => {
    present();
    // `services:` como CHAVE de job (início de linha após indentação). Não casa a menção em
    // comentário do DRAFT (linha começa com `#`).
    assert.doesNotMatch(
      wf,
      /^\s*services:/m,
      '`services:` nativo sobe antes do checkout e não monta docker/mysql/conf.d — usar o `docker compose up` do runner',
    );
  });
});

describe('integration.yml — CA3: report-only', () => {
  it('o job da matrix entra com continue-on-error:true (fase report-only)', () => {
    present();
    assert.match(
      wf,
      /continue-on-error:\s*true/,
      'Fase 0 é report-only — não pode bloquear merge enquanto #519/#520/#521/#522 estão abertos',
    );
  });
});

describe('integration.yml — CA4: matriz de resultado esperada', () => {
  // NÃO asserível sobre o texto do arquivo — é comportamento de CI (quais suítes passam/falham num
  // run real), verificável só no W3 via `workflow_dispatch`. Documentado no cabeçalho e no REPORT.
  // Registrado como `skip` (com razão) para ficar VISÍVEL na saída do runner, sem fingir cobertura.
  it(
    'verdes = contracts,auth,programs,etl:contracts,etl:financial,storage,photo,logo · vermelhos = financial#519,budget-plans#520,partners#521,etl+etl:orchestrate#522',
    {
      skip: 'comportamento de CI — verificável só no W3 (run real via workflow_dispatch), não sobre o texto do arquivo',
    },
    () => {
      /* CA4: verificável só no W3 com run real — ver skip acima */
    },
  );
});

describe('integration.yml — CA5: job agregador `gate` (futuro required check)', () => {
  it('existe o job `gate` com needs:[integration] e if:always()', () => {
    present();
    assert.match(wf, /^\s*gate:/m, 'job `gate` ausente');
    assert.match(
      wf,
      /needs:\s*\[integration\]/,
      'gate deve depender da matrix (`needs: [integration]`)',
    );
    assert.match(
      wf,
      /if:\s*always\(\)/,
      'gate deve rodar com `if: always()` (mesmo com a matrix vermelha)',
    );
  });

  it('o gate confere `needs.integration.result == success`', () => {
    present();
    assert.match(wf, /needs\.integration\.result/, 'gate deve ler `needs.integration.result`');
    assert.match(
      wf,
      /=\s*["']success["']|==\s*["']success["']/,
      'gate deve exigir o resultado `success` (só `success` passa)',
    );
  });
});

describe('integration.yml — CA6: hardening (SHA-pin + concurrency)', () => {
  it('todas as actions estão pinadas por SHA de 40 hex (ADR-0011)', () => {
    present();
    const uses = [...wf.matchAll(/uses:\s*(\S+)/g)].map((m) => m[1] ?? '');
    assert.ok(uses.length > 0, 'nenhuma action `uses:` no workflow');
    for (const u of uses) {
      assert.match(u, /@[0-9a-f]{40}$/, `action não pinada por SHA: ${u}`);
    }
  });

  it('tem `concurrency` com cancel-in-progress:true', () => {
    present();
    assert.match(wf, /concurrency:/, 'bloco `concurrency:` ausente');
    assert.match(wf, /cancel-in-progress:\s*true/, 'concurrency deve cancelar runs redundantes');
  });
});

describe('integration.yml — invariante de segurança do gate', () => {
  it('NENHUM step `run:` contém `|| true` (engoliria o exit code do runner — furo do #521)', () => {
    present();
    // Só linhas NÃO-comentário: o DRAFT cita "NÃO adicionar `|| true`" num comentário, que não
    // pode contar como violação. Em shell real (`run:`), `|| true` mascara `exit 1` do runner —
    // exatamente o furo do #521 (`cancelled 1 / fail 0`, mas exit 1).
    assert.doesNotMatch(
      body,
      /\|\|\s*true/,
      'nenhum `run:` pode usar `|| true` — confiar SÓ no exit code (o #521 sai 1 com "fail 0")',
    );
  });
});

describe('integration.yml — suítes MinIO precisam de secrets', () => {
  it('roda `pnpm run secrets:setup` ANTES do runner (o runner só cria os secrets do MySQL)', () => {
    present();
    assert.match(wf, /pnpm run secrets:setup/, 'step `pnpm run secrets:setup` ausente');
    // storage/photo/logo têm `secrets:false` no manifesto → o runner NÃO escreve
    // minio_root_user/password. Sem eles, `docker compose up minio` falha ao resolver o secret.
    const setupAt = body.indexOf('secrets:setup');
    const runnerAt = body.indexOf('test-integration.ts');
    assert.ok(
      setupAt >= 0 && runnerAt >= 0 && setupAt < runnerAt,
      '`pnpm run secrets:setup` deve rodar ANTES da invocação do runner',
    );
  });
});
