/**
 * Adapter InMemory do DocumentRepository.
 *
 * Ticket: CTR-DOCUMENT-AGGREGATE-PERSISTENCE (W1).
 *
 * Padrao CTR-OUTBOX-INTEGRATION-IN-REPOS: save(doc, events) persiste o
 * agregado E appenda eventos no outbox (default = InMemoryOutbox isolado;
 * test injeta para inspecao).
 *
 * ASCII puro.
 */

import { ok, err } from '../../../../../shared/primitives/result.ts';
import type { DocumentId } from '../../../domain/shared/document-id.ts';
import type { ContractDocument } from '../../../domain/document/types.ts';
import type {
  DocumentRepository,
  DocumentRepositoryError,
} from '../../../domain/document/repository.ts';
import type { OutboxPort } from '../../../application/ports/outbox.ts';
import type { ContractsModuleEvent } from '../../../application/ports/event-bus.ts';
import { InMemoryOutbox } from '../../outbox/outbox.in-memory.ts';

export type InMemoryDocumentRepositoryHandle = Readonly<{
  repo: DocumentRepository;
  store: () => readonly ContractDocument[];
  clear: () => void;
}>;

export const InMemoryDocumentRepository = (
  outbox: OutboxPort = InMemoryOutbox().port,
): InMemoryDocumentRepositoryHandle => {
  const map = new Map<DocumentId, ContractDocument>();

  const findById: DocumentRepository['findById'] = async (id) => {
    await Promise.resolve();
    return ok(map.get(id) ?? null);
  };

  const findByParent: DocumentRepository['findByParent'] = async (parentType, parentId) => {
    await Promise.resolve();
    const matches = [...map.values()].filter(
      (d) => d.parentType === parentType && d.parentId === parentId,
    );
    // Ordenar por uploadedAt ascending para determinismo.
    matches.sort((a, b) => a.uploadedAt.getTime() - b.uploadedAt.getTime());
    return ok(matches);
  };

  const save: DocumentRepository['save'] = async (doc, events) => {
    map.set(doc.id, doc);
    if (events.length > 0) {
      const r = await outbox.append(events as readonly ContractsModuleEvent[]);
      if (!r.ok) {
        // Mapeia erro de outbox para erro genérico do repo (port só conhece 1 código).
        return err<DocumentRepositoryError>('document-repository-unavailable');
      }
    }
    return ok(undefined);
  };

  const repo: DocumentRepository = { findById, findByParent, save };

  return {
    repo,
    store: () => [...map.values()],
    clear: () => {
      map.clear();
    },
  };
};
