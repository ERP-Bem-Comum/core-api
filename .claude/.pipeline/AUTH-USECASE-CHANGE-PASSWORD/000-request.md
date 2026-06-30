# AUTH-USECASE-CHANGE-PASSWORD (A8) — changePassword (re-auth + revoga sessões)

## Origem

Fase A, ticket A8. Decisão `DD-USER-06`: re-autentica (senha atual) e revoga TODAS as sessões após a troca
(OWASP ASVS V3.3, defense-in-depth — EventBus ainda não existe). Reusa `User.changePassword` (agregado),
`PasswordHasher` (verify+hash), `findRevocableByUserId`+`revoke` (A6a). Sem ports/adapters novos.

## Arquivo

**Novo:** `src/modules/auth/application/use-cases/change-password.ts` — use case `changePassword`.

## Contrato

```ts
export type ChangePasswordCommand = Readonly<{
  userId: UserId;          // do access token (sub) na camada HTTP futura
  currentPassword: string;
  newPassword: string;
}>;

export type ChangePasswordError =
  | 'invalid-credentials'             // user null OU senha atual parse-falho OU verify false
  | 'user-disabled'
  | Password.PasswordPolicyError      // 'password-too-short' | 'password-too-long' (nova senha)
  | PasswordHasherError
  | UserRepositoryError
  | RefreshTokenRepositoryError;

export type ChangePasswordOutput = Readonly<{ user: ActiveUser; event: PasswordChanged }>;

type Deps = Readonly<{
  userReader: UserReader;
  userRepo: UserRepository;
  passwordHasher: PasswordHasher;
  refreshTokenRepo: RefreshTokenRepository;
  clock: Clock;
}>;
```

## Sequência

1. `findById(userId)`; err→propaga; `null` → `err('invalid-credentials')`.
2. `parseActive(user)` falho → `err('user-disabled')`.
3. **Re-auth:** `Password.parse(currentPassword)` falho → `err('invalid-credentials')`; `verify(current, hash)`
   err→propaga; `false` → `err('invalid-credentials')` (mesma resposta — anti-enumeration).
4. `Password.parse(newPassword)` falho → propaga `PasswordPolicyError`. `hash(new)` err→propaga.
5. `User.changePassword(active, newHash, clock.now())` → `{ user, event }`; `userRepo.save(user)` err→propaga.
6. **Revoga todas as sessões** (`revokeAllForUser`: `findRevocableByUserId(userId)` → `revoke`+`save` em cada),
   **após** o save da senha. err→propaga.
7. Retorna `ok({ user, event })`.

## Critérios de aceitação

- **CA1:** senha atual correta + nova válida → `ok`; `event.type === 'PasswordChanged'`; o `passwordHash` do user mudou (novo `verify(new)` true, `verify(old)` false).
- **CA2:** senha atual **errada** → `err('invalid-credentials')`; senha **não** muda.
- **CA3:** nova senha curta (< 8) → `err('password-too-short')`; senha não muda.
- **CA4:** user inexistente → `err('invalid-credentials')`.
- **CA5:** user `disabled` → `err('user-disabled')`.
- **CA6 (ASVS V3.3):** troca OK → **todas** as sessões ativas do usuário ficam `revoked` (login 2× antes, ambas revogadas após a troca).
- **CA7 (isolamento):** a troca não revoga sessões de **outro** usuário.

## Fora de escopo

- Publicar `PasswordChanged` (EventBus futuro). Preservar a sessão atual na revogação (revoga todas — DD-USER-06).
  Migração da revogação para o consumidor de `PasswordChanged`. Adapter MySQL (Fase P).

## Notas

- **Skill:** `ports-and-adapters`. `Clock.now()`, nunca `new Date()`. Sem `throw`/`class`. Lint antecipado no W1.
- Helper local `revokeAllForUser` (3ª ocorrência do loop revoke; extração compartilhada fica para refactor futuro).
- **Pipeline W0→W3.** W0 RED: `tests/.../change-password.test.ts` (fakes + ClockFixed; popula via register+authenticate 2×).
