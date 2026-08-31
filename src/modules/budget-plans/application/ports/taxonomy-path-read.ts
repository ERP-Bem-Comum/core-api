/**
 * BGP-TAXONOMY-PATH-READ — Port de LEITURA (read-only) do CAMINHO da taxonomia, consumível
 * cross-módulo só pela `public-api/read.ts` (ADR-0006/ADR-0014). Open Host Service do papel que o
 * ADR-0051 dá ao budget-plans: a árvore Centro de Custo → Categoria → Subcategoria é **escopada por
 * plano**, e quem sabe dizer qual caminho um nó ocupa é o dono dela.
 *
 * Existe porque o `financial` guarda os 5 refs como identidade OPACA e, na reclassificação da M2,
 * precisa recusar caminho incoerente (RN-M2-09) e caminho morto (RN-M2-10 / M2-10) — sem passar a
 * conhecer `bgp_*`, e sem que a decisão vire um `if` de infraestrutura do lado de lá.
 *
 * Saída PLANA — ids e um booleano, nunca VO nem agregado. A subcategoria é a FOLHA, então ela
 * determina o caminho inteiro: dado o id da folha, os quatro ancestrais são unívocos. Quem compara
 * o caminho resolvido com o caminho pedido é o consumidor: este port informa, não julga.
 *
 * Folha inexistente → `null` (ausência é resposta, não erro). `active` é o EFETIVO (nó ∧ ancestrais),
 * derivado na leitura como manda o #454 gap 3 — desativar um centro derruba a folha inteira sem
 * apagar a intenção de cada nó.
 */

import type { Result } from '../../../../shared/primitives/result.ts';
import type { BudgetPlansReadError } from './planned-amounts-read.ts';

export type TaxonomyPathRow = Readonly<{
  subcategoryRef: string;
  categoryRef: string;
  costCenterRef: string;
  budgetPlanRef: string;
  programRef: string;
  // Efetivo: a folha só está ativa se ela, a categoria e o centro estiverem.
  active: boolean;
}>;

export type TaxonomyPathReadPort = Readonly<{
  findPathBySubcategory: (
    subcategoryRef: string,
  ) => Promise<Result<TaxonomyPathRow | null, BudgetPlansReadError>>;
}>;
