/**
 * TEAM-REPORT-READ — Port de LEITURA (read-only) da projeção "Equipe ABC" (REP-1 · #238).
 *
 * 9 colunas LGPD-safe (ver ADR/handbook de coleta LGPD — REPORTS-TEAM-ABC 000-request.md).
 * `program` não existe no core-api (agregado `Collaborator` do partners não modela programa
 * de atuação) — sempre `null`. Consumido pela borda HTTP (`GET /reports/team`).
 */
import type { Result } from '#src/shared/primitives/result.ts';

export type TeamMember = Readonly<{
  id: string;
  name: string;
  program: string | null;
  role: string;
  employmentRelationship: string;
  startOfContract: string; // date-only YYYY-MM-DD
  registrationStatus: string;
  active: boolean;
  education: string | null;
  experienceInPublicSector: boolean | null;
}>;

export type TeamReportReadError = 'team-report-read-unavailable';

export type TeamReportReadPort = Readonly<{
  list: () => Promise<Result<readonly TeamMember[], TeamReportReadError>>;
}>;
