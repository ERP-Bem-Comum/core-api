// BDG-CONSOLIDATED-CSV (US5) — integração Drizzle/MySQL da query do Consolidado ABC contra MySQL 8.4
// real. Valida o que só o banco pega: `listApprovedByYear` (WHERE status/year/program_ref + ORDER BY id
// + hidratação de budgets em lote) e a resolução da VIGENTE por família sobre linhas reais (raiz
// histórica APROVADA + filho APROVADO de maior versão → vence o filho). Opt-in MYSQL_INTEGRATION=1.
import { describe, it, before, after } from 'node:test';
import { strict as assert } from 'node:assert';

import { isOk } from '#src/shared/index.ts';
import * as Money from '#src/shared/kernel/money.ts';
import * as UserRef from '#src/shared/kernel/user-ref.ts';
import * as BudgetPlanId from '#src/modules/budget-plans/domain/shared/budget-plan-id.ts';
import * as BudgetId from '#src/modules/budget-plans/domain/shared/budget-id.ts';
import { ProgramRef, PartnerStateRef } from '#src/modules/budget-plans/domain/shared/refs.ts';
import { BudgetPlan } from '#src/modules/budget-plans/domain/budget-plan/budget-plan.ts';
import { selectCurrentApprovedByFamily } from '#src/modules/budget-plans/domain/budget-plan/current-approved.ts';
import type { BudgetPlan as BudgetPlanEntity } from '#src/modules/budget-plans/domain/budget-plan/types.ts';
import { openBudgetPlansMysql } from '#src/modules/budget-plans/adapters/persistence/drivers/mysql-driver.ts';
import type { BudgetPlansMysqlHandle } from '#src/modules/budget-plans/adapters/persistence/drivers/mysql-driver.ts';
import { createDrizzleBudgetPlanRepository } from '#src/modules/budget-plans/adapters/persistence/repos/budget-plan-repository.drizzle.ts';
import { isNotNull } from 'drizzle-orm';

const VALID_CONN = 'mysql://root:rootpw-migration-test-only@127.0.0.1:3306/core';
const NOW = new Date('2026-07-09T12:00:00.000Z');
const PROGRAM_ETI = '11111111-1111-4111-8111-111111111111';
const PROGRAM_PARC = '22222222-2222-4222-8222-222222222222';
const PROGRAM_OTHER = '33333333-3333-4333-8333-333333333333';
const STATE_CE = 'CE';
// Ator padrão dos testes (BGP-UPDATED-BY-AUDIT/#373).
const ACTOR = (() => {
  const r = UserRef.rehydrate('00000000-0000-4000-8000-000000000001');
  assert.ok(isOk(r));
  return r.value;
})();

const integrationEnabled = (): boolean => process.env.MYSQL_INTEGRATION === '1';

describe('createDrizzleBudgetPlanRepository.listApprovedByYear — shape', () => {
  it('é uma função', () => {
    assert.equal(typeof createDrizzleBudgetPlanRepository, 'function');
  });
});

