// Use case de LEITURA da trilha (Time Travel — GET /timeline).
//
// Query side (ts-domain-modeler §3.L.5 bloco F): valida o id, delega ao port de
// leitura. NÃO valida existência do documento — a trilha simplesmente retorna vazia
// se não houver entries (contrato do FinancialTimelineRepository.findByDocument).
//
// Imperative Shell: async + port. Estratégia α (early return) — id é dependência do
// findByDocument, então não há composição paralela aqui.

import { type Result, err } from '../../../../shared/primitives/result.ts';
import * as DocumentId from '../../domain/shared/document-id.ts';
import type {
  FinancialTimelineRepository,
  TimelineRepositoryError,
} from '../../domain/timeline/repository.ts';
import type { FinancialTimelineEntry } from '../../domain/timeline/types.ts';

export type GetDocumentTimelineDeps = Readonly<{
  timelineRepo: FinancialTimelineRepository;
}>;

export type GetDocumentTimelineCommand = Readonly<{ documentId: string }>;

export type GetDocumentTimelineError = DocumentId.DocumentIdError | TimelineRepositoryError;

export const getDocumentTimeline =
  (deps: GetDocumentTimelineDeps) =>
  async (
    cmd: GetDocumentTimelineCommand,
  ): Promise<Result<readonly FinancialTimelineEntry[], GetDocumentTimelineError>> => {
    const id = DocumentId.rehydrate(cmd.documentId);
    if (!id.ok) return err(id.error);

    return deps.timelineRepo.findByDocument(id.value);
  };
