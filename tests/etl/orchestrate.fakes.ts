/**
 * Fakes in-memory dos ports consumidos pelo orquestrador (W0 PARTNERS-ETL-ORCHESTRATOR).
 *
 * NÃO é um arquivo `.test.ts` (não é descoberto pelo runner) — é um helper de fixtures/fakes
 * importado pelas suites. Os fakes implementam EXATAMENTE as APIs entregues e closed-green:
 *   - `AuthEtlPort` (#src/modules/auth/public-api/etl.ts)
 *   - `PartnersEtlPort` / `LegacyEntityStore` (#src/modules/partners/public-api/etl.ts)
 * Simulam idempotência por legacy_id (skip → 'already-exists') e CONTAM chamadas de `provision`
 * (para provar `--dry-run` não persiste). Constroem agregados reais via os mappers do CORE,
 * a partir de fixtures sintéticos (jamais PII de produção).
 */

import { type Result, ok, err } from '#src/shared/primitives/result.ts';
import * as UserId from '#src/modules/auth/domain/identity/user-id.ts';

import type {
  AuthEtlPort,
  ProvisionLegacyUserError,
  ProvisionLegacyUserInput,
} from '#src/modules/auth/public-api/etl.ts';
import type {
  LegacyEntityStore,
  ProvisionOutcome,
  PartnersEtlStoreError,
} from '#src/modules/partners/public-api/etl.ts';

import type {
  LegacyFinancierRow,
  LegacySupplierRow,
  LegacyCollaboratorRow,
  LegacyUserRow,
} from '#scripts/etl/legacy/rows.ts';

// ---------------------------------------------------------------------------
// Fake genérico de LegacyEntityStore: Map<legacyId, Ref>; provision é idempotente
// por legacy_id (skip → 'already-exists') e registra contagem de chamadas reais.
// ---------------------------------------------------------------------------

export type StoreCalls = Readonly<{ provision: number; findByLegacyId: number }>;

export type FakeEntityStore<A, Ref> = LegacyEntityStore<A, Ref> &
  Readonly<{
    // espelho mutável para asserts (quantas linhas realmente persistidas + chamadas)
    readonly persisted: ReadonlyMap<number, Ref>;
    readonly calls: () => StoreCalls;
  }>;

export const makeFakeEntityStore = <A, Ref>(
  refForLegacyId: (legacyId: number) => Ref,
): FakeEntityStore<A, Ref> => {
  const persisted = new Map<number, Ref>();
  let provisionCalls = 0;
  let findCalls = 0;

  // Fakes implementam a assinatura `=> Promise<...>` do port sem `await` (so mutam
  // estado in-memory): forma sincrona + Promise.resolve evita require-await sem `async`
  // (promise-function-async ja esta off em tests/).
  const findByLegacyId = (legacyId: number): Promise<Result<Ref | null, PartnersEtlStoreError>> => {
    findCalls += 1;
    return Promise.resolve(ok(persisted.get(legacyId) ?? null));
  };

  const provision = (
    _aggregate: A,
    legacyId: number,
  ): Promise<Result<ProvisionOutcome, PartnersEtlStoreError>> => {
    provisionCalls += 1;
    if (persisted.has(legacyId)) return Promise.resolve(ok<ProvisionOutcome>('already-exists'));
    persisted.set(legacyId, refForLegacyId(legacyId));
    return Promise.resolve(ok<ProvisionOutcome>('created'));
  };

  return {
    findByLegacyId,
    provision,
    persisted,
    calls: () => ({ provision: provisionCalls, findByLegacyId: findCalls }),
  };
};

// Store que falha SEMPRE no provision (para o caminho de erro de persistência → quarentena).
export const makeFailingEntityStore = <A, Ref>(): LegacyEntityStore<A, Ref> => ({
  findByLegacyId: () => Promise.resolve(ok(null)),
  provision: () => Promise.resolve(err<PartnersEtlStoreError>('partners-etl-store-unavailable')),
});

// ---------------------------------------------------------------------------
// Fake do AuthEtlPort: provisionLegacyUser idempotente por legacyId; conta chamadas.
// Deriva um UserId determinístico do legacyId (UUID v4 fixo por id).
// ---------------------------------------------------------------------------

export type FakeAuthPort = AuthEtlPort &
  Readonly<{
    readonly provisionedUsers: ReadonlyMap<number, UserId.UserId>;
    readonly provisionCalls: () => number;
    // AUTH-ETL-USER-FIELDS (#277): espelho dos inputs recebidos, para asseverar que o
    // orchestrate repassa name/cpf/telephone/collaboratorRef (não só o núcleo).
    readonly provisionInputs: readonly ProvisionLegacyUserInput[];
    readonly lastProvisionInput: () => ProvisionLegacyUserInput | undefined;
  }>;

