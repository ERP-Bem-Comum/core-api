/**
 * Composition root do módulo financial para a borda HTTP (ADR-0006/0025/0027).
 *
 * Espelha `contracts/adapters/http/composition.ts`: monta adapters por driver
 * (memory | mysql) e instancia os use cases. `FinancialHttpDeps` expõe os use
 * cases prontos — o plugin os invoca sem conhecer a infra.
 *
 * Driver memory (default): in-memory repos + in-memory outbox. Sem DB.
 * Driver mysql: Drizzle/mysql2 via `openMysqlFinancial`; migrations no boot.
 *
 * O outbox da Fatia 1 é sempre in-memory (worker de delivery é fatia futura).
 */

import { ClockReal } from '#src/shared/adapters/clock-real.ts';

import { createInMemoryDocumentRepository } from '../persistence/repos/document-repository.in-memory.ts';
import { createInMemoryOutbox } from '../outbox/outbox.in-memory.ts';
import { createDrizzleDocumentRepository } from '../persistence/repos/document-repository.drizzle.ts';
import {
  openMysqlFinancial,
  type FinancialMysqlHandle,
} from '../persistence/drivers/mysql-driver.ts';

import { saveDocument } from '../../application/use-cases/save-document.ts';
import { saveDraft } from '../../application/use-cases/save-draft.ts';
import { adjustDocument } from '../../application/use-cases/adjust-document.ts';
import { approveDocument } from '../../application/use-cases/approve-document.ts';
import { undoApproval } from '../../application/use-cases/undo-approval.ts';
import { cancelDocument } from '../../application/use-cases/cancel-document.ts';
import { submitDraft } from '../../application/use-cases/submit-draft.ts';
import type { DocumentRepository } from '../../domain/document/repository.ts';

export type FinancialDriver = 'memory' | 'mysql';

export type FinancialCompositionConfig = Readonly<{
  driver: FinancialDriver;
  /** URL de conexão MySQL (obrigatório para driver mysql). */
  writerUrl?: string;
}>;

export type FinancialHttpDeps = Readonly<{
  saveDocument: ReturnType<typeof saveDocument>;
  saveDraft: ReturnType<typeof saveDraft>;
  adjustDocument: ReturnType<typeof adjustDocument>;
  approveDocument: ReturnType<typeof approveDocument>;
  undoApproval: ReturnType<typeof undoApproval>;
  cancelDocument: ReturnType<typeof cancelDocument>;
  submitDraft: ReturnType<typeof submitDraft>;
  /** Leitura direta do repositório — usado pelo GET /documents/:id. */
  findDocumentById: DocumentRepository['findById'];
  /** Listagem paginada (US1 — read path no writer pool; split reader/writer diferido — ADR-0003). */
  listDocuments: DocumentRepository['findPaged'];
  shutdown: () => Promise<void>;
}>;

type Pools = Readonly<{
  repo: DocumentRepository;
  shutdown: () => Promise<void>;
}>;

const buildMemoryPools = (): Pools => {
  const repo = createInMemoryDocumentRepository();
  return { repo, shutdown: () => Promise.resolve() };
};

const buildMysqlPools = async (config: FinancialCompositionConfig): Promise<Pools> => {
  const writerUrl = config.writerUrl ?? '';
  const handleR = await openMysqlFinancial({
    connectionString: writerUrl,
    applyMigrations: true,
  });
  if (!handleR.ok) {
    throw new Error(`financial-composition: falha ao abrir pool MySQL (${handleR.error})`);
  }
  const handle: FinancialMysqlHandle = handleR.value;
  return {
    repo: createDrizzleDocumentRepository(handle),
    shutdown: () => handle.close(),
  };
};

const makeDeps = (pools: Pools): FinancialHttpDeps => {
  const outbox = createInMemoryOutbox();
  const clock = ClockReal();
  const deps = { repo: pools.repo, outbox: outbox.port };
  return {
    saveDocument: saveDocument(deps),
    saveDraft: saveDraft(deps),
    adjustDocument: adjustDocument(deps),
    approveDocument: approveDocument({ ...deps, clock }),
    undoApproval: undoApproval(deps),
    cancelDocument: cancelDocument(deps),
    submitDraft: submitDraft(deps),
    findDocumentById: pools.repo.findById,
    listDocuments: pools.repo.findPaged,
    shutdown: pools.shutdown,
  };
};

export const buildFinancialHttpDeps = async (
  config: FinancialCompositionConfig,
): Promise<FinancialHttpDeps> => {
  if (config.driver === 'memory') {
    return makeDeps(buildMemoryPools());
  }

  if (config.writerUrl === undefined || config.writerUrl.length === 0) {
    throw new Error('financial-composition: driver mysql exige writerUrl');
  }
  return makeDeps(await buildMysqlPools(config));
};
