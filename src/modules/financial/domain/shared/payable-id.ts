import { type Result, ok, err } from '#src/shared/primitives/result.ts';
import { newUuid, isUuidV4 } from '#src/shared/utils/id.ts';
import type { Brand } from '#src/shared/primitives/brand.ts';

// Padrão D (entrevista 0001 §B DO§8): module-as-namespace.
// Consumir com `import * as PayableId from './payable-id.ts'`.
//
// Identificador único do agregado `Payable` (Título Financeiro) do BC Títulos
// & Liquidação. handbook/domain/04-titulos-liquidacao-context.md:17 — campo
// `TituloFinanceiro.id: TituloID`.

export type PayableId = Brand<string, 'PayableId'>;
export type PayableIdError = 'payable-id-invalid';

export const generate = (): PayableId => newUuid() as PayableId;

export const rehydrate = (raw: string): Result<PayableId, PayableIdError> =>
  isUuidV4(raw) ? ok(raw as PayableId) : err('payable-id-invalid');
