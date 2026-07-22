# W1 — REPORT (FIN-SUPPLIER-VIEW-BACKFILL-RERUN, #111)

> **Sem código de produção novo.** Ticket **operacional** (não de implementação).

A máquina completa já existia (US2 #47): backfill (`src/jobs/financial/supplier-view-backfill/`),
worker de projeção (`src/workers/supplier-view-projection/`), reader (`document-repository.drizzle.ts`
`leftJoin`), schema (`fin_supplier_view`) e testes. Nada foi implementado em `src/` — fazê-lo violaria
YAGNI (ver W0 `002-tests/REPORT.md`).

Entregável desta fase = **diagnóstico** (o defeito é operacional: backfill não disparado no ambiente) +
**runbook** `handbook/runbooks/supplier-view-backfill.md`. CA3 (quarentena→null): implícito e correto,
**não** implementado (YAGNI).
