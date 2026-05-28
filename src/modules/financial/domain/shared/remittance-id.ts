import { type Result, ok, err } from '#src/shared/primitives/result.ts';
import { newUuid, isUuidV4 } from '#src/shared/utils/id.ts';
import type { Brand } from '#src/shared/primitives/brand.ts';

// Padrão D (entrevista 0001 §B DO§8): module-as-namespace.
// Consumir com `import * as RemittanceId from './remittance-id.ts'`.
//
// Identificador do arquivo de Remessa CNAB gerado para envio ao banco.
// handbook/domain/04-titulos-liquidacao-context.md:32 —
// `rastreabilidade: { remessaID: string; ... }`.

export type RemittanceId = Brand<string, 'RemittanceId'>;
export type RemittanceIdError = 'remittance-id-invalid';

export const generate = (): RemittanceId => newUuid() as RemittanceId;

export const rehydrate = (raw: string): Result<RemittanceId, RemittanceIdError> =>
  isUuidV4(raw) ? ok(raw as RemittanceId) : err('remittance-id-invalid');
