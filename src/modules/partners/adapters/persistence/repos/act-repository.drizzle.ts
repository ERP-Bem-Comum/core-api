// Adapter Drizzle de ActRepository (módulo partners).
//
//   - findById/findByCpf/findByEmail/list: SELECT + mapper.
//   - save: SELECT-then-UPDATE-or-INSERT (ADR-0020 — sem ON DUPLICATE KEY).
//     UNIQUE `par_acts_cpf_idx` → act-cpf-duplicate;
//     UNIQUE `par_acts_email_idx` → act-email-duplicate.
//
// ADR-0020: sem ODKU. ADR-0014: só par_*. Boundary: try/catch → Result (zero throw).

import { eq } from 'drizzle-orm';
import process from 'node:process';

import { type Result, ok, err } from '#src/shared/primitives/result.ts';
import type { Clock } from '#src/shared/ports/clock.ts';
import type { Cpf } from '#src/shared/kernel/cpf.ts';
import type {
  ActRepository,
  ActRepositoryError,
} from '#src/modules/partners/domain/act/repository.ts';
import type { Act } from '#src/modules/partners/domain/act/types.ts';
import type { ActId } from '#src/modules/partners/domain/act/act-id.ts';
import type { PartnersMysqlHandle } from '../drivers/mysql-driver.ts';
import { actToInsert, actFromRow, type ActMapperError } from '../mappers/act.mapper.ts';
import type { ActRow } from '../schemas/mysql.ts';

// Discrimina ER_DUP_ENTRY (1062) pelo nome do índice presente no sqlMessage.
const dupEntryIndex = (e: unknown): string | null => {
  const candidates: unknown[] = [e];
  if (e instanceof Error && e.cause !== undefined) candidates.push(e.cause);
  for (const c of candidates) {
    if (typeof c === 'object' && c !== null) {
      const obj = c as Record<string, unknown>;
      if (obj['errno'] === 1062 && typeof obj['sqlMessage'] === 'string') {
        if (obj['sqlMessage'].includes('par_acts_cpf_idx')) return 'cpf';
        if (obj['sqlMessage'].includes('par_acts_email_idx')) return 'email';
      }
    }
  }
  return null;
};

const logRepo = (scope: string, cause: unknown): void => {
  process.stderr.write(`[partners-act-repo:${scope}] ${String(cause)}\n`);
};

// Mapper error em leitura = dado persistido corrompido → tratamos como infra.
const reconstruct = (row: Readonly<ActRow>): Result<Act, ActRepositoryError> => {
  const mapped = actFromRow(row);
  if (mapped.ok) return mapped;
  logRepo('mapper', mapped.error satisfies ActMapperError);
  return err('act-repo-unavailable');
};

export const createDrizzleActStore = (
  handle: PartnersMysqlHandle, // eslint-disable-line @typescript-eslint/prefer-readonly-parameter-types
  clock: Clock,
): ActRepository => {
  const { db, schema } = handle;
  const table = schema.parActs;

  return {
    findById: async (id: ActId) => {
      try {
        const rows = await db
          .select()
          .from(table)
          .where(eq(table.id, id as unknown as string))
          .limit(1);
        const row = rows[0];
        return row === undefined ? ok(null) : reconstruct(row);
      } catch (cause) {
        logRepo('findById', cause);
        return err('act-repo-unavailable');
      }
    },

    findByCpf: async (cpf: Cpf) => {
      try {
        const rows = await db
          .select()
          .from(table)
          .where(eq(table.cpf, cpf as unknown as string))
          .limit(1);
        const row = rows[0];
        return row === undefined ? ok(null) : reconstruct(row);
      } catch (cause) {
        logRepo('findByCpf', cause);
        return err('act-repo-unavailable');
      }
    },

    findByEmail: async (email: string) => {
      try {
        const rows = await db.select().from(table).where(eq(table.email, email)).limit(1);
        const row = rows[0];
        return row === undefined ? ok(null) : reconstruct(row);
      } catch (cause) {
        logRepo('findByEmail', cause);
        return err('act-repo-unavailable');
      }
    },

    list: async () => {
      try {
        const rows = await db.select().from(table);
        const out: Act[] = [];
        for (const row of rows) {
          const mapped = reconstruct(row);
          if (!mapped.ok) return mapped;
          out.push(mapped.value);
        }
        return ok(out);
      } catch (cause) {
        logRepo('list', cause);
        return err('act-repo-unavailable');
      }
    },

    save: async (act: Act) => {
      const now = clock.now();
      const row = actToInsert(act, now);
      try {
        const existing = await db
          .select({ id: table.id })
          .from(table)
          .where(eq(table.id, row.id))
          .limit(1);

        if (existing.length > 0) {
          const { createdAt: _createdAt, ...rest } = row;
          await db
            .update(table)
            .set({ ...rest, updatedAt: now })
            .where(eq(table.id, row.id));
        } else {
          await db.insert(table).values(row);
        }
        return ok(undefined);
      } catch (cause) {
        const dup = dupEntryIndex(cause);
        if (dup === 'cpf') return err('act-cpf-duplicate');
        if (dup === 'email') return err('act-email-duplicate');
        logRepo('save', cause);
        return err('act-repo-unavailable');
      }
    },
  };
};
