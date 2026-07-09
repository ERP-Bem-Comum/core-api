# FIN-MATCH-PAIDAT — motor de match casa por data de PAGAMENTO (paidAt), não vencimento

> Hotfix do ponto 2 da issue **#272**. Size **S**. Módulo: `financial` (fin_*).

## Contexto

O #272 (motor de match tolerante a extrato real, `d1007567`) entregou o ponto 1 (payee fuzzy) e
a **janela de tolerância** de data (±5 dias), mas o critério de data ainda compara a data da transação
do extrato contra o **vencimento** (`payableDueDate` / `finPayables.dueDate`), e não contra a **data de
baixa** (`paidAt`). Em dado real o débito bancário casa com a **baixa**, não com o vencimento — que pode
estar dias/meses distante. O dado existe (`finPayables.paidAt`, `mysql.ts:259`, `mode: 'date'`), mas
**não é projetado** pela `suggestion-view` (nem no port nem no adapter Drizzle).

## Escopo (o que muda)

1. **Port** `application/ports/suggestion-view.ts` — `SuggestionCandidate` ganha `paidAt: Date | null`.
2. **Adapter Drizzle** `adapters/persistence/repos/suggestion-view.drizzle.ts` — projeta `finPayables.paidAt`.
3. **Adapter in-memory** `adapters/persistence/repos/suggestion-view.in-memory.ts` — expõe `paidAt`.
4. **Domínio** `domain/reconciliation/match-score.ts` — `MatchInput` ganha `paidAt: Date | null`;
   `evaluateCriteria` avalia o critério de data contra **`paidAt ?? payableDueDate`** (mantém tolerância ±5d).
5. **Use-case** `application/use-cases/suggest-matches.ts` — passa `candidate.paidAt` ao `evaluateCriteria`.

**Fora de escopo:** ponto 1 (#272, já feito), ponto 3 (surfacar valor-exato — decisão de design em
`match-score.ts:147-150`), ponto 4 (`fin_supplier_view` — operação em produção, #111). Nenhuma migration
(coluna já existe).

## Critérios de aceite

- **CA1** — Dado um candidato `Paid` com `paidAt` preenchido e a transação do extrato na mesma data
  (±5d) do `paidAt`, **mas** com `dueDate` fora da janela, Quando avalio os critérios, Então
  `dateD0 = true` (casa pela baixa).
- **CA2** — Dado um candidato com `paidAt = null` (defensivo), Quando avalio os critérios, Então o
  critério de data cai no fallback `dueDate` (comportamento anterior preservado).
- **CA3** — Dado transação com valor exato + data casando por `paidAt`, Quando `suggestMatches` roda,
  Então a sugestão sobe de banda `baixa` (filtrada) para `media`/`alta` e aparece no resultado.
- **CA4** — Dado o adapter Drizzle da `suggestion-view`, Quando `listCandidates` roda contra MySQL real,
  Então cada candidato traz `paidAt` da coluna `finPayables.paid_at` (validação no x99).

## Definition of Done

W0 RED → W1 GREEN → W2 APPROVED → W3 (typecheck + format:check + lint + test todos verdes). CA4 validado
no x99 (MySQL real). Fecha o ponto 2 da #272.
