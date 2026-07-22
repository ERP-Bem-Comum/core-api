import { eq, inArray } from 'drizzle-orm';
import process from 'node:process';
import { type Result, ok, err } from '#src/shared/primitives/result.ts';
import type { BudgetPlanId } from '#src/modules/budget-plans/domain/shared/budget-plan-id.ts';
import { isBudgetPlanStatus } from '#src/modules/budget-plans/domain/budget-plan/status.ts';
import type { CostStructure } from '#src/modules/budget-plans/domain/cost-structure/types.ts';
import { empty } from '#src/modules/budget-plans/domain/cost-structure/cost-structure.ts';
import type {
  CostStructureRepository,
  CostStructureRepositoryError,
  CostStructureMutation,
  CostStructureMutateError,
} from '#src/modules/budget-plans/domain/cost-structure/repository.ts';
import type { BudgetPlansMysqlHandle } from '../drivers/mysql-driver.ts';
import * as schema from '../schemas/mysql.ts';
import { costStructureToRows, costStructureFromRows } from '../mappers/cost-structure.mapper.ts';

const safe = async <T>(
  ctx: string,
  op: () => Promise<T>,
): Promise<Result<T, CostStructureRepositoryError>> => {
  try {
    return ok(await op());
  } catch (cause) {
    process.stderr.write(`[cost-structure-repo:${ctx}] ${String(cause)}\n`);
    return err('cost-structure-repo-unavailable');
  }
};

type Db = BudgetPlansMysqlHandle['db'];
type Tx = Parameters<Parameters<Db['transaction']>[0]>[0];
// Executor de leitura: `db` (fora de tx) OU `tx` (dentro de mutate) — mesma API de query.
type ReadExec = Db | Tx;

// Reconstrói a árvore por 3 SELECTs (adjacency) + montagem em app — WITH RECURSIVE dispensável
// (árvore FIXA em 3 níveis). ORDER BY (name, id) determinístico: sem ele o MySQL não garante
// ordem entre irmãos, divergindo do in-memory e da árvore exposta no GET. Compartilhado por
// findByBudgetPlanId (db) e mutate (tx, DENTRO do commit guardado).
// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
const selectTree = async (exec: ReadExec, id: BudgetPlanId): Promise<CostStructure> => {
  const planId = id as unknown as string;

  const costCenterRows = await exec
    .select()
    .from(schema.costCenters)
    .where(eq(schema.costCenters.budgetPlanId, planId))
    .orderBy(schema.costCenters.name, schema.costCenters.id);
  if (costCenterRows.length === 0) return empty(id);

  const ccIds = costCenterRows.map((r) => r.id);
  const categoryRows = await exec
    .select()
    .from(schema.categories)
    .where(inArray(schema.categories.costCenterId, ccIds))
    .orderBy(schema.categories.name, schema.categories.id);

  const subcategoryRows =
    categoryRows.length === 0
      ? []
      : await exec
          .select()
          .from(schema.subcategories)
          .where(
            inArray(
              schema.subcategories.categoryId,
              categoryRows.map((r) => r.id),
            ),
          )
          .orderBy(schema.subcategories.name, schema.subcategories.id);

  const mapped = costStructureFromRows(id, {
    costCenters: costCenterRows,
    categories: categoryRows,
    subcategories: subcategoryRows,
  });
  if (!mapped.ok) throw new Error(`cost-structure-mapper: ${mapped.error}`);
  return mapped.value;
};

// Replace-all DENTRO de uma tx: apaga a raiz do plano (FK ON DELETE CASCADE derruba
// categorias/subcategorias) e reinsere top-down (FK exige pai antes do filho). Spread p/
// array mutável (drizzle `.values()` não aceita `readonly[]`). Compartilhado por save e mutate.
// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
const writeTree = async (tx: Tx, structure: CostStructure): Promise<void> => {
  const rows = costStructureToRows(structure);
  const planId = structure.budgetPlanId as unknown as string;

  await tx.delete(schema.costCenters).where(eq(schema.costCenters.budgetPlanId, planId));
  if (rows.costCenters.length > 0)
    await tx.insert(schema.costCenters).values([...rows.costCenters]);
  if (rows.categories.length > 0) await tx.insert(schema.categories).values([...rows.categories]);
  if (rows.subcategories.length > 0)
    await tx.insert(schema.subcategories).values([...rows.subcategories]);
};

export const createDrizzleCostStructureRepository = (
  handle: BudgetPlansMysqlHandle, // eslint-disable-line @typescript-eslint/prefer-readonly-parameter-types
): CostStructureRepository => {
  const db = handle.db;

  return {
    findByBudgetPlanId: async (id: BudgetPlanId) =>
      safe('findByBudgetPlanId', async () => selectTree(db, id)),

    // Escrita ATÔMICA guardada (fecha o TOCTOU — Q4): numa única transação trava o cabeçalho
    // do plano (`SELECT status ... FOR UPDATE`), carrega a árvore, aplica a op de domínio e
    // reescreve — tudo no MESMO commit.
    // Semântica de tx (driver mysql2): retornar um Result de ERRO do callback é retorno NORMAL
    // -> o drizzle emite COMMIT. O COMMIT é INÓCUO porque nesse caminho nenhum INSERT/UPDATE/DELETE
    // rodou antes (o SELECT ... FOR UPDATE só leu). NÃO é rollback — é commit vazio. O único
    // ROLLBACK real vem da EXCEÇÃO (status corrompido no banco), capturada no catch abaixo.
    mutate: async (
      budgetPlanId: BudgetPlanId,
      apply: CostStructureMutation,
    ): Promise<Result<CostStructure, CostStructureMutateError>> => {
      const planId = budgetPlanId as unknown as string;
      try {
        return await db.transaction(async (tx) => {
          const statusRows = await tx
            .select({ status: schema.budgetPlans.status })
            .from(schema.budgetPlans)
            .where(eq(schema.budgetPlans.id, planId))
            .for('update');

          const statusRaw = statusRows[0]?.status;
          if (statusRaw === undefined) return err('budget-plan-not-found');
          // Fail-closed: status fora do domínio no banco é corrupção -> erro de infra.
          if (!isBudgetPlanStatus(statusRaw)) {
            throw new Error(`cost-structure-repo:mutate status inválido no banco: ${statusRaw}`);
          }

          const structure = await selectTree(tx, budgetPlanId);
          const applied = apply(structure, statusRaw);
          if (!applied.ok) return applied; // erro de domínio -> não escreve

          await writeTree(tx, applied.value);
          return ok(applied.value);
        });
      } catch (cause) {
        process.stderr.write(`[cost-structure-repo:mutate] ${String(cause)}\n`);
        return err('cost-structure-repo-unavailable');
      }
    },

    // Primitivo low-level (NÃO guardado por status) — seeds/round-trip. Negócio usa `mutate`.
    save: async (structure: CostStructure) =>
      safe('save', async () => {
        await db.transaction(async (tx) => {
          await writeTree(tx, structure);
        });
      }),
  };
};
