// Barrel — agrupa os 3 branded UUIDs do módulo Financial.
//
// Reexporta tipos com nome original e funções com prefixo do VO. Padrão D
// não permite `import * as` apoiando 3 namespaces colidindo num mesmo
// barrel — por isso o barrel só expõe funções com nome prefixado.
//
// Para consumir as funções no estilo namespace original, importe direto do
// módulo fragmentado:
//   import * as PayableId from './payable-id.ts';
//   PayableId.generate(); PayableId.rehydrate(raw);
//
// Para apenas tipos, este barrel é confortável:
//   import type { PayableId, RemittanceId, BankTransactionId } from './ids.ts';
//
// Padrão consistente com `src/modules/contracts/domain/shared/ids.ts`.

export type { PayableId, PayableIdError } from './payable-id.ts';
export type { RemittanceId, RemittanceIdError } from './remittance-id.ts';
export type { BankTransactionId, BankTransactionIdError } from './bank-transaction-id.ts';

export { generate as payableIdGenerate, rehydrate as payableIdRehydrate } from './payable-id.ts';

export {
  generate as remittanceIdGenerate,
  rehydrate as remittanceIdRehydrate,
} from './remittance-id.ts';

export {
  generate as bankTransactionIdGenerate,
  rehydrate as bankTransactionIdRehydrate,
} from './bank-transaction-id.ts';
