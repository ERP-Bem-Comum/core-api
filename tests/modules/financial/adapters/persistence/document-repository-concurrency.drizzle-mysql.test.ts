// Teste de integração: `save` concorrente sobre documentos DISTINTOS com retenção (#803).
//
// O QUE ESTE ARQUIVO PROVA, E POR QUE PRECISA DE MySQL DE VERDADE
//   O defeito é gap lock do InnoDB: o `DELETE … WHERE document_id = ?` do hard replace percorre
//   um índice NÃO-único, e nesse caso o InnoDB trava a FAIXA varrida do índice, não as linhas.
//   O `INSERT` seguinte precisa de insert intention lock na mesma faixa e para ali. Nenhum
//   adapter in-memory reproduz isso — não há árvore de índice nem gap para disputar. Um fake
//   que "passasse" aqui estaria descrevendo produção errado, que é exatamente o que a
//   `.claude/rules/adapters.md` adverte sobre comportamento que só existe no provedor real.
//
// GATEAMENTO
//   Só roda com `MYSQL_INTEGRATION=1`. Sem isso, o `describe` não é registrado e o runner não
//   reporta teste algum — sem skip enganoso e sem falso negativo.

import { describe, beforeAll, afterAll, beforeEach, it } from 'bun:test';
import { strict as assert } from 'node:assert';
import { sql } from 'drizzle-orm';

import { isOk } from '#src/shared/index.ts';
import * as Money from '#src/shared/kernel/money.ts';
import * as Retention from '#src/modules/financial/domain/shared/retention.ts';
import * as Document from '#src/modules/financial/domain/document/document.ts';
import { SupplierRef } from '#src/modules/partners/public-api/refs.ts';
import { DocumentId } from '#src/modules/financial/domain/shared/ids.ts';
import { openMysqlFinancial } from '#src/modules/financial/adapters/persistence/drivers/mysql-driver.ts';
import { createDrizzleDocumentRepository } from '#src/modules/financial/adapters/persistence/repos/document-repository.drizzle.ts';
import * as schema from '#src/modules/financial/adapters/persistence/schemas/mysql.ts';
import type { FinancialMysqlHandle } from '#src/modules/financial/adapters/persistence/drivers/mysql-driver.ts';