if (integrationEnabled()) {
  let handle: BudgetPlansMysqlHandle | null = null;

  before(async () => {
    const r = await openBudgetPlansMysql({ connectionString: VALID_CONN, applyMigrations: true });
    if (!r.ok) throw new Error(`fixture: openBudgetPlansMysql falhou — ${r.error}`);
    handle = r.value;
  });

  after(async () => {
    if (handle !== null) {
      await handle.close();
      handle = null;
    }
  });

  const truncate = async (h: BudgetPlansMysqlHandle): Promise<void> => {
    await h.db.delete(h.schema.budgetResults);
    await h.db.delete(h.schema.subcategories);
    await h.db.delete(h.schema.categories);
    await h.db.delete(h.schema.costCenters);
    await h.db.delete(h.schema.budgets);
    await h.db.delete(h.schema.budgetPlans).where(isNotNull(h.schema.budgetPlans.parentId));
    await h.db.delete(h.schema.budgetPlans);
  };

  const makePlan = (
    spec: Readonly<{
      program: string;
      year: number;
      status: 'RASCUNHO' | 'APROVADO';
      cents: number;
      version?: Readonly<{ major: number; minor: number }>;
      parentId?: BudgetPlanEntity['parentId'];
    }>,
  ): BudgetPlanEntity => {
    const programRef = ProgramRef.rehydrate(spec.program);
    assert.ok(isOk(programRef));
    const stateRef = PartnerStateRef.rehydrate(STATE_CE);
    assert.ok(isOk(stateRef));
    const money = Money.fromCents(spec.cents);
    assert.ok(isOk(money));
    const created = BudgetPlan.create({
      id: BudgetPlanId.generate(),
      year: spec.year,
      programRef: programRef.value,
      now: NOW,
      actor: ACTOR,
    });
    assert.ok(isOk(created));
    const withBudget = BudgetPlan.addBudget(
      created.value.plan,
      {
        id: BudgetId.generate(),
        partner: { kind: 'state', ref: stateRef.value },
        value: money.value,
      },
      NOW,
      ACTOR,
    );
    assert.ok(isOk(withBudget));
    return {
      ...withBudget.value.plan,
      status: spec.status,
      ...(spec.version !== undefined ? { version: spec.version } : {}),
      ...(spec.parentId !== undefined ? { parentId: spec.parentId } : {}),
    };
  };

  it('listApprovedByYear filtra status/ano e a VIGENTE por família vence a raiz histórica', async () => {
    if (handle === null) throw new Error('fixture: handle não inicializado');
    await truncate(handle);
    const repo = createDrizzleBudgetPlanRepository(handle);

    // Família ETI 2026: raiz v1.0 APROVADA (100k, histórica) + filho v2.0 APROVADO (150k, vigente).
    const etiRoot = makePlan({
      program: PROGRAM_ETI,
      year: 2026,
      status: 'APROVADO',
      cents: 100_000,
    });
    assert.ok(isOk(await repo.save(etiRoot, [])));
    const etiChild = makePlan({
      program: PROGRAM_ETI,
      year: 2026,
      status: 'APROVADO',
      cents: 150_000,
      version: { major: 2, minor: 0 },
      parentId: etiRoot.id,
    });
    assert.ok(isOk(await repo.save(etiChild, [])));

    // Família PARC 2026: só raiz aprovada (250k).
    const parc = makePlan({
      program: PROGRAM_PARC,
      year: 2026,
      status: 'APROVADO',
      cents: 250_000,
    });
    assert.ok(isOk(await repo.save(parc, [])));

    // Ruído: rascunho 2026 em família própria (excluído por status) + aprovado 2027 (excluído por ano).
    // Família própria (PROGRAM_OTHER) para não colidir na UNIQUE (year, program_ref, version) com o ETI v1.0.
    assert.ok(
      isOk(
        await repo.save(
          makePlan({ program: PROGRAM_OTHER, year: 2026, status: 'RASCUNHO', cents: 9 }),
          [],
        ),
      ),
    );
    assert.ok(
      isOk(
        await repo.save(
          makePlan({ program: PROGRAM_PARC, year: 2027, status: 'APROVADO', cents: 9 }),
          [],
        ),
      ),
    );

    const approved = await repo.listApprovedByYear({ year: 2026 });
    assert.ok(isOk(approved));
    // 3 aprovados de 2026 (raiz ETI + filho ETI + raiz PARC); rascunho e 2027 fora.
    assert.equal(approved.value.length, 3);

    const current = selectCurrentApprovedByFamily(approved.value);
    // 2 famílias (ETI, PARC).
    assert.equal(current.length, 2);
    const eti = current.find((p) => String(p.programRef) === PROGRAM_ETI);
    assert.equal(eti?.version.major, 2); // vigente = filho v2.0, não a raiz v1.0
    assert.equal(String(eti?.id), String(etiChild.id));
    const totalCents = current.reduce((acc, p) => acc + BudgetPlan.total(p).cents, 0);
    assert.equal(totalCents, 150_000 + 250_000); // 150k (ETI vigente) + 250k (PARC)
  });

  it('filtro por programa estreita a 1 família', async () => {
    if (handle === null) throw new Error('fixture: handle não inicializado');
    await truncate(handle);
    const repo = createDrizzleBudgetPlanRepository(handle);
    assert.ok(
      isOk(
        await repo.save(
          makePlan({ program: PROGRAM_ETI, year: 2026, status: 'APROVADO', cents: 100_000 }),
          [],
        ),
      ),
    );
    assert.ok(
      isOk(
        await repo.save(
          makePlan({ program: PROGRAM_PARC, year: 2026, status: 'APROVADO', cents: 250_000 }),
          [],
        ),
      ),
    );

    const parcRef = ProgramRef.rehydrate(PROGRAM_PARC);
    assert.ok(isOk(parcRef));
    const only = await repo.listApprovedByYear({ year: 2026, programRef: parcRef.value });
    assert.ok(isOk(only));
    assert.equal(only.value.length, 1);
    assert.equal(String(only.value[0]?.programRef), PROGRAM_PARC);
  });
}
