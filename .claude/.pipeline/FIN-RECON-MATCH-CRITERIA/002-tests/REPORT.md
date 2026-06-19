# W0 — Testes RED · FIN-RECON-MATCH-CRITERIA (#140)

**Agente**: tdd-strategist · **Data**: 2026-06-19 · branch `feat/fin-recon-match-criteria`.

Breakdown dos critérios na sugestão: além de score/banda, a lista `[{criterion, weight, result, detail}]`
para a UI renderizar os chips `ok|parcial|falha` sem heurística própria. R1 preservado (só read).

| Camada | Teste RED |
| --- | --- |
| Domínio | `domain/reconciliation/criteria-breakdown.test.ts` (3 casos): todos ok + pesos (Σ=100); booleano falho→falha; supplierOpen 0→falha/1→ok/>1→parcial + detalhe=contagem. `criteriaBreakdown` não existe → RED |
| Borda HTTP | `adapters/http/financial-match.http.test.ts` (CA6 estendido): cada sugestão traz `criteriaBreakdown` (5 itens, Σ pesos=100, result ∈ {ok,parcial,falha}) |
