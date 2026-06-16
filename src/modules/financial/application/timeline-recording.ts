// Helper pura-de-aplicação (Imperative Shell — ts-domain-modeler §3.I.5) que carimba
// as duas peças que o Functional Core não conhece — `eventId` (UUID) e `occurredAt`
// (relógio) — e delega a projeção/diff PURA a `projectEntry` (domain/timeline/projection.ts).
//
// Por que aqui e não no domínio: `projectEntry` é puro (ADR-0001) e não conhece relógio
// nem gerador de IDs. O use case (Imperative Shell) injeta `Clock` e usa `newUuid()` para
// produzir os efeitos colaterais determinísticos em testes (ClockFixed) e únicos em prod.

import type { Clock } from '../../../shared/ports/clock.ts';
import { newUuid } from '../../../shared/utils/id.ts';
import type { UserRef } from '../../../shared/kernel/user-ref.ts';
import { projectEntry } from '../domain/timeline/projection.ts';
import type { FinancialTimelineEntry } from '../domain/timeline/types.ts';
import type { Document } from '../domain/document/types.ts';
import type { DocumentEvent } from '../domain/document/events.ts';
import type { Payables } from '../domain/payable/types.ts';

export type BuildTimelineEntriesArgs = Readonly<{
  event: DocumentEvent;
  before: Document | null;
  after: Document;
  payablesBefore: Payables | null;
  payablesAfter: Payables | null;
  actor: UserRef | null;
}>;

// Constrói as entries do marco preenchendo `eventId` e `occurredAt` no momento da escrita.
export const buildTimelineEntries = (
  clock: Clock,
  args: BuildTimelineEntriesArgs,
): readonly FinancialTimelineEntry[] =>
  projectEntry({
    eventId: newUuid(),
    event: args.event,
    before: args.before,
    after: args.after,
    payablesBefore: args.payablesBefore,
    payablesAfter: args.payablesAfter,
    actor: args.actor,
    occurredAt: clock.now(),
  });
