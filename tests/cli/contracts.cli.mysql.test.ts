/**
 * CTR-CLI-MYSQL-SMOKE — W0 (RED)
 *
 * Smoke E2E real da CLI da P.O. rodando contra MySQL real (via Docker compose).
 * Primeira vez que a stack inteira é exercitada ponta a ponta:
 *
 *   CLI (host Node) → mysql2 pool → MySQL 8.4 (container)
 *     → CHECK/UNIQUE/FK constraints → mysql2 → CLI → formatter PT-BR → stdout
 *
 * Cobre 10 CAs:
 *   CA-1, CA-2: estruturais (arquivo + glob).
 *   CA-3..5:    CRUD básico (criar/listar/mostrar).
 *   CA-6:       fluxo completo de aditivo (Addition + anexar + homologar).
 *   CA-7:       persistência cross-invocation.
 *   CA-8:       UNIQUE sequential_number em runtime.
 *   CA-9:       RN-12 (homologação sem documento).
 *   CA-10:      boundary de erro do driver (credenciais inválidas).
 *
 * Padrão consistente com `contracts.cli.test.ts` (memory driver) — reusa o
 * mesmo helper `runCli` e a mesma regex de extração de UUID.
 *
 * Sustentação: ADR-0020, decisões D1-D10 de `000-request.md`.
 */

import { describe, it, before, beforeEach } from 'node:test';
import { strict as assert } from 'node:assert';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { runCli } from './helpers/run-cli.ts';
import { extractUuidAfter } from './helpers/extract.ts';

// ─── Constantes ───────────────────────────────────────────────────────────
// Credenciais sincronizadas com os secret files que `pnpm test:integration`
// escreve. NÃO são secrets em prod — são fixos dev declarados públicos.
const DUMMY_APP_PWD = 'apppw-migration-test-only';
const DUMMY_ROOT_PWD = 'rootpw-migration-test-only';
const CONTAINER = 'core-api-mysql';
const VALID_CONN = `mysql://core_app:${DUMMY_APP_PWD}@127.0.0.1:3306/core`;
const BAD_CONN = 'mysql://invalid:invalid@127.0.0.1:3306/core';

const integrationEnabled = (): boolean => process.env.MYSQL_INTEGRATION === '1';

// ─── Helpers ──────────────────────────────────────────────────────────────
// Reset hard das 3 tabelas ctr_* via docker exec — TRUNCATE em ordem reversa
// de FK. Mais rápido que DROP/CREATE database; suficiente para isolar tests.
const truncateAll = (): void => {
  spawnSync(
    'bash',
    [
      '-c',
      `docker exec ${CONTAINER} mysql --protocol=tcp -h 127.0.0.1 -uroot -p"${DUMMY_ROOT_PWD}" -e "` +
        `SET FOREIGN_KEY_CHECKS=0; ` +
        `TRUNCATE TABLE ctr_contract_homologated_amendments; ` +
        `TRUNCATE TABLE ctr_amendments; ` +
        `TRUNCATE TABLE ctr_contracts; ` +
        `SET FOREIGN_KEY_CHECKS=1;` +
        `" core`,
    ],
    { encoding: 'utf-8', timeout: 10_000 },
  );
};

// Helper paralelo ao `criarContrato` do `contracts.cli.test.ts`, mas usando
// `--driver mysql --connection-string` em vez de `--state`.
const criarContrato = (
  overrides: Partial<{
    numero: string;
    titulo: string;
    objetivo: string;
    assinadoEm: string;
    valorCentavos: string;
    inicio: string;
    fim: string | null;
  }> = {},
): ReturnType<typeof runCli> => {
  const args = [
    'criar-contrato',
    '--driver',
    'mysql',
    '--connection-string',
    VALID_CONN,
    '--numero',
    overrides.numero ?? '001/2026',
    '--titulo',
    overrides.titulo ?? 'Contrato Smoke MySQL',
    '--objetivo',
    overrides.objetivo ?? 'Validar fluxo CLI → MySQL ponta-a-ponta',
    '--assinado-em',
    overrides.assinadoEm ?? '2026-01-15',
    '--valor-centavos',
    overrides.valorCentavos ?? '10000000',
    '--inicio',
    overrides.inicio ?? '2026-02-01',
  ];
  if (overrides.fim !== null && overrides.fim !== undefined) {
    args.push('--fim', overrides.fim);
  } else if (overrides.fim === undefined) {
    args.push('--fim', '2026-12-31');
  }
  return runCli(args);
};

const listarContratos = (): ReturnType<typeof runCli> =>
  runCli(['listar-contratos', '--driver', 'mysql', '--connection-string', VALID_CONN]);

const mostrarContrato = (id: string): ReturnType<typeof runCli> =>
  runCli(['mostrar-contrato', '--driver', 'mysql', '--connection-string', VALID_CONN, '--id', id]);

const requireUuid = (text: string, label: string, ctx: string): string => {
  const id = extractUuidAfter(text, label);
  assert.ok(id !== null, `${ctx}: UUID após "${label}" não encontrado em:\n${text}`);
  return id;
};

