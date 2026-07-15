// BDG-BUDGET-CALC (#317) + BGP-MONTH-PERSIST (#413) — suíte parametrizada do
// BudgetResultRepository. Roda contra o adapter in-memory e o Drizzle/MySQL (paridade de
// comportamento — CA9). Verifica round-trip (save+list), isolamento por orçamento (CA3 do #317),
// delete por orçamento (CA4 do #317) e, desde o #413, a dimensão mês + o upsert idempotente.
// Backend-agnóstica.
import { describe, it, beforeEach, afterEach } from 'node:test';
import { strict as assert } from 'node:assert';

import { isOk } from '#src/shared/primitives/result.ts';
import * as BudgetIdMod from '#src/modules/budget-plans/domain/shared/budget-id.ts';
import type { BudgetId } from '#src/modules/budget-plans/domain/shared/budget-id.ts';
import * as SubcategoryId from '#src/modules/budget-plans/domain/cost-structure/subcategory-id.ts';
import type { SubcategoryId as SubcategoryIdType } from '#src/modules/budget-plans/domain/cost-structure/subcategory-id.ts';
import * as BudgetResultId from '#src/modules/budget-plans/domain/budget-result/budget-result-id.ts';
import * as BudgetResult from '#src/modules/budget-plans/domain/budget-result/budget-result.ts';
import * as ExerciseMonth from '#src/modules/budget-plans/domain/shared/exercise-month.ts';
import type { CalcModelInput } from '#src/modules/budget-plans/domain/budget-result/calc-model.ts';
import type { LaunchType } from '#src/modules/budget-plans/domain/cost-structure/launch-type.ts';
import type { BudgetResultRepository } from '#src/modules/budget-plans/domain/budget-result/repository.ts';

export interface BudgetResultRepoFactory {
  make: () => Promise<{ repo: BudgetResultRepository; teardown?: () => Promise<void> }>;
}

const IPCA_INPUT: CalcModelInput = { kind: 'IPCA', baseValueInCents: 100000, ipca: 4.5 }; // -> 104500

// Fixture: o VO tem suíte própria; aqui um mês inválido é erro de teste, não de domínio.
const month = (raw: number) => {
  const m = ExerciseMonth.parse(raw);
  assert.ok(isOk(m), `fixture inválida: mês ${raw}`);
  return m.value;
};

const makeResult = (
  budgetId: BudgetId,
  launchType: LaunchType,
  input: CalcModelInput,
  rawMonth = 1,
  subcategoryId: SubcategoryIdType = SubcategoryId.generate(),
) => {
  const r = BudgetResult.create({
    id: BudgetResultId.generate(),
    budgetId,
    subcategoryId,
    month: month(rawMonth),
    input,
    subcategoryLaunchType: launchType,
  });
  assert.ok(isOk(r));
  return r.value;
};

