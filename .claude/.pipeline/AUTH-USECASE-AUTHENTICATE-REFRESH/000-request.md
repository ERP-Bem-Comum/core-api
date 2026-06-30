# AUTH-USECASE-AUTHENTICATE-REFRESH (A5b) — RefreshTokenMinter + refresh opaco no login

## Origem

Fase A, ticket A5b (completa o login híbrido — A5 emite só access). Decisão `DD-LOGIN-01` (refresh em A5b).
Amarra RefreshTokenRepository (A3) + agregado RefreshToken (D6) + Clock.

## Decisão de cripto (registrar DD-LOGIN-02)

Refresh token é **alta-entropia aleatória** → **não usa argon2** (caro/desnecessário). `RefreshTokenMinter.mint()`:
`token` = `base64url(randomBytes(32))` (claro, vai ao cliente); `tokenHash` = `sha256(token)` hex (persiste).
sha256 basta para segredo de alta entropia (≠ senha de baixa entropia, que exige argon2).

## Arquivos

**Novos:**
- `src/modules/auth/application/ports/refresh-token-minter.ts` — port `RefreshTokenMinter` (`mint() → { token, tokenHash }`).
- `src/modules/auth/adapters/crypto/refresh-token-minter.node.ts` — `makeNodeRefreshTokenMinter()` (randomBytes+sha256).
- `src/modules/auth/adapters/crypto/refresh-token-minter.fake.ts` — `makeFakeRefreshTokenMinter()` (contador determinístico).
- contract-suite + `*.{fake,node}.test.ts`.

**Modificado:**
- `src/modules/auth/application/use-cases/authenticate-user.ts` — após o access, mint refresh → `RefreshToken.issue` → `refreshTokenRepo.save`; output ganha `refreshToken` (claro). Novos deps: `refreshTokenMinter`, `refreshTokenRepo`, `clock`, `refreshTtlSeconds`.

## Critérios de aceitação

### RefreshTokenMinter (contract-suite)
- **CA1:** `mint()` → `token` e `tokenHash` não-vazios.
- **CA2:** dois `mint()` → `token`s diferentes (e `tokenHash`s diferentes).
- **CA3 (node):** `tokenHash === sha256(token)` (hex).

### authenticate com refresh (atualiza A5)
- **CA4:** login OK → output ganha `refreshToken` não-vazio (claro). Access continua emitido.
- **CA5:** o refresh é **persistido** — `refreshTokenRepo.findByTokenHash(sha256(refreshToken))` acha um `RefreshToken` do `userId`, com `expiresAt = clock.now() + refreshTtlSeconds`.
- **CA6 (regressão):** os 5 CAs do A5 seguem (credencial inválida, disabled, etc.).

## Fora de escopo

- A6 `refresh` (rotação). Evento `UserAuthenticated`. JWKS.

## Notas

- **Skill:** `ports-and-adapters`. Minter síncrono (`mint()` sem Result — randomBytes não falha). `RefreshToken.issue` falho (defensivo) → `err('session-issue-failed')`. ASCII puro.
- **Pipeline W0→W3.** Testes do minter (fake/node) + authenticate atualizado. RED.
