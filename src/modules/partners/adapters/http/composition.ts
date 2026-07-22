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
import * as FinancierId from '#src/modules/partners/domain/financier/financier-id.ts';
import * as ActId from '#src/modules/partners/domain/act/act-id.ts';

import { makeInMemoryCollaboratorStore } from '../persistence/repos/collaborator-repository.in-memory.ts';
import { createDrizzleCollaboratorStore } from '../persistence/repos/collaborator-repository.drizzle.ts';
import { makeInMemoryCollaboratorReader } from '../persistence/repos/collaborator-reader.in-memory.ts';
import { createDrizzleCollaboratorReader } from '../persistence/repos/collaborator-reader.drizzle.ts';
import { makeInMemoryCollaboratorHistory } from '../persistence/repos/collaborator-history-repository.in-memory.ts';
import { createDrizzleCollaboratorHistory } from '../persistence/repos/collaborator-history-repository.drizzle.ts';
import { makeInMemorySupplierReader } from '../persistence/repos/supplier-reader.in-memory.ts';
import { createDrizzleSupplierReader } from '../persistence/repos/supplier-reader.drizzle.ts';
import { makeInMemorySupplierStore } from '../persistence/repos/supplier-repository.in-memory.ts';
import { createDrizzleSupplierStore } from '../persistence/repos/supplier-repository.drizzle.ts';
import { makeInMemoryFinancierReader } from '../persistence/repos/financier-reader.in-memory.ts';
import { createDrizzleFinancierReader } from '../persistence/repos/financier-reader.drizzle.ts';
import { makeInMemoryFinancierStore } from '../persistence/repos/financier-repository.in-memory.ts';
import { createDrizzleFinancierStore } from '../persistence/repos/financier-repository.drizzle.ts';
import { makeInMemoryPartnerGeographyStore } from '../persistence/repos/partner-geography-repository.in-memory.ts';
import { createDrizzlePartnerGeographyStore } from '../persistence/repos/partner-geography-repository.drizzle.ts';
import { makeInMemoryActStore } from '../persistence/repos/act-repository.in-memory.ts';
import { createDrizzleActStore } from '../persistence/repos/act-repository.drizzle.ts';
import {
  makeInMemoryActReader,
  makeActReaderFromRepository,
} from '../persistence/repos/act-reader.in-memory.ts';
import { createDrizzleActReader } from '../persistence/repos/act-reader.drizzle.ts';
import { makeInMemoryContractCountStore } from '../persistence/repos/contract-count-store.in-memory.ts';
import { createDrizzleContractCountStore } from '../persistence/repos/contract-count-store.drizzle.ts';
import { makeInMemorySuppliersBatchReader } from '../persistence/repos/suppliers-batch-reader.in-memory.ts';
import { createDrizzleSuppliersBatchReader } from '../persistence/repos/suppliers-batch-reader.drizzle.ts';
import {
  openPartnersMysql,
  type PartnersMysqlHandle,
} from '../persistence/drivers/mysql-driver.ts';

