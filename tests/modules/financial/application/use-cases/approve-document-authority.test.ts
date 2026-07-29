/**
 * FIN-APPROVE-AUTHORITY-ENFORCE (#609) — a alçada tem de ser enforçada no ATO de aprovar.
 *
 * Antes deste ticket, `checkApprover` rodava apenas na indicação/escalação
 * (`submit-draft.ts:63`, `save-document.ts:265`). O `approveDocument` não recebia
 * `ApproverAuthority` e não validava nada: qualquer usuário com `payable:approve` aprovava
 * qualquer valor. A alçada era ROTEAMENTO, não CONTROLE DE ACESSO.
 *
 * Diferença em relação ao `submit-draft`: aqui a validação é contra o USUÁRIO AUTENTICADO
 * (`cmd.approvedBy`), não contra o aprovador indicado no documento.
 *
 * Molde: `tests/modules/financial/application/use-cases/submit-draft-approver-limit.test.ts`
 * (mesmo fake de reader) + `transitions.test.ts` (mesmo seed de documento Open).
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { ok, isErr, isOk } from '#src/shared/index.ts';
import * as Money from '#src/shared/kernel/money.ts';
import { ClockFixed } from '#src/shared/adapters/clock-fixed.ts';
import { SupplierRef } from '#src/modules/partners/public-api/refs.ts';
import { DocumentId } from '#src/modules/financial/domain/shared/ids.ts';
import * as Document from '#src/modules/financial/domain/document/document.ts';
import * as Retention from '#src/modules/financial/domain/shared/retention.ts';
import { createInMemoryDocumentRepository } from '#src/modules/financial/adapters/persistence/repos/document-repository.in-memory.ts';
import type { DocumentRepository } from '#src/modules/financial/domain/document/repository.ts';
import { approveDocument } from '#src/modules/financial/application/use-cases/approve-document.ts';
import type { ApproverAuthority } from '#src/modules/financial/domain/document/approval-policy.ts';
import type { ApproverAuthorityReader } from '#src/modules/financial/application/ports/approver-authority-reader.ts';

const SUP = '11111111-1111-4111-8111-111111111111';
/** Quem CHAMA o endpoint de aprovar — é contra este usuário que a alçada deve ser checada. */
const CALLER = '22222222-2222-4222-8222-222222222222';
const CLOCK = ClockFixed(new Date('2026-07-10T12:00:00Z'));

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

/** Documento Open, líquido > 0. Valores exatos não importam: as alçadas de teste são extremas. */
const seedOpen = async (repo: DocumentRepository): Promise<string> => {
  const c = Document.create({
    id: DocumentId.generate(),
    documentNumber: 'NFS-APPROVE-AUTH-1',
    type: 'NFS-e',
    supplier: supplier(),
    paymentMethod: 'TED',
    grossValue: money(100000),
    sourceDiscounts: money(5000),
    discounts: Money.ZERO,
    penalty: Money.ZERO,
    interest: Money.ZERO,
    retentions: [ret('ISS', 5000), ret('IRRF', 1500), ret('INSS', 11000)],
    registeredTaxes: [],
    dueDate: new Date('2026-08-01'),
  });
  if (!c.ok) throw new Error('setup create');
  await repo.save({ document: c.value.document, payables: c.value.payables }, []);
  return c.value.document.id;
};

/** Fake do reader: devolve sempre a authority configurada (ou null = aprovador nao encontrado). */
const fakeReader = (auth: ApproverAuthority | null): ApproverAuthorityReader => ({
  get: () => Promise.resolve(ok(auth)),
  list: () => Promise.resolve(ok(auth === null ? [] : [auth])),
});

const authority = (over: Partial<ApproverAuthority> = {}): ApproverAuthority => ({
  userId: CALLER,
  canApprove: true,
  limit: null,
  ...over,
});

const statusOf = async (repo: DocumentRepository, id: string): Promise<string> => {
  const found = await repo.findById(id as never);
  if (!found.ok) throw new Error('setup findById');
  return found.value.document.status;
};

