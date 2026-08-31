// M2/RN-M2-05/12 — a subcategoria chega ao `fin_payable_view`, no pai E nos filhos.
//
// O defeito que estes casos travam: a coluna `fin_payable_view.subcategory_ref` e o índice dela
// existiam desde o #502, mas o `DocumentSaved` não carregava a folha e a projeção gravava `null` em
// toda linha. Um relatório agrupado por subcategoria mostrava um balde vazio, e nada no caminho
// acusava — não havia erro, havia ausência.
//
// A cascata da M2 (RN-M2-04) é observável aqui: os refs viajam UMA vez no topo do evento e a
// projeção os escreve em CADA título do snapshot. É por isso que reclassificar o documento leva a
// mesma classificação ao imposto retido, sem um passo de escrita por filho.

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { applyPayableEvent } from '#src/modules/financial/application/use-cases/apply-payable-event.ts';
import { createInMemoryPayableViewStore } from '#src/modules/financial/adapters/persistence/repos/payable-view-store.in-memory.ts';

// #894: instante do evento — o guard de recência do read-model o exige. Valor fixo: estes casos
// não exercitam ordenação, e um `new Date()` por chamada tornaria o teste dependente do relógio.
const OCCURRED_AT = new Date('2026-01-01T00:00:00.000Z');

const DOCUMENT = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';
const PARENT = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const CHILD = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const SUBCATEGORY = '55555555-5555-4555-8555-555555555555';
const CATEGORY = '44444444-4444-4444-8444-444444444444';
const PROGRAM = '11111111-1111-4111-8111-111111111111';

const documentSaved = (over: Record<string, unknown> = {}) =>
  JSON.stringify({
    type: 'DocumentSaved',
    documentId: DOCUMENT,
    payableIds: [PARENT, CHILD],
    supplierRef: '66666666-6666-4666-8666-666666666666',
    contractRef: null,
    categoryRef: CATEGORY,
    budgetPlanRef: '22222222-2222-4222-8222-222222222222',
    subcategoryRef: SUBCATEGORY,
    costCenterRef: '33333333-3333-4333-8333-333333333333',
    programRef: PROGRAM,
    debitAccountRef: null,
    payables: [
      {
        payableId: PARENT,
        kind: 'Parent',
        retentionType: null,
        valueCents: '95000',
        dueDate: '2026-09-10',
        status: 'Paid',
      },
      {
        payableId: CHILD,
        kind: 'Child',
        retentionType: 'ISS',
        valueCents: '5000',
        dueDate: '2026-10-15',
        status: 'Paid',
      },
    ],
    ...over,
  });

