/**
 * Adapter InMemory do `TeamReportReadPort` — driver `memory` (testes, boot HTTP sem DB).
 * Aceita um array semeado; sem seed, devolve lista vazia.
 */
import { ok } from '#src/shared/primitives/result.ts';
import type { TeamReportReadPort, TeamMember } from '../../application/ports/team-report-read.ts';

export const InMemoryTeamReportRead = (seed: readonly TeamMember[] = []): TeamReportReadPort => ({
  list: async () => ok(seed),
});
