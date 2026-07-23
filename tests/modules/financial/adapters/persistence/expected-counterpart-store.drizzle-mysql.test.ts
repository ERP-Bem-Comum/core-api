// Teste de integração: ExpectedCounterpartStore (Drizzle + MySQL real) — contrapartida esperada (#269).
//
// Valida a migration 0034 (fin_expected_counterpart) + INSERT/SELECT + índice (destination_account_ref,
// status) e a publicação do evento no fin_outbox na MESMA tx do save (CA1/CA4).
//
// GATE: só roda com `MYSQL_INTEGRATION=1` (ver `package.json §test:integration:financial`).
// Espelha `cedente-account-store.drizzle-mysql.test.ts`.

import { describe, it, before, after } from 'node:test';
import { strict as assert } from 'node:assert';
import process from 'node:process';
import { and, eq } from 'drizzle-orm';

import { openMysqlFinancial } from '#src/modules/financial/adapters/persistence/drivers/mysql-driver.ts';
import type { FinancialMysqlHandle } from '#src/modules/financial/adapters/persistence/drivers/mysql-driver.ts';
import { createDrizzleExpectedCounterpartStore } from '#src/modules/financial/adapters/persistence/repos/expected-counterpart-store.drizzle.ts';
import { createDrizzleBankStatementRepository } from '#src/modules/financial/adapters/persistence/repos/bank-statement-repository.drizzle.ts';
import { createDrizzleReconciliationRepository } from '#src/modules/financial/adapters/persistence/repos/reconciliation-repository.drizzle.ts';
import {
  finOutbox,
  finReconciliations,
  finStatementTransactions,
} from '#src/modules/financial/adapters/persistence/schemas/mysql.ts';
import { newUuid } from '#src/shared/utils/id.ts';
import * as Fitid from '#src/modules/financial/domain/statement/fitid.ts';
import { importStatement } from '#src/modules/financial/domain/statement/bank-statement.ts';
import * as CedenteAccountId from '#src/modules/financial/domain/cedente/cedente-account-id.ts';
import * as ReconciliationId from '#src/modules/financial/domain/reconciliation/reconciliation-id.ts';
import { confirmManualEntry } from '#src/modules/financial/domain/reconciliation/manual-entry.ts';
import { undo } from '#src/modules/financial/domain/reconciliation/reconciliation.ts';
import * as ExpectedCounterpartId from '#src/modules/financial/domain/expected-counterpart/expected-counterpart-id.ts';
import { mysqlTestConnectionString } from '#tests/support/mysql-conn.ts';
import {
  create,
  match,
  discard,
} from '#src/modules/financial/domain/expected-counterpart/expected-counterpart.ts';

// `valueCents` é bigint no agregado relido → JSON.stringify cru lança "Do not know how to serialize a
// BigInt". Serializa bigint como string só para a mensagem de erro do assert.
const j = (v: unknown): string =>
  JSON.stringify(v, (_k: string, val: unknown) => (typeof val === 'bigint' ? val.toString() : val));

const buildCounterpart = () => {
  const r = create({
    id: ExpectedCounterpartId.generate(),
    destinationAccountRef: CedenteAccountId.generate(),
    originAccountRef: CedenteAccountId.generate(),
    originReconciliationRef: ReconciliationId.generate(),
    originTransactionRef: newUuid(),
    originMovement: 'Debit',
    valueCents: 150000n,
    expectedDate: new Date('2026-07-01T00:00:00.000Z'),
  });
  if (!r.ok) throw new Error('test setup: counterpart');
  return r.value;
};

// #428: contrapartida com tipo Investment/Redemption. `create` passa a receber o `type`; a persistência
// exige a migration do CHECK `fin_expected_counterpart_type_chk` (+ Investment/+Redemption) e o mapper
// `toType` aceitando os 3 — senão o save viola o CHECK ou `toDomain` rejeita `invalid-expected-counterpart-type`.
const buildTypedCounterpart = (
  type: 'Investment' | 'Redemption',
  originMovement: 'Debit' | 'Credit',
) => {
  const r = create({
    id: ExpectedCounterpartId.generate(),
    destinationAccountRef: CedenteAccountId.generate(),
    originAccountRef: CedenteAccountId.generate(),
    originReconciliationRef: ReconciliationId.generate(),
    originTransactionRef: newUuid(),
    type,
    originMovement,
    valueCents: 150000n,
    expectedDate: new Date('2026-07-04T00:00:00.000Z'),
  });
  if (!r.ok) throw new Error('test setup: typed counterpart');
  return r.value;
};

