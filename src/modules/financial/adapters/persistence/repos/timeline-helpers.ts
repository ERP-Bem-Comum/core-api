// Helper do adapter Drizzle financial — trilha (`fin_document_timeline` + `fin_timeline_field_changes`).
//
// `appendTimelineInTx(tx, entries)` grava as entries DENTRO de uma transação já aberta pelo
// chamador: a trilha é síncrona, e o marco existe se e somente se a mudança de estado que ele narra
// foi persistida. Molde do `appendFinOutboxInTx`. No-op com lista vazia (`values([])` é erro do
// builder, não insert vazio).
import type { FinancialTimelineEntry } from '../../../domain/timeline/types.ts';
import type { FinancialMysqlHandle } from '../drivers/mysql-driver.ts';
import { mapEntryToRows } from '../mappers/timeline.mapper.ts';
import { finDocumentTimeline, finTimelineFieldChanges } from '../schemas/mysql.ts';

export const appendTimelineInTx = async (
  // eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
  tx: { insert: FinancialMysqlHandle['db']['insert'] },
  entries: readonly FinancialTimelineEntry[],
): Promise<void> => {
  if (entries.length === 0) return;
  const mapped = entries.map(mapEntryToRows);
  await tx.insert(finDocumentTimeline).values(mapped.map((m) => m.entryRow));
  const changeRows = mapped.flatMap((m) => [...m.changeRows]);
  if (changeRows.length > 0) await tx.insert(finTimelineFieldChanges).values(changeRows);
};
