# W1 — Implementação GREEN · AUTH-USECASE-AUTHENTICATE-REFRESH (A5b)

- **Wave:** W1 (GREEN) · **Skill:** `ports-and-adapters` · **Data:** 2026-05-27 · **Outcome:** GREEN (minter 5/5 + authenticate 6/6 · typecheck + lint + format limpos)

## Arquivos
**Novos:** `application/ports/refresh-token-minter.ts`; `adapters/crypto/refresh-token-minter.{node,fake}.ts`.
**Modificado:** `application/use-cases/authenticate-user.ts` — emite + persiste o refresh opaco.

## Aderência (DD-LOGIN-01 / DD-LOGIN-02)
- `RefreshTokenMinter.mint()` síncrono → `{ token, tokenHash }`. node: `base64url(randomBytes(32))` + `sha256` (não argon2 — alta entropia). fake: contador, `tokenHash = ${token}-hash`.
- `authenticate`: após o access JWT, mint → `RefreshToken.issue(id, userId, tokenHash, now, now+ttl)` → `refreshTokenRepo.save`. Output: `{ accessToken, refreshToken (claro), userId }`. `issue` falho (defensivo) → `'session-issue-failed'`.
- Login híbrido completo (access curto + refresh stateful, ADR-0024).

## Testes
```
minter: 5/5 · authenticate: 6/6
```
Suíte completa: 1370 · pass 1354 · fail 0 · skip 16. CA5 prova o refresh persistido com `expiresAt = now + ttl`.

## Próxima wave
W2.
