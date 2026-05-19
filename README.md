# core-api — ERP Bem Comum

Modular Monolith que hospeda os módulos de negócio do ERP. **Fase 1: módulo Contracts.** Fases futuras adicionam Financeiro e outros, todos no mesmo processo Node mas com isolamento de pasta e comunicação por eventos (ADR-0014/0015).

> **Stack:** Node.js 24 LTS · TypeScript 6.0 (roadmap TS 7 — ADR-0009) · ESM (`"type": "module"`, `NodeNext`) · pnpm 10 · Drizzle ORM 0.45 + mysql2 3.22 (MySQL 8.4 — ADR-0020) · CLI como UX primária (HTTP reservado para Fase 2+).
>
> **Source of Truth:** [`./handbook/`](./handbook/) (interno ao repo — `handbook/architecture/adr/` vence tudo). Orquestrador, agentes especialistas e skills em [`./.claude/`](./.claude/README.md).
>
> **Regra invariante:** sempre `pnpm`, nunca `npm` (ADR-0012).

---

## 🏗️ Estrutura

Identificadores em **EN** (regra invariante de `CLAUDE.md §"Idioma"`). Strings ao humano em PT via dicionário em `cli/formatters/`.

```
src/
├── shared/                              Cross-módulo, puro (sem infra)
│   ├── result.ts                        Result<T, E>
│   ├── brand.ts                         Brand<T, Tag>
│   ├── id.ts                            UUID v4 helpers
│   ├── ports/                           Cross-cutting (Clock, IdGenerator)
│   ├── adapters/                        Implementações default (SystemClock, etc)
│   └── utils/
│
├── shared-kernel/                       Tipos de domínio compartilhados (CPF, CNPJ, IBGE)
│
└── modules/contracts/                   Bounded Context "Gestão de Contratos"
    ├── domain/                          PURO — Result<T,E>, branded, Readonly
    │   ├── shared/                      VOs: Money, Period, ContractId, AmendmentId,
    │   │                                DocumentId, UserRef, BucketName, StorageKey, StorageRef
    │   ├── contract/                    Agregado Contract (types, events, errors, contract.ts)
    │   └── amendment/                   Agregado Amendment (4 kinds × 2 status)
    │
    ├── application/
    │   ├── ports/                       type contracts: ContractRepository,
    │   │                                AmendmentRepository, EventBus, DocumentStorage
    │   └── use-cases/                   Factory functions (deps) => (input) => Promise<Result>
    │                                    createContract, createAmendment,
    │                                    homologateAmendment, attachSignedDocument,
    │                                    getContract, listContracts
    │
    ├── adapters/                        Implementações concretas
    │   ├── *.in-memory.ts               Para testes + CLI da P.O.
    │   └── persistence/                 Drizzle + mysql2 (MySQL 8.4)
    │       ├── schemas/mysql.ts         mysqlTable, indexes, FKs, CHECKs
    │       ├── mappers/                 Row ↔ domínio com Result<T, MapperError>
    │       ├── repos/                   *-repository.drizzle.ts
    │       ├── drivers/                 mysql-driver.ts (pool + Drizzle wiring)
    │       └── migrations/mysql/        SQL gerado por `drizzle-kit generate`
    │
    ├── cli/                             CLI para P.O. validar regras
    │   ├── main.ts                      Entrypoint
    │   ├── registry.ts                  Mapa subcomando → módulo
    │   ├── context.ts, state.ts         Estado + persistência JSON
    │   ├── drivers/{memory,mysql}.ts    Backend de persistência
    │   ├── commands/                    Um arquivo por subcomando
    │   └── formatters/                  PT-BR para humanos
    │
    └── public-api/                      Eventos e commands exportados (cross-módulo via outbox)

tests/                                   Espelho de src/ — apenas *.test.ts
  + *.contract.ts / *.suite.ts           Suítes parametrizadas reutilizáveis (não executadas direto)

handbook/                                Source of Truth — interno ao repo
├── architecture/adr/                    ADRs aceitos (IMUTÁVEIS)
├── reference/                           Docs canônicas de cada tech
│   ├── typescript/   nodejs/   drizzle/   mysql/   mysql2/
│   ├── docker/   pnpm/   fastify/   fastify-plugins/   nodemailer/
└── domain/, domain_questions/, inquiries/

.claude/
├── agents/                              10 agentes especialistas
├── skills/                              19 skills (técnicas/disciplinas)
├── .pipeline/                           Tickets W0→W3 (histórico auditável)
└── hooks/                               pre-commit-typecheck.sh
```

### Imports cross-pasta

