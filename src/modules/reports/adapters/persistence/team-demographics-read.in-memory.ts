/**
 * Adapter InMemory do `TeamDemographicsReadPort` - driver `memory` (testes, boot HTTP sem DB).
 * Aceita um resumo semeado; sem seed, devolve o universo vazio (zero ativo, sem buckets).
 */
import { ok } from '#src/shared/primitives/result.ts';
import type {
  TeamDemographicsReadPort,
  TeamDemographics,
} from '../../application/ports/team-demographics-read.ts';

const EMPTY: TeamDemographics = { totalActive: 0, gender: [], ageRange: [], race: [] };

export const InMemoryTeamDemographicsRead = (
  seed: TeamDemographics = EMPTY,
): TeamDemographicsReadPort => ({
  list: async () => ok(seed),
});
