# W0 — Testes RED · AUTH-USECASE-AUTHENTICATE (A5)

- **Wave:** W0 (RED) · **Skill:** `tdd-strategist` · **Data:** 2026-05-27 · **Outcome:** RED · **Decisão:** DD-LOGIN-01.

## Artefato
- `tests/modules/auth/application/use-cases/authenticate-user.test.ts` — popula via `registerUser`; InMemory + fake hasher + fake tokenIssuer.

## Mapa CA → teste
| CA | Caso |
| :-- | :-- |
| CA1 | credencial correta → `ok({accessToken,userId})`; `verifyAccessToken` devolve o mesmo userId |
| CA2 | email não registrado → `invalid-credentials` |
| CA3 | senha errada → `invalid-credentials` |
| CA4 | email malformado → `invalid-credentials` (uniforme) |
| CA5 | disabled + senha correta → `user-disabled` |

## Saída (RED)
```
ℹ tests 1 · pass 0 · fail 1  (ERR_MODULE_NOT_FOUND)
```

## Decisões W1
- Early-return α. `Email.parse`/`Password.parse` falho → `invalid-credentials`. verify false → `invalid-credentials`. `parseActive` disabled → `user-disabled` (após verify). Sem Clock (TTL no TokenIssuer).
