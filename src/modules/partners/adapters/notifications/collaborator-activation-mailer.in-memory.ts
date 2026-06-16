/**
 * Adapter InMemory de CollaboratorActivationMailer (módulo partners, #43).
 *
 * Captura os links enviados em `sentLinks` para asserts nos testes W0 (CA1). O auth usa fake
 * inline nos testes; a issue pede explicitamente um InMemory reusável aqui. Sempre ok(). ASCII puro.
 */

import { ok } from '#src/shared/primitives/result.ts';
import type { CollaboratorActivationMailer } from '#src/modules/partners/application/ports/collaborator-activation-mailer.ts';

export type CapturedActivationLink = Readonly<{
  email: string;
  activationUrl: string;
  recipientName: string;
}>;

export type InMemoryCollaboratorActivationMailer = CollaboratorActivationMailer &
  Readonly<{ sentLinks: readonly CapturedActivationLink[]; clear: () => void }>;

export const makeInMemoryCollaboratorActivationMailer =
  (): InMemoryCollaboratorActivationMailer => {
    const sent: CapturedActivationLink[] = [];
    return {
      sentLinks: sent,
      sendActivationLink: async (input) => {
        sent.push({ ...input });
        return ok(undefined);
      },
      clear: () => {
        sent.length = 0;
      },
    };
  };
