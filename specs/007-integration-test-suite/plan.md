# Implementation Plan: Fonte única de verdade de testes de integração HTTP

**Branch**: `007-integration-test-suite` | **Date**: 2026-06-08 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/007-integration-test-suite/spec.md`

## Summary

Consolidar a borda de teste HTTP do core-api numa fonte única de verdade, em 5 fatias: (1) gerar uma rede de segurança BDD+TDD **1:1** para cada `.bru` existente (~180) antes de mexer em qualquer coleção; (2) escrever a contract suite compartilhada do `RoleRepository` rodando nos dois adapters (in-memory + Drizzle/MySQL), fechando T023 da 006; (3) reescrever uma coleção Bruno única, por módulo, com auth/environment compartilhados, validada contra a rede; (4) um runner `pnpm` único que sobe Docker (MySQL + MinIO), faz boot do server com todos os módulos/seeds e roda toda a coleção; (5) remover o legado (3 coleções + 14 scripts). Uso de agentes especialistas é obrigatório em cada fase (decisão do dono).

## Technical Context

**Language/Version**: TypeScript 6 · Node.js 24 LTS · ESM (NodeNext)

**Primary Dependencies**: `@usebruno/cli` (Bruno, ADR-0034) · `node:test` · Docker Compose (MySQL 8.4 + MinIO) · Drizzle + `mysql2` (ADR-0020) · `@aws-sdk/client-s3` (ADR-0019) · pnpm (ADR-0012)

**Storage**: MySQL 8.4 (Docker, auth/contracts/partners) + MinIO S3-compat (Docker, storage) — apenas como alvo de teste; a feature não cria schema.

**Testing**: `node:test` (contract suite + `fastify.inject`) · Bruno `.bru` (borda HTTP real). Artefatos BDD = Gherkin `.feature`; TDD = especificação de asserções por request.

**Target Platform**: Linux/macOS dev + CI; runner exige Docker.

**Project Type**: Modular monolith backend — **infra de teste** (não toca domínio).

**Performance Goals**: N/A (gate de integração, não caminho de runtime). Meta operacional: runner completo em tempo aceitável de CI (alvo informal < 5 min).

**Constraints**: runner idempotente, com teardown garantido (sem containers/volumes órfãos); seeds idempotentes num único boot; exit ≠ 0 em qualquer falha.

**Scale/Scope**: ~180 requests `.bru` (auth 94 + contracts 19 + partners 67) → 1 coleção; 3 módulos num boot; 1 contract suite de repositório.

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Princípio                         | Status | Nota                                                                                                                                                                                                                                                                      |
| --------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| I. TDD fail-first W0→W3           | ✅     | Cada fatia vira ticket `.claude/.pipeline/`. A rede BDD/TDD (US1) **é** o RED documental; a contract suite (US2) tem W0 RED real.                                                                                                                                         |
| II. Regressão zero                | ✅     | O runner único É o gate; nada fecha vermelho.                                                                                                                                                                                                                             |
| III. pnpm único                   | ✅     | Runner é script `pnpm`; zero `npm`.                                                                                                                                                                                                                                       |
| IV. Modular monolith / isolamento | ⚠️→✅  | A feature **toca os 3 BCs**, mas só como **alvo de teste** (`.bru`, `tests/`, scripts) — não cruza dados entre schemas nem importa `domain/`/`application/` cross-módulo. Não ofende ADR-0014/0006. Justificado: infra de teste transversal é inerentemente multi-módulo. |
| V. Domínio puro                   | ✅     | Não toca `domain/`. A contract suite testa um port existente.                                                                                                                                                                                                             |
| VI. MySQL + Drizzle               | ✅     | Contract suite roda o adapter Drizzle existente; não altera schema (sem `db:generate`).                                                                                                                                                                                   |
| VII. HTTP-first (ADR-0037)        | ✅     | **Ancora a feature**: validação via Bruno + `fastify.inject` é o que ADR-0037 prescreve. Consolidá-la cumpre o princípio.                                                                                                                                                 |
| VIII. TS strict + idioma          | ✅     | Contract suite em TS strict; `.bru`/docs em PT, código EN.                                                                                                                                                                                                                |
| IX. Consultoria + citação         | ✅     | Especialistas obrigatórios (FR-012): `requirements-engineer`/BDD, `tdd-strategist`, `bruno-api-client-expert`, `drizzle-orm-expert`. Decisões-chave com citação canônica.                                                                                                 |

**Resultado**: PASS (1 nota justificada em IV — sem violação real; registrada abaixo).

## Project Structure

### Documentation (this feature)

```text
specs/007-integration-test-suite/
├── plan.md              # Este arquivo
├── research.md          # Phase 0 — decisões técnicas
├── data-model.md        # Phase 1 — modelo dos artefatos (rede de rastreabilidade)
├── quickstart.md        # Phase 1 — como rodar o runner único
├── contracts/           # Phase 1 — estrutura da coleção unificada + interface do runner
├── safety-net/          # US1 — rede BDD/TDD 1:1 (gerada na implementação)
│   ├── bdd/             #   um .feature por .bru original
│   ├── tdd/             #   um caso/asserções por .bru original
│   └── traceability.md  #   mapa 1:1 request↔bdd↔tdd↔unificado
└── tasks.md             # Phase 2 (/speckit-tasks — NÃO criado aqui)
```

### Source Code (repository root)

```text
api-collections/
└── core-api/                       # NOVA coleção unificada (única fonte de verdade)
    ├── bruno.json
    ├── environments/local.bru      # environment ÚNICO
    ├── 0-auth/                      # fluxo de login compartilhado (token de coleção)
    ├── auth/                        # ex-api-collections/auth (reescrito)
    ├── contracts/                   # ex-api-collections/contracts (reescrito)
    └── partners/                    # ex-api-collections/partners (reescrito)
    # api-collections/{auth,contracts,partners}/  → REMOVIDOS na US5

