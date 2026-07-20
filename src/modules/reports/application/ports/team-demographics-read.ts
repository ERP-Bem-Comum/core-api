/**
 * TEAM-DEMOGRAPHICS-READ - Port de LEITURA (read-only) das 3 distribuicoes demograficas do
 * relatorio "Equipe ABC" (REP-1 . REPORTS-TEAM-DEMOGRAPHICS).
 *
 * O `partners` agrega e so a ESTATISTICA cruza a fronteira (Opcao A da P.O.): contagem por
 * categoria, nunca linha por pessoa - `race`, `genderIdentity` e `dateOfBirth` nao trafegam (CA2).
 * Consumido pela borda HTTP (`GET /reports/team/demographics`), sob a permissao dedicada
 * `collaborator:read-sensitive`.
 *
 * Tipos proprios (nao reexporta os do `partners`) pelo mesmo motivo de `team-report-read.ts`:
 * o port descreve o CONTRATO do reports, que nao pode quebrar por mudanca interna do fornecedor.
 */
import type { Result } from '#src/shared/primitives/result.ts';

export type CategoryCount = Readonly<{
  id: string;
  label: string;
  count: number;
}>;

export type TeamDemographics = Readonly<{
  totalActive: number;
  gender: readonly CategoryCount[];
  ageRange: readonly CategoryCount[];
  race: readonly CategoryCount[];
}>;

export type TeamDemographicsReadError = 'team-demographics-read-unavailable';

export type TeamDemographicsReadPort = Readonly<{
  list: () => Promise<Result<TeamDemographics, TeamDemographicsReadError>>;
}>;
