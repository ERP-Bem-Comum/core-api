import { type Result, ok, err } from '#src/shared/primitives/result.ts';
import { newUuid, isUuidV4 } from '#src/shared/utils/id.ts';
import type { Brand } from '#src/shared/primitives/brand.ts';

// Padrão D (entrevista 0001 §B DO§8): module-as-namespace.
// Consumir com `import * as FinancierId from './financier-id.ts'`.
//
// Identificador interno do agregado `Financier`. O espelho rehydrate-only para
// outros módulos é `FinancierRef` em partners/public-api/refs.ts (ADR-0031 §7).

export type FinancierId = Brand<string, 'FinancierId'>;
export type FinancierIdError = 'financier-id-invalid';

export const generate = (): FinancierId => newUuid() as FinancierId;

export const rehydrate = (raw: string): Result<FinancierId, FinancierIdError> =>
  isUuidV4(raw) ? ok(raw as FinancierId) : err('financier-id-invalid');
