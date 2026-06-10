import type { Cnpj } from '#src/shared/kernel/cnpj.ts';
import type { ActId } from './act-id.ts';

// Eventos do agregado `Act` (Acordo de Cooperação Técnica). PascalCase passado;
// `occurredAt` injetado. Sem outbox nesta fase — emitidos, não publicados.

export type ActEvent = Readonly<
  | { type: 'ActRegistered'; actId: ActId; cnpj: Cnpj; occurredAt: Date }
  | { type: 'ActEdited'; actId: ActId; occurredAt: Date }
  | { type: 'ActDeactivated'; actId: ActId; occurredAt: Date }
  | { type: 'ActReactivated'; actId: ActId; occurredAt: Date }
>;
