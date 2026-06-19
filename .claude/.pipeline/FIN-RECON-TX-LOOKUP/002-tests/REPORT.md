# W0 — Testes RED · FIN-RECON-TX-LOOKUP (#175)

**Agente**: tdd-strategist · **Data**: 2026-06-19 · branch `feat/fin-recon-id-listing`.

Lookup da conciliação ativa por transação (destrava o "Desfazer" pós-reload — Opção 2 do #175).
`reconciliationId` não está na transação → lookup reverso (`fin_reconciliations` tem índice em `transaction_id`).

| Camada | Teste RED |
| --- | --- |
| Application | `use-cases/get-transaction-reconciliation.test.ts` (3 casos): encontrada→ok; null→`reconciliation-not-found`; id inválido→erro |
| Borda HTTP | `adapters/http/statement-tx-reconciliation.http.test.ts` (smoke): sem conciliação→404; sem `reconciliation:read`→403 |
