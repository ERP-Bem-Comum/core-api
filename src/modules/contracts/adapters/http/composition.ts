/**
 * Composition root do módulo contracts para a borda HTTP (ADR-0006/0026/0028).
 *
 * Monta os adapters por driver (memory|mysql) com **RW split** (ADR-0026): abre um
 * pool *writer* e um pool *reader*; `readerUrl` ausente reusa o writer (single-node).
 * Leituras (`listContracts`/`getContract`) são wiradas ao **reader**; mutações ao
 * **writer** (read-after-write — a resposta serializa o agregado pós-save).
 * `ContractsHttpDeps` expõe os use cases prontos — o plugin só os invoca.
 *
 * Storage de documentos (C3, ADR-0019): `createInMemoryDocumentStorage` em memory;
 * `createS3DocumentStorage` (S3/MinIO via env `S3_*`) em mysql. `bucket`/`storageKeyPrefix`
 * vêm de config/env, nunca do cliente (D4).
 *
 * Timeline (C1 D2): read-model InMemory para ambos os drivers (sem Drizzle ainda).
 * Seed (C2 D2/D3): dev/test only, repos do writer em memory; ignorado em mysql.
 */

import process from 'node:process';

import { ClockReal } from '#src/shared/adapters/clock-real.ts';
import type { Result } from '#src/shared/primitives/result.ts';

import { InMemoryContractRepository } from '../persistence/repos/contract-repository.in-memory.ts';
import { InMemoryAmendmentRepository } from '../persistence/repos/amendment-repository.in-memory.ts';
import { InMemoryDocumentRepository } from '../persistence/repos/document-repository.in-memory.ts';
import { InMemoryTimelineRepository } from '../persistence/repos/timeline-repository.in-memory.ts';
import { createDrizzleContractRepository } from '../persistence/repos/contract-repository.drizzle.ts';
import { createDrizzleAmendmentRepository } from '../persistence/repos/amendment-repository.drizzle.ts';
import { DocumentRepositoryDrizzle } from '../persistence/repos/document-repository.drizzle.ts';
import { openMysql, type MysqlHandle } from '../persistence/drivers/mysql-driver.ts';
import { createInMemoryDocumentStorage } from '../storage/document-storage.in-memory.ts';
import { createS3DocumentStorage } from '../storage/document-storage.s3.ts';
import { parseAwsS3Env } from '../storage/s3-config-aws.ts';

import { listContracts } from '../../application/use-cases/list-contracts.ts';
import { getContract } from '../../application/use-cases/get-contract.ts';
import { getContractDetail } from '../../application/use-cases/get-contract-detail.ts';
import { getContractTimeline } from '../../application/use-cases/get-contract-timeline.ts';
import { createContract } from '../../application/use-cases/create-contract.ts';
import { createPendingContract } from '../../application/use-cases/create-pending-contract.ts';
import { updateContractMetadata } from '../../application/use-cases/update-contract-metadata.ts';
import { activateContract } from '../../application/use-cases/activate-contract.ts';
import { endContract } from '../../application/use-cases/end-contract.ts';
import { createAmendment } from '../../application/use-cases/create-amendment.ts';
import { homologateAmendment } from '../../application/use-cases/homologate-amendment.ts';
import { uploadDocument } from '../../application/use-cases/upload-document.ts';
import { attachSignedDocument } from '../../application/use-cases/attach-signed-document.ts';
import { supersedeDocument } from '../../application/use-cases/supersede-document.ts';
import { deleteDocument } from '../../application/use-cases/delete-document.ts';
import { getDocumentContent } from '../../application/use-cases/get-document-content.ts';

import { composeContractor, type ContractorBlock } from './contractor-composition.ts';
import {
  buildPartnersReadPort,
  type ContractorReadPort,
} from '#src/modules/partners/public-api/index.ts';

