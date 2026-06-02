# AGENTS.md

Guia do projeto para o Antigravity CLI / Gemini CLI. Regras de camada estão escopadas em [`.agents/rules/`](./.agents/rules/) — carregam só quando o agente toca arquivos do diretório alvo (ver `paths:` em cada arquivo). Material de orquestração e referências vive em [`.agents/`](./.agents/).

---

## IMPORTANTE

- **Nunca `npm`.** Sempre `pnpm` (ADR-0012). Há hook `BeforeTool` que bloqueia. Qualquer doc/PR com `npm install`/`npm run` deve ser convertido.

---

## O que é este repositório

`core-api` — backend do ERP Bem Comum, modelado como **modular monolith**. Fase 1 entrega apenas o **módulo Contratos** (`src/modules/contracts/`). Fases futuras adicionam Financeiro e outros, sob o mesmo processo Node mas com isolamento de pasta + comunicação por eventos (handbook §06).

**Stack:** Node.js 24 LTS · TypeScript 6.0 (roadmap TS 7 — ADR-0009) · ESM (`type: "module"`, `NodeNext`) · pnpm · Drizzle ORM com `mysql2` (MySQL 8 — ADR-0020) · CLI como UX primária (nenhum servidor HTTP ainda).

**Source of truth da arquitetura:** [`handbook/`](./handbook/). Quando código e handbook discordam, **o handbook vence**.

---

## Hierarquia de regras (quando duas fontes discordam)

```
1. handbook/architecture/adr/             ← ADRs aceitos, IMUTÁVEIS, vencem tudo
2. handbook/ (domínio, infra, inquiries, reference/<tech>/)
3. Este AGENTS.md + .agents/rules/*.md    (regras transversais e por camada)
4. .agents/agents/<agent>.md              (especialistas em tecnologia)
5. .agents/skills/<skill>/SKILL.md        (como aplicar as regras)
6. .agents/skills/<skill>/references/     (docs externas, citadas, não normativas)
```

Nunca contradizer um ADR aceito — abrir novo ADR que `supersedes` o anterior, registrar em `handbook/CHANGELOG.md`.

**ADRs críticos:**

- [ADR-0002](./handbook/architecture/adr/0002-keep-nodejs-runtime.md) — Node.js como runtime único.
- [ADR-0006](./handbook/architecture/adr/0006-modular-monolith-core-api.md) — Modular monolith + ports & adapters.
- [ADR-0009](./handbook/architecture/adr/0009-node-24-typescript-6-with-7-roadmap.md) — Node 24 + TS 6, plano TS 7.
- [ADR-0010](./handbook/architecture/adr/0010-email-port-adapter-pattern.md) — Email Port/Adapter (Fase 2+).
- [ADR-0011](./handbook/architecture/adr/0011-supply-chain-hardening.md) — Supply-chain (corepack, `only-allow=pnpm`, `approve-builds`).
- [ADR-0012](./handbook/architecture/adr/0012-pnpm-package-manager.md) — `pnpm` é o package manager canônico.
- [ADR-0013](./handbook/architecture/adr/0013-mysql-database-engine.md) — MySQL 8 é o engine de produção.
- [ADR-0014](./handbook/architecture/adr/0014-mysql-database-isolation.md) — Isolamento por prefixo (`ctr_*`, `fin_*`, `outbox`).
- [ADR-0015](./handbook/architecture/adr/0015-mysql-outbox-pattern.md) — Outbox pattern para eventos cross-módulo.
- [ADR-0019](./handbook/architecture/adr/0019-document-storage-s3-with-minio-dev.md) — Document storage AWS S3 + MinIO (dev). `@aws-sdk/client-s3` é o cliente único.
- [ADR-0020](./handbook/architecture/adr/0020-mysql-only-supersedes-dual-dialect.md) — MySQL 8.4 como único dialeto. Lista normativa de features SQL permitidas/proibidas. Supersedes ADR-0018.

---

## Idioma (regra invariante)

