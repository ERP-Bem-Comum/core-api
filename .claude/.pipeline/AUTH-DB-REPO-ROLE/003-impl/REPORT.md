# W1 (GREEN) — AUTH-DB-REPO-ROLE — em duas mãos

## W1a — DBA (`mysql-database-expert`)
Blueprint de queries em `001-query-blueprint.md`. Novo vs P1: **upsert `auth_permission` por name com
ignore-then-reselect** (corrida → reselect, não propaga erro = idempotência); `list` N+1-free via Map.

## W1b — Implementador (`drizzle-orm-expert`)

| Arquivo | Conteúdo |
| :-- | :-- |
| `adapters/persistence/mappers/role.mapper.ts` | `roleFromRows` (Role.create + Permission.parse, tagged errors) + `roleToInsert(role, now)` (description null) |
| `adapters/persistence/repos/role-repository.drizzle.ts` | `createDrizzleRoleStore(handle, clock)`: save (3 fases) + findById (2 queries) + list (Map, sem N+1) |

`save`: SELECT-FOR-UPDATE upsert `auth_role` → `resolvePermissionId` serial (ignore-then-reselect via
`isPermissionNameDupEntry`) → replace `auth_role_permission` (skip vazio). Sem `ON DUPLICATE KEY` (ADR-0020).

## Verificação (sem Docker — CA5/CA6 no W3)

```
InMemory CA1-4:        4/4
suíte auth completa:   162/162 · fail 0
tsc / eslint / prettier: limpos
pnpm test global:      1404 pass · 0 fail · 16 skipped (gated)
```

## Handoff W2
- `code-reviewer`: auditar `resolvePermissionId` (ignore-then-reselect), `list` (agrupamento Map sem N+1),
  mapper (Result na borda), isolamento `auth_*`. Comportamento real (CA5/CA6) → W3 integração.
