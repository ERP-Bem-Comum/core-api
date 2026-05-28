/**
 * Mapper read-model `TimelineEntry` → DTO de resposta da borda HTTP.
 *
 * Serializa `Date` → ISO 8601; os branded strings (`contractId`, `actor`,
 * `subjectAmendmentId`) saem como string crua. Não traduz `kind` para PT-BR —
 * rótulo é responsabilidade do formatter, fora desta camada.
 */

import type { TimelineEntry } from '../../domain/timeline/types.ts';
import type { TimelineEntryDto } from './schemas.ts';

export const timelineEntryToDto = (e: TimelineEntry): TimelineEntryDto => ({
  eventId: e.eventId,
  contractId: e.contractId,
  kind: e.kind,
  occurredAt: e.occurredAt.toISOString(),
  actor: e.actor,
  subjectAmendmentId: e.subjectAmendmentId,
});