| Camada                                                           | Idioma                                                     |
| :--------------------------------------------------------------- | :--------------------------------------------------------- |
| Código (tipos, funções, variáveis, pastas, arquivos)             | **EN**                                                     |
| Strings ao humano (mensagens da CLI, erros formatados)           | **PT** (via dicionário em `cli/formatters/`)               |
| Documentação (`.agents/`, `.pipeline/`, READMEs, handbook, ADRs) | **PT**                                                     |
| Erros internos (string literal union)                            | **EN kebab-case** — `'contract-not-active'`                |
| Eventos de domínio                                               | **EN passado** — `ContractCreated`, `AmendmentHomologated` |
| IDs de ticket                                                    | **EN** — `CTR-VO-MONEY`, `CTR-STORAGE-PORT`                |
| Commit messages                                                  | **PT** — `feat(contracts): adiciona VO Money`              |

---

## Regras invariantes — sintaxe TS

Regras por camada (domínio, application, adapters, testes, módulo contracts) estão em [`.agents/rules/`](./.agents/rules/) e carregam só quando relevante. Sintaxe global (vale pra todo `.ts`):

- **`import type { X }`** ou `import { type X }` para imports puramente de tipo (`verbatimModuleSyntax`).
- **Extensões `.ts` nos imports relativos** (`allowImportingTsExtensions`). Ex: `import { Money } from '../shared/money.ts'`.
- **Subpath imports `#src/*`** declarados em `package.json#imports`. Ex: `import { Money } from '#src/modules/contracts/domain/shared/money.ts'`.
- **`tsconfig.json` strict completo:** `strict`, `noUncheckedIndexedAccess`, `noImplicitOverride`, `noFallthroughCasesInSwitch`, `noImplicitReturns`, `exactOptionalPropertyTypes`, `useUnknownInCatchVariables`, `isolatedModules`, `verbatimModuleSyntax`.

---

## Pipeline fail-first W0→W3

**Toda mudança em código de produção** abre um ticket em `.claude/.pipeline/<TICKET-ID>/`. Bug fix trivial (1-3 linhas) ou mudança de config pode ir direto.

```
.claude/.pipeline/<TICKET-ID>/
├── 000-request.md           # escopo (humano escreve antes)
├── STATE.json               # canônico — gerenciado por `pnpm run pipeline:state` (CTR-PIPELINE-STATE-JSON)
├── STATE.md                 # gerado de STATE.json — não editar à mão
├── 002-tests/REPORT.md      # W0 — testes RED (falham por inexistência da API)
├── 003-impl/REPORT.md       # W1 — implementação mínima até GREEN
├── 004-code-review/REVIEW.md  # W2 — audit read-only (max 3 rounds)
└── 005-quality/REPORT.md    # W3 — tsc + format + tests + build
```

**Disciplina:** W0 RED antes de tocar `src/`. W1 implementa o mínimo. W2 read-only, max 3 rounds antes de escalar. W3 = `pnpm run typecheck` + `pnpm run format:check` + `pnpm test` todos verdes.

**STATE.json é canônico** a partir de `CTR-PIPELINE-STATE-JSON`. Tickets novos usam `pnpm run pipeline:state init <ticket> --size <X>` em vez de criar `STATE.md` à mão. Tickets legados (sem `STATE.json`) continuam válidos como histórico.

Tickets fechados em `.claude/.pipeline/` são histórico auditável — **não deletar**.

---

## Roteamento via `contratos-orchestrator`

[`.agents/agents/contratos-orchestrator.md`](./.agents/agents/contratos-orchestrator.md) é o **ponto de entrada único**. Identifica intenção, decide se delega para um **agente especialista** (tecnologia) ou para uma **skill** (técnica/disciplina), e orquestra as 4 waves.

### Agentes especialistas (por tecnologia em `handbook/reference/`)

Carrega **um único** agente por turno.

