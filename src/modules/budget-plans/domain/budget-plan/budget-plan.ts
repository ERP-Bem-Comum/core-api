import { type Result, ok, err } from '../../../../shared/primitives/result.ts';
import * as Money from '../../../../shared/kernel/money.ts';
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
): Result<Readonly<{ plan: BudgetPlanEntity }>, BudgetPlanError> => {
  if (plan.budgets.some((b) => samePartner(b.partner, input.partner))) {
    return err('budget-plan-duplicate-partner');
  }
  const budget: Budget = { id: input.id, partner: input.partner, value: input.value };
  return ok({
    plan: { ...plan, budgets: [...plan.budgets, budget], updatedAt: now },
  });
};

// Remove um orçamento (Rede) do plano. Ausência do budget -> budget-not-found (CA4).
const removeBudget = (
  plan: BudgetPlanEntity,
  budgetId: BudgetId,
  now: Date,
): Result<Readonly<{ plan: BudgetPlanEntity }>, BudgetPlanError> => {
  if (!plan.budgets.some((b) => String(b.id) === String(budgetId))) {
    return err('budget-not-found');
  }
  return ok({
    plan: {
      ...plan,
      budgets: plan.budgets.filter((b) => String(b.id) !== String(budgetId)),
      updatedAt: now,
    },
  });
};

// US4 — deriva um filho EM_CALIBRACAO de um plano APROVADO (versão editável; o aprovado é preservado —
// nenhuma mutação nele). Versão: calibração incrementa o major (comentário version.ts).
const startCalibration = (
  parent: BudgetPlanEntity,
  childId: BudgetPlanId,
  now: Date,
): Result<Readonly<{ plan: BudgetPlanEntity }>, BudgetPlanError> => {
  if (parent.status !== 'APROVADO') return err('budget-plan-not-approved');
  if (parent.scenarioName !== null) return err('budget-plan-is-scenario');
  return ok({
    plan: {
      ...parent,
      id: childId,
      status: 'EM_CALIBRACAO',
      version: { major: parent.version.major + 1, minor: 0 },
      budgets: [], // clonados com novos ids na orquestração (evita colisão de PK)
      parentId: parent.id,
      scenarioName: null,
      createdAt: now,
      updatedAt: now,
    },
  });
};

// US4 — deriva um cenário RASCUNHO de um plano não-aprovado (versão paralela nomeada). Cenário
// incrementa o minor. Um plano APROVADO não gera cenário; um cenário não gera outro cenário.
const createScenery = (
  parent: BudgetPlanEntity,
  childId: BudgetPlanId,
  name: string,
  now: Date,
): Result<Readonly<{ plan: BudgetPlanEntity }>, BudgetPlanError> => {
  if (parent.status === 'APROVADO') return err('budget-plan-already-approved');
  if (parent.scenarioName !== null) return err('budget-plan-is-scenario');
  return ok({
    plan: {
      ...parent,
      id: childId,
      status: 'RASCUNHO',
      version: { major: parent.version.major, minor: parent.version.minor + 1 },
      budgets: [], // clonados com novos ids na orquestração (evita colisão de PK)
      parentId: parent.id,
      scenarioName: name,
      createdAt: now,
      updatedAt: now,
    },
  });
};

// US4 — aprova o plano (bloqueia edição via guard de status a jusante). A promoção ao pai, quando o
// plano é um filho, é orquestrada no application (W1-D), não no agregado.
const approve = (
  plan: BudgetPlanEntity,
  now: Date,
): Result<Readonly<{ plan: BudgetPlanEntity }>, BudgetPlanError> => {
  if (plan.status === 'APROVADO') return err('budget-plan-already-approved');
  return ok({ plan: { ...plan, status: 'APROVADO', updatedAt: now } });
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
