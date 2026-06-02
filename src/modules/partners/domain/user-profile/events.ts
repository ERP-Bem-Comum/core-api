import type { UserRef } from '#src/shared/kernel/user-ref.ts';
import type { CollaboratorId } from '#src/modules/partners/domain/collaborator/collaborator-id.ts';

// Eventos do agregado `UserProfile`. PascalCase passado; `occurredAt` injetado.
// Sem outbox nesta fase (não publica cross-módulo — YAGNI).

export type UserProfileEvent = Readonly<
  | { type: 'UserProfileCreated'; userRef: UserRef; occurredAt: Date }
  | { type: 'UserProfileContactUpdated'; userRef: UserRef; occurredAt: Date }
  | {
      type: 'UserProfileCollaboratorLinked';
      userRef: UserRef;
      collaboratorRef: CollaboratorId;
      occurredAt: Date;
    }
>;
