import type { Result } from '../../../../shared/primitives/result.ts';
import type { DocumentId } from '../shared/document-id.ts';
import type { FinancialTimelineEntry } from './types.ts';

// Port do read-model Time Travel (ADR-0001/010).
// Responsabilidades separadas por sentido de fluxo:
//   - `append`: escrita síncrona na MESMA transação do agregado (SC-004/NFR-001).
//   - `findByDocument`: leitura ordenada por occurredAt asc (GET /timeline).
//
// `append` é chamado DENTRO do db.transaction do DocumentRepository.save —
// o adapter Drizzle recebe a `tx` ativa via parâmetro de fábrica (ver repos/timeline-repository.drizzle.ts).
// O adapter in-memory grava no store compartilhado da sessão de testes.
//
// Erros: string-literal EN kebab-case (domain.md §"Erros são string literal unions").

export type TimelineRepositoryError = 'timeline-repository-failure' | 'timeline-document-not-found';

export type FinancialTimelineRepository = Readonly<{
  // Grava entries+changes do marco. Chamado dentro da mesma transação do save do agregado
  // (Vernon:3257 — "update synchronously [...] in the same transaction").
  append: (
    entries: readonly FinancialTimelineEntry[],
  ) => Promise<Result<void, TimelineRepositoryError>>;

  // Lê a trilha de um documento ordenada por occurredAt asc.
  // 'document-not-found' NÃO é retornado aqui — a trilha simplesmente retorna vazia
  // se o documento não tiver entries (ou não existir). Quem valida a existência do
  // documento é o use case (via DocumentRepository.findById).
  findByDocument: (
    id: DocumentId,
  ) => Promise<Result<readonly FinancialTimelineEntry[], TimelineRepositoryError>>;
}>;
