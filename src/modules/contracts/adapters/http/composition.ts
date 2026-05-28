/**
 * Composition root do módulo contracts para a borda HTTP (ADR-0006/0026/0028).
 *
 * Monta os adapters por driver (memory|mysql) com **RW split** (ADR-0026): abre um
 * pool *writer* e um pool *reader*; `readerUrl` ausente reusa o writer (single-node —
 * "zero mudança de código, só a connection string", ADR-0026:40). `listContracts`
 * é wirado ao **reader**. `ContractsHttpDeps` expõe os use cases prontos — o plugin
 * só os invoca, sem conhecer adapter algum. Espelha `auth/adapters/http/composition.ts`.
 *
 * C0 expõe apenas a leitura (`listContracts` no reader). As mutações (C2) instanciam
 * o repo no *writer* — o writer pool já fica aberto aqui e é fechado no `shutdown`.
 */

import { InMemoryContractRepository } from '../persistence/repos/contract-repository.in-memory.ts';
import { createDrizzleContractRepository } from '../persistence/repos/contract-repository.drizzle.ts';
import { openMysql, type MysqlHandle } from '../persistence/drivers/mysql-driver.ts';

import { listContracts } from '../../application/use-cases/list-contracts.ts';

import type { ContractRepository } from '../../domain/contract/repository.ts';

export type ContractsDriver = 'memory' | 'mysql';

export type ContractsCompositionConfig = Readonly<{
  driver: ContractsDriver;
  /** Pool writer (obrigatório p/ driver mysql). */
  writerUrl?: string;
  /** Pool reader (réplica). Ausente/igual ao writer → reusa o writer (single-node). */
  readerUrl?: string;
}>;

export type ContractsHttpDeps = Readonly<{
  listContracts: ReturnType<typeof listContracts>;
  shutdown: () => Promise<void>;
}>;

type Pools = Readonly<{
  contractReaderRepo: ContractRepository;
  shutdown: () => Promise<void>;
}>;

const buildMemoryPools = (): Pools => {
  // RW split sem efeito físico em memory: reader = writer = mesmo store (D1/D2).
  const { repo } = InMemoryContractRepository();
  return { contractReaderRepo: repo, shutdown: () => Promise.resolve() };
};

const buildMysqlPools = async (writerUrl: string, readerUrl?: string): Promise<Pools> => {
  const writerR = await openMysql({ connectionString: writerUrl, applyMigrations: true });
  if (!writerR.ok) {
    throw new Error(`contracts-composition: falha ao abrir writer (${writerR.error})`);
  }
  const writerHandle = writerR.value;

  const distinctReader = readerUrl !== undefined && readerUrl.length > 0 && readerUrl !== writerUrl;
  let readerHandle: MysqlHandle = writerHandle;
  if (distinctReader) {
    const readerR = await openMysql({ connectionString: readerUrl, applyMigrations: false });
    if (!readerR.ok) {
      await writerHandle.close();
      throw new Error(`contracts-composition: falha ao abrir reader (${readerR.error})`);
    }
    readerHandle = readerR.value;
  }

  const contractReaderRepo = createDrizzleContractRepository(readerHandle);

  return {
    contractReaderRepo,
    shutdown: async () => {
      await writerHandle.close();
      if (readerHandle !== writerHandle) await readerHandle.close();
    },
  };
};

export const buildContractsHttpDeps = async (
  config: ContractsCompositionConfig,
): Promise<ContractsHttpDeps> => {
  if (config.driver === 'memory') {
    const pools = buildMemoryPools();
    return {
      listContracts: listContracts({ contractRepo: pools.contractReaderRepo }),
      shutdown: pools.shutdown,
    };
  }

  if (config.writerUrl === undefined || config.writerUrl.length === 0) {
    throw new Error('contracts-composition: driver mysql exige writerUrl');
  }
  const pools = await buildMysqlPools(config.writerUrl, config.readerUrl);
  return {
    listContracts: listContracts({ contractRepo: pools.contractReaderRepo }),
    shutdown: pools.shutdown,
  };
};
