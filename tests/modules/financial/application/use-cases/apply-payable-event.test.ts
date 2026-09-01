/**
 * #235 (FIN-PAYABLE-READMODEL) — W0 RED · CA2/CA3/CA4.
 * O projetor `applyPayableEvent` alimenta o read-model fin_payable_view a partir do payload
 * tipado dos eventos (ADR-0022). Cria linhas em DocumentSaved, atualiza status nas transições,
 * e é idempotente (reprocessar o mesmo evento não duplica nem corrompe — operações set-based).
 * API ainda não existe → RED por inexistência.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { applyPayableEvent } from '#src/modules/financial/application/use-cases/apply-payable-event.ts';
import { createInMemoryPayableViewStore } from '#src/modules/financial/adapters/persistence/repos/payable-view-store.in-memory.ts';

// #894: instante do evento — o guard de recência do read-model o exige. Valor fixo: estes casos
// não exercitam ordenação, e um `new Date()` por chamada tornaria o teste dependente do relógio.
const OCCURRED_AT = new Date('2026-01-01T00:00:00.000Z');

const DOC = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';
const P1 = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const SUP = '11111111-1111-4111-8111-111111111111';
const CAT = '22222222-2222-4222-8222-222222222222';
// #446 (REP-3 / Slice B): Plano Orçamentário carimbado no documento (#502) que flui até o read-model.
const BPR = '33333333-3333-4333-8333-333333333333';

const documentSaved = () =>
  JSON.stringify({
    documentId: DOC,
    supplierRef: SUP,
    contractRef: null,
    categoryRef: CAT,
    budgetPlanRef: BPR,
    costCenterRef: null,
    programRef: null,
    payables: [
      {
        payableId: P1,
        kind: 'Parent',
        retentionType: null,
        valueCents: '77500',
        dueDate: '2026-07-01',
        status: 'Open',
      },
    ],
  });

// #239: PayableManuallyPaid carrega paidAt (o evento real sempre tem); os demais ignoram.
const statusEvent = (payableId: string) =>
  JSON.stringify({
    documentId: DOC,
    payableId,
    payableIds: [payableId],
    paidAt: '2026-06-20T12:00:00.000Z',
  });

describe('financial/application — applyPayableEvent projeta fin_payable_view (#235)', () => {
  it('CA2: DocumentSaved cria uma linha por título com refs/valor/dueDate/status=Open', async () => {
    const store = createInMemoryPayableViewStore();
    const r = await applyPayableEvent({ store })({
      eventType: 'DocumentSaved',
      occurredAt: OCCURRED_AT,
      payload: documentSaved(),
    });
    assert.equal(r.ok, true);
    const list = await store.list();
    assert.equal(list.ok, true);
    if (list.ok) {
      assert.equal(list.value.length, 1);
      const row = list.value[0];
      assert.equal(row?.payableId, P1);
      assert.equal(row?.supplierRef, SUP);
      assert.equal(row?.categoryRef, CAT);
      // #446 (REP-3 / Slice B): o budgetPlanRef do documento aparece projetado no read-model.
      assert.equal(row?.budgetPlanRef, BPR);
      assert.equal(row?.valueCents, 77500);
      assert.equal(row?.status, 'Open');
    }
  });

  it('#446 (Slice B): DocumentSaved sem budgetPlanRef → budgetPlanRef null', async () => {
    const store = createInMemoryPayableViewStore();
    const payload = JSON.stringify({
      documentId: DOC,
      supplierRef: SUP,
      contractRef: null,
      categoryRef: CAT,
      costCenterRef: null,
      programRef: null,
      payables: [
        {
          payableId: P1,
          kind: 'Parent',
          retentionType: null,
          valueCents: '77500',
          dueDate: '2026-07-01',
          status: 'Open',
        },
      ],
    });
    const r = await applyPayableEvent({ store })({
      eventType: 'DocumentSaved',
      occurredAt: OCCURRED_AT,
      payload,
    });
    assert.equal(r.ok, true);
    const list = await store.list();
    if (list.ok) assert.equal(list.value[0]?.budgetPlanRef, null);
  });

  it('CA3: transições de status atualizam a linha (Approved/Paid/Cancelled/Open)', async () => {
    const store = createInMemoryPayableViewStore();
    const deps = { store };
    await applyPayableEvent(deps)({
      eventType: 'DocumentSaved',
      occurredAt: OCCURRED_AT,
      payload: documentSaved(),
    });

    const statusAfter = async (): Promise<string | undefined> => {
      const l = await store.list();
      return l.ok ? l.value[0]?.status : undefined;
    };

    await applyPayableEvent(deps)({
      eventType: 'PayableApproved',
      occurredAt: OCCURRED_AT,
      payload: statusEvent(P1),
    });
    assert.equal(await statusAfter(), 'Approved');

    await applyPayableEvent(deps)({
      eventType: 'PayableManuallyPaid',
      occurredAt: OCCURRED_AT,
      payload: statusEvent(P1),
    });
    assert.equal(await statusAfter(), 'Paid');

    await applyPayableEvent(deps)({
      eventType: 'DocumentCancelled',
      occurredAt: OCCURRED_AT,
      payload: statusEvent(P1),
    });
    assert.equal(await statusAfter(), 'Cancelled');

    await applyPayableEvent(deps)({
      eventType: 'ApprovalUndone',
      occurredAt: OCCURRED_AT,
      payload: statusEvent(P1),
    });
    assert.equal(await statusAfter(), 'Open');
  });

  it('CA4: idempotência — reprocessar o mesmo evento não duplica nem corrompe', async () => {
    const store = createInMemoryPayableViewStore();
    const deps = { store };
    await applyPayableEvent(deps)({
      eventType: 'DocumentSaved',
      occurredAt: OCCURRED_AT,
      payload: documentSaved(),
    });
    await applyPayableEvent(deps)({
      eventType: 'DocumentSaved',
      occurredAt: OCCURRED_AT,
      payload: documentSaved(),
    });
    const l1 = await store.list();
    if (l1.ok) assert.equal(l1.value.length, 1);

    await applyPayableEvent(deps)({
      eventType: 'PayableApproved',
      occurredAt: OCCURRED_AT,
      payload: statusEvent(P1),
    });
    await applyPayableEvent(deps)({
      eventType: 'PayableApproved',
      occurredAt: OCCURRED_AT,
      payload: statusEvent(P1),
    });
    const l2 = await store.list();
    if (l2.ok) {
      assert.equal(l2.value.length, 1);
      assert.equal(l2.value[0]?.status, 'Approved');
    }
  });

  it('CA (skip): evento fora do contrato → ok, sem escrita', async () => {
    const store = createInMemoryPayableViewStore();
    const r = await applyPayableEvent({ store })({
      eventType: 'ApproverEscalated',
      occurredAt: OCCURRED_AT,
      payload: '{}',
    });
    assert.equal(r.ok, true);
    const l = await store.list();
    if (l.ok) assert.equal(l.value.length, 0);
  });

  // M1 (W2): descarte de rascunho emite DocumentCancelled com payableIds VAZIO (cancelDraft) —
  // é operação válida → no-op no read-model, NÃO payload-invalid (evitar retry/DLQ inócuo).
  it('M1: DocumentCancelled com payableIds vazio (descarte de rascunho) → ok, no-op', async () => {
    const store = createInMemoryPayableViewStore();
    const r = await applyPayableEvent({ store })({
      eventType: 'DocumentCancelled',
      occurredAt: OCCURRED_AT,
      payload: JSON.stringify({ documentId: DOC, payableIds: [] }),
    });
    assert.equal(r.ok, true);
  });

  // m4 (W2): array de ids populado com entrada não-string = payload corrompido → rejeita (não dropa).
  it('m4: payableIds com entrada não-string → payload-invalid', async () => {
    const store = createInMemoryPayableViewStore();
    const r = await applyPayableEvent({ store })({
      eventType: 'DocumentCancelled',
      occurredAt: OCCURRED_AT,
      payload: JSON.stringify({ documentId: DOC, payableIds: ['ok', 123] }),
    });
    assert.equal(r.ok, false);
  });

  // #792 / ADR-0065 §5 — o read-model DEIXOU de colapsar `Transmitted` em `Approved`.
  //
  // O colapso era o defeito visível da issue: o operador gerava a remessa, o pagamento ia para o
  // banco, e o grid seguia dizendo "Aprovado". Os dois casos abaixo medem as duas metades disso — a
  // projeção pelo evento (título que transiciona) e pelo snapshot (documento salvo/backfill).
  it('#792: PayableTransmitted projeta o título como Transmitted, não Approved', async () => {
    const store = createInMemoryPayableViewStore();
    const deps = { store };
    await applyPayableEvent(deps)({
      eventType: 'DocumentSaved',
      occurredAt: OCCURRED_AT,
      payload: documentSaved(),
    });
    await applyPayableEvent(deps)({
      eventType: 'PayableApproved',
      occurredAt: OCCURRED_AT,
      payload: statusEvent(P1),
    });

    const r = await applyPayableEvent(deps)({
      eventType: 'PayableTransmitted',
      occurredAt: OCCURRED_AT,
      payload: JSON.stringify({
        documentId: DOC,
        payableId: P1,
        remittanceId: '33333333-3333-4333-8333-333333333333',
        nsa: 7,
        fileName: 'PAG_000000.11082026142605_000007.REM',
        occurredAt: '2026-08-24T12:00:00.000Z',
      }),
    });

    assert.equal(r.ok, true);
    const l = await store.list();
    assert.ok(l.ok);
    assert.equal(l.value[0]?.status, 'Transmitted');
    assert.notEqual(
      l.value[0]?.status,
      'Approved',
      'o colapso era o defeito da #792: o grid dizia "Aprovado" sobre pagamento já enviado',
    );
  });

  it('#792: snapshot com status Transmitted não é mais mapeado a Approved', async () => {
    const store = createInMemoryPayableViewStore();
    const payload = JSON.stringify({
      documentId: DOC,
      supplierRef: SUP,
      contractRef: null,
      categoryRef: null,
      costCenterRef: null,
      programRef: null,
      payables: [
        {
          payableId: P1,
          kind: 'Parent',
          retentionType: null,
          valueCents: '77500',
          dueDate: '2026-07-01',
          status: 'Transmitted',
        },
      ],
    });
    const r = await applyPayableEvent({ store })({
      eventType: 'DocumentSaved',
      occurredAt: OCCURRED_AT,
      payload,
    });
    assert.equal(r.ok, true);
    const l = await store.list();
    assert.ok(l.ok);
    assert.equal(l.value[0]?.status, 'Transmitted');
  });

  // m2 (#307): status do snapshot é DocumentStatus (8 valores); mapa explícito → PayableViewStatus.
  // Reconciled é settled → 'Paid' (não mais rejeitado silenciosamente).
  //
  // ⚠️ Este caso e o de cima acima NÃO se contradizem, e a diferença é a régua do ADR-0065 §5:
  // `PartiallyReconciled`/`Reconciled` são refinamentos de "já foi pago" e o read-model não promete
  // distingui-los; `Transmitted` é outro MOMENTO do ciclo, não um refinamento de `Approved`.
  it('m2: snapshot com DocumentStatus fora dos 5 read-model (Reconciled) → mapeado a Paid', async () => {
    const store = createInMemoryPayableViewStore();
    const payload = JSON.stringify({
      documentId: DOC,
      supplierRef: SUP,
      contractRef: null,
      categoryRef: null,
      costCenterRef: null,
      programRef: null,
      payables: [
        {
          payableId: P1,
          kind: 'Parent',
          retentionType: null,
          valueCents: '77500',
          dueDate: '2026-07-01',
          status: 'Reconciled',
        },
      ],
    });
    const r = await applyPayableEvent({ store })({
      eventType: 'DocumentSaved',
      occurredAt: OCCURRED_AT,
      payload,
    });
    assert.equal(r.ok, true);
    const l = await store.list();
    if (l.ok) {
      assert.equal(l.value.length, 1);
      assert.equal(l.value[0]?.status, 'Paid');
    }
  });
});
