# W2 — REVIEW — SUPPLIERS-HTTP-EDIT

> Skill: `code-reviewer` (audit read-only). **Round 1 — APPROVED.**

## Veredito: ✅ APPROVED

| Regra | Status | Evidência |
| :--- | :--- | :--- |
| Domínio puro | ✅ | `Supplier.edit` revalida (email/cnpj/categoria/payment-target) sem infra; preserva id+estado. |
| RBAC do vital | ✅ | regra no use case (cnpj mudou + !canEditSensitive → 403); payment-target não-vital (write). |
| ADR-0006/0024/0027/0033 | ✅ | reusa `makeHasPermission` (auth public-api); PUT /api/v1; Zod (updateSupplierBodySchema). |
| Result→HTTP | ✅ | sendWriteError; 403 sensitive-forbidden, 409 cnpj-duplicate, 404, 400, 422 (incl. payment-target-required). |
| Consistência | ✅ | espelha FINANCIERS-HTTP-EDIT 1:1 (mesmo padrão de erro/rotas). |

## Achados
- Hook `hasPermission` obrigatório em SuppliersHttpHooks → 3 testes de supplier ajustados (passam o hook).

## Gate
lint/typecheck/format verdes.

## Próximo passo
W3.
