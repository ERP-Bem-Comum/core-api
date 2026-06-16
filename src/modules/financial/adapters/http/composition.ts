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
import {
  createInMemoryTimelineRepository,
  type TimelineStore,
} from '../persistence/repos/timeline-repository.in-memory.ts';
import { createInMemoryOutbox } from '../outbox/outbox.in-memory.ts';
import { createDrizzleDocumentRepository } from '../persistence/repos/document-repository.drizzle.ts';
import { createDrizzleTimelineRepository } from '../persistence/repos/timeline-repository.drizzle.ts';
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
import { getDocumentTimeline } from '../../application/use-cases/get-document-timeline.ts';
import type { DocumentRepository } from '../../domain/document/repository.ts';
import type { FinancialTimelineRepository } from '../../domain/timeline/repository.ts';
import type { FinancialTimelineEntry } from '../../domain/timeline/types.ts';

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
  /** Trilha por-campo (Time Travel) de um documento — consumido pelo GET /documents/:id/timeline. */
  getDocumentTimeline: ReturnType<typeof getDocumentTimeline>;
  shutdown: () => Promise<void>;
}>;

type Pools = Readonly<{
  repo: DocumentRepository;
  // Repo de LEITURA da trilha. Na escrita, o `save` do DocumentRepository grava a trilha
  // na mesma transação (memory: store compartilhado; mysql: dentro da tx do save).
  timelineRepo: FinancialTimelineRepository;
  shutdown: () => Promise<void>;
}>;

const buildMemoryPools = (): Pools => {
  // Store compartilhado entre o document-repo (escreve trilha no save) e o timeline-repo
  // (lê). Garante atomicidade em memória sem tx (timeline-repository.in-memory.ts §store).
  const timelineStore: TimelineStore = new Map<string, FinancialTimelineEntry[]>();
  const repo = createInMemoryDocumentRepository(timelineStore);
  const timelineRepo = createInMemoryTimelineRepository(timelineStore);
  return { repo, timelineRepo, shutdown: () => Promise.resolve() };
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
    // Leitura da trilha via pool (a escrita é feita dentro da tx do document-repo.save).
    timelineRepo: createDrizzleTimelineRepository(handle),
    shutdown: () => handle.close(),
  };
};

const makeDeps = (pools: Pools): FinancialHttpDeps => {
  const outbox = createInMemoryOutbox();
  const clock = ClockReal();
  // Deps base (repo + outbox); os 6 use cases mutantes também recebem `clock` para
  // carimbar `occurredAt` das entries da trilha (timeline-recording.ts).
  const deps = { repo: pools.repo, outbox: outbox.port, clock };
  return {
    saveDocument: saveDocument(deps),
    saveDraft: saveDraft(deps),
    adjustDocument: adjustDocument(deps),
    approveDocument: approveDocument(deps),
    undoApproval: undoApproval(deps),
    cancelDocument: cancelDocument({ repo: pools.repo, outbox: outbox.port }),
    submitDraft: submitDraft(deps),
    findDocumentById: pools.repo.findById,
    listDocuments: pools.repo.findPaged,
    getDocumentTimeline: getDocumentTimeline({ timelineRepo: pools.timelineRepo }),
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
