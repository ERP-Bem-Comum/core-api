/**
 * Orquestrador do ETL Parceiros (PARTNERS-ETL-ORCHESTRATOR, slice 3b-ii) - logica PURA.
 *
 * Costura `read -> map -> write -> reconcile` sobre o `LegacyData` (ja lido pelo READER),
 * usando EXCLUSIVAMENTE os ports entregues (`AuthEtlPort` + `PartnersEtlPort`, ADR-0006).
 * Sem I/O direto: recebe os ports + um `QuarantineSink` injetaveis, para ser testavel com
 * fakes in-memory (sem Docker). O wiring real (driver, withLegacyMysql, flags, SIGTERM)
 * vive em `main.ts`.
 *
 * Invariantes:
 *   - Ordem de migracao: suppliers -> financiers -> collaborators -> users (FK/refs).
 *   - Idempotencia por legacy_id: `already-exists` conta separado de `migrated` (nunca duplica).
 *   - Linha suja NUNCA aborta o lote: erro de decode/mapper/provision -> quarentena.
 *   - Reconciliacao balanceada por entidade: read = migrated + quarantined + alreadyExists.
 *   - `--dry-run`: nenhum `provision` e chamado (nada persiste).
 *   - D10: inativos migrados (active=0) sao contabilizados em `inactiveLegacyMarked`.
 *
 * Costura nao-obvia (W0): o auth retorna `UserId` (brand 'UserId'); `UserProfile.userRef` e o
 * store `userProfiles` usam `UserRef` (brand 'UserRef', kernel). Brands distintos -> converte
 * `UserId -> UserRef` via `UserRefVo.rehydrate(userId)` (ambos UUID v4). ASCII puro.
 */

import { type Result, ok, err } from '#src/shared/primitives/result.ts';

import type { AuthEtlPort } from '#src/modules/auth/public-api/etl.ts';
import type { PartnersEtlPort, ProvisionOutcome } from '#src/modules/partners/public-api/etl.ts';
import type { ProgramsEtlPort } from '#src/modules/programs/public-api/etl.ts';
import type { Clock } from '#src/shared/ports/clock.ts';

import * as Email from '#src/modules/auth/domain/identity/email.ts';
import * as UserRefVo from '#src/shared/kernel/user-ref.ts';
import type { UserRef } from '#src/shared/kernel/user-ref.ts';
import type { CollaboratorId } from '#src/modules/partners/domain/collaborator/collaborator-id.ts';
import * as UserProfile from '#src/modules/partners/domain/user-profile/user-profile.ts';
import type { UserProfile as UserProfileEntity } from '#src/modules/partners/domain/user-profile/types.ts';

import type { LegacyData, TableRead } from '#scripts/etl/legacy/reader.ts';
import type { LegacyUserRow } from '#scripts/etl/legacy/rows.ts';
import type { QuarantineReason } from '#scripts/etl/quarantine/reason.ts';
import { mapLegacyProgramRow } from '#scripts/etl/mappers/program.mapper.ts';
import { mapLegacySupplierRow } from '#scripts/etl/mappers/supplier.mapper.ts';
import { mapLegacyFinancierRow } from '#scripts/etl/mappers/financier.mapper.ts';
import { mapLegacyCollaboratorRow } from '#scripts/etl/mappers/collaborator.mapper.ts';
import { mapLegacyUserRow } from '#scripts/etl/mappers/user.mapper.ts';
import type { MapperResult } from '#scripts/etl/mappers/shared.ts';
import {
  type EntityTally,
  emptyTally,
  countRead,
  countMigrated,
  countQuarantined,
  countAlreadyExists,
} from '#scripts/etl/reconcile.ts';

// ---------------------------------------------------------------------------
// Tipos publicos do orquestrador.
// ---------------------------------------------------------------------------

export type EntityName = 'programs' | 'suppliers' | 'financiers' | 'collaborators' | 'users';

export const MIGRATION_ORDER: readonly EntityName[] = [
  // programs e raiz (sem FK de entrada), migra primeiro.
  'programs',
  'suppliers',
  'financiers',
  'collaborators',
  'users',
];

