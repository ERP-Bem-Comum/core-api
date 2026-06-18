import { type Result, ok, err } from '../../../../shared/primitives/result.ts';
import { newUuid, isUuidV4 } from '../../../../shared/utils/id.ts';
import type { Brand } from '../../../../shared/primitives/brand.ts';

// Padrão D (module-as-namespace): consumir com `import * as BankStatementId from './bank-statement-id.ts'`.

export type BankStatementId = Brand<string, 'BankStatementId'>;
export type BankStatementIdError = 'bank-statement-id-invalid';

export const generate = (): BankStatementId => newUuid() as BankStatementId;

export const rehydrate = (raw: string): Result<BankStatementId, BankStatementIdError> =>
  isUuidV4(raw) ? ok(raw as BankStatementId) : err('bank-statement-id-invalid');
