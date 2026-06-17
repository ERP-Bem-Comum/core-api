import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { isOk } from '#src/shared/index.ts';
import type { SupplierViewStore } from '#src/modules/financial/application/ports/supplier-view-store.ts';
import type { SupplierView } from '#src/modules/financial/domain/supplier-view/types.ts';

// Suíte de CONTRATO (test-pyramid-engineer): qualquer adapter de SupplierViewStore (in-memory,
// drizzle) consome esta função e deve passar. NÃO é executada direto (sufixo .suite.ts).
//
// FIN-SUPPLIER-VIEW-SCHEMA · W0 — read-model de fornecedor no financial (US2 #47). Cada caso usa um
// `supplierRef` único (nextRef) → isolamento mesmo num backend compartilhado (MySQL real).

const T0 = new Date('2026-06-16T12:00:00.000Z');
const T1 = new Date('2026-06-16T13:00:00.000Z');

let seq = 0;
const nextRef = (): string => {
  seq += 1;
  return `11111111-1111-4111-8111-${String(seq).padStart(12, '0')}`;
};

const view = (supplierRef: string, over: Partial<SupplierView> = {}): SupplierView => ({
  supplierRef,
  name: 'Gráfica Boa Impressão',
  document: '11222333000181',
  occurredAt: T0,
  ...over,
});

export const supplierViewStoreContract = (makeStore: () => SupplierViewStore): void => {
  describe('SupplierViewStore (contrato)', () => {
    it('get → ok(null) quando o supplierRef é desconhecido', async () => {
      const store = makeStore();
      const r = await store.get(nextRef());
      assert.equal(isOk(r), true);
      if (r.ok) assert.equal(r.value, null);
    });

    it('upsert cria a linha; get retorna o snapshot', async () => {
      const store = makeStore();
      const ref = nextRef();
      const up = await store.upsert(view(ref));
      assert.equal(isOk(up), true);
      const r = await store.get(ref);
      assert.equal(isOk(r), true);
      if (r.ok) {
        assert.notEqual(r.value, null);
        assert.equal(r.value?.name, 'Gráfica Boa Impressão');
        assert.equal(r.value?.document, '11222333000181');
      }
    });

    it('upsert com occurredAt mais NOVO atualiza nome/CNPJ', async () => {
      const store = makeStore();
      const ref = nextRef();
      await store.upsert(view(ref));
      await store.upsert(
        view(ref, {
          name: 'Gráfica Boa Impressão — Filial',
          document: '11444777000161',
          occurredAt: T1,
        }),
      );
      const r = await store.get(ref);
      assert.equal(isOk(r), true);
      if (r.ok) {
        assert.equal(r.value?.name, 'Gráfica Boa Impressão — Filial');
        assert.equal(r.value?.document, '11444777000161');
      }
    });

    it('upsert com occurredAt mais ANTIGO NÃO regride (guard de recência)', async () => {
      const store = makeStore();
      const ref = nextRef();
      await store.upsert(view(ref, { name: 'Novo', document: '11444777000161', occurredAt: T1 }));
      await store.upsert(view(ref, { name: 'Antigo', document: '11222333000181', occurredAt: T0 }));
      const r = await store.get(ref);
      assert.equal(isOk(r), true);
      if (r.ok) {
        assert.equal(r.value?.name, 'Novo');
        assert.equal(r.value?.document, '11444777000161');
      }
    });

    it('upsert do mesmo evento 2× é idempotente (estado final = uma aplicação)', async () => {
      const store = makeStore();
      const ref = nextRef();
      await store.upsert(view(ref));
      await store.upsert(view(ref));
      const r = await store.get(ref);
      assert.equal(isOk(r), true);
      if (r.ok) assert.equal(r.value?.name, 'Gráfica Boa Impressão');
    });
  });
};
