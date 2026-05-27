# W0 — Testes RED · AUTH-ADAPTER-JWT-ISSUER (X2)

- **Wave:** W0 (RED) · **Skill:** `tdd-strategist` · **Data:** 2026-05-27 · **Outcome:** RED · **Decisão:** DD-TOKEN-01.

## Artefatos
- `token-issuer.contract.ts` — suite comum (CA1-3).
- `token-issuer.fake.test.ts` (vs fake) + `token-issuer.es256.test.ts` (vs ES256 real + CA4-5).

## Mapa CA → teste
| CA | Caso |
| :-- | :-- |
| CA1 | `issueAccessToken` → `ok(string)` não-vazia |
| CA2 | `verify(token)` → `ok({userId})` round-trip |
| CA3 | `verify('garbage')` → `err` |
| CA4 | ES256: token com 3 segmentos (JWT) |
| CA5 | ES256: token de chave A **não** verifica com chave B (sem forja) |

## Saída (RED)
```
ℹ tests 2 · pass 0 · fail 2  (ERR_MODULE_NOT_FOUND)
```

## Decisões W1
- Fake: round-trip base64url do `userId` (sem assinatura). Es256: `jose` `SignJWT`/`jwtVerify`, `alg: 'ES256'` fixo, `iss` validado, chaves injetadas (`CryptoKey`). `try/catch → Result`; mapear `ERR_JWT_EXPIRED` → `token-expired`, demais → `token-invalid`.
