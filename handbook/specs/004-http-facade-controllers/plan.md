# Implementation Plan: Fachada OO (objeto-fachada de arrow-functions) na borda HTTP

**Branch**: `004-http-facade-controllers` | **Date**: 2026-06-15 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/004-http-facade-controllers/spec.md`

> Plano do **épico de refactor (Size L) — zero mudança de comportamento**. Consolida o `spec.md` (repriorizado
> 2026-06-15, escopo ampliado para incluir `programs`) e o **recon factual da borda HTTP** (2026-06-15). Constitution
> Check (I–IX). **Fatia em 4 tickets W0→W3** (um por módulo: auth → contracts → partners → programs). O ganho é
> legibilidade/organização da borda, não funcionalidade — handlers inline viram membros nomeados de um objeto-fachada
> criado por factory.

## Summary

Converter **todos** os handlers de rota da borda HTTP — hoje arrow-functions inline soltas dentro de
`scope.route({...})` — em **membros nomeados de um objeto-fachada** criado por uma factory
`makeXController(deps, hooks)`, lendo-se como um controller OO mas **mantendo 100% da semântica funcional**
(`Result<T,E>`, ports/adapters, sem `class`, sem `this`). Restrito a `src/modules/*/adapters/http/` + composition
root (`src/server.ts`). **Nenhuma mudança de comportamento observável** (status/body/headers/ordem de `preHandler`/
envelope de erro/contratos Zod idênticos). Rede de segurança: os **64 arquivos de teste de rota** (`fastify.inject`)
já existentes, reaproveitados como **caracterização** (sem alteração de asserção). Entrega **incremental, um módulo
por ticket**, nunca big-bang.

**Reconciliação spec ↔ código (recon 2026-06-15):** o `spec.md` original (2026-06-06) subestimava a superfície.
Números reais:

| Módulo    | Plugins | Rotas  | Arquivos de teste | Ticket                  |
| --------- | ------- | ------ | ----------------- | ----------------------- |
| auth      | 4       | 33     | 21                | `AUTH-HTTP-FACADE`      |
| contracts | 1       | 16     | 15                | `CONTRACTS-HTTP-FACADE` |
| partners  | 6       | 40     | 23                | `PARTNERS-HTTP-FACADE`  |
| programs  | 1       | 8      | 5                 | `PROGRAMS-HTTP-FACADE`  |
| **Total** | **12**  | **97** | **64**            | 4 tickets               |

## Technical Context

**Language/Version**: TypeScript 6 strict (roadmap TS 7), ESM (NodeNext) · Node 24 LTS
**Primary Dependencies**: Fastify 5 + `fastify-zod-openapi` (type-provider `FastifyPluginAsyncZodOpenApi` — ADR-0025/0027) · Zod 4. **Zero dependência nova.**
**Storage**: N/A — o refactor **não toca** `domain/`, `application/`, persistência nem schema. Nenhuma migration.
**Testing**: `node:test` + `--experimental-strip-types` · `fastify.inject` (os 64 testes de rota existentes como **caracterização**, sem alteração)
**Target Platform**: Node 24 server (borda HTTP ativa — ADR-0025/0033/0037)
**Performance Goals**: N/A — refactor comportamento-preservado; a baseline é o comportamento atual (idêntico após)
**Constraints**: (1) **zero mudança observável** — status/body/headers/ordem `preHandler`/envelope/contratos Zod idênticos; (2) **sem `class`/`this`/parameter properties/decorators** (barreira `no-restricted-syntax` + `--experimental-strip-types`); (3) fachada **dentro da closure** `async (scope) => {...}` (preserva inferência tipada de `req.query`/`params`/`body`); (4) contagem de testes **≥ baseline** por módulo
**Scale/Scope**: 4 módulos · 12 plugins · 97 handlers inline → 97 membros de fachada · ~2–3k linhas de churn · 0 migration · 0 contrato novo

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Princípio                         | Aderência   | Nota                                                                                                                                                                                                                                                      |
| --------------------------------- | ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| I. TDD W0→W3                      | ✓\*         | cada ticket abre `.pipeline/<TICKET>/`. **Adaptação para refactor**: o "W0 RED por inexistência" não se aplica (não há API nova); W0 = **baseline de caracterização verde + contagem congelada** (ver Complexity Tracking)                                |
| II. Regressão zero                | ✓           | W3 = `typecheck`+`format:check`+`lint`+`test` verdes por ticket; contagem de testes ≥ baseline                                                                                                                                                            |
| III. pnpm only                    | ✓           | zero dependência nova (Fastify/Zod/type-provider já presentes)                                                                                                                                                                                            |
| IV. Modular Monolith / isolamento | ✓           | **1 módulo por ticket** (nunca misturar BCs numa sessão — ADR-0014); só `adapters/http/` de cada BC; sem cross-BC, sem `public-api/` novo                                                                                                                 |
| V. Domínio puro                   | ✓ (reforça) | **não toca** `domain/` nem `application/`; o objeto-fachada é organização de adapter; sem `class`/`this` reforça o domínio funcional                                                                                                                      |
| VI. MySQL 8 + Drizzle migrations  | ✓           | **nenhuma** mudança de schema; `db:generate` não roda                                                                                                                                                                                                     |
| VII. HTTP-first (ADR-0037)        | ✓           | é exatamente a borda HTTP (`/api/v1`,`/api/v2`); não inaugura transporte — reorganiza handlers existentes                                                                                                                                                 |
| VIII. TS strict + ESM + idioma    | ✓ (reforça) | `type Readonly<{}>` + arrow-functions; `import type`, `.ts` nos imports, `#src/*`; código EN, docs/commits PT. O padrão é o **já recomendado** pela mensagem do `no-restricted-syntax`                                                                    |
| IX. Cânone + citação ACDG         | ✓\*\*       | decisões-chave (objeto-fachada vs `class`; fachada dentro da closure; caracterização) ancoradas em Fowler/Feathers/GoF — ver `research.md`. **Citação literal ≥4 linhas a confirmar via MCP `acdg-skills` no W2** (fallback local ausente neste checkout) |

**Resultado: PASS** — sem violações materiais. Dois pontos com asterisco são **adaptações documentadas** (não violações):
`*` o ciclo fail-first para refactor comportamento-preservado tem RED degenerado (ver Complexity Tracking);
`**` a citação literal do princípio IX será ancorada na consultoria ACDG do W2 (decisões já têm fonte canônica nomeada + rationale no `research.md`).

## Project Structure

### Documentation (this feature)

```text
specs/004-http-facade-controllers/
├── spec.md              # repriorizado 2026-06-15 (escopo + 4 US + contagens reais)
├── plan.md              # este arquivo
├── research.md          # Phase 0 — decisões (objeto-fachada, closure, caracterização, ordem)
├── data-model.md        # Phase 1 — "entidades" (objeto-fachada/factory; nenhuma de domínio)
├── quickstart.md        # Phase 1 — como validar o refactor (suíte + gate W3 + buscas)
├── contracts/           # Phase 1 — nota de preservação (zero contrato novo; caracterização)
└── tasks.md             # Phase 2 (/speckit-tasks — NÃO criado por /speckit-plan)
```

### Source Code (só borda HTTP + composition root; um módulo por ticket)

```text
src/modules/auth/adapters/http/          # TICKET 1 — AUTH-HTTP-FACADE (piloto)
├── plugin.ts            # authRoutes(deps)        → makeAuthController(deps, { requireAuth })       (10 rotas)
├── users-plugin.ts      # usersRoutes(deps)       → makeUsersController(deps, hooks)                ( 9 rotas)
├── roles-plugin.ts      # rolesRoutes(deps)       → makeRolesController(deps, hooks)                ( 8 rotas)
├── me-plugin.ts         # meRoutes(deps)          → makeMeController(deps, hooks)                   ( 6 rotas)
└── (auth-hook.ts, *-schemas.ts, composition.ts)  # INTOCADOS (hooks/schemas/wiring não são handlers)

src/modules/contracts/adapters/http/     # TICKET 2 — CONTRACTS-HTTP-FACADE
├── plugin.ts            # contractsRoutes(deps, hooks) → makeContractsController(deps, hooks)       (16 rotas)
└── (toErrorCode, writeErrorStatus, magicBytesMatch, sanitizeFilename, sendDomainError)  # helpers locais: PERMANECEM fora da fachada

src/modules/partners/adapters/http/      # TICKET 3 — PARTNERS-HTTP-FACADE
├── plugin.ts                  # collaboratorsRoutes      → makeCollaboratorsController              ( 9 rotas)
├── supplier-plugin.ts         # suppliersRoutes          → makeSuppliersController                  ( 9 rotas)
├── act-plugin.ts              # actRoutes                → makeActController                        ( 7 rotas)
├── financier-plugin.ts        # financierRoutes          → makeFinancierController                  ( 7 rotas)
├── partner-geography-plugin.ts# partnerGeographyRoutes   → makePartnerGeographyController           ( 7 rotas)
└── partners-plugin.ts         # partnersRoutes           → makePartnersController (agregador)        ( 1 rota)

src/modules/programs/adapters/http/      # TICKET 4 — PROGRAMS-HTTP-FACADE
├── plugin.ts            # programsRoutes(deps)    → makeProgramsController(deps, hooks)             ( 8 rotas)
└── (sendWriteError)                              # helper local: PERMANECE fora da fachada

src/server.ts                            # INTOCADO em assinatura: a factory dos plugins não muda (deps por parâmetro); o wiring `routes: [authHttpPlugin(deps), ...]` permanece idêntico
```

**Structure Decision**: refactor **interno a cada plugin** — a assinatura externa da factory (`xRoutes(deps, hooks?)`)
e o wiring em `server.ts` **não mudam** (validável por diff: `server.ts` fora do escopo de alteração funcional). Cada
plugin constrói seu objeto-fachada `makeXController(deps, hooks)` **dentro** do corpo `async (scope) => {...}` (onde o
`scope` decorado com o type-provider Zod vive — confirmado em `auth/plugin.ts:40-42`), e cada `scope.route({...})`
passa a referenciar `controller.<membro>` em vez de uma arrow inline. Helpers locais não-handler (`sendDomainError`,
`writeErrorStatus`, `magicBytesMatch`, `sanitizeFilename`, `sendWriteError`, mapeadores de status) **permanecem como
funções de escopo de módulo** — a fachada agrupa **só** os handlers de rota.

## Complexity Tracking

> Preencher só se o Constitution Check tem violações a justificar. Aqui há **uma adaptação** (não violação) do
> Princípio I que merece registro explícito.

| Item                                            | Por que necessário                                                                                                                                                                                                                                                                    | Alternativa mais simples rejeitada porque                                                                                                                                                                             |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **W0 sem "RED por inexistência"** (refactor)    | Refactor comportamento-preservado **não adiciona API** → não há teste que falhe "por inexistência". O W0 disciplinado vira: (1) rodar a suíte de rotas do módulo e **confirmar verde** (caracterização — Fowler/Feathers); (2) **congelar a contagem** de testes como baseline do W3. | Escrever testes "RED" novos seria **teatro de processo**: duplicaria a caracterização já existente sem cobrir comportamento novo (não há). Pular a confirmação de baseline removeria a rede de segurança do refactor. |
| **Exceção de teste acoplado a detalhe interno** | Se algum teste referenciar a **estrutura interna** do plugin (não o comportamento HTTP), o refactor pode exigir ajuste mínimo. Registrar a exceção **por ticket** (contada/justificada em SC-003).                                                                                    | Reescrever o teste do zero esconderia a regressão; manter o acoplamento impediria o refactor. A exceção explícita é auditável.                                                                                        |

## Migrations Drizzle (core-api)

- **Mudanças de schema**: [x] **nenhuma** — refactor de borda HTTP; não toca `schema.ts`.
- **Prefixo de isolamento**: N/A. **Outbox**: não. **Comando**: `db:generate` **não roda**.
- **Restrições MySQL 8 (ADR-0020)**: N/A (sem SQL).

## Contrato HTTP (borda ativa — ADR-0025/0033/0037)

**N/A — preservação total.** O épico **não cria nem altera** nenhum contrato HTTP: rotas, métodos, schemas Zod
(request/response), status codes, headers (incl. `Deprecation`/`Sunset` em `contracts`; `Content-Type`/
`Content-Disposition`/`nosniff` nos exports de `partners`), ordem de `preHandler` e envelope de erro
`{ error: { code, message, requestId } }` permanecem **byte-a-byte idênticos**. A garantia é mecânica: os 64 testes
de rota existentes (`fastify.inject`) passam **sem alteração de asserção**. Ver `contracts/README.md`.

## Fatiamento em tickets W0→W3

| Ordem | Ticket                      | Size | Escopo                                                                                                                                                                                              | Depende de               |
| ----- | --------------------------- | ---- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------ |
| 1     | **`AUTH-HTTP-FACADE`**      | M    | **Piloto.** 4 plugins (`plugin`/`users`/`roles`/`me`, 33 rotas) → `makeAuthController`/`makeUsersController`/`makeRolesController`/`makeMeController`. **Fixa o padrão canônico** que 2/3/4 copiam. | —                        |
| 2     | **`CONTRACTS-HTTP-FACADE`** | M    | 1 plugin denso (`plugin.ts`, 16 rotas: reads/writes/aditivos/documents) → `makeContractsController`. Helpers (`magicBytesMatch`/`sanitizeFilename`/`sendDomainError`/…) ficam fora.                 | 1 (referência de padrão) |
| 3     | **`PARTNERS-HTTP-FACADE`**  | M    | 6 plugins (collaborator/supplier/act/financier/geography/aggregator, 40 rotas) → 6 controllers (1:1 plugin↔controller). Maior nº de arquivos.                                                       | 1 (referência de padrão) |
| 4     | **`PROGRAMS-HTTP-FACADE`**  | S    | 1 plugin (`plugin.ts`, 8 rotas: CRUD + ciclo de vida + logo multipart) → `makeProgramsController`. Menor blast radius; **fecha 100% da borda** (SC-001/SC-002).                                     | 1 (referência de padrão) |

> **Dependência é de _referência_, não técnica:** 2/3/4 só precisam que o padrão do piloto (1) esteja validado;
> entre si são **independentes e paralelizáveis**. Cada um percorre W0→W3 com seu próprio
> `pnpm run pipeline:state init <TICKET> --size <M|S>`. **Um módulo por ticket** (ADR-0014): nunca misturar BCs.

## Estimativa de Pipeline (W0 size)

- **Épico**: **L** (4 tickets; 3×M + 1×S; ~2–3k linhas de churn mecânico sob caracterização forte).
- **Justificativa**: nenhum ticket é S "trivial 1-3 linhas", mas todos são **refactor mecânico de baixo risco**
  (rede de 64 testes). `partners` (6 plugins) é o de maior volume — se o W2 julgar o diff grande demais para revisar
  num round, pode ser **sub-fatiado por plugin** (6 sub-tickets S), sem mudar o plano.
- **Plano de testes W0 (RED→baseline-verde) — por ticket:**
  - **AUTH** (1): `tests/modules/auth/adapters/http/*.test.ts` (21 arquivos) verdes **antes** de tocar `src` → congelar contagem; refatorar os 4 plugins; suíte verde sem alteração de asserção.
  - **CONTRACTS** (2): `tests/modules/contracts/adapters/http/*.test.ts` (15 arquivos) — idem; atenção a detalhe composto (contractor/children/files) e headers `Deprecation`/`Sunset`.
  - **PARTNERS** (3): `tests/modules/partners/adapters/http/*.test.ts` (23 arquivos) — idem; agregador AND-4-reads, cap→503, headers CSV/projeção.
  - **PROGRAMS** (4): `tests/modules/programs/adapters/http/*.test.ts` (5 arquivos) — idem; rota de logo multipart (transporte/headers/status).

## Review do Plano (`/acdg-skills:clean-code-reviewer` + `ddd-architect`)

Decisões-chave registradas em [`research.md`](./research.md): **(R1)** objeto-fachada (Opção A, sem `class`) como
agrupamento de handlers; **(R2)** fachada **dentro da closure** de rotas (preserva inferência Zod); **(R3)** os testes
de rota existentes como **caracterização** (Feathers/Fowler) — o que molda o W0 do refactor; **(R4)** ordem fixa
auth→contracts→partners→programs e granularidade "1 módulo por ticket".

> **Princípio IX (citação literal ≥4 linhas):** as fontes canônicas estão **nomeadas** no `research.md` (Fowler,
> _Refactoring_ 2nd ed.; Feathers, _Working Effectively with Legacy Code_; GoF, _Design Patterns_ — Facade). A
> **extração literal** via `skills_buscar`/`skills_citar` (MCP `acdg-skills`) fica para a **consultoria do W2** de cada
> ticket (o MCP está em `.mcp.json`; o fallback local `acdg/skills_base/` não existe neste checkout). Nenhuma citação
> foi fabricada de memória (anti-padrão #12).
