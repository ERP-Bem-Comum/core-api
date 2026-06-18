import { type Result, ok, err } from '../../../../shared/primitives/result.ts';
import { newUuid, isUuidV4 } from '../../../../shared/utils/id.ts';
import type { Brand } from '../../../../shared/primitives/brand.ts';

// Padrão D (module-as-namespace): `import * as StatementTransactionId from './statement-transaction-id.ts'`.

export type StatementTransactionId = Brand<string, 'StatementTransactionId'>;
export type StatementTransactionIdError = 'statement-transaction-id-invalid';

export const generate = (): StatementTransactionId => newUuid() as StatementTransactionId;

export const rehydrate = (
  raw: string,
): Result<StatementTransactionId, StatementTransactionIdError> =>
  isUuidV4(raw) ? ok(raw as StatementTransactionId) : err('statement-transaction-id-invalid');
