import { type Result, ok, err } from '../../../../shared/primitives/result.ts';
import { newUuid, isUuidV4 } from '../../../../shared/utils/id.ts';
import type { Brand } from '../../../../shared/primitives/brand.ts';

// Padrão D (entrevista 0001 §B DO§8): module-as-namespace.
// Consumir com `import * as ContractId from './contract-id.ts'`.

export type ContractId = Brand<string, 'ContractId'>;
export type ContractIdError = 'contract-id-invalid';

export const generate = (): ContractId => newUuid() as ContractId;

export const rehydrate = (raw: string): Result<ContractId, ContractIdError> =>
  isUuidV4(raw) ? ok(raw as ContractId) : err('contract-id-invalid');