export type QuarantineRecord = Readonly<{
  legacyId: number;
  table: EntityName;
  reason: QuarantineReason;
}>;

export type QuarantineSink = Readonly<{
  record: (record: QuarantineRecord) => Promise<void>;
}>;

export type ReconciliationReport = Readonly<{
  programs: EntityTally;
  suppliers: EntityTally;
  financiers: EntityTally;
  collaborators: EntityTally;
  users: EntityTally;
  inactiveLegacyMarked: number;
}>;

// Erro fatal do lote (so para falhas que NAO sao de linha — hoje nenhuma surge na
// logica pura; linhas sujas vao para quarentena). Mantido no contrato para o caller.
export type OrchestrateError = 'orchestrate-aborted';

export type OrchestrateDeps = Readonly<{
  authPort: AuthEtlPort;
  partnersPort: PartnersEtlPort;
  programsPort: ProgramsEtlPort;
  quarantineSink: QuarantineSink;
  dryRun: boolean;
  // Clock injetado — fallback do mapper de programs quando a data legada (createdAt/updatedAt)
  // estiver ausente/inválida. Mantém a lógica pura/determinística nos testes.
  clock: Clock;
}>;

// ---------------------------------------------------------------------------
// Acumulador interno (mutado localmente; nunca vaza). Carrega o tally por
// entidade, a contagem de inativos e o map legacyCollaboratorId -> CollaboratorId.
// ---------------------------------------------------------------------------

interface Acc {
  programs: EntityTally;
  suppliers: EntityTally;
  financiers: EntityTally;
  collaborators: EntityTally;
  users: EntityTally;
  inactiveLegacyMarked: number;
  readonly collaboratorRefs: Map<number, CollaboratorId>;
}

const firstReason = (reasons: readonly QuarantineReason[]): QuarantineReason =>
  reasons[0] ?? { tag: 'RequiredFieldMissing', field: 'unknown' };

const legacyIdToNumber = (raw: unknown): number => (typeof raw === 'number' ? raw : Number(raw));

// Quarentena de uma linha: registra no sink (resumo PII-free derivavel via toSummary)
// e conta na reconciliacao. Pura quanto a logica; o sink decide a persistencia.
const quarantine = async (
  sink: QuarantineSink,
  table: EntityName,
  legacyId: number,
  reason: QuarantineReason,
): Promise<void> => {
  await sink.record({ legacyId, table, reason });
};

// Drena as `failures` de decode (reader) de uma entidade para a quarentena, contando
// cada uma como `read` + `quarantined` (D12 — fonte 1 de 3).
const drainDecodeFailures = async <T>(
  sink: QuarantineSink,
  table: EntityName,
  read: TableRead<T>,
  tally: EntityTally,
): Promise<EntityTally> => {
  let next = tally;
  for (const failure of read.failures) {
    next = countQuarantined(countRead(next));
    await quarantine(sink, table, legacyIdToNumber(failure.legacyId), firstReason(failure.errors));
  }
  return next;
};

// ---------------------------------------------------------------------------
// Migracao de uma entidade "simples" (supplier/financier/collaborator): mapeia a
// linha, persiste via store, contabiliza. Devolve a Ref migrada (para o map de
// collaborators) ou null. Erro de mapper/provision -> quarentena (fonte 2 e 3).
// ---------------------------------------------------------------------------

type MigrateOutcome<Ref> = Readonly<{ tally: EntityTally; ref: Ref | null; inactive: boolean }>;

// Store estrutural generico no codigo de erro (E): aceita tanto o LegacyEntityStore do partners
// (PartnersEtlStoreError) quanto o do programs (ProgramsEtlStoreError) — que sao unioes de string
// disjuntas. O orquestrador so precisa da forma { findByLegacyId, provision }; o codigo de erro
// (kebab EN) vira `portError` na quarentena. E extends string mantem o portError PII-free.
type EtlStore<A, Ref, E extends string> = Readonly<{
  findByLegacyId: (legacyId: number) => Promise<Result<Ref | null, E>>;
  provision: (aggregate: A, legacyId: number) => Promise<Result<ProvisionOutcome, E>>;
}>;

