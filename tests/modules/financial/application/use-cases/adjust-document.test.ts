import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { isErr, isOk } from '#src/shared/index.ts';
import * as Money from '#src/shared/kernel/money.ts';
import * as UserRef from '#src/shared/kernel/user-ref.ts';
import { ClockFixed } from '#src/shared/adapters/clock-fixed.ts';
import { SupplierRef } from '#src/modules/partners/public-api/refs.ts';
import { DocumentId } from '#src/modules/financial/domain/shared/ids.ts';
import * as Retention from '#src/modules/financial/domain/shared/retention.ts';
import * as Document from '#src/modules/financial/domain/document/document.ts';
import { createInMemoryDocumentRepository } from '#src/modules/financial/adapters/persistence/repos/document-repository.in-memory.ts';
import { createInMemoryOutbox } from '#src/modules/financial/adapters/outbox/outbox.in-memory.ts';
import { createInMemoryRemittanceRepository } from '#src/modules/financial/adapters/persistence/repos/remittance-repository.in-memory.ts';
import { createInMemoryTaxonomyPathRead } from '#src/modules/financial/adapters/persistence/repos/taxonomy-path-read.in-memory.ts';
import type { TimelineStore } from '#src/modules/financial/adapters/persistence/repos/timeline-repository.in-memory.ts';
import type { DocumentRepository } from '#src/modules/financial/domain/document/repository.ts';
import type {
  DocumentStatus,
  PaymentMethod,
} from '#src/modules/financial/domain/document/types.ts';
import {
  adjustDocument,
  type AdjustDocumentDeps,
} from '#src/modules/financial/application/use-cases/adjust-document.ts';

// Fake real (não mock): remessa vazia, então nenhum título está preso e o ajuste segue seu caminho.
const noRemittances = () => createInMemoryRemittanceRepository();

const CLOCK = ClockFixed(new Date('2026-06-15T12:00:00Z'));
const SUP = '11111111-1111-4111-8111-111111111111';
const USER = '22222222-2222-4222-8222-222222222222';
const BOLETO_BARCODE = '3'.repeat(44);

// #1057: um caminho existente e ativo da árvore do plano, para a categorização do Aprovado.
const PATH_INPUT = {
  programRef: 'a1000000-0000-4000-8000-000000000001',
  budgetPlanRef: 'a1000000-0000-4000-8000-000000000002',
  costCenterRef: 'a1000000-0000-4000-8000-000000000003',
  categoryRef: 'a1000000-0000-4000-8000-000000000004',
  subcategoryRef: 'a1000000-0000-4000-8000-000000000005',
} as const;

const deps = (repo: DocumentRepository): AdjustDocumentDeps => ({
  repo,
  clock: CLOCK,
  remittances: noRemittances(),
  taxonomyPaths: createInMemoryTaxonomyPathRead([{ ...PATH_INPUT, active: true }]),
});

const money = (n: number): Money.Money => {
  const r = Money.fromCents(n);
  if (!r.ok) throw new Error('setup money');
  return r.value;
};
const supplier = (): SupplierRef => {
  const r = SupplierRef.rehydrate(SUP);
  if (!r.ok) throw new Error('setup supplier');
  return r.value;
};
const ret = (type: 'ISS' | 'IRRF' | 'INSS', valueCents: number): Retention.Retention => {
  const r = Retention.create({ type, baseCents: valueCents * 10, rateBps: 1000, valueCents });
  if (!r.ok) throw new Error('setup retention');
  return r.value;
};
const createdNfse = (
  paymentMethod: PaymentMethod = 'TED',
  paymentDetail: string | null = null,
): Document.CreateDocumentOutput => {
  const r = Document.create({
    id: DocumentId.generate(),
    documentNumber: 'NFS-1',
    type: 'NFS-e',
    supplier: supplier(),
    paymentMethod,
    paymentDetail,
    grossValue: money(100000),
    sourceDiscounts: money(5000),
    discounts: Money.ZERO,
    penalty: Money.ZERO,
    interest: Money.ZERO,
    retentions: [ret('ISS', 5000), ret('IRRF', 1500), ret('INSS', 11000)],
    registeredTaxes: [],
    dueDate: new Date('2026-07-01'),
  });
  if (!r.ok) throw new Error('setup create');
  return r.value;
};
const seedOpen = async (repo: DocumentRepository) => {
  const c = createdNfse();
  await repo.save({ document: c.document, payables: c.payables }, []);
  return c.document.id;
};
const seedApproved = async (
  repo: DocumentRepository,
  paymentMethod: PaymentMethod = 'TED',
  paymentDetail: string | null = null,
  parentStatus: DocumentStatus = 'Approved',
) => {
  const c = createdNfse(paymentMethod, paymentDetail);
  const by = UserRef.rehydrate(USER);
  if (!by.ok) throw new Error('setup user-ref');
  const a = Document.approve({
    document: c.document,
    payables: c.payables,
    by: by.value,
    at: new Date('2026-07-10'),
  });
  if (!a.ok) throw new Error('setup approve');
  const payables = {
    parent: { ...a.value.payables.parent, status: parentStatus },
    children: a.value.payables.children,
  };
  await repo.save({ document: a.value.document, payables }, []);
  return a.value.document.id;
};

