# W2 — REVIEW — COLLABORATORS-HTTP-LIST (P1b)

> Skill: `code-reviewer` (audit read-only). **Round 1.**

## Veredito: ✅ APPROVED

## Escopo auditado

Novo: `adapters/http/collaborator-list-query.ts`.
Editados: `application/ports/collaborator-reader.ts`, `adapters/persistence/repos/collaborator-reader.{in-memory,drizzle}.ts`, `adapters/http/{schemas,collaborator-dto,composition,plugin}.ts`, 2 testes.

## Conformidade

| Regra | Status | Evidência |
| :--- | :--- | :--- |
| ADR-0032 — composição de leitura transitória na borda | ✅ | filtro/paginação puros em `collaborator-list-query.ts`; documentado como transitório (WHERE no repo quando crescer). |
| ADR-0033 — lista espelha `PaginatedCollaborators` legado | ✅ | item = `collaboratorDetailSchema`; `meta { itemCount,totalItems,itemsPerPage,totalPages,currentPage }`. |
| ADR-0027 — Zod na borda | ✅ | `collaboratorListQuerySchema` (arrays via `preprocess`, valores `z.enum` → 400 + tipo seguro). |
| ADR-0026/0014 — reader pool, só `par_*` | ✅ | `reader.list()` no reader pool; drizzle SELECT → records (não row cru). |
| Result→HTTP; reuso do domínio | ✅ | handler usa `sendResult` (503); `queryToFilter` reusa `collaboratorMatchesFilter` (sem duplicar regra). |
| YAGNI / sem dead code | ✅ | `collaboratorToListItem` + schemas enxutos da P0 removidos; `listCollaborators` (use case) mantido p/ P1c. |

## Achados

**Round 1 — RESOLVIDO (lint):** o teste `collaborators-list.routes.test.ts` usava `type Meta`/`type Body`
(`consistent-type-definitions`) e `ReadonlyArray<…>` (`array-type`). `eslint --fix` converteu para
`interface` e `readonly …[]`. `lint` + `tsc` + teste verdes após o fix.

## Observações não-bloqueantes

1. **Filtro/paginação em memória** na borda (varredura): aceitável p/ volume modesto (ADR-0031); débito de migrar para WHERE/paginação no repo registrado no REPORT W1.
2. `mapNomeLegado` `status`/`active`: o filtro `active` (0|1) mapeia para `statuses ['Active']|['Inactive']` — coerente com o soft-delete do domínio.

## Saída literal do gate (audit log)

```
$ pnpm run lint      → eslint .   (zero erros/warnings após --fix)
$ pnpm run typecheck → tsc --noEmit (zero erros)
```

## Próximo passo

W3 (QUALITY) — `ts-quality-checker`: gate final encadeado.
