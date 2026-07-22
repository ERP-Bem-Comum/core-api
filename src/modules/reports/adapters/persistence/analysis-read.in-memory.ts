/**
 * Adapter InMemory do `AnalysisReadPort` — driver `memory` (testes, boot HTTP sem DB).
 * Aceita um array semeado (rows planas); ignora o filtro; sem seed, devolve lista vazia.
 */
import { ok } from '#src/shared/primitives/result.ts';
import type { AnalysisReadPort, AnalysisRow } from '../../application/ports/analysis-read.ts';

export const InMemoryAnalysisRead = (seed: readonly AnalysisRow[] = []): AnalysisReadPort => ({
  list: async () => ok(seed),
});
