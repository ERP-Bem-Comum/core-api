/**
 * TEAM-REPORT-READ — Port de LEITURA (read-only) da projeção "Equipe ABC" (REP-1 · #238).
 *
 * 13 colunas. As 10 do REPORTS-TEAM-ABC (#238) + genderIdentity/race/age, acrescentadas pelo
 * REPORTS-TEAM-DEMOGRAPHIC-COLUMNS (decisao da P.O. 2026-07-20: replicar o legado, que exibia esses
 * campos por pessoa nesta tela). `dateOfBirth` segue barrado — so a idade derivada atravessa.
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
  // REPORTS-TEAM-DEMOGRAPHIC-COLUMNS: as 3 colunas que a tabela exibe. Código do enum
  // ('PARDO', 'MULHER_CIS') — o rótulo PT-BR é do front. `age` é derivada no `partners`
  // (anos completos na data de referência); `dateOfBirth` não atravessa.
  genderIdentity: string | null;
  race: string | null;
  age: number | null;
}>;

export type TeamReportReadError = 'team-report-read-unavailable';

export type TeamReportReadPort = Readonly<{
  list: () => Promise<Result<readonly TeamMember[], TeamReportReadError>>;
}>;