describe('financial/application — adjustDocument', () => {
  it('ajusta um documento Open: recalcula o líquido e regenera os filhos', async () => {
    const outbox = createInMemoryOutbox();
    const repo = createInMemoryDocumentRepository(undefined, undefined, outbox.port);
    const id = await seedOpen(repo);
    const r = await adjustDocument(deps(repo))({
      documentId: id,
      actor: USER,
      expectedVersion: 0,
      interestCents: 500,
      retentions: [
        { type: 'ISS', baseCents: 40000, rateBps: 1000, valueCents: 4000 },
        { type: 'IRRF', baseCents: 15000, rateBps: 1000, valueCents: 1500 },
        { type: 'INSS', baseCents: 110000, rateBps: 1000, valueCents: 11000 },
      ],
    });
    assert.equal(isOk(r), true);
    const found = await repo.findById(id);
    if (found.ok) assert.equal(found.value.payables?.parent.value.cents, 79000); // 100000-5000-16500+500
  });

  it('rejeita ajustar documento não-Open (Approved) — invalid-state-transition', async () => {
    const outbox = createInMemoryOutbox();
    const repo = createInMemoryDocumentRepository(undefined, undefined, outbox.port);
    const id = await seedApproved(repo);
    const r = await adjustDocument(deps(repo))({
      documentId: id,
      actor: USER,
      expectedVersion: 0,
      interestCents: 100,
    });
    assert.equal(isErr(r), true);
    // `.error.error`: o use case devolve o envelope `AdjustDocumentFailure`, e todo `kind` carrega
    // o slug. Asserir o `kind` junto prende a variante — sem isso, uma recusa que virasse
    // `held-payables` por engano passaria neste assert.
    if (!r.ok) {
      assert.equal(r.error.kind, 'plain');
      assert.equal(r.error.error, 'invalid-state-transition');
    }
  });

  it('autor ausente/inválido → user-ref-invalid, sem gravar (a trilha é o controle)', async () => {
    const repo = createInMemoryDocumentRepository();
    const id = await seedOpen(repo);
    const r = await adjustDocument(deps(repo))({
      documentId: id,
      actor: 'não-é-uuid',
      expectedVersion: 0,
      description: 'x',
    });
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.error.error, 'user-ref-invalid');
  });

  it('forma/categorização por esta rota em Open → invalid-state-transition', async () => {
    const repo = createInMemoryDocumentRepository();
    const id = await seedOpen(repo);
    const r = await adjustDocument(deps(repo))({
      documentId: id,
      actor: USER,
      expectedVersion: 0,
      paymentMethod: 'PIX',
    });
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.error.error, 'invalid-state-transition');
  });
});

