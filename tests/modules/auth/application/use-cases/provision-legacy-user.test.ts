import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { provisionLegacyUser } from '#src/modules/auth/application/use-cases/provision-legacy-user.ts';
import { makeInMemoryProvisionedUserStore } from '#src/modules/auth/adapters/persistence/repos/provisioned-user-store.in-memory.ts';
import { makeInMemoryRoleStore } from '#src/modules/auth/adapters/persistence/repos/role-repository.in-memory.ts';
import { makeFakePasswordHasher } from '#src/modules/auth/adapters/crypto/password-hasher.fake.ts';
import { ClockFixed } from '#src/shared/adapters/clock-fixed.ts';
import * as Email from '#src/modules/auth/domain/identity/email.ts';
import * as Permission from '#src/modules/auth/domain/authorization/permission.ts';
import { authorize } from '#src/modules/auth/domain/authorization/authorize.ts';
import { CONTRACT_PERMISSION } from '#src/modules/contracts/public-api/permissions.ts';

const AT = new Date('2026-06-02T12:00:00.000Z');
const MASS_APPROVER_ROLE_NAME = 'etl:mass-approver';

// ─── AUTH-ETL-USER-FIELDS (#277) — fixtures de perfil legado ───────────────────
const VALID_CPF = '52998224725'; // 11 dígitos, checksum válido (auth Cpf.parse)
const VALID_TELEPHONE = '11977776666'; // BR móvel: DDD 11 + 9 inicial
const INVALID_TELEPHONE = '123'; // 3 dígitos -> telephone-invalid (degrada p/ null)
const INVALID_CPF = '12345678900'; // 11 dígitos, DV inválido -> cpf degrada p/ null
const COLLABORATOR_REF = '11111111-1111-4111-8111-111111111111'; // ref lógica (sem FK)

const emailOf = (raw: string): Email.Email => {
  const r = Email.parse(raw);
  if (!r.ok) throw new Error(`fixture email inválido: ${r.error}`);
  return r.value;
};

const makeDeps = () => {
  const provisioned = makeInMemoryProvisionedUserStore();
  const roles = makeInMemoryRoleStore();
  const passwordHasher = makeFakePasswordHasher();
  return {
    provisioned,
    roles,
    passwordHasher,
    deps: {
      store: provisioned.store,
      roleRepo: roles.repository,
      passwordHasher,
      clock: ClockFixed(AT),
      secret: () => 'r4nd0m-etl-secret-9f3a2b7c1d',
    },
  };
};

