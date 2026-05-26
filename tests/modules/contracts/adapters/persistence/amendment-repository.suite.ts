// Suite de contrato compartilhada para AmendmentRepository.
// Toda implementação passa pelos MESMOS cenários — InMemory hoje,
// Drizzle/SQLite no W1, Drizzle/MySQL no futuro.

import { describe, it, beforeEach } from 'node:test';
import { strict as assert } from 'node:assert';

import type { AmendmentRepository } from '#src/modules/contracts/domain/amendment/repository.ts';
import type { Amendment } from '#src/modules/contracts/domain/amendment/types.ts';
import * as AmendmentId from '#src/modules/contracts/domain/shared/amendment-id.ts';
import * as PlainDate from '#src/shared/kernel/plain-date.ts';

import { buildAmendment, buildHomologatedAmendment } from './fixtures.ts';

export interface AmendmentRepoFactory {
  make: () => Promise<{
    repo: AmendmentRepository;
    // Insere um contrato mínimo para satisfazer FK (no-op no InMemory).
    // Adapters relacionais usam isso para semear o contrato pai antes do
    // teste salvar aditivos — mantém a suite focada em Amendments.
    seedContract: (contractId: string) => Promise<void>;
    teardown?: () => Promise<void>;
  }>;
}

const unwrapId = (raw: string) => {
  const r = AmendmentId.rehydrate(raw);
  if (!r.ok) throw new Error(`bad id fixture: ${r.error}`);
  return r.value;
};

const expectAmendment = async (
  repo: AmendmentRepository,
  id: ReturnType<typeof unwrapId>,
  ctx: string,
): Promise<Amendment> => {
  const r = await repo.findById(id);
  if (!r.ok) throw new Error(`${ctx}: findById falhou — ${JSON.stringify(r.error)}`);
  if (r.value === null) throw new Error(`${ctx}: aditivo não encontrado`);
  return r.value;
};

