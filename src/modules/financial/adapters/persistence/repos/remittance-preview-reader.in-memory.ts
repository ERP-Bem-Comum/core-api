// Adapter em memória do RemittancePreviewReader — testes e dev sem MySQL.
//
// Guarda as linhas por TÍTULO e devolve apenas as pedidas, na ordem da consulta. Não inventa
// linha para id desconhecido: a ausência é o que o use case reporta como `not-found`, e devolver
// um placeholder aqui esconderia justamente o caso que o pré-voo existe para mostrar.
//
// ⚠️ A chave é `payableId`, nunca `documentId`: títulos irmãos compartilham a nota, e indexar pela
// nota faria um sobrescrever o outro no `Map` — o pai sumiria atrás da última retenção semeada.

import { type Result, ok, err } from '#src/shared/primitives/result.ts';
import type {
  RemittancePreviewReader,
  RemittancePreviewReaderError,
  RemittancePreviewRow,
} from '#src/modules/financial/application/ports/remittance-preview-reader.ts';

export type InMemoryRemittancePreviewReader = RemittancePreviewReader &
  Readonly<{
    seed: (row: RemittancePreviewRow) => void;
    /** Simula o `partners` fora do ar — o pré-voo recusa em bloco em vez de mentir por título. */
    setUnavailable: (unavailable: boolean) => void;
  }>;

export const createInMemoryRemittancePreviewReader = (
  seedRows: readonly RemittancePreviewRow[] = [],
): InMemoryRemittancePreviewReader => {
  const rows = new Map<string, RemittancePreviewRow>(seedRows.map((r) => [r.payableId, r]));
  let unavailable = false;

  return {
    seed: (row) => {
      rows.set(row.payableId, row);
    },
    setUnavailable: (value) => {
      unavailable = value;
    },
    loadPreviewRows: async (
      payableIds: readonly string[],
    ): Promise<Result<readonly RemittancePreviewRow[], RemittancePreviewReaderError>> => {
      if (unavailable) return Promise.resolve(err('remittance-preview-reader-unavailable'));

      const found = payableIds.flatMap((id) => {
        const row = rows.get(id);
        return row === undefined ? [] : [row];
      });
      return Promise.resolve(ok(found));
    },
  };
};
