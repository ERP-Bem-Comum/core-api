import * as Competencia from '../domain/document/competencia.ts';
import type { DocumentReaderResult } from '../domain/document-reader/types.ts';
import type { SaveDraftCommand } from './use-cases/save-draft.ts';

// Traduz o resultado da leitura (VOs do reader) para os campos crus do rascunho (#62). Money→cents,
// Competencia→'YYYY-MM', Retention VO→RetentionInput. O `description` reflete a DESCRIÇÃO DO SERVIÇO
// da nota (#566) — nunca o fornecedor: o supplier resolve para `supplierRef` no use case de ingestão
// (#560, supersede a decisão P.O. de 2026-07-09). Função PURA — spreads respeitam exactOptionalPropertyTypes.
export const readerResultToDraft = (result: DocumentReaderResult): Partial<SaveDraftCommand> => ({
  ...(result.type !== undefined ? { type: result.type } : {}),
  ...(result.documentNumber !== undefined ? { documentNumber: result.documentNumber } : {}),
  ...(result.competence !== undefined
    ? { competencia: Competencia.toString(result.competence) }
    : {}),
  ...(result.issueDate !== undefined ? { issueDate: result.issueDate } : {}),
  ...(result.grossValue !== undefined ? { grossValueCents: result.grossValue.cents } : {}),
  ...(result.retentions !== undefined
    ? {
        retentions: result.retentions.map((r) => ({
          type: r.type,
          baseCents: r.base.cents,
          rateBps: r.rateBps,
          valueCents: r.value.cents,
        })),
      }
    : {}),
  ...(result.description !== undefined ? { description: result.description } : {}),
});
