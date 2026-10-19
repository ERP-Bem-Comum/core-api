// #61 — caso de uso do desfazer baixa (decisões da P.O., 19/10).
//
// O que só o use case decide, e por isso só se mede aqui:
//   - DE ONDE vem o status anterior à baixa: a trilha, com a remessa de reserva para baixa antiga;
//
// A remessa é um dublê mínimo (`findHeldPayables` + `findById`): gerar uma remessa de verdade em
// memória arrastaria conta-cedente, convênio e tradução CNAB para um teste que não mede nada disso.

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { ok } from '#src/shared/primitives/result.ts';
import * as Money from '#src/shared/kernel/money.ts';
import * as UserRef from '#src/shared/kernel/user-ref.ts';
import { ClockFixed } from '#src/shared/adapters/clock-fixed.ts';
import { SupplierRef } from '#src/modules/partners/public-api/refs.ts';
import { DocumentId } from '#src/modules/financial/domain/shared/ids.ts';
import * as Retention from '#src/modules/financial/domain/shared/retention.ts';
import * as Document from '#src/modules/financial/domain/document/document.ts';
import type { DocumentStatus } from '#src/modules/financial/domain/document/types.ts';
import {
  createInMemoryDocumentRepository,
  type DocumentStore,
} from '#src/modules/financial/adapters/persistence/repos/document-repository.in-memory.ts';
import { createInMemoryPayableRepository } from '#src/modules/financial/adapters/persistence/repos/payable-repository.in-memory.ts';
import {
  createInMemoryTimelineRepository,
  type TimelineStore,
} from '#src/modules/financial/adapters/persistence/repos/timeline-repository.in-memory.ts';
import type { RemittanceRepository } from '#src/modules/financial/application/ports/remittance-repository.ts';
import { registerManualPayment } from '#src/modules/financial/application/use-cases/register-manual-payment.ts';
import { undoManualPayment } from '#src/modules/financial/application/use-cases/undo-manual-payment.ts';

const SUP = '11111111-1111-4111-8111-111111111111';
const USER = '22222222-2222-4222-8222-222222222222';
const REMITTANCE = '33333333-3333-4333-8333-333333333333';
const CLOCK = ClockFixed(new Date('2026-07-15T12:00:00Z'));

const money = (n: number): Money.Money => {
  const r = Money.fromCents(n);
  if (!r.ok) throw new Error('setup: money');
  return r.value;
};
const supplier = (): SupplierRef => {
  const r = SupplierRef.rehydrate(SUP);
  if (!r.ok) throw new Error('setup: supplier');
  return r.value;
};
const ret = (valueCents: number): Retention.Retention => {
  const r = Retention.create({
    type: 'ISS',
    baseCents: valueCents * 10,
    rateBps: 1000,
    valueCents,
  });
  if (!r.ok) throw new Error('setup: retention');
  return r.value;
};

type RemittanceStatus = 'Queued' | 'Transmitted' | 'Failed';

/** Dublê da remessa: o título está (ou não) preso a UMA remessa, no status dado. */
const remittances = (held: RemittanceStatus | null): RemittanceRepository =>
  ({
    findHeldPayables: (ids: readonly string[]) =>
      Promise.resolve(
        ok(
          held === null
            ? []
            : ids.map((payableId) => ({ payableId, remittanceId: REMITTANCE, nsa: 7 })),
        ),
      ),
    findById: () => Promise.resolve(ok(held === null ? null : { status: held })),
  }) as unknown as RemittanceRepository;

