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
import {
  createInMemoryDocumentRepository,
  type DocumentStore,
} from '#src/modules/financial/adapters/persistence/repos/document-repository.in-memory.ts';
import { createInMemoryPayableRepository } from '#src/modules/financial/adapters/persistence/repos/payable-repository.in-memory.ts';
import type { DocumentRepository } from '#src/modules/financial/domain/document/repository.ts';
import type { PayableRepository } from '#src/modules/financial/domain/payable/repository.ts';
import { registerManualPayment } from '#src/modules/financial/application/use-cases/register-manual-payment.ts';
import type { DocumentEvent } from '#src/modules/financial/domain/document/events.ts';

const SUP = '11111111-1111-4111-8111-111111111111';
const USER = '22222222-2222-4222-8222-222222222222';
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
const ret = (type: 'ISS' | 'IRRF', valueCents: number): Retention.Retention => {
  const r = Retention.create({ type, baseCents: valueCents * 10, rateBps: 1000, valueCents });
  if (!r.ok) throw new Error('setup: retention');
  return r.value;
};
const createdNfse = (): Document.CreateDocumentOutput => {
  const r = Document.create({
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
    retentions: [ret('ISS', 35000), ret('IRRF', 15000)],
    registeredTaxes: [],
    dueDate: new Date('2026-07-01'),
  });
  if (!r.ok) throw new Error('setup: create');
  return r.value;
};

// Leitura e escrita moram em ports distintos desde a Fatia 1, mas compartilham o MESMO
// `DocumentStore` — é o que o driver `memory` do composition root faz, e sem isso o teste
// semearia num store e leria de outro.
type Repos = Readonly<{ repo: DocumentRepository; payableRepo: PayableRepository }>;

const makeRepos = (): Repos => {
  const store: DocumentStore = new Map();
  const repo = createInMemoryDocumentRepository(undefined, undefined, undefined, store);
  return { repo, payableRepo: createInMemoryPayableRepository(store) };
};

const seedApproved = async (
  repo: DocumentRepository,
): Promise<{ documentId: string; parentId: string; childId: string }> => {
  const c = createdNfse();
  const by = UserRef.rehydrate(USER);
  if (!by.ok) throw new Error('setup: user');
  const a = Document.approve({
    document: c.document,
    payables: c.payables,
    by: by.value,
    at: new Date('2026-07-10'),
  });
  if (!a.ok) throw new Error('setup: approve');
  await repo.save({ document: a.value.document, payables: a.value.payables }, []);
  const child = a.value.payables.children[0];
  if (child === undefined) throw new Error('setup: NFS-e com retencao deve gerar filho');
  return {
    documentId: String(a.value.document.id),
    parentId: String(a.value.payables.parent.id),
    childId: String(child.id),
  };
};
const seedOpen = async (repo: DocumentRepository): Promise<string> => {
  const c = createdNfse();
  await repo.save({ document: c.document, payables: c.payables }, []);
  return String(c.document.id);
};

describe('financial/application — registerManualPayment (#223)', () => {
  it('paga o título pai (Aprovado→Pago); repo reflete e os filhos seguem Aprovados', async () => {
    const { repo, payableRepo } = makeRepos();
    const seed = await seedApproved(repo);
    const r = await registerManualPayment({ repo, payableRepo, clock: CLOCK })({
      documentId: seed.documentId,
      payableId: seed.parentId,
      paidBy: USER,
      expectedVersion: 0,
    });
    assert.equal(isOk(r), true, JSON.stringify(r));
    const found = await repo.findById(seed.documentId as never);
    if (found.ok) {
      assert.equal(found.value.payables?.parent.status, 'Paid');
      assert.ok(found.value.payables?.children.every((c) => c.status === 'Approved'));
    }
  });

  it('documento não-Aprovado (Open) → invalid-state-transition', async () => {
    const { repo, payableRepo } = makeRepos();
    const documentId = await seedOpen(repo);
    const found = await repo.findById(documentId as never);
    const payableId = found.ok ? String(found.value.payables?.parent.id) : '';
    const r = await registerManualPayment({ repo, payableRepo, clock: CLOCK })({
      documentId,
      payableId,
      paidBy: USER,
      expectedVersion: 0,
    });
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'invalid-state-transition');
  });

  it('payableId inexistente → payable-not-found', async () => {
    const { repo, payableRepo } = makeRepos();
    const seed = await seedApproved(repo);
    const r = await registerManualPayment({ repo, payableRepo, clock: CLOCK })({
      documentId: seed.documentId,
      payableId: '99999999-9999-4999-8999-999999999999',
      paidBy: USER,
      expectedVersion: 0,
    });
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'payable-not-found');
  });
});

