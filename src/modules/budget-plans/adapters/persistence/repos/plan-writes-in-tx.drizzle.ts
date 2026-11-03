// Passos de escrita do módulo que rodam DENTRO de uma transação já aberta, e o tratamento comum de
// erro dessas transações.
//
// #1092 (F10 da revisão) — antes viviam como helpers internos de dois repositórios e eram
// importados por um terceiro adapter (o writer de cópia): mudar um deles mudava o outro em
// silêncio. Aqui a dependência fica nomeada — quem usa cada passo está listado ao lado dele.

import { eq } from 'drizzle-orm';
import type { BudgetPlan } from '#src/modules/budget-plans/domain/budget-plan/types.ts';
import type { CostStructure } from '#src/modules/budget-plans/domain/cost-structure/types.ts';
import type { BudgetResult } from '#src/modules/budget-plans/domain/budget-result/budget-result.ts';
import type { BudgetPlansModuleEvent } from '#src/modules/budget-plans/public-api/events.ts';
import type { BudgetPlansMysqlHandle } from '../drivers/mysql-driver.ts';
import * as schema from '../schemas/mysql.ts';
import { budgetPlanToInsert, budgetToInsert } from '../mappers/budget-plan.mapper.ts';
import { costStructureToRows } from '../mappers/cost-structure.mapper.ts';
import { budgetResultToInsert } from '../mappers/budget-result.mapper.ts';
import { appendOutboxInTx } from './outbox-repository.drizzle.ts';

type Db = BudgetPlansMysqlHandle['db'];
export type PlanTx = Parameters<Parameters<Db['transaction']>[0]>[0];

// Budgets reescritos por inteiro (delete + insert): coleção pequena, sem diff incremental.
const replaceBudgetsInTx = async (
  // eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
  tx: PlanTx,
  plan: BudgetPlan,
): Promise<void> => {
  const planId = plan.id as unknown as string;
  await tx.delete(schema.budgets).where(eq(schema.budgets.budgetPlanId, planId));
  if (plan.budgets.length > 0) {
    await tx.insert(schema.budgets).values(plan.budgets.map((b) => budgetToInsert(b, plan.id)));
  }
};

// Upsert do plano: trava o cabeçalho (`SELECT id ... FOR UPDATE`), UPDATE-ou-INSERT do plano,
// replace-all dos budgets (coleção pequena, molde do legado) e append no outbox — tudo no MESMO
// commit. Usado por `BudgetPlanRepository.save` e `.removeBudget`.
export const upsertPlanInTx = async (
  // eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
  tx: PlanTx,
  plan: BudgetPlan,
  events: readonly BudgetPlansModuleEvent[],
): Promise<void> => {
  const row = budgetPlanToInsert(plan);
  const existing = await tx
    .select({ id: schema.budgetPlans.id })
    .from(schema.budgetPlans)
    .where(eq(schema.budgetPlans.id, row.id))
    .for('update');

  if (existing.length > 0) {
    await tx.update(schema.budgetPlans).set(row).where(eq(schema.budgetPlans.id, row.id));
  } else {
    await tx.insert(schema.budgetPlans).values(row);
  }
  await replaceBudgetsInTx(tx, plan);
  await appendOutboxInTx(tx, schema, events);
};

// Plano NOVO: INSERT puro, sem o `SELECT ... FOR UPDATE` do upsert. Usado por
// `BudgetPlanRepository.create` e pelo writer de cópia — nos dois o plano é novo por construção.
// F8 da revisão: o `FOR UPDATE` num id inexistente, sob o REPEATABLE READ default (ADR-0020 veda
// mudar o isolamento), é gap lock no PK; duas criações concorrentes travavam uma à outra no INSERT
// (deadlock medido). Sem leitura com trava, não há gap lock a disputar.
export const insertNewPlanInTx = async (
  // eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
  tx: PlanTx,
  plan: BudgetPlan,
  events: readonly BudgetPlansModuleEvent[],
): Promise<void> => {
  await tx.insert(schema.budgetPlans).values(budgetPlanToInsert(plan));
  if (plan.budgets.length > 0) {
    await tx.insert(schema.budgets).values(plan.budgets.map((b) => budgetToInsert(b, plan.id)));
  }
  await appendOutboxInTx(tx, schema, events);
};

// Replace-all da árvore: apaga a raiz do plano (FK ON DELETE CASCADE derruba categorias e
// subcategorias) e reinsere top-down (FK exige pai antes do filho). Spread p/ array mutável
// (drizzle `.values()` não aceita `readonly[]`). Usado por `CostStructureRepository.save`, `.mutate`
// e pelo writer de cópia.
export const writeTreeInTx = async (
  // eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
  tx: PlanTx,
  structure: CostStructure,
): Promise<void> => {
  const rows = costStructureToRows(structure);
  const planId = structure.budgetPlanId as unknown as string;

  await tx.delete(schema.costCenters).where(eq(schema.costCenters.budgetPlanId, planId));
  if (rows.costCenters.length > 0)
    await tx.insert(schema.costCenters).values([...rows.costCenters]);
  if (rows.categories.length > 0) await tx.insert(schema.categories).values([...rows.categories]);
  if (rows.subcategories.length > 0)
    await tx.insert(schema.subcategories).values([...rows.subcategories]);
};