const setup = async () => {
  const store: DocumentStore = new Map();
  const timelineStore: TimelineStore = new Map();
  const repo = createInMemoryDocumentRepository(undefined, undefined, undefined, store);
  const payableRepo = createInMemoryPayableRepository(store, timelineStore);
  const timelineRepo = createInMemoryTimelineRepository(timelineStore);

  const created = Document.create({
    id: DocumentId.generate(),
    documentNumber: 'NFS-1',
    type: 'NFS-e',
    supplier: supplier(),
    paymentMethod: 'TED',
    grossValue: money(1000000),
    sourceDiscounts: Money.ZERO,
    discounts: Money.ZERO,
    penalty: Money.ZERO,
    interest: Money.ZERO,
    retentions: [ret(35000)],
    registeredTaxes: [],
    dueDate: new Date('2026-07-01'),
  });
  if (!created.ok) throw new Error('setup: create');
  const by = UserRef.rehydrate(USER);
  if (!by.ok) throw new Error('setup: user');
  const a = Document.approve({
    document: created.value.document,
    payables: created.value.payables,
    by: by.value,
    at: new Date('2026-07-10'),
  });
  if (!a.ok) throw new Error('setup: approve');
  await repo.save({ document: a.value.document, payables: a.value.payables }, []);

  const documentId = String(a.value.document.id);
  const parentId = String(a.value.payables.parent.id);

  /** Move o pai para `status` direto no store — como a remessa (ou uma baixa antiga) o deixaria. */
  const setParent = (status: DocumentStatus): void => {
    const entry = store.get(documentId);
    const payables = entry?.aggregate.payables;
    if (entry === undefined || payables == null) throw new Error('setup: documento');
    store.set(documentId, {
      version: entry.version,
      aggregate: {
        document: entry.aggregate.document,
        payables: {
          parent: {
            ...payables.parent,
            status,
            paidAt: status === 'Paid' ? new Date('2026-07-12') : null,
          },
          children: payables.children,
        },
      },
    });
  };

  const parent = async () => {
    const found = await repo.findById(documentId as never);
    if (!found.ok || found.value.payables === null) throw new Error('leitura');
    return found.value.payables.parent;
  };

  const pay = async () => {
    const r = await registerManualPayment({ repo, payableRepo, clock: CLOCK })({
      documentId,
      payableId: parentId,
      paidBy: USER,
    });
    assert.ok(r.ok, JSON.stringify(r));
  };

  const timeline = () => timelineStore.get(documentId) ?? [];

  const undoPay = (held: RemittanceStatus | null = null, reason = 'Data digitada errada') =>
    undoManualPayment({
      repo,
      payableRepo,
      timelineRepo,
      remittances: remittances(held),
      clock: CLOCK,
    })({ documentId, payableId: parentId, undoneBy: USER, reason });

  return { setParent, parent, pay, timeline, undoPay };
};

describe('#61 — undoManualPayment: o status anterior vem da TRILHA', () => {
  it('baixa dada em Aprovado → volta a Aprovado, sem data; trilha com motivo e autor', async () => {
    const s = await setup();
    await s.pay();
    const r = await s.undoPay();
    assert.ok(r.ok, JSON.stringify(r));

    const p = await s.parent();
    assert.equal(p.status, 'Approved');
    assert.equal(p.paidAt, null);

    const undone = s.timeline().filter((e) => e.eventType === 'ManualPaymentUndone');
    const onPayable = undone.find((e) => e.target.kind === 'Payable');
    assert.ok(onPayable, 'esperava entrada do título na trilha');
    assert.equal(onPayable.reason, 'Data digitada errada');
    assert.equal(String(onPayable.actor), USER);
    assert.deepEqual(
      onPayable.changes.find((c) => c.field === 'status'),
      { field: 'status', before: 'Paid', after: 'Approved' },
    );
  });

  it('baixa dada em Transmitido → volta a Transmitido (nunca a Aprovado: risco de nova remessa)', async () => {
    const s = await setup();
    s.setParent('Transmitted');
    await s.pay();
    const r = await s.undoPay('Transmitted');
    assert.ok(r.ok, JSON.stringify(r));
    assert.equal((await s.parent()).status, 'Transmitted');
  });
});

describe('#61 — undoManualPayment: baixa antiga, sem o "antes" na trilha (P.O., 19/10)', () => {
  it('título preso a remessa viva → volta a Transmitido', async () => {
    const s = await setup();
    s.setParent('Paid');
    const r = await s.undoPay('Failed');
    assert.ok(r.ok, JSON.stringify(r));
    assert.equal((await s.parent()).status, 'Transmitted');
  });

  it('sem remessa → volta a Aprovado', async () => {
    const s = await setup();
    s.setParent('Paid');
    const r = await s.undoPay(null);
    assert.ok(r.ok, JSON.stringify(r));
    assert.equal((await s.parent()).status, 'Approved');
  });
});

describe('#61 — undoManualPayment: recusas', () => {
  it('título não pago → payable-not-paid', async () => {
    const s = await setup();
    const r = await s.undoPay();
    assert.equal(r.ok ? null : r.error, 'payable-not-paid');
  });

  it('título conciliado → payable-not-paid (desfaz-se a conciliação antes)', async () => {
    const s = await setup();
    s.setParent('Reconciled');
    const r = await s.undoPay();
    assert.equal(r.ok ? null : r.error, 'payable-not-paid');
  });

  it('motivo em branco → undo-requires-reason, e nada muda', async () => {
    const s = await setup();
    await s.pay();
    const r = await s.undoPay(null, '  ');
    assert.equal(r.ok ? null : r.error, 'undo-requires-reason');
    assert.equal((await s.parent()).status, 'Paid');
  });
});