import { registerSupplier } from '../../application/use-cases/register-supplier.ts';
import { deactivateSupplier } from '../../application/use-cases/deactivate-supplier.ts';
import { reactivateSupplier } from '../../application/use-cases/reactivate-supplier.ts';
import { editSupplier } from '../../application/use-cases/edit-supplier.ts';
import type { SupplierRepository } from '../../domain/supplier/repository.ts';
import { registerFinancier } from '../../application/use-cases/register-financier.ts';
import { deactivateFinancier } from '../../application/use-cases/deactivate-financier.ts';
import { reactivateFinancier } from '../../application/use-cases/reactivate-financier.ts';
import { editFinancier } from '../../application/use-cases/edit-financier.ts';
import type { FinancierRepository } from '../../domain/financier/repository.ts';
import type {
  FinancierReader,
  FinancierReadRecord,
  FinancierReaderError,
} from '../../application/ports/financier-reader.ts';
import { listCollaborators } from '../../application/use-cases/list-collaborators.ts';
import { registerCollaborator } from '../../application/use-cases/register-collaborator.ts';
import { importCollaborators } from '../../application/use-cases/import-collaborators.ts';
import { completeCollaboratorRegistration } from '../../application/use-cases/complete-collaborator-registration.ts';
import { issueCollaboratorInvite } from '../../application/use-cases/issue-collaborator-invite.ts';
import { viewCollaboratorInvite } from '../../application/use-cases/view-collaborator-invite.ts';
import { completeCollaboratorRegistrationViaInvite } from '../../application/use-cases/complete-collaborator-registration-via-invite.ts';
import { makeNodeCollaboratorInviteTokenMinter } from '../crypto/collaborator-invite-token-minter.node.ts';
import { makeInMemoryCollaboratorInviteTokenStore } from '../persistence/repos/collaborator-invite-token-repository.in-memory.ts';
import { createDrizzleCollaboratorInviteTokenStore } from '../persistence/repos/collaborator-invite-token-repository.drizzle.ts';
import { InMemoryParEmailOutbox } from '../outbox/par-email-outbox.in-memory.ts';
import type { CollaboratorInviteTokenRepository } from '../../domain/collaborator/invite-token-repository.ts';
import { deactivateCollaborator } from '../../application/use-cases/deactivate-collaborator.ts';
import { reactivateCollaborator } from '../../application/use-cases/reactivate-collaborator.ts';
import { editCollaborator } from '../../application/use-cases/edit-collaborator.ts';
import type { CollaboratorRepository } from '../../domain/collaborator/repository.ts';
import type {
  CollaboratorReader,
  CollaboratorReadRecord,
  CollaboratorReaderError,
} from '../../application/ports/collaborator-reader.ts';
import type {
  CollaboratorHistoryRepository,
  CollaboratorHistoryEntry,
  CollaboratorHistoryError,
} from '../../application/ports/collaborator-history.ts';
import type {
  SupplierReader,
  SupplierReadRecord,
  SupplierReaderError,
} from '../../application/ports/supplier-reader.ts';
import type { PartnerGeographyRepository } from '../../application/ports/partner-geography-repository.ts';
import { listPartnerStates } from '../../application/use-cases/list-partner-states.ts';
import { listPartnerMunicipalities } from '../../application/use-cases/list-partner-municipalities.ts';
import { listAddedPartnerMunicipalities } from '../../application/use-cases/list-added-partner-municipalities.ts';
import { togglePartnerState } from '../../application/use-cases/toggle-partner-state.ts';
import { togglePartnerMunicipality } from '../../application/use-cases/toggle-partner-municipality.ts';
import { registerAct } from '../../application/use-cases/register-act.ts';
import { deactivateAct } from '../../application/use-cases/deactivate-act.ts';
import { reactivateAct } from '../../application/use-cases/reactivate-act.ts';
import { editAct } from '../../application/use-cases/edit-act.ts';
import type { ActRepository } from '../../domain/act/repository.ts';
import type {
  ActReader,
  ActReadRecord,
  ActReaderError,
} from '../../application/ports/act-reader.ts';
import type {
  ContractCountStore,
  ContractCountStoreError,
} from '../../application/ports/contract-count-store.ts';
import type {
  SuppliersBatchReadPort,
  SupplierBatchResult,
  SuppliersBatchReadError,
} from '../../application/ports/suppliers-batch-read.ts';

export type PartnersDriver = 'memory' | 'mysql';

/** Seed dev/test (driver memory). Popula os readers com read-records. Ignorado em mysql. */
export type PartnersSeed = Readonly<{
  collaborators?: readonly CollaboratorReadRecord[];
  collaboratorHistory?: readonly CollaboratorHistoryEntry[];
  suppliers?: readonly SupplierReadRecord[];
  financiers?: readonly FinancierReadRecord[];
  acts?: readonly ActReadRecord[];
  /** Contagem de contratos por contraparte (read-model US6b) — popula o `ContractCountStore` (#105). */
  contractCounts?: readonly { contractorRef: string; activeCount: number }[];
}>;

export type PartnersCompositionConfig = Readonly<{
  driver: PartnersDriver;
  /** Pool writer (obrigatório p/ driver mysql). */
  writerUrl?: string;
  /** Pool reader (réplica). Ausente/igual ao writer → reusa o writer (single-node). */
  readerUrl?: string;
  /** Seed dev/test (memory). Ignorado em mysql. */
  seed?: PartnersSeed;
  /** Autocadastro (US5): URL base do link de convite — origem confiável (anti Host-Header-Injection). */
  autocadastroBaseUrl?: string;
  /** TTL do convite em dias (default 7 — clarify). */
  inviteTtlDays?: number;
}>;

