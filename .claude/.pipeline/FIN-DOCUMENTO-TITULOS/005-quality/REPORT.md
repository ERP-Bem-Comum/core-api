# W3 — Gate Final de Qualidade (FIN-DOCUMENTO-TITULOS)

**Wave:** W3 · **Status:** 🟢 GREEN · **Skill:** `ts-quality-checker` · **Data:** 2026-06-15T21:55Z

> Fatia 1 do Módulo Financeiro: Gestão de Documentos (Fato Gerador) + geração de Títulos Pai/Filhos, máquina de estados
> `Draft→Open→Approved` (+ undo/cancel), trilha por-campo (domínio), persistência `fin_*` (Drizzle/MySQL 8.4), borda HTTP
> `/api/v2/financial` (Fastify+Zod+RBAC), plugada no `src/server.ts`.

## Gate executado (worktree `feat/fin-module`)

```
pnpm run typecheck                  → ✅ OK (tsc --noEmit, projeto todo)
pnpm run format:check               → ✅ OK (prettier — All matched files use Prettier code style)
pnpm run lint                       → ✅ OK (eslint flat config, strict + stylistic + type-checked)
pnpm test                           → ✅ 2439 pass · 0 fail · 17 skipped
pnpm run test:integration:financial → ✅ 4 pass · 0 fail (Drizzle + MySQL 8.4 real via Docker Compose --wait)
```

Os 17 skipped são testes de integração de OUTROS módulos gateados por `*_INTEGRATION=1` (comportamento pré-existente,
sem alteração). Nenhuma regressão introduzida.

## Cobertura do módulo financial

| Camada | Testes | Notas |
| --- | --- | --- |
| Domínio (`document`, `payable`, `shared`) | unit | cálculo do líquido, geração de filhos por tipo, máquina de estados, herança de aprovação, imutabilidade, hard delete |
| Application (use cases + outbox) | unit | orquestração validar→fetch→domain→persist→publish; outbox in-memory |
| Persistência (Drizzle) | integração (4) | round-trip Open+payables, not-found, delete, Draft sem payables — contra MySQL real |
| Borda HTTP (`fastify.inject`) | 16 | CA1–CA16: criação NFS-e/draft, ajuste, aprovação/undo, cancelamento, GET, RBAC 401/403, 422 de regra, **CA16 overflow guard (security F1)** |

## Conformidade com ADRs

- **ADR-0006** (modular monolith + ports/adapters): fronteira respeitada — `public-api/http.ts` separado de `index.ts`; cross-módulo só via public-api. ✅
- **ADR-0014** (isolamento `fin_*`): schema isolado, journal `__drizzle_migrations_financial`. ✅
- **ADR-0020** (MySQL 8.4 único): sem JSON/ENUM nativo; `varchar`+CHECK, `bigint` cents, UUID `varchar(36) utf8mb4_bin`. ✅
- **ADR-0027** (Zod contract-first na borda): validação na borda; bounds de segurança em `centsStringSchema`. ✅
- **ADR-0037** (HTTP-first): borda `/api/v2/financial` é a UX; plugada no `server.ts`. ✅

## Wiring na app real

`financialHttpPlugin` registrado em `src/server.ts` como plugin direto (greenfield V2 → `/api/v2/financial`), ao lado de
`authHttpPlugin`/`contractsHttpPlugin`. Driver via env (`FINANCIAL_DRIVER=mysql` + `FINANCIAL_DATABASE_URL`; default
in-memory). `financialDeps.shutdown()` incluído no graceful shutdown. RBAC compartilha `requireAuth` + `authDeps.authorize`.

## Resultado do ciclo W0→W3

| Wave | Outcome | Rounds |
| --- | --- | --- |
| W0 (tdd-strategist) | RED | 1 |
| W1 (ts-domain-modeler + drizzle-orm-expert + fastify-server-expert) | GREEN | 1 |
| W2 (code-reviewer + security-backend-expert) | APPROVED | 2 |
| W3 (ts-quality-checker) | GREEN | 1 |

## Follow-up registrado (decisões de produto — não-bloqueantes)

Ver `004-code-review/REVIEW.md` e `SECURITY-REVIEW.md`: optimistic lock (`version` inerte), permissões `payable:read`/
`payable:undo-approval` declaradas e não usadas, `GET /documents` stub (listagem real na Fatia 2). Encaminhar ao P.O.
antes do handoff de frontend.