describe('provisionLegacyUser', () => {
  it('cria um user novo (outcome=created) com hash não-vazio e sem role quando massApprove=false', async () => {
    const { provisioned, deps } = makeDeps();

    const r = await provisionLegacyUser(deps)({
      legacyId: 7,
      email: emailOf('joao@example.com'),
      massApprove: false,
    });

    assert.equal(r.ok, true);
    if (!r.ok) return;
    assert.equal(r.value.outcome, 'created');

    const saved = provisioned.saved();
    assert.equal(saved.length, 1);
    assert.equal(saved[0]?.legacyId, 7);
    assert.equal(saved[0]?.user.id, r.value.userRef);
    assert.equal(saved[0]?.user.roles.length, 0);
    assert.notEqual(String(saved[0]?.user.passwordHash ?? ''), '');
  });

  it('não vaza o segredo da senha no resultado', async () => {
    const { deps } = makeDeps();
    const secret = 'r4nd0m-etl-secret-9f3a2b7c1d';

    const r = await provisionLegacyUser(deps)({
      legacyId: 8,
      email: emailOf('maria@example.com'),
      massApprove: false,
    });

    assert.equal(r.ok, true);
    if (!r.ok) return;
    assert.equal(JSON.stringify(r.value).includes(secret), false);
  });

  it('é idempotente por legacyId: re-provisionar retorna already-exists e NÃO sobrescreve o registro', async () => {
    const { provisioned, deps } = makeDeps();

    const first = await provisionLegacyUser(deps)({
      legacyId: 42,
      email: emailOf('carlos@example.com'),
      massApprove: false,
    });
    assert.equal(first.ok, true);
    if (!first.ok) return;

    const before = provisioned.saved();
    const hashBefore = String(before[0]?.user.passwordHash ?? '');

    const second = await provisionLegacyUser(deps)({
      legacyId: 42,
      email: emailOf('carlos@example.com'),
      massApprove: false,
    });
    assert.equal(second.ok, true);
    if (!second.ok) return;

    assert.equal(second.value.outcome, 'already-exists');
    assert.equal(second.value.userRef, first.value.userRef);

    const after = provisioned.saved();
    assert.equal(after.length, 1);
    assert.equal(String(after[0]?.user.passwordHash ?? ''), hashBefore);
  });

  it('massApprove=true concede o Role compartilhado etl:mass-approver com a única permission contract:mass-approve', async () => {
    const { provisioned, roles, deps } = makeDeps();

    const r = await provisionLegacyUser(deps)({
      legacyId: 10,
      email: emailOf('ana@example.com'),
      massApprove: true,
    });
    assert.equal(r.ok, true);
    if (!r.ok) return;

    const saved = provisioned.saved();
    assert.equal(saved[0]?.user.roles.length, 1);
    const role = saved[0]?.user.roles[0];
    assert.equal(role?.name, MASS_APPROVER_ROLE_NAME);
    assert.equal(role?.permissions.length, 1);
    assert.equal(String(role?.permissions[0]), CONTRACT_PERMISSION.massApprove);

    const listed = await roles.repository.list();
    assert.equal(listed.ok, true);
    if (!listed.ok) return;
    assert.equal(listed.value.length, 1);
  });

  it('reusa o MESMO Role compartilhado entre dois users com massApprove (sem role explosion)', async () => {
    const { provisioned, roles, deps } = makeDeps();

    const a = await provisionLegacyUser(deps)({
      legacyId: 1,
      email: emailOf('a@example.com'),
      massApprove: true,
    });
    const b = await provisionLegacyUser(deps)({
      legacyId: 2,
      email: emailOf('b@example.com'),
      massApprove: true,
    });
    assert.equal(a.ok && b.ok, true);

    const listed = await roles.repository.list();
    assert.equal(listed.ok, true);
    if (!listed.ok) return;
    assert.equal(listed.value.length, 1);

    const saved = provisioned.saved();
    const roleIdA = saved.find((s) => s.legacyId === 1)?.user.roles[0]?.id;
    const roleIdB = saved.find((s) => s.legacyId === 2)?.user.roles[0]?.id;
    assert.equal(roleIdA, roleIdB);
  });

  it('massApprove=false nasce sem role e authorize(contract:mass-approve) é negado (fail-closed)', async () => {
    const { provisioned, deps } = makeDeps();

    const r = await provisionLegacyUser(deps)({
      legacyId: 99,
      email: emailOf('sem-poder@example.com'),
      massApprove: false,
    });
    assert.equal(r.ok, true);
    if (!r.ok) return;

    const user = provisioned.saved()[0]?.user;
    assert.notEqual(user, undefined);
    if (user === undefined) return;

    const perm = Permission.parse(CONTRACT_PERMISSION.massApprove);
    assert.equal(perm.ok, true);
    if (!perm.ok) return;

    const authz = authorize(user, perm.value);
    assert.equal(authz.ok, false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// AUTH-ETL-USER-FIELDS (#277) — paridade de perfil no provisionamento legado.
//
// W0 RED: hoje `User.register` hardcoda name/cpf/telephone/photo/collaboratorId=null
// (user.ts :84-87) e `ProvisionLegacyUserInput` (provision-legacy-user.ts :38-42) NÃO
// tem campos de perfil. Estes testes assumem a ASSINATURA-ALVO do W1: o input estende-se
// com { name?, cpf?, telephone?, collaboratorRef? } (string|null) e o use case DEGRADA
// cpf/telephone inválido para null (NÃO quarentena/erro) + warning com o legacyId.
//
// Por que isto CARREGA e roda mesmo sem a API: `node --test --experimental-strip-types`
// NÃO type-checa — apenas remove anotações. O objeto-literal com os campos novos roda
// (a impl atual ignora as props extras), e o RED vem das ASSERÇÕES (os campos do User
// salvo seguem `null` hoje). O gate `pnpm run typecheck` também fica RED (propriedades
// inexistentes em ProvisionLegacyUserInput) — RED válido (falha por inexistência da API).
//
// Precedente da degradação: read-mapper `user.mapper.ts` :205-217 (incidente login-500),
// que DEGRADA campo de perfil opcional inválido p/ null + warning via process.stderr.write.
// ─────────────────────────────────────────────────────────────────────────────
describe('provisionLegacyUser — perfil legado (AUTH-ETL-USER-FIELDS #277)', () => {
  // CA1: name/cpf/telephone/collaboratorRef válidos -> os 4 campos populados no User salvo.
  it('CA1 — popula name/cpf/telephone/collaboratorId a partir do legado', async () => {
    const { provisioned, deps } = makeDeps();

    const r = await provisionLegacyUser(deps)({
      legacyId: 501,
      email: emailOf('joao.perfil@example.com'),
      massApprove: false,
      name: 'Joao da Silva',
      cpf: VALID_CPF,
      telephone: VALID_TELEPHONE,
      collaboratorRef: COLLABORATOR_REF,
    });

    assert.equal(r.ok, true);
    if (!r.ok) return;
    assert.equal(r.value.outcome, 'created');

    const user = provisioned.saved()[0]?.user;
    assert.notEqual(user, undefined);
    if (user === undefined) return;

    // RED hoje: User.register hardcoda estes 4 como null.
    assert.equal(user.name, 'Joao da Silva');
    assert.equal(user.cpf, VALID_CPF); // VO erased em runtime -> dígitos
    assert.equal(user.telephone, VALID_TELEPHONE);
    assert.equal(user.collaboratorId, COLLABORATOR_REF);
  });

  // CA2a: telephone inválido -> DEGRADA p/ null (NÃO quarentena/erro), cpf válido populado,
  // outcome 'created', e warning observável (canal precedente: process.stderr.write).
  it('CA2a — telephone inválido degrada p/ null (created, cpf válido populado) + warning', async () => {
    const { provisioned, deps } = makeDeps();

    const writes: string[] = [];
    const restore = process.stderr.write;
    // Spy do canal de warning. Precedente: read-mapper (user.mapper.ts :215) usa
    // process.stderr.write para "degraded invalid profile". Restaurado no .finally.
    process.stderr.write = ((chunk: unknown): boolean => {
      writes.push(String(chunk));
      return true;
    }) as typeof process.stderr.write;

    const r = await provisionLegacyUser(deps)({
      legacyId: 90277,
      email: emailOf('tel.ruim@example.com'),
      massApprove: false,
      name: 'Maria',
      cpf: VALID_CPF,
      telephone: INVALID_TELEPHONE,
      collaboratorRef: null,
    }).finally(() => {
      process.stderr.write = restore;
    });

    assert.equal(r.ok, true);
    if (!r.ok) return;
    // Degrada, NÃO quarentena: o usuário é criado mesmo com telephone ruim.
    assert.equal(r.value.outcome, 'created');

    const user = provisioned.saved()[0]?.user;
    assert.notEqual(user, undefined);
    if (user === undefined) return;

    assert.equal(user.telephone, null); // degradado (já null hoje; garante "não populou lixo")
    assert.equal(user.cpf, VALID_CPF); // válido -> populado (RED hoje: null)

    // Warning observável citando o legacyId (para higienização posterior do dado).
    assert.ok(
      writes.join('').includes('90277'),
      'esperado warning no stderr citando o legacyId do telephone degradado',
    );
  });

  // CA2b (defesa): cpf inválido -> DEGRADA p/ null; telephone válido populado; created.
  it('CA2b — cpf inválido degrada p/ null por defesa (telephone válido populado)', async () => {
    const { provisioned, deps } = makeDeps();

    const r = await provisionLegacyUser(deps)({
      legacyId: 90278,
      email: emailOf('cpf.ruim@example.com'),
      massApprove: false,
      name: 'Carlos',
      cpf: INVALID_CPF,
      telephone: VALID_TELEPHONE,
      collaboratorRef: null,
    });

    assert.equal(r.ok, true);
    if (!r.ok) return;
    assert.equal(r.value.outcome, 'created');

    const user = provisioned.saved()[0]?.user;
    assert.notEqual(user, undefined);
    if (user === undefined) return;

    assert.equal(user.cpf, null); // degradado
    assert.equal(user.telephone, VALID_TELEPHONE); // válido -> populado (RED hoje: null)
  });

  // CA3: collaboratorRef=null -> collaboratorId=null, sem erro; demais campos populam.
  it('CA3 — collaboratorRef=null gera collaboratorId=null sem erro', async () => {
    const { provisioned, deps } = makeDeps();

    const r = await provisionLegacyUser(deps)({
      legacyId: 503,
      email: emailOf('sem.colab@example.com'),
      massApprove: false,
      name: 'Ana',
      cpf: VALID_CPF,
      telephone: VALID_TELEPHONE,
      collaboratorRef: null,
    });

    assert.equal(r.ok, true);
    if (!r.ok) return;
    assert.equal(r.value.outcome, 'created');

    const user = provisioned.saved()[0]?.user;
    assert.notEqual(user, undefined);
    if (user === undefined) return;

    assert.equal(user.collaboratorId, null); // sem vínculo, sem erro
    assert.equal(user.name, 'Ana'); // RED hoje: null (prova que os demais campos populam)
  });

  // CA4 (retrocompat — GUARDA): SÓ o núcleo -> name/cpf/telephone/collaboratorId null.
  // Já é verde hoje; deve PERMANECER verde após o W1 (register estendido mantém default
  // null para self-register/OIDC). Não é driver de RED — é trava de regressão.
  it('CA4 — núcleo-only mantém name/cpf/telephone/collaboratorId null (retrocompat)', async () => {
    const { provisioned, deps } = makeDeps();

    const r = await provisionLegacyUser(deps)({
      legacyId: 504,
      email: emailOf('nucleo@example.com'),
      massApprove: false,
    });

    assert.equal(r.ok, true);
    if (!r.ok) return;

    const user = provisioned.saved()[0]?.user;
    assert.notEqual(user, undefined);
    if (user === undefined) return;

    assert.equal(user.name, null);
    assert.equal(user.cpf, null);
    assert.equal(user.telephone, null);
    assert.equal(user.collaboratorId, null);
  });
});
