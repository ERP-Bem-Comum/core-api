// Adapter Drizzle do FinancialTimelineRepository (módulo Financial — read-model Time Travel).
//
// Mecanismo de transação compartilhada (ADR-0001/010, Vernon:3257):
//   `append` é chamado DENTRO do db.transaction do DocumentRepository.save,
//   recebendo a `tx` ativa via `createDrizzleTimelineRepository(tx)`.
//   Dessa forma, entry + changes são gravados na MESMA transação do agregado
//   (SC-004/NFR-001 — rollback atômico inclui a trilha).
//
//   `findByDocument` usa o pool (`db`) — leitura independente fora de transação.
//
// Queries emitidas:
//   append:
//     INSERT INTO fin_document_timeline VALUES (...)  [1 por entry]
//     INSERT INTO fin_timeline_field_changes VALUES (...)  [1 por lote de changes, se > 0]
//   findByDocument:
//     SELECT * FROM fin_document_timeline WHERE document_id = ? ORDER BY occurred_at ASC
//     SELECT * FROM fin_timeline_field_changes WHERE timeline_entry_id IN (...)
//
// ADR-0020: apenas SELECT/INSERT — nenhum UPDATE/DELETE em linhas de trilha.
//   A única remoção é via CASCADE quando fin_documents é hard-deleted (cancelamento).
//
// Boundary: todo try/catch converte para Result. Nenhum Error cruza a borda
//   (.claude/rules/adapters.md §"converter para Result na borda").

import { eq, asc, inArray } from 'drizzle-orm';
import type { MySql2Database } from 'drizzle-orm/mysql2';
import process from 'node:process';

import { type Result, ok, err } from '../../../../../shared/primitives/result.ts';
import type { DocumentId } from '../../../domain/shared/document-id.ts';
import type { FinancialTimelineEntry } from '../../../domain/timeline/types.ts';
import type {
  FinancialTimelineRepository,
  TimelineRepositoryError,
} from '../../../domain/timeline/repository.ts';
import type * as schema from '../schemas/mysql.ts';
import { mapEntryToRows, mapRowToTimelineEntry } from '../mappers/timeline.mapper.ts';

// `DbOrTx` representa tanto o pool raiz quanto uma transação ativa.
// Drizzle expõe ambos sob o mesmo shape de `MySql2Database` — o adapter Drizzle
// aceita ambos sem precisar de overloads.
type DbOrTx = MySql2Database<typeof schema>;

// ─── append (dentro de tx) ───────────────────────────────────────────────────
//
// Chamado pelo DocumentRepository.save com a tx ativa. Grava em batch:
//   - 1 INSERT em fin_document_timeline por entry
//   - 1 INSERT em fin_timeline_field_changes por lote de changes (skip se changes=[])
//
// Entries vazias: skip silencioso (noop bem-sucedido) — o domínio já filtra
// entries sem mudanças de campo em marcos que não alteram nada.
const appendWithDb = async (
  db: DbOrTx, // eslint-disable-line @typescript-eslint/prefer-readonly-parameter-types
  s: typeof schema, // eslint-disable-line @typescript-eslint/prefer-readonly-parameter-types
  entries: readonly FinancialTimelineEntry[],
): Promise<Result<void, TimelineRepositoryError>> => {
  if (entries.length === 0) return ok(undefined);

  try {
    // Mapear todas as entries para rows (entry + changes).
    const mapped = entries.map(mapEntryToRows);

    // INSERT em lote das entry rows (1 round-trip).
    const entryRows = mapped.map((m) => m.entryRow);
    await db.insert(s.finDocumentTimeline).values([...entryRows]);

    // INSERT em lote das change rows — só se houver ao menos 1 change.
    // mysql2 lança ER_PARSE_ERROR se values([]) for chamado — guard obrigatório.
    const changeRows = mapped.flatMap((m) => [...m.changeRows]);
    if (changeRows.length > 0) {
      await db.insert(s.finTimelineFieldChanges).values(changeRows);
    }

    return ok(undefined);
  } catch (cause) {
    process.stderr.write(`[timeline-repo:append] ${String(cause)}\n`);
    return err('timeline-repository-failure');
  }
};

