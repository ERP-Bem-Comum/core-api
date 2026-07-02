/**
 * W0 RED — orquestrador do ETL Parceiros (PARTNERS-ETL-ORCHESTRATOR, slice 3b-ii).
 *
 * Cobre a LÓGICA PURA de costura com ports fake in-memory (sem Docker/MySQL): ordem de
 * migração, map legacyCollaboratorId→CollaboratorId, resolução de collaboratorRef
 * (null/órfão), idempotência (already-exists), agregação de quarentena PII-free das 3
 * fontes (reader.failures + mapper errors + provision errors), reconciliação balanceada
 * (read = migrated + quarantined + alreadyExists), efeito de --dry-run, contagem de inativos.
 *
 * O caminho 2-DB real fica em orchestrate.integration.test.ts (gated PARTNERS_ETL_INTEGRATION=1).
 *
 * RED esperado: `#scripts/etl/orchestrate.ts` ainda NÃO existe — o import falha por API inexistente.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { ok } from '#src/shared/primitives/result.ts';
import { ClockReal } from '#src/shared/adapters/clock-real.ts';
import type { ProgramsEtlPort } from '#src/modules/programs/public-api/etl.ts';
import type { LegacyData, TableRead, DecodeFailure } from '#scripts/etl/legacy/reader.ts';
import { type QuarantineReason, toSummary } from '#scripts/etl/quarantine/reason.ts';
import { isBalanced } from '#scripts/etl/reconcile.ts';

// API SOB TESTE — ainda não implementada (W0 RED).
import {
  orchestrate,
  MIGRATION_ORDER,
  type EntityName,
  type QuarantineRecord,
  type QuarantineSink,
  type ReconciliationReport,
} from '#scripts/etl/orchestrate.ts';

import {
  makeFakeAuthPort,
  makeFakeEntityStore,
  makeFailingEntityStore,
  makeFailingAuthPort,
  FAILING_AUTH_ERROR,
  supplierRow,
  financierRow,
  collaboratorRow,
  userRow,
  VALID_CPF,
  type FakeAuthPort,
  type FakeEntityStore,
} from './orchestrate.fakes.ts';

import type { PartnersEtlPort } from '#src/modules/partners/public-api/etl.ts';
import type { AuthEtlPort } from '#src/modules/auth/public-api/etl.ts';
import type { Supplier } from '#src/modules/partners/domain/supplier/types.ts';
import type { Financier } from '#src/modules/partners/domain/financier/types.ts';
import type { Collaborator } from '#src/modules/partners/domain/collaborator/types.ts';
import type { UserProfile } from '#src/modules/partners/domain/user-profile/types.ts';
import type { SupplierId } from '#src/modules/partners/domain/supplier/supplier-id.ts';
import type { FinancierId } from '#src/modules/partners/domain/financier/financier-id.ts';
import type { CollaboratorId } from '#src/modules/partners/domain/collaborator/collaborator-id.ts';
import type { UserRef } from '#src/shared/kernel/user-ref.ts';
import * as SupplierIdVo from '#src/modules/partners/domain/supplier/supplier-id.ts';
import * as FinancierIdVo from '#src/modules/partners/domain/financier/financier-id.ts';
import * as CollaboratorIdVo from '#src/modules/partners/domain/collaborator/collaborator-id.ts';
import * as UserRefVo from '#src/shared/kernel/user-ref.ts';

// ---------------------------------------------------------------------------
// Helpers de montagem de LegacyData + sink de quarentena coletor.
// ---------------------------------------------------------------------------

const emptyRead = <T>(): TableRead<T> => ({ rows: [], failures: [] });

const legacyData = (over: Partial<LegacyData> = {}): LegacyData => ({
  programs: emptyRead(),
  financiers: emptyRead(),
  suppliers: emptyRead(),
  collaborators: emptyRead(),
  users: emptyRead(),
  ...over,
});

// Programs não é exercitado por estes testes (dados de programs vazios) — mas o orquestrador
// agora exige um ProgramsEtlPort + Clock. Fake mínimo: store que nunca é chamado de verdade.
const emptyProgramsPort = (): ProgramsEtlPort => ({
  programs: {
    findByLegacyId: () => Promise.resolve(ok(null)),
    provision: () => Promise.resolve(ok('created' as const)),
  },
  close: () => Promise.resolve(),
});

type CollectingSink = QuarantineSink & Readonly<{ records: readonly QuarantineRecord[] }>;

const makeCollectingSink = (): CollectingSink => {
  const records: QuarantineRecord[] = [];
  return {
    record: (r: QuarantineRecord) => {
      records.push(r);
      return Promise.resolve();
    },
    records,
  };
};

// Stores fake tipados por entidade (Ref determinística por legacyId).
type Stores = Readonly<{
  suppliers: FakeEntityStore<Supplier, SupplierId>;
  financiers: FakeEntityStore<Financier, FinancierId>;
  collaborators: FakeEntityStore<Collaborator, CollaboratorId>;
  userProfiles: FakeEntityStore<UserProfile, UserRef>;
}>;

const supplierRefFor = (_n: number): SupplierId => SupplierIdVo.generate();
const financierRefFor = (_n: number): FinancierId => FinancierIdVo.generate();
const collaboratorRefFor = (_n: number): CollaboratorId => CollaboratorIdVo.generate();
const userProfileRefFor = (n: number): UserRef => {
  const hex = n.toString(16).padStart(12, '0');
  const r = UserRefVo.rehydrate(`00000000-0000-4000-8000-${hex}`);
  if (!r.ok) throw new Error('fixture userRef inválido');
  return r.value;
};

const makeStores = (): Stores => ({
  suppliers: makeFakeEntityStore<Supplier, SupplierId>(supplierRefFor),
  financiers: makeFakeEntityStore<Financier, FinancierId>(financierRefFor),
  collaborators: makeFakeEntityStore<Collaborator, CollaboratorId>(collaboratorRefFor),
  userProfiles: makeFakeEntityStore<UserProfile, UserRef>(userProfileRefFor),
});

const partnersPortFrom = (stores: Stores): PartnersEtlPort => ({
  suppliers: stores.suppliers,
  financiers: stores.financiers,
  collaborators: stores.collaborators,
  userProfiles: stores.userProfiles,
  close: () => Promise.resolve(),
});

const run = async <Auth extends AuthEtlPort = FakeAuthPort>(
  data: LegacyData,
  opts: Readonly<{
    dryRun?: boolean;
    auth?: Auth;
    stores?: Stores;
    sink?: CollectingSink;
  }> = {},
): Promise<{
  report: ReconciliationReport;
  auth: Auth;
  stores: Stores;
  sink: CollectingSink;
}> => {
  const auth = (opts.auth ?? makeFakeAuthPort()) as Auth;
  const stores = opts.stores ?? makeStores();
  const sink = opts.sink ?? makeCollectingSink();
  const result = await orchestrate({
    authPort: auth,
    partnersPort: partnersPortFrom(stores),
    programsPort: emptyProgramsPort(),
    quarantineSink: sink,
    dryRun: opts.dryRun ?? false,
    clock: ClockReal(),
  })(data);
  assert.ok(
    result.ok,
    `orchestrate deve suceder (linhas sujas vão p/ quarentena): ${JSON.stringify(result)}`,
  );
  return { report: result.value, auth, stores, sink };
};

// ---------------------------------------------------------------------------
// 1. Ordem de migração.
// ---------------------------------------------------------------------------

describe('PARTNERS-ETL-ORCHESTRATOR — ordem de migração', () => {
  it('MIGRATION_ORDER é programs → suppliers → financiers → collaborators → users (programs raiz primeiro, users por último)', () => {
    const expected: readonly EntityName[] = [
      'programs',
      'suppliers',
      'financiers',
      'collaborators',
      'users',
    ];
    assert.deepEqual([...MIGRATION_ORDER], [...expected]);
    assert.equal(MIGRATION_ORDER[0], 'programs');
    assert.equal(MIGRATION_ORDER[MIGRATION_ORDER.length - 1], 'users');
  });
});

// ---------------------------------------------------------------------------
// 2. Happy path — 1 de cada entidade migra; reconciliação balanceada.
// ---------------------------------------------------------------------------

describe('PARTNERS-ETL-ORCHESTRATOR — migração feliz', () => {
  it('migra 1 supplier + 1 financier + 1 collaborator + 1 user → tudo created', async () => {
    const data = legacyData({
      suppliers: { rows: [supplierRow()], failures: [] },
      financiers: { rows: [financierRow()], failures: [] },
      collaborators: { rows: [collaboratorRow()], failures: [] },
      users: { rows: [userRow()], failures: [] },
    });

    const { report, auth, stores } = await run(data);

    assert.equal(report.suppliers.read, 1);
    assert.equal(report.suppliers.migrated, 1);
    assert.equal(report.financiers.migrated, 1);
    assert.equal(report.collaborators.migrated, 1);
    assert.equal(report.users.migrated, 1);

    // Persistência real ocorreu via os stores + auth.
    assert.equal(stores.suppliers.persisted.size, 1);
    assert.equal(auth.provisionedUsers.size, 1);

    // Invariante de reconciliação por entidade.
    assert.ok(isBalanced(report.suppliers));
    assert.ok(isBalanced(report.users));
  });
});

// ---------------------------------------------------------------------------
// 3. Map legacyCollaboratorId → CollaboratorId + collaboratorRef.
// ---------------------------------------------------------------------------

describe('PARTNERS-ETL-ORCHESTRATOR — vínculo user → collaborator', () => {
  it('user com collaboratorId resolvido usa a ref do collaborator migrado', async () => {
    const data = legacyData({
      collaborators: { rows: [collaboratorRow({ id: 7 })], failures: [] },
      users: { rows: [userRow({ id: 50, collaboratorId: 7 })], failures: [] },
    });

    const { report, stores } = await run(data);

    assert.equal(report.collaborators.migrated, 1);
    assert.equal(report.users.migrated, 1);
    // O user profile foi persistido (resolveu o vínculo, não foi p/ quarentena).
    assert.equal(stores.userProfiles.persisted.size, 1);
  });

  it('user com collaboratorId=null → collaboratorRef null, migra normalmente', async () => {
    const data = legacyData({
      users: { rows: [userRow({ id: 51, collaboratorId: null })], failures: [] },
    });

    const { report, stores } = await run(data);

    assert.equal(report.users.migrated, 1);
    assert.equal(report.users.quarantined, 0);
    assert.equal(stores.userProfiles.persisted.size, 1);
  });

  it('user com collaboratorId órfão (collaborator não migrado) → quarentena, sem abortar', async () => {
    const data = legacyData({
      // nenhum collaborator com id 999
      collaborators: { rows: [collaboratorRow({ id: 7 })], failures: [] },
      users: { rows: [userRow({ id: 52, collaboratorId: 999 })], failures: [] },
    });

    const { report, sink, stores } = await run(data);

    assert.equal(report.users.quarantined, 1);
    assert.equal(report.users.migrated, 0);
    // collaborator íntegro continua migrando (lote não aborta).
    assert.equal(report.collaborators.migrated, 1);
    // user profile órfão NÃO persistido.
    assert.equal(stores.userProfiles.persisted.size, 0);
    // quarentena registrada para a tabela users.
    const userQuarantine = sink.records.filter((r) => r.table === 'users');
    assert.equal(userQuarantine.length, 1);
    assert.equal(userQuarantine[0]?.legacyId, 52);
  });
});

// ---------------------------------------------------------------------------
// 4. Idempotência (already-exists não conta como migrated).
// ---------------------------------------------------------------------------

describe('PARTNERS-ETL-ORCHESTRATOR — idempotência', () => {
  it('rodar 2× com os mesmos dados → 2ª rodada tudo already-exists (não duplica)', async () => {
    const data = legacyData({
      suppliers: { rows: [supplierRow({ id: 1 })], failures: [] },
      users: { rows: [userRow({ id: 2, collaboratorId: null })], failures: [] },
    });

    const stores = makeStores();
    const auth = makeFakeAuthPort();

    const first = await run(data, { stores, auth });
    assert.equal(first.report.suppliers.migrated, 1);
    assert.equal(first.report.users.migrated, 1);

    const second = await run(data, { stores, auth });
    assert.equal(second.report.suppliers.migrated, 0);
    assert.equal(second.report.suppliers.alreadyExists, 1);
    assert.equal(second.report.users.alreadyExists, 1);

    // Não duplicou.
    assert.equal(stores.suppliers.persisted.size, 1);
    assert.equal(auth.provisionedUsers.size, 1);
    assert.ok(isBalanced(second.report.suppliers));
  });
});

// ---------------------------------------------------------------------------
// 5. Quarentena agregada das 3 fontes + PII-free.
// ---------------------------------------------------------------------------

describe('PARTNERS-ETL-ORCHESTRATOR — quarentena (D12)', () => {
  it('reader.failures (decode) vão para quarentena e contam na reconciliação', async () => {
    const failure: DecodeFailure = {
      legacyId: 71,
      errors: [{ tag: 'RequiredFieldMissing', field: 'name' }],
    };
    const data = legacyData({
      suppliers: { rows: [], failures: [failure] },
    });

    const { report, sink } = await run(data);

    assert.equal(report.suppliers.read, 1);
    assert.equal(report.suppliers.quarantined, 1);
    assert.equal(report.suppliers.migrated, 0);
    assert.ok(isBalanced(report.suppliers));
    assert.equal(sink.records.filter((r) => r.table === 'suppliers').length, 1);
  });

  it('mapper error (linha inválida) → quarentena, sem abortar o lote', async () => {
    const data = legacyData({
      suppliers: {
        rows: [supplierRow({ id: 1 }), supplierRow({ id: 2, cnpj: 'invalido' })],
        failures: [],
      },
    });

    const { report } = await run(data);

    assert.equal(report.suppliers.read, 2);
    assert.equal(report.suppliers.migrated, 1);
    assert.equal(report.suppliers.quarantined, 1);
    assert.ok(isBalanced(report.suppliers));
  });

  it('provision error (store indisponível) → quarentena', async () => {
    const stores = makeStores();
    const brokenStores: Stores = {
      ...stores,
      suppliers: makeFailingEntityStore<Supplier, SupplierId>() as FakeEntityStore<
        Supplier,
        SupplierId
      >,
    };
    const data = legacyData({
      suppliers: { rows: [supplierRow({ id: 1 })], failures: [] },
    });

    const { report } = await run(data, { stores: brokenStores });

    assert.equal(report.suppliers.quarantined, 1);
    assert.equal(report.suppliers.migrated, 0);
    assert.ok(isBalanced(report.suppliers));
  });

  it('o resumo gravado é PII-free: só { legacyId, table, reason:{tag,field} } — sem `attempted`', async () => {
    const data = legacyData({
      suppliers: { rows: [supplierRow({ id: 9, cnpj: 'invalido' })], failures: [] },
    });

    const { sink } = await run(data);

    const rec = sink.records.find((r) => r.table === 'suppliers');
    assert.ok(rec);
    assert.equal(rec.legacyId, 9);
    // reason é QuarantineReason — mas o que CRUZA p/ git deve ser summarizável sem PII.
    const reason: QuarantineReason = rec.reason;
    assert.equal(typeof reason.tag, 'string');
    assert.equal(typeof reason.field, 'string');
  });
});

// ---------------------------------------------------------------------------
// 6. --dry-run não persiste.
// ---------------------------------------------------------------------------

describe('PARTNERS-ETL-ORCHESTRATOR — dry-run', () => {
  it('--dry-run não chama provision em nenhum port (nada persiste)', async () => {
    const data = legacyData({
      suppliers: { rows: [supplierRow({ id: 1 })], failures: [] },
      financiers: { rows: [financierRow({ id: 2 })], failures: [] },
      collaborators: { rows: [collaboratorRow({ id: 3 })], failures: [] },
      users: { rows: [userRow({ id: 4, collaboratorId: null })], failures: [] },
    });

    const { stores, auth } = await run(data, { dryRun: true });

    assert.equal(stores.suppliers.calls().provision, 0);
    assert.equal(stores.financiers.calls().provision, 0);
    assert.equal(stores.collaborators.calls().provision, 0);
    assert.equal(stores.userProfiles.calls().provision, 0);
    assert.equal(auth.provisionCalls(), 0);
    assert.equal(stores.suppliers.persisted.size, 0);
    assert.equal(auth.provisionedUsers.size, 0);
  });
});

// ---------------------------------------------------------------------------
// 7. Inativos (D10) contabilizados.
// ---------------------------------------------------------------------------

describe('PARTNERS-ETL-ORCHESTRATOR — inativos (D10)', () => {
  it('migra inativos (active=0) e reporta a contagem de LEGACY_MIGRATION', async () => {
    const data = legacyData({
      suppliers: {
        rows: [supplierRow({ id: 1, active: 1 }), supplierRow({ id: 2, active: 0 })],
        failures: [],
      },
    });

    const { report } = await run(data);

    assert.equal(report.suppliers.migrated, 2);
    // pelo menos 1 inativo migrado contabilizado.
    assert.ok(report.inactiveLegacyMarked >= 1);
  });
});

// ---------------------------------------------------------------------------
// 8. Fidelidade do reason em erros de port (Obs.2): o reason de quarentena
//    carrega o codigo kebab-case EN do erro REAL do port (sem PII), em vez de
//    sintetizar um RequiredFieldMissing generico.
// ---------------------------------------------------------------------------

describe('PARTNERS-ETL-ORCHESTRATOR — reason fiel ao erro de port (Obs.2)', () => {
  // Regex de codigo kebab-case EN: so [a-z0-9-], sem espaco/acento/PII.
  const KEBAB_EN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

  it('falha de store.provision → reason PortError carregando o codigo real do partners-port', async () => {
    const stores = makeStores();
    const brokenStores: Stores = {
      ...stores,
      suppliers: makeFailingEntityStore<Supplier, SupplierId>() as FakeEntityStore<
        Supplier,
        SupplierId
      >,
    };
    const data = legacyData({
      suppliers: { rows: [supplierRow({ id: 1 })], failures: [] },
    });

    const { sink, report } = await run(data, { stores: brokenStores });

    assert.equal(report.suppliers.quarantined, 1);
    const rec = sink.records.find((r) => r.table === 'suppliers');
    assert.ok(rec, 'deve ter quarentena para suppliers');
    const reason: QuarantineReason = rec.reason;
    assert.equal(reason.tag, 'PortError');
    assert.ok('portError' in reason);
    // carrega o erro REAL do partners-store, nao um generico.
    assert.equal(reason.portError, 'partners-etl-store-unavailable');
    // codigo kebab-case EN, sem PII.
    assert.match(reason.portError, KEBAB_EN);
  });

  it('falha de authPort.provisionLegacyUser → reason PortError carregando o codigo real do auth-port', async () => {
    const data = legacyData({
      users: { rows: [userRow({ id: 70, collaboratorId: null })], failures: [] },
    });

    const { sink, report } = await run(data, { auth: makeFailingAuthPort() });

    assert.equal(report.users.quarantined, 1);
    const rec = sink.records.find((r) => r.table === 'users');
    assert.ok(rec, 'deve ter quarentena para users');
    const reason: QuarantineReason = rec.reason;
    assert.equal(reason.tag, 'PortError');
    assert.ok('portError' in reason);
    assert.equal(reason.portError, FAILING_AUTH_ERROR);
    assert.match(reason.portError, KEBAB_EN);
  });

  it('o resumo (toSummary) do PortError continua PII-free: so { tag, field }', async () => {
    const stores = makeStores();
    const brokenStores: Stores = {
      ...stores,
      suppliers: makeFailingEntityStore<Supplier, SupplierId>() as FakeEntityStore<
        Supplier,
        SupplierId
      >,
    };
    const data = legacyData({
      suppliers: { rows: [supplierRow({ id: 1 })], failures: [] },
    });

    const { sink } = await run(data, { stores: brokenStores });
    const rec = sink.records.find((r) => r.table === 'suppliers');
    assert.ok(rec);

    const summary = toSummary(rec.reason);
    // o resumo versionavel nunca expoe nada alem de tag+field.
    assert.deepEqual(Object.keys(summary).sort(), ['field', 'tag']);
    assert.equal(summary.tag, 'PortError');
    assert.equal(typeof summary.field, 'string');
  });
});

// ---------------------------------------------------------------------------
// 9. AUTH-ETL-USER-FIELDS (#277) — paridade de perfil: o orchestrate repassa
//    name/cpf/telephone (de validated.*) + collaboratorRef resolvido ao auth-port.
//
//    RED hoje: `migrateUserRow` (orchestrate.ts :259-263) só passa
//    { legacyId, email, massApprove } ao provisionLegacyUser — descarta name/cpf/
//    telephone (já presentes em `validated`) e o collaboratorRef já resolvido.
//    Como `node --test --experimental-strip-types` NÃO type-checa, o teste CARREGA e
//    o RED vem das ASSERÇÕES (os campos chegam `undefined` ao auth-port hoje). O gate
//    `pnpm run typecheck` também fica RED (campos inexistentes em ProvisionLegacyUserInput).
// ---------------------------------------------------------------------------

describe('AUTH-ETL-USER-FIELDS (#277) — repasse de perfil ao auth-port', () => {
  it('repassa name/cpf/telephone (validated.*) + collaboratorRef resolvido', async () => {
    const data = legacyData({
      collaborators: { rows: [collaboratorRow({ id: 7 })], failures: [] },
      // userRow default: name 'Usuario W', cpf VALID_CPF, telephone '11977776666'.
      users: { rows: [userRow({ id: 50, collaboratorId: 7 })], failures: [] },
    });

    const { report, auth, stores } = await run(data);
    assert.equal(report.users.migrated, 1);

    const captured = auth.lastProvisionInput();
    assert.ok(captured, 'auth-port deve ter recebido ao menos 1 input');
    assert.equal(captured.legacyId, 50);
    assert.equal(captured.name, 'Usuario W');
    assert.equal(captured.cpf, VALID_CPF);
    assert.equal(captured.telephone, '11977776666');

    // collaboratorRef = a CollaboratorId que o store atribuiu ao collaborator legacyId 7.
    const expectedRef = stores.collaborators.persisted.get(7);
    assert.ok(expectedRef, 'collaborator 7 deve ter sido migrado e ter ref');
    assert.equal(captured.collaboratorRef, expectedRef);
  });

  it('user sem collaborator (collaboratorId=null) → repassa collaboratorRef=null', async () => {
    const data = legacyData({
      users: { rows: [userRow({ id: 51, collaboratorId: null })], failures: [] },
    });

    const { report, auth } = await run(data);
    assert.equal(report.users.migrated, 1);

    const captured = auth.lastProvisionInput();
    assert.ok(captured);
    // assert.equal é strict (import { strict as assert }): undefined !== null -> RED hoje.
    assert.equal(captured.collaboratorRef, null);
  });
});