| Quando o tema é…                                                           | Agente                                                                         |
| :------------------------------------------------------------------------- | :----------------------------------------------------------------------------- |
| Roteamento + pipeline W0→W3                                                | [`contratos-orchestrator`](./.agents/agents/contratos-orchestrator.md)         |
| TypeScript / type system / Modules / tsconfig                              | [`typescript-language-expert`](./.agents/agents/typescript-language-expert.md) |
| Node.js runtime / `node:test` / ESM / signals / AsyncLocalStorage          | [`nodejs-runtime-expert`](./.agents/agents/nodejs-runtime-expert.md)           |
| Drizzle ORM (schema, query builder, Drizzle Kit, transações)               | [`drizzle-orm-expert`](./.agents/agents/drizzle-orm-expert.md)                 |
| MySQL puro (EXPLAIN, índice, locks, tuning, replicação)                    | [`mysql-database-expert`](./.agents/agents/mysql-database-expert.md)           |
| Driver `mysql2` (pool, `caching_sha2_password`, TLS, timeouts)             | [`mysql2-driver-expert`](./.agents/agents/mysql2-driver-expert.md)             |
| Docker / Compose / Dockerfile / BuildKit                                   | [`docker-compose-expert`](./.agents/agents/docker-compose-expert.md)           |
| pnpm / lockfile / supply-chain / corepack                                  | [`pnpm-workspace-expert`](./.agents/agents/pnpm-workspace-expert.md)           |
| Fastify (HTTP — **reservado, Fase 2+, exige ADR**)                         | [`fastify-server-expert`](./.agents/agents/fastify-server-expert.md)           |
| Nodemailer (adapter SMTP — **ativo** desde `CTR-EMAIL-ADAPTER-NODEMAILER`) | [`nodemailer-email-expert`](./.agents/agents/nodemailer-email-expert.md)       |
| Segurança backend web (Node/TS/Fastify/pnpm/Magalu)                        | [`security-backend-expert`](./.agents/agents/security-backend-expert.md)       |
| Segurança frontend web (TanStack Start/React)                              | [`security-frontend-expert`](./.agents/agents/security-frontend-expert.md)     |

### Skills (técnicas/disciplinas aplicadas)

