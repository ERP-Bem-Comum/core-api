// Unit (#323) — PayableReconciliationView InMemory: `searchPaid` reflete o MESMO critério do adapter
// real (paridade com o grid Contas a Pagar). Regressão: "TODO título pago aparece na conciliação".
// Candidato ⇔ (documento Pago  OU  título Paid)  E  título ≠ Reconciled.

import { describe, it, before } from 'node:test';
import { strict as assert } from 'node:assert';

import {
  createInMemoryPayableReconciliationView,
  type PayableRecord,
  type PayableStore,
  type DocumentStatusStore,
} from '#src/modules/financial/adapters/persistence/repos/payable-reconciliation-view.in-memory.ts';
import type { DocumentStatus } from '#src/modules/financial/domain/document/types.ts';
import { newUuid } from '#src/shared/utils/id.ts';

const D = new Date('2026-08-01T00:00:00.000Z');

const payable = (documentId: string, status: DocumentStatus): PayableRecord => ({
  id: newUuid(),
  documentId,
  status,
  valueCents: 1000,
  dueDate: D,
  paymentMethod: 'PIX',
});

describe('PayableReconciliationView InMemory — searchPaid (#323)', () => {
  // Documento PAGO com 3 títulos: 1 líquido Paid + 2 retenções (IRRF Open, CSRF Approved).
  const paidDoc = newUuid();
  const netPaid = payable(paidDoc, 'Paid');
  const irrfOpen = payable(paidDoc, 'Open');
  const csrfApproved = payable(paidDoc, 'Approved');

  // Documento PAGO com um título já CONCILIADO (salvaguarda: não reofertar).
  const reconciledDoc = newUuid();
  const alreadyReconciled = payable(reconciledDoc, 'Reconciled');

  // Documento NÃO-PAGO (Open) com títulos abertos → nenhum candidato.
  const openDoc = newUuid();
  const openNet = payable(openDoc, 'Open');

  // Borda (P.O.): título individualmente Paid cujo DOCUMENTO não está Pago → deve aparecer (via OR).
  const edgeDoc = newUuid();
  const edgePaid = payable(edgeDoc, 'Paid');

  const store: PayableStore = new Map(
    [netPaid, irrfOpen, csrfApproved, alreadyReconciled, openNet, edgePaid].map((p) => [p.id, p]),
  );
  const docStatuses: DocumentStatusStore = new Map<string, DocumentStatus>([
    [paidDoc, 'Paid'],
    [reconciledDoc, 'Paid'],
    [openDoc, 'Open'],
    [edgeDoc, 'Open'],
  ]);

  const view = createInMemoryPayableReconciliationView(store, docStatuses);

  let returned: ReadonlySet<string>;
  before(async () => {
    const r = await view.searchPaid();
    assert.equal(r.ok, true);
    if (!r.ok) return;
    returned = new Set(r.value.map((v) => v.id));
  });

  it('documento Pago → líquido Paid + 2 retenções Open/Approved (os 3) aparecem', () => {
    assert.equal(returned.has(netPaid.id), true, 'líquido Paid');
    assert.equal(returned.has(irrfOpen.id), true, 'retenção IRRF (Open) do doc pago');
    assert.equal(returned.has(csrfApproved.id), true, 'retenção CSRF (Approved) do doc pago');
  });

  it('salvaguarda: título Reconciled NÃO é reofertado', () => {
    assert.equal(returned.has(alreadyReconciled.id), false);
  });

  it('documento Open → nenhum título aparece', () => {
    assert.equal(returned.has(openNet.id), false);
  });

  it('borda: título Paid com documento não-Pago aparece (via OR)', () => {
    assert.equal(returned.has(edgePaid.id), true);
  });
});
