import { type Result, ok } from '../../../../../shared/primitives/result.ts';
import type {
  TaxonomyPath,
  TaxonomyPathError,
  TaxonomyPathRead,
} from '../../../application/ports/taxonomy-path-read.ts';

// Fake do `TaxonomyPathRead` para o driver `memory` e para os testes de borda. Recebe os caminhos
// prontos e indexa pela folha — a mesma unicidade que a árvore do plano garante fisicamente.
//
// ⚠️ Sem caminho registrado, TODA folha resolve `null` e a reclassificação é recusada por caminho
// inválido. É o default seguro e deliberado: um fake permissivo faria o teste de contrato passar
// justamente no caso que a RN-M2-09 existe para barrar.
export const createInMemoryTaxonomyPathRead = (
  paths: readonly TaxonomyPath[] = [],
): TaxonomyPathRead => {
  const byLeaf = new Map<string, TaxonomyPath>(paths.map((p) => [p.subcategoryRef, p]));
  return {
    findPathBySubcategory: async (
      subcategoryRef: string,
    ): Promise<Result<TaxonomyPath | null, TaxonomyPathError>> =>
      ok(byLeaf.get(subcategoryRef) ?? null),
  };
};
