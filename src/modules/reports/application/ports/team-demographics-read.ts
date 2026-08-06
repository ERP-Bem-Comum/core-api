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

/** Status de cadastro do colaborador (dimensão ORTOGONAL ao soft-delete). Tipo próprio do reports. */
export type TeamDemographicsRegistrationStatus = 'PreRegistration' | 'Complete';

/**
 * Filtro OPCIONAL do gráfico demográfico (REP-1). `registrationStatus` recorta a POPULAÇÃO agregada
 * — logo cobre as 3 distribuições E o `totalActive` de uma vez. Ausente = todos os colaboradores
 * (comportamento atual preservado; zero regressão nos consumidores que chamam sem filtro).
 */
export type TeamDemographicsReadFilter = Readonly<{
  registrationStatus?: TeamDemographicsRegistrationStatus;
}>;

export type TeamDemographicsReadPort = Readonly<{
  list: (
    filter?: TeamDemographicsReadFilter,
  ) => Promise<Result<TeamDemographics, TeamDemographicsReadError>>;
}>;