import * as AmendmentId from '../../domain/shared/amendment-id.ts';
import type { AmendmentIdError } from '../../domain/shared/amendment-id.ts';
import type { ContractorRef } from '../../domain/shared/contractor.ts';
import * as DocumentId from '../../domain/shared/document-id.ts';
import type { DocumentIdError } from '../../domain/shared/document-id.ts';
import type { ContractRepository } from '../../domain/contract/repository.ts';
import type {
  AmendmentRepository,
  AmendmentRepositoryError,
} from '../../domain/amendment/repository.ts';
import type {
  DocumentRepository,
  DocumentRepositoryError,
} from '../../domain/document/repository.ts';
import type { TimelineRepository } from '../../domain/timeline/repository.ts';
import type { DocumentStorage } from '../../application/ports/document-storage.ts';
import type { Contract } from '../../domain/contract/types.ts';
import type { Amendment } from '../../domain/amendment/types.ts';
import type { ContractDocument } from '../../domain/document/types.ts';

export type ContractsDriver = 'memory' | 'mysql';

const DEFAULT_DOCUMENT_BUCKET = 'contracts-documents';
const DEFAULT_DOCUMENT_KEY_PREFIX = 'contracts';

/** Seed dev/test (driver memory — C2 D2/D3). Aplicado nos repos do writer. Ignorado em mysql. */
export type ContractsSeed = Readonly<{
  contracts?: readonly Contract[];
  amendments?: readonly Amendment[];
  documents?: readonly ContractDocument[];
}>;

export type ContractsCompositionConfig = Readonly<{
  driver: ContractsDriver;
  /** Pool writer (obrigatório p/ driver mysql). */
  writerUrl?: string;
  /** Pool reader (réplica). Ausente/igual ao writer → reusa o writer (single-node). */
  readerUrl?: string;
  /** Seed dev/test (memory). Ignorado em mysql. */
  seed?: ContractsSeed;
  /** Bucket de documentos (memory; em mysql vem da env S3_BUCKET). Default `contracts-documents`. */
  documentBucket?: string;
  /** Prefixo de storage key. Default `contracts`. */
  documentKeyPrefix?: string;
  /**
   * Read port do contratado (public-api de Parceiros, ADR-0032). Injetável em testes
   * (memory). Em mysql, se ausente, é construído via `buildPartnersReadPort(writerUrl)`.
   * Ausente em memory → composição degrada (`snapshot: null`).
   */
  contractorReadPort?: ContractorReadPort;
}>;

/** Reader leve de aditivo — usado pela borda p/ checagem de ownership (IDOR), não muta estado. */
export type GetAmendment = (
  amendmentId: string,
) => Promise<Result<Amendment | null, AmendmentIdError | AmendmentRepositoryError>>;

/** Reader leve de documento — ownership do supersede (E3), não muta estado. */
export type GetDocument = (
  documentId: string,
) => Promise<Result<ContractDocument | null, DocumentIdError | DocumentRepositoryError>>;

export type ContractsHttpDeps = Readonly<{
  listContracts: ReturnType<typeof listContracts>;
  /** Listagem completa não-paginada — usada pelo export CSV (C4). Reusa `contractRepo.list()`. */
  listAllContracts: ContractRepository['list'];
  getContract: ReturnType<typeof getContract>;
  getContractDetail: ReturnType<typeof getContractDetail>;
  /** Composição transitória do contratado na borda (ADR-0032). Degrada p/ snapshot null. */
  getContractorBlock: (ref: ContractorRef) => Promise<ContractorBlock>;
  getContractTimeline: ReturnType<typeof getContractTimeline>;
  createContract: ReturnType<typeof createContract>;
  createPendingContract: ReturnType<typeof createPendingContract>;
  updateContractMetadata: ReturnType<typeof updateContractMetadata>;
  activateContract: ReturnType<typeof activateContract>;
  endContract: ReturnType<typeof endContract>;
  createAmendment: ReturnType<typeof createAmendment>;
  homologateAmendment: ReturnType<typeof homologateAmendment>;
  uploadDocument: ReturnType<typeof uploadDocument>;
  attachSignedDocument: ReturnType<typeof attachSignedDocument>;
  supersedeDocument: ReturnType<typeof supersedeDocument>;
  deleteDocument: ReturnType<typeof deleteDocument>;
  getDocumentContent: ReturnType<typeof getDocumentContent>;
  getAmendment: GetAmendment;
  getDocument: GetDocument;
  documentBucket: string;
  documentKeyPrefix: string;
  shutdown: () => Promise<void>;
}>;

type Pools = Readonly<{
  contractReaderRepo: ContractRepository;
  contractWriterRepo: ContractRepository;
  amendmentRepo: AmendmentRepository;
  documentRepo: DocumentRepository;
  documentStorage: DocumentStorage;
  documentBucket: string;
  contractorReadPort: ContractorReadPort | null;
  shutdown: () => Promise<void>;
}>;

