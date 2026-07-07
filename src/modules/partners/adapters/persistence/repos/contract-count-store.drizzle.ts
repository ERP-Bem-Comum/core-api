/**
 * Adapter Drizzle de `ContractCountStore` (US6b). Read-model `par_contract_count_view` +
 * dedup `par_contract_count_processed`.
 *
 * `applyDelta` é **idempotente por eventId** numa transação: SELECT no `processed` (dedup) gateia a
 * aplicação — já visto ⇒ no-op; novo ⇒ registra o eventId e aplica o delta no view via
 * `count = count + ?` (ON DUPLICATE KEY UPDATE, permitido ADR-0020). SELECT-then-INSERT na mesma tx
 * (o worker é sequencial, sem corrida; effectively-once — dedup sobre at-least-once, Vernon p.412). Boundary:
 * try/catch → Result.
 *
 * `setCount` (#110/PAR-CONTRACT-COUNT-BACKFILL) grava o valor **absoluto**, não delta — usado pelo
 * job de backfill/reconciliação. `ON DUPLICATE KEY UPDATE activeCount = <literal>` fora de transação
 * (sem dedup por eventId — não é aplicação de evento de domínio; idempotente por construção, Sam
 * Newman, *Building Microservices*, p.500: re-executar converge ao mesmo estado).
 */

import { eq, inArray, sql } from 'drizzle-orm';
import process from 'node:process';

import { type Result, ok, err } from '#src/shared/primitives/result.ts';
import type {
  ContractCountStore,
  ContractCountStoreError,
} from '#src/modules/partners/application/ports/contract-count-store.ts';
import type { PartnersMysqlHandle } from '../drivers/mysql-driver.ts';

const safe = async <T>(
  ctx: string,
  op: () => Promise<T>,
): Promise<Result<T, ContractCountStoreError>> => {
  try {
    return ok(await op());
  } catch (cause) {
    process.stderr.write(`[contract-count-store:${ctx}] ${String(cause)}\n`);
    return err('contract-count-store-unavailable');
  }
};

export const createDrizzleContractCountStore = (
  handle: PartnersMysqlHandle, // eslint-disable-line @typescript-eslint/prefer-readonly-parameter-types
): ContractCountStore => {
  const { db, schema } = handle;

  return {
    applyDelta: async ({ contractorRef, delta, eventId }) =>
      safe('applyDelta', async () => {
        await db.transaction(async (tx) => {
          // Dedup por eventId (SELECT-then-INSERT na MESMA tx — ADR-0020; o worker é sequencial,
          // sem corrida). Já visto → no-op; novo → registra o eventId e aplica o delta.
          const seen = await tx
            .select({ eventId: schema.parContractCountProcessed.eventId })
            .from(schema.parContractCountProcessed)
            .where(eq(schema.parContractCountProcessed.eventId, eventId))
            .limit(1);
          if (seen.length > 0) return;
          await tx
            .insert(schema.parContractCountProcessed)
            .values({ eventId, processedAt: new Date() });
          await tx
            .insert(schema.parContractCountView)
            .values({ contractorRef, activeCount: delta })
            .onDuplicateKeyUpdate({
              set: {
                activeCount: sql`${schema.parContractCountView.activeCount} + ${delta}`,
              },
            });
        });
      }),

    getCount: async (contractorRef) =>
      safe('getCount', async () => {
        const rows = await db
          .select({ activeCount: schema.parContractCountView.activeCount })
          .from(schema.parContractCountView)
          .where(eq(schema.parContractCountView.contractorRef, contractorRef))
          .limit(1);
        return rows[0]?.activeCount ?? 0;
      }),

    // Absoluto (não soma) — backfill/reconciliação (#110/#129). ON DUPLICATE KEY UPDATE com valor
    // literal (não `sql\`... + ...\``), idempotente por natureza: não registra eventId (não é evento).
    setCount: async ({ contractorRef, activeCount }) =>
      safe('setCount', async () => {
        await db
          .insert(schema.parContractCountView)
          .values({ contractorRef, activeCount })
          .onDuplicateKeyUpdate({ set: { activeCount } });
      }),

    getCounts: async (contractorRefs) =>
      safe('getCounts', async () => {
        const out = new Map<string, number>();
        if (contractorRefs.length === 0) return out;
        const rows = await db
          .select({
            contractorRef: schema.parContractCountView.contractorRef,
            activeCount: schema.parContractCountView.activeCount,
          })
          .from(schema.parContractCountView)
          .where(inArray(schema.parContractCountView.contractorRef, [...contractorRefs]));
        for (const row of rows) out.set(row.contractorRef, row.activeCount);
        return out;
      }),
  };
};
