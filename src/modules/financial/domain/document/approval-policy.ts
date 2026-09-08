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
  // #299: alçada OPT-IN. `limit === null` = sem limite configurado = aprova (regra binária da P.O.);
  // o teto só é enforçado quando o papel tem `approval_limit_cents` definido.
  if (authority.limit !== null && Money.greaterThan(netValue, authority.limit)) {
    return err('approver-limit-exceeded');
  }
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
  const eligible = candidates.filter((c) => c.canApprove);

  // Com teto definido: o de MENOR limite que ainda cobre o líquido — é o que impede escalar ao
  // diretor quando o gerente basta.
  const bounded = eligible.filter(
    (c): c is ApproverAuthority & Readonly<{ limit: Money.Money }> =>
      c.limit !== null && !Money.greaterThan(netValue, c.limit),
  );
  const first = bounded[0];
  if (first !== undefined) {
    return ok(
      bounded.reduce((best, c) => (Money.greaterThan(best.limit, c.limit) ? c : best), first),
    );
  }

  // `limit === null` é SEM TETO (regra binária da #299, enforçada em `checkApprover` acima), logo
  // cobre qualquer líquido e é candidato legítimo. Fica por ÚLTIMO justamente por ser irrestrito:
  // "o menor que basta" o coloca no fim da ordem, nunca fora dela.
  //
  // Excluí-lo — o que o filtro `c.limit !== null` fazia — recusava a criação do documento havendo
  // aprovador apto, e passou a alcançar mais gente quando `maxLimit` deixou de descartar o `null`:
  // quem acumula um papel irrestrito e um com teto agora se projeta como irrestrito, e sumia daqui.
  const unbounded = eligible.find((c) => c.limit === null);
  if (unbounded !== undefined) return ok(unbounded);

  return err(
    candidates.length <= 1 ? 'approver-limit-exceeded' : 'no-approver-with-sufficient-limit',
  );
};
