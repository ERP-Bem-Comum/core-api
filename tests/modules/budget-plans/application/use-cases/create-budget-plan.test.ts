/**
 * BGP-PLAN-CRUD — W0 (RED) — use case createBudgetPlan (issue #315, CA1/CA2).
 *
 * Invariantes portadas do legado (ERP-BACKEND budget-plans.service):
 * plano raiz único por (year, programRef); programa deve existir e estar ativo;
 * nasce RASCUNHO v1.0 com evento BudgetPlanCreated.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { isOk, isErr } from '#src/shared/index.ts';
import { createBudgetPlan } from '#src/modules/budget-plans/application/use-cases/create-budget-plan.ts';
import * as PlanVersion from '#src/modules/budget-plans/domain/budget-plan/version.ts';
import {
  makeDeps,
  PROGRAM_ETI_REF,
  PROGRAM_PARC_REF,
  PROGRAM_INACTIVE_REF,
  PROGRAM_UNKNOWN_REF,
  ACTOR_REF,
} from './_support.ts';

describe('createBudgetPlan', () => {
  it('CA1: Ano+Programa válidos -> RASCUNHO v1.0 + BudgetPlanCreated + persistido', async () => {
    const deps = makeDeps();
    const r = await createBudgetPlan(deps)({
      year: 2026,
      programRef: PROGRAM_ETI_REF,
      updatedByRef: ACTOR_REF,
    });
    assert.ok(isOk(r));
    assert.equal(r.value.plan.status, 'RASCUNHO');
    assert.equal(PlanVersion.format(r.value.plan.version), '1.0');
    assert.equal(r.value.plan.year, 2026);
    assert.equal(r.value.event.type, 'BudgetPlanCreated');
    assert.equal(r.value.plan.updatedByRef, ACTOR_REF, 'CA6: create seta updatedByRef = criador');

    const found = await deps.planRepo.findById(r.value.plan.id);
    assert.ok(isOk(found));
    assert.ok(found.value !== null);
  });

  it('CA2: plano raiz duplicado (mesmo year+programa) -> budget-plan-already-exists', async () => {
    const deps = makeDeps();
    const first = await createBudgetPlan(deps)({
      year: 2026,
      programRef: PROGRAM_ETI_REF,
      updatedByRef: ACTOR_REF,
    });
    assert.ok(isOk(first));
    const dup = await createBudgetPlan(deps)({
      year: 2026,
      programRef: PROGRAM_ETI_REF,
      updatedByRef: ACTOR_REF,
    });
    assert.ok(isErr(dup));
    assert.equal(dup.error, 'budget-plan-already-exists');
  });

  it('mesmo programa, ano diferente -> permitido', async () => {
    const deps = makeDeps();
    assert.ok(
      isOk(
        await createBudgetPlan(deps)({
          year: 2026,
          programRef: PROGRAM_ETI_REF,
          updatedByRef: ACTOR_REF,
        }),
      ),
    );
    assert.ok(
      isOk(
        await createBudgetPlan(deps)({
          year: 2027,
          programRef: PROGRAM_ETI_REF,
          updatedByRef: ACTOR_REF,
        }),
      ),
    );
  });

  it('mesmo ano, programa diferente -> permitido', async () => {
    const deps = makeDeps();
    assert.ok(
      isOk(
        await createBudgetPlan(deps)({
          year: 2026,
          programRef: PROGRAM_ETI_REF,
          updatedByRef: ACTOR_REF,
        }),
      ),
    );
    assert.ok(
      isOk(
        await createBudgetPlan(deps)({
          year: 2026,
          programRef: PROGRAM_PARC_REF,
          updatedByRef: ACTOR_REF,
        }),
      ),
    );
  });

  it('programa inexistente -> program-not-found', async () => {
    const r = await createBudgetPlan(makeDeps())({
      year: 2026,
      programRef: PROGRAM_UNKNOWN_REF,
      updatedByRef: ACTOR_REF,
    });
    assert.ok(isErr(r));
    assert.equal(r.error, 'program-not-found');
  });

  it('programa inativo -> program-not-active', async () => {
    const r = await createBudgetPlan(makeDeps())({
      year: 2026,
      programRef: PROGRAM_INACTIVE_REF,
      updatedByRef: ACTOR_REF,
    });
    assert.ok(isErr(r));
    assert.equal(r.error, 'program-not-active');
  });

  it('programRef malformado -> budget-plan-ref-invalid', async () => {
    const r = await createBudgetPlan(makeDeps())({
      year: 2026,
      programRef: 'nao-e-uuid',
      updatedByRef: ACTOR_REF,
    });
    assert.ok(isErr(r));
    assert.equal(r.error, 'budget-plan-ref-invalid');
  });

  it('ano inválido -> budget-plan-invalid-year', async () => {
    const r = await createBudgetPlan(makeDeps())({
      year: 1800,
      programRef: PROGRAM_ETI_REF,
      updatedByRef: ACTOR_REF,
    });
    assert.ok(isErr(r));
    assert.equal(r.error, 'budget-plan-invalid-year');
  });
});
