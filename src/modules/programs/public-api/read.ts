// Public-API de LEITURA do programa (CTR-NUMBER-PROGRAM). Único ponto pelo qual outro módulo
// (Contratos — coluna/bloco "Programa", ADR-0032) lê programa por id, SEM tocar `prg_*` cru
// (ADR-0006/0014). Espelha `buildPartnersReadPort`: monta o store a partir de uma connection-string,
// sem subir Fastify. Read-only.

import { type Result, ok, err } from '../../../shared/primitives/result.ts';
import {
  openProgramsMysql,
  type ProgramsMysqlDriverError,
} from '../adapters/persistence/drivers/mysql-driver.ts';
import { createDrizzleProgramReadStore } from '../adapters/persistence/repos/program-read.drizzle.ts';
import { createDrizzleProgramListReader } from '../adapters/persistence/repos/program-list-read.drizzle.ts';
import type {
  ProgramReadPort,
  ProgramView,
  ProgramReadError,
} from '../application/ports/program-read.ts';

export type {
  ProgramReadPort,
  ProgramReadError,
  ProgramView,
} from '../application/ports/program-read.ts';

export type ProgramsReadPort = ProgramReadPort &
  Readonly<{
    // Listagem de todos os programas (projeção ProgramView) — consumo cross-módulo (financeiro 020 · US3).
    listAll: () => Promise<Result<readonly ProgramView[], ProgramReadError>>;
    close: () => Promise<void>;
  }>;

export type BuildProgramsReadPortOptions = Readonly<{ connectionString: string }>;

export type BuildProgramsReadPortError = ProgramsMysqlDriverError;

export const buildProgramsReadPort = async (
  opts: BuildProgramsReadPortOptions,
): Promise<Result<ProgramsReadPort, BuildProgramsReadPortError>> => {
  // Leitura: as prg_* já existem (provisionadas pelo módulo programs). Sem applyMigrations.
  const handleR = await openProgramsMysql({
    connectionString: opts.connectionString,
    applyMigrations: false,
  });
  if (!handleR.ok) return err(handleR.error);
  const handle = handleR.value;

  const store = createDrizzleProgramReadStore(handle);
  const listReader = createDrizzleProgramListReader(handle);

  return ok({
    ...store,
    listAll: listReader.listAll,
    close: async () => handle.close(),
  });
};
