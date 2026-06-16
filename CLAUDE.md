# CLAUDE.md

> Este arquivo é um **stub**. O contexto canônico deste repo vive em `AGENTS.md`
> (padrão aberto, multi-ferramenta). O Claude Code carrega o conteúdo via import abaixo.

@AGENTS.md

<!-- SPECKIT START -->

Plano corrente: `specs/013-partners-supplier-outbox/plan.md` (issue #92 — pré-requisito da US2 da #47. Habilita o `partners` a **publicar eventos de fornecedor via outbox** (ADR-0015), replicando o `ctr_outbox` do `contracts` com prefixo `par_*`. Publica `SupplierRegistered`/`SupplierEdited` com payload de integração `{supplierRef,name,document,occurredAt}` montado no adapter (não toca o domínio). 2 tickets: `PAR-OUTBOX-INFRA` (schema+port+adapters+worker) e `PAR-SUPPLIER-EVENTS` (save+use cases+mapper+ADR). Produtor only — o consumer/read-model no `financial` é a US2 seguinte. Migration `par_outbox`/`par_outbox_dead_letter`).
For additional context about technologies to be used, project structure,
shell commands, and other important information, read the current plan.

<!-- SPECKIT END -->
