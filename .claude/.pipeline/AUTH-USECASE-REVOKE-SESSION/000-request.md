# AUTH-USECASE-REVOKE-SESSION (A7) — revokeSession + revokeAllSessions (logout)

## Origem

Fase A, ticket A7. Logout/admin "revoga imediatamente" (ADR-0024:45); evento `SessionRevoked` (ADR-0024:72,
diferido). Decisão `DD-SESSION-06`: dois use cases por refresh em claro, idempotentes. Reusa `revoke` (agregado),
`findByTokenHash` e `findRevocableByUserId` (A6a). Sem ports/adapters novos.

## Arquivo

**Novo:** `src/modules/auth/application/use-cases/revoke-session.ts` — exporta `revokeSession` e `revokeAllSessions`.

## Contrato

```ts
export type RevokeSessionCommand = Readonly<{ refreshToken: string }>;
export type RevokeSessionError = RefreshTokenRepositoryError; // idempotente: sem 'not-found'

type Deps = Readonly<{
  refreshTokenMinter: RefreshTokenMinter;       // hash
  refreshTokenRepo: RefreshTokenRepository;     // findByTokenHash, findRevocableByUserId, save
  clock: Clock;                                 // now p/ revoke(token, at)
}>;

export const revokeSession: (deps: Deps) => (cmd: RevokeSessionCommand) => Promise<Result<void, RevokeSessionError>>;
export const revokeAllSessions: (deps: Deps) => (cmd: RevokeSessionCommand) => Promise<Result<void, RevokeSessionError>>;
```

## Sequência

**revokeSession:** `hash(cmd.refreshToken)` → `findByTokenHash`; err→propaga; `null` → `ok(undefined)` (idempotente);
senão `save(revoke(token, now))`.

**revokeAllSessions:** `hash` → `findByTokenHash`; err→propaga; `null` → `ok(undefined)`; senão resolve `userId`
do token → `findRevocableByUserId(userId)` → `revoke(t, now)`+`save` para cada (err→propaga).

## Critérios de aceitação

- **CA1:** `revokeSession` com refresh válido → `ok`; o token fica `revoked` (`revokedAt !== null`); `verify` passa a `refresh-token-revoked`.
- **CA2 (idempotente):** `revokeSession` com refresh inexistente → `ok(undefined)` (não erro).
- **CA3 (idempotente):** `revokeSession` chamado 2× no mesmo token → `ok` ambas; `revokedAt` não muda na 2ª (no-op do agregado).
- **CA4:** `revokeAllSessions` com 1 usuário tendo ≥2 sessões ativas → `ok`; **todas** ficam `revoked`.
- **CA5 (isolamento):** `revokeAllSessions` não revoga sessões de **outro** usuário.
- **CA6 (idempotente):** `revokeAllSessions` com refresh inexistente → `ok(undefined)`.

## Fora de escopo

- Evento `SessionRevoked` no output (espelha `authenticate-user`; entra com o EventBus). Admin revogar por
  `userId` de terceiro (YAGNI). Adapter MySQL do repo (Fase P).

## Notas

- **Skill:** `ports-and-adapters`. `Clock.now()`, nunca `new Date()`. Sem `throw`/`class`.
- **Pipeline W0→W3.** W0 RED: `tests/modules/auth/application/use-cases/revoke-session.test.ts` (fakes + ClockFixed; popula via register+authenticate; segunda sessão via 2º `authenticate`).
- Para "≥2 sessões ativas" no teste: `authenticate` 2× gera 2 refresh distintos (fake minter incrementa) do mesmo usuário.