describe('financial/application — projeção da subcategoria no fin_payable_view (M2)', () => {
  it('RN-M2-12: o pai recebe a subcategoria do documento', async () => {
    const store = createInMemoryPayableViewStore();
    const r = await applyPayableEvent({ store })({
      eventType: 'DocumentSaved',
      occurredAt: OCCURRED_AT,
      payload: documentSaved(),
    });
    assert.equal(r.ok, true);

    const listed = await store.list();
    assert.equal(listed.ok, true);
    if (!listed.ok) return;
    const parent = listed.value.find((v) => v.payableId === PARENT);
    assert.equal(parent?.subcategoryRef, SUBCATEGORY);
  });

  it('RN-M2-04/05: o FILHO de retenção recebe a MESMA classificação do pai — a cascata física', async () => {
    const store = createInMemoryPayableViewStore();
    await applyPayableEvent({ store })({
      eventType: 'DocumentSaved',
      occurredAt: OCCURRED_AT,
      payload: documentSaved(),
    });

    const listed = await store.list();
    assert.equal(listed.ok, true);
    if (!listed.ok) return;

    const parent = listed.value.find((v) => v.payableId === PARENT);
    const child = listed.value.find((v) => v.payableId === CHILD);
    assert.ok(parent !== undefined && child !== undefined);

    // Invariante 2 da spec, no lugar onde o relatório a lê: cada título carrega a SUA linha, e as
    // duas dizem a mesma coisa. É isto que faz o imposto somar sob o projeto do gasto original.
    assert.equal(child?.subcategoryRef, parent?.subcategoryRef);
    assert.equal(child?.categoryRef, parent?.categoryRef);
    assert.equal(child?.costCenterRef, parent?.costCenterRef);
    assert.equal(child?.budgetPlanRef, parent?.budgetPlanRef);
    assert.equal(child?.programRef, parent?.programRef);
  });

  it('reclassificar reemite DocumentSaved e a linha do FILHO passa a apontar para a classificação nova', async () => {
    const store = createInMemoryPayableViewStore();
    await applyPayableEvent({ store })({
      eventType: 'DocumentSaved',
      occurredAt: OCCURRED_AT,
      payload: documentSaved(),
    });

    // Segundo evento = o `DocumentSaved` que a reclassificação da M2 reemite.
    const NEW_SUB = '77777777-7777-4777-8777-777777777777';
    const NEW_CAT = '88888888-8888-4888-8888-888888888888';
    await applyPayableEvent({ store })({
      eventType: 'DocumentSaved',
      occurredAt: OCCURRED_AT,
      payload: documentSaved({ subcategoryRef: NEW_SUB, categoryRef: NEW_CAT }),
    });

    const listed = await store.list();
    assert.equal(listed.ok, true);
    if (!listed.ok) return;

    // Sem esta atualização o relatório seguiria somando sob a categoria ANTIGA — a "cascata que não
    // chega ao relatório" que a spec §4 nomeia como lacuna.
    const rows = listed.value;
    for (const id of [PARENT, CHILD]) {
      const projected = rows.find((v) => v.payableId === id);
      assert.equal(projected?.subcategoryRef, NEW_SUB, `título ${id}`);
      assert.equal(projected?.categoryRef, NEW_CAT, `título ${id}`);
    }
  });

  it('evento ANTIGO (sem a chave `subcategoryRef`) projeta null — degradação graciosa, não erro', async () => {
    const store = createInMemoryPayableViewStore();
    const payload = JSON.parse(documentSaved()) as Record<string, unknown>;
    delete payload.subcategoryRef;

    const r = await applyPayableEvent({ store })({
      eventType: 'DocumentSaved',
      occurredAt: OCCURRED_AT,
      payload: JSON.stringify(payload),
    });

    // Linha gravada com o resto correto: um evento pré-M2 no outbox não pode derrubar o worker.
    assert.equal(r.ok, true);
    const listed = await store.list();
    assert.equal(listed.ok, true);
    if (!listed.ok) return;
    const parent = listed.value.find((v) => v.payableId === PARENT);
    assert.equal(parent?.subcategoryRef, null);
    assert.equal(parent?.categoryRef, CATEGORY);
  });

  // #894 — a entrega do outbox é at-least-once: um `markFailed` devolve a linha à fila SEM tirá-la
  // da ordem, então o evento anterior à reclassificação pode chegar DEPOIS dela. Enquanto os 5 refs
  // eram imutáveis isso não custava nada; é a M2 que passa a produzir dois `DocumentSaved` do mesmo
  // documento dizendo classificações diferentes.
  it('#894: reentrega do evento ANTIGO não retrocede a classificação já projetada', async () => {
    const store = createInMemoryPayableViewStore();
    const ANTES = new Date('2026-01-01T10:00:00.000Z');
    const DEPOIS = new Date('2026-01-01T11:00:00.000Z');
    const NEW_SUB = '77777777-7777-4777-8777-777777777777';

    // A reclassificação já foi projetada…
    await applyPayableEvent({ store })({
      eventType: 'DocumentSaved',
      occurredAt: DEPOIS,
      payload: documentSaved({ subcategoryRef: NEW_SUB }),
    });

    // …e o worker reentrega o evento velho, que carrega a classificação de antes.
    const replay = await applyPayableEvent({ store })({
      eventType: 'DocumentSaved',
      occurredAt: ANTES,
      payload: documentSaved(),
    });
    // Não é erro: a reentrega é legítima, ela só não pode retroceder. Devolver erro aqui mandaria a
    // linha para a DLQ e criaria um alarme para um evento que se comportou como devia.
    assert.equal(replay.ok, true);

    const listed = await store.list();
    assert.equal(listed.ok, true);
    if (!listed.ok) return;

    // O que se perderia sem o guard: os relatórios voltariam a somar sob a classificação antiga, sem
    // erro, sem log, e sem ninguém ter desfeito nada.
    const rows = listed.value;
    for (const id of [PARENT, CHILD]) {
      const projected = rows.find((v) => v.payableId === id);
      assert.equal(projected?.subcategoryRef, NEW_SUB, `título ${id} regrediu`);
    }
  });

  it('#894: evento MAIS NOVO segue sobrescrevendo — o guard não congela a linha', async () => {
    const store = createInMemoryPayableViewStore();
    const NEW_SUB = '77777777-7777-4777-8777-777777777777';

    await applyPayableEvent({ store })({
      eventType: 'DocumentSaved',
      occurredAt: new Date('2026-01-01T10:00:00.000Z'),
      payload: documentSaved(),
    });
    await applyPayableEvent({ store })({
      eventType: 'DocumentSaved',
      occurredAt: new Date('2026-01-01T11:00:00.000Z'),
      payload: documentSaved({ subcategoryRef: NEW_SUB }),
    });

    const listed = await store.list();
    if (!listed.ok) return;
    const parent = listed.value.find((v) => v.payableId === PARENT);
    assert.equal(parent?.subcategoryRef, NEW_SUB);
  });
});
