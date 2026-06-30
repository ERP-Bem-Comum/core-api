# AUTH-USECASE-ASSIGN-ROLE (A9) — assignRole (com autorização do ator)

## Origem

Fase A, ticket A9 (último use case da trilha auth). Decisão `DD-USER-07`: autoriza o ator via
`authorize`/`forbidden` (1ª aplicação de DD-USER-02). Reusa `User.assignRole` (agregado, idempotente),
`authorize`, `Permission.parse`, `RoleRepository.findById`. Sem ports/adapters novos.

## Arquivo

**Novo:** `src/modules/auth/application/use-cases/assign-role.ts` — use case `assignRole`.

## Contrato

```ts
export type AssignRoleCommand = Readonly<{
  actorId: UserId;       // quem atribui (do access token)
  targetUserId: UserId;  // quem recebe
  roleId: RoleId;
}>;

export type AssignRoleError =
  | 'forbidden'          // ator null/disabled/sem-permissão (fail-closed)
  | 'user-not-found'     // target null
  | 'user-disabled'      // target disabled
  | 'role-not-found'     // role null
  | UserRepositoryError
  | RoleRepositoryError;

export type AssignRoleOutput = Readonly<{ user: ActiveUser; event: RoleAssigned }>;

type Deps = Readonly<{
  userReader: UserReader;
  userRepo: UserRepository;
  roleRepo: RoleRepository;
  clock: Clock;
}>;
```

## Sequência

1. **Ator:** `findById(actorId)`; err→propaga; `null` **ou** `parseActive` falho → `err('forbidden')` (fail-closed).
2. **Authz:** `Permission.parse('user:assign-role')` falho (impossível) → `err('forbidden')`;
   `authorize(actor, permission)` `!ok` → `err('forbidden')`.
3. **Target:** `findById(targetUserId)`; err→propaga; `null` → `err('user-not-found')`; `parseActive` falho → `err('user-disabled')`.
4. **Role:** `roleRepo.findById(roleId)`; err→propaga; `null` → `err('role-not-found')`.
5. `User.assignRole(target, role, clock.now())` → `{ user, event }`; `userRepo.save(user)` err→propaga.
6. `ok({ user, event })`.

## Critérios de aceitação

- **CA1:** ator autorizado + target ativo + role existe → `ok`; `event.type === 'RoleAssigned'`, `event.roleId === roleId`; o target salvo passa a ter o role (`roles` inclui o `roleId`).
- **CA2:** ator **sem** a permissão → `err('forbidden')`; target não muda.
- **CA3:** ator inexistente → `err('forbidden')`.
- **CA4:** ator `disabled` → `err('forbidden')`.
- **CA5:** target inexistente → `err('user-not-found')`.
- **CA6:** target `disabled` → `err('user-disabled')`.
- **CA7:** role inexistente → `err('role-not-found')`.
- **CA8 (idempotente):** atribuir role que o target já possui → `ok`; `roles` não duplica.

## Fora de escopo

- Publicar `RoleAssigned` (EventBus futuro). `revokeRole` (DD-USER-03, YAGNI). Permissão configurável por
  política externa. Adapter MySQL (Fase P).

## Notas

- **Skill:** `ports-and-adapters`. `Clock.now()`; zero `throw`/`class`. Lint antecipado no W1.
- Teste: ator ganha a permissão no arrange via `Role.create({permissions:['user:assign-role']})` +
  `User.assignRole(actor, adminRole, AT)` + save. Helpers reutilizam padrão dos tickets anteriores.
- **Pipeline W0→W3.** W0 RED: `tests/.../assign-role.test.ts`.
