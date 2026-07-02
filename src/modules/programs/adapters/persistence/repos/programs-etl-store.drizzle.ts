// Adapter Drizzle do LegacyEntityStore do agregado Program (modulo programs).
//
// Persistencia ciente de legacy_id para a ETL (PROGRAMS-ETL-WRITE-PORT). Semantica de INSERT
// idempotente (skip-by-legacy_id), NUNCA UPDATE (re-run nao sobrescreve):
//   findByLegacyId: SELECT id WHERE legacy_id=? (prg_programs_legacy_id_idx UNIQUE, type=const).
//   provision:      transacao — SELECT FOR UPDATE by legacy_id; se existe -> skip ('already-exists');
//                   senao INSERT { ...programToInsert(program), legacyId } ('created').
//                   ER_DUP_ENTRY em prg_programs_legacy_id_idx (corrida) -> 'already-exists'.
//
// ADR-0020: sem ON DUPLICATE KEY. ADR-0014: so prg_*. Boundary: try/catch -> Result.
// Espelha src/modules/partners/adapters/persistence/repos/partners-etl-store.drizzle.ts.
//
// Nota (desvio vs partners): o partners store recebe um `clock` e o passa a `<x>ToInsert(agg, now)`.
// Aqui `programToInsert(program)` ja embute createdAt/updatedAt do proprio agregado (derivados das
// datas legadas no mapper), entao NAO precisamos de clock — a assinatura fica so `(handle)`.

import { eq } from 'drizzle-orm';
import process from 'node:process';

import { type Result, ok, err } from '../../../../../shared/primitives/result.ts';
import type {
  LegacyEntityStore,
  ProgramsEtlStoreError,
  ProvisionOutcome,
} from '../../../application/ports/legacy-entity-store.ts';
import type { ProgramsMysqlHandle } from '../drivers/mysql-driver.ts';
import * as ProgramId from '../../../domain/shared/program-id.ts';
import type { Program } from '../../../domain/program/types.ts';
import { programToInsert } from '../mappers/program.mapper.ts';

// Serializacao defensiva para o stderr: Error -> message + errno/code/sqlMessage do mysql2 quando
// presentes; objeto -> JSON; resto -> String. (Evita '[object Object]' e mantem errno/sqlMessage.)
const describeCause = (cause: unknown): string => {
  if (cause instanceof Error) {
    const obj = cause as unknown as Record<string, unknown>;
    const errno = obj['errno'];
    const code = obj['code'];
    const sqlMessage = obj['sqlMessage'];
    const extras: string[] = [];
    if (typeof errno === 'number') extras.push(`errno=${errno}`);
    if (typeof code === 'string') extras.push(`code=${code}`);
    if (typeof sqlMessage === 'string') extras.push(`sqlMessage=${sqlMessage}`);
    return extras.length > 0 ? `${cause.message} (${extras.join(' ')})` : cause.message;
  }
  if (typeof cause === 'object' && cause !== null) {
    try {
      return JSON.stringify(cause);
    } catch {
      return Object.prototype.toString.call(cause);
    }
  }
  return String(cause);
};

const log = (ctx: string, cause: unknown): void => {
  // .cause carrega o errno/sqlMessage real do mysql2 embrulhado pelo DrizzleQueryError; sem ele o
  // diagnostico perde o errno. PII (valor duplicado no sqlMessage) e aceitavel SO no stderr efemero.
  const nested =
    cause instanceof Error && cause.cause !== undefined
      ? ` | cause: ${describeCause(cause.cause)}`
      : '';
  process.stderr.write(`[programs-etl-store:${ctx}] ${describeCause(cause)}${nested}\n`);
};

// Classe de erro de provision derivada do erro do mysql2 (eventualmente aninhado em .cause via
// DrizzleQueryError). PII-free: e um literal fixo, jamais o valor duplicado do sqlMessage.
export type ProvisionErrorClass = 'already-exists' | 'integrity-violation' | 'unavailable';