if (!process.env['MYSQL_INTEGRATION']) {
  process.stdout.write(
    '[financial:concurrency] MYSQL_INTEGRATION não definido — pulando testes de integração.\n',
  );
} else {
  // Guarda explícita: sem URL, FALHA em vez de cair no default de `mysqlTestConnectionString`
  // (host local, porta padrão do MySQL, base `core`).
  // O default só é inofensivo enquanto nada escuta a 3306 nesta máquina — no dia em que
  // alguém subir um MySQL local ou outro túnel, o silêncio vira DDL no banco errado.
  // A suíte `financial` de `scripts/ci/test-integration.ts` passa a URL do banco de teste
  // explicitamente — e, por vir no `env` da suíte, ela SOBRESCREVE uma que o shell tenha herdado.
  const connectionString = process.env['FINANCIAL_DATABASE_URL'];
  if (connectionString === undefined || connectionString.trim() === '') {
    throw new Error(
      '[financial:concurrency] FINANCIAL_DATABASE_URL ausente. Este arquivo escreve schema e ' +
        'não pode cair em default: aponte-a explicitamente para o banco de teste.',
    );
  }

  // Concorrência do cenário. O pool precisa comportar TODAS as transações simultâneas: com
  // pool menor que `CONCURRENCY`, o excedente espera por CONEXÃO e o teste mediria fila de
  // pool em vez de disputa de lock — passando verde pelo motivo errado.
  const CONCURRENCY = 6;
  const POOL_LIMIT = CONCURRENCY + 2;

  describe('DocumentRepository — save concorrente com retenção (integração)', () => {
    let handle: FinancialMysqlHandle;

    beforeAll(async () => {
      const r = await openMysqlFinancial({
        connectionString,
        applyMigrations: true,
        poolLimit: POOL_LIMIT,
      });
      if (!r.ok) throw new Error(`[financial:concurrency] falha ao conectar: ${r.error}`);
      handle = r.value;
    });

    afterAll(async () => {
      await handle?.close();
    });

    // Limpeza na ENTRADA, por tabela (contrato de `.claude/rules/testing.md`). Nenhuma destas
    // carrega seed de migration, então limpar inteiro é seguro — ao contrário de
    // `fin_cost_centers`/`fin_categories`, que têm seed e não voltam se apagados.
    beforeEach(async () => {
      const db = handle.db;
      // Primeiro o único vínculo com FK RESTRICT para `fin_payables`/`fin_documents`: resíduo de
      // remessa deixado por um vizinho da suíte faria o `delete(finPayables)` estourar 1451.
      await db.delete(schema.finRemittancePayables);
      await db.delete(schema.finOutbox);
      await db.delete(schema.finTimelineFieldChanges);
      await db.delete(schema.finDocumentTimeline);
      await db.delete(schema.finRetentions);
      await db.delete(schema.finRegisteredTaxes);
      await db.delete(schema.finPayables);
      await db.delete(schema.finDocuments);
    });

    const money = (cents: number): Money.Money => {
      const r = Money.fromCents(cents);
      if (!r.ok) throw new Error('setup: money');
      return r.value;
    };

    const retention = (type: 'ISS' | 'IRRF' | 'INSS', valueCents: number): Retention.Retention => {
      const r = Retention.create({ type, baseCents: valueCents * 10, rateBps: 1000, valueCents });
      if (!r.ok) throw new Error('setup: retention');
      return r.value;
    };

    const supplier = (): SupplierRef => {
      const r = SupplierRef.rehydrate('11111111-1111-4111-8111-111111111111');
      if (!r.ok) throw new Error('setup: supplier');
      return r.value;
    };

    // Documento com TRÊS retenções — o formato que a P.O. usa e o que povoa `fin_retentions`.
    const makeDocumentWithRetentions = (index: number): Document.CreateDocumentOutput => {
      const r = Document.create({
        id: DocumentId.generate(),
        documentNumber: `NFS-CONC-${String(index)}`,
        type: 'NFS-e',
        supplier: supplier(),
        paymentMethod: 'TED',
        grossValue: money(200000),
        sourceDiscounts: Money.ZERO,
        discounts: Money.ZERO,
        penalty: Money.ZERO,
        interest: Money.ZERO,
        retentions: [retention('ISS', 5000), retention('IRRF', 2250), retention('INSS', 11000)],
        registeredTaxes: [],
        dueDate: new Date('2026-09-01'),
      });
      if (!r.ok) throw new Error('setup: create document');
      return r.value;
    };

    // ISS 5000 → 6000: muda a chave de conteúdo da retenção (`taxLikeKey`), então o save não pode
    // pular as tabelas filhas pelo atalho de conjunto igual (E1) e precisa apagar por PK e reinserir
    // (E2). É o ajuste que o front faz, pela operação de domínio — não um agregado forjado.
    const ADJUSTED_ISS_CENTS = 6000;
    const adjustRetentions = (d: Document.CreateDocumentOutput): Document.AdjustDocumentOutput => {
      const r = Document.adjust({
        document: d.document,
        payables: d.payables,
        changes: {
          retentions: [
            retention('ISS', ADJUSTED_ISS_CENTS),
            retention('IRRF', 2250),
            retention('INSS', 11000),
          ],
        },
        heldPayableIds: [],
      });
      if (!r.ok) throw new Error(`setup: adjust (${r.error})`);
      return r.value;
    };

    // Guarda do E1: regravar o MESMO estado em paralelo. Pelo atalho `sameRowSet`
    // (`child-rows-diff.ts`), as transações não tocam as tabelas filhas — este caso NÃO exercita o
    // DELETE por PK; quem o exercita é o caso "que MUDAM as retenções", abaixo.
    it('N saves concorrentes sobre documentos DISTINTOS com retenção concluem sem falha', async () => {
      const repo = createDrizzleDocumentRepository(handle);
      const docs = Array.from({ length: CONCURRENCY }, (_unused, i) =>
        makeDocumentWithRetentions(i),
      );

      // Fase 1 — criação SEQUENCIAL. Isola a fase medida: aqui não há concorrência, então
      // qualquer falha nesta fase é defeito de setup, não o defeito investigado.
      for (const d of docs) {
        const created = await repo.save({ document: d.document, payables: d.payables }, []);
        assert.equal(isOk(created), true, 'setup: criação sequencial deveria passar');
      }

      // Fase 2 — mutação em PARALELO sobre documentos distintos. É o hard replace
      // (DELETE por faixa + INSERT) de N transações ao mesmo tempo, que é o padrão real do
      // front: um PATCH por título, sequencial dentro do documento, paralelo entre documentos.
      const results = await Promise.all(
        docs.map((d) => repo.save({ document: d.document, payables: d.payables }, [], 0)),
      );

      const failures = results.filter((r) => !isOk(r));
      assert.equal(
        failures.length,
        0,
        `${String(failures.length)} de ${String(CONCURRENCY)} saves concorrentes falharam ` +
          `(erros: ${failures.map((f) => (f.ok ? '' : f.error)).join(', ')}). ` +
          'O errno do driver está no stderr desta execução.',
      );
    });

    it('repetido: o padrão da P.O. (várias rodadas concorrentes) não produz falha intermitente', async () => {
      // Uma rodada só pode passar por sorte: a P.O. mediu ~1 falha em 20. Várias rodadas
      // elevam a chance de a corrida acontecer — um verde de rodada única não significaria nada.
      const repo = createDrizzleDocumentRepository(handle);
      const ROUNDS = 4;
      let failed = 0;

      for (let round = 0; round < ROUNDS; round += 1) {
        const docs = Array.from({ length: CONCURRENCY }, (_unused, i) =>
          makeDocumentWithRetentions(round * CONCURRENCY + i),
        );
        for (const d of docs) {
          await repo.save({ document: d.document, payables: d.payables }, []);
        }
        const results = await Promise.all(
          docs.map((d) => repo.save({ document: d.document, payables: d.payables }, [], 0)),
        );
        failed += results.filter((r) => !isOk(r)).length;
      }

      assert.equal(
        failed,
        0,
        `${String(failed)} falhas em ${String(ROUNDS * CONCURRENCY)} saves concorrentes.`,
      );
    });

    /**
     * Deadlocks (errno 1213) que o SERVIDOR levantou desde que subiu. O `withDeadlockRetry` do
     * repositório repete a vítima e devolve `ok` — então "nenhum save falhou" não distingue o fix
     * da regressão. O contador do servidor distingue: ele conta o deadlock que o retry escondeu.
     * Global, mas a suíte roda um arquivo por vez (`--isolate`, serial).
     */
    const deadlocksSoFar = async (): Promise<number> => {
      const result = await handle.db.execute(
        sql`SELECT SUM_ERROR_RAISED AS n FROM performance_schema.events_errors_summary_global_by_error WHERE ERROR_NUMBER = 1213`,
      );
      const rows = (Array.isArray(result[0]) ? result[0] : result) as readonly { n?: unknown }[];
      return Number(rows[0]?.n ?? 0);
    };

    // Guarda do E2 (#803): N transações concorrentes que de fato REESCREVEM as filhas. Antes do fix,
    // o `DELETE … WHERE document_id = ?` varria o índice não-único: o gap lock de uma transação
    // bloqueava o INSERT da outra, e em cruz isso é deadlock (1213). Com o DELETE por PK, não há
    // faixa a disputar. Afirma-se o CONTADOR de deadlocks, não só o resultado: o retry esconde 1213.
    it('N saves concorrentes que MUDAM as retenções gravam todas, sem deadlock (E2)', async () => {
      const repo = createDrizzleDocumentRepository(handle);
      const ROUNDS = 4;
      const deadlocksBefore = await deadlocksSoFar();

      for (let round = 0; round < ROUNDS; round += 1) {
        const docs = Array.from({ length: CONCURRENCY }, (_unused, i) =>
          makeDocumentWithRetentions(round * CONCURRENCY + i),
        );
        for (const d of docs) {
          const created = await repo.save({ document: d.document, payables: d.payables }, []);
          assert.equal(isOk(created), true, 'setup: criação sequencial deveria passar');
        }

        const adjusted = docs.map(adjustRetentions);
        const results = await Promise.all(
          adjusted.map((a) => repo.save({ document: a.document, payables: a.payables }, [], 0)),
        );
        const failures = results.filter((r) => !isOk(r));
        assert.equal(
          failures.length,
          0,
          `rodada ${String(round + 1)}: ${String(failures.length)} de ${String(CONCURRENCY)} ` +
            `ajustes concorrentes falharam (${failures.map((f) => (f.ok ? '' : f.error)).join(', ')})`,
        );

        // "Não falhou" não basta: o ajuste tem de estar GRAVADO em cada documento.
        for (const a of adjusted) {
          const found = await repo.findById(a.document.id);
          assert.ok(found.ok, 'findById falhou');
          const iss = found.value.document.retentions.find((x) => x.type === 'ISS');
          assert.equal(
            iss?.value.cents,
            ADJUSTED_ISS_CENTS,
            `documento ${String(a.document.id)} não gravou o ISS ajustado`,
          );
        }
      }

      const deadlocks = (await deadlocksSoFar()) - deadlocksBefore;
      assert.equal(
        deadlocks,
        0,
        `${String(deadlocks)} deadlock(s) durante os ajustes concorrentes — o retry os escondeu do ` +
          'resultado. O DELETE das retenções voltou a varrer o índice document_id (#803)?',
      );
    });
  });
}
