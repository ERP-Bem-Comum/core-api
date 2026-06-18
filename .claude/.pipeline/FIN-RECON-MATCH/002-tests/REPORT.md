# W0 — RED · FIN-RECON-MATCH (#121)

**Agente:** tdd-strategist · **Resultado:** 🔴 RED · **Branch:** `017-fin-conciliacao-bancaria`

## Estratégia

Fatia M: VO+score (domínio) → use-cases read/command → adapters → borda HTTP. **Alvo do W0** (gate, puro): o
**núcleo de domínio determinístico** — VO `MatchScore` + função de score pura (T025/T029). suggestMatches/
rejectSuggestion + ports + HTTP entram no W1.

## Citação canônica (IX)

- **D-MATCH** (`specs/017-fin-conciliacao-bancaria/research.md:53`): score 0–100 é função **pura** sobre
  critérios ponderados; sugestão é read-model; rejeição persiste marcador; **R1 nunca automático**.
- **data-model.md:73**: `MatchScore` branded number, inteiro 0–100, faixas alta ≥75 / média 50–74 / baixa <50;
  erro `score-out-of-range`.

## Arquivo de teste (RED)

- `tests/modules/financial/domain/reconciliation/match-score.test.ts` — CA1 (VO range/inteiro), CA2 (faixas),
  CA3 (score ponderado).

## Prova RED

```
Error [ERR_MODULE_NOT_FOUND]: Cannot find module '.../domain/reconciliation/match-score.ts'
ℹ tests 1 · pass 0 · fail 1
```

## Contrato esperado (alvo do W1)

- `domain/reconciliation/match-score.ts`:
  - `export type MatchScore = Brand<number,'MatchScore'>`; `type MatchScoreError = 'score-out-of-range'`;
    `type MatchBand = 'alta'|'media'|'baixa'`; `type MatchCriteria = { payeeMatch, exactValue, dateD0, memoRef, supplierOpenCount }`.
  - `fromValue(raw): Result<MatchScore, MatchScoreError>` (0–100 inteiro); `band(score): MatchBand`;
    `compute(criteria): MatchScore` (pesos: alto = exactValue/payeeMatch/dateD0; médio = memoRef; baixo = supplierOpenCount).
- W1: `suggestMatches` (read-model; exclui rejeitadas + band baixa; ordena desc), `rejectSuggestion`
  (`fin_rejected_suggestions`), ports `SuggestionView`/`RejectedSuggestionRepository`, adapters, borda HTTP.

## Próxima wave

W1 (`ts-domain-modeler` p/ o VO+score; `ports-and-adapters` p/ use-cases/adapters; padrão Fastify+Zod p/ borda).
