/**
 * Reader de collaborators para projeção cross-módulo (REPORTS-TEAM-ABC · #238) —
 * public-api do partners.
 *
 * **Boot-scoped:** `openCollaboratorProjectionReader` abre o pool MySQL **uma vez** e devolve um
 * reader com `list`/`close`. O consumidor (borda HTTP do `reports`) abre no boot e fecha só no
 * `shutdown()` — nunca por requisição. Reabrir pool por operação foi a causa estrutural do
 * incidente de esgotamento de conexões do RDS (`handbook/incidents/0001-prod-rds-connection-exhaustion-2026-07-10.md`);
 * pools são singletons de composição, igual a `buildPartnersReadPort`.
 *
 * Read-only: lista via `createDrizzleCollaboratorReader.list` e devolve o subconjunto de 13 colunas
 * consumido pela projeção "Equipe ABC". Encapsula os adapters do partners para que o consumidor
 * (`reports`) não os importe (ADR-0006).
 *
 * As 3 colunas demográficas (`genderIdentity`, `race`, `age`) entraram no
 * REPORTS-TEAM-DEMOGRAPHIC-COLUMNS — a tela já as exibia e mostrava `—` por falta de contrato.
 * Decisão da P.O. (2026-07-20): a régua é replicar o legado; a segregação é assunto do redesenho
 * do RBAC, não de recorte desta projeção. `dateOfBirth` continua fora: só a idade cruza.
 *
 * `program` não existe no modelo `Collaborator` — sempre `null` (divergência documentada, ver
 * REPORTS-TEAM-ABC 000-request.md).
 */
import { type Result, ok, err } from '#src/shared/primitives/result.ts';
import * as PlainDate from '#src/shared/kernel/plain-date.ts';
import type { PlainDate as PlainDateType } from '#src/shared/kernel/plain-date.ts';
import type { Clock } from '#src/shared/ports/clock.ts';
import type { Collaborator } from '#src/modules/partners/domain/collaborator/types.ts';
import { openPartnersMysql } from '../adapters/persistence/drivers/mysql-driver.ts';
import { createDrizzleCollaboratorReader } from '../adapters/persistence/repos/collaborator-reader.drizzle.ts';
import { completedYears } from './completed-years.ts';

export type CollaboratorTeamProjection = Readonly<{
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
  // 3 colunas que a tabela "Equipe ABC" ja exibe e mostravam "-" por falta de contrato
  // (REPORTS-TEAM-DEMOGRAPHIC-COLUMNS). Valor = codigo do enum ('PARDO', 'MULHER_CIS'); o
  // rotulo PT-BR e do front. Sem dado -> null, nunca string vazia.
  genderIdentity: string | null;
  race: string | null;
  /** Idade DERIVADA: anos completos em `today`. `dateOfBirth` morre neste mapper e nao cruza a borda. */
  age: number | null;
}>;

export type CollaboratorProjectionReader = Readonly<{
  list: () => Promise<Result<readonly CollaboratorTeamProjection[], string>>;
  close: () => Promise<void>;
}>;

/**
 * Mapper PURO do agregado para a projecao "Equipe ABC". A data de referencia da idade entra por
 * parametro (vem de `Clock.today()` na composicao) - nunca `Date.now()` aqui.
 */
export const toTeamProjection = (
  c: Collaborator,
  today: PlainDateType,
): CollaboratorTeamProjection => ({
  id: String(c.id),
  name: c.name,
  program: null,
  role: c.role,
  employmentRelationship: c.employmentRelationship,
  startOfContract: c.startOfContract.toISOString().slice(0, 10),
  registrationStatus: c.registrationStatus,
  active: c.status === 'Active',
  education: c.education,
  experienceInPublicSector: c.experienceInThePublicSector,
  genderIdentity: c.genderIdentity,
  race: c.race,
  age: c.dateOfBirth === null ? null : completedYears(PlainDate.fromDate(c.dateOfBirth), today),
});

export const openCollaboratorProjectionReader = async (
  opts: Readonly<{ connectionString: string; clock: Clock }>,
): Promise<Result<CollaboratorProjectionReader, string>> => {
  const handleR = await openPartnersMysql({
    connectionString: opts.connectionString,
    applyMigrations: false,
  });
  if (!handleR.ok) return err(handleR.error);
  const handle = handleR.value;
  const reader = createDrizzleCollaboratorReader(handle);

  return ok({
    list: async () => {
      const listed = await reader.list();
      if (!listed.ok) return err(listed.error);
      // Um unico "hoje" por listagem: a tabela inteira usa a mesma data de referencia.
      const today = opts.clock.today();
      return ok(listed.value.map(({ collaborator }) => toTeamProjection(collaborator, today)));
    },
    close: async () => handle.close(),
  });
};