const DEFAULT_AUTOCADASTRO_BASE_URL = 'http://localhost/api/v1/collaborators/autocadastro';
const DEFAULT_INVITE_TTL_DAYS = 7;

// ADR-0047 (fatia 02b — NOTIF-EMAIL-OUTBOX-RETIRE): o builder sincrono de mailer de convite foi
// REMOVIDO. O envio e do consumidor (worker `email-dispatch`); o produtor (partners) apenas EMITE
// o evento na tx (par_email_outbox via InMemoryParEmailOutbox).

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
  /** Import em lote (writer pool, US-001): reusa registerCollaborator por linha. */
  importCollaborators: ReturnType<typeof importCollaborators>;
  completeCollaboratorRegistration: ReturnType<typeof completeCollaboratorRegistration>;
  /** Autocadastro público (US5): emite convite (chamado após register na rota), view (CPF mascarado) e complete via token. */
  issueCollaboratorInvite: ReturnType<typeof issueCollaboratorInvite>;
  viewCollaboratorInvite: ReturnType<typeof viewCollaboratorInvite>;
  completeCollaboratorRegistrationViaInvite: ReturnType<
    typeof completeCollaboratorRegistrationViaInvite
  >;
  /** Convites capturados do par_email_outbox (driver memory/test). Ausente em mysql. */
  sentInvites?: readonly SentInviteCapture[];
  /** Soft-delete (writer pool, P3). */
  deactivateCollaborator: ReturnType<typeof deactivateCollaborator>;
  reactivateCollaborator: ReturnType<typeof reactivateCollaborator>;
  editCollaborator: ReturnType<typeof editCollaborator>;
  /** Histórico de alterações de um colaborador (US4 — export ?type=history). */
  listCollaboratorHistory: (
    collaboratorId: string,
  ) => Promise<Result<readonly CollaboratorHistoryEntry[], CollaboratorHistoryError>>;
  /** Fornecedores — leitura (reader pool, S1). */
  getSupplierById: (id: string) => Promise<Result<SupplierReadRecord | null, SupplierReaderError>>;
  listSupplierRecords: () => Promise<Result<readonly SupplierReadRecord[], SupplierReaderError>>;
  /** Fornecedores — resolução em lote por ref (BFF batch-by-id, ADR-0049/#350, #356).
   * Identidade mínima (nome/CNPJ/categoria) — NUNCA dado bancário. */
  getSuppliersView: (
    refs: readonly string[],
  ) => Promise<Result<SupplierBatchResult, SuppliersBatchReadError>>;
  /** Fornecedores — escrita (writer pool, S2/S3). */
  registerSupplier: ReturnType<typeof registerSupplier>;
  deactivateSupplier: ReturnType<typeof deactivateSupplier>;
  reactivateSupplier: ReturnType<typeof reactivateSupplier>;
  editSupplier: ReturnType<typeof editSupplier>;
  /** Financiadores — leitura + escrita (FINANCIERS-HTTP-V1). */
  getFinancierById: (
    id: string,
  ) => Promise<Result<FinancierReadRecord | null, FinancierReaderError>>;
  listFinancierRecords: () => Promise<Result<readonly FinancierReadRecord[], FinancierReaderError>>;
  registerFinancier: ReturnType<typeof registerFinancier>;
  deactivateFinancier: ReturnType<typeof deactivateFinancier>;
  reactivateFinancier: ReturnType<typeof reactivateFinancier>;
  editFinancier: ReturnType<typeof editFinancier>;
  /** Parceria territorial — leitura + toggle (US-002). */
  listPartnerStates: ReturnType<typeof listPartnerStates>;
  listPartnerMunicipalities: ReturnType<typeof listPartnerMunicipalities>;
  /** Municípios parceiros de TODAS as UFs (painel "Adicionados", cross-state). */
  listAddedPartnerMunicipalities: ReturnType<typeof listAddedPartnerMunicipalities>;
  togglePartnerState: ReturnType<typeof togglePartnerState>;
  togglePartnerMunicipality: ReturnType<typeof togglePartnerMunicipality>;
  /** Acts — leitura (reader pool). */
  getActById: (id: string) => Promise<Result<ActReadRecord | null, ActReaderError>>;
  listActRecords: () => Promise<Result<readonly ActReadRecord[], ActReaderError>>;
  /** Acts — escrita (writer pool). */
  registerAct: ReturnType<typeof registerAct>;
  deactivateAct: ReturnType<typeof deactivateAct>;
  reactivateAct: ReturnType<typeof reactivateAct>;
  editAct: ReturnType<typeof editAct>;
  /** Contagem de contratos por contraparte (read-model US6b) — enriquece os grids (#105). */
  getContractCounts: (
    contractorRefs: readonly string[],
  ) => Promise<Result<ReadonlyMap<string, number>, ContractCountStoreError>>;
  shutdown: () => Promise<void>;
}>;

