# CLAUDE.md

> Este arquivo é um **stub**. O contexto canônico deste repo vive em `AGENTS.md`
> (padrão aberto, multi-ferramenta). O Claude Code carrega o conteúdo via import abaixo.

@AGENTS.md

<!-- SPECKIT START -->

Plano corrente: `specs/010-fin-listagem-timeline/plan.md` (módulo `financial` — fatia 2: Listagem real `GET /api/v2/financial/documents` (filtros + paginação) + Trilha por-campo / Time Travel materializada (`fin_document_timeline` + `fin_timeline_field_changes`, mesma tx do agregado, diff por função pura) + optimistic lock enforçado (409) + remoção de permissões inertes; ver `research.md`, `data-model.md`, `contracts/financial-http.md`, `adr/0001-0004`). Fatia 1 (`specs/009-fin-documentos-titulos/`) já em `dev`.
For additional context about technologies to be used, project structure,
shell commands, and other important information, read the current plan.

<!-- SPECKIT END -->
