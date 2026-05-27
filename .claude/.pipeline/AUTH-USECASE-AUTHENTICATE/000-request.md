# AUTH-USECASE-AUTHENTICATE (A5) — use case `authenticateUser` (credencial + access JWT)

## Origem

Fase A, ticket A5 (fatiado — A5b adiciona o refresh). Decisão `DD-LOGIN-01`. Amarra UserReader (A1) +
PasswordHasher (X1) + TokenIssuer (X2). Espelha `register-user.ts`.

## Arquivo a criar

- `src/modules/auth/application/use-cases/authenticate-user.ts` — `authenticateUser(deps)(cmd)`.

## Contrato

```ts
type AuthenticateUserCommand = Readonly<{ email: string; password: string }>;
type AuthenticateUserOutput  = Readonly<{ accessToken: string; userId: UserId }>;
type AuthenticateUserError =
  | 'invalid-credentials'                    // email/senha/parse — uniforme (anti-enumeration)
  | 'user-disabled'                          // só após senha correta
  | PasswordHasherError | TokenIssuerError | UserRepositoryError;
type Deps = Readonly<{ userReader: UserReader; passwordHasher: PasswordHasher; tokenIssuer: TokenIssuer }>;
```

## Sequência (DD-LOGIN-01)

1. `Email.parse(cmd.email)` falho → `err('invalid-credentials')` (não vaza).
2. `Password.parse(cmd.password)` falho → `err('invalid-credentials')` (login não valida política).
3. `userReader.findByEmail(email)` → `null` → `err('invalid-credentials')`.
4. `passwordHasher.verify(password, user.passwordHash)`: erro técnico → propaga; `false` → `err('invalid-credentials')`.
5. `User.parseActive(user)` → `DisabledUser` → `err('user-disabled')` (só aqui — senha já validada).
6. `tokenIssuer.issueAccessToken({ userId: user.id })` → propaga erro.
7. `ok({ accessToken, userId: user.id })`.

## Critérios de aceitação

- **CA1 (sucesso):** credencial correta → `ok({ accessToken, userId })`; `accessToken` não-vazio; `tokenIssuer.verifyAccessToken(accessToken)` devolve o **mesmo** `userId`.
- **CA2 (email não registrado):** → `err('invalid-credentials')`.
- **CA3 (senha errada):** → `err('invalid-credentials')`.
- **CA4 (email malformado):** → `err('invalid-credentials')` (uniforme, não vaza).
- **CA5 (disabled):** usuário desabilitado + **senha correta** → `err('user-disabled')`.

## Fora de escopo (A5b)

- Refresh token opaco, `RefreshTokenMinter`, persistência de sessão. Evento `UserAuthenticated`/publish.

## Notas

- **Skill:** `ports-and-adapters` + `tdd-strategist`. Sem `Clock` (TTL do access é do `TokenIssuer`). Early-return (α).
- **Pipeline W0→W3.** Teste popula via `registerUser` + InMemory + fake hasher + fake tokenIssuer. RED: `authenticate-user.test.ts` falha. ASCII puro.
