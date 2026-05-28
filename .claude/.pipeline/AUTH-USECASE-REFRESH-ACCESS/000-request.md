# AUTH-USECASE-REFRESH-ACCESS (A6b) — use case refreshAccessToken (rotação + reuse detection)

## Origem

Fase A, ticket A6b. Consome os primitivos de A6a (`AUTH-SESSION-REFRESH-PRIMITIVES`, closed-green):
`RefreshTokenMinter.hash` + `RefreshTokenRepository.findRevocableByUserId`. Materializa
`DD-SESSION-04` (User ativo, defense-in-depth) e `DD-SESSION-05` (reuse detection → revoga cadeia).
Espelha o wiring de `authenticate-user` (A5b).

## Arquivos

**Novo:**
- `src/modules/auth/application/use-cases/refresh-access-token.ts` — use case `refreshAccessToken`.

**Nenhum port/adapter novo** — A6a já entregou os primitivos.

## Contrato

```ts
export type RefreshAccessTokenCommand = Readonly<{ refreshToken: string }>; // refresh em claro

export type RefreshAccessTokenError =
  | 'refresh-token-not-found'
  | 'refresh-token-revoked'
  | 'refresh-token-rotated'
  | 'refresh-token-expired'
  | 'user-disabled'
  | 'session-issue-failed'
  | TokenIssuerError
  | UserRepositoryError
  | RefreshTokenRepositoryError;

export type RefreshAccessTokenOutput = Readonly<{
  accessToken: string;
  refreshToken: string; // NOVO refresh em claro (rotação)
  userId: UserId;
}>;
```

Deps (mesmas de `authenticate-user` menos `passwordHasher`): `userReader`, `tokenIssuer`,
`refreshTokenMinter`, `refreshTokenRepo`, `clock`, `refreshTtlSeconds`.

## Sequência

1. `tokenHash = minter.hash(cmd.refreshToken)`.
2. `found = repo.findByTokenHash(tokenHash)`; err→propaga; `null` → `err('refresh-token-not-found')`.
3. `now = clock.now()`; `verify(found, now)`:
   - `'refresh-token-rotated'` → **reuse detection (DD-SESSION-05):** `findRevocableByUserId(found.userId)`,
     `revoke(t, now)`+`save` para cada, depois `err('refresh-token-rotated')`.
   - `'refresh-token-revoked'` / `'refresh-token-expired'` → propaga o erro (sem revogar nada).
   - (`hash-empty`/`expiry-before-issue` não ocorrem via `state` — switch exaustivo mapeia para `session-issue-failed`, fail-closed.)
4. **Defense-in-depth (DD-SESSION-04):** `userReader.findById(found.userId)`; err→propaga;
   `null` **ou** `parseActive` falho → `revoke(found, now)`+`save` + `err('user-disabled')`.
5. Rotação (token active + user active): `newId = RefreshTokenId.generate()`;
   `save(rotate(found, newId, now))`; `secret = minter.mint()`;
   `issue({ id:newId, userId, tokenHash:secret.tokenHash, issuedAt:now, expiresAt:now+ttl })`
   (falho → `err('session-issue-failed')`); `save(newRefresh)`.
6. `issueAccessToken({ userId })`; err→propaga. Retorna `{ accessToken, refreshToken: secret.token, userId }`.

## Critérios de aceitação

- **CA1:** refresh válido (active) → output com `accessToken` verificável + `refreshToken` novo (≠ o apresentado) + `userId`.
- **CA2:** após CA1, o refresh **antigo** fica `rotated` (`replacedBy !== null`) e o **novo** está persistido e `active` (`findByTokenHash` do novo acha; `verify` ok).
- **CA3:** refresh inexistente (hash não encontrado) → `err('refresh-token-not-found')`.
- **CA4:** refresh expirado (clock após `expiresAt`) → `err('refresh-token-expired')`.
- **CA5:** refresh revogado → `err('refresh-token-revoked')`.
- **CA6 (DD-SESSION-04):** user `disabled` → `err('user-disabled')` **e** o refresh apresentado fica `revoked`.
- **CA7 (DD-SESSION-05, reuse detection):** reapresentar o refresh **antigo** (já `rotated` após CA1) →
  `err('refresh-token-rotated')` **e** todos os refresh revogáveis daquele `userId` ficam `revoked`
  (incluindo o refresh novo emitido em CA1).

## Fora de escopo

- Evento `AccessTokenRefreshed` no output — **espelha `authenticate-user`**, que não retorna evento; entra
  quando o EventBus do auth existir (nota "EventBus do auth (futuro)"). Adapter MySQL do repo (Fase P). JWKS.

## Notas

- **Skill:** `ports-and-adapters`. Sequência canônica (validar→fetch→domain→persist). `Clock.now()`, nunca `new Date()`.
- Switch exaustivo sobre `RefreshTokenError` no tratamento do `verify`.
- **Pipeline W0→W3.** W0 RED: `tests/modules/auth/application/use-cases/refresh-access-token.test.ts` (fakes + ClockFixed; popula via `registerUser`+`authenticateUser`).