// Teto de linhas por INSERT multi-row dos lançamentos. Um plano do legado tem ~1.000 lançamentos
// (4.679 em 5 planos no dump de produção); em lotes, o pacote fica longe do `max_allowed_packet`.
const RESULTS_PER_INSERT = 500;

// Lançamentos de um plano NOVO: INSERT puro, em lotes. Uma colisão na UNIQUE (budget, subcategoria,
// mês) seria defeito da cópia, e o INSERT puro a transforma em erro (com rollback) em vez de
// sobrescrever em silêncio, como o ON DUPLICATE KEY UPDATE do `save` faria. Usado pelo writer de cópia.
export const insertResultsInTx = async (
  // eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
  tx: PlanTx,
  results: readonly BudgetResult[],
): Promise<void> => {
  const rows = results.map(budgetResultToInsert);
  for (let start = 0; start < rows.length; start += RESULTS_PER_INSERT) {
    await tx.insert(schema.budgetResults).values(rows.slice(start, start + RESULTS_PER_INSERT));
  }
};

// ─── erros ────────────────────────────────────────────────────────────────────

export type MysqlErrorInfo = Readonly<{
  errno: number | null;
  code: string | null;
  key: string | null;
}>;

// Nome da constraint/índice citado na mensagem do MySQL: `... for key 'tabela.indice'` (duplicate
// key) ou `... CONSTRAINT \`nome\` FOREIGN KEY ...` (FK, 1451/1452). Nunca o valor da linha.
const constraintNameOf = (sqlMessage: string): string | null =>
  /for key '([^']+)'/.exec(sqlMessage)?.[1] ?? /CONSTRAINT `([^`]+)`/.exec(sqlMessage)?.[1] ?? null;

// O Drizzle envolve o erro do mysql2 em `cause`; procura nos dois níveis. Fonte única da extração —
// `isParentRestrictViolation`, `isPlanVersionDuplicate`, o retry e o log passam todos por aqui.
export const mysqlErrorOf = (e: unknown): MysqlErrorInfo => {
  for (const c of [e, e instanceof Error ? e.cause : undefined]) {
    if (typeof c !== 'object' || c === null) continue;
    const obj = c as Record<string, unknown>;
    if (typeof obj['errno'] !== 'number') continue;
    const message = typeof obj['sqlMessage'] === 'string' ? obj['sqlMessage'] : '';
    const key = constraintNameOf(message);
    return {
      errno: obj['errno'],
      code: typeof obj['code'] === 'string' ? obj['code'] : null,
      key,
    };
  }
  return { errno: null, code: null, key: null };
};

// F3 da revisão — duplicate key (1062) na UNIQUE (year, program_ref, version): outro pedido criou o
// mesmo plano entre a checagem de existência e o INSERT. É 409, não indisponibilidade.
export const isPlanVersionDuplicate = (e: unknown): boolean => {
  const info = mysqlErrorOf(e);
  return (
    info.errno === 1062 && (info.key ?? '').endsWith('bgp_budget_plans_year_program_ref_version_uq')
  );
};

// F3 da revisão — duas criações simultâneas do MESMO (ano, programa, versão) disputam a chave da UNIQUE;
// a verificação de duplicata do InnoDB pode fechar ciclo e abortar uma delas com deadlock (1213),
// medido em 1 de 1000 importações concorrentes. O fornecedor manda refazer: "you must write your
// applications so that they are always prepared to re-issue a transaction if it gets rolled back
// because of a deadlock" (MySQL 8.4 Reference Manual, 17.7.5.3). Refaz UMA vez: na segunda tentativa
// a outra transação já fez commit, e o conflito aparece como duplicata (409), não como 503.
// `op` tem de abrir a própria transação — o deadlock já desfez a anterior inteira.
export const retryOnceOnDeadlock = async <T>(op: () => Promise<T>): Promise<T> => {
  try {
    return await op();
  } catch (cause) {
    if (mysqlErrorOf(cause).errno !== 1213) throw cause;
    return op();
  }
};

// O Drizzle embrulha a falha de query num erro cuja mensagem é `Failed query: <sql>\nparams: <valores>`.
const DRIZZLE_QUERY_PREFIX = 'Failed query';

// F5 da revisão — linha de log de falha SEM os parâmetros da query. `String(cause)` do Drizzle traz o
// SQL com todos os valores (até 500 lançamentos: ~75 KB por falha, com ids e centavos), e a
// `sqlMessage` do duplicate key cita o valor da chave.
//   • Erro do MySQL (tem errno): só errno, code e o nome da constraint.
//   • Qualquer outro erro: `nome: mensagem` — um TypeError de mapper ou "Pool is closed" não carregam
//     SQL, e sem a mensagem o 503 fica impossível de diagnosticar (R2 da segunda revisão). Se for o
//     embrulho do Drizzle sem errno na causa, usa a mensagem da CAUSA, nunca a do embrulho (que tem
//     os parâmetros).
export const describeDbError = (e: unknown): string => {
  const info = mysqlErrorOf(e);
  if (info.errno !== null) {
    return `errno=${String(info.errno)} code=${info.code ?? '-'} key=${info.key ?? '-'}`;
  }
  if (!(e instanceof Error)) return 'erro desconhecido';
  if (!e.message.startsWith(DRIZZLE_QUERY_PREFIX)) return `${e.name}: ${e.message}`;
  const cause = e.cause;
  return cause instanceof Error
    ? `${cause.name}: ${cause.message}`
    : `${e.name}: falha de query sem causa do driver`;
};
