import { type Result, ok, err } from '#src/shared/primitives/result.ts';
import { newUuid, isUuidV4 } from '#src/shared/utils/id.ts';
import type { Brand } from '#src/shared/primitives/brand.ts';

// Padrão D: `import * as SupplierId from './supplier-id.ts'`.
// Espelho rehydrate-only para outros módulos: `SupplierRef` em public-api/refs.ts.

export type SupplierId = Brand<string, 'SupplierId'>;
export type SupplierIdError = 'supplier-id-invalid';

export const generate = (): SupplierId => newUuid() as SupplierId;

export const rehydrate = (raw: string): Result<SupplierId, SupplierIdError> =>
  isUuidV4(raw) ? ok(raw as SupplierId) : err('supplier-id-invalid');
