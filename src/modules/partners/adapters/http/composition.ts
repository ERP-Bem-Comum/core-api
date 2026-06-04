/**
 * Composition root do módulo partners para a borda HTTP (ADR-0006/0026/0028/0033).
 *
 * Monta os adapters por driver (memory|mysql) com RW split (ADR-0026): abre um pool
 * writer e um reader; `readerUrl` ausente reusa o writer (single-node). Reads
 * (`listCollaborators`, `getCollaboratorById`) roteiam ao reader. `PartnersHttpDeps` expõe
 * os use cases/readers prontos — o plugin só os invoca. Espelha `contracts/adapters/http/composition.ts`.
 *
 * P1a: read-model enriquecido (`CollaboratorReader`) para o detalhe (agregado + legacyId +
 * timestamps). `seed` (memory, dev/test) popula o reader.
 */

import { ok, type Result } from '#src/shared/primitives/result.ts';
import { ClockReal } from '#src/shared/adapters/clock-real.ts';
import * as CollaboratorId from '#src/modules/partners/domain/collaborator/collaborator-id.ts';
import * as SupplierId from '#src/modules/partners/domain/supplier/supplier-id.ts';

import { makeInMemoryCollaboratorStore } from '../persistence/repos/collaborator-repository.in-memory.ts';
import { createDrizzleCollaboratorStore } from '../persistence/repos/collaborator-repository.drizzle.ts';
import { makeInMemoryCollaboratorReader } from '../persistence/repos/collaborator-reader.in-memory.ts';
import { createDrizzleCollaboratorReader } from '../persistence/repos/collaborator-reader.drizzle.ts';
import { makeInMemorySupplierReader } from '../persistence/repos/supplier-reader.in-memory.ts';
import { createDrizzleSupplierReader } from '../persistence/repos/supplier-reader.drizzle.ts';
import { makeInMemorySupplierStore } from '../persistence/repos/supplier-repository.in-memory.ts';
import { createDrizzleSupplierStore } from '../persistence/repos/supplier-repository.drizzle.ts';
import {
  openPartnersMysql,
  type PartnersMysqlHandle,
} from '../persistence/drivers/mysql-driver.ts';

import { registerSupplier } from '../../application/use-cases/register-supplier.ts';
import { deactivateSupplier } from '../../application/use-cases/deactivate-supplier.ts';
import { reactivateSupplier } from '../../application/use-cases/reactivate-supplier.ts';
import type { SupplierRepository } from '../../domain/supplier/repository.ts';
import { listCollaborators } from '../../application/use-cases/list-collaborators.ts';
import { registerCollaborator } from '../../application/use-cases/register-collaborator.ts';
import { completeCollaboratorRegistration } from '../../application/use-cases/complete-collaborator-registration.ts';
import { deactivateCollaborator } from '../../application/use-cases/deactivate-collaborator.ts';
import { reactivateCollaborator } from '../../application/use-cases/reactivate-collaborator.ts';
import type { CollaboratorRepository } from '../../domain/collaborator/repository.ts';
import type {
  CollaboratorReader,
  CollaboratorReadRecord,
  CollaboratorReaderError,
} from '../../application/ports/collaborator-reader.ts';
import type {
  SupplierReader,
  SupplierReadRecord,
  SupplierReaderError,
} from '../../application/ports/supplier-reader.ts';

export type PartnersDriver = 'memory' | 'mysql';

/** Seed dev/test (driver memory). Popula os readers com read-records. Ignorado em mysql. */
export type PartnersSeed = Readonly<{
  collaborators?: readonly CollaboratorReadRecord[];
  suppliers?: readonly SupplierReadRecord[];
}>;

export type PartnersCompositionConfig = Readonly<{
  driver: PartnersDriver;
  /** Pool writer (obrigatório p/ driver mysql). */
  writerUrl?: string;
  /** Pool reader (réplica). Ausente/igual ao writer → reusa o writer (single-node). */
  readerUrl?: string;
  /** Seed dev/test (memory). Ignorado em mysql. */
  seed?: PartnersSeed;
}>;

export type PartnersHttpDeps = Readonly<{
  listCollaborators: ReturnType<typeof listCollaborators>;
  /** Detalhe enriquecido por UUID (read-model: agregado + legacyId + timestamps). */
  getCollaboratorById: (
    id: string,
  ) => Promise<Result<CollaboratorReadRecord | null, CollaboratorReaderError>>;
  /** Lista todos os read-records (filtro/paginação aplicados na borda — P1b). */
  listCollaboratorRecords: () => Promise<
    Result<readonly CollaboratorReadRecord[], CollaboratorReaderError>
  >;
  /** Escrita (writer pool, P2): cadastro e complementação. */
  registerCollaborator: ReturnType<typeof registerCollaborator>;
  completeCollaboratorRegistration: ReturnType<typeof completeCollaboratorRegistration>;
  /** Soft-delete (writer pool, P3). */
  deactivateCollaborator: ReturnType<typeof deactivateCollaborator>;
  reactivateCollaborator: ReturnType<typeof reactivateCollaborator>;
  /** Fornecedores — leitura (reader pool, S1). */
  getSupplierById: (id: string) => Promise<Result<SupplierReadRecord | null, SupplierReaderError>>;
  listSupplierRecords: () => Promise<Result<readonly SupplierReadRecord[], SupplierReaderError>>;
  /** Fornecedores — escrita (writer pool, S2/S3). */
  registerSupplier: ReturnType<typeof registerSupplier>;
  deactivateSupplier: ReturnType<typeof deactivateSupplier>;
  reactivateSupplier: ReturnType<typeof reactivateSupplier>;
  shutdown: () => Promise<void>;
}>;

