/**
 * Public API do módulo Contratos.
 *
 * Outros módulos (ex.: Financeiro futuro) importam APENAS daqui.
 * Nunca importar de `../domain/` nem `../application/` diretamente.
 *
 * ADR-0006 §"Modular monolith — Public API por módulo".
 */

export {
  CONTRACTS_SCHEMA_VERSION,
  isContractsModuleEvent,
  decodeContractsModuleEventV1,
  decoderInvalidShape,
  decoderSchemaVersionMismatch,
  decoderInvalidPayload,
} from './events.ts';

export type {
  ContractsModuleEvent,
  DecoderError,
  DecoderInvalidShape,
  DecoderSchemaVersionMismatch,
  DecoderInvalidPayload,
  OutboxRow,
} from './events.ts';

// ─── Permissions (catálogo RBAC do módulo — CTR-PERMISSION-CATALOG) ──────────

export { CONTRACT_PERMISSION } from './permissions.ts';
export type { ContractPermission } from './permissions.ts';

// ─── Contagem de contratos/aditivos por contratado (010 — consumido por partners) ──
export {
  buildContractCountReadPort,
  makeInMemoryContractCountReadPort,
} from './contract-count-read.ts';
export type {
  ContractCountReadPort,
  ContractCountReadError,
  ContractCountReadHandle,
  ContractorCount,
  ContractorType,
  ContractStatus,
  InMemoryContractCountRow,
} from './contract-count-read.ts';

// ─── Storage (DocumentStorage port + S3-compatible adapter) ─────────────────
// ADR-0019. InMemory NAO e exposto (adapter de teste interno).
// awsS3Config + parseAwsS3Env: builder/parser de config AWS S3.
// magaluCloudConfig: virá no proximo ticket (CTR-STORAGE-MAGALU-CONFIG).

export type {
  S3StorageConfig,
  AwsS3ConfigInput,
  AwsS3EnvError,
} from '../adapters/storage/s3-config-aws.ts';
export { awsS3Config, parseAwsS3Env } from '../adapters/storage/s3-config-aws.ts';

export { createS3DocumentStorage } from '../adapters/storage/document-storage.s3.ts';

export type {
  MagaluRegion,
  MagaluCloudConfigInput,
  MagaluCloudEnvError,
} from '../adapters/storage/magalu-cloud-config.ts';
export { magaluCloudConfig, parseMagaluCloudEnv } from '../adapters/storage/magalu-cloud-config.ts';

// ─── Document aggregate (domain MVP — persistencia em CTR-DOCUMENT-AGGREGATE-PERSISTENCE) ──

export type {
  ContractDocument,
  ContractDocumentStatus,
  DocumentCategory,
  CreateContractDocumentInput,
} from '../domain/document/types.ts';

export type { DocumentEvent } from '../domain/document/events.ts';

export type { ContractDocumentError } from '../domain/document/errors.ts';

export type { DocumentRepository, DocumentRepositoryError } from '../domain/document/repository.ts';

export * as Document from '../domain/document/document.ts';

// Document persistence adapters (CTR-DOCUMENT-AGGREGATE-PERSISTENCE).
// InMemory adapter exposto para composition root da CLI memory driver.
// Drizzle adapter exposto para composition root da CLI mysql driver.

export { InMemoryDocumentRepository } from '../adapters/persistence/repos/document-repository.in-memory.ts';
export type { InMemoryDocumentRepositoryHandle } from '../adapters/persistence/repos/document-repository.in-memory.ts';

export { DocumentRepositoryDrizzle } from '../adapters/persistence/repos/document-repository.drizzle.ts';

// Use case uploadDocument (CTR-USECASE-UPLOAD-DOCUMENT).
// Orquestra storage + agregado + outbox via documentRepo.save.

export { uploadDocument } from '../application/use-cases/upload-document.ts';
export type {
  UploadDocumentCommand,
  UploadDocumentOutput,
  UploadDocumentError,
  UploadDocumentDeps,
} from '../application/use-cases/upload-document.ts';

// Use case deleteDocument (CTR-USECASE-DELETE-DOCUMENT — RN-11).

export { deleteDocument } from '../application/use-cases/delete-document.ts';
export type {
  DeleteDocumentCommand,
  DeleteDocumentOutput,
  DeleteDocumentError,
  DeleteDocumentDeps,
} from '../application/use-cases/delete-document.ts';

// Use case supersedeDocument (CTR-USECASE-SUPERSEDE-DOCUMENT — RN-AS-02).

export { supersedeDocument } from '../application/use-cases/supersede-document.ts';
export type {
  SupersedeDocumentCommand,
  SupersedeDocumentOutput,
  SupersedeDocumentError,
  SupersedeDocumentDeps,
} from '../application/use-cases/supersede-document.ts';
