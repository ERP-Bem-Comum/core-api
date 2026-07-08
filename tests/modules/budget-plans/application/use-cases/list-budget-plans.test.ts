/**
 * BGP-PLAN-CRUD — W0 (RED) — use case listBudgetPlans (issue #315, CA3).
 *
 * Lista planos raiz com status/programa (nome resolvido via catálogo)/ano/
 * versão formatada/total em centavos, com filtros year/status/programRef.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { isOk } from '#src/shared/index.ts';
import { listBudgetPlans } from '#src/modules/budget-plans/application/use-cases/list-budget-plans.ts';
import { makeDeps, createPlanOrFail, PROGRAM_ETI_REF, PROGRAM_PARC_REF } from './_support.ts';

const baseQuery = { page: 1, limit: 20 } as const;

describe('listBudgetPlans', () => {
  it('CA3: retorna status/programName/ano/versão/totalInCents de cada plano', async () => {
    const deps = makeDeps();
    await createPlanOrFail(deps, { year: 2026, programRef: PROGRAM_ETI_REF });

    const r = await listBudgetPlans(deps)(baseQuery);
    assert.ok(isOk(r));
    assert.equal(r.value.total, 1);
    const item = r.value.items[0];
    assert.ok(item);
    assert.equal(typeof item.id, 'string');
    assert.equal(item.year, 2026);
    assert.equal(item.status, 'RASCUNHO');
    assert.equal(item.version, '1.0');
    assert.equal(item.programName, 'Ensino em Tempo Integral');
    assert.equal(item.totalInCents, 0);
  });

  it('filtra por year', async () => {
    const deps = makeDeps();
    await createPlanOrFail(deps, { year: 2026, programRef: PROGRAM_ETI_REF });
    await createPlanOrFail(deps, { year: 2027, programRef: PROGRAM_ETI_REF });

    const r = await listBudgetPlans(deps)({ ...baseQuery, year: 2027 });
    assert.ok(isOk(r));
    assert.equal(r.value.total, 1);
    assert.equal(r.value.items[0]?.year, 2027);
  });

  it('filtra por programRef', async () => {
    const deps = makeDeps();
    await createPlanOrFail(deps, { year: 2026, programRef: PROGRAM_ETI_REF });
    await createPlanOrFail(deps, { year: 2026, programRef: PROGRAM_PARC_REF });

    const r = await listBudgetPlans(deps)({ ...baseQuery, programRef: PROGRAM_PARC_REF });
    assert.ok(isOk(r));
    assert.equal(r.value.total, 1);
    assert.equal(r.value.items[0]?.programName, 'Parceiros');
  });

  it('filtra por status (RASCUNHO cobre todos os recém-criados)', async () => {
    const deps = makeDeps();
    await createPlanOrFail(deps, { year: 2026, programRef: PROGRAM_ETI_REF });

    const draft = await listBudgetPlans(deps)({ ...baseQuery, status: 'RASCUNHO' });
    assert.ok(isOk(draft));
    assert.equal(draft.value.total, 1);

    const approved = await listBudgetPlans(deps)({ ...baseQuery, status: 'APROVADO' });
    assert.ok(isOk(approved));
    assert.equal(approved.value.total, 0);
  });

  it('lista vazia -> items [] e total 0', async () => {
    const r = await listBudgetPlans(makeDeps())(baseQuery);
    assert.ok(isOk(r));
    assert.deepEqual(r.value.items, []);
    assert.equal(r.value.total, 0);
  });
});