// Obs.1 (review round 1): o store e parametrizado pelo MESMO par <A, Ref> do mapper, em vez
// da uniao dos 3 stores. Antes, `AggregateStore` (uniao) forcava `provision(arg)` a `never` e
// `findByLegacyId` a alargar para `Ref` — exigindo `as never`/`as Ref|null`. Casando A e Ref
// com o store concreto no call site, o agregado e a ref ficam ligados por tipo e os casts somem.
type MigrateArgs<
  Row extends Readonly<{ id: number; active: number }>,
  A,
  Ref,
  E extends string,
> = Readonly<{
  table: EntityName;
  row: Readonly<Row>;
  map: (row: Readonly<Row>) => MapperResult<A>;
  store: EtlStore<A, Ref, E>;
  tally: EntityTally;
}>;

const migrateAggregateRow = async <
  Row extends Readonly<{ id: number; active: number }>,
  A,
  Ref,
  E extends string,
>(
  deps: Readonly<OrchestrateDeps>,
  args: MigrateArgs<Row, A, Ref, E>,
): Promise<MigrateOutcome<Ref>> => {
  const { table, row, map, store, tally } = args;
  const counted = countRead(tally);
  const mapped = map(row);
  if (!mapped.ok) {
    await quarantine(deps.quarantineSink, table, row.id, firstReason(mapped.error));
    return { tally: countQuarantined(counted), ref: null, inactive: false };
  }

  if (deps.dryRun) {
    // Dry-run: nao persiste. Conta como migravel (created hipotetico) sem chamar provision.
    return {
      tally: countMigrated(counted),
      ref: null,
      inactive: row.active === 0,
    };
  }

  const provisioned = await store.provision(mapped.value.aggregate, row.id);
  if (!provisioned.ok) {
    // Obs.2 (review round 1): carrega o codigo kebab-case EN REAL do partners-store
    // (ex.: 'partners-etl-store-unavailable'), em vez de um generico. PII-free.
    await quarantine(deps.quarantineSink, table, row.id, {
      tag: 'PortError',
      field: 'persistence',
      portError: provisioned.error,
    });
    return { tally: countQuarantined(counted), ref: null, inactive: false };
  }

  if (provisioned.value === 'already-exists') {
    const found = await store.findByLegacyId(row.id);
    const ref = found.ok ? found.value : null;
    return { tally: countAlreadyExists(counted), ref, inactive: false };
  }

  const found = await store.findByLegacyId(row.id);
  const ref = found.ok ? found.value : null;
  return { tally: countMigrated(counted), ref, inactive: row.active === 0 };
};

// ---------------------------------------------------------------------------
// Migracao de users: depende do auth (cria auth.User) + do map de collaborators
// (resolve collaboratorRef) + do store de userProfiles. Orfao -> quarentena.
// ---------------------------------------------------------------------------

const resolveCollaboratorRef = (
  legacyCollaboratorId: number | null,
  refs: ReadonlyMap<number, CollaboratorId>,
): Result<CollaboratorId | null, 'orphan'> => {
  if (legacyCollaboratorId === null) return ok(null);
  const ref = refs.get(legacyCollaboratorId);
  return ref === undefined ? err('orphan') : ok(ref);
};

