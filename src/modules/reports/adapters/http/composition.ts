/**
 * Composition root do módulo reports para a borda HTTP (ADR-0006/0025/0027, REPORTS-TEAM-ABC
 * #238). Read-only, sem persistência/schema próprios — lê a projeção de collaborators do
 * `partners` via public-api (ACL). Espelha `programs/adapters/http/composition.ts`.
 */
import { openCollaboratorProjectionReader } from '#src/modules/partners/public-api/index.ts';
import { TeamReportReadFromPartners } from '../persistence/team-report-read.partners.ts';
import { InMemoryTeamReportRead } from '../persistence/team-report-read.in-memory.ts';
import type { TeamReportReadPort } from '../../application/ports/team-report-read.ts';

export type ReportsDriver = 'memory' | 'mysql';

export type ReportsCompositionConfig = Readonly<{
  driver: ReportsDriver;
  /** Connection string do `partners` (ADR-0014 — reports não tem writer próprio). */
  writerUrl?: string;
}>;

export type ReportsHttpDeps = Readonly<{
  listTeam: TeamReportReadPort['list'];
  shutdown: () => Promise<void>;
}>;

export const buildReportsHttpDeps = async (
  config: ReportsCompositionConfig,
): Promise<ReportsHttpDeps> => {
  if (config.driver === 'memory') {
    const readPort: TeamReportReadPort = InMemoryTeamReportRead();
    return { listTeam: readPort.list, shutdown: () => Promise.resolve() };
  }
  if (config.writerUrl === undefined || config.writerUrl.length === 0) {
    throw new Error('reports-composition: driver mysql exige writerUrl');
  }
  // Pool aberto UMA vez no boot (não por requisição) — fechado só no shutdown. Ver F1 do W2 /
  // incidente RDS 0001. Molde: buildPartnersReadPort.
  const readerR = await openCollaboratorProjectionReader({ connectionString: config.writerUrl });
  if (!readerR.ok) {
    throw new Error(`reports-composition: falha ao abrir reader do partners: ${readerR.error}`);
  }
  const reader = readerR.value;
  const readPort = TeamReportReadFromPartners(reader.list);
  return { listTeam: readPort.list, shutdown: async () => reader.close() };
};
