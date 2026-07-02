/**
 * Public-API de provisionamento ETL do modulo programs (PROGRAMS-ETL-WRITE-PORT).
 *
 * Unico ponto pelo qual a ETL (orquestrador, fora de src/) persiste o agregado prg_programs,
 * SEM tocar os internos de persistencia (ADR-0006). Idempotente por legacy_id (skip, nunca UPDATE).
 * Monta o store a partir de uma connection-string, sem subir Fastify. ASCII puro. Importado por
 * PATH DIRETO (nao esta no barrel index.ts, que so exporta o read port cross-modulo).
 * Espelha src/modules/partners/public-api/etl.ts.
 */

import { type Result, ok, err } from '../../../shared/primitives/result.ts';
import {
  openProgramsMysql,
  type ProgramsMysqlDriverError,
} from '../adapters/persistence/drivers/mysql-driver.ts';
import { createDrizzleProgramsEtlStores } from '../adapters/persistence/repos/programs-etl-store.drizzle.ts';
import type { LegacyEntityStore } from '../application/ports/legacy-entity-store.ts';
import type { Program } from '../domain/program/types.ts';
import type { ProgramId } from '../domain/shared/program-id.ts';

export type {
  LegacyEntityStore,
  ProgramsEtlStoreError,
  ProvisionOutcome,
} from '../application/ports/legacy-entity-store.ts';

export type ProgramsEtlPort = Readonly<{
  programs: LegacyEntityStore<Program, ProgramId>;
  close: () => Promise<void>;
}>;

export type BuildProgramsEtlPortOptions = Readonly<{ connectionString: string }>;

export type BuildProgramsEtlPortError = ProgramsMysqlDriverError;

export const buildProgramsEtlPort = async (
  opts: BuildProgramsEtlPortOptions,
): Promise<Result<ProgramsEtlPort, BuildProgramsEtlPortError>> => {
  // ETL one-shot: aplica migrations (idempotente). legacy_id ja existe em prg_programs (esta fatia).
  const handleR = await openProgramsMysql({
    connectionString: opts.connectionString,
    applyMigrations: true,
  });
  if (!handleR.ok) return err(handleR.error);
  const handle = handleR.value;

  const stores = createDrizzleProgramsEtlStores(handle);

  return ok({
    ...stores,
    close: async () => handle.close(),
  });
};