describe('FIN-APPROVE-AUTHORITY-ENFORCE — alçada enforçada no ato de aprovar (#609)', () => {
  it('CA1: alçada insuficiente do CHAMADOR → recusa, documento permanece Open', async () => {
    const repo = createInMemoryDocumentRepository();
    const id = await seedOpen(repo);

    const r = await approveDocument({
      repo,
      clock: CLOCK,
      approverAuthorityReader: fakeReader(authority({ limit: money(1) })),
    })({ documentId: id, approvedBy: CALLER, expectedVersion: 0 });

    assert.equal(isErr(r), true);
    if (!isErr(r)) return;
    assert.equal(r.error, 'approver-limit-exceeded');
    assert.equal(await statusOf(repo, id), 'Open', 'o documento NAO pode ter sido aprovado');
  });

  it('CA1: a alçada checada e a do CHAMADOR, nao a do aprovador indicado', async () => {
    // O reader recebe o userId de quem chama. Se a implementacao passasse `approverRef`,
    // este teste continuaria verde por acidente — entao asseguramos o argumento recebido.
    const repo = createInMemoryDocumentRepository();
    const id = await seedOpen(repo);
    const vistos: string[] = [];

    const spyReader: ApproverAuthorityReader = {
      get: (userId) => {
        vistos.push(userId);
        return Promise.resolve(ok(authority({ limit: money(1) })));
      },
      list: () => Promise.resolve(ok([])),
    };

    await approveDocument({ repo, clock: CLOCK, approverAuthorityReader: spyReader })({
      documentId: id,
      approvedBy: CALLER,
      expectedVersion: 0,
    });

    assert.deepEqual(vistos, [CALLER]);
  });

  it('CA2: alçada suficiente → aprova normalmente (sem regressao)', async () => {
    const repo = createInMemoryDocumentRepository();
    const id = await seedOpen(repo);

    const r = await approveDocument({
      repo,
      clock: CLOCK,
      approverAuthorityReader: fakeReader(authority({ limit: money(999_999_999) })),
    })({ documentId: id, approvedBy: CALLER, expectedVersion: 0 });

    assert.equal(isOk(r), true);
    assert.equal(await statusOf(repo, id), 'Approved');
  });

  it('CA3: alçada OPT-IN — limit null (nao configurada) aprova (regra binaria da P.O., #299)', async () => {
    const repo = createInMemoryDocumentRepository();
    const id = await seedOpen(repo);

    const r = await approveDocument({
      repo,
      clock: CLOCK,
      approverAuthorityReader: fakeReader(authority({ limit: null })),
    })({ documentId: id, approvedBy: CALLER, expectedVersion: 0 });

    assert.equal(isOk(r), true);
    assert.equal(await statusOf(repo, id), 'Approved');
  });

  it('CA4: chamador sem canApprove → recusa com approver-missing-permission', async () => {
    const repo = createInMemoryDocumentRepository();
    const id = await seedOpen(repo);

    const r = await approveDocument({
      repo,
      clock: CLOCK,
      approverAuthorityReader: fakeReader(authority({ canApprove: false })),
    })({ documentId: id, approvedBy: CALLER, expectedVersion: 0 });

    assert.equal(isErr(r), true);
    if (!isErr(r)) return;
    assert.equal(r.error, 'approver-missing-permission');
    assert.equal(await statusOf(repo, id), 'Open');
  });

  it('CA4: autoridade nao encontrada (null) → recusa com approver-not-found', async () => {
    const repo = createInMemoryDocumentRepository();
    const id = await seedOpen(repo);

    const r = await approveDocument({
      repo,
      clock: CLOCK,
      approverAuthorityReader: fakeReader(null),
    })({ documentId: id, approvedBy: CALLER, expectedVersion: 0 });

    assert.equal(isErr(r), true);
    if (!isErr(r)) return;
    assert.equal(r.error, 'approver-not-found');
    assert.equal(await statusOf(repo, id), 'Open');
  });

  it('CA5: gate opt-in — sem reader injetado, aprova como antes (nao quebra composicao existente)', async () => {
    const repo = createInMemoryDocumentRepository();
    const id = await seedOpen(repo);

    const r = await approveDocument({ repo, clock: CLOCK })({
      documentId: id,
      approvedBy: CALLER,
      expectedVersion: 0,
    });

    assert.equal(isOk(r), true);
    assert.equal(await statusOf(repo, id), 'Approved');
  });

  it('a validacao roda ANTES de qualquer escrita (documento intacto na recusa)', async () => {
    const repo = createInMemoryDocumentRepository();
    const id = await seedOpen(repo);
    const antes = await repo.findById(id as never);
    if (!antes.ok) throw new Error('setup');
    const versaoAntes = antes.value.version;

    await approveDocument({
      repo,
      clock: CLOCK,
      approverAuthorityReader: fakeReader(authority({ limit: money(1) })),
    })({ documentId: id, approvedBy: CALLER, expectedVersion: 0 });

    const depois = await repo.findById(id as never);
    if (!depois.ok) throw new Error('setup');
    assert.equal(depois.value.version, versaoAntes, 'a versao mudou — houve escrita numa recusa');
  });
});