// ─── findByDocument (pool) ───────────────────────────────────────────────────
//
// Lê a trilha de um documento em 2 round-trips:
//   1. SELECT * FROM fin_document_timeline WHERE document_id = ? ORDER BY occurred_at ASC
//   2. SELECT * FROM fin_timeline_field_changes WHERE timeline_entry_id IN (...)
//
// 2 queries em vez de JOIN para evitar produto cartesiano (cada entry pode ter N changes).
// O agrupamento é feito em memória — escala O(entries × changes) que é aceitável
// dado o volume esperado por documento (dezenas de entries).
//
// Ordem final: occurred_at ASC (garantida pela query 1 — não reordenamos em memória).
const findByDocumentWithDb = async (
  db: DbOrTx, // eslint-disable-line @typescript-eslint/prefer-readonly-parameter-types
  s: typeof schema, // eslint-disable-line @typescript-eslint/prefer-readonly-parameter-types
  id: DocumentId,
): Promise<Result<readonly FinancialTimelineEntry[], TimelineRepositoryError>> => {
  try {
    // 1. Buscar entries ordenadas por occurredAt ASC.
    const entryRows = await db
      .select()
      .from(s.finDocumentTimeline)
      .where(eq(s.finDocumentTimeline.documentId, id as unknown as string))
      .orderBy(asc(s.finDocumentTimeline.occurredAt));

    if (entryRows.length === 0) {
      // Documento sem trilha (novo ou inexistente) → retorna lista vazia, não erro.
      // A validação de existência do documento é responsabilidade do use case.
      return ok([]);
    }

    // 2. Buscar todas as changes das entries em um único round-trip (IN clause).
    const entryIds = entryRows.map((r) => r.id);
    const changeRows = await db
      .select()
      .from(s.finTimelineFieldChanges)
      // inArray de drizzle-orm: operators.mdx §"inArray" — emite IN (?,?,?...).
      .where(inArray(s.finTimelineFieldChanges.timelineEntryId, entryIds));

    // 3. Agrupar changes por entryId (Map O(n)).
    const changesByEntry = new Map<string, typeof changeRows>();
    for (const cr of changeRows) {
      const list = changesByEntry.get(cr.timelineEntryId);
      if (list !== undefined) {
        list.push(cr);
      } else {
        changesByEntry.set(cr.timelineEntryId, [cr]);
      }
    }

    // 4. Reidratar entries com suas changes (mapper retorna Result por entry).
    const entries: FinancialTimelineEntry[] = [];
    for (const entryRow of entryRows) {
      const entryChangeRows = changesByEntry.get(entryRow.id) ?? [];
      const mapped = mapRowToTimelineEntry({ entryRow, changeRows: entryChangeRows });
      if (!mapped.ok) {
        process.stderr.write(
          `[timeline-repo:findByDocument:mapper] entry=${entryRow.id} error=${mapped.error}\n`,
        );
        return err('timeline-repository-failure');
      }
      entries.push(mapped.value);
    }

    return ok(entries);
  } catch (cause) {
    process.stderr.write(`[timeline-repo:findByDocument] ${String(cause)}\n`);
    return err('timeline-repository-failure');
  }
};

// ─── Fábricas públicas ────────────────────────────────────────────────────────

// `createDrizzleTimelineRepository`: fábrica padrão (pool) para operações de leitura.
// O `append` aqui também usa o pool — útil apenas em contextos onde a tx já está
// comprometida. O caso normal de escrita usa `createDrizzleTimelineRepositoryForTx`.
export const createDrizzleTimelineRepository = (
  handle: Readonly<{ db: DbOrTx; schema: typeof schema }>, // eslint-disable-line @typescript-eslint/prefer-readonly-parameter-types
): FinancialTimelineRepository => ({
  append: async (entries) => appendWithDb(handle.db, handle.schema, entries),
  findByDocument: async (id) => findByDocumentWithDb(handle.db, handle.schema, id),
});

// `createDrizzleTimelineRepositoryForTx`: fábrica especializada que usa a tx ativa
// para o `append`, garantindo atomicidade com o save do agregado (ADR-0001/010).
// O `findByDocument` usa o mesmo tx para consistência de leitura (REPEATABLE READ).
export const createDrizzleTimelineRepositoryForTx = (
  tx: DbOrTx, // eslint-disable-line @typescript-eslint/prefer-readonly-parameter-types
  s: typeof schema, // eslint-disable-line @typescript-eslint/prefer-readonly-parameter-types
): FinancialTimelineRepository => ({
  append: async (entries) => appendWithDb(tx, s, entries),
  findByDocument: async (id) => findByDocumentWithDb(tx, s, id),
});