// Extrai o nome do indice citado por um ER_DUP_ENTRY (`... for key 'NOME'`), ou null.
const dupEntryIndexName = (cause: unknown): string | null => {
  const candidates: unknown[] = [cause];
  if (cause instanceof Error && cause.cause !== undefined) candidates.push(cause.cause);
  for (const c of candidates) {
    if (typeof c === 'object' && c !== null) {
      const obj = c as Record<string, unknown>;
      const sqlMessage = obj['sqlMessage'];
      if (obj['errno'] === 1062 && typeof sqlMessage === 'string') {
        const match = /for key '([^']+)'/.exec(sqlMessage);
        if (match?.[1] !== undefined) return match[1];
      }
    }
  }
  return null;
};

// Classifica o erro de provision SEM tocar MySQL (testavel). Regras:
//   1062 em <legacyIdIndex>            -> 'already-exists'      (idempotencia ETL; preservado)
//   1062 em outra UNIQUE prg_*         -> 'integrity-violation' (dado do legado, NAO infra)
//   demais (nao-1062, PRIMARY, opaco)  -> 'unavailable'         (infra; conservador)
//
// Obs.: as UNIQUE de dado do programs terminam em `_uq` (prg_programs_number_uq / _sigla_uq), nao
// em `_idx` como no partners; por isso classificamos por prefixo `prg_` (PRIMARY nao casa o prefixo).
export const classifyProvisionError = (
  cause: unknown,
  legacyIdIndex: string,
): ProvisionErrorClass => {
  const indexName = dupEntryIndexName(cause);
  if (indexName === null) return 'unavailable';
  if (indexName === legacyIdIndex) return 'already-exists';
  if (indexName.startsWith('prg_')) return 'integrity-violation';
  return 'unavailable';
};

const safe = async <T>(
  ctx: string,
  op: () => Promise<T>,
): Promise<Result<T, ProgramsEtlStoreError>> => {
  try {
    return ok(await op());
  } catch (cause) {
    log(ctx, cause);
    return err('programs-etl-store-unavailable');
  }
};

const runProvision = async (
  ctx: string,
  legacyIdIndex: string,
  body: () => Promise<ProvisionOutcome>,
): Promise<Result<ProvisionOutcome, ProgramsEtlStoreError>> => {
  try {
    return ok(await body());
  } catch (cause) {
    const klass = classifyProvisionError(cause, legacyIdIndex);
    switch (klass) {
      case 'already-exists':
        return ok('already-exists');
      case 'integrity-violation':
        log(ctx, cause);
        return err('programs-etl-store-integrity-violation');
      case 'unavailable':
        log(ctx, cause);
        return err('programs-etl-store-unavailable');
    }
  }
};

export const createDrizzleProgramsEtlStores = (
  handle: ProgramsMysqlHandle, // eslint-disable-line @typescript-eslint/prefer-readonly-parameter-types
): Readonly<{
  programs: LegacyEntityStore<Program, ProgramId.ProgramId>;
}> => {
  const { db, schema } = handle;

  const programs: LegacyEntityStore<Program, ProgramId.ProgramId> = {
    findByLegacyId: async (legacyId) =>
      safe('programs.findByLegacyId', async () => {
        const rows = await db
          .select({ id: schema.programs.id })
          .from(schema.programs)
          .where(eq(schema.programs.legacyId, legacyId));
        const row = rows[0];
        if (row === undefined) return null;
        const ref = ProgramId.rehydrate(row.id);
        if (!ref.ok) throw new Error(`legacy_id ${legacyId}: id corrompido (${row.id})`);
        return ref.value;
      }),
    provision: async (program, legacyId) =>
      runProvision('programs.provision', 'prg_programs_legacy_id_idx', async () => {
        let outcome: ProvisionOutcome = 'created';
        await db.transaction(async (tx) => {
          const existing = await tx
            .select({ id: schema.programs.id })
            .from(schema.programs)
            .where(eq(schema.programs.legacyId, legacyId))
            .for('update');
          if (existing.length > 0) {
            outcome = 'already-exists';
            return;
          }
          await tx.insert(schema.programs).values({ ...programToInsert(program), legacyId });
        });
        return outcome;
      }),
  };

  return { programs };
};
