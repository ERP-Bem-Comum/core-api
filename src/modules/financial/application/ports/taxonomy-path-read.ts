// Port de validação do CAMINHO da taxonomia (M2 · RN-M2-09/10). O `financial` guarda os 5 refs como
// identidade OPACA e não conhece a árvore do plano — quem a conhece é o `budget-plans` (ADR-0051).
// Este port é o buraco na parede: declara O QUE o financeiro precisa saber ("este caminho existe e
// está vivo?"), sem nomear quem responde.
//
// Existe um port próprio, em vez de importar o do `budget-plans` direto, porque a regra de dependência
// manda o consumidor definir a interface que consome (`.claude/rules/application.md`). Quem casa os
// dois lados é o adapter `taxonomy-path-read.from-budget-plans.ts`, no composition root — mesmo
// arranjo de `program-read.from-programs.ts`.

import type { Result } from '../../../../shared/primitives/result.ts';

export type TaxonomyPathError = 'taxonomy-path-read-unavailable';

// O caminho resolvido a partir da folha. Os quatro ancestrais são unívocos dado o id da subcategoria.
export type TaxonomyPath = Readonly<{
  subcategoryRef: string;
  categoryRef: string;
  costCenterRef: string;
  budgetPlanRef: string;
  programRef: string;
  // Efetivo (folha ∧ categoria ∧ centro). Caminho existente mas morto é recusado igual (M2-10).
  active: boolean;
}>;

export type TaxonomyPathRead = Readonly<{
  // Folha inexistente → `null`. Ausência é resposta, não falha de infraestrutura.
  findPathBySubcategory: (
    subcategoryRef: string,
  ) => Promise<Result<TaxonomyPath | null, TaxonomyPathError>>;
}>;
