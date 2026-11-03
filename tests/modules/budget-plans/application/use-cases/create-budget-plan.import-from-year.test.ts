/**
 * #1092 — createBudgetPlan com `importFromYear` ("Criar a partir do ano de").
 *
 * Decisão da P.O. (28/10/2026): a origem é a ÚLTIMA VERSÃO APROVADA do plano daquele ano + programa.
 * Critérios de aceite: copia árvore (ativo/inativo), redes e valores mensais; total igual ao da
 * origem; nasce RASCUNHO v1.0 independente; falha no meio não deixa plano parcial; nenhum
 * lançamento descartado em silêncio.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { isOk, isErr, err } from '#src/shared/index.ts';
import * as UserRef from '#src/shared/kernel/user-ref.ts';
import { ProgramRef, PartnerStateRef } from '#src/modules/budget-plans/domain/shared/refs.ts';
import * as BudgetId from '#src/modules/budget-plans/domain/shared/budget-id.ts';
import * as ExerciseMonth from '#src/modules/budget-plans/domain/shared/exercise-month.ts';
import * as CostCenterId from '#src/modules/budget-plans/domain/cost-structure/cost-center-id.ts';
import * as CategoryId from '#src/modules/budget-plans/domain/cost-structure/category-id.ts';
import * as SubcategoryId from '#src/modules/budget-plans/domain/cost-structure/subcategory-id.ts';
import * as BudgetResultId from '#src/modules/budget-plans/domain/budget-result/budget-result-id.ts';
import * as CostStructure from '#src/modules/budget-plans/domain/cost-structure/cost-structure.ts';
import * as BudgetResult from '#src/modules/budget-plans/domain/budget-result/budget-result.ts';
import { BudgetPlan } from '#src/modules/budget-plans/domain/budget-plan/budget-plan.ts';
import type { BudgetPlan as BudgetPlanEntity } from '#src/modules/budget-plans/domain/budget-plan/types.ts';
import * as PlanVersion from '#src/modules/budget-plans/domain/budget-plan/version.ts';
import { createBudgetPlan } from '#src/modules/budget-plans/application/use-cases/create-budget-plan.ts';
import { startCalibration } from '#src/modules/budget-plans/application/use-cases/start-calibration.ts';
import {
  makeDeps,
  createPlanOrFail,
  NOW,
  PROGRAM_ETI_REF,
  PROGRAM_PARC_REF,
  ACTOR_REF,
  type Deps,
} from './_support.ts';

const ACTOR = (() => {
  const r = UserRef.rehydrate(ACTOR_REF);
  assert.ok(isOk(r));
  return r.value;
})();

const month = (n: number): ExerciseMonth.ExerciseMonth => {
  const m = ExerciseMonth.parse(n);
  assert.ok(isOk(m));
  return m.value;
};

// IPCA com índice 0: o valor calculado é exatamente a base — os totais do teste ficam legíveis.
const ipcaResult = (
  budgetId: BudgetId.BudgetId,
  subcategoryId: SubcategoryId.SubcategoryId,
  m: number,
  cents: number,
): BudgetResult.BudgetResult => {
  const r = BudgetResult.create({
    id: BudgetResultId.generate(),
    budgetId,
    subcategoryId,
    month: month(m),
    input: { kind: 'IPCA', baseValueInCents: cents, ipca: 0 },
    subcategoryLaunchType: 'IPCA',
  });
  assert.ok(isOk(r));
  return r.value;
};

// Ordem determinística para comparar listas sem depender da ordem do store.
const byJson = (a: unknown, b: unknown): number =>
  JSON.stringify(a).localeCompare(JSON.stringify(b));

const sumOfPlan = async (deps: Deps, plan: BudgetPlanEntity): Promise<number> => {
  let total = 0;
  for (const b of plan.budgets) {
    const results = await deps.budgetResultRepo.listByBudgetId(b.id);
    assert.ok(isOk(results));
    total += results.value.reduce((acc, r) => acc + r.value.cents, 0);
  }
  return total;
};

// Plano APROVADO de 2025 com 1 rede (CE), árvore cc → cat → {subA ativa, subB INATIVA} e três
// lançamentos mensais: subA em jan e fev, subB em jan. Total 600 + 700 + 50 = 1.350 (centavos).
const seedApprovedSource = async (
  deps: Deps,
  opts: Readonly<{ year?: number; programRef?: string }> = {},
) => {
  const root = await createPlanOrFail(deps, {
    year: opts.year ?? 2025,
    programRef: opts.programRef ?? PROGRAM_ETI_REF,
  });
  const stateRef = PartnerStateRef.rehydrate('CE');
  assert.ok(isOk(stateRef));
  const budgetId = BudgetId.generate();
  const withBudget = BudgetPlan.addBudget(
    root,
    { id: budgetId, partner: { kind: 'state', ref: stateRef.value } },
    NOW,
    ACTOR,
  );
  assert.ok(isOk(withBudget));

  const ccId = CostCenterId.generate();
  const catId = CategoryId.generate();
  const subA = SubcategoryId.generate();
  const subB = SubcategoryId.generate();
  let tree = CostStructure.empty(root.id);
  const steps = [
    (s: typeof tree) =>
      CostStructure.addCostCenter(
        s,
        { id: ccId, name: 'Pessoal', direction: 'A PAGAR' },
        'RASCUNHO',
      ),
    (s: typeof tree) =>
      CostStructure.addCategory(s, { id: catId, costCenterId: ccId, name: 'Salários' }, 'RASCUNHO'),
    (s: typeof tree) =>
      CostStructure.addSubcategory(
        s,
        { id: subA, categoryId: catId, name: 'CLT', launchType: 'IPCA' },
        'RASCUNHO',
      ),
    (s: typeof tree) =>
      CostStructure.addSubcategory(
        s,
        { id: subB, categoryId: catId, name: 'Estágio', launchType: 'IPCA' },
        'RASCUNHO',
      ),
    (s: typeof tree) => CostStructure.setSubcategoryActive(s, subB, false, 'RASCUNHO'),
  ];
  for (const step of steps) {
    const next = step(tree);
    assert.ok(isOk(next));
    tree = next.value;
  }
  assert.ok(isOk(await deps.costStructureRepo.save(tree)));

  for (const r of [
    ipcaResult(budgetId, subA, 1, 600),
    ipcaResult(budgetId, subA, 2, 700),
    ipcaResult(budgetId, subB, 1, 50),
  ]) {
    assert.ok(isOk(await deps.budgetResultRepo.save(r)));
  }

  const approved = BudgetPlan.approve(withBudget.value.plan, NOW, ACTOR);
  assert.ok(isOk(approved));
  assert.ok(isOk(await deps.planRepo.save(approved.value.plan, [])));
  return { plan: approved.value.plan, budgetId, subA, subB };
};

const importInto2026 = (deps: Deps, programRef = PROGRAM_ETI_REF) =>
  createBudgetPlan(deps)({
    year: 2026,
    programRef,
    importFromYear: 2025,
    updatedByRef: ACTOR_REF,
  });

const assertNoPlanIn2026 = async (deps: Deps, programRef = PROGRAM_ETI_REF): Promise<void> => {
  const ref = ProgramRef.rehydrate(programRef);
  assert.ok(isOk(ref));
  const found = await deps.planRepo.findRootByYearAndProgram(2026, ref.value);
  assert.ok(isOk(found));
  assert.equal(found.value, null, 'nenhum plano 2026 pode ficar gravado');
};

describe('createBudgetPlan — importFromYear (#1092)', () => {
  it('copia redes, árvore (com inativo) e lançamentos mensais; total igual ao da origem', async () => {
    const deps = makeDeps();
    const source = await seedApprovedSource(deps);

    const r = await importInto2026(deps);
    assert.ok(isOk(r), JSON.stringify(r));
    const plan = r.value.plan;

    assert.equal(r.value.totalInCents, 1350);
    assert.equal(r.value.totalInCents, await sumOfPlan(deps, source.plan));

    // redes: mesma parceria, id novo
    assert.equal(plan.budgets.length, 1);
    const newBudget = plan.budgets[0];
    assert.ok(newBudget !== undefined);
    assert.notEqual(String(newBudget.id), String(source.budgetId));
    assert.equal(String(newBudget.partner.ref), 'CE');

    // árvore: mesmos nomes, ids novos, subB continua inativa
    const tree = await deps.costStructureRepo.findByBudgetPlanId(plan.id);
    assert.ok(isOk(tree));
    const subs = tree.value.costCenters[0]?.categories[0]?.subcategories ?? [];
    assert.deepEqual(subs.map((s) => [s.name, s.active]).toSorted(byJson), [
      ['CLT', true],
      ['Estágio', false],
    ]);
    const newIds = new Set(subs.map((s) => String(s.id)));
    assert.ok(!newIds.has(String(source.subA)) && !newIds.has(String(source.subB)));

    // lançamentos: mês e valor preservados, apontando para a árvore NOVA
    const results = await deps.budgetResultRepo.listByBudgetId(newBudget.id);
    assert.ok(isOk(results));
    assert.deepEqual(results.value.map((x) => [Number(x.month), x.value.cents]).toSorted(byJson), [
      [1, 50],
      [1, 600],
      [2, 700],
    ]);
    assert.ok(results.value.every((x) => newIds.has(String(x.subcategoryId))));
  });

  it('nasce RASCUNHO, v1.0, raiz, sem cenário — e independente da origem', async () => {
    const deps = makeDeps();
    const source = await seedApprovedSource(deps);

    const r = await importInto2026(deps);
    assert.ok(isOk(r));
    assert.equal(r.value.plan.status, 'RASCUNHO');
    assert.equal(PlanVersion.format(r.value.plan.version), '1.0');
    assert.equal(r.value.plan.parentId, null);
    assert.equal(r.value.plan.scenarioName, null);
    assert.equal(r.value.plan.year, 2026);
    assert.equal(r.value.event.type, 'BudgetPlanCreated');

    // editar o plano novo não altera a origem
    const newBudget = r.value.plan.budgets[0];
    assert.ok(newBudget !== undefined);
    const tree = await deps.costStructureRepo.findByBudgetPlanId(r.value.plan.id);
    assert.ok(isOk(tree));
    const newSub = tree.value.costCenters[0]?.categories[0]?.subcategories.find(
      (s) => s.name === 'CLT',
    );
    assert.ok(newSub !== undefined);
    assert.ok(isOk(await deps.budgetResultRepo.save(ipcaResult(newBudget.id, newSub.id, 1, 9999))));
    assert.equal(await sumOfPlan(deps, source.plan), 1350);
  });

  it('a origem é a ÚLTIMA versão aprovada (calibração aprovada vence a raiz)', async () => {
    const deps = makeDeps();
    const source = await seedApprovedSource(deps);

    // calibração 2.0 da raiz, com um lançamento a mais em março, aprovada
    const calibrated = await startCalibration({ ...deps })({
      parentPlanId: String(source.plan.id),
      updatedByRef: ACTOR_REF,
    });
    assert.ok(isOk(calibrated));
    const child = calibrated.value.plan;
    const childBudget = child.budgets[0];
    assert.ok(childBudget !== undefined);
    const childTree = await deps.costStructureRepo.findByBudgetPlanId(child.id);
    assert.ok(isOk(childTree));
    const childSub = childTree.value.costCenters[0]?.categories[0]?.subcategories.find(
      (s) => s.name === 'CLT',
    );
    assert.ok(childSub !== undefined);
    assert.ok(
      isOk(await deps.budgetResultRepo.save(ipcaResult(childBudget.id, childSub.id, 3, 1000))),
    );
    const approvedChild = BudgetPlan.approve(child, NOW, ACTOR);
    assert.ok(isOk(approvedChild));
    assert.ok(isOk(await deps.planRepo.save(approvedChild.value.plan, [])));

    const r = await importInto2026(deps);
    assert.ok(isOk(r));
    assert.equal(r.value.totalInCents, 2350, 'copiou a calibração (1.350 + 1.000), não a raiz');
  });

  it('ano de origem igual ao ano novo -> budget-plan-import-same-year, nada gravado', async () => {
    const deps = makeDeps();
    await seedApprovedSource(deps, { programRef: PROGRAM_PARC_REF });

    const r = await createBudgetPlan(deps)({
      year: 2026,
      programRef: PROGRAM_ETI_REF,
      importFromYear: 2026,
      updatedByRef: ACTOR_REF,
    });
    assert.ok(isErr(r));
    assert.equal(r.error, 'budget-plan-import-same-year');
    await assertNoPlanIn2026(deps);
  });

  it('origem só em RASCUNHO -> budget-plan-import-source-not-approved, nada gravado', async () => {
    const deps = makeDeps();
    await createPlanOrFail(deps, { year: 2025, programRef: PROGRAM_ETI_REF }); // RASCUNHO

    const r = await importInto2026(deps);
    assert.ok(isErr(r));
    assert.equal(r.error, 'budget-plan-import-source-not-approved');
    await assertNoPlanIn2026(deps);
  });

  it('plano aprovado de OUTRO programa não serve de origem', async () => {
    const deps = makeDeps();
    await seedApprovedSource(deps, { programRef: PROGRAM_ETI_REF });

    const r = await importInto2026(deps, PROGRAM_PARC_REF);
    assert.ok(isErr(r));
    assert.equal(r.error, 'budget-plan-import-source-not-approved');
    await assertNoPlanIn2026(deps, PROGRAM_PARC_REF);
  });

  it('falha na gravação da cópia -> erro e nenhum plano parcial', async () => {
    const deps = makeDeps();
    await seedApprovedSource(deps);

    const r = await createBudgetPlan({
      ...deps,
      planCloneWriter: {
        write: () => Promise.resolve(err('plan-clone-write-unavailable' as const)),
      },
    })({ year: 2026, programRef: PROGRAM_ETI_REF, importFromYear: 2025, updatedByRef: ACTOR_REF });
    assert.ok(isErr(r));
    assert.equal(r.error, 'plan-clone-write-unavailable');
    await assertNoPlanIn2026(deps);
  });

  it('lançamento da origem fora da árvore do plano -> erro nomeado, nada gravado', async () => {
    const deps = makeDeps();
    const source = await seedApprovedSource(deps);
    // Só uma chamada direta à API produz isto (subcategoria de outro plano); a cópia não pode
    // pular o lançamento em silêncio, porque o total sairia menor que o da origem.
    const foreign = ipcaResult(source.budgetId, SubcategoryId.generate(), 4, 10);
    assert.ok(isOk(await deps.budgetResultRepo.save(foreign)));

    const r = await importInto2026(deps);
    assert.ok(isErr(r));
    assert.equal(r.error, 'budget-result-orphan-subcategory');
    await assertNoPlanIn2026(deps);
  });

  it('sem importFromYear continua igual: plano vazio, total 0', async () => {
    const deps = makeDeps();
    await seedApprovedSource(deps);

    const r = await createBudgetPlan(deps)({
      year: 2026,
      programRef: PROGRAM_ETI_REF,
      updatedByRef: ACTOR_REF,
    });
    assert.ok(isOk(r));
    assert.equal(r.value.totalInCents, 0);
    assert.equal(r.value.plan.budgets.length, 0);
  });
});