| Atividade                                                | Skill                                                                                                                                                                                                                          |
| :------------------------------------------------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Modelar agregado/VO/evento de domínio                    | [`ts-domain-modeler`](./.agents/skills/ts-domain-modeler/SKILL.md)                                                                                                                                                             |
| Definir port (Repository, EventBus, Storage, Clock)      | [`ports-and-adapters`](./.agents/skills/ports-and-adapters/SKILL.md)                                                                                                                                                           |
| Modelar schema Drizzle (`mysqlTable`, índices, FKs)      | [`drizzle-schema-author`](./.agents/skills/drizzle-schema-author/SKILL.md)                                                                                                                                                     |
| Contratos entre módulos (`ctr_*` ↔ `fin_*` via outbox)   | [`modular-monolith`](./.agents/skills/modular-monolith/SKILL.md)                                                                                                                                                               |
| Subcomando de CLI                                        | [`application-cli-builder`](./.agents/skills/application-cli-builder/SKILL.md)                                                                                                                                                 |
| Scripts FS em Node 24 + strip-types                      | [`nodejs-fs-scripter`](./.agents/skills/nodejs-fs-scripter/SKILL.md)                                                                                                                                                           |
| Invocar processos externos (git, docker, pnpm…)          | [`nodejs-process-runner`](./.agents/skills/nodejs-process-runner/SKILL.md)                                                                                                                                                     |
| Modelagem aplicada de DB (DDL + EXPLAIN)                 | [`database-engineer`](./.agents/skills/database-engineer/SKILL.md)                                                                                                                                                             |
| Ensino conceitual / fundamentos de DB                    | [`database-tutor`](./.agents/skills/database-tutor/SKILL.md) · [`database-theorist`](./.agents/skills/database-theorist/SKILL.md)                                                                                              |
| TDD aplicado / tutor / fundamentos                       | [`tdd-strategist`](./.agents/skills/tdd-strategist/SKILL.md) · [`tdd-tutor`](./.agents/skills/tdd-tutor/SKILL.md) · [`tdd-theorist`](./.agents/skills/tdd-theorist/SKILL.md)                                                   |
| Code review / Clean Code / fundamentos                   | [`clean-code-reviewer`](./.agents/skills/clean-code-reviewer/SKILL.md) · [`clean-code-tutor`](./.agents/skills/clean-code-tutor/SKILL.md) · [`clean-code-theorist`](./.agents/skills/clean-code-theorist/SKILL.md)             |
| Engenharia de requisitos (aplicada / tutor / theorist)   | [`requirements-engineer`](./.agents/skills/requirements-engineer/SKILL.md) · [`requirements-tutor`](./.agents/skills/requirements-tutor/SKILL.md) · [`requirements-theorist`](./.agents/skills/requirements-theorist/SKILL.md) |
| Threat modeling / OWASP AI (reservado p/ Fase 2+ com IA) | [`security-reviewer`](./.agents/skills/security-reviewer/SKILL.md)                                                                                                                                                             |
| Segurança backend aplicada (Node/Fastify/pnpm/Magalu)    | [`web-security-backend`](./.agents/skills/web-security-backend/SKILL.md)                                                                                                                                                       |
| Segurança frontend aplicada (TanStack Start/React)       | [`web-security-frontend`](./.agents/skills/web-security-frontend/SKILL.md)                                                                                                                                                     |
| Executar pipeline W0→W3 de um ticket                     | [`pipeline-maestro`](./.agents/skills/pipeline-maestro/SKILL.md)                                                                                                                                                               |
| Revisão read-only (W2)                                   | [`code-reviewer`](./.agents/skills/code-reviewer/SKILL.md)                                                                                                                                                                     |
| Gate final de qualidade (W3)                             | [`ts-quality-checker`](./.agents/skills/ts-quality-checker/SKILL.md)                                                                                                                                                           |

**Regra:** um agente OU uma skill por vez. Outros viram referência via `[[link]]`. Quando a tarefa cruza tecnologias, o orquestrador escolhe o mais especializado.

---

## Comandos essenciais

```bash
# Setup
pnpm install                  # respeita pnpm-lock.yaml + corepack
pnpm install --frozen-lockfile  # CI

# Qualidade (parte do W3)
pnpm run typecheck            # tsc --noEmit
pnpm run format:check         # prettier --check .
pnpm run lint                 # eslint . (flat config, typescript-eslint strict + stylistic + type-checked)
pnpm test                     # tests/**/*.test.ts via node:test + --experimental-strip-types
pnpm run test:integration     # sobe MySQL via Docker compose --wait

# CLI da P.O.
pnpm run cli:contracts -- --help
pnpm run cli:contracts -- listar-contratos
pnpm run cli:contracts -- listar-contratos --driver mysql --connection-string 'mysql://user:pass@127.0.0.1:3306/core'

# Migrations + secrets
pnpm run db:generate          # Drizzle Kit → src/modules/contracts/adapters/persistence/migrations/mysql/
pnpm run secrets:setup        # gera ./secrets/*.txt para docker-compose

# Pipeline state (CTR-PIPELINE-STATE-JSON)
pnpm run pipeline:state init <ticket> --size S
pnpm run pipeline:state wave-start <ticket> W0 --agent tdd-strategist
pnpm run pipeline:state wave-finish <ticket> W0 --outcome RED --report 002-tests/REPORT.md
pnpm run pipeline:state wave-round <ticket> W2     # incrementa round (max 3)
pnpm run pipeline:state wave-reopen <ticket> W2    # reabre wave done+REJECTED → in-progress (round++, max 3)
pnpm run pipeline:state close <ticket>             # exige todas as 4 waves done
pnpm run pipeline:state render <ticket>            # regenera STATE.md de STATE.json

# Pipeline dashboard (CTR-PIPELINE-DASHBOARD)
pnpm run pipeline:status                    # tabela markdown de todos os tickets com STATE.json
pnpm run pipeline:status --filter open      # só open + in-progress
pnpm run pipeline:status --filter closed    # só closed-green + closed-rejected
pnpm run pipeline:status --json             # output JSON para tooling

# Pipeline metrics (CTR-PIPELINE-METRICS)
pnpm run pipeline:metrics                   # markdown com agregações
pnpm run pipeline:metrics --json            # JSON
pnpm run pipeline:metrics --write           # grava em .claude/.pipeline/_METRICS.md
```

