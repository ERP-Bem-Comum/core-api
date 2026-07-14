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
 * Read-only: lista via `createDrizzleCollaboratorReader.list` e devolve só o subconjunto
 * LGPD-safe (9 colunas) consumido pela projeção "Equipe ABC". Encapsula os adapters do partners
 * para que o consumidor (`reports`) não os importe (ADR-0006).
 *
 * `program` não existe no modelo `Collaborator` — sempre `null` (divergência documentada, ver
 * REPORTS-TEAM-ABC 000-request.md).
 */
import { type Result, ok, err } from '#src/shared/primitives/result.ts';
import type { CollaboratorReadRecord } from '#src/modules/partners/application/ports/collaborator-reader.ts';
import { openPartnersMysql } from '../adapters/persistence/drivers/mysql-driver.ts';
import { createDrizzleCollaboratorReader } from '../adapters/persistence/repos/collaborator-reader.drizzle.ts';

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
}>;

export type CollaboratorProjectionReader = Readonly<{
  list: () => Promise<Result<readonly CollaboratorTeamProjection[], string>>;
  close: () => Promise<void>;
}>;

const toProjection = (c: CollaboratorReadRecord['collaborator']): CollaboratorTeamProjection => ({
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
});

export const openCollaboratorProjectionReader = async (
  opts: Readonly<{ connectionString: string }>,
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
      return ok(listed.value.map(({ collaborator }) => toProjection(collaborator)));
    },
    close: async () => handle.close(),
  });
};
