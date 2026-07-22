# W3 — REPORT (FIN-SUPPLIER-VIEW-BACKFILL-RERUN, #111)

> Gate = **validação de integração AO VIVO** (o ticket é operacional; o "gate" é a prova contra MySQL real).

## Integração no x99 (2026-07-08) — MySQL 8.4.10 real
- **7/7 testes `MYSQL_INTEGRATION=1` GREEN**: `document-supplier-view-join` (CA1 JOIN),
  `supplier-view-store` (5/5 idempotência + guard), `projection.integration` (e2e worker).
- **Backfill job real (`run.ts`)**: `TRUNCATE` (0) → `job:financial:supplier-view-backfill` →
  `1 aplicados, 0 falhas`; `fin_supplier_view` = 1 linha (nome/CNPJ). **CA1 ao vivo.**
- **CA2 ao vivo**: 2ª execução → segue 1 linha (idempotente).
- Detalhes/evidências em `002-tests/REPORT.md` (seção "Validação ao vivo no x99").

## Gate geral do repo (sessão)
`typecheck` ✅ · `format:check` ✅ · `lint` ✅ · `test` ✅ **3493 pass / 0 fail** (18 skipped = integração gated).

## Follow-up de ops (fora do código — não bloqueia o ticket)
Disparar o mesmo backfill no ambiente de **produção** (via `docker compose --profile jobs run --rm
supplier-view-backfill` ou `pnpm run job:...`) — rastreado na issue **#111** (mantida aberta até o disparo prod).
