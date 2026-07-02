/**
 * reader.ts — leitura do MySQL efêmero via `mysql2` (SELECT-only).
 *
 * Conecta como `etl_ro` (GRANT SELECT, native auth), faz `SELECT *` por entidade e
 * decodifica cada linha (`decode.ts`). Linhas que falham o decode viram quarentena
 * (carregam o `id` legado + motivos). `connection.end()` garantido em `finally`.
 */

import type { RowDataPacket } from 'mysql2/promise';
import { connectReadonly } from './connect.ts';
import {
  decodeProgramRow,
  decodeFinancierRow,
  decodeSupplierRow,
  decodeCollaboratorRow,
  decodeUserRow,
} from './decode.ts';
import type {
  LegacyProgramRow,
  LegacyFinancierRow,
  LegacySupplierRow,
  LegacyCollaboratorRow,
  LegacyUserRow,
} from './rows.ts';
import type { QuarantineReason } from '../quarantine/reason.ts';
import type { Result } from '#src/shared/primitives/result.ts';

export type DecodeFailure = Readonly<{
  legacyId: unknown;
  errors: readonly QuarantineReason[];
}>;

export type TableRead<T> = Readonly<{ rows: readonly T[]; failures: readonly DecodeFailure[] }>;

export type LegacyData = Readonly<{
  programs: TableRead<LegacyProgramRow>;
  financiers: TableRead<LegacyFinancierRow>;
  suppliers: TableRead<LegacySupplierRow>;
  collaborators: TableRead<LegacyCollaboratorRow>;
  users: TableRead<LegacyUserRow>;
}>;

const decodeAll = <T>(
  raws: readonly Readonly<Record<string, unknown>>[],
  decode: (raw: Readonly<Record<string, unknown>>) => Result<T, readonly QuarantineReason[]>,
): TableRead<T> => {
  const rows: T[] = [];
  const failures: DecodeFailure[] = [];
  for (const record of raws) {
    const d = decode(record);
    if (d.ok) rows.push(d.value);
    else failures.push({ legacyId: record['id'], errors: d.error });
  }
  return { rows, failures };
};

/** Conecta como SELECT-only, lê as 4 entidades + decodifica. `end()` garantido. */
export const readLegacyData = async (): Promise<LegacyData> => {
  const conn = await connectReadonly();
  try {
    const select = async (table: string): Promise<readonly Readonly<Record<string, unknown>>[]> => {
      const [raws] = await conn.query<RowDataPacket[]>(`SELECT * FROM \`${table}\``);
      return raws;
    };
    return {
      programs: decodeAll(await select('programs'), decodeProgramRow),
      financiers: decodeAll(await select('financiers'), decodeFinancierRow),
      suppliers: decodeAll(await select('suppliers'), decodeSupplierRow),
      collaborators: decodeAll(await select('collaborators'), decodeCollaboratorRow),
      users: decodeAll(await select('users'), decodeUserRow),
    };
  } finally {
    await conn.end().catch(() => {
      /* fechamento best-effort */
    });
  }
};