`package.json#imports` declara **subpath imports** nativos (Node, sem transpiler):

```jsonc
"imports": {
  "#src/*": "./src/*"
}
```

Testes referenciam código de produção via `#src/*` — limpo, refatoração-safe, **com extensão `.ts`** (requisito de `NodeNext` + `allowImportingTsExtensions`):

```ts
import { Money } from '#src/modules/contracts/domain/shared/money.ts';
```

---

## 🚀 Scripts

> **Sempre `pnpm`, nunca `npm`** (ADR-0012). Versão pinada via `packageManager` + corepack.

```bash
pnpm install                           # respeita pnpm-lock.yaml
pnpm install --frozen-lockfile         # em CI

# Qualidade
pnpm run typecheck                     # tsc --noEmit
pnpm run format                        # prettier --write .
pnpm run format:check                  # prettier --check .
pnpm run lint                          # eslint . (flat config)
pnpm run lint:fix

# Testes (Node test runner nativo + --experimental-strip-types)
pnpm test                              # tests/**/*.test.ts
pnpm run test:integration              # sobe MySQL via Docker compose + --wait

# CLI da P.O. — usa o módulo Contracts diretamente
pnpm run cli:contracts -- --help
pnpm run cli:contracts -- listar-contratos
pnpm run cli:contracts -- listar-contratos \
  --driver mysql --connection-string 'mysql://user:pass@127.0.0.1:3306/core'

# Migrations (Drizzle Kit)
pnpm run db:generate                   # gera src/modules/contracts/adapters/persistence/migrations/mysql/

# Secrets locais p/ docker-compose
pnpm run secrets:setup
```

