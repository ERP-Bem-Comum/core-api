import type { ContractId, AmendmentId } from '../shared/ids.ts';
import type { UserRef } from '../../../../shared/kernel/user-ref.ts';
import type { ContractEvent } from '../contract/events.ts';
import type { AmendmentEvent } from '../amendment/events.ts';
import type { DocumentEvent } from '../document/events.ts';

// Read-model da Timeline (ADR-0022). NÃO é agregado — é projeção derivada do stream
// de eventos. União montada a partir dos eventos de DOMÍNIO (sem depender do union
// de application `ContractsModuleEvent`, que é estruturalmente idêntico).
export type TimelineSourceEvent = ContractEvent | AmendmentEvent | DocumentEvent;

// `kind` em EN (discriminador). O rótulo PT-BR é responsabilidade do formatter (pass 2).
export type TimelineEntryKind = TimelineSourceEvent['type'];

export type TimelineEntry = Readonly<{
  eventId: string;
  contractId: ContractId;
  kind: TimelineEntryKind;
  occurredAt: Date;
  // `actor` é best-effort: só os eventos que carregam UserRef o preenchem. Trilha
  // completa de "Quem" depende de identidade/RBAC (Inquiry-0018, diferida).
  actor: UserRef | null;
  // Amendment a que o marco se refere (quando aplicável) — também é o que popula o
  // índice amendmentId→contractId usado para resolver eventos sem contractId direto.
  subjectAmendmentId: AmendmentId | null;
}>;
