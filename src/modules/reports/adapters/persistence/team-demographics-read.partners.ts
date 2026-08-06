/**
 * Adapter `TeamDemographicsReadPort` sobre a agregacao demografica do `partners` (ACL -
 * ADR-0006/0014). Nunca importa `partners/domain` ou `partners/adapters` - so a public-api.
 *
 * Recebe o `list` de um reader JA aberto no boot (`openCollaboratorDemographicsReader`), nunca
 * uma connection-string - o pool e singleton de composicao, fechado no `shutdown()` (incidente
 * RDS 0001). Molde: `team-report-read.partners.ts`.
 */
import { ok, err } from '#src/shared/primitives/result.ts';
import type { CollaboratorDemographicsReader } from '#src/modules/partners/public-api/index.ts';
import type {
  TeamDemographicsReadPort,
  TeamDemographicsReadError,
} from '../../application/ports/team-demographics-read.ts';

export const TeamDemographicsReadFromPartners = (
  listDemographics: CollaboratorDemographicsReader['list'],
): TeamDemographicsReadPort => ({
  // Repassa o filtro OPCIONAL ao reader do partners (vira WHERE registration_status). O shape do
  // filtro do port e o do reader são estruturalmente idênticos (`{ registrationStatus? }`).
  list: async (filter) => {
    const listed = await listDemographics(filter);
    if (!listed.ok) return err<TeamDemographicsReadError>('team-demographics-read-unavailable');
    return ok(listed.value);
  },
});
