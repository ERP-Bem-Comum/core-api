// FIN-STATUS-VARCHAR-WIDTH (#519) — W0 RED contra MySQL real (Drizzle + mysql2, migrations aplicadas).
//
// O QUE COBRE (CA1/CA2 do 000-request):
//   - `fin_payables.status` e `fin_documents.status` DEVEM comportar 'PartiallyReconciled' (19 chars).
//   - Cada caso: insere uma linha com status válido curto ('Paid'/'Open', cabe em varchar(16)), faz
//     UPDATE ... SET status='PartiallyReconciled' e verifica o read-back íntegro.
//
// POR QUE É RED HOJE (o defeito exato — a LARGURA da coluna):
//   Ambas as colunas são `varchar(16)` (schemas/mysql.ts:116 e :249) mas o CHECK `*_status_chk`
//   (:186/:274) admite 'PartiallyReconciled' = 19 chars. Sob `sql_mode=STRICT_ALL_TABLES` (ADR-0020) o
//   UPDATE aborta com **errno 1406 / SQLSTATE 22001** ("Data too long for column 'status'"). Logo o passo
//   de UPDATE lança e o teste FALHA (RED). Após o W1 (widen p/ varchar(24) nas DUAS colunas) o UPDATE
//   sucede e o read-back devolve 'PartiallyReconciled' → GREEN.
//
// POR QUE UPDATE DIRETO NO ADAPTER, E NÃO VIA `reconciliation-repository.drizzle.ts`:
//   O repo real embrulha tudo em try/catch e devolve `err('reconciliation-repository-failure')` —
//   ENGOLE o errno 1406 num Result genérico. Um teste no repo só conseguiria uma asserção frouxa
//   ("deu erro"). O UPDATE direto no nível do adapter SURFACE o 1406 cru e pina a largura como causa
//   (SOL-519 §5). Complementa — não substitui — o CA11 de `reconciliation-repository.drizzle-mysql.test.ts`,
//   que só exercita a conciliação TOTAL (grava 'Reconciled' = 10 chars, cabe em 16, por isso nunca pegou o bug).
//
// GATE: só roda com `MYSQL_INTEGRATION=1` (ver `package.json §test:integration:financial`). Fora do gate,
//   pula limpo — não quebra o `pnpm test` puro (sem DB). Isolamento (#535): ids únicos por caso +
//   limpeza em `finally` (DELETE do documento → CASCADE nos títulos); sem resíduo, sem dependência de ordem.

import { describe, it, before, after } from 'node:test';
import { strict as assert } from 'node:assert';
import process from 'node:process';
import { eq } from 'drizzle-orm';

import { openMysqlFinancial } from '#src/modules/financial/adapters/persistence/drivers/mysql-driver.ts';
import type { FinancialMysqlHandle } from '#src/modules/financial/adapters/persistence/drivers/mysql-driver.ts';
import {
  finDocuments,
  finPayables,
} from '#src/modules/financial/adapters/persistence/schemas/mysql.ts';
import { newUuid } from '#src/shared/utils/id.ts';

// Status derivado da conciliação PARCIAL (#141/#247) — 19 chars. É o valor que estoura varchar(16).
const PARTIALLY_RECONCILED = 'PartiallyReconciled';

// mysql2 expõe errno/sqlState no erro cru; o Drizzle o embrulha em DrizzleQueryError com o original em
// `.cause` (memória `drizzle-execute-error-cause-errno`). Percorre a cadeia `.cause` p/ achar o errno real.
const mysqlErrnoOf = (thrown: unknown): number | undefined => {
  let current: unknown = thrown;
  for (let depth = 0; depth < 5 && current !== null && typeof current === 'object'; depth += 1) {
    const errno = (current as { errno?: unknown }).errno;
    if (typeof errno === 'number') return errno;
    current = (current as { cause?: unknown }).cause;
  }
  return undefined;
};

