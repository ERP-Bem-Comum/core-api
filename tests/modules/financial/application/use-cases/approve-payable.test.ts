/**
 * Testes do use case `approvePayable` — primeiro use case real do módulo Financial.
 *
 * Cobre CAs 19..25 do ticket FIN-USECASE-APPROVE-PAYABLE:
 *   CA-19: happy path Open → Approved
 *   CA-20: outbox propagation (evento enfileirado via repo.save)
 *   CA-21: invalid payableId
 *   CA-22: not-found
 *   CA-23: invalid userRef (approvedBy)
 *   CA-24: payable não-Open (já Approved) → payableNotOpen
 *   CA-25: data anterior a openedAt → payableApprovalDateBeforeOpenedAt
 *
 * Pattern de referência: `tests/modules/contracts/application/use-cases/create-contract.test.ts`.
 *
 * **Fixtures inline** — `buildOpenPayable` reusa o agregado real (`Payable.open`)
 * para que bugs em transições quebrem fixture cedo. Helper compartilhado em
 * `tests/helpers/` é YAGNI por enquanto.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { isErr, isOk } from '#src/shared/index.ts';
import { ClockFixed } from '#src/shared/adapters/clock-fixed.ts';
import * as UserRef from '#src/shared/kernel/user-ref.ts';
import * as Money from '#src/shared/kernel/money.ts';
import * as PayableId from '#src/modules/financial/domain/shared/payable-id.ts';
import * as SourceDocumentRef from '#src/modules/financial/domain/shared/source-document-ref.ts';
import * as BeneficiaryBankData from '#src/modules/financial/domain/shared/beneficiary-bank-data.ts';
import * as TaxId from '#src/modules/financial/domain/shared/tax-id.ts';
import { Payable } from '#src/modules/financial/domain/payable/payable.ts';
import type { OpenPayable, ApprovedPayable } from '#src/modules/financial/domain/payable/types.ts';

import { InMemoryOutbox } from '#src/modules/financial/adapters/outbox/outbox.in-memory.ts';
import { InMemoryPayableRepository } from '#src/modules/financial/adapters/persistence/repos/payable-repository.in-memory.ts';

import { approvePayable } from '#src/modules/financial/application/use-cases/approve-payable.ts';

// ─── Fixtures helpers ──────────────────────────────────────────────────

const D = (iso: string): Date => new Date(iso);

const APPROVER_UUID = 'a1b2c3d4-5678-4abc-9def-fedcba987654';

const buildBeneficiary = (): BeneficiaryBankData.BeneficiaryBankData => {
  const taxId = TaxId.fromCpf('11144477735');
  if (!taxId.ok) throw new Error(`fixture TaxId broken: ${taxId.error}`);
  const r = BeneficiaryBankData.fromRaw({
    bankCode: '341',
    agency: '1234-5',
    account: '12345-6',
    holderTaxId: taxId.value,
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

type OpenOverrides = Readonly<{
  openedAt?: Date;
}>;

const buildOpenPayable = (overrides?: OpenOverrides): OpenPayable => {
  const r = Payable.open({
    id: PayableId.generate(),
    sourceDocumentId: SourceDocumentRef.generate(),
    kind: 'Principal',
    paymentMethod: 'BankRemittance',
    beneficiary: buildBeneficiary(),
    value: buildMoney(),
    dueDate: D('2026-06-15T00:00:00Z'),
    openedAt: overrides?.openedAt ?? D('2026-05-20T00:00:00Z'),
  });
  if (!r.ok) throw new Error(`fixture Open broken: ${JSON.stringify(r.error)}`);
  return r.value.payable;
};

const buildApprovedPayable = (): ApprovedPayable => {
  const open = buildOpenPayable();
  const approver = UserRef.rehydrate(APPROVER_UUID);
  if (!approver.ok) throw new Error('fixture UserRef broken');
  const r = Payable.approve(open, approver.value, D('2026-05-25T10:00:00Z'));
  if (!r.ok) throw new Error(`fixture approve broken: ${JSON.stringify(r.error)}`);
  return r.value.payable;
};

const makeWorld = (clockAt: Date) => {
  const outbox = InMemoryOutbox();
  const handle = InMemoryPayableRepository(outbox.port);
  const clock = ClockFixed(clockAt);
  const useCase = approvePayable({ payableRepo: handle.repo, clock });
  return { outbox, handle, clock, useCase };
};

// ─── Testes ───────────────────────────────────────────────────────────

describe('approvePayable — happy path (CA-19)', () => {
  it('CA-19: Open → Approved retorna ok com payable.status=Approved e event.type=PayableApproved', async () => {
    const open = buildOpenPayable();
    const { outbox, handle, useCase } = makeWorld(D('2026-05-25T10:00:00.000Z'));
    await handle.repo.save(open, []);
    outbox.clear(); // limpa outbox para isolar evento do use case

    const result = await useCase({
      payableId: open.id as string,
      approvedByRaw: APPROVER_UUID,
    });

    assert.equal(isOk(result), true);
    if (result.ok) {
      assert.equal(result.value.payable.status, 'Approved');
      assert.equal(result.value.event.type, 'PayableApproved');
      assert.equal(result.value.payable.id, open.id);
    }
  });
});

describe('approvePayable — outbox propagation (CA-20)', () => {
  it('CA-20: após approve, outbox.all() tem 1 row de tipo PayableApproved', async () => {
    const open = buildOpenPayable();
    const { outbox, handle, useCase } = makeWorld(D('2026-05-25T10:00:00.000Z'));
    await handle.repo.save(open, []);
    outbox.clear();

    const result = await useCase({
      payableId: open.id as string,
      approvedByRaw: APPROVER_UUID,
    });
    assert.equal(isOk(result), true);

    const rows = outbox.all();
    assert.equal(rows.length, 1, 'evento enfileirado via repo.save(payable, [event])');
    const row = rows[0];
    assert.ok(row !== undefined);
    assert.equal(row.eventType, 'PayableApproved');
    assert.equal(row.processedAt, null);
  });
});

describe('approvePayable — invalid id (CA-21)', () => {
  it('CA-21: payableId não-UUID retorna err approve-payable-invalid-id', async () => {
    const { useCase } = makeWorld(D('2026-05-25T10:00:00.000Z'));

    const result = await useCase({
      payableId: 'not-a-uuid',
      approvedByRaw: APPROVER_UUID,
    });

    assert.equal(isErr(result), true);
    if (!result.ok) {
      assert.equal(result.error, 'approve-payable-invalid-id');
    }
  });
});

describe('approvePayable — not found (CA-22)', () => {
  it('CA-22: payableId válido mas não persistido retorna err approve-payable-not-found e outbox vazio', async () => {
    const { outbox, useCase } = makeWorld(D('2026-05-25T10:00:00.000Z'));
    const orphanId = PayableId.generate();

    const result = await useCase({
      payableId: orphanId as string,
      approvedByRaw: APPROVER_UUID,
    });

    assert.equal(isErr(result), true);
    if (!result.ok) {
      assert.equal(result.error, 'approve-payable-not-found');
    }
    assert.equal(outbox.all().length, 0, 'nenhum evento enfileirado em not-found');
  });
});

describe('approvePayable — invalid userRef (CA-23)', () => {
  it('CA-23: approvedByRaw não-UUID propaga user-ref-invalid', async () => {
    const open = buildOpenPayable();
    const { handle, useCase } = makeWorld(D('2026-05-25T10:00:00.000Z'));
    await handle.repo.save(open, []);

    const result = await useCase({
      payableId: open.id as string,
      approvedByRaw: 'not-a-uuid',
    });

    assert.equal(isErr(result), true);
    if (!result.ok) {
      assert.equal(result.error, 'user-ref-invalid');
    }
  });
});

describe('approvePayable — payable não-Open (CA-24)', () => {
  it('CA-24: payable já Approved propaga PayableNotOpen com currentStatus=Approved', async () => {
    const approved = buildApprovedPayable();
    const { handle, useCase } = makeWorld(D('2026-05-26T10:00:00.000Z'));
    await handle.repo.save(approved, []);

    const result = await useCase({
      payableId: approved.id as string,
      approvedByRaw: APPROVER_UUID,
    });

    assert.equal(isErr(result), true);
    if (!result.ok && typeof result.error === 'object' && 'tag' in result.error) {
      assert.equal(result.error.tag, 'PayableNotOpen');
      if (result.error.tag === 'PayableNotOpen') {
        assert.equal(result.error.currentStatus, 'Approved');
      }
    }
  });
});

describe('approvePayable — data anterior a openedAt (CA-25)', () => {
  it('CA-25: clock retorna data anterior ao openedAt → PayableApprovalDateBeforeOpenedAt', async () => {
    const openedAt = D('2026-05-25T10:00:00.000Z');
    const open = buildOpenPayable({ openedAt });
    // Clock retorna 1 dia ANTES de openedAt — viola invariante temporal.
    const clockBeforeOpened = D('2026-05-24T10:00:00.000Z');
    const { handle, useCase } = makeWorld(clockBeforeOpened);
    await handle.repo.save(open, []);

    const result = await useCase({
      payableId: open.id as string,
      approvedByRaw: APPROVER_UUID,
    });

    assert.equal(isErr(result), true);
    if (!result.ok && typeof result.error === 'object' && 'tag' in result.error) {
      assert.equal(result.error.tag, 'PayableApprovalDateBeforeOpenedAt');
    }
  });
});
