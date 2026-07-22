import * as Competencia from '../domain/document/competencia.ts';
import type { DocumentReaderResult } from '../domain/document-reader/types.ts';
import type { SaveDraftCommand } from './use-cases/save-draft.ts';

// Traduz o resultado da leitura (VOs do reader) para os campos crus do rascunho (#62). Money→cents,
// Competencia→'YYYY-MM', Retention VO→RetentionInput. O fornecedor extraído (razão + CNPJ) vai na
// `description` — o `supplierRef` (ID cadastral) fica omitido: o humano seleciona o fornecedor
// (decisão P.O., 2026-07-09). Função PURA — spreads condicionais respeitam exactOptionalPropertyTypes.
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
  ...(result.supplier !== undefined
    ? {
        description: `Fornecedor lido: ${result.supplier.legalName} — CNPJ/CPF ${result.supplier.taxId}`,
      }
    : {}),
});
