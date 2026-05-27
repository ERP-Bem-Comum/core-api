# AUTH-AGG-USER — Agregado `User` + serviço `authorize`

## Origem

Série [ADR-0024](../../../handbook/architecture/adr/0024-identity-and-rbac-auth-module.md), ticket D5 (Fase D).
**Decisões de design:** [`handbook/domain/auth/design-decisions.md`](../../../handbook/domain/auth/design-decisions.md)
`DD-USER-01..05` (destiladas de painel de 6 skills). Consultar/criticar lá.

## Estado atual (VOs prontos, closed-green)

`identity/email.ts` (Email), `authorization/permission.ts` (Permission), `authorization/role-id.ts`+`role.ts`
(Role), `credential/password-hash.ts` (PasswordHash). `Password` (claro) não entra no agregado.

## Arquivos a criar

- `identity/user-id.ts` — `UserId` branded + `generate`/`rehydrate` (espelha `role-id.ts`).
- `identity/user/types.ts` — `UserCore` + `ActiveUser` + `DisabledUser` + `User` (união refinada, DD-USER-01).
- `identity/user/errors.ts` — `'user-disabled'`.
- `identity/user/events.ts` — `UserRegistered | PasswordChanged | RoleAssigned | UserDisabled` (DD-USER-05).
- `identity/user/user.ts` — `register`, `parseActive`, `disable`, `changePassword`, `assignRole`.
- `authorization/authorize.ts` — `authorize(user, required)` (DD-USER-02).

## Critérios de aceitação

### `UserId`
- **CA1:** `generate()` → aceito por `rehydrate`. **CA2:** `rehydrate(<uuid v4>)` → ok. **CA3:** inválido → `err('user-id-invalid')`.

### `User` (transições puras, retornam `{ user, event }` — DD-USER-03)
- **CA4 (register):** `register({ id, email, passwordHash, roles }, at)` → `ActiveUser` (`status:'active'`) +
  evento `UserRegistered{ userId, email, occurredAt: at }`. `roles` deduplicados por `RoleId`.
- **CA5 (parseActive):** `parseActive(activeUser)` → `ok(ActiveUser)`; `parseActive(disabledUser)` → `err('user-disabled')`.
- **CA6 (disable):** `disable(activeUser, at)` → `DisabledUser` (`status:'disabled'`, `disabledAt: at`) + `UserDisabled{ userId, occurredAt: at }`.
- **CA7 (changePassword):** `changePassword(activeUser, newHash, at)` → user com `passwordHash` trocado + `PasswordChanged{ userId, occurredAt: at }`. **Payload SEM hash** (DD-USER-04/05).
- **CA8 (assignRole):** `assignRole(activeUser, role, at)` → role adicionado + `RoleAssigned{ userId, roleId, occurredAt: at }`. **Idempotente** por `RoleId` (não duplica).

### `authorize` (DD-USER-02, fail-closed)
- **CA9:** `authorize(activeUser, p)` com `p` em algum role → `ok` (void).
- **CA10:** `authorize(activeUser, p)` sem `p` → `err('forbidden')`.

## Invariantes (segurança — DD-USER-04)

- Domínio **nunca** vê senha em claro; `changePassword` recebe `PasswordHash` pronto.
- **Nenhum** evento carrega hash/senha/token no payload.
- `disable`/`changePassword`/`authorize` aceitam apenas `ActiveUser` (fail-closed por tipo).

## Fora de escopo (YAGNI)

- `enable`/`revokeRole` (aditivos sob demanda). `locked`/`failedAttempts` e invalidação de sessão → camada de sessão (D6, nota propagada no design-decisions.md).
- Unicidade de e-mail, hashing, persistência → use cases (A2/A6) + adapters.

## Notas

- **Skill:** `ts-domain-modeler`. `at: Date` injetado (Clock no use case, nunca `new Date()` no domínio).
- Transições aceitam `ActiveUser` → sem erro próprio → retornam `{ user, event }` direto; `parseActive`/`authorize` retornam `Result`.
- **Pipeline W0→W3.** RED em `tests/modules/auth/domain/{identity/user-id,identity/user/user,authorization/authorize}.test.ts`. ASCII puro.
