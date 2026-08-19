// Adapter Drizzle da quarentena de retorno da VAN (#753).
//
// `record`: INSERT ... ON DUPLICATE KEY UPDATE. O ODKU é seguro AQUI, e a razão precisa estar
//   escrita: ele dispara em QUALQUER índice único, não só na PK — e nesta tabela `object_key` é a
//   PK e o único índice único que existe. Numa tabela com UNIQUE natural além da PK, o mesmo padrão
//   viraria UPDATE de linha alheia (foi o defeito que o save da remessa pagou; ver
//   `document-repository.drizzle.ts:9-11`).
//
// Boundary: todo try/catch converte para Result; nenhum Error cruza a borda
//   (.claude/rules/adapters.md §"converter para Result na borda").

import { and, inArray, isNull, sql } from 'drizzle-orm';
import process from 'node:process';

import { type Result, ok, err } from '#src/shared/primitives/result.ts';
import type {
  QuarantinedObject,
  ReturnQuarantineReason,
  VanReturnQuarantineError,
  VanReturnQuarantineStore,
} from '#src/modules/financial/application/ports/van-return-quarantine-store.ts';
import type { FinancialMysqlHandle } from '#src/modules/financial/adapters/persistence/drivers/mysql-driver.ts';
import { finVanReturnQuarantine, type FinVanReturnQuarantineRow } from '../schemas/mysql.ts';

const logStore = (op: string, cause: unknown): void => {
  process.stderr.write(`[fin-van-return-quarantine] ${op} failed: ${String(cause)}\n`);
};

// `values(col)` referencia o valor que SERIA inserido (lado do INSERT) no ON DUPLICATE KEY UPDATE.
const incoming = (column: string): ReturnType<typeof sql.raw> => sql.raw(`values(\`${column}\`)`);

// ─── instantes ────────────────────────────────────────────────────────────────
//
// O port trafega ISO-8601 UTC; a coluna é `datetime(3)`, que não guarda fuso. A conversão é
// EXPLÍCITA nos dois sentidos porque round-trip infiel é defeito silencioso: gravar
// `2026-08-19T12:05:00.000Z` e ler `2026-08-19 12:05:00.000` faz o adapter violar o contrato do
// próprio port, e quem compara os dois lados descobre isso num diff de teste, longe da causa.
//
// ⚠️ Diverge do vizinho `remittance-repository.drizzle.ts`, que grava `toISOString()` direto e
// devolve a string do banco como veio. Não replicar o padrão de lá é deliberado — mas a divergência
// fica registrada em vez de resolvida em silêncio.
const toColumn = (iso: string): string => iso.slice(0, 23).replace('T', ' ');

const toIso = (column: string): string => `${column.replace(' ', 'T')}Z`;

const toDomain = (row: Readonly<FinVanReturnQuarantineRow>): QuarantinedObject => ({
  key: row.objectKey,
  // A união literal é garantida pelo CHECK da tabela; motivo novo exige migration, e é lá que a
  // decisão sobre ele acontece.
  reason: row.reason as ReturnQuarantineReason,
  observedSha256: row.observedSha256,
  ...(row.expectedSha256 !== null ? { expectedSha256: row.expectedSha256 } : {}),
  firstSeenAt: toIso(row.firstSeenAt),
  lastSeenAt: toIso(row.lastSeenAt),
  ...(row.releasedAt !== null ? { releasedAt: toIso(row.releasedAt) } : {}),
});

export const createDrizzleVanReturnQuarantineStore = (
  handle: FinancialMysqlHandle, // eslint-disable-line @typescript-eslint/prefer-readonly-parameter-types
): VanReturnQuarantineStore => {
  const { db } = handle;

  return {
    record: async (observations): Promise<Result<void, VanReturnQuarantineError>> => {
      if (observations.length === 0) return ok(undefined);

      try {
        await db
          .insert(finVanReturnQuarantine)
          .values(
            observations.map((o) => ({
              objectKey: o.key,
              reason: o.reason,
              observedSha256: o.observedSha256,
              expectedSha256: o.expectedSha256 ?? null,
              firstSeenAt: toColumn(o.seenAt),
              lastSeenAt: toColumn(o.seenAt),
            })),
          )
          .onDuplicateKeyUpdate({
            set: {
              reason: incoming('reason'),
              observedSha256: incoming('observed_sha256'),
              expectedSha256: incoming('expected_sha256'),
              lastSeenAt: incoming('last_seen_at'),
              // ⚠️ `first_seen_at` fica FORA do `set`, e não é esquecimento: é a idade da anomalia.
              // Reescrevê-la a cada ciclo faria toda quarentena parecer recém-aberta, e uma fila
              // parada há semanas ficaria indistinguível de um incidente de agora.
              //
              // `released_at` volta a NULL: reobservar REABRE. Um objeto cuja proveniência regrediu
              // precisa voltar à consulta padrão, senão a liberação vira palavra final sobre um
              // estado que mudou.
              releasedAt: sql`null`,
            },
          });
        return ok(undefined);
      } catch (cause) {
        logStore('record', cause);
        return err('van-quarantine-unavailable');
      }
    },

    release: async (keys, at): Promise<Result<void, VanReturnQuarantineError>> => {
      if (keys.length === 0) return ok(undefined);

      try {
        await db
          .update(finVanReturnQuarantine)
          .set({ releasedAt: toColumn(at) })
          // `IS NULL` preserva o instante da PRIMEIRA liberação. Sem ele, um objeto que passa a
          // aprovar em todo ciclo teria `released_at` reescrito indefinidamente, e o campo diria
          // "liberado agora" para algo resolvido há semanas.
          .where(
            and(
              inArray(finVanReturnQuarantine.objectKey, [...keys]),
              isNull(finVanReturnQuarantine.releasedAt),
            ),
          );
        return ok(undefined);
      } catch (cause) {
        logStore('release', cause);
        return err('van-quarantine-unavailable');
      }
    },

    list: async (
      filter,
    ): Promise<Result<readonly QuarantinedObject[], VanReturnQuarantineError>> => {
      try {
        const base = db.select().from(finVanReturnQuarantine);
        const rows =
          filter?.includeReleased === true
            ? await base.orderBy(finVanReturnQuarantine.objectKey)
            : await base
                .where(isNull(finVanReturnQuarantine.releasedAt))
                .orderBy(finVanReturnQuarantine.objectKey);

        return ok(rows.map(toDomain));
      } catch (cause) {
        logStore('list', cause);
        return err('van-quarantine-unavailable');
      }
    },
  };
};
