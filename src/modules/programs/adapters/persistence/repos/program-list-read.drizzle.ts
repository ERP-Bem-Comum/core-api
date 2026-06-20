// Listagem read-only de TODOS os programas (projeção ProgramView), ordenada por programNumber.
// Consumida cross-módulo pelo financeiro (020 · US3) via public-api (ADR-0006) — complementa o
// `program-read.drizzle.ts` (batch por ids) sem alterá-lo. Boundary try/catch → Result.

import { asc } from 'drizzle-orm';
import process from 'node:process';

import { type Result, ok, err } from '../../../../../shared/primitives/result.ts';
import type { ProgramsMysqlHandle } from '../drivers/mysql-driver.ts';
import type { ProgramView, ProgramReadError } from '../../../application/ports/program-read.ts';

export type ProgramListReader = Readonly<{
  listAll: () => Promise<Result<readonly ProgramView[], ProgramReadError>>;
}>;

export const createDrizzleProgramListReader = (
  handle: ProgramsMysqlHandle, // eslint-disable-line @typescript-eslint/prefer-readonly-parameter-types
): ProgramListReader => {
  const { db, schema } = handle;
  return {
    listAll: async (): Promise<Result<readonly ProgramView[], ProgramReadError>> => {
      try {
        const rows = await db
          .select({
            id: schema.programs.id,
            name: schema.programs.name,
            sigla: schema.programs.sigla,
            programNumber: schema.programs.programNumber,
          })
          .from(schema.programs)
          .orderBy(asc(schema.programs.programNumber));
        return ok(
          rows.map((r) => ({
            id: r.id,
            name: r.name,
            sigla: r.sigla,
            programNumber: r.programNumber,
          })),
        );
      } catch (cause) {
        process.stderr.write(`[program-list-read:listAll] ${String(cause)}\n`);
        return err('program-read-unavailable');
      }
    },
  };
};
