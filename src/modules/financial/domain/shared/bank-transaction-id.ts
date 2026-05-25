import { type Result, ok, err } from '#src/shared/primitives/result.ts';
import { newUuid, isUuidV4 } from '#src/shared/utils/id.ts';
import type { Brand } from '#src/shared/primitives/brand.ts';

// Padrão D (entrevista 0001 §B DO§8): module-as-namespace.
// Consumir com `import * as BankTransactionId from './bank-transaction-id.ts'`.
//
// Identificador interno do registro `BankTransaction` (transação importada
// de extrato OFX/CNAB/XLSX/PDF). Distinto de `FITID` — FITID é o ID dado
// pelo banco; BankTransactionId é o ID que o sistema atribui ao persistir
// a transação no BC Integração Bancária.
// handbook/domain/05-integracao-bancaria-context.md:29 — entidade
// `TransacaoBancaria`.

export type BankTransactionId = Brand<string, 'BankTransactionId'>;
export type BankTransactionIdError = 'bank-transaction-id-invalid';

export const generate = (): BankTransactionId => newUuid() as BankTransactionId;

export const rehydrate = (raw: string): Result<BankTransactionId, BankTransactionIdError> =>
  isUuidV4(raw) ? ok(raw as BankTransactionId) : err('bank-transaction-id-invalid');
