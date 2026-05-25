/**
 * Port DocumentRepository — contrato para persistencia do agregado
 * ContractDocument.
 *
 * Definido aqui como TIPO apenas. Implementacoes (InMemory + Drizzle) entregues
 * no ticket `CTR-DOCUMENT-AGGREGATE-PERSISTENCE` (gatilhado apos este).
 *
 * Conforme padrao CTR-OUTBOX-INTEGRATION-IN-REPOS: `save(doc, events)` recebe
 * o agregado + eventos a publicar; adapter persiste agregado + appenda eventos
 * no outbox de forma atomica (transacao MySQL no Drizzle; sequencial seguro no
 * InMemory).
 *
 * ASCII puro.
 */

import type { Result } from '../../../../shared/primitives/result.ts';
import type { DocumentId } from '../shared/document-id.ts';
import type { ContractId } from '../shared/contract-id.ts';
import type { AmendmentId } from '../shared/amendment-id.ts';
import type { ContractsModuleEvent } from '../../public-api/events.ts';
import type { ContractDocument } from './types.ts';

export type DocumentRepositoryError = 'document-repository-unavailable';

export type DocumentRepository = Readonly<{
  findById: (id: DocumentId) => Promise<Result<ContractDocument | null, DocumentRepositoryError>>;
  findByParent: (
    parentType: 'Contract' | 'Amendment',
    parentId: ContractId | AmendmentId,
  ) => Promise<Result<readonly ContractDocument[], DocumentRepositoryError>>;
  save: (
    doc: ContractDocument,
    events: readonly ContractsModuleEvent[],
  ) => Promise<Result<void, DocumentRepositoryError>>;
}>;