describe('financial/application — adjustDocument no Aprovado (#1057)', () => {
  it('Boleto → PIX + categorização + descrição: continua Aprovado; trilha com autor e de→para', async () => {
    const timeline: TimelineStore = new Map();
    const repo = createInMemoryDocumentRepository(timeline);
    const id = await seedApproved(repo, 'Boleto', BOLETO_BARCODE);
    const r = await adjustDocument(deps(repo))({
      documentId: id,
      actor: USER,
      expectedVersion: 0,
      description: 'pagamento por Pix',
      paymentMethod: 'PIX',
      taxonomy: PATH_INPUT,
    });
    assert.equal(r.ok, true);

    const found = await repo.findById(id);
    assert.equal(found.ok, true);
    if (!found.ok || found.value.payables === null) return;
    const { document, payables } = found.value;
    assert.equal(document.status, 'Approved');
    assert.equal(document.description, 'pagamento por Pix');
    assert.equal(document.subcategoryRef, PATH_INPUT.subcategoryRef);
    assert.equal(
      payables.parent.paymentMethod,
      'PIX',
      'gravado NO TÍTULO — é de onde a remessa lê',
    );
    assert.equal(payables.parent.paymentDetail, null);
    assert.notEqual(payables.parent.paymentMethodChangedAt, null);
    for (const child of payables.children) assert.equal(child.paymentMethod, 'Boleto');

    const entries = [...timeline.values()].flat();
    assert.ok(entries.length > 0);
    for (const e of entries) {
      assert.equal(e.actor, USER, 'o autor vai à trilha');
      assert.equal(e.eventType, 'DocumentSaved');
    }
    assert.equal(new Set(entries.map((e) => e.eventId)).size, 1, 'um ato, um marco');

    const parentEntry = entries.find(
      (e) => e.target.kind === 'Payable' && e.target.id === payables.parent.id,
    );
    const fields = (parentEntry?.changes ?? []).map((c) => c.field);
    assert.ok(fields.includes('paymentMethod'));
    assert.ok(fields.includes('subcategoryRef'));
    const detail = parentEntry?.changes.find((c) => c.field === 'paymentDetail');
    assert.equal(detail?.before, BOLETO_BARCODE, 'o código antigo fica na trilha como "antes"');

    for (const child of payables.children) {
      const childEntry = entries.find(
        (e) => e.target.kind === 'Payable' && e.target.id === child.id,
      );
      const childFields = (childEntry?.changes ?? []).map((c) => c.field);
      assert.ok(childFields.includes('subcategoryRef'), 'a categorização cascateia ao imposto');
      assert.ok(!childFields.includes('paymentMethod'), 'a forma do imposto não muda');
    }
  });

  it('caminho de taxonomia inexistente/inativo → taxonomy-path-invalid', async () => {
    const repo = createInMemoryDocumentRepository();
    const id = await seedApproved(repo);
    const r = await adjustDocument({
      ...deps(repo),
      taxonomyPaths: createInMemoryTaxonomyPathRead(),
    })({
      documentId: id,
      actor: USER,
      expectedVersion: 0,
      taxonomy: PATH_INPUT,
    });
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.error.error, 'taxonomy-path-invalid');
  });

  it('título pai Transmitido: recusa a edição sem consultar a remessa e sem gravar', async () => {
    const repo = createInMemoryDocumentRepository();
    const id = await seedApproved(repo, 'Boleto', BOLETO_BARCODE, 'Transmitted');
    const r = await adjustDocument({
      ...deps(repo),
      remittances: {
        findHeldPayables: () => Promise.reject(new Error('não deveria consultar a remessa')),
      },
    })({ documentId: id, actor: USER, expectedVersion: 0, description: 'só o texto' });
    assert.equal(r.ok, false);
    if (!r.ok) {
      assert.equal(r.error.kind, 'plain');
      assert.equal(r.error.error, 'document-edit-requires-approved-payables');
    }
    const found = await repo.findById(id);
    if (found.ok) assert.equal(found.value.document.description, null);
  });

  it('vencimento no Aprovado (lote #162) segue aceito e propaga aos títulos', async () => {
    const repo = createInMemoryDocumentRepository();
    const id = await seedApproved(repo);
    const due = new Date('2026-12-15');
    const r = await adjustDocument(deps(repo))({
      documentId: id,
      actor: USER,
      expectedVersion: 0,
      dueDate: due,
    });
    assert.equal(r.ok, true);
    const found = await repo.findById(id);
    if (found.ok && found.value.payables !== null) {
      assert.equal(found.value.document.status, 'Approved');
      assert.deepEqual(found.value.payables.parent.dueDate, due);
    }
  });
});
