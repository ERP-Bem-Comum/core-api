import { type Result, ok, err } from '../../../../shared/primitives/result.ts';
import * as Money from '../../../../shared/kernel/money.ts';
import type { UserRef } from '../../../../shared/kernel/user-ref.ts';
import type { BudgetPlanId } from '../shared/budget-plan-id.ts';
import type { BudgetId } from '../shared/budget-id.ts';
import type { ProgramRef } from '../shared/refs.ts';
import type { BudgetPlan as BudgetPlanEntity, Budget, BudgetPartner } from './types.ts';
import type { BudgetPlanError } from './errors.ts';
import type { BudgetPlanEvent } from './events.ts';
import * as PlanVersion from './version.ts';

// Faixa plausível de ano de planejamento (legado não valida; fail-closed aqui).
const YEAR_MIN = 2000;
const YEAR_MAX = 2100;

export type CreateBudgetPlanInput = Readonly<{
  id: BudgetPlanId;
  year: number;
  programRef: ProgramRef;
  now: Date;
  actor: UserRef;
}>;

export type AddBudgetInput = Readonly<{
  id: BudgetId;
  partner: BudgetPartner;
  value: Money.Money;
}>;

const samePartner = (a: BudgetPartner, b: BudgetPartner): boolean =>
  a.kind === b.kind && String(a.ref) === String(b.ref);

const create = (
  input: CreateBudgetPlanInput,
): Result<Readonly<{ plan: BudgetPlanEntity; event: BudgetPlanEvent }>, BudgetPlanError> => {
  if (!Number.isInteger(input.year) || input.year < YEAR_MIN || input.year > YEAR_MAX) {
    return err('budget-plan-invalid-year');
  }

  const plan: BudgetPlanEntity = {
    id: input.id,
    year: input.year,
    programRef: input.programRef,
    version: PlanVersion.initial(),
    status: 'RASCUNHO',
    budgets: [],
    parentId: null,
    scenarioName: null,
    createdAt: input.now,
    updatedAt: input.now,
    updatedByRef: input.actor,
  };
  return ok({
    plan,
    event: {
      type: 'BudgetPlanCreated',
      budgetPlanId: plan.id,
      year: plan.year,
      programRef: plan.programRef,
      occurredAt: input.now,
    },
  });
};

// Invariante do legado (índices únicos budgets×parceiro): no máx. 1 orçamento por
// estado parceiro e 1 por município parceiro dentro do plano.
const addBudget = (
  plan: BudgetPlanEntity,
  input: AddBudgetInput,
  now: Date,
  actor: UserRef,
): Result<Readonly<{ plan: BudgetPlanEntity }>, BudgetPlanError> => {
  if (plan.budgets.some((b) => samePartner(b.partner, input.partner))) {
    return err('budget-plan-duplicate-partner');
  }
  const budget: Budget = { id: input.id, partner: input.partner, value: input.value };
  return ok({
    plan: { ...plan, budgets: [...plan.budgets, budget], updatedAt: now, updatedByRef: actor },
  });
};

// Remove um orçamento (Rede) do plano. Ausência do budget -> budget-not-found (CA4).
const removeBudget = (
  plan: BudgetPlanEntity,
  budgetId: BudgetId,
  now: Date,
  actor: UserRef,
): Result<Readonly<{ plan: BudgetPlanEntity }>, BudgetPlanError> => {
  if (!plan.budgets.some((b) => String(b.id) === String(budgetId))) {
    return err('budget-not-found');
  }
  return ok({
    plan: {
      ...plan,
      budgets: plan.budgets.filter((b) => String(b.id) !== String(budgetId)),
      updatedAt: now,
      updatedByRef: actor,
    },
  });
};

// Legado: no máx. 2 cenários por plano em calibração.
const MAX_SCENERIES = 2;

