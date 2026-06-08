# W3 — Quality Gate · AUTH-ROLE-LIFECYCLE-AGG

**Agente:** ts-quality-checker · **Outcome:** GREEN ✅

| Gate | Comando | Resultado |
| --- | --- | --- |
| Typecheck | `pnpm run typecheck` | ✅ sem erros |
| Format | `pnpm run format:check` | ✅ All matched files use Prettier code style |
| Lint | `eslint` (role.ts + mapper + teste) | ✅ limpo |
| Test (estático) | `pnpm test` | ✅ **2451 tests · 2433 pass · 0 fail · 18 skipped** |
| Test (integração) | `MYSQL_PORT=3307 pnpm run test:integration:auth` | ✅ **38 pass · 0 fail** — mapper `status` contra MySQL real |

## Notas de regressão zero

`role.test.ts` CA5 (`role-name-empty` → `role-name-invalid`) atualizado para o novo contrato — mudança deliberada de API (nome via `RoleName`), não supressão. Suíte + integração provam ausência de cascata.

Ticket pronto para `close`. **Foundational fecha com o ticket irmão `AUTH-ROLE-REPO-CRUD`** (T011: repo `create/update/archive/listAll` + `isInUse`).
