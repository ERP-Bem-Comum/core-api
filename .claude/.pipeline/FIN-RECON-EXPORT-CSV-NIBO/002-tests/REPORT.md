# W0 — Testes RED — FIN-RECON-EXPORT-CSV-NIBO

**Resultado:** RED provado (falha por inexistência da API). Disciplina fail-first respeitada (teste antes de `src/`).

## Testes escritos (RED → depois GREEN no W1)
1. **Serializador** `tests/.../adapters/export/nibo-csv.test.ts` (7) — entregue antes (WIP): 15 col/cabeçalho, sinal+vírgula, rótulos, transferência.
2. **Read in-module** `tests/.../persistence/repos/payable-document-view.in-memory.test.ts` (5) + `payable-document-view.drizzle-mysql.test.ts` (4, opt-in `MYSQL_INTEGRATION=1`). RED: `ERR_MODULE_NOT_FOUND` do adapter inexistente.
3. **Use-case** `tests/.../application/use-cases/export-reconciliation-nibo.test.ts` (10). RED: `ERR_MODULE_NOT_FOUND` de `export-reconciliation-nibo.ts`. Cobre caminhos A/B/C + CA5 + CA6 + Pending.
4. **Borda HTTP** `tests/.../adapters/http/reconciliation-export-nibo.http.test.ts` (2). RED: `csv-nibo` → 400 (schema só aceitava `ofx|csv`).

Prova de RED registrada nas saídas de execução (módulo/símbolo inexistente; 400 no schema).
