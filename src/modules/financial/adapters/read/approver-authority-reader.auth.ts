/**
 * Adapta o `ApproverAuthorityReadPort` do `auth` (public-api — ADR-0006) → `ApproverAuthorityReader`
 * do financial (FIN-APPROVER-LIMIT-POLICY #289). ACL/estado remoto mínimo (Vernon, "Think
 * Minimalistic", p.158): o financial só conhece `{ userId, canApprove, limitCents }`, nunca o
 * `User`/`Role` internos do auth. `limitCents` é reconstruído em `Money` na fronteira.
 *
 * Falha de leitura do auth (`auth-user-read-unavailable`) ou `Money.fromCents` inválido (defensivo
 * — coluna BIGINT não deveria gerar centavos inválidos) → `approver-authority-unavailable`.
 * Espelha `adapters/http/user-name-composition.ts` (mesma família: adapta o auth read port).
 */

import { type Result, ok, err } from '#src/shared/primitives/result.ts';
import * as Money from '#src/shared/kernel/money.ts';
import type {
  ApproverAuthorityReadPort,
  ApproverAuthorityView,
} from '#src/modules/auth/public-api/read.ts';
import type { ApproverAuthority } from '../../domain/document/approval-policy.ts';
import type {
  ApproverAuthorityReader,
  ApproverAuthorityReadError,
} from '../../application/ports/approver-authority-reader.ts';

const toAuthority = (
  view: ApproverAuthorityView,
): Result<ApproverAuthority, ApproverAuthorityReadError> => {
  if (view.limitCents === null) {
    return ok({ userId: view.userId, canApprove: view.canApprove, limit: null });
  }
  const limit = Money.fromCents(view.limitCents);
  if (!limit.ok) return err('approver-authority-unavailable');
  return ok({ userId: view.userId, canApprove: view.canApprove, limit: limit.value });
};

export const createAuthApproverAuthorityReader = (
  authPort: ApproverAuthorityReadPort,
): ApproverAuthorityReader => ({
  get: async (userId) => {
    const r = await authPort.getApproverAuthority(userId);
    if (!r.ok) return err('approver-authority-unavailable');
    if (r.value === null) return ok(null);
    return toAuthority(r.value);
  },
  list: async () => {
    const r = await authPort.listApproversWithAuthority();
    if (!r.ok) return err('approver-authority-unavailable');
    const out: ApproverAuthority[] = [];
    for (const view of r.value) {
      const mapped = toAuthority(view);
      if (!mapped.ok) return mapped;
      out.push(mapped.value);
    }
    return ok(out);
  },
});
