# W2 — REVIEW — FINANCIERS-HTTP-V1

> Skill: `code-reviewer` (audit read-only). **Round 1 — APPROVED.**

## Veredito: ✅ APPROVED

| Regra | Status | Evidência |
| :--- | :--- | :--- |
| ADR-0006/0014 | ✅ | FinancierReader em application/ports; drizzle reader só par_financiers, devolve read-record. |
| ADR-0026 | ✅ | reader pool nas leituras; writer pool em register/deactivate/reactivate. |
| ADR-0027 | ✅ | financier-schemas.ts; cnpj length(14) → 400; DV no domínio → 422. |
| ADR-0033 | ✅ | /api/v1/financiers; DTO espelha schema Financier legado (id UUID + legacyId). |
| Result→HTTP | ✅ | sendResult/sendWriteError; 409/404/400/422/503. |
| Reuso do domínio | ✅ | financierMatchesFilter na application; borda só mapeia. |

## Achados
- Round 1 (lint): `ReadonlyArray<T>` no teste → `readonly T[]` (`--fix`).
- Teste de lista/detalhe usa seed (read-after-write em memory não reflete — stores distintos; reflexão validada só no smoke MySQL). Correto.

## Observações
- PUT update segue como gap de domínio (`Financier.edit`), igual S-EDIT/P4-EDIT. Extras (/options,/nameOrCNPJ) e smoke E2E fora.

## Gate
lint/typecheck/format verdes.

## Próximo passo
W3.