const migrateUserRow = async (
  deps: OrchestrateDeps,
  row: Readonly<LegacyUserRow>,
  refs: ReadonlyMap<number, CollaboratorId>,
  tally: EntityTally,
): Promise<Readonly<{ tally: EntityTally; inactive: boolean }>> => {
  const counted = countRead(tally);

  const mapped = mapLegacyUserRow(row);
  if (!mapped.ok) {
    await quarantine(deps.quarantineSink, 'users', row.id, firstReason(mapped.error));
    return { tally: countQuarantined(counted), inactive: false };
  }
  const validated = mapped.value;

  const collaboratorRefR = resolveCollaboratorRef(validated.legacyCollaboratorId, refs);
  if (!collaboratorRefR.ok) {
    // Orfao: referencia um collaborator que nao foi migrado. Quarentena, sem abortar.
    await quarantine(deps.quarantineSink, 'users', row.id, {
      tag: 'RequiredFieldMissing',
      field: 'collaborator_id',
    });
    return { tally: countQuarantined(counted), inactive: false };
  }
  const collaboratorRef = collaboratorRefR.value;

  const emailR = Email.parse(validated.email);
  if (!emailR.ok) {
    await quarantine(deps.quarantineSink, 'users', row.id, {
      tag: 'EmailInvalid',
      field: 'email',
      attempted: validated.email,
    });
    return { tally: countQuarantined(counted), inactive: false };
  }

  if (deps.dryRun) {
    // Dry-run: nao toca o auth nem o store de profiles.
    return { tally: countMigrated(counted), inactive: row.active === 0 };
  }

  const provisionedUser = await deps.authPort.provisionLegacyUser({
    legacyId: validated.legacyId,
    email: emailR.value,
    massApprove: validated.massApprove,
    // AUTH-ETL-USER-FIELDS (#277): paridade de perfil — repassa name/cpf/telephone (validated.*)
    // + o collaboratorRef ja resolvido (brand -> string, ref logica sem FK, ADR-0006). O auth
    // re-parseia/DEGRADA cpf/telephone invalido para null (borda de validacao no auth).
    name: validated.name,
    cpf: validated.cpf,
    telephone: validated.telephone,
    collaboratorRef: collaboratorRef === null ? null : String(collaboratorRef),
  });
  if (!provisionedUser.ok) {
    // Obs.2: carrega o codigo kebab-case EN REAL do auth-port (ProvisionLegacyUserError),
    // ex.: 'provisioned-user-store-unavailable'. PII-free.
    await quarantine(deps.quarantineSink, 'users', row.id, {
      tag: 'PortError',
      field: 'auth_user',
      portError: provisionedUser.error,
    });
    return { tally: countQuarantined(counted), inactive: false };
  }

  // UserId (auth) -> UserRef (kernel): brands distintos, mesmo UUID v4.
  const userRefR = UserRefVo.rehydrate(provisionedUser.value.userRef);
  if (!userRefR.ok) {
    // Obs.2: carrega o codigo de erro REAL do rehydrate (UserRefError = 'user-ref-invalid').
    await quarantine(deps.quarantineSink, 'users', row.id, {
      tag: 'PortError',
      field: 'user_ref',
      portError: userRefR.error,
    });
    return { tally: countQuarantined(counted), inactive: false };
  }
  const userRef: UserRef = userRefR.value;

  const profileR = UserProfile.rehydrate({
    userRef,
    name: validated.name,
    cpf: validated.cpf,
    telephone: validated.telephone,
    avatarUrl: validated.avatarUrl,
    collaboratorRef,
  });
  if (!profileR.ok) {
    // Obs.2: carrega o codigo de erro REAL do rehydrate do agregado (UserProfileError, kebab EN).
    await quarantine(deps.quarantineSink, 'users', row.id, {
      tag: 'PortError',
      field: 'user_profile',
      portError: profileR.error,
    });
    return { tally: countQuarantined(counted), inactive: false };
  }
  const profile: UserProfileEntity = profileR.value;

  const persisted = await deps.partnersPort.userProfiles.provision(profile, validated.legacyId);
  if (!persisted.ok) {
    // Obs.2: carrega o codigo kebab-case EN REAL do partners-store. PII-free.
    await quarantine(deps.quarantineSink, 'users', row.id, {
      tag: 'PortError',
      field: 'user_profile_persistence',
      portError: persisted.error,
    });
    return { tally: countQuarantined(counted), inactive: false };
  }

  if (persisted.value === 'already-exists') {
    return { tally: countAlreadyExists(counted), inactive: false };
  }
  return { tally: countMigrated(counted), inactive: row.active === 0 };
};

