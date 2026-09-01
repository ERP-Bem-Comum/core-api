// Stubs das dependências que a M2 acrescentou ao `confirmReconciliation` (reclassificação da
// taxonomia na conciliação). Vivem aqui, e não copiadas em cada suíte, porque são SEIS os arquivos
// que montam `ConfirmReconciliationDeps` à mão — e seis cópias divergem no dia em que o port mudar.
//
// Os três são inertes de propósito: recusam ou devolvem vazio. Um teste que não exercita a M2 nunca
// passa `taxonomy` no input, então nada disto é chamado; se for chamado, é porque a suíte começou a
// exercitar a reclassificação e deve declarar os seus próprios dublês em vez de herdar um permissivo.

import { ok, err, type Result } from '#src/shared/primitives/result.ts';
import type { PayableDocumentView } from '#src/modules/financial/application/ports/payable-document-view.ts';
import type { TaxonomyPathRead } from '#src/modules/financial/application/ports/taxonomy-path-read.ts';
import type { DocumentRepository } from '#src/modules/financial/domain/document/repository.ts';

export const noDocuments: Pick<DocumentRepository, 'findById'> = {
  findById: () => Promise.resolve(err('document-not-found' as const)),
};

export const noPayableDocs: Pick<PayableDocumentView, 'findByPayableIds'> = {
  findByPayableIds: () => Promise.resolve(ok([])),
};

export const noTaxonomyPaths: TaxonomyPathRead = {
  findPathBySubcategory: () => Promise.resolve(ok(null)),
};

// Espalhável direto no objeto de deps: `{ ...m2DepsStub, reconciliationRepo, … }`.
export const m2DepsStub = {
  documents: noDocuments,
  payableDocs: noPayableDocs,
  taxonomyPaths: noTaxonomyPaths,
} as const;

// Fake que ACEITA um caminho — para as suítes que exercitam a M2 de verdade.
export const taxonomyPathsOf = (
  paths: readonly {
    subcategoryRef: string;
    categoryRef: string;
    costCenterRef: string;
    budgetPlanRef: string;
    programRef: string;
    active: boolean;
  }[],
): TaxonomyPathRead => ({
  findPathBySubcategory: (ref: string): Promise<Result<(typeof paths)[number] | null, never>> =>
    Promise.resolve(ok(paths.find((p) => p.subcategoryRef === ref) ?? null)),
});
