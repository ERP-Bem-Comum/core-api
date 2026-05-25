/**
 * Suite de contrato compartilhada para `PayableRepository`.
 *
 * Recebe um factory de repositório (sync ou async). Toda implementação —
 * InMemory, Drizzle/MySQL (futuro) — passa pelos MESMOS cenários.
 * Divergências = bugs de mapeamento ou drift de schema.
 *
 * Pattern: `tests/modules/contracts/adapters/persistence/contract-repository.suite.ts`.
 *
 * Suite reusável (sufixo `.suite.ts`) — NÃO é descoberta diretamente pelo runner
 * de testes (glob `tests/**\/*.test.ts`). Consumida via import por arquivos
 * `.test.ts` que invocam `runPayableRepositoryContract(label, factory)`.
 */

import { describe, it, beforeEach } from 'node:test';
import { strict as assert } from 'node:assert';

import { isErr, isOk } from '#src/shared/index.ts';
import * as Money from '#src/shared/kernel/money.ts';
import * as UserRef from '#src/shared/kernel/user-ref.ts';
import * as FITID from '#src/modules/financial/domain/shared/fitid.ts';
import * as PayableId from '#src/modules/financial/domain/shared/payable-id.ts';
import * as RemittanceId from '#src/modules/financial/domain/shared/remittance-id.ts';
import * as SourceDocumentRef from '#src/modules/financial/domain/shared/source-document-ref.ts';
import * as BeneficiaryBankData from '#src/modules/financial/domain/shared/beneficiary-bank-data.ts';
import * as TaxId from '#src/modules/financial/domain/shared/tax-id.ts';
import { Payable } from '#src/modules/financial/domain/payable/payable.ts';
import type { PayableRepository } from '#src/modules/financial/domain/payable/repository.ts';
import type {
  Payable as PayableEntity,
  PaidFromBankPayable,
} from '#src/modules/financial/domain/payable/types.ts';
import type { PayableEvent } from '#src/modules/financial/domain/payable/events.ts';
import type { FinancialOutboxRow } from '#src/modules/financial/adapters/outbox/outbox.in-memory.ts';

export interface OutboxHelpers {
  all: () => readonly FinancialOutboxRow[];
  pending: () => readonly FinancialOutboxRow[];
}

export interface PayableRepoFactory {
  make: () => Promise<{
    repo: PayableRepository;
    outboxHelpers: OutboxHelpers;
    teardown?: () => Promise<void>;
  }>;
}

// ─── Fixtures helpers ──────────────────────────────────────────────────

const D = (iso: string): Date => new Date(iso);

const buildTaxId = (): TaxId.CPF => {
  const r = TaxId.fromCpf('11144477735');
  if (!r.ok) throw new Error(`fixture TaxId broken: ${r.error}`);
  return r.value;
};

const buildBeneficiary = (): BeneficiaryBankData.BeneficiaryBankData => {
  const r = BeneficiaryBankData.fromRaw({
    bankCode: '341',
    agency: '1234-5',
    account: '12345-6',
    holderTaxId: buildTaxId(),
    holderName: 'Fornecedor X Ltda',
  });
  if (!r.ok) throw new Error(`fixture Beneficiary broken: ${r.error}`);
  return r.value;
};

const buildMoney = (cents = 15050): Money.Money => {
  const r = Money.fromCents(cents);
  if (!r.ok) throw new Error(`fixture Money broken: ${r.error}`);
  return r.value;
};

const buildUserRef = (): UserRef.UserRef => {
  const r = UserRef.rehydrate('a1b2c3d4-5678-4abc-9def-fedcba987654');
  if (!r.ok) throw new Error(`fixture UserRef broken: ${r.error}`);
  return r.value;
};

const buildOpenPayable = (): PayableEntity => {
  const r = Payable.open({
    id: PayableId.generate(),
    sourceDocumentId: SourceDocumentRef.generate(),
    kind: 'Principal',
    paymentMethod: 'BankRemittance',
    beneficiary: buildBeneficiary(),
    value: buildMoney(),
    dueDate: D('2026-06-15T00:00:00Z'),
    openedAt: D('2026-05-20T00:00:00Z'),
  });
  if (!r.ok) throw new Error(`fixture Open broken: ${JSON.stringify(r.error)}`);
  return r.value.payable;
};