type Pools = Readonly<{
  collaboratorReaderRepo: CollaboratorRepository;
  collaboratorWriterRepo: CollaboratorRepository;
  collaboratorReader: CollaboratorReader;
  collaboratorHistory: CollaboratorHistoryRepository;
  inviteRepo: CollaboratorInviteTokenRepository;
  // PARTNERS-INVITE-DOMAIN-EVENT (ADR-0047): o convite vira evento no par_email_outbox; nao ha mais
  // mailer sincrono no fluxo. `getSentInvites` (driver memory/test) le os eventos emitidos e extrai
  // `{ to, token }` do payload para os seams de teste. Ausente em mysql.
  getSentInvites?: () => readonly SentInviteCapture[];
  supplierReader: SupplierReader;
  supplierWriterRepo: SupplierRepository;
  /** Resolução em lote por ref (#356) — 1 query (mysql) / filtro em memória. */
  suppliersBatchReader: SuppliersBatchReadPort;
  financierReader: FinancierReader;
  financierWriterRepo: FinancierRepository;
  geographyRepo: PartnerGeographyRepository;
  actWriterRepo: ActRepository;
  actReader: ActReader;
  contractCountStore: ContractCountStore;
  shutdown: () => Promise<void>;
}>;

/** Captura `{ to, token }` de um convite emitido — derivado do par_email_outbox (driver memory/test). */
export type SentInviteCapture = Readonly<{ to: string; token: string }>;

const buildMemoryPools = (config: PartnersCompositionConfig): Pools => {
  // RW split sem efeito físico em memory: reader = writer = mesmo store de agregados.
  const { repository } = makeInMemoryCollaboratorStore();
  const { repository: actRepository } = makeInMemoryActStore();
  // PARTNERS-INVITE-DOMAIN-EVENT (ADR-0047): o invite-token store emite CollaboratorInvited no
  // outbox de e-mail InMemory (injetado). `getSentInvites` deriva `{ to, token }` do payload.
  const emailOutbox = InMemoryParEmailOutbox();
  const inviteStore = makeInMemoryCollaboratorInviteTokenStore(emailOutbox.port);
  const getSentInvites = (): readonly SentInviteCapture[] =>
    emailOutbox
      .all()
      .filter((r) => r.eventType === 'CollaboratorInvited')
      .map((r) => {
        const payload = JSON.parse(r.payload) as { email?: string; autocadastroUrl?: string };
        const url = new URL(payload.autocadastroUrl ?? 'http://invalid/');
        return { to: payload.email ?? '', token: url.searchParams.get('token') ?? '' };
      });
  // ActReader in-memory: usa seed explícito se fornecido, caso contrário deriva do repositório
  // writer (RW split em memória — sem reader pool separado, conforme padrão do colaborador).
  const actReader =
    config.seed?.acts !== undefined && config.seed.acts.length > 0
      ? makeInMemoryActReader(config.seed.acts)
      : makeActReaderFromRepository(actRepository);
  return {
    collaboratorReaderRepo: repository,
    collaboratorWriterRepo: repository,
    collaboratorReader: makeInMemoryCollaboratorReader(config.seed?.collaborators ?? []),
    collaboratorHistory: makeInMemoryCollaboratorHistory(config.seed?.collaboratorHistory ?? []),
    inviteRepo: inviteStore.repository,
    getSentInvites,
    supplierReader: makeInMemorySupplierReader(config.seed?.suppliers ?? []),
    supplierWriterRepo: makeInMemorySupplierStore().repository,
    // #356 — resolução em lote (memory driver, testes/dev): filtra o mesmo seed de suppliers.
    suppliersBatchReader: makeInMemorySuppliersBatchReader(config.seed?.suppliers ?? []),
    financierReader: makeInMemoryFinancierReader(config.seed?.financiers ?? []),
    financierWriterRepo: makeInMemoryFinancierStore().repository,
    geographyRepo: makeInMemoryPartnerGeographyStore().repository,
    actWriterRepo: actRepository,
    actReader,
    contractCountStore: makeInMemoryContractCountStore(config.seed?.contractCounts ?? []),
    shutdown: () => Promise.resolve(),
  };
};