const applyMemorySeed = async (seed: ContractsSeed, pools: Pools): Promise<void> => {
  for (const c of seed.contracts ?? []) {
    const r = await pools.contractWriterRepo.save(c, []);
    if (!r.ok) {
      const code = typeof r.error === 'string' ? r.error : r.error.tag;
      throw new Error(`contracts-composition: seed de contrato falhou (${code})`);
    }
  }
  for (const a of seed.amendments ?? []) {
    const r = await pools.amendmentRepo.save(a, []);
    if (!r.ok) {
      const code = typeof r.error === 'string' ? r.error : r.error.tag;
      throw new Error(`contracts-composition: seed de aditivo falhou (${code})`);
    }
  }
  for (const d of seed.documents ?? []) {
    const r = await pools.documentRepo.save(d, []);
    if (!r.ok) throw new Error(`contracts-composition: seed de documento falhou (${r.error})`);
  }
};

const buildMemoryPools = async (config: ContractsCompositionConfig): Promise<Pools> => {
  // RW split sem efeito físico em memory: reader = writer = mesmo store de contratos.
  const { repo: contractRepo } = InMemoryContractRepository();
  const { repo: amendmentRepo } = InMemoryAmendmentRepository();
  const { repo: documentRepo } = InMemoryDocumentRepository();
  const pools: Pools = {
    contractReaderRepo: contractRepo,
    contractWriterRepo: contractRepo,
    amendmentRepo,
    documentRepo,
    documentStorage: createInMemoryDocumentStorage(),
    documentBucket: config.documentBucket ?? DEFAULT_DOCUMENT_BUCKET,
    // Memory não tem Parceiros real: usa o port injetado (testes) ou null (degrada).
    contractorReadPort: config.contractorReadPort ?? null,
    shutdown: () => Promise.resolve(),
  };
  if (config.seed !== undefined) await applyMemorySeed(config.seed, pools);
  return pools;
};

const buildMysqlPools = async (config: ContractsCompositionConfig): Promise<Pools> => {
  const writerUrl = config.writerUrl ?? '';
  const writerR = await openMysql({ connectionString: writerUrl, applyMigrations: true });
  if (!writerR.ok) {
    throw new Error(`contracts-composition: falha ao abrir writer (${writerR.error})`);
  }
  const writerHandle = writerR.value;

  const { readerUrl } = config;
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

  const s3R = parseAwsS3Env(process.env);
  if (!s3R.ok) {
    await writerHandle.close();
    if (readerHandle !== writerHandle) await readerHandle.close();
    throw new Error(`contracts-composition: storage S3 mal configurado (${s3R.error.tag})`);
  }

  // Contratado (ADR-0032): read port da public-api de Parceiros. Reusa o servidor MySQL
  // do writer (lê `par_*`, ADR-0014). Port injetado tem precedência (testes); o construído
  // abre pool próprio e é fechado no shutdown.
  let contractorReadPort: ContractorReadPort | null = config.contractorReadPort ?? null;
  let closeContractorPort: () => Promise<void> = () => Promise.resolve();
  if (contractorReadPort === null) {
    const portR = await buildPartnersReadPort({ connectionString: writerUrl });
    if (!portR.ok) {
      await writerHandle.close();
      if (readerHandle !== writerHandle) await readerHandle.close();
      throw new Error(`contracts-composition: falha ao abrir partners read port (${portR.error})`);
    }
    contractorReadPort = portR.value;
    closeContractorPort = portR.value.close;
  }

  return {
    contractReaderRepo: createDrizzleContractRepository(readerHandle),
    contractWriterRepo: createDrizzleContractRepository(writerHandle),
    amendmentRepo: createDrizzleAmendmentRepository(writerHandle),
    documentRepo: DocumentRepositoryDrizzle(writerHandle.db),
    documentStorage: createS3DocumentStorage(s3R.value),
    documentBucket: String(s3R.value.bucket),
    contractorReadPort,
    shutdown: async () => {
      await closeContractorPort();
      await writerHandle.close();
      if (readerHandle !== writerHandle) await readerHandle.close();
    },
  };
};

