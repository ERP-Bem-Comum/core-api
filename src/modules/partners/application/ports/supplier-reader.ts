/**
 * Port `SupplierReader` — leitura enriquecida do fornecedor para a borda HTTP v1.
 *
 * O agregado `Supplier` não carrega `legacyId`/`createdAt`/`updatedAt` (são da row
 * `par_suppliers`). A borda v1 espelha o schema legado `Supplier`
 * (handbook/legacy_docs/openapi.yaml:2549), que inclui esses campos — daí um read-model
 * que compõe o agregado + metadados de persistência (read-only). Espelha `CollaboratorReader`.
 */

import type { Result } from '#src/shared/primitives/result.ts';
import type { SupplierId } from '#src/modules/partners/domain/supplier/supplier-id.ts';
import type { Supplier } from '#src/modules/partners/domain/supplier/types.ts';

export type SupplierReadRecord = Readonly<{
  supplier: Supplier;
  legacyId: number | null;
  createdAt: Date;
  updatedAt: Date;
}>;

export type SupplierReaderError = 'supplier-read-unavailable';

export type SupplierReader = Readonly<{
  getById: (id: SupplierId) => Promise<Result<SupplierReadRecord | null, SupplierReaderError>>;
  list: () => Promise<Result<readonly SupplierReadRecord[], SupplierReaderError>>;
}>;
