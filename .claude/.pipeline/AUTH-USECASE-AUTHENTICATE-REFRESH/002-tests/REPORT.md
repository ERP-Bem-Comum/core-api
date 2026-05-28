# W0 — Testes RED · AUTH-USECASE-AUTHENTICATE-REFRESH (A5b)

- **Wave:** W0 (RED) · **Skill:** `tdd-strategist` · **Data:** 2026-05-27 · **Outcome:** RED.

## Artefatos
- `refresh-token-minter.contract.ts` + `*.{fake,node}.test.ts` (minter).
- `authenticate-user.test.ts` **atualizado** (deps de refresh + asserts de persistência; regressão dos 5 CAs do A5).

## Mapa CA → teste
| CA | Caso |
| :-- | :-- |
| CA1 | minter `mint()` → token/tokenHash não-vazios |
| CA2 | dois `mint()` → diferentes |
| CA3 | node: `tokenHash = sha256(token)` |
| CA4 | login → output ganha `refreshToken` (claro); access mantido |
| CA5 | refresh persistido (`findByTokenHash`) com `userId` + `expiresAt = now + ttl` |
| CA6 | regressão: invalid-credentials / user-disabled |

## Saída (RED)
```
ℹ tests 3 · pass 0 · fail 3  (minter inexistente + authenticate sem refresh)
```

## Decisões W1
- `RefreshTokenMinter.mint(): { token, tokenHash }` síncrono. node: `randomBytes(32).base64url` + `sha256`. fake: contador, `tokenHash = ${token}-hash`.
- `authenticateUser` ganha deps `refreshTokenMinter`/`refreshTokenRepo`/`clock`/`refreshTtlSeconds`; após access, mint → `RefreshToken.issue` → `save`; output += `refreshToken`. `RefreshToken.issue` falho → `err('session-issue-failed')`.
