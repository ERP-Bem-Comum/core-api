/**
 * FinancialEtlStore — correlação legado↔novo do módulo financial (ETL-FINANCIAL-WRITER).
 *
 * Espelha o padrão `partners/application/ports/legacy-entity-store.ts`: a idempotência
 * da migração é por `fin_documents.legacy_id` (UNIQUE; migration 0030), NUNCA por
 * `document_number` — o identifierCode legado NÃO é único (37 distintos em 52 payables,
 * evidência em auditoria-transformacoes-legado.md §5).
 *
 * `markDocumentLegacyId` grava a correlação APÓS o documento nascer pelo domínio
 * (saveDocument/saveDraft) — coluna de infra/proveniência, fora do agregado (mesmo
 * racional do created_at; o domínio não conhece legacy_id). O UPDATE é blindado:
 * `WHERE id=? AND legacy_id IS NULL` + affectedRows=1 — nunca sobrescreve correlação
 * existente nem aceita no-op silencioso (W2 issue 4).
 *
 * `findOrphanCandidate` fecha a janela save→mark (W2 issue 1): se um run anterior
 * caiu entre o save e o mark, o documento órfão (legacy_id NULL) é ADOTADO no re-run
 * (match por document_number + supplier_ref) em vez de duplicado.
 */

import type { Result } from '#src/shared/primitives/result.ts';
import type { DocumentStatus } from '#src/modules/financial/domain/document/types.ts';

export type EtlDocumentRef = Readonly<{
  id: string;
  status: DocumentStatus;
  version: number;
}>;

export type FinancialEtlStoreError =
  | 'financial-etl-store-unavailable'
  | 'financial-etl-store-conflict';

export type FinancialEtlStore = Readonly<{
  /** Documento já migrado para este payable legado? null = ainda não. */
  findDocumentByLegacyId: (
    legacyId: number,
  ) => Promise<Result<EtlDocumentRef | null, FinancialEtlStoreError>>;
  /**
   * Órfão de run parcial: documento SEM legacy_id com o mesmo document_number e
   * supplier_ref — candidato a adoção (marcar em vez de criar). null = não há.
   */
  findOrphanCandidate: (
    documentNumber: string,
    supplierRef: string | null,
    grossValueCents: number | null,
  ) => Promise<Result<EtlDocumentRef | null, FinancialEtlStoreError>>;
  /**
   * Grava a correlação em documento ainda NÃO correlacionado. Conflito (legacy_id
   * já marcado, id inexistente ou UNIQUE violado) → 'financial-etl-store-conflict'.
   */
  markDocumentLegacyId: (
    documentId: string,
    legacyId: number,
  ) => Promise<Result<void, FinancialEtlStoreError>>;
}>;
