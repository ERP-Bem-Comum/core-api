import type { CollaboratorId } from './collaborator-id.ts';
import type { DisableReason } from './disable-reason.ts';

// Eventos do agregado `Collaborator`. PascalCase passado; `occurredAt` injetado.

export type CollaboratorEvent = Readonly<
  | { type: 'CollaboratorRegistered'; collaboratorId: CollaboratorId; occurredAt: Date }
  | { type: 'CollaboratorRegistrationCompleted'; collaboratorId: CollaboratorId; occurredAt: Date }
  | {
      type: 'CollaboratorDeactivated';
      collaboratorId: CollaboratorId;
      disableBy: DisableReason;
      occurredAt: Date;
    }
  | { type: 'CollaboratorReactivated'; collaboratorId: CollaboratorId; occurredAt: Date }
>;