export const runBudgetResultRepositoryContract = (
  label: string,
  factory: BudgetResultRepoFactory,
): void => {
  describe(`BudgetResultRepository contract — ${label}`, () => {
    let repo: BudgetResultRepository;
    let teardown: (() => Promise<void>) | undefined;

    beforeEach(async () => {
      const built = await factory.make();
      repo = built.repo;
      teardown = built.teardown;
    });

    afterEach(async () => {
      if (teardown) await teardown();
    });

    it('save + listByBudgetId: round-trip preserva value cents, model e mês', async () => {
      const budgetId = BudgetIdMod.generate();
      const res = makeResult(budgetId, 'IPCA', IPCA_INPUT, 5);
      assert.ok(isOk(await repo.save(res)));

      const list = await repo.listByBudgetId(budgetId);
      assert.ok(isOk(list));
      assert.equal(list.value.length, 1);
      assert.equal(String(list.value[0]?.id), String(res.id));
      assert.equal(list.value[0]?.model, 'IPCA');
      assert.equal(list.value[0]?.value.cents, 104500);
      assert.equal(list.value[0]?.month, 5);
    });

    it('CA3 (#317): listByBudgetId isola por orçamento', async () => {
      const b1 = BudgetIdMod.generate();
      const b2 = BudgetIdMod.generate();
      assert.ok(isOk(await repo.save(makeResult(b1, 'IPCA', IPCA_INPUT))));
      assert.ok(
        isOk(
          await repo.save(
            makeResult(b2, 'CAED', {
              kind: 'CAED',
              numberOfEnrollments: 30,
              baseValueInCents: 5000,
            }),
          ),
        ),
      );

      const l1 = await repo.listByBudgetId(b1);
      assert.ok(isOk(l1));
      assert.equal(l1.value.length, 1);
      assert.equal(l1.value[0]?.model, 'IPCA');
    });

    it('CA4 (#317): deleteByBudgetId remove só os resultados do orçamento alvo', async () => {
      const b1 = BudgetIdMod.generate();
      const b2 = BudgetIdMod.generate();
      assert.ok(isOk(await repo.save(makeResult(b1, 'IPCA', IPCA_INPUT))));
      assert.ok(isOk(await repo.save(makeResult(b2, 'IPCA', IPCA_INPUT))));

      assert.ok(isOk(await repo.deleteByBudgetId(b1)));

      const l1 = await repo.listByBudgetId(b1);
      assert.ok(isOk(l1));
      assert.equal(l1.value.length, 0);
      const l2 = await repo.listByBudgetId(b2);
      assert.ok(isOk(l2));
      assert.equal(l2.value.length, 1);
    });

    it('listByBudgetId sem resultados -> lista vazia', async () => {
      const list = await repo.listByBudgetId(BudgetIdMod.generate());
      assert.ok(isOk(list));
      assert.equal(list.value.length, 0);
    });

    // ─── #413: dimensão mês + upsert idempotente ────────────────────────────────

    // CA2 — o coração desta fatia. ANTES do #413 o repo fazia INSERT puro sem UNIQUE: recalcular
    // gravava linha duplicada e o total por Rede contava EM DOBRO. Este teste trava o defeito.
    it('CA2: recalcular o mesmo (budget, subcategoria, mês) ATUALIZA — não duplica', async () => {
      const budgetId = BudgetIdMod.generate();
      const subcategoryId = SubcategoryId.generate();

      const primeiro = makeResult(budgetId, 'IPCA', IPCA_INPUT, 3, subcategoryId);
      assert.ok(isOk(await repo.save(primeiro)));

      // mesmo alvo, outro valor de entrada -> 250000 * 1.0 = 250000
      const recalculo = makeResult(
        budgetId,
        'IPCA',
        { kind: 'IPCA', baseValueInCents: 250000, ipca: 0 },
        3,
        subcategoryId,
      );
      assert.ok(isOk(await repo.save(recalculo)));

      const list = await repo.listByBudgetId(budgetId);
      assert.ok(isOk(list));
      assert.equal(list.value.length, 1, 'recálculo deve atualizar, não inserir 2ª linha');
      assert.equal(list.value[0]?.value.cents, 250000);
      assert.equal(list.value[0]?.month, 3);
      // o id da linha existente é preservado — o upsert não troca a identidade da linha
      assert.equal(String(list.value[0]?.id), String(primeiro.id));
    });

    it('CA1/CA3: os 12 meses da mesma conta coexistem e somam o anual (3.670,92 × 12)', async () => {
      const budgetId = BudgetIdMod.generate();
      const subcategoryId = SubcategoryId.generate();

      for (const m of [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]) {
        const res = makeResult(
          budgetId,
          'IPCA',
          { kind: 'IPCA', baseValueInCents: 367092, ipca: 0 },
          m,
          subcategoryId,
        );
        assert.ok(isOk(await repo.save(res)));
      }

      const list = await repo.listByBudgetId(budgetId);
      assert.ok(isOk(list));
      assert.equal(list.value.length, 12);

      const anual = list.value.reduce((acc, r) => acc + r.value.cents, 0);
      assert.equal(anual, 4405104, 'anual = soma dos 12 meses (prova da P.O., #454)');

      const meses = list.value.map((r) => r.month).sort((a, b) => a - b);
      assert.deepEqual(meses, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
    });

    it('alterar um mês não afeta os demais (FR-004)', async () => {
      const budgetId = BudgetIdMod.generate();
      const subcategoryId = SubcategoryId.generate();

      for (const m of [2, 3, 4]) {
        assert.ok(
          isOk(await repo.save(makeResult(budgetId, 'IPCA', IPCA_INPUT, m, subcategoryId))),
        );
      }

      // só março muda
      assert.ok(
        isOk(
          await repo.save(
            makeResult(
              budgetId,
              'IPCA',
              { kind: 'IPCA', baseValueInCents: 999900, ipca: 0 },
              3,
              subcategoryId,
            ),
          ),
        ),
      );

      const list = await repo.listByBudgetId(budgetId);
      assert.ok(isOk(list));
      assert.equal(list.value.length, 3);

      const byMonth = new Map(list.value.map((r) => [r.month as number, r.value.cents]));
      assert.equal(byMonth.get(3), 999900, 'março atualizado');
      assert.equal(byMonth.get(2), 104500, 'fevereiro intacto');
      assert.equal(byMonth.get(4), 104500, 'abril intacto');
    });

    // Blocker do W2: o `save` devolve o que foi EFETIVAMENTE persistido, não o que se pediu para
    // persistir. No recálculo o upsert preserva o id existente — se o repo devolvesse a entrada, a
    // response 201 traria um id que não existe no banco.
    it('save devolve o registro persistido: no recálculo, o id é o da linha existente', async () => {
      const budgetId = BudgetIdMod.generate();
      const subcategoryId = SubcategoryId.generate();

      const primeiro = makeResult(budgetId, 'IPCA', IPCA_INPUT, 3, subcategoryId);
      const savedFirst = await repo.save(primeiro);
      assert.ok(isOk(savedFirst));
      assert.equal(String(savedFirst.value.id), String(primeiro.id), 'inserção devolve o id novo');

      const recalculo = makeResult(
        budgetId,
        'IPCA',
        { kind: 'IPCA', baseValueInCents: 250000, ipca: 0 },
        3,
        subcategoryId,
      );
      const savedAgain = await repo.save(recalculo);
      assert.ok(isOk(savedAgain));

      // o id devolvido é o da linha existente — NÃO o gerado agora
      assert.equal(
        String(savedAgain.value.id),
        String(primeiro.id),
        'recálculo devolve o id persistido',
      );
      assert.notEqual(String(savedAgain.value.id), String(recalculo.id));
      assert.equal(savedAgain.value.value.cents, 250000, 'valor atualizado');
      assert.equal(savedAgain.value.month, 3);

      // e bate com o que está no banco
      const list = await repo.listByBudgetId(budgetId);
      assert.ok(isOk(list));
      assert.equal(list.value.length, 1);
      assert.equal(String(list.value[0]?.id), String(savedAgain.value.id));
    });

    it('o upsert é por (budget, subcategoria, mês): contas distintas no mesmo mês coexistem', async () => {
      const budgetId = BudgetIdMod.generate();
      assert.ok(isOk(await repo.save(makeResult(budgetId, 'IPCA', IPCA_INPUT, 6))));
      assert.ok(isOk(await repo.save(makeResult(budgetId, 'IPCA', IPCA_INPUT, 6))));

      const list = await repo.listByBudgetId(budgetId);
      assert.ok(isOk(list));
      assert.equal(list.value.length, 2, 'subcategorias diferentes -> linhas diferentes');
    });
  });
};
