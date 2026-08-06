/**
 * Reader boot-scoped da agregacao demografica da equipe (REPORTS-TEAM-DEMOGRAPHICS - REP-1) -
 * public-api do `partners`.
 *
 * **Boot-scoped:** `openCollaboratorDemographicsReader` abre o pool MySQL UMA vez e devolve
 * `list`/`close`. O consumidor (borda HTTP do `reports`) abre no boot e fecha so no `shutdown()` -
 * nunca por requisicao. Reabrir pool por operacao foi a causa estrutural do incidente
 * `handbook/incidents/0001-prod-rds-connection-exhaustion-2026-07-10.md`. Molde:
 * `openCollaboratorProjectionReader`.
 *
 * SELECT das 4 colunas demograficas CRUAS de `par_collaborators` (sem passar pelo mapper do
 * agregado, de proposito): o CA5 exige que valor fora da lista canonica caia em `OUTROS` em vez de
 * reprovar a leitura inteira. A agregacao e delegada a funcao PURA
 * `aggregateTeamDemographics` - este arquivo so faz I/O.
 *
 * `referenceDate` vem do `Clock` injetado (testavel via ClockFixed) - nunca `new Date()` aqui.
 * Read-only: so contagem cruza a fronteira, nunca linha por pessoa (CA2).
 */
import process from 'node:process';

import { eq } from 'drizzle-orm';

import { type Result, ok, err } from '#src/shared/primitives/result.ts';
import type { Clock } from '#src/shared/ports/clock.ts';
import type { RegistrationStatus } from '../domain/collaborator/types.ts';
import { openPartnersMysql } from '../adapters/persistence/drivers/mysql-driver.ts';
import { parCollaborators } from '../adapters/persistence/schemas/mysql.ts';
import {
  aggregateTeamDemographics,
  type TeamDemographicsSummary,
} from './collaborator-demographics.ts';

/**
 * Filtro OPCIONAL da leitura demográfica. `registrationStatus` presente vira `WHERE
 * registration_status = ?` — recorta a POPULAÇÃO de entrada da agregação; ausente = todos.
 */
export type CollaboratorDemographicsFilter = Readonly<{
  registrationStatus?: RegistrationStatus;
}>;

export type CollaboratorDemographicsReader = Readonly<{
  list: (
    filter?: CollaboratorDemographicsFilter,
  ) => Promise<Result<TeamDemographicsSummary, string>>;
  close: () => Promise<void>;
}>;

export const openCollaboratorDemographicsReader = async (
  opts: Readonly<{ connectionString: string; clock: Clock }>,
): Promise<Result<CollaboratorDemographicsReader, string>> => {
  const handleR = await openPartnersMysql({
    connectionString: opts.connectionString,
    applyMigrations: false,
  });
  if (!handleR.ok) return err(handleR.error);
  const handle = handleR.value;
  const { db } = handle;

  return ok({
    list: async (filter) => {
      try {
        // `.where(undefined)` é no-op no Drizzle: sem `registrationStatus`, lê todos (todos os
        // colaboradores). Com o filtro, recorta a população — o que cobre as 3 distribuições E o
        // `totalActive`, porque a agregação vem sempre da mesma população SELECTada.
        const rows = await db
          .select({
            active: parCollaborators.active,
            genderIdentity: parCollaborators.genderIdentity,
            race: parCollaborators.race,
            dateOfBirth: parCollaborators.dateOfBirth,
          })
          .from(parCollaborators)
          .where(
            filter?.registrationStatus !== undefined
              ? eq(parCollaborators.registrationStatus, filter.registrationStatus)
              : undefined,
          );

        return ok(aggregateTeamDemographics(rows, { referenceDate: opts.clock.now() }));
      } catch (cause) {
        process.stderr.write(`[partners-collaborator-demographics:list] ${String(cause)}\n`);
        return err('collaborator-demographics-read-failure');
      }
    },
    close: async () => handle.close(),
  });
};
