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
import * as Cpf from '../../domain/identity/cpf.ts';
import * as Telephone from '../../domain/identity/telephone.ts';
import type * as Role from '../../domain/authorization/role.ts';
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
import { MASS_APPROVER_ROLE_NAME, resolveMassApproverRole } from './mass-approver-role.ts';

// Reexporta o nome canonico do Role compartilhado (SSoT em mass-approver-role.ts; mantido aqui
// por compat com call-sites/historicos que importavam daqui). Capacidade, nao identidade.
export { MASS_APPROVER_ROLE_NAME };

export type ProvisionLegacyUserInput = Readonly<{
  legacyId: number;
  email: Email.Email;
  massApprove: boolean;
  // AUTH-ETL-USER-FIELDS (#277): perfil legado (raw, opcional). cpf/telephone sao parseados pelos
  // VOs do auth aqui dentro (ADR-0006: borda de validacao no auth) e, em falha, DEGRADADOS para
  // null + warning citando o legacyId (Evans p.82 reconstituicao; espelha o read-mapper do
  // incidente login-500) — NAO quarentena. name/collaboratorRef passam direto ao register.
  name?: string | null;
  cpf?: string | null;
  telephone?: string | null;
  collaboratorRef?: string | null;
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

// Degrada um campo de perfil opcional do legado: parseia pelo VO do auth e, em falha, devolve
// null + warning citando o legacyId (para higienizacao posterior do dado). NAO quarentena: o ETL
// e uma factory de reconstituicao (Evans, DDD, p.82) e, como o read-mapper do incidente login-500,
// degrada o campo opcional invalido em vez de rejeitar o registro.
const degradeCpf = (raw: string | null | undefined, legacyId: number): Cpf.Cpf | null => {
  if (raw === null || raw === undefined) return null;
  const parsed = Cpf.parse(raw);
  if (parsed.ok) return parsed.value;
  process.stderr.write(
    `[provision-legacy-user] legacyId=${String(legacyId)} degraded invalid cpf to null: ${parsed.error}\n`,
  );
  return null;
};

const degradeTelephone = (
  raw: string | null | undefined,
  legacyId: number,
): Telephone.Telephone | null => {
  if (raw === null || raw === undefined) return null;
  const parsed = Telephone.parse(raw);
  if (parsed.ok) return parsed.value;
  process.stderr.write(
    `[provision-legacy-user] legacyId=${String(legacyId)} degraded invalid telephone to null: ${parsed.error}\n`,
  );
  return null;
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
      const roleR = await resolveMassApproverRole({ roleRepo: deps.roleRepo });
      if (!roleR.ok) return err(roleR.error);
      roles = [roleR.value];
    }

    // 3. Senha inutilizavel: hash argon2 de segredo random forte; o segredo e descartado.
    const passwordR = Password.parse(deps.secret());
    if (!passwordR.ok) return err('password-secret-invalid');
    const hashR = await deps.passwordHasher.hash(passwordR.value);
    if (!hashR.ok) return err(hashR.error);

    // 4. Perfil legado (#277): cpf/telephone parseados pelos VOs do auth; invalido DEGRADA p/ null
    //    + warning (NAO quarentena). name/collaboratorRef passam direto (register default null).
    const cpf = degradeCpf(input.cpf, input.legacyId);
    const telephone = degradeTelephone(input.telephone, input.legacyId);

    // 5. Agregado User (active, sem senha utilizavel ate reset).
    const { user } = User.register(
      {
        id: UserId.generate(),
        email: input.email,
        passwordHash: hashR.value,
        roles,
        name: input.name ?? null,
        cpf,
        telephone,
        collaboratorRef: input.collaboratorRef ?? null,
      },
      deps.clock.now(),
    );

    // 6. Persistir com correlacao legacy_id (insert idempotente).
    const provisioned = await deps.store.provision(user, input.legacyId);
    if (!provisioned.ok) return err(provisioned.error);

    return ok({ userRef: user.id, outcome: 'created' });
  };
