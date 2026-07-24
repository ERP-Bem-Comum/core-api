/**
 * Adapter InMemory do `RealizedReadPort` — driver `memory` (testes, boot HTTP sem DB).
 *
 * Aceita fontes planas semeadas (orçado + financeiro) e costura via `stitchRealizedReport`, ignorando
 * o filtro (a semente já é o recorte). Sem semente, devolve o relatório vazio (0 nos totais, sem
 * centros). Molde: `InMemoryAnalysisRead`.
 */
import { ok } from '#src/shared/primitives/result.ts';
import type { PlannedAmountRow } from '#src/modules/budget-plans/public-api/read.ts';
import type { RealizedProvisionedRow } from '#src/modules/financial/public-api/realized-provisioned-projection.ts';
import type { RealizedReadPort } from '../../application/ports/realized-read.ts';
import { stitchRealizedReport } from './realized-read.stitch.ts';

export type InMemoryRealizedSeed = Readonly<{
  planned?: readonly PlannedAmountRow[];
  financial?: readonly RealizedProvisionedRow[];
}>;

export const InMemoryRealizedRead = (seed: InMemoryRealizedSeed = {}): RealizedReadPort => ({
  list: async () => ok(stitchRealizedReport(seed.planned ?? [], seed.financial ?? [])),
});
