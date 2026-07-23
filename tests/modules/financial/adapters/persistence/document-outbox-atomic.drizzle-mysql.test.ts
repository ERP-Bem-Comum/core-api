// W0 RED (024 · #127 · Fatia A) — atomicidade estado+evento do DOCUMENTO (Drizzle + MySQL real).
//
// `DocumentRepository.save(agg, entries, expectedVersion?, events?)` grava o documento E os eventos
// no fin_outbox na MESMA db.transaction (ADR-0015). Caminho feliz → evento durável; falha no outbox
// → tx inteira reverte (documento não persiste, fin_outbox == baseline).
//
// DEVE FALHAR em W0: `save` ainda não aceita `events`/não escreve no fin_outbox.
// GATE: MYSQL_INTEGRATION=1 (na lista do runner). ASCII puro.

import { describe, before, after, it } from 'node:test';
import { strict as assert } from 'node:assert';
import process from 'node:process';
import { sql } from 'drizzle-orm';

import { isOk } from '#src/shared/index.ts';
import * as Money from '#src/shared/kernel/money.ts';
import { SupplierRef } from '#src/modules/partners/public-api/refs.ts';
import { DocumentId } from '#src/modules/financial/domain/shared/ids.ts';
import * as Document from '#src/modules/financial/domain/document/document.ts';
import type { DocumentEvent } from '#src/modules/financial/domain/document/events.ts';
import { openMysqlFinancial } from '#src/modules/financial/adapters/persistence/drivers/mysql-driver.ts';
import { createDrizzleDocumentRepository } from '#src/modules/financial/adapters/persistence/repos/document-repository.drizzle.ts';
import type { FinancialMysqlHandle } from '#src/modules/financial/adapters/persistence/drivers/mysql-driver.ts';
import { mysqlTestConnectionString } from '#tests/support/mysql-conn.ts';

if (!process.env['MYSQL_INTEGRATION']) {
  process.stdout.write(
    '[financial:document-outbox-atomic] MYSQL_INTEGRATION nao definido — pulando.\n',
  );
} else {
  const connectionString =
    process.env['FINANCIAL_DATABASE_URL'] ??
    process.env['CONTRACTS_DATABASE_URL'] ??
    mysqlTestConnectionString();

  const SUP = '5a000000-0000-4000-8000-0000000000d1';

  const build = (numero: string): Document.CreateDocumentOutput => {
    const supplierR = SupplierRef.rehydrate(SUP);
    if (!supplierR.ok) throw new Error('setup: supplier');
    const grossR = Money.fromCents(100000);
    if (!grossR.ok) throw new Error('setup: money');
    const r = Document.create({
      id: DocumentId.generate(),
      documentNumber: numero,
      type: 'NFS-e',
      supplier: supplierR.value,
      paymentMethod: 'TED',
      grossValue: grossR.value,
      sourceDiscounts: Money.ZERO,
      discounts: Money.ZERO,
      penalty: Money.ZERO,
      interest: Money.ZERO,
      retentions: [],
      registeredTaxes: [],
      dueDate: new Date('2026-07-01'),
    });
    if (!r.ok) throw new Error('setup: create');
    return r.value;
  };

  const countOutbox = async (
    handle: FinancialMysqlHandle,
    aggregateId: string,
  ): Promise<number> => {
    const rows = (await handle.db.execute(
      sql`SELECT COUNT(*) AS n FROM fin_outbox WHERE aggregate_id = ${aggregateId}`,
    )) as unknown as [{ n: number }[]];
    return rows[0]?.[0]?.n ?? 0;
  };
  const docExists = async (handle: FinancialMysqlHandle, id: string): Promise<boolean> =>
    (await countOutbox(handle, id)) >= 0 &&
    (
      (await handle.db.execute(
        sql`SELECT COUNT(*) AS n FROM fin_documents WHERE id = ${id}`,
      )) as unknown as [{ n: number }[]]
    )[0]?.[0]?.n === 1;

  describe('#127 Fatia A — atomicidade documento+evento (Drizzle + MySQL)', () => {
    let handle: FinancialMysqlHandle;

    before(async () => {
      const r = await openMysqlFinancial({ connectionString, applyMigrations: true, poolLimit: 3 });
      if (!r.ok) throw new Error(`[document-outbox-atomic] conexao: ${r.error}`);
      handle = r.value;
    });
    after(async () => {
      await handle?.close();
    });

    it('CA2 sucesso: save com evento grava documento E linha no fin_outbox (mesma tx)', async () => {
      const repo = createDrizzleDocumentRepository(handle);
      const out = build('NFS-OUTBOX-OK');
      const id = out.document.id as unknown as string;

      const saved = await repo.save(
        { document: out.document, payables: out.payables },
        [],
        undefined,
        out.events,
      );
      assert.equal(isOk(saved), true, 'save deve suceder');
      assert.equal(await docExists(handle, id), true, 'documento persistido');
      assert.equal(await countOutbox(handle, id), out.events.length, 'evento(s) no fin_outbox');

      await handle.db.execute(sql`DELETE FROM fin_outbox WHERE aggregate_id = ${id}`);
      await handle.db.execute(sql`DELETE FROM fin_documents WHERE id = ${id}`);
    });

    it('CA3 falha: evento malformado (event_type vazio) reverte a tx (COUNT == baseline)', async () => {
      const repo = createDrizzleDocumentRepository(handle);
      const out = build('NFS-OUTBOX-FAIL');
      const id = out.document.id as unknown as string;
      // Evento malformado → CHECK fin_outbox_event_type_nonempty_chk rejeita o INSERT do outbox.
      const badEvent = {
        type: '',
        documentId: out.document.id,
      } as unknown as DocumentEvent;

      const saved = await repo.save(
        { document: out.document, payables: out.payables },
        [],
        undefined,
        [badEvent],
      );
      assert.equal(saved.ok, false, 'save deve falhar (outbox rejeitado)');
      assert.equal(await docExists(handle, id), false, 'documento NAO persiste (rollback)');
      assert.equal(await countOutbox(handle, id), 0, 'nenhuma linha no fin_outbox (rollback)');
    });
  });
}
