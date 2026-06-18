# FIN-RECON-MATCH — escopo

**GitHub:** #121 (sub-issue da feature #60) · **Branch:** `017-fin-conciliacao-bancaria` · **Size:** M

> Sugestão de match por **score determinístico** (read-model) + **rejeição** de sugestão. **R1: nunca
> concilia automaticamente** — o score é insumo de decisão, não gatilho. Decisão D-MATCH (`research.md:53`).

## Em escopo (fatia vertical)

1. **VO `MatchScore`** (`domain/reconciliation/match-score.ts`) — alvo do W0 (T025/T029):
   - branded `number`, inteiro **0–100**; smart constructor `fromValue → Result<MatchScore,'score-out-of-range'>`.
   - `band(score): 'alta'|'media'|'baixa'` — faixas **alta ≥75 / média 50–74 / baixa <50** (data-model.md:73).
2. **Função de score pura** `compute(criteria): MatchScore` — critérios ponderados (FR-011):
   `{ payeeMatch, exactValue, dateD0 }` = alto; `memoRef` = médio; `supplierOpenCount` = baixo.
3. **Use-case** `suggestMatches(deps)(transactionId)` — read-model: computa sugestões dos títulos `Paid`
   candidatos para uma transação `Pending`, exclui rejeitadas (`fin_rejected_suggestions`) e **band `baixa` (<50)**;
   ordena por score desc. Nunca concilia (R1).
4. **Use-case** `rejectSuggestion(deps)(input)` — persiste marcador em `fin_rejected_suggestions` (idempotente via UNIQUE).
5. **Ports** `SuggestionView` (candidatos + sinais de critério), `RejectedSuggestionRepository` (`save`/`isRejected`/`listByTransaction`); reuso de `PayableReconciliationView`/`BankStatementRepository.findTransaction`.
6. **Adapters** in-memory + Drizzle (a tabela `fin_rejected_suggestions` já existe — migration 0006/#123).
7. **Borda HTTP** `GET /api/v2/financial/statement-transactions/:id/suggestions` (`reconciliation:read`),
   `POST /…/:id/reject-suggestion` (`reconciliation:write`) + Zod + dto + error-mapping.

## Fora de escopo

Conciliar/desfazer (#123 ✅). Critérios avançados / breakdown completo na resposta (#140). Read-model de extrato
com filtros (#139). Conciliação parcial avançada (#141).

## Critérios de aceite

- **CA1 (MatchScore VO)**: `fromValue(0..100)` → ok; `<0`/`>100`/não-inteiro → `err('score-out-of-range')`.
- **CA2 (faixas)**: `band(75)='alta'`; `band(74)='media'`; `band(50)='media'`; `band(49)='baixa'`.
- **CA3 (score ponderado)**: `exactValue+payeeMatch+dateD0` → score `alta` (≥75); só `exactValue` → `baixa`;
  todos os critérios → 100; nenhum → 0.
- **CA4 (suggestMatches)**: transação `Pending` + títulos `Paid` candidatos → sugestões com score ≥50,
  ordenadas desc, **sem** as rejeitadas e **sem** band `baixa`; nenhum efeito colateral (read).
- **CA5 (rejeição)**: `rejectSuggestion` persiste o marcador; `suggestMatches` seguinte **não** retorna a dupla.
- **CA6 (HTTP)**: `GET …/suggestions` → 200 `{ suggestions: [{ payableId, score, band, criteria }] }`;
  `POST …/reject-suggestion` → 200/201; RBAC `reconciliation:read`/`:write`. (W1)

## Definition of Done

W0 RED (VO + score, no gate) → W1 GREEN (use-cases + ports + adapters + HTTP) → W2 → W3 (gate sem Docker) +
`test:integration:financial` (Docker) verde antes do merge. Idioma EN (C1). Tasks: T025, T027, T029, T037, T038.
