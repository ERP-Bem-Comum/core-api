// Adapter in-memory do FinancialTimelineRepository (módulo Financial — Time Travel).
//
// Mecanismo de store compartilhado (sc-004/nfr-001 — atomicidade em testes):
//   Recebe o mesmo `Map` que o DocumentRepository in-memory usa — assim o `append`
//   chamado dentro do save() e o `findByDocument` chamado nos testes enxergam o
//   MESMO estado, sem necessidade de passar tx.
//
//   Padrão: injeção de store via parâmetro de fábrica.
//   Quem cria os dois repos em conjunto (testes, composition root de memória):
//     const timelineStore = new Map<string, readonly FinancialTimelineEntry[]>();
//     const repo  = createInMemoryDocumentRepository(timelineStore);
//     const tRepo = createInMemoryTimelineRepository(timelineStore);
//
// findByDocument: ordena por occurredAt asc (espelha o comportamento do Drizzle adapter).
// append: acumula entries por documentId (append-only — nunca sobrescreve, nunca deleta
//   a não ser que o DocumentRepository.delete() limpe a entrada do mesmo Map).
//
// Boundary: nenhuma exceção cruza a borda — todas as operações são síncronas e puras
//   aqui, mas mantemos o shape async para paridade de interface com o Drizzle adapter
//   (.claude/rules/adapters.md §"converter para Result na borda").

import { type Result, ok } from '../../../../../shared/primitives/result.ts';
import type { DocumentId } from '../../../domain/shared/document-id.ts';
import type { FinancialTimelineEntry } from '../../../domain/timeline/types.ts';
import type {
  FinancialTimelineRepository,
  TimelineRepositoryError,
} from '../../../domain/timeline/repository.ts';

export type TimelineStore = Map<string, FinancialTimelineEntry[]>;

export const createInMemoryTimelineRepository = (
  store: TimelineStore,
): FinancialTimelineRepository => ({
  append: async (
    entries: readonly FinancialTimelineEntry[],
  ): Promise<Result<void, TimelineRepositoryError>> => {
    for (const entry of entries) {
      const key = entry.documentId as unknown as string;
      const existing = store.get(key);
      if (existing !== undefined) {
        existing.push(entry);
      } else {
        store.set(key, [entry]);
      }
    }
    return Promise.resolve(ok(undefined));
  },

  findByDocument: async (
    id: DocumentId,
  ): Promise<Result<readonly FinancialTimelineEntry[], TimelineRepositoryError>> => {
    const key = id as unknown as string;
    const entries = store.get(key) ?? [];
    // Ordena por occurredAt asc — espelha o ORDER BY occurred_at ASC do Drizzle adapter.
    const sorted = [...entries].sort((a, b) => a.occurredAt.getTime() - b.occurredAt.getTime());
    return Promise.resolve(ok(sorted));
  },
});