tests/modules/auth/adapters/persistence/
└── role-repository.suite.ts        # US2 — contract suite compartilhada (in-memory + Drizzle)
    # consumida por role-repository.inmemory.test.ts e role-repository.drizzle.test.ts

scripts/
└── e2e-bruno-all.sh                # US4 — runner único (Docker MySQL+MinIO + boot + bru run -r)
    # scripts/e2e-bruno-{auth,partners}.sh, e2e-*.sh, test:integration:* por módulo → REMOVIDOS na US5

package.json                        # script `test:integration:all` (runner); remove os 14 antigos (US5)
compose.yaml                        # reuso dos services mysql + minio (sem mudança de schema)
```

**Structure Decision**: coleção unificada nasce em `api-collections/core-api/` (nome do produto), com `0-auth/` provendo o login compartilhado e subpastas por módulo. A contract suite vive no mirror de testes do `auth`. O runner único é um script `scripts/e2e-bruno-all.sh` exposto como `pnpm run test:integration:all`. O legado é removido só na US5, após o verde comprovado.

## Complexity Tracking

| Violação                                     | Por que necessária                                                                                                 | Alternativa simples rejeitada porque                                                                                                                                                                                              |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Feature toca 3 BCs (auth/contracts/partners) | Um gate de integração único é, por definição, transversal — precisa exercitar a borda de todos os módulos num boot | Gates por-módulo (status atual) são exatamente a fragmentação que a feature elimina; manter isolamento por-BC aqui recriaria o problema. Mitigação: toca só `.bru`/`tests/`/scripts, nunca `domain/`/`application/` cross-módulo. |

## Migrations Drizzle (core-api)

- **Mudanças de schema**: [x] nenhuma — a feature é infra de teste; não edita `schema.ts`.
- **Prefixo de isolamento correto?**: N/A
- **Outbox**: não.
- **Comando**: nenhum `db:generate` (sem mudança de schema).
- **Restrições MySQL 8**: N/A.

## Contrato HTTP (Fase 2+)

N/A — a feature **não cria rotas**. A borda HTTP já existe (ADR-0025/0028) e é apenas o **alvo** dos testes consolidados.

## Estimativa de Pipeline (W0 size)

- **Tamanho**: [x] **L** — 5 fatias (rede BDD/TDD de ~180 itens, contract suite, reescrita da coleção, runner, remoção), múltiplos módulos.
- **Justificativa**: volume (~180 requests), transversalidade (3 BCs), e a disciplina de rede de segurança antes da reescrita. Será fatiada em **um ticket `.claude/.pipeline/` por US** (e sub-tickets por módulo na US3, se necessário).
- **Plano de testes W0 (RED)**:
  - US2 contract suite: `role-repository.suite.ts` consumida por `*.inmemory.test.ts` (RED até a suíte existir) e `*.drizzle.test.ts` (RED, opt-in MySQL).
  - US1 rede: o "RED" é documental — a ausência de um `.feature`/TDD para qualquer `.bru` reprova o gate de cobertura 1:1.
  - US3/US4: o RED é a coleção unificada não existir / o runner falhar; GREEN quando `pnpm run test:integration:all` fica verde com cobertura ≥ original.
