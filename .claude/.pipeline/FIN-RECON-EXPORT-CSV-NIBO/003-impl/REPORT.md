# W1 — Implementação (GREEN) — FIN-RECON-EXPORT-CSV-NIBO

**Resultado:** GREEN. Mínimo necessário, por especialista por camada.

## Entregas
1. **Read in-module** (`drizzle-orm-expert`): port `PayableDocumentView.findByPayableIds` + adapter drizzle (INNER JOIN `fin_payables × fin_documents`, `inArray`, ids-vazio→ok([]), try/catch→Result) + in-memory (array | thunk lazy). Precedente `suggestion-view`/`payable-reconciliation-view`.
2. **Port de serialização** `NiboExporter` (application) — DTO `NiboExportRow` movido p/ application; `nibo-csv.ts` re-exporta + expõe `niboExporter`. Resolve isolamento ADR-0006 (application não importa adapters).
3. **Use-case** `export-reconciliation-nibo.ts` (9 deps via ports existentes + read novo): enriquecimento Reconciliation → doc → nomes (categoria/centro/favorecido/conta) → `NiboExportRow[]` → `niboExporter`. Caminhos A (lançamento N:1) / B (#141) / C (#143). Sinal por `movement`; `competencia` YYYY-MM → Date; degradação CA5.
4. **Composição** (`drizzle-orm-expert`): expõe `supplierViewStore` + `payableDocView` nos `Pools` (memory derivado de `documentStore`+`payableStore`, filtrando Draft, via `Competencia.toString`; mysql via adapter drizzle) + compõe `exportReconciliationNibo`.
5. **Borda HTTP** (`fastify-server-expert` + `zod-expert` review): schema `z.enum(['ofx','csv','csv-nibo'])` (+`.meta` description); handler despacha `csv-nibo → exportReconciliationNibo` (`text/csv; charset=utf-8`); `error-mapping` completo (10/10 erros).

Typecheck/format/lint/test verdes ao fim do W1.
