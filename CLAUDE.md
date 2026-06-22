# CLAUDE.md

> Este arquivo é um **stub**. O contexto canônico deste repo vive em `AGENTS.md`
> (padrão aberto, multi-ferramenta). O Claude Code carrega o conteúdo via import abaixo.

@AGENTS.md

<!-- SPECKIT START -->

Plano corrente: `specs/022-contracts-list-authorize/plan.md` (aplicar `authorize(contract:read)` na listagem `GET /api/v2/contracts` / issue #202, P2, achado de segurança). Hoje a rota tem só `requireAuth` (`contracts/adapters/http/plugin.ts:178-180`) — qualquer autenticado lista contratos sem `contract:read`, enquanto detalhe/histórico/exportação (`:250`/`:351`/`:224`) já exigem. **Diferente do #200**: `contract:read` já está no catálogo — não há gap de catálogo, só guard ausente na rota. **Mudança mínima**: 1 preHandler → `[requireAuth, authorize(CONTRACT_PERMISSION.read)]`. Único BC (contracts); `authorize` já vem da public-api do auth (ADR-0006). Sem migration/evento/rota nova. Clarify pulado (zero ambiguidade — paridade com as rotas-irmãs). **W0 RED**: novo `contracts-list-authorize.routes.test.ts` com `authorize` REAL (`buildAuthHttpDeps`+seed, padrão de `contracts-export-csv.routes.test.ts`) — usuário sem `contract:read` → 403 (hoje 200=RED); com → 200; sem token → 401. Tamanho **S**, ticket `CTR-LIST-AUTHORIZE`. Princípio IX: `research.md` (OWASP least-privilege + Fowler self-testing). (#200 entregue em PR #212, branch 021.)
For additional context about technologies to be used, project structure,
shell commands, and other important information, read the current plan.

<!-- SPECKIT END -->
