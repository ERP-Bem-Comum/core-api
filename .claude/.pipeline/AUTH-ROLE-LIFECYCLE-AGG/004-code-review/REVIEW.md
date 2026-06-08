# W2 — Code Review (read-only) · AUTH-ROLE-LIFECYCLE-AGG

**Agente:** code-reviewer · **Veredito:** APPROVED ✅ (round 1)

## Checklist

| Critério | Status |
| --- | --- |
| Domínio puro — sem `throw`, `Result<T,E>` | ✅ todas as operações |
| Imutabilidade (`immutable`, spread/filter) | ✅ |
| `RoleError` string-union EN kebab-case | ✅ `role-name-invalid`/`role-permission-not-in-catalog`/`role-in-use` |
| Integração de VOs (`RoleName`, `permission-catalog`) | ✅ `create`/`rename` via `RoleName`; `setPermissions` via `isInCatalog` |
| `create` vs `rehydrate` separados (criação ≠ reidratação) | ✅ rehydrate não revalida catálogo (banco é fonte) |
| `archive` puro (recebe `isInUse`, sem I/O) | ✅ agregado não toca repo |
| Mapper migrado sem quebrar persistência | ✅ integração 38/38 |
| Sem `any` (cast `as unknown as string` herdado no mapper) | ✅ pré-existente, fora do escopo |

## Observações de design

- **`create` não valida catálogo** (decisão registrada): mantém o construtor low-level permissivo (mapper/seed), empurra a regra ⊆ catálogo para `setPermissions` + use case `create-role` (US5). Defensável — evita cascata e respeita "banco é fonte" na reidratação.
- **Re-scoping T009/T011** explícito e justificado (eventos sem consumidor quebram mapper; repo é adapter). A Foundational fecha com o ticket irmão `AUTH-ROLE-REPO-CRUD`.
- `archive` idempotente por construção (não checa estado anterior — `archived → archived` é no-op natural).

Sem issues bloqueantes. Aprovado para W3.