// US4 — deriva um filho EM_CALIBRACAO de um plano APROVADO (o aprovado é preservado). A versão é
// alocada a partir do MAIOR major existente na família (+1) — não da leitura estática do pai — para
// que duas calibrações nunca colidam na UNIQUE (year, program_ref, version). `children` = filhos atuais.
const startCalibration = (
  parent: BudgetPlanEntity,
  children: readonly BudgetPlanEntity[],
  childId: BudgetPlanId,
  audit: Readonly<{ now: Date; actor: UserRef }>,
): Result<Readonly<{ plan: BudgetPlanEntity }>, BudgetPlanError> => {
  if (parent.status !== 'APROVADO') return err('budget-plan-not-approved');
  if (parent.scenarioName !== null) return err('budget-plan-is-scenario');
  // Legado: não abrir nova calibração enquanto há uma calibração (filho não-cenário) em aberto.
  if (children.some((c) => c.scenarioName === null && c.status === 'EM_CALIBRACAO')) {
    return err('budget-plan-calibration-open');
  }
  const nextMajor = Math.max(parent.version.major, ...children.map((c) => c.version.major)) + 1;
  return ok({
    plan: {
      ...parent,
      id: childId,
      status: 'EM_CALIBRACAO',
      version: { major: nextMajor, minor: 0 },
      budgets: [], // clonados com novos ids na orquestração (evita colisão de PK)
      parentId: parent.id,
      scenarioName: null,
      createdAt: audit.now,
      updatedAt: audit.now,
      updatedByRef: audit.actor,
    },
  });
};

// US4 — deriva um cenário RASCUNHO de um plano não-aprovado (versão paralela nomeada). Minor alocado
// a partir do MAIOR minor dos irmãos do mesmo major (+1) — evita colisão entre 2 cenários. Máx. 2.
const createScenery = (
  parent: BudgetPlanEntity,
  children: readonly BudgetPlanEntity[],
  spec: Readonly<{ id: BudgetPlanId; name: string }>,
  audit: Readonly<{ now: Date; actor: UserRef }>,
): Result<Readonly<{ plan: BudgetPlanEntity }>, BudgetPlanError> => {
  if (parent.status === 'APROVADO') return err('budget-plan-already-approved');
  if (parent.scenarioName !== null) return err('budget-plan-is-scenario');
  if (children.filter((c) => c.scenarioName !== null).length >= MAX_SCENERIES) {
    return err('budget-plan-scenery-limit');
  }
  const siblingMinors = children
    .filter((c) => c.version.major === parent.version.major)
    .map((c) => c.version.minor);
  const nextMinor = Math.max(parent.version.minor, ...siblingMinors) + 1;
  return ok({
    plan: {
      ...parent,
      id: spec.id,
      status: 'RASCUNHO',
      version: { major: parent.version.major, minor: nextMinor },
      budgets: [], // clonados com novos ids na orquestração (evita colisão de PK)
      parentId: parent.id,
      scenarioName: spec.name,
      createdAt: audit.now,
      updatedAt: audit.now,
      updatedByRef: audit.actor,
    },
  });
};

// US4 — aprova o plano (bloqueia edição via guard de status a jusante). A promoção ao pai, quando o
// plano é um filho, é orquestrada no application (W1-D), não no agregado.
const approve = (
  plan: BudgetPlanEntity,
  now: Date,
  actor: UserRef,
): Result<Readonly<{ plan: BudgetPlanEntity }>, BudgetPlanError> => {
  if (plan.status === 'APROVADO') return err('budget-plan-already-approved');
  return ok({ plan: { ...plan, status: 'APROVADO', updatedAt: now, updatedByRef: actor } });
};

const total = (plan: BudgetPlanEntity): Money.Money =>
  plan.budgets.reduce((acc, b) => Money.add(acc, b.value), Money.ZERO);

export const BudgetPlan = {
  create,
  addBudget,
  removeBudget,
  startCalibration,
  createScenery,
  approve,
  total,
} as const;
