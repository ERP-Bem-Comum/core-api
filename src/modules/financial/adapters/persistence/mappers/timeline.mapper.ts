// Mapper row ↔ domínio do read-model FinancialTimelineEntry (módulo Financial).
//
// Padrão: `drizzle-orm-expert §"Templates: Mapper com Result"`.
// Reidratação retorna Result — corrupção de row vira erro tipado, nunca exception
// cruzando a borda (.claude/rules/adapters.md §"Mappers retornam Result<T, E>").
//
// Decisões de mapeamento:
//   - `eventType` → `DocumentEvent['type']`: CHECK de banco garante literais válidos;
//     cast seguro (defesa em profundidade).
//   - `targetKind` → 'Document' | 'Payable': CHECK idem.
//   - `actorRef` → UserRef | null: reidratado via UserRef.rehydrate(); null passado diretamente.
//   - `occurredAt` → Date nativo: Drizzle converte datetime(mode:'date') automaticamente.
//   - `changes` → readonly FieldChange[]: rows filhas agrupadas por entryId no repo.
//   - Serialização (domínio → row): strings atômicas 1FN (ADR-0020); Money = string de centavos;
//     Date = ISO; UUID = string bruta. Nunca JSON.

import { type Result, ok, err } from '../../../../../shared/primitives/result.ts';
import { newUuid } from '../../../../../shared/utils/id.ts';
import * as UserRef from '../../../../../shared/kernel/user-ref.ts';
import type { DocumentId } from '../../../domain/shared/document-id.ts';
import type { PayableId } from '../../../domain/shared/payable-id.ts';
import { TIMELINE_EVENT_TYPES } from '../../../domain/document/events.ts';
import type { TimelineEventType } from '../../../domain/document/events.ts';
import type {
  FieldChange,
  FinancialTimelineEntry,
  TimelineTarget,
} from '../../../domain/timeline/types.ts';
import type {
  TimelineEntryRow,
  NewTimelineEntryRow,
  TimelineFieldChangeRow,
  NewTimelineFieldChangeRow,
} from '../schemas/mysql.ts';

// ─── Erros de mapeamento ──────────────────────────────────────────────────────

export type TimelineMapperError =
  | 'timeline-invalid-entry-id'
  | 'timeline-invalid-event-type'
  | 'timeline-invalid-target-kind'
  | 'timeline-invalid-actor-ref'
  | 'timeline-corrupt-row';

// ─── Tipos exportados para os repos ──────────────────────────────────────────

// Shape de saída da reidratação: entry com suas changes já agrupadas.
export type EntryWithChanges = Readonly<{
  entryRow: Readonly<TimelineEntryRow>;
  changeRows: readonly Readonly<TimelineFieldChangeRow>[];
}>;

// ─── Row → Domínio ────────────────────────────────────────────────────────────

// Conjunto de event types válidos NA TRILHA (`TIMELINE_EVENT_TYPES` — sem `DocumentCancelled`,
// inalcançável por design). Set para O(1) no guard. Uma row com `DocumentCancelled` (barrada pelo
// CHECK do banco) é rejeitada como corrupção → 'timeline-invalid-event-type'.
const VALID_EVENT_TYPES: ReadonlySet<string> = new Set(TIMELINE_EVENT_TYPES);

const isValidEventType = (s: string): s is TimelineEventType => VALID_EVENT_TYPES.has(s);

const mapChangeRow = (row: Readonly<TimelineFieldChangeRow>): FieldChange => ({
  field: row.field,
  before: row.beforeValue ?? null,
  after: row.afterValue ?? null,
});

export const mapRowToTimelineEntry = (
  input: EntryWithChanges,
): Result<FinancialTimelineEntry, TimelineMapperError> => {
  const { entryRow, changeRows } = input;

  // Validar event_type (CHECK de banco garante, mas defendemos contra corrupção).
  if (!isValidEventType(entryRow.eventType)) {
    return err('timeline-invalid-event-type');
  }

  // Validar target_kind.
  if (entryRow.targetKind !== 'Document' && entryRow.targetKind !== 'Payable') {
    return err('timeline-invalid-target-kind');
  }

  // Reidratar actor (UserRef ou null).
  let actor: UserRef.UserRef | null = null;
  if (entryRow.actorRef !== null) {
    const actorR = UserRef.rehydrate(entryRow.actorRef);
    if (!actorR.ok) return err('timeline-invalid-actor-ref');
    actor = actorR.value;
  }

  // target: DocumentId e PayableId são branded strings — cast seguro pois o banco
  // só armazena UUIDs v4 (CHECK nao existe aqui, mas a escrita sempre gera via newUuid).
  const target: TimelineTarget =
    entryRow.targetKind === 'Document'
      ? { kind: 'Document', id: entryRow.targetId as unknown as DocumentId }
      : { kind: 'Payable', id: entryRow.targetId as unknown as PayableId };

  // documentId: cast seguro (escrito sempre como UUID v4 pelo mapper de escrita).
  const documentId = entryRow.documentId as unknown as DocumentId;

  const changes: readonly FieldChange[] = changeRows.map(mapChangeRow);

  return ok({
    eventId: entryRow.eventId,
    documentId,
    target,
    eventType: entryRow.eventType,
    occurredAt: entryRow.occurredAt,
    actor,
    changes,
  });
};

// ─── Domínio → Rows ──────────────────────────────────────────────────────────

// Produz as rows da entry principal + todas as rows das field changes.
// Cada FieldChange vira uma row em fin_timeline_field_changes (1FN, sem JSON — ADR-0020).
// IDs gerados aqui (newUuid) — o domínio não carrega IDs de rows de persistência.
export type EntryRows = Readonly<{
  entryRow: NewTimelineEntryRow;
  changeRows: readonly NewTimelineFieldChangeRow[];
}>;

export const mapEntryToRows = (entry: FinancialTimelineEntry): EntryRows => {
  // ID da entry na tabela — independente do eventId do domínio.
  const entryId = newUuid();

  const entryRow: NewTimelineEntryRow = {
    id: entryId,
    eventId: entry.eventId,
    // DocumentId e PayableId são branded strings — string literal subjacente.
    documentId: entry.documentId as unknown as string,
    targetKind: entry.target.kind,
    targetId: entry.target.id as unknown as string,
    eventType: entry.eventType,
    occurredAt: entry.occurredAt,
    actorRef: entry.actor !== null ? (entry.actor as unknown as string) : null,
  };

  const changeRows: NewTimelineFieldChangeRow[] = entry.changes.map((change) => ({
    id: newUuid(),
    timelineEntryId: entryId,
    field: change.field,
    beforeValue: change.before,
    afterValue: change.after,
  }));

  return { entryRow, changeRows };
};
