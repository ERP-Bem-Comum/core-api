# W3 — Quality Gate · AUTH-ROLE-SCHEMA-STATUS

**Agente:** ts-quality-checker · **Outcome:** GREEN ✅

| Gate | Comando | Resultado |
| --- | --- | --- |
| Typecheck | `pnpm run typecheck` | ✅ sem erros |
| Format | `pnpm run format:check` | ✅ All matched files use Prettier code style |
| Lint | `eslint` | ✅ limpo (após corrigir `prefer-string-starts-ends-with` no teste) |
| Test (estático) | `pnpm test` | ✅ **2441 tests · 2423 pass · 0 fail · 18 skipped** |
| Test (integração) | `MYSQL_PORT=3307 pnpm run test:integration:auth` | ✅ **38 pass · 0 fail** — migration 0006 aplica no MySQL real |

## Notas de regressão zero

- Lint acusou `prefer-string-starts-ends-with` (regex `/\.sql$/` no teste) → corrigido para `f.endsWith('.sql')`, não suprimido.
- Migration validada além do estático: integração real subiu MySQL via Docker, aplicou a 0006 e rodou `schema-hardening` + repos contra o banco.

Ticket pronto para `close`. Phase 2: falta `AUTH-ROLE-LIFECYCLE-AGG` (T005/T008/T009/T011) — consome `status`, `RoleName` e `permission-catalog`.
