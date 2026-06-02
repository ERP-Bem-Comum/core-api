import { describe, it, beforeEach } from 'node:test';
import { strict as assert } from 'node:assert';

import { isErr, isOk } from '#src/shared/index.ts';
import type { Clock } from '#src/shared/ports/clock.ts';
import * as PlainDate from '#src/shared/kernel/plain-date.ts';
import { makeInMemoryFinancierStore } from '#src/modules/partners/adapters/persistence/repos/financier-repository.in-memory.ts';
import type { FinancierRepository } from '#src/modules/partners/domain/financier/repository.ts';
import { registerFinancier } from '#src/modules/partners/application/use-cases/register-financier.ts';
import { deactivateFinancier } from '#src/modules/partners/application/use-cases/deactivate-financier.ts';
import { reactivateFinancier } from '#src/modules/partners/application/use-cases/reactivate-financier.ts';
import { listFinanciers } from '#src/modules/partners/application/use-cases/list-financiers.ts';
import { findFinancierByCnpj } from '#src/modules/partners/application/use-cases/find-financier-by-cnpj.ts';

const NOW = new Date('2026-06-01T12:00:00.000Z');
const clock: Clock = { now: () => NOW, today: () => PlainDate.fromDate(NOW) };

let repo: FinancierRepository;
let store: ReturnType<typeof makeInMemoryFinancierStore>;

const validCmd = (cnpj = '11.222.333/0001-81') => ({
  name: 'Fundação Bem Comum',
  corporateName: 'Fundação Bem Comum Assistência LTDA',
  legalRepresentative: 'Maria Silva',
  cnpj,
  telephone: '+5511999998888',
  address: 'Av. Paulista, 1000',
});

beforeEach(() => {
  store = makeInMemoryFinancierStore();
  repo = store.repository;
});

describe('registerFinancier', () => {
  it('persiste e retorna Active + evento', async () => {
    const r = await registerFinancier({ financierRepo: repo, clock })(validCmd());
    assert.equal(isOk(r), true);
    if (r.ok) {
      assert.equal(r.value.financier.status, 'Active');
      assert.equal(r.value.event.type, 'FinancierRegistered');
      const listed = await repo.list();
      if (listed.ok) assert.equal(listed.value.length, 1);
    }
  });

  it('rejeita CNPJ duplicado', async () => {
    await registerFinancier({ financierRepo: repo, clock })(validCmd());
    const dup = await registerFinancier({ financierRepo: repo, clock })(validCmd());
    assert.equal(isErr(dup), true);
    if (!dup.ok) assert.equal(dup.error, 'register-financier-cnpj-duplicate');
  });

  it('rejeita CNPJ inválido', async () => {
    const r = await registerFinancier({ financierRepo: repo, clock })(validCmd('11222333000180'));
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'invalid-cnpj');
  });
});

describe('deactivateFinancier / reactivateFinancier', () => {
  it('desativa um financier existente', async () => {
    const reg = await registerFinancier({ financierRepo: repo, clock })(validCmd());
    assert.equal(isOk(reg), true);
    if (!reg.ok) return;
    const id = reg.value.financier.id as unknown as string;

    const r = await deactivateFinancier({ financierRepo: repo, clock })({ financierId: id });
    assert.equal(isOk(r), true);
    if (r.ok) assert.equal(r.value.financier.status, 'Inactive');
  });

  it('id inexistente → not-found', async () => {
    const r = await deactivateFinancier({ financierRepo: repo, clock })({
      financierId: '7f3a1234-5678-4abc-9def-fedcba987654',
    });
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'deactivate-financier-not-found');
  });

  it('reativa um inativo', async () => {
    const reg = await registerFinancier({ financierRepo: repo, clock })(validCmd());
    if (!reg.ok) return;
    const id = reg.value.financier.id as unknown as string;
    await deactivateFinancier({ financierRepo: repo, clock })({ financierId: id });

    const r = await reactivateFinancier({ financierRepo: repo, clock })({ financierId: id });
    assert.equal(isOk(r), true);
    if (r.ok) assert.equal(r.value.financier.status, 'Active');
  });

  it('rehydrate inválido → erro', async () => {
    const r = await deactivateFinancier({ financierRepo: repo, clock })({ financierId: 'nope' });
    assert.equal(isErr(r), true);
  });
});

describe('queries', () => {
  it('listFinanciers retorna os persistidos', async () => {
    await registerFinancier({ financierRepo: repo, clock })(validCmd());
    const r = await listFinanciers({ financierRepo: repo })();
    assert.equal(isOk(r), true);
    if (r.ok) assert.equal(r.value.length, 1);
  });

  it('findFinancierByCnpj acha por CNPJ e retorna null quando ausente', async () => {
    await registerFinancier({ financierRepo: repo, clock })(validCmd());
    const found = await findFinancierByCnpj({ financierRepo: repo })({ cnpj: '11222333000181' });
    assert.equal(isOk(found), true);
    if (found.ok) assert.notEqual(found.value, null);

    const missing = await findFinancierByCnpj({ financierRepo: repo })({
      cnpj: '04.252.011/0001-10',
    });
    assert.equal(isOk(missing), true);
    if (missing.ok) assert.equal(missing.value, null);
  });
});