if (!process.env['MYSQL_INTEGRATION']) {
  process.stdout.write(
    '[financial:payable-status-width] MYSQL_INTEGRATION não definido — pulando integração.\n',
  );
} else {
  const connectionString =
    process.env['FINANCIAL_DATABASE_URL'] ??
    process.env['CONTRACTS_DATABASE_URL'] ??
    'mysql://root:rootpw-migration-test-only@127.0.0.1:3306/core';

  describe('Largura de status (#519) — Drizzle + MySQL (integração)', () => {
    let handle: FinancialMysqlHandle;

    before(async () => {
      const r = await openMysqlFinancial({ connectionString, applyMigrations: true, poolLimit: 3 });
      if (!r.ok) throw new Error(`[financial:payable-status-width] conexão: ${r.error}`);
      handle = r.value;
    });

    after(async () => {
      await handle?.close();
    });

    // Insere um fin_documents mínimo válido ('Open' — 4 chars, cabe em varchar(16)). Devolve o id.
    const seedDocument = async (): Promise<string> => {
      const id = newUuid();
      await handle.db.insert(finDocuments).values({
        id,
        status: 'Open',
        createdAt: new Date('2026-07-01T00:00:00.000Z'),
      });
      return id;
    };

    // Insere um fin_payables Pai 'Paid' (cabe em varchar(16); paid_at obrigatório — CHECK fin_payables_paid_at_chk).
    const seedPaidPayable = async (documentId: string): Promise<string> => {
      const id = newUuid();
      await handle.db.insert(finPayables).values({
        id,
        documentId,
        kind: 'Parent',
        status: 'Paid',
        value: 1000,
        dueDate: new Date('2026-12-31T00:00:00.000Z'),
        paymentMethod: 'PIX',
        paidAt: new Date('2026-07-01T00:00:00.000Z'),
        createdAt: new Date('2026-07-01T00:00:00.000Z'),
      });
      return id;
    };

    it("CA2: fin_payables.status comporta 'PartiallyReconciled' (19 chars) sem estourar 1406", async () => {
      const documentId = await seedDocument();
      try {
        const payableId = await seedPaidPayable(documentId);

        // Passo que HOJE estoura 1406 (varchar(16) curta) e, após widen p/ varchar(24), deve suceder.
        let thrown: unknown = null;
        try {
          await handle.db
            .update(finPayables)
            .set({ status: PARTIALLY_RECONCILED })
            .where(eq(finPayables.id, payableId));
        } catch (cause) {
          thrown = cause;
        }
        if (thrown !== null) {
          const errno = mysqlErrnoOf(thrown);
          assert.fail(
            `#519 RED: UPDATE fin_payables.status='PartiallyReconciled' (19 chars) rejeitado ` +
              `(errno=${errno ?? 'desconhecido'}; esperado 1406/SQLSTATE 22001 — coluna varchar(16) curta). ` +
              `Após widen p/ varchar(24) o UPDATE deve suceder.`,
          );
        }

        // Read-back íntegro (GREEN após o widen).
        const rows = await handle.db
          .select({ status: finPayables.status })
          .from(finPayables)
          .where(eq(finPayables.id, payableId))
          .limit(1);
        assert.equal(rows[0]?.status, PARTIALLY_RECONCILED);
      } finally {
        // CASCADE (fin_payables_document_id_fk ON DELETE CASCADE) remove o título junto.
        await handle.db.delete(finDocuments).where(eq(finDocuments.id, documentId));
      }
    });

    it("CA2: fin_documents.status comporta 'PartiallyReconciled' (19 chars) sem estourar 1406", async () => {
      const documentId = await seedDocument();
      try {
        // Passo que HOJE estoura 1406 (varchar(16) curta) e, após widen p/ varchar(24), deve suceder.
        let thrown: unknown = null;
        try {
          await handle.db
            .update(finDocuments)
            .set({ status: PARTIALLY_RECONCILED })
            .where(eq(finDocuments.id, documentId));
        } catch (cause) {
          thrown = cause;
        }
        if (thrown !== null) {
          const errno = mysqlErrnoOf(thrown);
          assert.fail(
            `#519 RED: UPDATE fin_documents.status='PartiallyReconciled' (19 chars) rejeitado ` +
              `(errno=${errno ?? 'desconhecido'}; esperado 1406/SQLSTATE 22001 — coluna varchar(16) curta). ` +
              `Após widen p/ varchar(24) o UPDATE deve suceder.`,
          );
        }

        // Read-back íntegro (GREEN após o widen).
        const rows = await handle.db
          .select({ status: finDocuments.status })
          .from(finDocuments)
          .where(eq(finDocuments.id, documentId))
          .limit(1);
        assert.equal(rows[0]?.status, PARTIALLY_RECONCILED);
      } finally {
        await handle.db.delete(finDocuments).where(eq(finDocuments.id, documentId));
      }
    });
  });
}
