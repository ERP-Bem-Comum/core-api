import type { ProgramsModuleEvent } from '#src/modules/programs/public-api/events.ts';
import type { ProgramsMysqlHandle } from '../drivers/mysql-driver.ts';
import type * as schema from '../schemas/mysql.ts';
import { eventToOutboxInsert } from '../mappers/outbox.mapper.ts';

// Append no outbox DENTRO da transação do save (state + outbox atômicos, ADR-0015).
// Lança (não retorna Result) para que o callback de db.transaction faça rollback;
// o safe() do repo pai captura. `tx` aceita o db OU uma transação (estrutural via .insert).
export const appendOutboxInTx = async (
  // eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
  tx: { insert: ProgramsMysqlHandle['db']['insert'] },
  // eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
  schemaArg: typeof schema,
  events: readonly ProgramsModuleEvent[],
): Promise<void> => {
  if (events.length === 0) return;
  const now = new Date();
  const inserts = events.map((event) => eventToOutboxInsert(event, now));
  await tx.insert(schemaArg.prgOutbox).values(inserts);
};