Pre-commit hook: `.agents/hooks/pre-commit-typecheck.sh` (ativar via `git config core.hooksPath .agents/hooks`).

---

## Hooks ativos em `.agents/hooks.json`

| Evento         | Script                          | Função                                                      |
| :------------- | :------------------------------ | :---------------------------------------------------------- |
| `SessionStart` | `session-start-context.sh`      | Resumo do estado do projeto no boot.                        |
| `BeforeModel`  | `inject-ticket-context.sh`      | Injeta STATE.md do ticket ativo antes da chamada ao modelo. |
| `BeforeTool`   | `block-npm.sh`                  | Bloqueia `npm` (ADR-0012).                                  |
| `BeforeTool`   | `block-cross-project-docker.sh` | Garante isolamento do Docker.                               |
| `AfterTool`    | `prettier-write.sh`             | Formata o arquivo tocado com Prettier.                      |
| `AfterAgent`   | `subagent-stop-validate.sh`     | Valida finalização correta do contratos-orchestrator.       |
| `AfterAgent`   | `stop-typecheck.sh`             | Executa typecheck em background ao finalizar.               |

---

## Anti-padrões (não fazer)

1. **Carregar múltiplos agentes/skills simultaneamente** sem necessidade — orquestrador escolhe **um**.
2. **Duplicar regras** que já vivem no handbook ou em SKILL.md / agent.md — referencie, não copie.
3. **Pular waves** (ir direto pra W1 sem W0 RED) — quebra o fail-first.
4. **Misturar módulos** numa sessão (`ctr_*` e `fin_*` ao mesmo tempo) — ofende ADR-0014.
5. **Editar ADR aceito** — cria novo que `supersedes` o anterior.
6. **Editar código não-trivial sem ticket** em `.claude/.pipeline/<TICKET>/000-request.md`.
7. **`throw new Error(...)` no `default` de switch exhaustivo** — usar `const _: never = x` apenas.
8. **`import` sem extensão `.ts`** — `NodeNext` exige caminho completo.
9. **`import` de tipo sem `type`** — `verbatimModuleSyntax` exige `import type { X }` ou `import { type X }`.
10. **`npm` em qualquer doc, script, PR ou comentário** — sempre `pnpm` (ADR-0012).
11. **Ativar agentes reservados** (`fastify-server-expert`) sem antes abrir o ADR.
12. **Citar `.mdx`/`.md` do handbook "de memória"** — abrir o arquivo e citar literalmente.
13. **Importar de `<module>/domain/` ou `<module>/application/` de outro módulo** — usar exclusivamente `<module>/public-api/` (ADR-0006).

---

## Onde mais procurar

- **Regras por camada (path-scoped):** [`.agents/rules/`](./.agents/rules/) — domain, application, adapters, testing, módulo contracts. Carregam sob demanda.
- **Cheatsheet do Antigravity CLI:** [`.agents/runbooks/antigravity-code-cheatsheet.md`](./.agents/runbooks/antigravity-code-cheatsheet.md) (se criado).
- **Referências de tecnologia:** [`handbook/reference/<tech>/`](./handbook/reference/) — typescript, nodejs, drizzle, mysql, mysql2, docker, pnpm, fastify, nodemailer. Cada subdir tem agente especialista próprio (tabela acima).
- **Domínio formal:** [`handbook/domain_questions/contratos/`](./handbook/domain_questions/contratos/) e [`handbook/domain/`](./handbook/domain/).