if (!process.env['MYSQL_INTEGRATION']) {
  process.stdout.write(
    '[financial:expected-counterpart-store] MYSQL_INTEGRATION não definido — pulando integração.\n',
  );
} else {
  const connectionString =
    process.env['FINANCIAL_DATABASE_URL'] ??
    process.env['CONTRACTS_DATABASE_URL'] ??
    mysqlTestConnectionString();

  describe('ExpectedCounterpartStore — Drizzle + MySQL (integração · #269)', () => {
    let handle: FinancialMysqlHandle;

    before(async () => {
      const r = await openMysqlFinancial({ connectionString, applyMigrations: true, poolLimit: 3 });
      if (!r.ok) {
        throw new Error(
          `[financial:expected-counterpart-store] Falha ao conectar ao MySQL: ${r.error}`,
        );
      }
      handle = r.value;
    });

    after(async () => {
      await handle?.close();
    });

    it('CA1: save persiste Pending; listPendingByAccount(destino) + findById + findByOrigin round-trip', async () => {
      const store = createDrizzleExpectedCounterpartStore(handle);
      const built = buildCounterpart();
      const cp = built.counterpart;

      const saved = await store.save(cp, built.events);
      assert.equal(saved.ok, true, j(saved));

      const pending = await store.listPendingByAccount(cp.destinationAccountRef);
      assert.equal(pending.ok, true);
      if (pending.ok) {
        const found = pending.value.find((c) => String(c.id) === String(cp.id));
        assert.ok(found, 'contrapartida na fila de pendentes do destino');
        assert.equal(found.status, 'Pending');
        assert.equal(found.movement, 'Credit', 'oposto ao Debit da origem');
        assert.equal(found.valueCents, 150000n, 'bigint round-trip');
        assert.equal(String(found.destinationAccountRef), String(cp.destinationAccountRef));
      }

      const byId = await store.findById(cp.id);
      assert.equal(byId.ok && byId.value !== null && String(byId.value.id) === String(cp.id), true);

      const byOrigin = await store.findByOriginReconciliation(cp.originReconciliationRef);
      assert.equal(
        byOrigin.ok && byOrigin.value !== null,
        true,
        'localiza por origin_reconciliation_ref (undo)',
      );
    });

    it('CA4: save publica TransferCounterpartCreated no fin_outbox (mesma tx)', async () => {
      const store = createDrizzleExpectedCounterpartStore(handle);
      const built = buildCounterpart();

      const saved = await store.save(built.counterpart, built.events);
      assert.equal(saved.ok, true);

      const rows = await handle.db
        .select()
        .from(finOutbox)
        .where(
          and(
            eq(finOutbox.aggregateType, 'ExpectedCounterpart'),
            eq(finOutbox.aggregateId, String(built.counterpart.id)),
          ),
        );
      assert.equal(rows.length, 1, 'exatamente 1 evento no outbox');
      assert.equal(rows[0]?.eventType, 'TransferCounterpartCreated');
    });

    it('CA5(#428): round-trip Investment — save + findById sem invalid-expected-counterpart-type', async () => {
      const store = createDrizzleExpectedCounterpartStore(handle);
      const built = buildTypedCounterpart('Investment', 'Debit');
      const cp = built.counterpart;

      const saved = await store.save(cp, built.events);
      assert.equal(saved.ok, true, j(saved));

      const byId = await store.findById(cp.id);
      assert.equal(byId.ok, true, j(byId));
      if (byId.ok) {
        assert.ok(byId.value, 'contrapartida Investment persistida e relida');
        assert.equal(
          byId.value.type,
          'Investment',
          'tipo Investment sobrevive ao round-trip (CHECK ampliado + mapper toType)',
        );
        assert.equal(byId.value.movement, 'Credit', 'oposto ao Debit da origem');
      }

      // Também aparece na fila de pendentes do destino (índice destination_account_ref, status).
      const pending = await store.listPendingByAccount(cp.destinationAccountRef);
      assert.equal(pending.ok, true);
      if (pending.ok) {
        assert.ok(
          pending.value.some((c) => String(c.id) === String(cp.id) && c.type === 'Investment'),
          'Investment aparece como pendente no destino',
        );
      }
    });

    it('CA5(#428): round-trip Redemption — origem Credit → movement Debit; sem rejeição de tipo', async () => {
      const store = createDrizzleExpectedCounterpartStore(handle);
      const built = buildTypedCounterpart('Redemption', 'Credit');
      const cp = built.counterpart;

      const saved = await store.save(cp, built.events);
      assert.equal(saved.ok, true, j(saved));

      const byId = await store.findById(cp.id);
      assert.equal(
        byId.ok && byId.value?.type === 'Redemption',
        true,
        'tipo Redemption round-trip (CHECK + mapper)',
      );
      if (byId.ok && byId.value) {
        assert.equal(byId.value.movement, 'Debit', 'oposto ao Credit da origem');
      }
    });

    it('CA2: confirmCounterpartMatch atômico — perna B Reconciled + contrapartida Matched + outbox', async () => {
      const statementRepo = createDrizzleBankStatementRepository(handle);
      const counterpartStore = createDrizzleExpectedCounterpartStore(handle);
      const reconRepo = createDrizzleReconciliationRepository(handle);

      const day = new Date('2026-07-02T00:00:00.000Z');
      const accountB = CedenteAccountId.generate();
      const fitid = Fitid.fromNative(`fB-${newUuid()}`);
      if (!fitid.ok) throw new Error('setup: fitid');
      const imported = importStatement(
        {
          debitAccountRef: String(accountB),
          period: { start: day, end: day },
          file: { name: 'b.ofx', format: 'OFX', hash: newUuid() },
          openingBalanceCents: 0,
          closingBalanceCents: 0,
          transactions: [
            {
              fitid: fitid.value,
              date: day,
              movement: 'Credit',
              entryType: 'TED',
              payeeName: 'TRANSF',
              memo: 't',
              valueCents: 150000,
              balanceAfterCents: 0,
            },
          ],
          occurredAt: day,
        },
        new Set(),
      );
      if (!imported.ok) throw new Error('setup: importStatement');
      const statement = imported.value.statement;
      const txB = statement.transactions[0];
      if (txB === undefined) throw new Error('setup: tx');
      assert.equal((await statementRepo.save(statement)).ok, true);

      const created = create({
        id: ExpectedCounterpartId.generate(),
        destinationAccountRef: accountB,
        originAccountRef: CedenteAccountId.generate(),
        originReconciliationRef: ReconciliationId.generate(),
        originTransactionRef: newUuid(),
        originMovement: 'Debit',
        valueCents: 150000n,
        expectedDate: day,
      });
      if (!created.ok) throw new Error('setup: counterpart');
      assert.equal((await counterpartStore.save(created.value.counterpart)).ok, true);

      // Consome a contrapartida (domínio) + perna B (ManualEntry Transfer, destino = conta A).
      const matched = match(created.value.counterpart, String(txB.id));
      if (!matched.ok) throw new Error('setup: match');
      const legB = confirmManualEntry({
        reconciliationId: ReconciliationId.generate(),
        transactionId: txB.id,
        type: 'Transfer',
        valueCents: 150000,
        destinationAccountRef: String(created.value.counterpart.originAccountRef),
        reconciledBy: newUuid(),
        occurredAt: day,
      });
      if (!legB.ok) throw new Error('setup: legB');

      const saved = await reconRepo.confirmCounterpartMatch(
        legB.value.reconciliation,
        matched.value.counterpart,
        txB.id,
        [...legB.value.events, ...matched.value.events],
      );
      assert.equal(saved.ok, true, j(saved));

      // contrapartida → Matched (grava a transação real)
      const cp = await counterpartStore.findById(created.value.counterpart.id);
      assert.equal(cp.ok && cp.value?.status === 'Matched', true);
      if (cp.ok && cp.value) assert.equal(cp.value.matchedTransactionRef, String(txB.id));

      // transação de B → Reconciled
      const txRows = await handle.db
        .select()
        .from(finStatementTransactions)
        .where(eq(finStatementTransactions.id, String(txB.id)));
      assert.equal(txRows[0]?.reconciliationStatus, 'Reconciled', 'perna B conciliada');

      // outbox: TransferCounterpartMatched publicado na mesma tx
      const obRows = await handle.db
        .select()
        .from(finOutbox)
        .where(eq(finOutbox.aggregateId, String(created.value.counterpart.id)));
      assert.equal(
        obRows.some((r) => r.eventType === 'TransferCounterpartMatched'),
        true,
        'evento Matched no outbox',
      );
    });

    it('CA1(US3): undoCounterpartOrigin atômico — A Undone + contrapartida Discarded + outbox', async () => {
      const statementRepo = createDrizzleBankStatementRepository(handle);
      const counterpartStore = createDrizzleExpectedCounterpartStore(handle);
      const reconRepo = createDrizzleReconciliationRepository(handle);

      const day = new Date('2026-07-03T00:00:00.000Z');
      const accountA = CedenteAccountId.generate();
      const fitid = Fitid.fromNative(`fA-${newUuid()}`);
      if (!fitid.ok) throw new Error('setup: fitid');
      const imported = importStatement(
        {
          debitAccountRef: String(accountA),
          period: { start: day, end: day },
          file: { name: 'a.ofx', format: 'OFX', hash: newUuid() },
          openingBalanceCents: 0,
          closingBalanceCents: 0,
          transactions: [
            {
              fitid: fitid.value,
              date: day,
              movement: 'Debit',
              entryType: 'TED',
              payeeName: 'TRANSF',
              memo: 't',
              valueCents: 150000,
              balanceAfterCents: 0,
            },
          ],
          occurredAt: day,
        },
        new Set(),
      );
      if (!imported.ok) throw new Error('setup: importStatement');
      const txA = imported.value.statement.transactions[0];
      if (txA === undefined) throw new Error('setup: tx');
      assert.equal((await statementRepo.save(imported.value.statement)).ok, true);

      // Perna A: ManualEntry Transfer → tx A Reconciled.
      const legA = confirmManualEntry({
        reconciliationId: ReconciliationId.generate(),
        transactionId: txA.id,
        type: 'Transfer',
        valueCents: 150000,
        destinationAccountRef: String(CedenteAccountId.generate()),
        reconciledBy: newUuid(),
        occurredAt: day,
      });
      if (!legA.ok) throw new Error('setup: legA');
      assert.equal(
        (await reconRepo.confirmManualEntry(legA.value.reconciliation, txA.id, legA.value.events))
          .ok,
        true,
      );

      // Contrapartida Pending vinculada à origem A.
      const created = create({
        id: ExpectedCounterpartId.generate(),
        destinationAccountRef: CedenteAccountId.generate(),
        originAccountRef: accountA,
        originReconciliationRef: legA.value.reconciliation.id,
        originTransactionRef: String(txA.id),
        originMovement: 'Debit',
        valueCents: 150000n,
        expectedDate: day,
      });
      if (!created.ok) throw new Error('setup: counterpart');
      assert.equal((await counterpartStore.save(created.value.counterpart)).ok, true);

      // Undo da origem: A → Undone + contrapartida → Discarded, atômico.
      const undoneA = undo(legA.value.reconciliation, { undoneBy: newUuid(), occurredAt: day });
      if (!undoneA.ok) throw new Error('setup: undoA');
      const discarded = discard(created.value.counterpart);
      if (!discarded.ok) throw new Error('setup: discard');
      const saved = await reconRepo.undoCounterpartOrigin(
        undoneA.value.reconciliation,
        discarded.value.counterpart,
        null,
        [...undoneA.value.events, ...discarded.value.events],
      );
      assert.equal(saved.ok, true, j(saved));

      const cp = await counterpartStore.findById(created.value.counterpart.id);
      assert.equal(cp.ok && cp.value?.status === 'Discarded', true, 'contrapartida descartada');

      const txRows = await handle.db
        .select()
        .from(finStatementTransactions)
        .where(eq(finStatementTransactions.id, String(txA.id)));
      assert.equal(txRows[0]?.reconciliationStatus, 'Pending', 'perna A desfeita');

      const recRows = await handle.db
        .select()
        .from(finReconciliations)
        .where(eq(finReconciliations.id, String(legA.value.reconciliation.id)));
      assert.equal(recRows[0]?.status, 'Undone');

      const obRows = await handle.db
        .select()
        .from(finOutbox)
        .where(eq(finOutbox.aggregateId, String(created.value.counterpart.id)));
      assert.equal(
        obRows.some((r) => r.eventType === 'TransferCounterpartDiscarded'),
        true,
        'evento Discarded no outbox',
      );
    });
  });
}
