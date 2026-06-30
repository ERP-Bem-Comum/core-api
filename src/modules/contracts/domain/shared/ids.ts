// Barrel — fragmentação do antigo `ids.ts` em 4 módulos (CTR-SHARED-VO-CANONICAL CA-5).
//
// Reexporta tipos com nome original e funções com prefixo do VO. Padrão D não
// permite `import * as` apoiando 4 namespaces colidindo num mesmo barrel — por
// isso o barrel só expõe funções com nome prefixado.
//
// Para consumir as funções no estilo namespace original, importe direto do
// módulo fragmentado:
//   import * as ContractId from './contract-id.ts';
//   ContractId.generate(); ContractId.rehydrate(raw);
//
// Para apenas tipos, este barrel é confortável:
//   import type { ContractId, AmendmentId } from './ids.ts';

export type { ContractId, ContractIdError } from './contract-id.ts';
export type { AmendmentId, AmendmentIdError } from './amendment-id.ts';
export type { DocumentId, DocumentIdError } from './document-id.ts';

export { generate as contractIdGenerate, rehydrate as contractIdRehydrate } from './contract-id.ts';

export {
  generate as amendmentIdGenerate,
  rehydrate as amendmentIdRehydrate,
} from './amendment-id.ts';

export { generate as documentIdGenerate, rehydrate as documentIdRehydrate } from './document-id.ts';
