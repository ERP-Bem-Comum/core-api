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

import { type Result, ok, err } from '#src/shared/primitives/result.ts';
import type { Clock } from '#src/shared/ports/clock.ts';
import { openPartnersMysql } from '../adapters/persistence/drivers/mysql-driver.ts';
import { parCollaborators } from '../adapters/persistence/schemas/mysql.ts';
import {
  aggregateTeamDemographics,
  type TeamDemographicsSummary,
} from './collaborator-demographics.ts';

export type CollaboratorDemographicsReader = Readonly<{
  list: () => Promise<Result<TeamDemographicsSummary, string>>;
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
    list: async () => {
      try {
        const rows = await db
          .select({
            active: parCollaborators.active,
            genderIdentity: parCollaborators.genderIdentity,
            race: parCollaborators.race,
            dateOfBirth: parCollaborators.dateOfBirth,
          })
          .from(parCollaborators);

        return ok(aggregateTeamDemographics(rows, { referenceDate: opts.clock.now() }));
      } catch (cause) {
        process.stderr.write(`[partners-collaborator-demographics:list] ${String(cause)}\n`);
        return err('collaborator-demographics-read-failure');
      }
    },
    close: async () => handle.close(),
  });
};
