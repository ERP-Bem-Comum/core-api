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

import { describe, before, after, beforeEach, it } from 'node:test';
import { strict as assert } from 'node:assert';

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

    before(async () => {
      const r = await openMysqlFinancial({
        connectionString,
        applyMigrations: true,
        poolLimit: POOL_LIMIT,
      });
      if (!r.ok) throw new Error(`[financial:concurrency] falha ao conectar: ${r.error}`);
      handle = r.value;
    });

    after(async () => {
      await handle?.close();
    });

    // Limpeza na ENTRADA, por tabela (contrato de `.claude/rules/testing.md`). Nenhuma destas
    // carrega seed de migration, então limpar inteiro é seguro — ao contrário de
    // `fin_cost_centers`/`fin_categories`, que têm seed e não voltam se apagados.
    beforeEach(async () => {
      const db = handle.db;
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
  });
}
