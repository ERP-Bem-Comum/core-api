/**
 * PARTNERS-CONTRACTOR-READ-PORT — Port de LEITURA (read-only) do contratado,
 * consumível cross-módulo SÓ pela public-api (ADR-0006/ADR-0014).
 *
 * Devolve a PROJEÇÃO plana (`*View`) — nunca o agregado interno. id inexistente →
 * `ok(null)`. Erro de infra → `err('contractor-read-unavailable')` (sem throw
 * cruzando a borda — CA3). Zero escrita (CA2).
 */

import type { Result } from '#src/shared/primitives/result.ts';
import type {
  SupplierView,
  FinancierView,
  CollaboratorView,
  ActView,
} from '#src/modules/partners/public-api/contractor-view.mapper.ts';

export type ContractorReadError = 'contractor-read-unavailable';

export type ContractorReadPort = Readonly<{
  getSupplierView: (id: string) => Promise<Result<SupplierView | null, ContractorReadError>>;
  getFinancierView: (id: string) => Promise<Result<FinancierView | null, ContractorReadError>>;
  getCollaboratorView: (
    id: string,
  ) => Promise<Result<CollaboratorView | null, ContractorReadError>>;
  getActView: (id: string) => Promise<Result<ActView | null, ContractorReadError>>;
  // #FIN-OCR-AUTOFILL-SUPPLIER: resolve um CNPJ (com ou sem máscara) → id do fornecedor CADASTRADO, ou
  // null se o CNPJ é inválido ou não há fornecedor com ele (o financial usa p/ pré-selecionar no OCR).
  // OPCIONAL (aditivo, precedente do AuthUserReadPort): o adapter real provê; doubles de teste podem omitir.
  findSupplierIdByCnpj?: (cnpj: string) => Promise<Result<string | null, ContractorReadError>>;
}>;
