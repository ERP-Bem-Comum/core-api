/**
 * Port `FinancierReader` — leitura enriquecida do financiador para a borda HTTP v1.
 * Read-model (agregado + legacyId/createdAt/updatedAt da row `par_financiers`). Espelha
 * `SupplierReader`. Schema legado `Financier` (handbook/legacy_docs/openapi.yaml).
 */

import type { Result } from '#src/shared/primitives/result.ts';
import type { FinancierId } from '#src/modules/partners/domain/financier/financier-id.ts';
import type { Financier } from '#src/modules/partners/domain/financier/types.ts';

export type FinancierReadRecord = Readonly<{
  financier: Financier;
  legacyId: number | null;
  createdAt: Date;
  updatedAt: Date;
}>;

export type FinancierReaderError = 'financier-read-unavailable';

export type FinancierReader = Readonly<{
  getById: (id: FinancierId) => Promise<Result<FinancierReadRecord | null, FinancierReaderError>>;
  list: () => Promise<Result<readonly FinancierReadRecord[], FinancierReaderError>>;
}>;