type Pools = Readonly<{
  collaboratorReaderRepo: CollaboratorRepository;
  collaboratorWriterRepo: CollaboratorRepository;
  collaboratorReader: CollaboratorReader;
  supplierReader: SupplierReader;
  supplierWriterRepo: SupplierRepository;
  shutdown: () => Promise<void>;
}>;

const buildMemoryPools = (config: PartnersCompositionConfig): Pools => {
  // RW split sem efeito físico em memory: reader = writer = mesmo store de agregados.
  const { repository } = makeInMemoryCollaboratorStore();
  return {
    collaboratorReaderRepo: repository,
    collaboratorWriterRepo: repository,
    collaboratorReader: makeInMemoryCollaboratorReader(config.seed?.collaborators ?? []),
    supplierReader: makeInMemorySupplierReader(config.seed?.suppliers ?? []),
    supplierWriterRepo: makeInMemorySupplierStore().repository,
    shutdown: () => Promise.resolve(),
  };
};

const buildMysqlPools = async (config: PartnersCompositionConfig): Promise<Pools> => {
  const writerUrl = config.writerUrl ?? '';
  const clock = ClockReal();
  const writerR = await openPartnersMysql({ connectionString: writerUrl, applyMigrations: true });
  if (!writerR.ok) {
    throw new Error(`partners-composition: falha ao abrir writer (${writerR.error})`);
  }
  const writerHandle = writerR.value;

  const { readerUrl } = config;
  const distinctReader = readerUrl !== undefined && readerUrl.length > 0 && readerUrl !== writerUrl;
  let readerHandle: PartnersMysqlHandle = writerHandle;
  if (distinctReader) {
    const readerR = await openPartnersMysql({
      connectionString: readerUrl,
      applyMigrations: false,
    });
    if (!readerR.ok) {
      await writerHandle.close();
      throw new Error(`partners-composition: falha ao abrir reader (${readerR.error})`);
    }
    readerHandle = readerR.value;
  }

  return {
    collaboratorReaderRepo: createDrizzleCollaboratorStore(readerHandle, clock),
    collaboratorWriterRepo: createDrizzleCollaboratorStore(writerHandle, clock),
    collaboratorReader: createDrizzleCollaboratorReader(readerHandle),
    supplierReader: createDrizzleSupplierReader(readerHandle),
    supplierWriterRepo: createDrizzleSupplierStore(writerHandle, clock),
    shutdown: async () => {
      await writerHandle.close();
      if (readerHandle !== writerHandle) await readerHandle.close();
    },
  };
};

const makeDeps = (pools: Pools): PartnersHttpDeps => {
  const clock = ClockReal();
  return {
    listCollaborators: listCollaborators({ collaboratorRepo: pools.collaboratorReaderRepo }),
    getCollaboratorById: async (rawId) => {
      // Zod já valida o formato UUID na rota; rehydrate defensivo → id desconhecido = ok(null).
      const idR = CollaboratorId.rehydrate(rawId);
      if (!idR.ok) return ok(null);
      return pools.collaboratorReader.getById(idR.value);
    },
    listCollaboratorRecords: pools.collaboratorReader.list,
    registerCollaborator: registerCollaborator({
      collaboratorRepo: pools.collaboratorWriterRepo,
      clock,
    }),
    completeCollaboratorRegistration: completeCollaboratorRegistration({
      collaboratorRepo: pools.collaboratorWriterRepo,
      clock,
    }),
    deactivateCollaborator: deactivateCollaborator({
      collaboratorRepo: pools.collaboratorWriterRepo,
      clock,
    }),
    reactivateCollaborator: reactivateCollaborator({
      collaboratorRepo: pools.collaboratorWriterRepo,
      clock,
    }),
    getSupplierById: async (rawId) => {
      const idR = SupplierId.rehydrate(rawId);
      if (!idR.ok) return ok(null);
      return pools.supplierReader.getById(idR.value);
    },
    listSupplierRecords: pools.supplierReader.list,
    registerSupplier: registerSupplier({ supplierRepo: pools.supplierWriterRepo, clock }),
    deactivateSupplier: deactivateSupplier({ supplierRepo: pools.supplierWriterRepo, clock }),
    reactivateSupplier: reactivateSupplier({ supplierRepo: pools.supplierWriterRepo, clock }),
    shutdown: pools.shutdown,
  };
};

export const buildPartnersHttpDeps = async (
  config: PartnersCompositionConfig,
): Promise<PartnersHttpDeps> => {
  if (config.driver === 'memory') {
    return makeDeps(buildMemoryPools(config));
  }
  if (config.writerUrl === undefined || config.writerUrl.length === 0) {
    throw new Error('partners-composition: driver mysql exige writerUrl');
  }
  return makeDeps(await buildMysqlPools(config));
};