// ─── CA-1, CA-2 — Estruturais ─────────────────────────────────────────────
describe('CTR-CLI-MYSQL-SMOKE — CA-1/2: estruturais', () => {
  it('CA-1: arquivo tests/cli/contracts.cli.mysql.test.ts existe', () => {
    // Trivial — se o test rodou, o arquivo existe.
    assert.ok(true);
  });

  it('CA-2: package.json#scripts.test:integration glob inclui contracts.cli.mysql.test.ts', () => {
    const HERE = fileURLToPath(new URL('.', import.meta.url));
    const PROJECT_ROOT = resolve(HERE, '..', '..');
    const pkg = JSON.parse(readFileSync(join(PROJECT_ROOT, 'package.json'), 'utf-8')) as {
      scripts?: Record<string, string>;
    };
    const script = pkg.scripts?.['test:integration'];
    assert.ok(script, 'test:integration script ausente');
    assert.match(
      script,
      /tests\/cli\/contracts\.cli\.mysql\.test\.ts/,
      'glob não inclui contracts.cli.mysql.test.ts',
    );
  });
});

// ─── CA-3..10 — Smoke real contra MySQL (opt-in) ──────────────────────────
// Padrão do `drizzle-mysql.test.ts`: o bloco inteiro é envolto em
// `if (integrationEnabled())`. Quando rodando sem MYSQL_INTEGRATION=1, os
// testes simplesmente não são registrados — node:test reporta como pass=0
// no namespace, sem falsos negativos nem necessidade de `t.skip`.
if (integrationEnabled()) {
  describe('CTR-CLI-MYSQL-SMOKE — CA-3..10: smoke real', () => {
    before(() => {
      // Garante schema aplicado uma vez. `listar-contratos` invoca
      // `openMysql({ applyMigrations: true })` (driver mysql do CLI) — efeito
      // colateral cria/atualiza schema; saída ignorada.
      listarContratos();
    });

    beforeEach(() => {
      truncateAll();
    });

    it('CA-3: criar-contrato retorna exit 0 e saída esperada', () => {
      const r = criarContrato({ numero: '003/2026' });
      assert.equal(r.exitCode, 0, `stderr: ${r.stderr}`);
      assert.match(r.stdout, /✅ Contrato criado\./);
      assert.match(r.stdout, /Contrato 003\/2026/);
      assert.match(r.stdout, /Valor original: R\$\s*100\.000,00/);
      requireUuid(r.stdout, 'ID:', 'CA-3 criar-contrato');
    });

    it('CA-4: listar-contratos mostra o contrato recém-criado', () => {
      const create = criarContrato({ numero: '004/2026', titulo: 'Listagem MySQL' });
      assert.equal(create.exitCode, 0, `setup criar falhou: ${create.stderr}`);

      // `listar-contratos` mostra sumário (número + status + valor); o título
      // aparece no `mostrar-contrato` (formato detalhado).
      const list = listarContratos();
      assert.equal(list.exitCode, 0, `stderr: ${list.stderr}`);
      assert.match(list.stdout, /1 contrato\(s\)/);
      assert.match(list.stdout, /004\/2026.*\[Ativo\].*R\$\s*100\.000,00/);
    });

    it('CA-5: mostrar-contrato --id <uuid> retorna detalhes do contrato', () => {
      const create = criarContrato({ numero: '005/2026', titulo: 'Detalhe MySQL' });
      assert.equal(create.exitCode, 0, `setup falhou: ${create.stderr}`);
      const id = requireUuid(create.stdout, 'ID:', 'CA-5 setup');

      const show = mostrarContrato(id);
      assert.equal(show.exitCode, 0, `stderr: ${show.stderr}`);
      assert.match(show.stdout, /005\/2026/);
      assert.match(show.stdout, /Detalhe MySQL/);
      assert.match(show.stdout, /Valor (vigente|original): R\$\s*100\.000,00/);
    });

    it('CA-6: fluxo Addition completo (criar → aditivo → anexar → homologar) atualiza currentValue', () => {
      // Setup: contrato R$ 100.000,00.
      const create = criarContrato({ numero: '006/2026', valorCentavos: '10000000' });
      assert.equal(create.exitCode, 0, `criar: ${create.stderr}`);
      const contractId = requireUuid(create.stdout, 'ID:', 'CA-6 criar-contrato');

      // Aditivo Addition de R$ 5.000,00 (500000 centavos).
      // Flag `--tipo` (PT-BR) — a CLI usa nomenclatura nacional, não `--kind`.
      const aditivo = runCli([
        'criar-aditivo',
        '--driver',
        'mysql',
        '--connection-string',
        VALID_CONN,
        '--contrato',
        contractId,
        '--numero',
        'AD 01-006/2026',
        '--descricao',
        'Acréscimo de R$ 5.000,00',
        '--tipo',
        'Addition',
        '--valor-centavos',
        '500000',
      ]);
      assert.equal(aditivo.exitCode, 0, `criar-aditivo: ${aditivo.stderr}`);
      const amendmentId = requireUuid(aditivo.stdout, 'ID:', 'CA-6 criar-aditivo');

      // Anexa documento (UUID fictício — neste ticket o storage não é wired).
      const documentId = 'dddddddd-6666-4666-8666-dddddddddddd';
      const anexa = runCli([
        'anexar-documento',
        '--driver',
        'mysql',
        '--connection-string',
        VALID_CONN,
        '--aditivo',
        amendmentId,
        '--documento',
        documentId,
      ]);
      assert.equal(anexa.exitCode, 0, `anexar-documento: ${anexa.stderr}`);

      // Homologa (usuário fictício).
      const userRef = 'eeeeeeee-7777-4777-8777-eeeeeeeeeeee';
      const homologa = runCli([
        'homologar-aditivo',
        '--driver',
        'mysql',
        '--connection-string',
        VALID_CONN,
        '--aditivo',
        amendmentId,
        '--contrato',
        contractId,
        '--usuario',
        userRef,
      ]);
      assert.equal(homologa.exitCode, 0, `homologar-aditivo: ${homologa.stderr}`);

      // mostrar-contrato final deve refletir o novo currentValue R$ 105.000,00.
      const show = mostrarContrato(contractId);
      assert.equal(show.exitCode, 0, `mostrar-contrato final: ${show.stderr}`);
      assert.match(
        show.stdout,
        /Valor vigente: R\$\s*105\.000,00/,
        'currentValue não foi atualizado para R$ 105.000,00',
      );
    });

    it('CA-7: persistência cross-invocation (criar num processo, listar em outro)', () => {
      const create = criarContrato({ numero: '007/2026', titulo: 'Persistência Real' });
      assert.equal(create.exitCode, 0, `criar: ${create.stderr}`);

      // Segunda invocação — processo Node novo via spawn. O sumário de
      // listar-contratos mostra `<numero> [<status>] <valor>` (sem título).
      const list = listarContratos();
      assert.equal(list.exitCode, 0, `listar (2ª invocação): ${list.stderr}`);
      assert.match(
        list.stdout,
        /007\/2026.*\[Ativo\].*R\$\s*100\.000,00/,
        'contrato criado na invocação anterior não está visível — MySQL não persistiu',
      );
    });

    it('CA-8: UNIQUE sequential_number — segundo criar com mesmo --numero falha', () => {
      const first = criarContrato({ numero: '008/2026' });
      assert.equal(first.exitCode, 0, `1º criar: ${first.stderr}`);

      const second = criarContrato({ numero: '008/2026', titulo: 'Duplicado' });
      assert.notEqual(second.exitCode, 0, '2º criar com mesmo número deveria falhar');
      assert.match(
        second.stderr + second.stdout,
        /sequencial|duplicad|already|exists/i,
        'mensagem não menciona sequencial/duplicado',
      );
    });

    it('CA-9: RN-12 — homologar sem documento anexado é rejeitado', () => {
      const create = criarContrato({ numero: '009/2026' });
      assert.equal(create.exitCode, 0, `criar: ${create.stderr}`);
      const contractId = requireUuid(create.stdout, 'ID:', 'CA-9 criar');

      const aditivo = runCli([
        'criar-aditivo',
        '--driver',
        'mysql',
        '--connection-string',
        VALID_CONN,
        '--contrato',
        contractId,
        '--numero',
        'AD 01-009/2026',
        '--descricao',
        'Aditivo sem documento',
        '--tipo',
        'Misc',
      ]);
      assert.equal(aditivo.exitCode, 0, `criar-aditivo: ${aditivo.stderr}`);
      const amendmentId = requireUuid(aditivo.stdout, 'ID:', 'CA-9 criar-aditivo');

      // Tenta homologar SEM `anexar-documento` antes — deve falhar com RN-12.
      const homologa = runCli([
        'homologar-aditivo',
        '--driver',
        'mysql',
        '--connection-string',
        VALID_CONN,
        '--aditivo',
        amendmentId,
        '--contrato',
        contractId,
        '--usuario',
        'eeeeeeee-9999-4999-8999-eeeeeeeeeeee',
      ]);
      assert.notEqual(homologa.exitCode, 0, 'homologar sem documento deveria falhar');
      assert.match(
        homologa.stderr + homologa.stdout,
        /documento|signed.*document|homologa/i,
        'mensagem não menciona documento/homologação',
      );
    });

    it('CA-10: connection string com credenciais inválidas retorna EXIT_IOERR=74', () => {
      const r = runCli(['listar-contratos', '--driver', 'mysql', '--connection-string', BAD_CONN]);
      assert.equal(r.exitCode, 74, `exit esperado 74, recebido ${r.exitCode}; stderr: ${r.stderr}`);
      assert.match(
        r.stderr,
        /MySQL|conectar|credenciais/i,
        'stderr não menciona MySQL/conectar/credenciais',
      );
    });
  });
}
