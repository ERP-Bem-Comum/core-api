# W1 — GREEN (FIN-MATCH-PAIDAT)

**Skills/agentes:** ts-domain-modeler (domínio) + implementação inline da persistência (revisão de agentes reservada p/ W2). **Outcome:** GREEN

## Mudanças

### Domínio — `src/modules/financial/domain/reconciliation/match-score.ts`
- `MatchInput` ganha `paidAt: Date | null` (data de baixa do título).
- `evaluateCriteria`: `dateD0` agora ancora em `input.paidAt ?? input.payableDueDate` (nullish coalescing no ponto de decisão — confirmado idiomático pela skill ts-domain-modeler §3.I). Mantém `dateWithinTolerance` (±5d, UTC). Comentários atualizados (#272 ponto 2). Função pura, sem class/throw.

### Port — `src/modules/financial/application/ports/suggestion-view.ts`
- `SuggestionCandidate` ganha `paidAt: Date | null`.

### Adapter Drizzle — `src/modules/financial/adapters/persistence/repos/suggestion-view.drizzle.ts`
- Projeta `finPayables.paidAt` no `select` e no `map`. Coluna já existe (`mysql.ts:259`, `mode: 'date'` → `Date | null`); vem da tabela base do `innerJoin`, sempre presente. Sem migration.

### Adapter in-memory — inalterado
- `suggestion-view.in-memory.ts` apenas repassa `SuggestionCandidate` já montado; o novo campo flui pelos testes que semeiam candidatos.

### Use-case — `src/modules/financial/application/use-cases/suggest-matches.ts`
- Passa `candidate.paidAt` ao `evaluateCriteria`.

## Testes (GREEN)

`node --test` nos 3 arquivos de match (domínio + application + HTTP) → **16/16 pass**, incluindo:
- CA1 domínio — `dateD0` casa por `paidAt` (precedência sobre vencimento).
- CA2 domínio — `paidAt=null` → fallback vencimento.
- CA3 application — valor-exato + `paidAt` sobe de `baixa` (filtrada) para `media` (score 60).
- Sem regressão: payee fuzzy e tolerância ±5d contra vencimento seguem verdes.

`pnpm run typecheck` → limpo (inclui o teste de integração MySQL, ainda não executado contra o banco).

## CA4 (pendente x99)
`match-suggestion.drizzle-mysql.test.ts` reforçado: semeia `paidAt` no payable Paid e assevera `found.paidAt instanceof Date` (projeção da coluna `paid_at`). Roda atrás de `MYSQL_INTEGRATION=1` — validar no x99.

## Próximo (W2)
Revisão adversarial: `code-reviewer` + `drizzle-orm-expert` (projeção/JOIN) + `security-backend-expert` (read-model, superfície de exposição).
