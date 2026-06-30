# W0 — Testes RED · AUTH-AGG-SESSION

- **Wave:** W0 (RED) · **Skill:** `tdd-strategist` · **Data:** 2026-05-27 · **Outcome:** RED
- **Decisões:** DD-SESSION-01..03 (`handbook/domain/auth/design-decisions.md`).

## Arquivos de teste (mirror)

- `tests/modules/auth/domain/session/refresh-token-id.test.ts` → `RefreshTokenId` (CA1-3)
- `tests/modules/auth/domain/session/refresh-token.test.ts` → `RefreshToken` (CA4-14)

## Mapa CA → teste

| CA | Caso |
| :-- | :-- |
| CA1-3 | `RefreshTokenId` generate/rehydrate/inválido (`refresh-token-id-invalid`) |
| CA4 | `issue` válido → `revokedAt=null`, `replacedBy=null` |
| CA5 | tokenHash vazio → `err('refresh-token-hash-empty')` |
| CA6 | `expiresAt <= issuedAt` → `err('refresh-token-expiry-before-issue')` |
| CA7-10 | `state(now)`: active / expired / **revoked precede expired** / rotated |
| CA11 | `revoke` → state revoked; `verify` → `refresh-token-revoked` |
| CA12 | `rotate(replacementId)` → `replacedBy` setado; state rotated; `verify` → `refresh-token-rotated` |
| CA13-14 | `verify`: ativo → ok; expirado → `refresh-token-expired` |

## Saída (RED)

```
ℹ tests 2
ℹ pass 0
ℹ fail 2
```
`ERR_MODULE_NOT_FOUND`. `src/` intocado.

## Decisões para o W1

- `state(token, now)` computado (DD-SESSION-01); precedência `revoked > rotated > expired > active` (DD-SESSION-03).
- `verify(token, now)` mapeia o estado não-ativo para o erro correspondente (gate).
- `rotate` marca `replacedBy` (≠ `revoke`/`revokedAt`). `tokenHash` opaco non-empty.
- `now`/`at: Date` injetados; `immutable` + spread.
