// Adapter Drizzle do `ProgramCatalogReadPort` (read-only). SELECT id,name,sigla,status
// ordenado por programNumber. Boundary try/catch → Result.

import { asc } from 'drizzle-orm';
import process from 'node:process';

import { type Result, ok, err } from '../../../../../shared/primitives/result.ts';
import type { ProgramsMysqlHandle } from '../drivers/mysql-driver.ts';
import type {
  ProgramCatalogReadPort,
  ProgramCatalogView,
  ProgramCatalogReadError,
} from '../../../application/ports/program-catalog-read.ts';

export const createDrizzleProgramCatalogReader = (
  handle: ProgramsMysqlHandle, // eslint-disable-line @typescript-eslint/prefer-readonly-parameter-types
): ProgramCatalogReadPort => {
  const { db, schema } = handle;
  return {
    listCatalog: async (): Promise<
      Result<readonly ProgramCatalogView[], ProgramCatalogReadError>
    > => {
      try {
        const rows = await db
          .select({
            id: schema.programs.id,
            name: schema.programs.name,
            sigla: schema.programs.sigla,
            status: schema.programs.status,
          })
          .from(schema.programs)
          .orderBy(asc(schema.programs.programNumber));
        return ok(
          rows.map((r) => ({
            ref: r.id,
            name: r.name,
            sigla: r.sigla,
            // CHECK do schema garante o domínio; narrowing defensivo (fail-closed p/ INATIVO).
            status: r.status === 'ATIVO' ? ('ATIVO' as const) : ('INATIVO' as const),
          })),
        );
      } catch (cause) {
        process.stderr.write(`[program-catalog-read:listCatalog] ${String(cause)}\n`);
        return err('program-catalog-read-unavailable');
      }
    },
  };
};