const buildMysqlPools = async (config: PartnersCompositionConfig): Promise<Pools> => {
  const writerUrl = config.writerUrl ?? '';
  const clock = ClockReal();
  // Boot NÃO migra (CORE-MIGRATE-BOOT-INVERT): schema vem do job `migrate` (deploy-safe, M5).
  const writerR = await openPartnersMysql({ connectionString: writerUrl, applyMigrations: false });
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
    collaboratorHistory: createDrizzleCollaboratorHistory(writerHandle),
    // Invite (PARTNERS-INVITE-DOMAIN-EVENT / ADR-0047): repo Drizzle no writer pool; o saveWithEvents
    // emite CollaboratorInvited no par_email_outbox na MESMA tx. O e-mail e enviado pelo worker
    // email-dispatch (multi-fonte). Nao ha mais mailer sincrono no fluxo.
    inviteRepo: createDrizzleCollaboratorInviteTokenStore(writerHandle).repository,
    supplierReader: createDrizzleSupplierReader(readerHandle),
    supplierWriterRepo: createDrizzleSupplierStore(writerHandle, clock),
    // #356 — resolução em lote (reader pool, 1 query anti-N+1) — port dedicado.
    suppliersBatchReader: createDrizzleSuppliersBatchReader(readerHandle),
    financierReader: createDrizzleFinancierReader(readerHandle),
    financierWriterRepo: createDrizzleFinancierStore(writerHandle, clock),
    // Geography usa writer para writes; reads são leves (catálogo estático + par_states/par_municipalities).
    geographyRepo: createDrizzlePartnerGeographyStore(writerHandle, clock),
    actWriterRepo: createDrizzleActStore(writerHandle, clock),
    actReader: createDrizzleActReader(readerHandle),
    // Read-model de contagem (US6b): lê do reader pool (par_contract_count_view).
    contractCountStore: createDrizzleContractCountStore(readerHandle),
    shutdown: async () => {
      await writerHandle.close();
      if (readerHandle !== writerHandle) await readerHandle.close();
    },
  };
};

