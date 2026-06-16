# CLAUDE.md

> Este arquivo é um **stub**. O contexto canônico deste repo vive em `AGENTS.md`
> (padrão aberto, multi-ferramenta). O Claude Code carrega o conteúdo via import abaixo.

@AGENTS.md

<!-- SPECKIT START -->

Plano corrente: `specs/012-financial-list-dto/plan.md` (enriquecimento do item da listagem de Contas a Pagar — issue #47. **US1** entrega campos locais `series`/`grossValueCents`/`paymentMethod`/`contractRef` no `GET /api/v2/financial/documents` — sem migration, 1 ticket W0→W3. **US2** (fornecedor nome+CNPJ via read-model) **BLOQUEADA**: o `partners` não publica eventos de fornecedor via outbox; ver `research.md`. Decisão do clarify: read-model via outbox; pré-requisito = outbox no `partners`).
For additional context about technologies to be used, project structure,
shell commands, and other important information, read the current plan.

<!-- SPECKIT END -->
