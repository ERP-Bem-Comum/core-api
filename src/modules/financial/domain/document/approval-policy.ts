import { type Result, ok, err } from '../../../../shared/primitives/result.ts';
import * as Money from '../../../../shared/kernel/money.ts';

// Projeção mínima da autoridade de aprovação lida do `auth` (ACL — `limit` reconstruído de
// `limitCents` na fronteira). FIN-APPROVER-LIMIT-POLICY (#289).
export type ApproverAuthority = Readonly<{
  userId: string;
  canApprove: boolean;
  limit: Money.Money | null;
}>;

export type ApprovalError =
  | 'approver-not-found'
  | 'approver-missing-permission'
  | 'approver-limit-exceeded';

/**
 * Valida o aprovador indicado contra o valor líquido do documento (US1). Função pura.
 * `escalate`/cascata (próximo aprovador com alçada suficiente) é o ticket CASCADE.
 */
export const checkApprover = (
  netValue: Money.Money,
  authority: ApproverAuthority | null,
): Result<void, ApprovalError> => {
  if (authority === null) return err('approver-not-found');
  if (!authority.canApprove) return err('approver-missing-permission');
  // FR-008 fail-closed: aprovador sem alçada definida não aprova nada.
  if (authority.limit === null) return err('approver-limit-exceeded');
  if (Money.greaterThan(netValue, authority.limit)) return err('approver-limit-exceeded');
  return ok(undefined);
};