Detalhes completos: [`CLAUDE.md §Comandos`](./CLAUDE.md#comandos).

---

## 🌊 Como contribuir

Todo trabalho não-trivial passa pela **pipeline 4-wave fail-first** (W0 RED → W1 GREEN → W2 REVIEW → W3 QUALITY), com um ticket em `.claude/.pipeline/<TICKET-ID>/`.

- [`./.claude/agents/contratos-orchestrator.md`](./.claude/agents/contratos-orchestrator.md) — **ponto de entrada único**: roteia para agente especialista ou skill.
- [`CLAUDE.md`](./CLAUDE.md) — regras transversais (regra invariante, idioma, hierarquia de fontes).
- [`handbook/architecture/adr/`](./handbook/architecture/adr/) — ADRs aceitos (IMUTÁVEIS).

---

## 🤖 Painel de agentes especialistas

Cada agente é ancorado num subdir de [`handbook/reference/`](./handbook/reference/) + ADRs vinculantes, invocado pelo `contratos-orchestrator`.

| Agente                                                                                 | Tecnologia                       | Status            |
| -------------------------------------------------------------------------------------- | -------------------------------- | ----------------- |
| [`contratos-orchestrator`](./.claude/agents/contratos-orchestrator.md)                 | Roteamento + pipeline W0→W3      | ✅ ativo          |
| [`typescript-language-expert`](./.claude/agents/typescript-language-expert.md)         | TypeScript 6 / type system       | ✅ ativo          |
| [`nodejs-runtime-expert`](./.claude/agents/nodejs-runtime-expert.md)                   | Node 24 / ESM / `node:test`      | ✅ ativo          |
| [`drizzle-orm-expert`](./.claude/agents/drizzle-orm-expert.md)                         | Drizzle ORM + Drizzle Kit        | ✅ ativo          |
| [`mysql-database-expert`](./.claude/agents/mysql-database-expert.md)                   | MySQL 8.4 (SQL, índices, locks)  | ✅ ativo          |
| [`mysql2-driver-expert`](./.claude/agents/mysql2-driver-expert.md)                     | Driver `mysql2` (pool, auth, TLS) | ✅ ativo          |
| [`docker-compose-expert`](./.claude/agents/docker-compose-expert.md)                   | Docker / Compose / BuildKit      | ✅ ativo          |
| [`pnpm-workspace-expert`](./.claude/agents/pnpm-workspace-expert.md)                   | pnpm / supply-chain              | ✅ ativo          |
| [`fastify-server-expert`](./.claude/agents/fastify-server-expert.md)                   | Fastify 5 + plugins              | 🟡 reservado F2+ |
| [`nodemailer-email-expert`](./.claude/agents/nodemailer-email-expert.md)               | Nodemailer SMTP adapter          | 🟡 reservado F2+ |

Skills (19) cobrem disciplinas/técnicas aplicadas: `ts-domain-modeler`, `ports-and-adapters`, `drizzle-schema-author`, `modular-monolith`, `application-cli-builder`, `pipeline-maestro`, `code-reviewer`, `ts-quality-checker`, e as famílias `database-*`, `tdd-*`, `clean-code-*`, `nodejs-*-scripter`/`-process-runner`. Tabela completa em [`CLAUDE.md §Roteamento`](./CLAUDE.md#roteamento-via-contratos-orchestrator).

---

## 📐 Regras transversais

- **`throw` proibido** em `domain/` e `application/`. `Result<T, E>` em vez disso (`src/shared/result.ts`).
- **Sem `class`, sem `this`** — `Readonly<>` types + funções puras + factory functions com deps injetadas.
- **Branded types** para IDs e VOs (`ContractId`, `Money`, `Period`, `StorageKey`, …).
- **Discriminated unions** + `switch` exaustivo com `const _: never = x` no default.
- **Imutabilidade absoluta** — mudança por cópia (`{ ...prev, status: 'Expired' }`).
- **`import type`** + extensões `.ts` em imports relativos (NodeNext + `verbatimModuleSyntax`).
- **Erros são string literal unions** (`'contract-not-active' | 'amendment-pending' | …`), não classes.
- **MySQL 8.4 único** em dev/CI/prod via Docker compose (ADR-0020); lista normativa de features SQL permitidas/proibidas.
- **Idioma:** código em **EN**; documentação (handbook, ADRs, .claude/, .pipeline/) em **PT**; strings ao humano em **PT** via `cli/formatters/`.

Lista completa em [`CLAUDE.md §"Regras invariantes de código"`](./CLAUDE.md#regras-invariantes-de-código-não-negociáveis).

---

## 📋 Status (2026-05-19)

### ✅ Entregue (Fase 1)

- Esqueleto: `package.json`, `tsconfig.json` strict completo, ESLint flat config, Prettier.
- `src/shared/` — `Result`, `Brand`, `id`, ports cross-cutting (`Clock`, `IdGenerator`), `SystemClock`.
- **Domínio Contracts** completo: VOs (`Money`, `Period`, `ContractId`, `AmendmentId`, `DocumentId`, `UserRef`, `BucketName`, `StorageKey`, `StorageRef`), agregados `Contract` e `Amendment` (4 kinds × 2 status), eventos (`ContractCreated`, `AmendmentHomologated`, …), regras RN-06/07/12.
- **Application:** ports (`ContractRepository`, `AmendmentRepository`, `EventBus`, `DocumentStorage`) + use cases (`createContract`, `createAmendment`, `homologateAmendment`, `attachSignedDocument`, `getContract`, `listContracts`).
- **Adapters:** InMemory (testes + CLI) + Drizzle/mysql2 (schemas, mappers com `Result`, repos, driver, migration `0000_*.sql` com CHARSET/COLLATE).
- **CLI da P.O.** com flag `--driver memory|mysql`, state file JSON, formatters PT-BR.
- **`.claude/` populado:** 10 agentes especialistas (todos por tecnologia do `handbook/reference/`) + 19 skills + 20+ tickets concluídos em `.pipeline/`.
- **Docker compose:** MySQL 8.4 + MinIO com healthchecks para `pnpm test:integration`.

### 🟡 Próximas frentes

- Outbox MySQL (planejamento em `.claude/.planning/OUTBOX-MYSQL.md` — aguarda confirmações).
- Auditoria de mappers/persistência (relatório em `handbook/reviews/0002`; retomar via ticket `CTR-DB-MAPPER-NO-THROW`).
- Módulo Financeiro (Fase 2 — reutiliza todas as skills e respeita ADR-0014/0015).

### 🟦 Reservado (Fase 2+, exige ADR de adoção)

- HTTP Server (Fastify) — agente `fastify-server-expert` aguardando.
- Notificações por email (Nodemailer + `EmailPort` ADR-0010) — agente `nodemailer-email-expert` aguardando.

---

## 📚 Documentação canônica

- **Arquitetura e regras:** [`CLAUDE.md`](./CLAUDE.md)
- **Decisões formais:** [`handbook/architecture/adr/`](./handbook/architecture/adr/) (ADRs IMUTÁVEIS)
- **Domínio de negócio:** [`handbook/domain/`](./handbook/domain/) + [`handbook/domain_questions/contratos/`](./handbook/domain_questions/contratos/)
- **Tecnologias:** [`handbook/reference/<tech>/`](./handbook/reference/) — cada uma com agente especialista próprio
- **Orquestrador + agentes + skills:** [`.claude/agents/contratos-orchestrator.md`](./.claude/agents/contratos-orchestrator.md)