// Cria um PaidFromBankPayable com um FITID específico (atalho completo Open→Approved→Transmitted→Paid).
const buildBankPaidPayable = (fitid: FITID.FITID): PaidFromBankPayable => {
  const open = buildOpenPayable();
  const approver = buildUserRef();
  const approved = Payable.approve(open, approver, D('2026-05-25T00:00:00Z'));
  if (!approved.ok) throw new Error(`fixture approve broken: ${JSON.stringify(approved.error)}`);
  const transmitted = Payable.transmit(
    approved.value.payable,
    RemittanceId.generate(),
    D('2026-05-26T00:00:00Z'),
  );
  if (!transmitted.ok)
    throw new Error(`fixture transmit broken: ${JSON.stringify(transmitted.error)}`);
  const paid = Payable.processBankOutflow(
    transmitted.value.payable,
    fitid,
    D('2026-05-27T00:00:00Z'),
    D('2026-05-27T12:00:00Z'),
  );
  if (!paid.ok) throw new Error(`fixture processBankOutflow broken: ${JSON.stringify(paid.error)}`);
  // narrow para PaidFromBankPayable
  const p = paid.value.payable;
  if (p.paidVia !== 'Bank') throw new Error('expected PaidFromBank');
  return p;
};

const buildManuallyPaidPayable = (): PayableEntity => {
  const open = buildOpenPayable();
  const approver = buildUserRef();
  const approved = Payable.approve(open, approver, D('2026-05-25T00:00:00Z'));
  if (!approved.ok) throw new Error(`fixture approve broken: ${JSON.stringify(approved.error)}`);
  const paid = Payable.registerManualPayment(
    approved.value.payable,
    buildUserRef(),
    D('2026-05-26T00:00:00Z'),
  );
  if (!paid.ok)
    throw new Error(`fixture registerManualPayment broken: ${JSON.stringify(paid.error)}`);
  return paid.value.payable;
};

const fitidFromString = (raw: string): FITID.FITID => {
  const r = FITID.fromString(raw);
  if (!r.ok) throw new Error(`fixture FITID broken: ${r.error}`);
  return r.value;
};

// ─── Suite ─────────────────────────────────────────────────────────────

