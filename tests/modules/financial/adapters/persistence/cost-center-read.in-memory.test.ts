import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

// W0 RED (020 · US2): o read store in-memory ainda não existe.
// `CostCenterReadPort.list()` (data-model.md:41) retorna só `active=true`, ordenado por `code`.
import * as CostCenter from '#src/modules/financial/domain/cost-center/cost-center.ts';
import * as CostCenterId from '#src/modules/financial/domain/cost-center/cost-center-id.ts';
import { createInMemoryCostCenterReadStore } from '#src/modules/financial/adapters/persistence/repos/cost-center-read.in-memory.ts';

const mk = (code: string, name: string, active: boolean): CostCenter.CostCenter => {
  const r = CostCenter.create({ id: CostCenterId.generate(), code, name, active });
  if (!r.ok) throw new Error(`fixture inválida: ${r.error}`);
  return r.value;
};

describe('financial/adapters — cost-center-read in-memory', () => {
  it('list() omite inativos e mantém os ativos (FR-006/007)', async () => {
    const store = createInMemoryCostCenterReadStore([
      mk('CC-001', 'Administrativo', true),
      mk('CC-002', 'Programa Saúde', false),
      mk('CC-003', 'Programa Educação', true),
    ]);
    const r = await store.list();
    assert.equal(r.ok, true);
    if (r.ok) {
      assert.equal(r.value.length, 2);
      assert.equal(
        r.value.every((c) => c.active),
        true,
      );
    }
  });

  it('list() ordena por code — determinístico (FR-004)', async () => {
    const store = createInMemoryCostCenterReadStore([
      mk('CC-003', 'Programa Educação', true),
      mk('CC-001', 'Administrativo', true),
      mk('CC-002', 'Programa Saúde', true),
    ]);
    const r = await store.list();
    assert.equal(r.ok, true);
    if (r.ok) {
      assert.deepEqual(
        r.value.map((c) => c.code),
        ['CC-001', 'CC-002', 'CC-003'],
      );
    }
  });

  it('lista vazia → ok([]) sem erro (FR-007)', async () => {
    const store = createInMemoryCostCenterReadStore([]);
    const r = await store.list();
    assert.equal(r.ok, true);
    if (r.ok) assert.deepEqual(r.value, []);
  });
});
