# W2 — REVIEW — COLLABORATORS-HTTP-LIFECYCLE (P3)

> Skill: `code-reviewer` (audit read-only). **Round 1 — APPROVED.**

## Veredito: ✅ APPROVED

## Conformidade

| Regra | Status | Evidência |
| :--- | :--- | :--- |
| ADR-0026 — writer pool | ✅ | deactivate/reactivate wirados ao `collaboratorWriterRepo`. |
| ADR-0033 — `/api/v1` | ✅ | dois endpoints (decisão do dono) sob `/api/v1/collaborators/:id/{deactivate,reactivate}`. |
| ADR-0027 — Zod | ✅ | `deactivateCollaboratorBodySchema` (enum); `:id` UUID via param schema → 400. |
| ADR-0024 — RBAC | ✅ | ambas `authorize('collaborator:write')`. |
| Result→HTTP | ✅ | reusa `sendWriteError`; 409 already-*, 404 not-found, 400 invalid-id, 422 invariante. |
| Reuso do domínio | ✅ | handlers chamam use cases; transições no agregado. |

## Observações não-bloqueantes

1. `LEGACY_MIGRATION` excluído do enum HTTP (marcador de ETL) — decisão correta de fronteira.
2. `reactivate` sem body — `params`-only schema; ok.
3. Gotcha de teste documentado: `body: unknown` quebra o overload de `app.inject` (corrigido para objeto).

## Gate (audit log)

```
$ pnpm run lint      → eslint .   (zero)
$ pnpm run typecheck → tsc --noEmit (zero)
$ pnpm run format:check → clean
```

## Próximo passo

W3 (QUALITY) — gate final encadeado.
