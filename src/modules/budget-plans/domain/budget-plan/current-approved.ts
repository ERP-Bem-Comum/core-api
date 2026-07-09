import type { BudgetPlan } from './types.ts';

// Vigência por família (US5 — decisão Gabriel 2026-07-09): o Consolidado ABC agrega a versão
// APROVADA MAIS RECENTE de cada família (year × programRef), não a raiz. Como a promoção da US4 é
// semântica-limpa (aprovar o filho NÃO rebaixa o pai — ambos ficam APROVADO), a raiz vira histórica
// e a vigente é o descendente aprovado de maior versão. Alocação de versão (US4): cada calibração/
// cenário nasce do MAX major da família +1 — logo maior versão == mais recente == vigente.
//
// Função pura sobre uma coleção já filtrada para APROVADO. Uma família = um (year, programRef)
// (unicidade da raiz garante um só root por par; toda a árvore compartilha year+programRef).

const familyKey = (plan: BudgetPlan): string => `${plan.year}::${String(plan.programRef)}`;

const isNewer = (candidate: BudgetPlan, incumbent: BudgetPlan): boolean =>
  candidate.version.major !== incumbent.version.major
    ? candidate.version.major > incumbent.version.major
    : candidate.version.minor > incumbent.version.minor;

const byIdAsc = (a: BudgetPlan, b: BudgetPlan): number =>
  String(a.id) < String(b.id) ? -1 : String(a.id) > String(b.id) ? 1 : 0;

export const selectCurrentApprovedByFamily = (
  plans: readonly BudgetPlan[],
): readonly BudgetPlan[] => {
  const currentByFamily = new Map<string, BudgetPlan>();
  for (const plan of plans) {
    const key = familyKey(plan);
    const incumbent = currentByFamily.get(key);
    if (incumbent === undefined || isNewer(plan, incumbent)) {
      currentByFamily.set(key, plan);
    }
  }
  return [...currentByFamily.values()].toSorted(byIdAsc);
};