// UUIDs v4 válidos determinísticos (variante 4, version 4) por legacyId.
const userIdFor = (legacyId: number): UserId.UserId => {
  const hex = legacyId.toString(16).padStart(12, '0');
  const raw = `00000000-0000-4000-8000-${hex}`;
  const parsed = UserId.rehydrate(raw);
  // Fixture controlado: sempre válido por construção.
  if (!parsed.ok) throw new Error(`fixture userId inválido: ${raw}`);
  return parsed.value;
};

export const makeFakeAuthPort = (): FakeAuthPort => {
  const provisionedUsers = new Map<number, UserId.UserId>();
  const provisionInputs: ProvisionLegacyUserInput[] = [];
  let calls = 0;

  const provisionLegacyUser: AuthEtlPort['provisionLegacyUser'] = (input) => {
    calls += 1;
    provisionInputs.push(input); // captura para asserts de paridade de perfil (#277)
    const existing = provisionedUsers.get(input.legacyId);
    if (existing !== undefined) {
      return Promise.resolve(ok({ userRef: existing, outcome: 'already-exists' as const }));
    }
    const userRef = userIdFor(input.legacyId);
    provisionedUsers.set(input.legacyId, userRef);
    return Promise.resolve(ok({ userRef, outcome: 'created' as const }));
  };

  return {
    provisionLegacyUser,
    close: () => Promise.resolve(),
    provisionedUsers,
    provisionCalls: () => calls,
    provisionInputs,
    lastProvisionInput: () => provisionInputs[provisionInputs.length - 1],
  };
};

// Auth port que falha SEMPRE no provisionLegacyUser com um erro de port concreto
// (kebab-case EN, sem PII) — para provar que a quarentena carrega o erro real do auth.
export const FAILING_AUTH_ERROR = 'provisioned-user-store-unavailable' as const;

export const makeFailingAuthPort = (): AuthEtlPort => ({
  provisionLegacyUser: () => Promise.resolve(err<ProvisionLegacyUserError>(FAILING_AUTH_ERROR)),
  close: () => Promise.resolve(),
});

// ---------------------------------------------------------------------------
// Builders de linhas legadas sintéticas (mesmo estilo dos mapper tests).
// ---------------------------------------------------------------------------

const NOW = new Date('2026-06-01T12:00:00.000Z');
const UPDATED = new Date('2026-06-02T09:30:00.000Z');
const VALID_CNPJ = '11444777000161';
const VALID_CPF = '52998224725';

export const supplierRow = (over: Partial<LegacySupplierRow> = {}): LegacySupplierRow => ({
  id: 100,
  name: 'Fornecedor X',
  email: 'fornecedor@example.com',
  cnpj: VALID_CNPJ,
  corporateName: 'Fornecedor X LTDA',
  fantasyName: 'FX',
  serviceCategory: 'INFORMATICA',
  active: 1,
  bancaryInfoBank: '001',
  bancaryInfoAgency: '1234',
  bancaryInfoAccountnumber: '567890',
  bancaryInfoDv: '1',
  pixInfoKeyType: null,
  pixInfoKey: null,
  serviceEvaluation: null,
  commentEvaluation: null,
  createdAt: NOW,
  updatedAt: UPDATED,
  ...over,
});

export const financierRow = (over: Partial<LegacyFinancierRow> = {}): LegacyFinancierRow => ({
  id: 200,
  name: 'Financiador Y',
  corporateName: 'Financiador Y SA',
  legalRepresentative: 'Fulano',
  cnpj: VALID_CNPJ,
  telephone: '11999998888',
  address: 'Rua 1, 100',
  active: 1,
  createdAt: NOW,
  updatedAt: UPDATED,
  ...over,
});

export const collaboratorRow = (
  over: Partial<LegacyCollaboratorRow> = {},
): LegacyCollaboratorRow => ({
  id: 300,
  name: 'Colaborador Z',
  email: 'colab@example.com',
  cpf: VALID_CPF,
  occupationArea: 'PARC',
  role: 'Dev',
  startOfContract: NOW,
  employmentRelationship: 'CLT',
  status: 'CADASTRO_COMPLETO',
  active: 1,
  disableBy: null,
  rg: null,
  dateOfBirth: null,
  genderIdentity: null,
  race: null,
  education: null,
  foodCategory: null,
  foodCategoryDescription: null,
  completeAddress: null,
  telephone: '11988887777',
  emergencyContactName: null,
  emergencyContactTelephone: null,
  allergies: null,
  biography: null,
  experienceInThePublicSector: null,
  createdAt: NOW,
  updatedAt: UPDATED,
  ...over,
});

export const userRow = (over: Partial<LegacyUserRow> = {}): LegacyUserRow => ({
  id: 400,
  name: 'Usuario W',
  email: 'user@example.com',
  cpf: VALID_CPF,
  telephone: '11977776666',
  imageUrl: null,
  active: 1,
  massApprovalPermission: 0,
  collaboratorId: null,
  createdAt: NOW,
  updatedAt: UPDATED,
  ...over,
});

export { NOW, UPDATED, VALID_CNPJ, VALID_CPF };