export const runAmendmentRepositoryContract = (
  label: string,
  factory: AmendmentRepoFactory,
): void => {
  describe(`AmendmentRepository contract — ${label}`, () => {
    let repo: AmendmentRepository;
    let seedContract: (contractId: string) => Promise<void>;
    let teardown: (() => Promise<void>) | undefined;

    beforeEach(async () => {
      const built = await factory.make();
      repo = built.repo;
      seedContract = built.seedContract;
      teardown = built.teardown;
    });

    const seedFor = async (amendment: { contractId: unknown }): Promise<void> => {
      await seedContract(amendment.contractId as string);
    };

    const cleanup = async (): Promise<void> => {
      if (teardown !== undefined) await teardown();
    };

    it('findById em repo vazio retorna ok(null)', async () => {
      try {
        const r = await repo.findById(unwrapId('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'));
        assert.equal(r.ok, true);
        if (r.ok) assert.equal(r.value, null);
      } finally {
        await cleanup();
      }
    });

    it('round-trip Addition preserva impactValue + status Pending + nulls', async () => {
      try {
        const a = buildAmendment({
          id: 'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa',
          contractId: '11111111-1111-4111-8111-111111111111',
          amendmentNumber: 'AD 01-001/2026',
          description: 'Acréscimo de 5%',
          createdAtISO: '2026-03-01T10:00:00.123Z',
          kind: 'Addition',
          impactValueCents: 500_000,
        });
        await seedFor(a);
        // CA2 — save aceita events como 2º argumento (W0: repo ainda não tem a assinatura nova)
        await repo.save(a, []);
        const got = await expectAmendment(repo, a.id, 'Addition round-trip');
        assert.equal(got.kind, 'Addition');
        if (got.kind === 'Addition') {
          assert.equal(got.impactValue.cents, 500_000);
        }
        assert.equal(got.status, 'Pending');
        assert.equal(got.signedDocumentRef, null);
        assert.equal(got.homologatedAt, null);
        assert.equal(got.homologatedBy, null);
        assert.equal(got.amendmentNumber, 'AD 01-001/2026');
        assert.equal(got.description, 'Acréscimo de 5%');
        assert.equal(got.createdAt.toISOString(), '2026-03-01T10:00:00.123Z');
      } finally {
        await cleanup();
      }
    });

    it('round-trip Suppression preserva impactValue', async () => {
      try {
        const a = buildAmendment({
          id: 'bbbbbbbb-2222-4222-8222-bbbbbbbbbbbb',
          kind: 'Suppression',
          impactValueCents: 250_000,
        });
        await seedFor(a);
        // CA2 — save aceita events como 2º argumento (W0: repo ainda não tem a assinatura nova)
        await repo.save(a, []);
        const got = await expectAmendment(repo, a.id, 'Suppression');
        assert.equal(got.kind, 'Suppression');
        if (got.kind === 'Suppression') {
          assert.equal(got.impactValue.cents, 250_000);
        }
      } finally {
        await cleanup();
      }
    });

    it('round-trip TermChange preserva newEndDate (sem impactValue)', async () => {
      try {
        const a = buildAmendment({
          id: 'cccccccc-3333-4333-8333-cccccccccccc',
          kind: 'TermChange',
          newEndDateISO: '2027-12-31T23:59:59.000Z',
        });
        await seedFor(a);
        // CA2 — save aceita events como 2º argumento (W0: repo ainda não tem a assinatura nova)
        await repo.save(a, []);
        const got = await expectAmendment(repo, a.id, 'TermChange');
        assert.equal(got.kind, 'TermChange');
        if (got.kind === 'TermChange') {
          assert.equal(PlainDate.toISOString(got.newEndDate), '2027-12-31');
        }
      } finally {
        await cleanup();
      }
    });

    it('round-trip Misc preserva ausência de campos variantes', async () => {
      try {
        const a = buildAmendment({
          id: 'dddddddd-4444-4444-8444-dddddddddddd',
          kind: 'Misc',
        });
        await seedFor(a);
        // CA2 — save aceita events como 2º argumento (W0: repo ainda não tem a assinatura nova)
        await repo.save(a, []);
        const got = await expectAmendment(repo, a.id, 'Misc');
        assert.equal(got.kind, 'Misc');
      } finally {
        await cleanup();
      }
    });

    it('round-trip Homologated preserva signedDocumentRef + homologatedAt + homologatedBy', async () => {
      try {
        const a = buildHomologatedAmendment({
          id: 'eeeeeeee-5555-4555-8555-eeeeeeeeeeee',
          kind: 'Addition',
          impactValueCents: 100_000,
          documentId: '11112222-3333-4444-8555-666677778888',
          userRef: '99998888-7777-4666-8555-444433332222',
        });
        await seedFor(a);
        // CA2 — save aceita events como 2º argumento (W0: repo ainda não tem a assinatura nova)
        await repo.save(a, []);
        const got = await expectAmendment(repo, a.id, 'Homologated');
        assert.equal(got.status, 'Homologated');
        assert.equal(
          got.signedDocumentRef as unknown as string,
          '11112222-3333-4444-8555-666677778888',
        );
        assert.equal(
          got.homologatedBy as unknown as string,
          '99998888-7777-4666-8555-444433332222',
        );
        assert.ok(got.homologatedAt instanceof Date);
        if (got.homologatedAt !== null) {
          assert.equal(Number.isFinite(got.homologatedAt.getTime()), true);
        }
      } finally {
        await cleanup();
      }
    });

    it('save é idempotente (upsert): mesmo ID substitui em vez de duplicar', async () => {
      try {
        const id = 'ffffffff-6666-4666-8666-ffffffffffff';
        const v1 = buildAmendment({ id, description: 'V1' });
        const v2 = buildAmendment({ id, description: 'V2 atualizado' });
        await seedFor(v1);
        await repo.save(v1, []);
        await repo.save(v2, []);
        const got = await expectAmendment(repo, v1.id, 'idempotent');
        assert.equal(got.description, 'V2 atualizado');
      } finally {
        await cleanup();
      }
    });

    it('findById com ID inexistente retorna null sem corromper aditivos persistidos', async () => {
      try {
        const present = buildAmendment({ id: '12345678-1234-4234-8234-123456789012' });
        await seedFor(present);
        await repo.save(present, []);

        const absent = await repo.findById(unwrapId('00000000-0000-4000-8000-000000000000'));
        assert.equal(absent.ok, true);
        if (absent.ok) assert.equal(absent.value, null);

        const got = await expectAmendment(repo, present.id, 'still there');
        assert.equal(got.id, present.id);
      } finally {
        await cleanup();
      }
    });
  });
};
