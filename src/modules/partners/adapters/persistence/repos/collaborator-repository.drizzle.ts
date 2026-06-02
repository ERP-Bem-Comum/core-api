// Adapter Drizzle de CollaboratorRepository (módulo partners).
//
//   - findById/findByCpf/findByEmail/list: SELECT + mapper.
//   - save: SELECT-then-UPDATE-or-INSERT (ADR-0020 — sem ON DUPLICATE KEY).
//     UNIQUE `par_collaborators_cpf_idx` → collaborator-cpf-duplicate;
//     UNIQUE `par_collaborators_email_idx` → collaborator-email-duplicate.
//
// ADR-0020: sem ODKU. ADR-0014: só par_*. Boundary: try/catch → Result (zero throw).

import { eq } from 'drizzle-orm';
import process from 'node:process';

import { type Result, ok, err } from '#src/shared/primitives/result.ts';
import type { Clock } from '#src/shared/ports/clock.ts';
import type { Cpf } from '#src/shared/kernel/cpf.ts';
import type {
  CollaboratorRepository,
  CollaboratorRepositoryError,
} from '#src/modules/partners/domain/collaborator/repository.ts';
import type { Collaborator } from '#src/modules/partners/domain/collaborator/types.ts';
import type { CollaboratorId } from '#src/modules/partners/domain/collaborator/collaborator-id.ts';
import type { PartnersMysqlHandle } from '../drivers/mysql-driver.ts';
import {
  collaboratorToInsert,
  collaboratorFromRow,
  type CollaboratorMapperError,
} from '../mappers/collaborator.mapper.ts';
import type { CollaboratorRow } from '../schemas/mysql.ts';

// Discrimina ER_DUP_ENTRY (1062) pelo nome do índice presente no sqlMessage.
const dupEntryIndex = (e: unknown): string | null => {
  const candidates: unknown[] = [e];
  if (e instanceof Error && e.cause !== undefined) candidates.push(e.cause);
  for (const c of candidates) {
    if (typeof c === 'object' && c !== null) {
      const obj = c as Record<string, unknown>;
      if (obj['errno'] === 1062 && typeof obj['sqlMessage'] === 'string') {
        if (obj['sqlMessage'].includes('par_collaborators_cpf_idx')) return 'cpf';
        if (obj['sqlMessage'].includes('par_collaborators_email_idx')) return 'email';
      }
    }
  }
  return null;
};

const logRepo = (scope: string, cause: unknown): void => {
  process.stderr.write(`[partners-collaborator-repo:${scope}] ${String(cause)}\n`);
};

// Mapper error em leitura = dado persistido corrompido → tratamos como infra.
const reconstruct = (
  row: Readonly<CollaboratorRow>,
): Result<Collaborator, CollaboratorRepositoryError> => {
  const mapped = collaboratorFromRow(row);
  if (mapped.ok) return mapped;
  logRepo('mapper', mapped.error satisfies CollaboratorMapperError);
  return err('collaborator-repo-unavailable');
};

export const createDrizzleCollaboratorStore = (
  handle: PartnersMysqlHandle, // eslint-disable-line @typescript-eslint/prefer-readonly-parameter-types
  clock: Clock,
): CollaboratorRepository => {
  const { db, schema } = handle;
  const table = schema.parCollaborators;

  return {
    findById: async (id: CollaboratorId) => {
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
        return err('collaborator-repo-unavailable');
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
        return err('collaborator-repo-unavailable');
      }
    },

    findByEmail: async (email: string) => {
      try {
        const rows = await db.select().from(table).where(eq(table.email, email)).limit(1);
        const row = rows[0];
        return row === undefined ? ok(null) : reconstruct(row);
      } catch (cause) {
        logRepo('findByEmail', cause);
        return err('collaborator-repo-unavailable');
      }
    },

    list: async () => {
      try {
        const rows = await db.select().from(table);
        const out: Collaborator[] = [];
        for (const row of rows) {
          const mapped = reconstruct(row);
          if (!mapped.ok) return mapped;
          out.push(mapped.value);
        }
        return ok(out);
      } catch (cause) {
        logRepo('list', cause);
        return err('collaborator-repo-unavailable');
      }
    },

    save: async (collaborator: Collaborator) => {
      const now = clock.now();
      const row = collaboratorToInsert(collaborator, now);
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
        if (dup === 'cpf') return err('collaborator-cpf-duplicate');
        if (dup === 'email') return err('collaborator-email-duplicate');
        logRepo('save', cause);
        return err('collaborator-repo-unavailable');
      }
    },
  };
};
