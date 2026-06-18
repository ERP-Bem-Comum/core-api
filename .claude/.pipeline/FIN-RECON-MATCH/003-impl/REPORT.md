# W1 — GREEN · FIN-RECON-MATCH (#121)

**Skills:** ts-domain-modeler (VO+score) · ports-and-adapters · padrão Fastify+Zod · **Resultado:** 🟢 GREEN
**Branch:** `017-fin-conciliacao-bancaria`

## Fatia vertical entregue (US2 — sugestão de match + rejeição)

### Domínio (puro, D-MATCH)

- `domain/reconciliation/match-score.ts` — VO `MatchScore` (branded 0–100; `fromValue → Result<.,'score-out-of-range'>`;
  `band`: alta ≥75 / média 50–74 / baixa <50); `compute(criteria): MatchScore` (pesos: exactValue 40, payeeMatch 25,
  dateD0 20, memoRef 10, supplierOpenCount>0 → 5; Σ=100); `evaluateCriteria(input)` (comparação pura
  favorecido/valor/data/memo). **R1: score é insumo, nunca dispara conciliação.**

### Aplicação

- `use-cases/suggest-matches.ts` — read-model: `findTransaction` → `listCandidates` → exclui rejeitadas
  (`listByTransaction`) e band `baixa`; deriva `supplierOpenCount` (títulos por fornecedor na lista); ordena desc.
- `use-cases/reject-suggestion.ts` — persiste marcador (`fin_rejected_suggestions`); idempotente.
- **Ports** `suggestion-view.ts` (`listCandidates`) + `rejected-suggestion-repository.ts` (`save`/`listByTransaction`).

### Adapters

- in-memory (stores dedicados, semeáveis) e Drizzle: `SuggestionView` = JOIN `fin_payables × fin_documents ×
  fin_supplier_view` (status `Paid`); `RejectedSuggestionRepository` = INSERT idempotente (ON DUPLICATE KEY UPDATE
  sobre o UNIQUE `(transaction_id, payable_id)` — tabela criada na migration 0006/#123).

### Borda HTTP

- `GET /statement-transactions/:id/suggestions` (`reconciliation:read`) → 200 `{ suggestions: [{ payableId, score, band, criteria }] }` (band `baixa` não retorna).
- `POST /statement-transactions/:id/reject-suggestion` (`reconciliation:write`) → 200 `{ transactionId, payableId }`.
- `schemas.ts`/`dto.ts`/`error-mapping.ts` (slugs view/repo → 503)/`composition.ts`.

## Prova de verde

| Gate | Resultado |
| :--- | :--- |
| `pnpm run typecheck` | ✅ |
| `pnpm run format:check` | ✅ |
| `pnpm run lint` | ✅ |
| `pnpm test` (sem Docker) | ✅ **2813 pass / 0 fail** / 18 skipped (gated) |
| `pnpm run test:integration:financial` (Docker) | ✅ **30 pass / 0 fail** (JOIN do SuggestionView + idempotência) |

### Critérios de aceite

- **CA1–CA3** (MatchScore VO/faixas/score ponderado) — ✅ gate (W0 + W1).
- **CA4** (suggestMatches: ordena desc, exclui rejeitadas + band baixa; transação inexistente → erro) — ✅ gate.
- **CA5** (rejeição remove a dupla das sugestões seguintes) — ✅ gate.
- **CA6** (HTTP: GET suggestions 200 ordenado, POST reject 200 + some do GET, RBAC 403) — ✅ gate.
- **Integração**: SuggestionView JOIN traz título Paid com nº do documento; RejectedSuggestionRepository
  save/list/idempotência — ✅ Docker.

## Notas para W2

- **Pesos do score** (exactValue 40 / payeeMatch 25 / dateD0 20 / memoRef 10 / supplierOpen 5) são decisão de
  design (D-MATCH qualifica alto/médio/baixo; valores fixados aqui, documentados). Breakdown completo dos critérios
  na resposta é #140.
- **`supplierOpenCount`** derivado da lista de candidatos `Paid` (não query extra) — sinal de baixo peso.
- **`fin_supplier_view`** vazio sem o worker de projeção → `supplierName` null → `payeeMatch` false (degradação graciosa).

## Próxima wave

W2 (`code-reviewer`) — audit read-only, máx. 3 rounds.
