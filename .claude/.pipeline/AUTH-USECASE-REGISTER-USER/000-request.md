# AUTH-USECASE-REGISTER-USER (A4) — use case `registerUser`

## Origem

Fase A, ticket A4 — **primeiro use case** do módulo `auth`. Amarra os ports A1 (UserRepository/UserReader),
X1 (PasswordHasher) + Clock. Decisões: `design-decisions.md` (DD-USER-04 senha pronta; DD-PORTS-01).
Espelha `contracts/application/use-cases/create-pending-contract.ts` (factory `(deps) => (cmd) => Promise<Result>`).

## Arquivo a criar

- `src/modules/auth/application/use-cases/register-user.ts` — `registerUser(deps)(cmd)`.

## Contrato

```ts
type RegisterUserCommand = Readonly<{ email: string; password: string }>;
type RegisterUserOutput  = Readonly<{ user: ActiveUser; event: UserRegistered }>;
type RegisterUserError =
  | EmailError | PasswordPolicyError       // validação de input
  | 'email-already-registered'             // unicidade (regra de use case)
  | PasswordHasherError | UserRepositoryError;
type Deps = Readonly<{ userReader: UserReader; userRepo: UserRepository; passwordHasher: PasswordHasher; clock: Clock }>;
```

## Sequência (validate → fetch → domain → persist → emit)

1. **Validate:** `Email.parse(cmd.email)` + `Password.parse(cmd.password)` (early-return).
2. **Fetch (unicidade):** `userReader.findByEmail(email)` → se `!= null` → `err('email-already-registered')`.
3. **Hash:** `passwordHasher.hash(password)` → `PasswordHash` (senha em claro nunca persiste — DD-USER-04).
4. **Domain:** `User.register({ id: UserId.generate(), email, passwordHash, roles: [] }, clock.now())` → `{ user, event }`.
5. **Persist:** `userRepo.save(user)`.
6. **Retorna** `{ user, event }`. **Não publica** (auth ainda sem EventBus/outbox — o `event` fica no output para o transporte futuro).

## Critérios de aceitação

- **CA1 (sucesso):** input válido → `ok({ user, event })`; `user.status='active'`; `user.email` normalizado; `event.type='UserRegistered'`; user **persistido** (reader acha).
- **CA2 (email inválido):** `'invalid'` → `err('email-invalid-format')`.
- **CA3 (senha curta):** `'short'` → `err('password-too-short')`.
- **CA4 (duplicado):** registrar 2× o mesmo e-mail → 2º → `err('email-already-registered')`.
- **CA5 (hash, não claro):** `user.passwordHash != password`; `passwordHasher.verify(password, user.passwordHash) === true`.

## Fora de escopo

- Roles no registro (cria com `roles: []`; atribuição via `assignRole`/A9). Publicação de evento (sem EventBus). Emissão de tokens (login = A5).

## Notas

- **Skill:** `ports-and-adapters` + `tdd-strategist`. Application = Imperative Shell (async, Result). `UserId.generate()` no use case. ASCII puro.
- **Pipeline W0→W3.** Teste com InMemory user store + fake hasher + `ClockFixed`. RED: `register-user.test.ts` falha.
