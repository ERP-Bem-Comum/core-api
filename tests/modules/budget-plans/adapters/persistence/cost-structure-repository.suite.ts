import { describe, it, beforeEach, afterEach } from 'node:test';
import { strict as assert } from 'node:assert';

import { isOk, isErr } from '#src/shared/primitives/result.ts';
import type { BudgetPlanId } from '#src/modules/budget-plans/domain/shared/budget-plan-id.ts';
import { generate as generateBudgetPlanId } from '#src/modules/budget-plans/domain/shared/budget-plan-id.ts';
import * as CostCenterId from '#src/modules/budget-plans/domain/cost-structure/cost-center-id.ts';
import * as CategoryId from '#src/modules/budget-plans/domain/cost-structure/category-id.ts';
import * as SubcategoryId from '#src/modules/budget-plans/domain/cost-structure/subcategory-id.ts';
import {
  empty,
  addCostCenter,
  addCategory,
  addSubcategory,
} from '#src/modules/budget-plans/domain/cost-structure/cost-structure.ts';
import type {
  CostStructure,
  CostCenter,
  Category,
  Subcategory,
} from '#src/modules/budget-plans/domain/cost-structure/types.ts';
import type { CostStructureRepository } from '#src/modules/budget-plans/domain/cost-structure/repository.ts';

// A factory entrega um repo pronto + um budgetPlanId JÁ semeado no store de apoio
// (no Drizzle a linha `bgp_budget_plans` precisa existir p/ satisfazer a FK; no
// in-memory basta gerar). Assim a suíte fica agnóstica ao backend.
export interface CostStructureRepoFactory {
  make: () => Promise<{
    repo: CostStructureRepository;
    budgetPlanId: BudgetPlanId;
    teardown?: () => Promise<void>;
  }>;
}

// Reconstrução por 3 SELECTs no Drizzle não garante ordem — comparação order-insensitive.
const sortById = <T extends { id: { toString: () => string } }>(xs: readonly T[]): T[] =>
  [...xs].toSorted((a, b) => String(a.id).localeCompare(String(b.id)));

const normalize = (s: CostStructure): unknown => ({
  budgetPlanId: String(s.budgetPlanId),
  costCenters: sortById(s.costCenters).map((cc: CostCenter) => ({
    id: String(cc.id),
    name: cc.name,
    direction: cc.direction,
    categories: sortById(cc.categories).map((cat: Category) => ({
      id: String(cat.id),
      name: cat.name,
      subcategories: sortById(cat.subcategories).map((sub: Subcategory) => ({
        id: String(sub.id),
        name: sub.name,
        launchType: sub.launchType,
      })),
    })),
  })),
});

