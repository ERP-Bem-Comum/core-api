# W1 — Implementação (GREEN) · FIN-RECON-MATCH-CRITERIA (#140)

**Data**: 2026-06-19

| Camada | Arquivo | Conteúdo |
| --- | --- | --- |
| Domínio | `domain/reconciliation/match-score.ts` | `+ criteriaBreakdown(criteria)` puro → `readonly CriterionResult[]`. Conhece os pesos (W_EXACT_VALUE=40, W_PAYEE=25, W_DATE_D0=20, W_MEMO_REF=10, W_SUPPLIER_OPEN=5). Booleano → ok\|falha; supplierOpen: 0→falha, 1→ok, >1→parcial (ambíguo), detail=contagem. Tipos `CriterionKey`/`CriterionOutcome`/`CriterionResult`. |
| Borda HTTP | `adapters/http/schemas.ts` | `matchSuggestionSchema += criteriaBreakdown: [{criterion, weight, result, detail}]` (aditivo; mantém o objeto `criteria` de flags). |
| Borda HTTP | `adapters/http/dto.ts` | `suggestionsToDto` deriva `criteriaBreakdown` via `criteriaBreakdown(s.criteria)`. |

GREEN: domínio 3/3, HTTP happy path 3/3; sem regressão. **R1/FR-011 preservado** — enriquecimento de read, nunca concilia. Labels humanos ficam com o front (i18n); o contrato expõe identificadores EN + peso + resultado.
