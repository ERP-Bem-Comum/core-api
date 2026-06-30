// CTR-NUMBER-PROGRAM — adapter Drizzle do `ProgramReadPort` (read-only, batch).
// SELECT id,name,sigla,program_number WHERE id IN (...). Boundary try/catch → Result.

import { inArray } from 'drizzle-orm';
import process from 'node:process';

import { ok, err } from '../../../../../shared/primitives/result.ts';
import type { ProgramsMysqlHandle } from '../drivers/mysql-driver.ts';
import type { ProgramReadPort, ProgramView } from '../../../application/ports/program-read.ts';

// Handle é leitura — não mutamos. (Drizzle expõe interface internamente mutável.)
export const createDrizzleProgramReadStore = (
  handle: ProgramsMysqlHandle, // eslint-disable-line @typescript-eslint/prefer-readonly-parameter-types
): ProgramReadPort => {
  const { db, schema } = handle;
  return {
    getProgramViews: async (ids) => {
      if (ids.length === 0) return ok(new Map<string, ProgramView>());
      try {
        const rows = await db
          .select({
            id: schema.programs.id,
            name: schema.programs.name,
            sigla: schema.programs.sigla,
            programNumber: schema.programs.programNumber,
          })
          .from(schema.programs)
          .where(inArray(schema.programs.id, [...ids]));
        const map = new Map<string, ProgramView>();
        for (const r of rows) {
          map.set(r.id, {
            id: r.id,
            name: r.name,
            sigla: r.sigla,
            programNumber: r.programNumber,
          });
        }
        return ok(map);
      } catch (cause) {
        process.stderr.write(`[program-read:getProgramViews] ${String(cause)}\n`);
        return err('program-read-unavailable');
      }
    },
  };
};