// ---------------------------------------------------------------------------
// Entrada publica: costura tudo na ordem de MIGRATION_ORDER.
// ---------------------------------------------------------------------------

export const orchestrate =
  (deps: OrchestrateDeps) =>
  async (data: Readonly<LegacyData>): Promise<Result<ReconciliationReport, OrchestrateError>> => {
    const acc: Acc = {
      programs: emptyTally(),
      suppliers: emptyTally(),
      financiers: emptyTally(),
      collaborators: emptyTally(),
      users: emptyTally(),
      inactiveLegacyMarked: 0,
      collaboratorRefs: new Map<number, CollaboratorId>(),
    };

    // 0. programs — entidade raiz (sem FK de entrada), migra primeiro. O mapper reconstroi via
    // Program.create (+ deactivate se inativo); precisa do clock injetado (fallback de data).
    acc.programs = await drainDecodeFailures(
      deps.quarantineSink,
      'programs',
      data.programs,
      acc.programs,
    );
    for (const row of data.programs.rows) {
      const outcome = await migrateAggregateRow(deps, {
        table: 'programs',
        row,
        map: (r) => mapLegacyProgramRow(r, deps.clock),
        store: deps.programsPort.programs,
        tally: acc.programs,
      });
      acc.programs = outcome.tally;
      if (outcome.inactive) acc.inactiveLegacyMarked += 1;
    }

    // 1. suppliers
    acc.suppliers = await drainDecodeFailures(
      deps.quarantineSink,
      'suppliers',
      data.suppliers,
      acc.suppliers,
    );
    for (const row of data.suppliers.rows) {
      const outcome = await migrateAggregateRow(deps, {
        table: 'suppliers',
        row,
        map: mapLegacySupplierRow,
        store: deps.partnersPort.suppliers,
        tally: acc.suppliers,
      });
      acc.suppliers = outcome.tally;
      if (outcome.inactive) acc.inactiveLegacyMarked += 1;
    }

    // 2. financiers
    acc.financiers = await drainDecodeFailures(
      deps.quarantineSink,
      'financiers',
      data.financiers,
      acc.financiers,
    );
    for (const row of data.financiers.rows) {
      const outcome = await migrateAggregateRow(deps, {
        table: 'financiers',
        row,
        map: mapLegacyFinancierRow,
        store: deps.partnersPort.financiers,
        tally: acc.financiers,
      });
      acc.financiers = outcome.tally;
      if (outcome.inactive) acc.inactiveLegacyMarked += 1;
    }

    // 3. collaborators — monta o map legacyId -> CollaboratorId para os users.
    acc.collaborators = await drainDecodeFailures(
      deps.quarantineSink,
      'collaborators',
      data.collaborators,
      acc.collaborators,
    );
    for (const row of data.collaborators.rows) {
      const outcome = await migrateAggregateRow(deps, {
        table: 'collaborators',
        row,
        map: mapLegacyCollaboratorRow,
        store: deps.partnersPort.collaborators,
        tally: acc.collaborators,
      });
      acc.collaborators = outcome.tally;
      if (outcome.inactive) acc.inactiveLegacyMarked += 1;
      if (outcome.ref !== null) acc.collaboratorRefs.set(row.id, outcome.ref);
    }

    // 4. users — por ultimo (depende do auth + do map de collaborators).
    acc.users = await drainDecodeFailures(deps.quarantineSink, 'users', data.users, acc.users);
    for (const row of data.users.rows) {
      const outcome = await migrateUserRow(deps, row, acc.collaboratorRefs, acc.users);
      acc.users = outcome.tally;
      if (outcome.inactive) acc.inactiveLegacyMarked += 1;
    }

    return ok({
      programs: acc.programs,
      suppliers: acc.suppliers,
      financiers: acc.financiers,
      collaborators: acc.collaborators,
      users: acc.users,
      inactiveLegacyMarked: acc.inactiveLegacyMarked,
    });
  };
