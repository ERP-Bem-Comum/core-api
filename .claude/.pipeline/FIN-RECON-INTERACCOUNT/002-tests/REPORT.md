# W0 — FIN-RECON-INTERACCOUNT (#143)

**Resultado:** RED ✅ (falha por inexistência da API).

W0 iniciado pelo `contratos-orchestrator` (tdd-strategist); o sub-agente caiu por **API Overloaded** logo após escrever o teste de domínio. O orquestrador-pai assumiu (API instável).

- `tests/modules/financial/domain/reconciliation/manual-entry-realloc.test.ts` — CA1–CA5 + `isCapitalReallocation` (CA4) + back-compat. RED por: `destinationAccountRef`/`productLabel` inexistentes no `ManualEntry`/input e `isCapitalReallocation` não exportado.
- `tests/modules/financial/application/use-cases/manual-entry.use-cases.test.ts` — += casos de realocação (destino válido / =origem / inexistente / Investment com productLabel).
