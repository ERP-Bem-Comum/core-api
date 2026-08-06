# Research — Fonte única de verdade de testes de integração HTTP

Phase 0 do plano. Cada decisão segue o formato Decisão / Rationale / Alternativas. As decisões-chave devem ser **revalidadas com os agentes especialistas** na implementação (FR-012): `bruno-api-client-expert`, `test-pyramid-engineer`/`tdd-strategist`, `drizzle-orm-expert`, `requirements-engineer`.

## D1 — Estrutura da coleção unificada

**Decisão**: uma única coleção Bruno em `api-collections/core-api/`, com `0-auth/` (prefixo `0` → roda primeiro no `bru run -r`) provendo o login compartilhado, e subpastas por módulo (`auth/`, `contracts/`, `partners/`). Um único `bruno.json` e um único `environments/local.bru`.

**Rationale**: o `bru run . -r` executa pastas em ordem alfabética; o prefixo `0-` garante que a autenticação rode antes de tudo, setando vars de coleção (`adminToken`, etc.) reaproveitadas por todos os módulos. Isso elimina os 3 logins duplicados (hoje cada coleção tem sua pasta `auth`/login). Já validado na coleção `auth` atual (run recursivo único, token persiste entre pastas — lição do `e2e-bruno-auth.sh`).

**Alternativas**: (a) manter 3 coleções e um runner que as encadeia — rejeitada: o token não cruza processos `bru run` separados (bug do 401 já visto); (b) login por módulo — rejeitada: é a duplicação que a feature elimina.

## D2 — Formato da rede de segurança BDD/TDD (US1)

**Decisão**: para cada `.bru` original, dois artefatos em `specs/007-integration-test-suite/safety-net/`:

- **BDD** `bdd/<modulo>/<request>.feature` — Gherkin (`Funcionalidade`/`Cenário`/`Dado-Quando-Então`) descrevendo o comportamento.
- **TDD** `tdd/<modulo>/<request>.md` — método+rota, pré-condições/seed, e a lista literal de asserções esperadas (status, shape, headers, regras de segurança). Requests sem asserção real são marcados `smoke-only`.
- **Mapa** `traceability.md` — tabela `bru original | bdd | tdd | request unificado` para auditar 1:1 (FR-001, SC-001).

**Rationale**: separar BDD (comportamento, linguagem de negócio) de TDD (asserções verificáveis) é a divisão clássica (requirements/Gherkin vs casos de teste). O mapa torna a cobertura **auditável** antes de reescrever — sem ele, a reescrita arrisca perda silenciosa.

**Alternativas**: (a) só um doc por request — rejeitada: mistura comportamento e asserção, dificulta revisão; (b) gerar direto a coleção sem rede — rejeitada pelo dono (C1).

## D3 — Contract suite compartilhada do RoleRepository (US2, T023)

**Decisão**: `tests/modules/auth/adapters/persistence/role-repository.suite.ts` exporta uma função `roleRepositoryContract(makeRepo: () => Promise<RoleRepository> | RoleRepository, label: string)` que registra os casos (`save`/`findById`/`list`/`isInUse`, incluindo idempotência e `isInUse` via junção) com `node:test`. Dois consumidores: `role-repository.inmemory.test.ts` (sem guard, roda no `pnpm test`) e `role-repository.drizzle.test.ts` (atrás de `MYSQL_INTEGRATION=1` + Docker, via `test:integration:auth`).

**Rationale**: padrão "shared contract test" (test-pyramid-engineer) — uma definição de contrato, N adapters. Garante paridade comportamental in-memory↔Drizzle (o ponto de T023). O guard por env já é o padrão do projeto (`*_INTEGRATION=1`).

**Alternativas**: duplicar os casos em cada arquivo — rejeitada: divergência inevitável, é o que T023 quer evitar.

## D4 — Runner único (US4)

**Decisão**: `scripts/e2e-bruno-all.sh`, exposto como `pnpm run test:integration:all`. Passos: (1) `docker compose up -d mysql minio --wait`; (2) gerar secrets efêmeros; (3) boot do server com **todos os módulos em driver real** (auth/contracts/partners → mysql; storage → minio) e **seeds completos**; (4) aguardar `/health`; (5) `bru run api-collections/core-api -r --env local`; (6) `trap EXIT` derruba compose (`down -v`) e limpa secrets; (7) propagar o exit code do `bru`.

**Rationale**: espelha o `e2e-bruno-auth.sh` já validado, generalizando para todos os módulos. `trap EXIT` garante teardown mesmo em falha (FR-009). Run recursivo único preserva o token (D1).

**Alternativas**: orquestrar via node script — viável, mas o shell já é o padrão dos e2e do projeto; manter consistência.

## D5 — Seeds e drivers num único boot

**Decisão**: investigar (na implementação) como `contracts` e `partners` recebem seed/driver hoje nos e2e; unificar num conjunto de variáveis de ambiente de boot que semeia os três módulos de forma idempotente. Reusar `AUTH_SEED_JSON` (auth) + os mecanismos equivalentes de contracts/partners (ou criá-los se inexistentes).

**Rationale**: o gate único exige um boot com os três módulos prontos. A idempotência do seed já foi resolvida para auth (PR #28). É o ponto de maior risco técnico — daí ser investigado com `bruno-api-client-expert` + leitura dos scripts e2e atuais antes de codar.

**Alternativas**: bancos/boots separados por módulo — rejeitada: recria a fragmentação.

**Risco aberto**: se algum módulo não suportar driver real no boot conjunto hoje, US4 pode exigir um pequeno ajuste de composition (fora do domínio). Registrar como dependência na US4.

## D6 — Ordem de remoção do legado (US5)

**Decisão**: remover `api-collections/{auth,contracts,partners}/` e os 14 scripts `test:e2e:*`/`test:integration:*` por módulo **somente** após US3 (coleção unificada verde) e US4 (runner verde) comprovados, e após o `traceability.md` confirmar cobertura ≥ original.

**Rationale**: a rede de segurança e a unificada precisam estar provadas antes de remover a referência. Evita janela sem fonte de verdade.

**Alternativas**: remover junto com a reescrita — rejeitada: perde o baseline de comparação.
