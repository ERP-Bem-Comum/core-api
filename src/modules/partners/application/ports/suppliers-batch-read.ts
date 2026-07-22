/**
 * PARTNERS-SUPPLIERS-BATCH-READ-PORT (#356) — resolução em lote de fornecedores por
 * ref, para a borda HTTP própria do módulo (`POST /partners/suppliers:batch`, ADR-0049
 * §3 / card #350). Port DEDICADO — não reusa `ContractorReadPort` (que é cross-módulo,
 * consumido por `financial`/`contracts` via `public-api/read.ts`; estendê-lo obrigaria
 * todo fake `ContractorReadPort` de outros módulos a implementar este método).
 *
 * Identidade MÍNIMA (nome/CNPJ/categoria) — NUNCA bancário/PIX (minimização, CA5 do
 * #356). refs existentes → `items`; demais → `missing` (o lote não derruba na ausência
 * de um registro).
 */

import type { Result } from '#src/shared/primitives/result.ts';
import type { ServiceCategory } from '#src/modules/partners/domain/supplier/service-category.ts';

export type SupplierBatchView = Readonly<{
  ref: string;
  name: string;
  taxId: string;
  serviceCategory: ServiceCategory;
}>;

export type SupplierBatchResult = Readonly<{
  items: readonly SupplierBatchView[];
  missing: readonly string[];
}>;

export type SuppliersBatchReadError = 'suppliers-batch-read-unavailable';

export type SuppliersBatchReadPort = Readonly<{
  getSuppliersView: (
    refs: readonly string[],
  ) => Promise<Result<SupplierBatchResult, SuppliersBatchReadError>>;
}>;
