# W0 — Testes RED · AUTH-REPO-SESSION

- **Wave:** W0 (RED) · **Skill:** `tdd-strategist` · **Data:** 2026-05-27 · **Outcome:** RED · **Decisão:** DD-PORTS-01.

## Artefatos
- `refresh-token-repository.contract.ts` — suite `runRefreshTokenRepositoryContract`.
- `refresh-token-repository.inmemory.test.ts` — roda vs InMemory.

## Mapa CA → teste
| CA | Caso |
| :-- | :-- |
| CA1 | `save` → `findById` retorna token |
| CA2 | `findById` inexistente → `ok(null)` |
| CA3 | `save` → `findByTokenHash(hash)` retorna token (lookup do refresh flow) |
| CA4 | `findByTokenHash` inexistente → `ok(null)` |
| CA5 | upsert: `save` mesmo id após `revoke` → `revokedAt != null` |

## Saída (RED)
```
ℹ tests 1 · pass 0 · fail 1  (ERR_MODULE_NOT_FOUND)
```

## Decisões W1
- Port `RefreshTokenRepository { save, findById, findByTokenHash }`; erro `'refresh-token-repo-unavailable'`. InMemory: `Map<RefreshTokenId, RefreshToken>`, `findByTokenHash` por varredura.
