import { type Result, ok } from '../../../../shared/primitives/result.ts';
import {
  adjustDocument,
  type AdjustDocumentDeps,
  type AdjustDocumentFailure,
} from './adjust-document.ts';

// #162: alteração de vencimento em LOTE. Falha PARCIAL por item — cada id é processado
// independentemente (findById + save próprios), reusando `adjustDocument` (caminho editMetadata
// de dueDate). O use-case nunca falha global: devolve o resultado por item.

export type BulkUpdateDueDateDeps = AdjustDocumentDeps;

export type BulkDueDateItem = Readonly<{ documentId: string; expectedVersion: number }>;

export type BulkUpdateDueDateCommand = Readonly<{
  items: readonly BulkDueDateItem[];
  dueDate: Date;
}>;

export type BulkDueDateOutcome =
  | 'ok'
  | 'not-found'
  | 'version-conflict'
  | 'invalid-state'
  | 'error';

export type BulkDueDateResult = Readonly<{
  documentId: string;
  outcome: BulkDueDateOutcome;
}>;

// if/else (não switch) de propósito: AdjustDocumentError é uma union ampla e só 3 casos viram
// outcome específico; o resto colapsa em 'error' (sem vazar slug interno). switch aqui dispararia
// switch-exhaustiveness-check para os ~17 membros irrelevantes.
const toOutcome = (r: Result<void, AdjustDocumentFailure>): BulkDueDateOutcome => {
  if (r.ok) return 'ok';
  // O lote só altera vencimento (caminho `editMetadata`), que preserva os títulos e nunca consulta
  // remessa — a variante com evidência não alcança este ponto. Se um dia alcançar, cai em 'error'
  // como qualquer slug não mapeado, sem vazar detalhe no resultado por item.
  if (r.error.kind !== 'plain') return 'error';
  if (r.error.error === 'document-not-found') return 'not-found';
  if (r.error.error === 'document-version-conflict') return 'version-conflict';
  if (r.error.error === 'invalid-state-transition') return 'invalid-state';
  return 'error';
};

// Nota: `id` repetido no mesmo lote é processado em sequência — a 2ª ocorrência lê a versão já
// incrementada pela 1ª e recebe `version-conflict` (fail-safe, não corrompe dado). O front não deve
// enviar duplicatas; não deduplicamos aqui de propósito (o outcome por item deixa o efeito explícito).
export const bulkUpdateDueDate =
  (deps: BulkUpdateDueDateDeps) =>
  async (cmd: BulkUpdateDueDateCommand): Promise<Result<readonly BulkDueDateResult[], never>> => {
    const adjust = adjustDocument(deps);
    const results: BulkDueDateResult[] = [];
    for (const item of cmd.items) {
      const r = await adjust({
        documentId: item.documentId,
        expectedVersion: item.expectedVersion,
        dueDate: cmd.dueDate,
      });
      results.push({ documentId: item.documentId, outcome: toOutcome(r) });
    }
    return ok(results);
  };
