# CLAUDE.md

> Este arquivo é um **stub**. O contexto canônico deste repo vive em `AGENTS.md`
> (padrão aberto, multi-ferramenta). O Claude Code carrega o conteúdo via import abaixo.

@AGENTS.md

<!-- SPECKIT START -->

Plano corrente: `specs/014-financial-supplier-readmodel/plan.md` (issue #47 US2 — desbloqueada pela 013/#92 já mergeada). O `financial` resolve nome+CNPJ do fornecedor no grid de Contas a Pagar (`GET /api/v2/financial/documents`) a partir de uma **cópia local denormalizada** `fin_supplier_view`, mantida por eventos `SupplierRegistered`/`SupplierEdited` consumidos do `par_outbox` (ADR-0043) — sem chamada cross-módulo síncrona em runtime. Topologia: **worker dedicado em composition root** (`src/workers/supplier-view-projection/`) que lê o `par_outbox` via public-api do `partners` e aplica no `financial` via public-api (2 pools; nenhum módulo importa o outro — ADR-0006/0014/0041). Idempotência por upsert com guard de `occurred_at`. Inclui **backfill one-shot** (`src/jobs/financial/...`) dos fornecedores legados. 7 tickets (schema→apply→partners-surface→worker→list-dto→backfill→ADR-0045). Consumidor only — o `partners` não é alterado, só lido.
For additional context about technologies to be used, project structure,
shell commands, and other important information, read the current plan.

<!-- SPECKIT END -->