export const runCostStructureRepositoryContract = (
  label: string,
  factory: CostStructureRepoFactory,
): void => {
  describe(`CostStructureRepository contract — ${label}`, () => {
    let repo: CostStructureRepository;
    let budgetPlanId: BudgetPlanId;
    let teardown: (() => Promise<void>) | undefined;

    beforeEach(async () => {
      const built = await factory.make();
      repo = built.repo;
      budgetPlanId = built.budgetPlanId;
      teardown = built.teardown;
    });

    afterEach(async () => {
      if (teardown) await teardown();
    });

    // Constrói uma árvore de 3 níveis pelas ops puras do domínio.
    const buildTree = (planId: BudgetPlanId): CostStructure => {
      let s = empty(planId);

      const ccId = CostCenterId.generate();
      const r1 = addCostCenter(s, { id: ccId, name: 'Pessoal', direction: 'A PAGAR' }, 'RASCUNHO');
      assert.ok(isOk(r1));
      s = r1.value;

      const catId = CategoryId.generate();
      const r2 = addCategory(s, { id: catId, costCenterId: ccId, name: 'Salários' }, 'RASCUNHO');
      assert.ok(isOk(r2));
      s = r2.value;

      const r3 = addSubcategory(
        s,
        { id: SubcategoryId.generate(), categoryId: catId, name: 'CLT', launchType: 'IPCA' },
        'RASCUNHO',
      );
      assert.ok(isOk(r3));
      s = r3.value;

      return s;
    };

    it('save + findByBudgetPlanId faz round-trip de uma árvore de 3 níveis', async () => {
      const tree = buildTree(budgetPlanId);

      const saved = await repo.save(tree);
      assert.ok(isOk(saved));

      const found = await repo.findByBudgetPlanId(budgetPlanId);
      assert.ok(isOk(found));
      assert.deepEqual(normalize(found.value), normalize(tree));
    });

    it('findByBudgetPlanId de plano sem nós retorna árvore vazia (não erro, não null)', async () => {
      const found = await repo.findByBudgetPlanId(budgetPlanId);
      assert.ok(isOk(found));
      assert.equal(String(found.value.budgetPlanId), String(budgetPlanId));
      assert.deepEqual(found.value.costCenters, []);
    });

    it('preserva agrupamento com múltiplos cost-centers/categories/subcategories', async () => {
      let s = empty(budgetPlanId);

      const ccPagar = CostCenterId.generate();
      const ccReceber = CostCenterId.generate();
      s = (() => {
        const a = addCostCenter(
          s,
          { id: ccPagar, name: 'Despesas', direction: 'A PAGAR' },
          'RASCUNHO',
        );
        assert.ok(isOk(a));
        const b = addCostCenter(
          a.value,
          { id: ccReceber, name: 'Receitas', direction: 'A RECEBER' },
          'RASCUNHO',
        );
        assert.ok(isOk(b));
        return b.value;
      })();

      const catA = CategoryId.generate();
      const catB = CategoryId.generate();
      s = (() => {
        const a = addCategory(
          s,
          { id: catA, costCenterId: ccPagar, name: 'Logística' },
          'RASCUNHO',
        );
        assert.ok(isOk(a));
        const b = addCategory(
          a.value,
          { id: catB, costCenterId: ccPagar, name: 'Pessoal' },
          'RASCUNHO',
        );
        assert.ok(isOk(b));
        return b.value;
      })();

      s = (() => {
        const a = addSubcategory(
          s,
          {
            id: SubcategoryId.generate(),
            categoryId: catA,
            name: 'Frete',
            launchType: 'DESPESAS_LOGISTICAS',
          },
          'RASCUNHO',
        );
        assert.ok(isOk(a));
        const b = addSubcategory(
          a.value,
          {
            id: SubcategoryId.generate(),
            categoryId: catB,
            name: 'Diária',
            launchType: 'DESPESAS_PESSOAIS',
          },
          'RASCUNHO',
        );
        assert.ok(isOk(b));
        return b.value;
      })();

      assert.ok(isOk(await repo.save(s)));

      const found = await repo.findByBudgetPlanId(budgetPlanId);
      assert.ok(isOk(found));
      assert.deepEqual(normalize(found.value), normalize(s));

      // Sanidade do agrupamento: cada cost-center guarda suas próprias categorias.
      const pagar = found.value.costCenters.find((cc) => String(cc.id) === String(ccPagar));
      const receber = found.value.costCenters.find((cc) => String(cc.id) === String(ccReceber));
      assert.ok(pagar !== undefined);
      assert.ok(receber !== undefined);
      assert.equal(pagar.categories.length, 2);
      assert.equal(receber.categories.length, 0);
    });

    it('save substitui a árvore inteira (replace-all)', async () => {
      assert.ok(isOk(await repo.save(buildTree(budgetPlanId))));

      // Segunda árvore, totalmente diferente.
      let s2 = empty(budgetPlanId);
      const ccId = CostCenterId.generate();
      const r1 = addCostCenter(
        s2,
        { id: ccId, name: 'Nova Raiz', direction: 'A RECEBER' },
        'RASCUNHO',
      );
      assert.ok(isOk(r1));
      s2 = r1.value;

      assert.ok(isOk(await repo.save(s2)));

      const found = await repo.findByBudgetPlanId(budgetPlanId);
      assert.ok(isOk(found));
      assert.equal(found.value.costCenters.length, 1);
      assert.equal(String(found.value.costCenters[0]?.id), String(ccId));
      assert.equal(found.value.costCenters[0]?.direction, 'A RECEBER');
      assert.equal(found.value.costCenters[0]?.categories.length, 0);
    });

    // --- W1-B (RED): escrita ATÔMICA guardada por status (`mutate`) ---------------------
    // Fecha a flag Q4/TOCTOU: leitura do status + reescrita da árvore no MESMO commit.

    it('mutate aplica a op de domínio e persiste (plano editável)', async () => {
      const ccId = CostCenterId.generate();
      const applied = await repo.mutate(budgetPlanId, (s, status) =>
        addCostCenter(s, { id: ccId, name: 'Pessoal', direction: 'A PAGAR' }, status),
      );
      assert.ok(isOk(applied));
      assert.equal(applied.value.costCenters.length, 1);

      const found = await repo.findByBudgetPlanId(budgetPlanId);
      assert.ok(isOk(found));
      assert.equal(found.value.costCenters.length, 1);
      assert.equal(String(found.value.costCenters[0]?.id), String(ccId));
    });

    it('mutate NÃO persiste quando a op de domínio falha (erro devolvido, sem escrita)', async () => {
      const bad = await repo.mutate(budgetPlanId, (s, status) =>
        addCostCenter(
          s,
          { id: CostCenterId.generate(), name: '   ', direction: 'A PAGAR' },
          status,
        ),
      );
      assert.ok(isErr(bad));
      assert.equal(bad.error, 'cost-node-name-required');

      const found = await repo.findByBudgetPlanId(budgetPlanId);
      assert.ok(isOk(found));
      assert.deepEqual(found.value.costCenters, []);
    });

    it('mutate em plano ausente -> budget-plan-not-found', async () => {
      const ausente = generateBudgetPlanId();
      const r = await repo.mutate(ausente, (s, status) =>
        addCostCenter(s, { id: CostCenterId.generate(), name: 'X', direction: 'A PAGAR' }, status),
      );
      assert.ok(isErr(r));
      assert.equal(r.error, 'budget-plan-not-found');
    });
  });
};
