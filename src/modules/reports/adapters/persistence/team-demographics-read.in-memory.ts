/**
 * Adapter InMemory do `TeamDemographicsReadPort` — driver `memory` (testes, boot HTTP sem DB).
 *
 * Semeado com REGISTROS CRUS (não com o resumo já agregado): assim o double filtra por
 * `registrationStatus` como o WHERE do reader real e delega à MESMA função pura
 * `aggregateTeamDemographics` do `partners` (ACL — public-api). Sem seed → universo vazio
 * (template canônico com counts zerados; `totalActive` 0).
 */
import { ok } from '#src/shared/primitives/result.ts';
import {
  aggregateTeamDemographics,
  type CollaboratorDemographicsRecord,
} from '#src/modules/partners/public-api/index.ts';
import type {
  TeamDemographicsReadPort,
  TeamDemographicsRegistrationStatus,
} from '../../application/ports/team-demographics-read.ts';

/** Registro semeado: os 4 campos demográficos crus + o `registrationStatus` que o filtro recorta. */
export type SeededDemographicsRecord = CollaboratorDemographicsRecord &
  Readonly<{ registrationStatus: TeamDemographicsRegistrationStatus }>;

export const InMemoryTeamDemographicsRead = (
  seed: readonly SeededDemographicsRecord[] = [],
  referenceDate: Date = new Date(),
): TeamDemographicsReadPort => ({
  list: async (filter) => {
    const population =
      filter?.registrationStatus !== undefined
        ? seed.filter((record) => record.registrationStatus === filter.registrationStatus)
        : seed;
    return ok(aggregateTeamDemographics(population, { referenceDate }));
  },
});
