# W2 — REVIEW — FINANCIERS-HTTP-EDIT

> Skill: `code-reviewer` (audit read-only). **Round 1 — APPROVED.**

## Veredito: ✅ APPROVED

| Regra | Status | Evidência |
| :--- | :--- | :--- |
| Domínio puro | ✅ | `Financier.edit` sem RBAC/infra; valida campos+cnpj; preserva id+estado; Result/immutable. |
| RBAC do vital correto | ✅ | regra no use case (cnpj mudou + !canEditSensitive → 403); borda fornece boolean via `hasPermission`. |
| ADR-0006 | ✅ | `makeHasPermission` exposto via auth/public-api; partners consome só o hook (não auth/domain). |
| ADR-0024/0033/0027 | ✅ | PUT sob /api/v1; authorize('financier:write') + checagem elevada; Zod (updateFinancierBodySchema). |
| Result→HTTP | ✅ | sendWriteError; 403 sensitive-forbidden, 409 cnpj-duplicate, 404, 400, 422. |
| Reuso/sem dup | ✅ | updateFinancierBodySchema = createFinancierBodySchema; edit reusa Cnpj/immutable. |

## Achados
- Hook `hasPermission` virou obrigatório em FinanciersHttpHooks → teste do CRUD ajustado (passa o hook). Sem outros consumidores afetados.

## Observações
- `makeHasPermission` é reusável: as fatias SUPPLIERS-EDIT / COLLABORATORS-EDIT vão usá-lo (vital=cnpj/cpf).
- Read-after-write em memory não reflete (stores distintos) — por isso a regra do vital lê o writer (use case), não o reader. Correto.

## Gate
lint/typecheck/format verdes.

## Próximo passo
W3.
