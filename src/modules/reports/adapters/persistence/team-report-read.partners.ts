/**
 * Adapter `TeamReportReadPort` sobre a projeção de collaborators do `partners` (ACL —
 * ADR-0006/0014). Nunca importa `partners/domain` ou `partners/adapters` — só a public-api.
 *
 * Recebe o `list` de um reader **já aberto no boot** (`openCollaboratorProjectionReader`), nunca
 * uma connection-string — o pool é singleton de composição, fechado no `shutdown()` (ver F1 do
 * W2: reabrir pool por requisição reintroduzia o incidente RDS 0001).
 */
import { ok, err } from '#src/shared/primitives/result.ts';
import type { CollaboratorProjectionReader } from '#src/modules/partners/public-api/index.ts';
import type {
  TeamReportReadPort,
  TeamReportReadError,
} from '../../application/ports/team-report-read.ts';

export const TeamReportReadFromPartners = (
  listProjection: CollaboratorProjectionReader['list'],
): TeamReportReadPort => ({
  list: async () => {
    const listed = await listProjection();
    if (!listed.ok) return err<TeamReportReadError>('team-report-read-unavailable');
    return ok(listed.value);
  },
});