const makeDeps = (
  pools: Pools,
  timelineRepo: TimelineRepository,
  documentKeyPrefix: string,
): ContractsHttpDeps => {
  const clock = ClockReal();
  return {
    // Reads → reader pool.
    listContracts: listContracts({ contractRepo: pools.contractReaderRepo }),
    listAllContracts: pools.contractReaderRepo.list,
    getContract: getContract({ contractRepo: pools.contractReaderRepo }),
    // Detalhe enriquecido (ADR-0032): composição de leitura Contract + Amendment[] + Document[].
    getContractDetail: getContractDetail({
      contractRepo: pools.contractReaderRepo,
      amendmentRepo: pools.amendmentRepo,
      documentRepo: pools.documentRepo,
    }),
    getContractTimeline: getContractTimeline({ timelineRepo }),
    // Composição do contratado na borda (ADR-0032) — degrada p/ snapshot null.
    getContractorBlock: (ref) => composeContractor(pools.contractorReadPort, ref),
    // Writes → writer pool.
    createContract: createContract({ contractRepo: pools.contractWriterRepo, clock }),
    createPendingContract: createPendingContract({ contractRepo: pools.contractWriterRepo, clock }),
    updateContractMetadata: updateContractMetadata({ contractRepo: pools.contractWriterRepo }),
    activateContract: activateContract({
      contractRepo: pools.contractWriterRepo,
      documentRepo: pools.documentRepo,
    }),
    endContract: endContract({
      contractRepo: pools.contractWriterRepo,
      documentRepo: pools.documentRepo,
      clock,
    }),
    createAmendment: createAmendment({
      contractRepo: pools.contractWriterRepo,
      amendmentRepo: pools.amendmentRepo,
      clock,
    }),
    homologateAmendment: homologateAmendment({
      contractRepo: pools.contractWriterRepo,
      amendmentRepo: pools.amendmentRepo,
      clock,
    }),
    // Documents (C3).
    uploadDocument: uploadDocument({
      clock,
      storage: pools.documentStorage,
      documentRepo: pools.documentRepo,
      contractRepo: pools.contractWriterRepo,
      amendmentRepo: pools.amendmentRepo,
    }),
    attachSignedDocument: attachSignedDocument({
      amendmentRepo: pools.amendmentRepo,
      documentRepo: pools.documentRepo,
    }),
    supersedeDocument: supersedeDocument({ clock, documentRepo: pools.documentRepo }),
    deleteDocument: deleteDocument({ clock, documentRepo: pools.documentRepo }),
    // Conteúdo de documento (CTR-HTTP-DOCUMENT-CONTENT): ownership via documentRepo +
    // amendmentRepo; bytes via storage. Read-only — sem clock/event.
    getDocumentContent: getDocumentContent({
      documentRepo: pools.documentRepo,
      amendmentRepo: pools.amendmentRepo,
      storage: pools.documentStorage,
    }),
    getAmendment: async (amendmentId) => {
      const idR = AmendmentId.rehydrate(amendmentId);
      if (!idR.ok) return idR;
      return pools.amendmentRepo.findById(idR.value);
    },
    getDocument: async (documentId) => {
      const idR = DocumentId.rehydrate(documentId);
      if (!idR.ok) return idR;
      return pools.documentRepo.findById(idR.value);
    },
    documentBucket: pools.documentBucket,
    documentKeyPrefix,
    shutdown: pools.shutdown,
  };
};

export const buildContractsHttpDeps = async (
  config: ContractsCompositionConfig,
): Promise<ContractsHttpDeps> => {
  // D2: timeline sempre InMemory (sem persistência Drizzle ainda) — para ambos os drivers.
  const timelineRepo = InMemoryTimelineRepository();
  const keyPrefix = config.documentKeyPrefix ?? DEFAULT_DOCUMENT_KEY_PREFIX;

  if (config.driver === 'memory') {
    return makeDeps(await buildMemoryPools(config), timelineRepo, keyPrefix);
  }

  if (config.seed !== undefined) {
    process.stderr.write(
      'contracts-composition: `seed` é ignorado no driver mysql (uso dev/test only)\n',
    );
  }
  if (config.writerUrl === undefined || config.writerUrl.length === 0) {
    throw new Error('contracts-composition: driver mysql exige writerUrl');
  }
  return makeDeps(await buildMysqlPools(config), timelineRepo, keyPrefix);
};
