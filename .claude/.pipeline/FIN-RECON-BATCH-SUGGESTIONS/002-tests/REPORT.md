# W0 — Testes RED · FIN-RECON-BATCH-SUGGESTIONS (#174)

**Agente**: tdd-strategist · **Data**: 2026-06-19 · branch `feat/fin-recon-batch-suggestions`.

Sugestões de match em lote por extrato — palpite de topo (banda/score) por transação, evita N requisições.

| Camada | Teste RED |
| --- | --- |
| Application | `use-cases/get-statement-suggestions.test.ts` (3 casos): Pending usa a top; conciliada→null; sem candidatos→null; extrato inexistente→`bank-statement-not-found` |
| Borda HTTP | `adapters/http/batch-suggestions.http.test.ts` (smoke): extrato inexistente→404; sem `reconciliation:read`→403 |
