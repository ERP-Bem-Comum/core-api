# CLAUDE.md

> Este arquivo é um **stub**. O contexto canônico deste repo vive em `AGENTS.md`
> (padrão aberto, multi-ferramenta). O Claude Code carrega o conteúdo via import abaixo.

@AGENTS.md

<!-- SPECKIT START -->

Plano corrente: `specs/021-reference-read-permission/plan.md` (registrar `reference:read` no catálogo central de autorização / issue #200, P1, épico #64). Corrige o **403 universal** dos endpoints de referência da 020 (`GET /api/v2/financial/{categories,cost-centers,programs}`): a permissão `reference:read` é exigida pelas rotas (`financial/public-api/permissions.ts`) mas **falta no `CATALOG_RAW`** (`auth/domain/authorization/permission-catalog.ts`) — logo não é concedível (`Role.setPermissions` valida ⊆ catálogo) e nem o admin (`PermissionCatalog.all`) a tem. **Mudança mínima de produção**: 1 string `'reference:read'` no `CATALOG_RAW` (entre `program:*` e `reconciliation:*`); admin recebe via `.all` automaticamente. Cruza 2 BCs (auth dono do catálogo + financial já declara a perm), só na superfície sancionada (ADR-0006), **sem** import cross-módulo. Decisão (clarify 2026-06-22): escopo = só catálogo + admin; nenhuma role de negócio pré-concedida (FR-008) — menor privilégio (OWASP) + YAGNI (Fowler). Sem migration/evento/rota nova. **W0 RED em 2 camadas**: integridade do catálogo (`permission-catalog.test.ts`) + integração HTTP com `authorize` **real** (novo `reference-read-rbac.real-authorize.http.test.ts`) — o fake de header mascarou o gap (FR-006/SC-004). Tamanho **S**, 1 ticket `FIN-REFERENCE-READ-CATALOG`. Princípio IX: citações em `research.md` (Fowler YAGNI + OWASP least-privilege, ≥4 linhas). (Plano anterior 019 em `specs/019-fin-recon-cedente-account/plan.md`.)
For additional context about technologies to be used, project structure,
shell commands, and other important information, read the current plan.

<!-- SPECKIT END -->
