import { and, asc, desc, eq, like, or, sql, type SQL } from 'drizzle-orm';
import { type Result, ok, err } from '#src/shared/primitives/result.ts';
import process from 'node:process';
import type { Program } from '#src/modules/programs/domain/program/types.ts';
import type {
  ProgramRepository,
  ProgramRepositoryError,
  ListProgramsQuery,
  ProgramPage,
} from '#src/modules/programs/domain/program/repository.ts';
import type { ProgramsMysqlHandle } from '../drivers/mysql-driver.ts';
import * as schema from '../schemas/mysql.ts';
import { programToInsert, programFromRow } from '../mappers/program.mapper.ts';
import { appendOutboxInTx } from './outbox-repository.drizzle.ts';

const safe = async <T>(
  ctx: string,
  op: () => Promise<T>,
): Promise<Result<T, ProgramRepositoryError>> => {
  try {
    return ok(await op());
  } catch (cause) {
    process.stderr.write(`[program-repo:${ctx}] ${String(cause)}\n`);
    return err('program-repo-unavailable');
  }
};

const listWhere = (query: ListProgramsQuery): SQL | undefined => {
  const clauses: SQL[] = [];
  if (query.status !== undefined) {
    clauses.push(eq(schema.programs.status, query.status));
  }
  if (query.search !== undefined && query.search.length > 0) {
    const escaped = query.search.replace(/[\\%_]/g, (ch) => `\\${ch}`);
    const pattern = `%${escaped}%`;
    const textMatch = or(like(schema.programs.name, pattern), like(schema.programs.sigla, pattern));
    if (textMatch !== undefined) clauses.push(textMatch);
  }
  return clauses.length === 0 ? undefined : and(...clauses);
};

const mapRows = (
  rows: readonly Readonly<typeof schema.programs.$inferSelect>[],
): readonly Program[] => {
  const items: Program[] = [];
  for (const row of rows) {
    const mapped = programFromRow(row);
    if (!mapped.ok) throw new Error(`program-mapper: ${mapped.error}`);
    items.push(mapped.value);
  }
  return items;
};

// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
export const createDrizzleProgramRepository = (handle: ProgramsMysqlHandle): ProgramRepository => {
  const db = handle.db;

  return {
    findById: async (id) =>
      safe('findById', async () => {
        const rows = await db
          .select()
          .from(schema.programs)
          .where(eq(schema.programs.id, id as unknown as string))
          .limit(1);
        const row = rows[0];
        if (row === undefined) return null;
        const mapped = programFromRow(row);
        if (!mapped.ok) throw new Error(`program-mapper: ${mapped.error}`);
        return mapped.value;
      }),

    findBySigla: async (siglaNormalized) =>
      safe('findBySigla', async () => {
        const rows = await db
          .select()
          .from(schema.programs)
          .where(eq(schema.programs.sigla, siglaNormalized))
          .limit(1);
        const row = rows[0];
        if (row === undefined) return null;
        const mapped = programFromRow(row);
        if (!mapped.ok) throw new Error(`program-mapper: ${mapped.error}`);
        return mapped.value;
      }),

    listPaged: async (query): Promise<Result<ProgramPage, ProgramRepositoryError>> =>
      safe('listPaged', async () => {
        const where = listWhere(query);
        const totalRows = await db
          .select({ total: sql<number>`count(*)` })
          .from(schema.programs)
          .where(where);
        const total = totalRows[0]?.total ?? 0;

        const offset = (query.page - 1) * query.limit;
        const orderBy =
          query.order === 'DESC'
            ? desc(schema.programs.programNumber)
            : asc(schema.programs.programNumber);
        const rows = await db
          .select()
          .from(schema.programs)
          .where(where)
          .orderBy(orderBy)
          .limit(query.limit)
          .offset(offset);

        return { items: mapRows(rows), total };
      }),

    nextProgramNumber: async () =>
      safe('nextProgramNumber', async () => {
        // MAX+1 gerado pela aplicação (ADR-0020: sem AUTO_INCREMENT em domínio).
        // UNIQUE em program_number é a rede de segurança final contra corrida.
        const rows = await db
          .select({ max: sql<number | null>`max(${schema.programs.programNumber})` })
          .from(schema.programs);
        const max = rows[0]?.max ?? 0;
        return max + 1;
      }),

    save: async (program, events) =>
      safe('save', async () => {
        await db.transaction(async (tx) => {
          const row = programToInsert(program);
          const existing = await tx
            .select({ id: schema.programs.id })
            .from(schema.programs)
            .where(eq(schema.programs.id, row.id))
            .for('update');

          if (existing.length > 0) {
            await tx.update(schema.programs).set(row).where(eq(schema.programs.id, row.id));
          } else {
            await tx.insert(schema.programs).values(row);
          }

          await appendOutboxInTx(tx, schema, events);
        });
      }),
  };
};
