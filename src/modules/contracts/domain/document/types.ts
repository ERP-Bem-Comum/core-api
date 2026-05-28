/**
 * Tipos do agregado ContractDocument.
 *
 * Origem: handbook/domain_questions/contratos/especificacao-dominio.md §4.3.
 * RN cobertas: RN-AS-01 (assinatura eletrônica registrada),
 * RN-AS-02 (hash + versão + evidências).
 *
 * MVP refined type — apenas `status: 'Active'` neste ticket. Outros estados
 * (LogicallyDeleted, Superseded) entram nos tickets de lifecycle.
 *
 * ASCII puro.
 */

import type { DocumentId } from '../shared/document-id.ts';
import type { ContractId } from '../shared/contract-id.ts';
import type { AmendmentId } from '../shared/amendment-id.ts';
import type { BucketName, StorageKey } from '../../application/ports/document-storage.types.ts';
import type { UserRef } from '../../../../shared/kernel/user-ref.ts';

// ─── DocumentCategory ──────────────────────────────────────────────────────
// Spec §4.3: 8 categorias canônicas em snake_case PT-BR.

export type DocumentCategory =
  | 'signed_contract'
  | 'signed_amendment'
  | 'opinion'
  | 'certificate'
  | 'justification'
  | 'technical_attachment'
  | 'publication'
  | 'other';

// ─── ContractDocument ─────────────────────────────────────────────────────

type ContractDocumentCore = Readonly<{
  id: DocumentId;
  // Parent polimórfico (RN-01: vínculo formal obrigatório)
  parentType: 'Contract' | 'Amendment';
  parentId: ContractId | AmendmentId;
  // Categoria
  categoria: DocumentCategory;
  // Arquivo
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  hashSha256: string; // RN-AS-02: lowercase hex 64 chars
  // Storage (acopla com DocumentStorage port — campos separados, não StorageRef agregado)
  bucket: BucketName;
  storageKey: StorageKey;
  // Assinatura (RN-AS-01)
  signedElectronically: boolean;
  // Versionamento (RN-AS-02)
  version: number; // >= 1
  // Audit trail
  uploadedAt: Date;
  uploadedBy: UserRef;
  // Retenção (RN-11 — exclusão lógica usa este campo no futuro)
  retentionUntil: Date | null;
}>;

/**
 * Refined type: documento ativo.
 */
export type ActiveContractDocument = ContractDocumentCore & Readonly<{ status: 'Active' }>;

/**
 * Refined type: documento excluído logicamente (RN-11).
 *
 * Entregue em `CTR-DOCUMENT-LIFECYCLE-DELETE`. `deletedAt`, `deletedBy` e
 * `deletedReason` são obrigatórios neste subtipo (DO C§29 — optional-as-state
 * vira propriedade do refined type).
 */
export type LogicallyDeletedContractDocument = ContractDocumentCore &
  Readonly<{
    status: 'LogicallyDeleted';
    deletedAt: Date;
    deletedBy: UserRef;
    deletedReason: string;
  }>;

/**
 * Refined type: documento substituido por nova versao (RN-AS-02).
 *
 * Entregue em `CTR-DOCUMENT-LIFECYCLE-SUBSTITUTE`. `supersededByDocumentId`
 * aponta para o documento substituto (nova versao).
 */
export type SupersededContractDocument = ContractDocumentCore &
  Readonly<{
    status: 'Superseded';
    supersededAt: Date;
    supersededBy: UserRef;
    supersededByDocumentId: DocumentId;
  }>;

/**
 * Union discriminado do agregado ContractDocument.
 */
export type ContractDocument =
  | ActiveContractDocument
  | LogicallyDeletedContractDocument
  | SupersededContractDocument;

// ─── Status union (preparação para lifecycle futuro) ─────────────────────────
// Quando lifecycle entrar, este union ganha mais variantes; aqui já reservamos
// o termo `ContractDocumentStatus` para evitar refactor downstream.

export type ContractDocumentStatus = ContractDocument['status'];

// ─── Input do smart constructor ──────────────────────────────────────────────

export type CreateContractDocumentInput = Readonly<{
  id: DocumentId;
  parentType: 'Contract' | 'Amendment';
  parentId: ContractId | AmendmentId;
  categoria: DocumentCategory;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  hashSha256: string;
  bucket: BucketName;
  storageKey: StorageKey;
  signedElectronically: boolean;
  version: number;
  uploadedAt: Date;
  uploadedBy: UserRef;
  retentionUntil: Date | null;
}>;
