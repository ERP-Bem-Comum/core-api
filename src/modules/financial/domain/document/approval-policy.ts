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
  | 'approver-limit-exceeded'
  | 'no-approver-with-sufficient-limit';

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

/**
 * US3 (cascata): escolhe o próximo aprovador com alçada suficiente — o de **menor** limite ≥ líquido
 * (empate estável por ordem de entrada). Função pura. Dois erros (decisão 2 do solicitante):
 * sem candidato suficiente e `candidates.length <= 1` (só o indicado / vazio) ⇒ `approver-limit-exceeded`
 * (sem cascata possível, preserva o comportamento do POLICY); `> 1` candidato e nenhum suficiente ⇒
 * `no-approver-with-sufficient-limit`.
 */
export const escalate = (
  netValue: Money.Money,
  candidates: readonly ApproverAuthority[],
): Result<ApproverAuthority, ApprovalError> => {
  const sufficient = candidates.filter(
    (c): c is ApproverAuthority & Readonly<{ limit: Money.Money }> =>
      c.canApprove && c.limit !== null && !Money.greaterThan(netValue, c.limit),
  );
  const first = sufficient[0];
  if (first === undefined) {
    return err(
      candidates.length <= 1 ? 'approver-limit-exceeded' : 'no-approver-with-sufficient-limit',
    );
  }
  return ok(
    sufficient.reduce((best, c) => (Money.greaterThan(best.limit, c.limit) ? c : best), first),
  );
};
