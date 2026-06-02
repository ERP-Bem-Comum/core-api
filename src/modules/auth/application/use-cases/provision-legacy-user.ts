/**
 * Use case provisionLegacyUser (modulo auth) - bootstrap one-shot da ETL (AUTH-ETL-USER-PROVISIONING).
 *
 * Cria um auth.User para um usuario migrado do legado:
 *   - SEM senha utilizavel: hash argon2 de um segredo random descartado (D16). Login impossivel
 *     ate o reset por email (D6/P4a); fail-closed por construcao (segredo desconhecido).
 *   - Idempotente por legacy_id (D17): re-provisionar retorna already-exists e NAO sobrescreve
 *     o registro (protege senha ja resetada).
 *   - massApprove -> concede o Role compartilhado `etl:mass-approver` (1 permission
 *     contract:mass-approve, D15); reusa por name (sem role explosion). Sem a flag -> sem role.
 *
 * Factory function (application/rules): (deps) => (input) => Promise<Result<...>>.
 * Sequencia: validar/fetch (findByLegacyId) -> dominio (Role/User) -> persist. ASCII puro.
 */

import { type Result, ok, err } from '../../../../shared/primitives/result.ts';
import type { Clock } from '../../../../shared/ports/clock.ts';
import type * as Email from '../../domain/identity/email.ts';
import * as UserId from '../../domain/identity/user-id.ts';
import * as User from '../../domain/identity/user/user.ts';
import * as Role from '../../domain/authorization/role.ts';
import * as RoleId from '../../domain/authorization/role-id.ts';
import * as Permission from '../../domain/authorization/permission.ts';
import * as Password from '../../domain/credential/password-policy.ts';
import type {
  RoleRepository,
  RoleRepositoryError,
} from '../../domain/authorization/role-repository.ts';
import type {
  ProvisionedUserStore,
  ProvisionedUserStoreError,
} from '../ports/provisioned-user-store.ts';
import type { PasswordHasher, PasswordHasherError } from '../ports/password-hasher.ts';
import { CONTRACT_PERMISSION } from '../../../contracts/public-api/permissions.ts';

// Nome canonico do Role compartilhado de aprovacao em massa (D15). Capacidade, nao identidade.
export const MASS_APPROVER_ROLE_NAME = 'etl:mass-approver';

export type ProvisionLegacyUserInput = Readonly<{
  legacyId: number;
  email: Email.Email;
  massApprove: boolean;
}>;

export type ProvisionLegacyUserOutput = Readonly<{
  userRef: UserId.UserId;
  outcome: 'created' | 'already-exists';
}>;

export type ProvisionLegacyUserError =
  | ProvisionedUserStoreError
  | RoleRepositoryError
  | PasswordHasherError
  | 'mass-approver-role-invalid'
  | 'password-secret-invalid';

export type ProvisionLegacyUserDeps = Readonly<{
  store: ProvisionedUserStore;
  roleRepo: RoleRepository;
  passwordHasher: PasswordHasher;
  clock: Clock;
  // Fonte do segredo random descartado (prod: randomBytes; testes: valor fixo). Nunca persistido em claro.
  secret: () => string;
}>;

// Resolve o Role compartilhado por name (reuso idempotente); cria + persiste se ausente.
const resolveMassApproverRole = async (
  deps: ProvisionLegacyUserDeps,
): Promise<Result<Role.Role, ProvisionLegacyUserError>> => {
  const listed = await deps.roleRepo.list();
  if (!listed.ok) return err(listed.error);

  const existing = listed.value.find((r) => r.name === MASS_APPROVER_ROLE_NAME);
  if (existing !== undefined) return ok(existing);

  const permR = Permission.parse(CONTRACT_PERMISSION.massApprove);
  if (!permR.ok) return err('mass-approver-role-invalid');

  const roleR = Role.create({
    id: RoleId.generate(),
    name: MASS_APPROVER_ROLE_NAME,
    permissions: [permR.value],
  });
  if (!roleR.ok) return err('mass-approver-role-invalid');

  const saved = await deps.roleRepo.save(roleR.value);
  if (!saved.ok) return err(saved.error);

  return ok(roleR.value);
};

export const provisionLegacyUser =
  (deps: ProvisionLegacyUserDeps) =>
  async (
    input: ProvisionLegacyUserInput,
  ): Promise<Result<ProvisionLegacyUserOutput, ProvisionLegacyUserError>> => {
    // 1. Idempotencia por legacy_id (skip, nunca sobrescreve).
    const existing = await deps.store.findByLegacyId(input.legacyId);
    if (!existing.ok) return err(existing.error);
    if (existing.value !== null) {
      return ok({ userRef: existing.value, outcome: 'already-exists' });
    }

    // 2. Role compartilhado apenas quando massApprove (sem a flag -> nasce sem role).
    let roles: readonly Role.Role[] = [];
    if (input.massApprove) {
      const roleR = await resolveMassApproverRole(deps);
      if (!roleR.ok) return err(roleR.error);
      roles = [roleR.value];
    }

    // 3. Senha inutilizavel: hash argon2 de segredo random forte; o segredo e descartado.
    const passwordR = Password.parse(deps.secret());
    if (!passwordR.ok) return err('password-secret-invalid');
    const hashR = await deps.passwordHasher.hash(passwordR.value);
    if (!hashR.ok) return err(hashR.error);

    // 4. Agregado User (active, sem senha utilizavel ate reset).
    const { user } = User.register(
      { id: UserId.generate(), email: input.email, passwordHash: hashR.value, roles },
      deps.clock.now(),
    );

    // 5. Persistir com correlacao legacy_id (insert idempotente).
    const provisioned = await deps.store.provision(user, input.legacyId);
    if (!provisioned.ok) return err(provisioned.error);

    return ok({ userRef: user.id, outcome: 'created' });
  };
