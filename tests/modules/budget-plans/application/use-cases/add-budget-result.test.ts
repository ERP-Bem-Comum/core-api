// BDG-BUDGET-CALC (#317) — W1 RED/GREEN — use case addBudgetResult (US3, CA2).
// Orquestra: valida ids -> confirma existência do orçamento (budgetReader) -> lê launchType da
// subcategoria (subcategoryReader) -> BudgetResult.create -> persiste. Sem FK física (D1/D3 —
// DESIGN-DECISIONS.md): a existência de budgetId/subcategoryId é garantida no fluxo, não no banco.
import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { isOk, isErr } from '#src/shared/index.ts';
import { addBudgetResult } from '#src/modules/budget-plans/application/use-cases/add-budget-result.ts';
import { InMemoryBudgetResultRepository } from '#src/modules/budget-plans/adapters/persistence/repos/budget-result-repository.in-memory.ts';
import { InMemorySubcategoryLaunchTypeReader } from '#src/modules/budget-plans/adapters/persistence/repos/subcategory-launch-type-reader.in-memory.ts';
import { InMemoryBudgetExistsReader } from '#src/modules/budget-plans/adapters/persistence/repos/budget-exists-reader.in-memory.ts';
import * as SubcategoryId from '#src/modules/budget-plans/domain/cost-structure/subcategory-id.ts';
import * as BudgetId from '#src/modules/budget-plans/domain/shared/budget-id.ts';

const UUID_VALIDO = '22222222-2222-4222-8222-222222222222';

describe('addBudgetResult (use case)', () => {
  it('CA2: modelo casa com launchType da subcategoria -> calcula, persiste e devolve', async () => {
    const subId = SubcategoryId.generate();
    const budgetId = BudgetId.generate();
    const store = InMemoryBudgetResultRepository();

    const r = await addBudgetResult({
      budgetResultRepo: store.repo,
      subcategoryReader: InMemorySubcategoryLaunchTypeReader({ [String(subId)]: 'IPCA' }),
      budgetReader: InMemoryBudgetExistsReader([String(budgetId)]),
    })({
      budgetId: String(budgetId),
      subcategoryId: String(subId),
      month: 1,
      input: { kind: 'IPCA', baseValueInCents: 100000, ipca: 4.5 },
    });

    assert.ok(isOk(r));
    assert.equal(r.value.value.cents, 104500);
    assert.equal(store.all().length, 1);
  });

  it('CA2: modelo diverge do launchType da subcategoria -> calc-model-mismatch (não persiste)', async () => {
    const subId = SubcategoryId.generate();
    const budgetId = BudgetId.generate();
    const store = InMemoryBudgetResultRepository();

    const r = await addBudgetResult({
      budgetResultRepo: store.repo,
      subcategoryReader: InMemorySubcategoryLaunchTypeReader({
        [String(subId)]: 'DESPESAS_PESSOAIS',
      }),
      budgetReader: InMemoryBudgetExistsReader([String(budgetId)]),
    })({
      budgetId: String(budgetId),
      subcategoryId: String(subId),
      month: 1,
      input: { kind: 'CAED', numberOfEnrollments: 30, baseValueInCents: 5000 },
    });

    assert.ok(isErr(r));
    assert.equal(r.error, 'calc-model-mismatch');
    assert.equal(store.all().length, 0);
  });

  it('orçamento ausente -> budget-not-found (D3: valida existência sem FK)', async () => {
    const store = InMemoryBudgetResultRepository();
    const r = await addBudgetResult({
      budgetResultRepo: store.repo,
      subcategoryReader: InMemorySubcategoryLaunchTypeReader({ [UUID_VALIDO]: 'IPCA' }),
      budgetReader: InMemoryBudgetExistsReader([]), // nenhum orçamento existe
    })({
      budgetId: String(BudgetId.generate()),
      subcategoryId: UUID_VALIDO,
      month: 1,
      input: { kind: 'IPCA', baseValueInCents: 100000, ipca: 4.5 },
    });
    assert.ok(isErr(r));
    assert.equal(r.error, 'budget-not-found');
    assert.equal(store.all().length, 0);
  });

  it('subcategoria ausente -> subcategory-not-found', async () => {
    const budgetId = BudgetId.generate();
    const store = InMemoryBudgetResultRepository();
    const r = await addBudgetResult({
      budgetResultRepo: store.repo,
      subcategoryReader: InMemorySubcategoryLaunchTypeReader({}),
      budgetReader: InMemoryBudgetExistsReader([String(budgetId)]),
    })({
      budgetId: String(budgetId),
      subcategoryId: UUID_VALIDO,
      month: 1,
      input: { kind: 'IPCA', baseValueInCents: 100000, ipca: 4.5 },
    });
    assert.ok(isErr(r));
    assert.equal(r.error, 'subcategory-not-found');
  });

  it('budgetId malformado -> budget-id-invalid (não toca os ports)', async () => {
    const store = InMemoryBudgetResultRepository();
    const r = await addBudgetResult({
      budgetResultRepo: store.repo,
      subcategoryReader: InMemorySubcategoryLaunchTypeReader({}),
      budgetReader: InMemoryBudgetExistsReader([]),
    })({
      budgetId: 'nao-e-uuid',
      subcategoryId: UUID_VALIDO,
      month: 1,
      input: { kind: 'IPCA', baseValueInCents: 100000, ipca: 4.5 },
    });
    assert.ok(isErr(r));
    assert.equal(r.error, 'budget-id-invalid');
  });
});
