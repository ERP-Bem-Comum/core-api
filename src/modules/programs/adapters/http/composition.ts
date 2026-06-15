/**
 * Composition root do módulo programs para a borda HTTP (ADR-0006/0019/0033).
 *
 * Monta os adapters por driver (memory|mysql) e instancia os use cases. `ProgramsHttpDeps`
 * expõe os use cases prontos — o plugin só os invoca. Espelha `partners/adapters/http/composition.ts`.
 *
 * Logo storage (FR-021/ADR-0019): InMemory por padrão; S3/MinIO quando `logo` é fornecido
 * (driver mysql/prod). O programs não tem reader port separado — pool writer único.
 */

import { ClockReal } from '#src/shared/adapters/clock-real.ts';

import { InMemoryProgramRepository } from '../persistence/repos/program-repository.in-memory.ts';
import { createDrizzleProgramRepository } from '../persistence/repos/program-repository.drizzle.ts';
import {
  openProgramsMysql,
  type ProgramsMysqlHandle,
} from '../persistence/drivers/mysql-driver.ts';
import { makeInMemoryLogoStorage } from '../storage/logo-storage.in-memory.ts';
import { createS3LogoStorage, type LogoS3Config } from '../storage/logo-storage.s3.ts';

import type { ProgramRepository } from '../../domain/program/repository.ts';
import type { LogoStorage } from '../../application/ports/logo-storage.ts';
import { createProgram } from '../../application/use-cases/create-program.ts';
import { listPrograms } from '../../application/use-cases/list-programs.ts';
import { getProgram } from '../../application/use-cases/get-program.ts';
import { updateProgram } from '../../application/use-cases/update-program.ts';
import { deactivateProgram } from '../../application/use-cases/deactivate-program.ts';
import { reactivateProgram } from '../../application/use-cases/reactivate-program.ts';
import { uploadProgramLogo } from '../../application/use-cases/upload-program-logo.ts';
import { getProgramLogo } from '../../application/use-cases/get-program-logo.ts';

export type ProgramsDriver = 'memory' | 'mysql';

export type ProgramsCompositionConfig = Readonly<{
  driver: ProgramsDriver;
  /** Pool writer (obrigatório p/ driver mysql). */
  writerUrl?: string;
  /** Config S3/MinIO do logo (driver mysql/prod). Ausente -> storage in-memory. */
  logo?: LogoS3Config;
}>;

export type ProgramsHttpDeps = Readonly<{
  createProgram: ReturnType<typeof createProgram>;
  listPrograms: ReturnType<typeof listPrograms>;
  getProgram: ReturnType<typeof getProgram>;
  updateProgram: ReturnType<typeof updateProgram>;
  deactivateProgram: ReturnType<typeof deactivateProgram>;
  reactivateProgram: ReturnType<typeof reactivateProgram>;
  uploadProgramLogo: ReturnType<typeof uploadProgramLogo>;
  /** Leitura dos bytes do logo (PRG-LOGO-CONTENT) — GET /api/v1/programs/:id/logo. */
  getProgramLogo: ReturnType<typeof getProgramLogo>;
  shutdown: () => Promise<void>;
}>;

type Pools = Readonly<{
  repo: ProgramRepository;
  storage: LogoStorage;
  shutdown: () => Promise<void>;
}>;

const selectStorage = (config: ProgramsCompositionConfig): LogoStorage =>
  config.logo !== undefined ? createS3LogoStorage(config.logo) : makeInMemoryLogoStorage();

const buildMemoryPools = (config: ProgramsCompositionConfig): Pools => ({
  repo: InMemoryProgramRepository().repo,
  storage: selectStorage(config),
  shutdown: () => Promise.resolve(),
});

const buildMysqlPools = async (config: ProgramsCompositionConfig): Promise<Pools> => {
  const writerUrl = config.writerUrl ?? '';
  const handleR = await openProgramsMysql({ connectionString: writerUrl, applyMigrations: true });
  if (!handleR.ok) {
    throw new Error(`programs-composition: falha ao abrir writer (${handleR.error})`);
  }
  const handle: ProgramsMysqlHandle = handleR.value;
  return {
    repo: createDrizzleProgramRepository(handle),
    storage: selectStorage(config),
    shutdown: handle.close,
  };
};

const makeDeps = (pools: Pools): ProgramsHttpDeps => {
  const clock = ClockReal();
  const programRepo = pools.repo;
  return {
    createProgram: createProgram({ programRepo, clock }),
    listPrograms: listPrograms({ programRepo }),
    getProgram: getProgram({ programRepo }),
    updateProgram: updateProgram({ programRepo, clock }),
    deactivateProgram: deactivateProgram({ programRepo, clock }),
    reactivateProgram: reactivateProgram({ programRepo, clock }),
    uploadProgramLogo: uploadProgramLogo({ programRepo, storage: pools.storage, clock }),
    getProgramLogo: getProgramLogo({ programRepo, storage: pools.storage }),
    shutdown: pools.shutdown,
  };
};

export const buildProgramsHttpDeps = async (
  config: ProgramsCompositionConfig,
): Promise<ProgramsHttpDeps> => {
  if (config.driver === 'memory') {
    return makeDeps(buildMemoryPools(config));
  }
  if (config.writerUrl === undefined || config.writerUrl.length === 0) {
    throw new Error('programs-composition: driver mysql exige writerUrl');
  }
  return makeDeps(await buildMysqlPools(config));
};
