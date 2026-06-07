# W3 — Gate de Qualidade — AUTH-HTTP-LIST-USERS

**Wave:** W3 · **Outcome:** GREEN · **Data:** 2026-06-07

| Comando | Resultado |
|---------|-----------|
| `pnpm run typecheck` | ✅ OK |
| `pnpm run format:check` | ✅ OK |
| `pnpm run lint` | ✅ 0 problemas |
| `pnpm test` | ✅ **2321 pass / 0 fail** · 17 skipped |

Sem regressão (+8 da rota). Gate verde.

## Pendências pré-merge (Docker)
- `pnpm run test:integration:auth` — valida migrations 0004/0005 + mapper + adapter Drizzle `UserQuery` contra MySQL real.
- Coleção Bruno `api-collections/users/list/` (T023) — `bru run` reproduzível.

**US1 (listar) entregue na borda HTTP.** Próximo: US2 (`AUTH-USECASE-GET-USER` + `AUTH-HTTP-GET-USER`).