const makeDeps = (pools: Pools, config: PartnersCompositionConfig): PartnersHttpDeps => {
  const clock = ClockReal();
  const inviteMinter = makeNodeCollaboratorInviteTokenMinter();
  const autocadastroBaseUrl = config.autocadastroBaseUrl ?? DEFAULT_AUTOCADASTRO_BASE_URL;
  const inviteTtlDays = config.inviteTtlDays ?? DEFAULT_INVITE_TTL_DAYS;
  const deps: PartnersHttpDeps = {
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
    issueCollaboratorInvite: issueCollaboratorInvite({
      inviteRepo: pools.inviteRepo,
      minter: inviteMinter,
      clock,
      autocadastroBaseUrl,
      inviteTtlDays,
    }),
    viewCollaboratorInvite: viewCollaboratorInvite({
      inviteRepo: pools.inviteRepo,
      minter: inviteMinter,
      collaboratorRepo: pools.collaboratorWriterRepo,
      clock,
    }),
    completeCollaboratorRegistrationViaInvite: completeCollaboratorRegistrationViaInvite({
      inviteRepo: pools.inviteRepo,
      minter: inviteMinter,
      collaboratorRepo: pools.collaboratorWriterRepo,
      clock,
    }),
    deactivateCollaborator: deactivateCollaborator({
      collaboratorRepo: pools.collaboratorWriterRepo,
      historyRepo: pools.collaboratorHistory,
      clock,
    }),
    reactivateCollaborator: reactivateCollaborator({
      collaboratorRepo: pools.collaboratorWriterRepo,
      historyRepo: pools.collaboratorHistory,
      clock,
    }),
    editCollaborator: editCollaborator({
      collaboratorRepo: pools.collaboratorWriterRepo,
      historyRepo: pools.collaboratorHistory,
      clock,
    }),
    listCollaboratorHistory: pools.collaboratorHistory.listByCollaborator,
    importCollaborators: importCollaborators({
      collaboratorRepo: pools.collaboratorWriterRepo,
      clock,
    }),
    getSupplierById: async (rawId) => {
      const idR = SupplierId.rehydrate(rawId);
      if (!idR.ok) return ok(null);
      return pools.supplierReader.getById(idR.value);
    },
    listSupplierRecords: pools.supplierReader.list,
    getSuppliersView: pools.suppliersBatchReader.getSuppliersView,
    registerSupplier: registerSupplier({ supplierRepo: pools.supplierWriterRepo, clock }),
    deactivateSupplier: deactivateSupplier({ supplierRepo: pools.supplierWriterRepo, clock }),
    reactivateSupplier: reactivateSupplier({ supplierRepo: pools.supplierWriterRepo, clock }),
    editSupplier: editSupplier({ supplierRepo: pools.supplierWriterRepo, clock }),
    getFinancierById: async (rawId) => {
      const idR = FinancierId.rehydrate(rawId);
      if (!idR.ok) return ok(null);
      return pools.financierReader.getById(idR.value);
    },
    listFinancierRecords: pools.financierReader.list,
    registerFinancier: registerFinancier({ financierRepo: pools.financierWriterRepo, clock }),
    deactivateFinancier: deactivateFinancier({ financierRepo: pools.financierWriterRepo, clock }),
    reactivateFinancier: reactivateFinancier({ financierRepo: pools.financierWriterRepo, clock }),
    editFinancier: editFinancier({ financierRepo: pools.financierWriterRepo, clock }),
    listPartnerStates: listPartnerStates({ geographyRepo: pools.geographyRepo }),
    listPartnerMunicipalities: listPartnerMunicipalities({ geographyRepo: pools.geographyRepo }),
    listAddedPartnerMunicipalities: listAddedPartnerMunicipalities({
      geographyRepo: pools.geographyRepo,
    }),
    togglePartnerState: togglePartnerState({ geographyRepo: pools.geographyRepo, clock }),
    togglePartnerMunicipality: togglePartnerMunicipality({
      geographyRepo: pools.geographyRepo,
      clock,
    }),
    getActById: async (rawId) => {
      const idR = ActId.rehydrate(rawId);
      if (!idR.ok) return ok(null);
      return pools.actReader.getById(idR.value);
    },
    listActRecords: pools.actReader.list,
    registerAct: registerAct({ actRepo: pools.actWriterRepo, clock }),
    deactivateAct: deactivateAct({ actRepo: pools.actWriterRepo, clock }),
    reactivateAct: reactivateAct({ actRepo: pools.actWriterRepo, clock }),
    editAct: editAct({ actRepo: pools.actWriterRepo, clock }),
    getContractCounts: pools.contractCountStore.getCounts,
    shutdown: pools.shutdown,
  };

  // `sentInvites` (driver memory/test): getter LIVE sobre o par_email_outbox InMemory — reflete os
  // convites emitidos ate o momento da leitura (apos o POST /collaborators). Ausente em mysql.
  const { getSentInvites } = pools;
  if (getSentInvites !== undefined) {
    Object.defineProperty(deps, 'sentInvites', {
      get: () => getSentInvites(),
      enumerable: true,
    });
  }

  return deps;
};

export const buildPartnersHttpDeps = async (
  config: PartnersCompositionConfig,
): Promise<PartnersHttpDeps> => {
  if (config.driver === 'memory') {
    return makeDeps(buildMemoryPools(config), config);
  }
  if (config.writerUrl === undefined || config.writerUrl.length === 0) {
    throw new Error('partners-composition: driver mysql exige writerUrl');
  }
  return makeDeps(await buildMysqlPools(config), config);
};
