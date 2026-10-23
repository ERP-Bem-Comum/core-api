// Validação do CAMINHO da taxonomia contra a árvore do plano (M2 · RN-M2-09/10), compartilhada pela
// conciliação (reclassificação) e pela edição do documento Aprovado (#1057). Uma só definição de
// "caminho válido": duas divergiriam, e a mesma categorização seria aceita por uma tela e recusada
// pela outra.

import { type Result, ok, err } from '../../../shared/primitives/result.ts';
import type { DocumentTaxonomy } from '../domain/document/document.ts';
import {
  BudgetPlanRef,
  CategoryRef,
  CostCenterRef,
  ProgramRef,
  SubcategoryRef,
} from '../domain/shared/refs.ts';
import type { TaxonomyPathError, TaxonomyPathRead } from './ports/taxonomy-path-read.ts';

// Os 5 níveis, sempre os 5. A borda recusa antes de chegar aqui um bloco parcial — meio caminho não
// identifica nó nenhum na árvore do plano, e não há o que validar contra ela.
export type TaxonomyPathInput = Readonly<{
  programRef: string;
  budgetPlanRef: string;
  costCenterRef: string;
  categoryRef: string;
  subcategoryRef: string;
}>;

export type ResolveTaxonomyPathError = 'taxonomy-path-invalid' | TaxonomyPathError;

// O caminho pedido tem de ser o caminho REAL da folha na árvore do plano, e a folha tem de estar viva.
// A subcategoria determina os quatro ancestrais univocamente, então validar é resolver o caminho pela
// folha e conferir se os outros quatro batem — não há combinação a enumerar.
//
// O `active` cobre o M2-10 (nó desativado entre a leitura da tela e a gravação): o caminho existe, mas
// gravá-lo produziria classificação morta, que some do relatório sem ninguém entender por quê.
export const resolveTaxonomyPath = async (
  taxonomyPaths: TaxonomyPathRead,
  input: TaxonomyPathInput,
): Promise<Result<DocumentTaxonomy, ResolveTaxonomyPathError>> => {
  const pathR = await taxonomyPaths.findPathBySubcategory(input.subcategoryRef);
  if (!pathR.ok) return err(pathR.error);
  const path = pathR.value;
  if (path?.active !== true) return err('taxonomy-path-invalid');
  if (
    path.categoryRef !== input.categoryRef ||
    path.costCenterRef !== input.costCenterRef ||
    path.budgetPlanRef !== input.budgetPlanRef ||
    path.programRef !== input.programRef
  ) {
    return err('taxonomy-path-invalid');
  }

  // Formato só depois da árvore: a rehydrate confirma o que o plano já afirmou existir. Um ref que a
  // árvore devolve e o branded recusa é corrupção do lado do plano, e o slug diz isso.
  const program = ProgramRef.rehydrate(input.programRef);
  const budgetPlan = BudgetPlanRef.rehydrate(input.budgetPlanRef);
  const costCenter = CostCenterRef.rehydrate(input.costCenterRef);
  const category = CategoryRef.rehydrate(input.categoryRef);
  const subcategory = SubcategoryRef.rehydrate(input.subcategoryRef);
  if (!program.ok || !budgetPlan.ok || !costCenter.ok || !category.ok || !subcategory.ok) {
    return err('taxonomy-path-invalid');
  }

  return ok({
    programRef: program.value,
    budgetPlanRef: budgetPlan.value,
    costCenterRef: costCenter.value,
    categoryRef: category.value,
    subcategoryRef: subcategory.value,
  });
};