export const runPayableRepositoryContract = (label: string, factory: PayableRepoFactory): void => {
  describe(`PayableRepository contract — ${label}`, () => {
    let repo: PayableRepository;
    let outboxHelpers: OutboxHelpers;
    let teardown: (() => Promise<void>) | undefined;

    beforeEach(async () => {
      const built = await factory.make();
      repo = built.repo;
      outboxHelpers = built.outboxHelpers;
      teardown = built.teardown;
    });

    const cleanup = async (): Promise<void> => {
      if (teardown !== undefined) await teardown();
    };

    // ─── findById ────────────────────────────────────────────────────

    it('CA-3: findById em repo vazio retorna ok(null)', async () => {
      try {
        const r = await repo.findById(PayableId.generate());
        assert.equal(isOk(r), true);
        if (r.ok) assert.equal(r.value, null);
      } finally {
        await cleanup();
      }
    });

    it('CA-4: save + findById retorna o Payable salvo', async () => {
      try {
        const p = buildOpenPayable();
        const saved = await repo.save(p, []);
        assert.equal(isOk(saved), true);
        const found = await repo.findById(p.id);
        assert.equal(isOk(found), true);
        if (found.ok && found.value) {
          assert.equal(found.value.id, p.id);
          assert.equal(found.value.status, 'Open');
        }
      } finally {
        await cleanup();
      }
    });

    // ─── findByFitid ─────────────────────────────────────────────────

    it('CA-5: findByFitid em repo vazio retorna ok(null)', async () => {
      try {
        const r = await repo.findByFitid(fitidFromString('FITID-A'));
        assert.equal(isOk(r), true);
        if (r.ok) assert.equal(r.value, null);
      } finally {
        await cleanup();
      }
    });

    it('CA-6: findByFitid retorna o BankPaid quando existe', async () => {
      try {
        const fitid = fitidFromString('FITID-AAA-111');
        const p = buildBankPaidPayable(fitid);
        await repo.save(p, []);
        const r = await repo.findByFitid(fitid);
        assert.equal(isOk(r), true);
        if (r.ok && r.value) {
          assert.equal(r.value.id, p.id);
        }
      } finally {
        await cleanup();
      }
    });

    it('CA-7: findByFitid retorna null quando só há Manual-Paid (Manual NÃO tem FITID)', async () => {
      try {
        const manual = buildManuallyPaidPayable();
        await repo.save(manual, []);
        const r = await repo.findByFitid(fitidFromString('FITID-X'));
        assert.equal(isOk(r), true);
        if (r.ok) assert.equal(r.value, null);
      } finally {
        await cleanup();
      }
    });

    // ─── list ────────────────────────────────────────────────────────

    it('CA-8: list em repo vazio retorna ok([])', async () => {
      try {
        const r = await repo.list();
        assert.equal(isOk(r), true);
        if (r.ok) assert.deepEqual(r.value, []);
      } finally {
        await cleanup();
      }
    });

    it('CA-9: list retorna todos os Payables salvos', async () => {
      try {
        const a = buildOpenPayable();
        const b = buildOpenPayable();
        await repo.save(a, []);
        await repo.save(b, []);
        const r = await repo.list();
        assert.equal(isOk(r), true);
        if (r.ok) assert.equal(r.value.length, 2);
      } finally {
        await cleanup();
      }
    });

    // ─── save (upsert) ───────────────────────────────────────────────

    it('CA-10: save é upsert por ID — re-save do mesmo ID não duplica', async () => {
      try {
        const a = buildOpenPayable();
        await repo.save(a, []);
        await repo.save(a, []);
        const r = await repo.list();
        if (r.ok) assert.equal(r.value.length, 1);
      } finally {
        await cleanup();
      }
    });

    // ─── R2 — Anti-Duplicidade FITID ─────────────────────────────────

    it('CA-11: save rejeita payable-fitid-duplicate quando outro Payable já tem mesmo FITID', async () => {
      try {
        const fitid = fitidFromString('FITID-DUP-111');
        const first = buildBankPaidPayable(fitid);
        const second = buildBankPaidPayable(fitid); // mesmo FITID, ID diferente
        const r1 = await repo.save(first, []);
        assert.equal(isOk(r1), true);
        const r2 = await repo.save(second, []);
        assert.equal(isErr(r2), true);
        if (!r2.ok) assert.equal(r2.error, 'payable-fitid-duplicate');
      } finally {
        await cleanup();
      }
    });

    it('CA-12: save aceita re-save do MESMO Payable com mesmo FITID (upsert por ID, não falso-positivo)', async () => {
      try {
        const fitid = fitidFromString('FITID-UPSERT-222');
        const p = buildBankPaidPayable(fitid);
        const r1 = await repo.save(p, []);
        assert.equal(isOk(r1), true);
        // Re-save do MESMO payable (mesmo id, mesmo fitid) — não pode rejeitar
        const r2 = await repo.save(p, []);
        assert.equal(isOk(r2), true);
      } finally {
        await cleanup();
      }
    });

    // ─── Outbox integration (CA-14 do FIN-USECASE-APPROVE-PAYABLE) ───

    it('CA-14: save(p, [event]) propaga evento para o outbox injetado', async () => {
      try {
        const p = buildOpenPayable();
        const event: PayableEvent = {
          type: 'PayableOpened',
          payableId: p.id,
          occurredAt: p.openedAt,
        };
        const saved = await repo.save(p, [event]);
        assert.equal(isOk(saved), true);

        const rows = outboxHelpers.all();
        assert.equal(rows.length, 1, 'outbox tem 1 row após save com 1 evento');
        const row = rows[0];
        assert.ok(row !== undefined);
        assert.equal(row.eventType, 'PayableOpened');
        assert.equal(row.processedAt, null);
        assert.equal(row.attempts, 0);
      } finally {
        await cleanup();
      }
    });
  });
};