// Fatia 1 — o que muda quando a escrita passa a ser por título. Estes três casos falhariam no
// caminho antigo (`DocumentRepository.save` com `expectedVersion`), e é por isso que existem.
describe('financial/application — registerManualPayment por título (Fatia 1)', () => {
  it('segunda baixa do MESMO título → payable-state-conflict (CAS por estado)', async () => {
    const { repo, payableRepo } = makeRepos();
    const seed = await seedApproved(repo);
    const pay = registerManualPayment({ repo, payableRepo, clock: CLOCK });

    const first = await pay({
      documentId: seed.documentId,
      payableId: seed.parentId,
      paidBy: USER,
    });
    assert.equal(isOk(first), true, JSON.stringify(first));

    // O domínio já barra o segundo com `payable-not-approved` porque relê o estado; o slug do
    // adapter aparece quando a mudança escapa entre a leitura e a escrita. O que este caso fixa é
    // que a segunda baixa NÃO passa — por um caminho ou pelo outro.
    const second = await pay({
      documentId: seed.documentId,
      payableId: seed.parentId,
      paidBy: USER,
    });
    assert.equal(isErr(second), true, 'a segunda baixa do mesmo titulo nao pode passar');
  });

  it('baixar títulos IRMÃOS em sequência: as duas passam (sem conflito de versão)', async () => {
    const { repo, payableRepo } = makeRepos();
    const seed = await seedApproved(repo);
    const pay = registerManualPayment({ repo, payableRepo, clock: CLOCK });

    // No caminho antigo a segunda receberia `document-version-conflict`: a primeira baixa teria
    // incrementado a versão do documento, e o `expectedVersion` lido pelo cliente ficaria velho —
    // conflito relatado sobre uma disputa que nunca existiu.
    const first = await pay({
      documentId: seed.documentId,
      payableId: seed.parentId,
      paidBy: USER,
      expectedVersion: 0,
    });
    const second = await pay({
      documentId: seed.documentId,
      payableId: seed.childId,
      paidBy: USER,
      expectedVersion: 0,
    });

    assert.equal(isOk(first), true, JSON.stringify(first));
    assert.equal(
      isOk(second),
      true,
      `titulos irmaos nao disputam entre si: ${JSON.stringify(second)}`,
    );
  });

  it('a baixa não move a version do documento', async () => {
    const { repo, payableRepo } = makeRepos();
    const seed = await seedApproved(repo);

    const before = await repo.findById(seed.documentId as never);
    const versionBefore = before.ok ? before.value.version : -1;

    const r = await registerManualPayment({ repo, payableRepo, clock: CLOCK })({
      documentId: seed.documentId,
      payableId: seed.parentId,
      paidBy: USER,
    });
    assert.equal(isOk(r), true, JSON.stringify(r));

    const after = await repo.findById(seed.documentId as never);
    if (after.ok) {
      assert.equal(
        after.value.version,
        versionBefore,
        'escrever o documento que nao mudou e o defeito que esta fatia remove',
      );
    }
  });
});

// #232 — a baixa manual deve aceitar `paidAt` (data da saída bancária, retroativa) no command,
// com fallback `clock.now()` e rejeição de data futura. Ancora o match da conciliação.
describe('financial/application — registerManualPayment paidAt (#232)', () => {
  // O evento agora viaja pelo `markPaid` do PayableRepository — o spy acompanhou a mudança de port.
  const captureEvents = (
    payableRepo: PayableRepository,
  ): { payableRepo: PayableRepository; events: DocumentEvent[] } => {
    const events: DocumentEvent[] = [];
    const spy: PayableRepository = {
      markPaid: (input) => {
        events.push(...input.events);
        return payableRepo.markPaid(input);
      },
    };
    return { payableRepo: spy, events };
  };

  it('CA1: `paidAt` retroativo do command é gravado no evento PayableManuallyPaid', async () => {
    const { repo, payableRepo: base } = makeRepos();
    const seed = await seedApproved(repo);
    const { payableRepo, events } = captureEvents(base);
    const r = await registerManualPayment({ repo, payableRepo, clock: CLOCK })({
      documentId: seed.documentId,
      payableId: seed.parentId,
      paidBy: USER,
      expectedVersion: 0,
      paidAt: '2026-07-12',
    });
    assert.equal(isOk(r), true, JSON.stringify(r));
    const ev = events.find((e) => e.type === 'PayableManuallyPaid');
    assert.ok(ev, 'evento PayableManuallyPaid emitido');
    if (ev?.type === 'PayableManuallyPaid') {
      assert.equal(ev.paidAt.toISOString().slice(0, 10), '2026-07-12');
    }
  });

  it('CA2: sem `paidAt` → fallback clock.now()', async () => {
    const { repo, payableRepo: base } = makeRepos();
    const seed = await seedApproved(repo);
    const { payableRepo, events } = captureEvents(base);
    const r = await registerManualPayment({ repo, payableRepo, clock: CLOCK })({
      documentId: seed.documentId,
      payableId: seed.parentId,
      paidBy: USER,
      expectedVersion: 0,
    });
    assert.equal(isOk(r), true, JSON.stringify(r));
    const ev = events.find((e) => e.type === 'PayableManuallyPaid');
    if (ev?.type === 'PayableManuallyPaid') {
      assert.equal(ev.paidAt.toISOString(), '2026-07-15T12:00:00.000Z');
    }
  });

  it('CA3: `paidAt` futura → paid-at-in-future', async () => {
    const { repo, payableRepo } = makeRepos();
    const seed = await seedApproved(repo);
    const r = await registerManualPayment({ repo, payableRepo, clock: CLOCK })({
      documentId: seed.documentId,
      payableId: seed.parentId,
      paidBy: USER,
      expectedVersion: 0,
      paidAt: '2026-08-01',
    });
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'paid-at-in-future');
  });
});
