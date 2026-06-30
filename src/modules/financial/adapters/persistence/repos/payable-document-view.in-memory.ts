// Adapter in-memory do PayableDocumentView (#146).
//
// Aceita duas formas de fonte:
//   - array estático: `readonly PayableDocumentRow[]` (para testes unitários simples).
//   - thunk lazy: `() => readonly PayableDocumentRow[]` (para composição in-memory onde o
//     store muda após o seed — ex.: derivação de `documentStore` + `payableStore` na composition).
//
// A resolução lazy é feita dentro de `findByPayableIds`, APÓS os ids chegarem.
// Espelha a semântica do adapter Drizzle: ids vazio → ok([]) sem processamento;
// id inexistente → ausente no resultado (degradação graciosa).
//
// Precedente: payable-list-view.in-memory.ts §"source: () => readonly LoadedDocument[]"
//   — mesmo padrão de thunk para derivação de store compartilhado.

import { type Result, ok } from '#src/shared/primitives/result.ts';
import type {
  PayableDocumentRow,
  PayableDocumentView,
  PayableDocumentViewError,
} from '#src/modules/financial/application/ports/payable-document-view.ts';

export const createInMemoryPayableDocumentView = (
  source: readonly PayableDocumentRow[] | (() => readonly PayableDocumentRow[]),
): PayableDocumentView => ({
  findByPayableIds: async (
    ids: readonly string[],
  ): Promise<Result<readonly PayableDocumentRow[], PayableDocumentViewError>> => {
    if (ids.length === 0) return ok([]);

    const rows = typeof source === 'function' ? source() : source;
    const idSet = new Set(ids);
    const filtered = rows.filter((row) => idSet.has(row.payableId));
    return ok(filtered);
  },
});
