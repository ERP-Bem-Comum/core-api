# W0 — RED (FIN-MATCH-PAIDAT)

**Skill:** tdd-strategist · **Outcome:** RED

## Testes adicionados

### Domínio — `tests/modules/financial/domain/reconciliation/match-score.test.ts`
- Helper `matchInput` ganha `paidAt: null` (default).
- **CA1** — `dateD0` casa pela data de pagamento (`paidAt`) quando presente: `paidAt` a +2d da transação (dentro de ±5d) com vencimento a meses de distância → `dateD0 = true`. Precedência: `paidAt` fora da janela → `false` mesmo com vencimento no dia (paidAt substitui o vencimento, não é OR).
- **CA2** — `paidAt = null` → fallback para o vencimento com a mesma tolerância ±5d (comportamento anterior preservado, ambos os sentidos).

### Application — `tests/modules/financial/application/use-cases/match-suggestions.use-cases.test.ts`
- Helper `candidate` ganha `paidAt: null` (default).
- **CA3** — candidato só com valor-exato (40) + `paidAt` casando (vencimento longe): antes vira banda `baixa` (filtrada, 0 sugestões); depois `40 + 20 (data via paidAt) = 60` → `media`, aparece no resultado.

## Prova do RED

`pnpm run typecheck` → **7 erros TS2353** (`'paidAt' does not exist in type ...`) em `MatchInput` e `SuggestionCandidate`. A API ainda não existe — RED legítimo por inexistência, não por asserção frouxa.

## Próximo (W1)
- `ts-domain-modeler`: `MatchInput.paidAt` + `evaluateCriteria` usa `paidAt ?? payableDueDate`.
- `drizzle-orm-expert`: `SuggestionCandidate.paidAt` + projeção `finPayables.paidAt` no adapter Drizzle + fake in-memory + `suggest-matches` passa `candidate.paidAt`.
