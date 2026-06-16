import { describe, it, beforeEach } from 'node:test';
import { strict as assert } from 'node:assert';

import { isErr, isOk } from '#src/shared/index.ts';
import type { Clock } from '#src/shared/ports/clock.ts';
import * as PlainDate from '#src/shared/kernel/plain-date.ts';
import { makeInMemorySupplierStore } from '#src/modules/partners/adapters/persistence/repos/supplier-repository.in-memory.ts';
import type { SupplierRepository } from '#src/modules/partners/domain/supplier/repository.ts';
import { registerSupplier } from '#src/modules/partners/application/use-cases/register-supplier.ts';
import { deactivateSupplier } from '#src/modules/partners/application/use-cases/deactivate-supplier.ts';
import { reactivateSupplier } from '#src/modules/partners/application/use-cases/reactivate-supplier.ts';
import { listSuppliers } from '#src/modules/partners/application/use-cases/list-suppliers.ts';
import { findSupplierByCnpj } from '#src/modules/partners/application/use-cases/find-supplier-by-cnpj.ts';

const NOW = new Date('2026-06-01T12:00:00.000Z');
const clock: Clock = { now: () => NOW, today: () => PlainDate.fromDate(NOW) };

let repo: SupplierRepository;
let store: ReturnType<typeof makeInMemorySupplierStore>;

const validCmd = (cnpj = '11.222.333/0001-81') => ({
  name: 'Gráfica Boa Impressão',
  email: 'contato@boaimpressao.com.br',
  cnpj,
  corporateName: 'Boa Impressão Gráfica LTDA',
  fantasyName: 'Boa Impressão',
  serviceCategory: 'GRAFICA',
  bankAccount: {
    bank: '001',
    agency: '1234',
    accountNumber: '56789',
    checkDigit: '0',
  },
  pixKey: null,
});

beforeEach(() => {
  store = makeInMemorySupplierStore();
  repo = store.repository;
});

describe('registerSupplier', () => {
  it('persiste e retorna Active + evento', async () => {
    const r = await registerSupplier({ supplierRepo: repo, clock })(validCmd());
    assert.equal(isOk(r), true);
    if (r.ok) {
      assert.equal(r.value.supplier.status, 'Active');
      assert.equal(r.value.event.type, 'SupplierRegistered');
      const listed = await repo.list();
      if (listed.ok) assert.equal(listed.value.length, 1);
    }
  });

  it('aceita pixKey como destino de pagamento', async () => {
    const cmd = {
      ...validCmd(),
      bankAccount: null,
      pixKey: { keyType: 'email', key: 'pix@boaimpressao.com.br' },
    };
    const r = await registerSupplier({ supplierRepo: repo, clock })(cmd);
    assert.equal(isOk(r), true);
  });

  it('rejeita CNPJ duplicado', async () => {
    await registerSupplier({ supplierRepo: repo, clock })(validCmd());
    const dup = await registerSupplier({ supplierRepo: repo, clock })(validCmd());
    assert.equal(isErr(dup), true);
    if (!dup.ok) assert.equal(dup.error, 'register-supplier-cnpj-duplicate');
  });

  it('rejeita CNPJ inválido', async () => {
    const r = await registerSupplier({ supplierRepo: repo, clock })(validCmd('11222333000180'));
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'invalid-cnpj');
  });

  it('rejeita sem destino de pagamento (nem bankAccount nem pixKey)', async () => {
    const r = await registerSupplier({ supplierRepo: repo, clock })({
      ...validCmd(),
      bankAccount: null,
      pixKey: null,
    });
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'supplier-payment-target-required');
  });

  it('rejeita email inválido', async () => {
    const r = await registerSupplier({ supplierRepo: repo, clock })({
      ...validCmd(),
      email: 'sem-arroba',
    });
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'supplier-email-invalid');
  });

  it('rejeita serviceCategory desconhecida', async () => {
    const r = await registerSupplier({ supplierRepo: repo, clock })({
      ...validCmd(),
      serviceCategory: 'CATEGORIA_QUE_NAO_EXISTE',
    });
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'invalid-service-category');
  });
});

describe('deactivateSupplier / reactivateSupplier', () => {
  it('desativa um supplier existente', async () => {
    const reg = await registerSupplier({ supplierRepo: repo, clock })(validCmd());
    assert.equal(isOk(reg), true);
    if (!reg.ok) return;
    const id = reg.value.supplier.id as unknown as string;

    const r = await deactivateSupplier({ supplierRepo: repo, clock })({ supplierId: id });
    assert.equal(isOk(r), true);
    if (r.ok) assert.equal(r.value.supplier.status, 'Inactive');
  });

  it('id inexistente → not-found', async () => {
    const r = await deactivateSupplier({ supplierRepo: repo, clock })({
      supplierId: '7f3a1234-5678-4abc-9def-fedcba987654',
    });
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'deactivate-supplier-not-found');
  });

  it('reativa um inativo', async () => {
    const reg = await registerSupplier({ supplierRepo: repo, clock })(validCmd());
    if (!reg.ok) return;
    const id = reg.value.supplier.id as unknown as string;
    await deactivateSupplier({ supplierRepo: repo, clock })({ supplierId: id });

    const r = await reactivateSupplier({ supplierRepo: repo, clock })({ supplierId: id });
    assert.equal(isOk(r), true);
    if (r.ok) assert.equal(r.value.supplier.status, 'Active');
  });

  it('reativar já ativo → supplier-already-active', async () => {
    const reg = await registerSupplier({ supplierRepo: repo, clock })(validCmd());
    if (!reg.ok) return;
    const id = reg.value.supplier.id as unknown as string;

    const r = await reactivateSupplier({ supplierRepo: repo, clock })({ supplierId: id });
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'supplier-already-active');
  });

  it('rehydrate inválido → erro', async () => {
    const r = await deactivateSupplier({ supplierRepo: repo, clock })({ supplierId: 'nope' });
    assert.equal(isErr(r), true);
  });
});

describe('queries', () => {
  it('listSuppliers retorna os persistidos', async () => {
    await registerSupplier({ supplierRepo: repo, clock })(validCmd());
    const r = await listSuppliers({ supplierRepo: repo })();
    assert.equal(isOk(r), true);
    if (r.ok) assert.equal(r.value.length, 1);
  });

  it('findSupplierByCnpj acha por CNPJ e retorna null quando ausente', async () => {
    await registerSupplier({ supplierRepo: repo, clock })(validCmd());
    const found = await findSupplierByCnpj({ supplierRepo: repo })({ cnpj: '11222333000181' });
    assert.equal(isOk(found), true);
    if (found.ok) assert.notEqual(found.value, null);

    const missing = await findSupplierByCnpj({ supplierRepo: repo })({
      cnpj: '04.252.011/0001-10',
    });
    assert.equal(isOk(missing), true);
    if (missing.ok) assert.equal(missing.value, null);
  });
});

describe('adapter InMemory', () => {
  it('save recusa CNPJ duplicado com id diferente', async () => {
    const reg = await registerSupplier({ supplierRepo: repo, clock })(validCmd());
    if (!reg.ok) return;
    const clone = { ...reg.value.supplier, id: '00000000-0000-4000-8000-000000000000' };
    const saved = await repo.save(clone as typeof reg.value.supplier, []);
    assert.equal(isErr(saved), true);
    if (!saved.ok) assert.equal(saved.error, 'supplier-cnpj-duplicate');
  });
});
