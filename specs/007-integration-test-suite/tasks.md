# Tasks: Fonte única de verdade de testes de integração HTTP

**Input**: Design documents from `/specs/007-integration-test-suite/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: a feature É sobre testes. A "rede BDD/TDD" (US1) é o artefato de cobertura; a contract suite (US2) é TDD real (RED antes de `src`-adjacente).

**Organization**: por user story (P1→P3). Cada US mapeia a **um ticket `.claude/.pipeline/`** (pipeline W0→W3). **Uso de agentes especialistas é obrigatório (FR-012)** — anotado em cada fase.

> **Ordem de dependência**: US1 (rede) e US2 (contract suite) são independentes e podem ir em paralelo. US3 (reescrita) depende de US1. US4 (runner) depende de US3. US5 (remover) depende de US3+US4 verdes.
>
> **Mapa de tickets**: `INT-SAFETY-NET-BDD-TDD` (US1) · `AUTH-ROLE-REPO-CONTRACT-SUITE` (US2, fecha T023) · `INT-UNIFIED-COLLECTION` (US3) · `INT-RUNNER-ALL` (US4) · `INT-REMOVE-LEGACY` (US5).

---

## Phase 1: Setup (Shared Infrastructure)

- [x] T001 Criar a estrutura da rede em `specs/007-integration-test-suite/safety-net/` (`bdd/`, `tdd/`, `traceability.md` com cabeçalho da tabela 1:1).
- [ ] T002 [P] Criar o esqueleto da coleção unificada em `api-collections/core-api/` (`bruno.json` name="core-api", `environments/local.bru` com baseUrl/e-mails de seed; pasta `0-auth/` vazia).

---

## Phase 2: Foundational (Blocking Prerequisites)

- [x] T003 Inventariar os ~180 `.bru` das 3 coleções (`api-collections/{auth,contracts,partners}`) num índice canônico (request → módulo → método/rota → asserções → seedNeeds) em `safety-net/inventory.md`. É a base do mapeamento 1:1; nenhuma rede pode começar sem ele.

---

## Phase 3: User Story 1 - Rede de segurança BDD/TDD 1:1 (Priority: P1) 🛡️ PRÉ-REQUISITO

**Goal**: capturar 100% da cobertura existente em artefatos BDD+TDD antes de qualquer reescrita.

**Independent Test**: `count(bdd) == count(tdd) == count(.bru originais)`; cada linha de `traceability.md` mapeia 1 request.

**Especialistas obrigatórios**: `requirements-engineer` (cenários BDD/Gherkin) + `tdd-strategist` (asserções TDD).

- [x] T004 [P] [US1] Gerar BDD (`.feature`) + TDD (`.md`) para os 94 `.bru` de **auth** em `safety-net/{bdd,tdd}/auth/` (1:1) + linhas em `traceability.md`. Consultar `requirements-engineer` + `tdd-strategist`.
- [x] T005 [P] [US1] Idem para os 19 `.bru` de **contracts** em `safety-net/{bdd,tdd}/contracts/`.
- [x] T006 [P] [US1] Idem para os 67 `.bru` de **partners** em `safety-net/{bdd,tdd}/partners/`.
- [x] T007 [US1] Validar 1:1: script/checagem que confirma `count(bdd)==count(tdd)==count(.bru)` e que toda asserção do request original aparece no TDD (ou `smoke-only`). Revisão final por especialista. (depende de T004–T006)

**Checkpoint**: rede completa e auditável → US3 liberada.

---

## Phase 4: User Story 2 - Contract suite do RoleRepository nos dois adapters (Priority: P1)

**Goal**: fechar T023 da 006 — uma suíte de contrato compartilhada in-memory + Drizzle/MySQL.

**Independent Test**: `pnpm test` (in-memory) verde + `pnpm run test:integration:auth` (Drizzle/Docker) verde.

**Especialistas obrigatórios**: `drizzle-orm-expert` + `test-pyramid-engineer`.

- [x] T008 [US2] W0 RED: criar `tests/modules/auth/adapters/persistence/role-repository.suite.ts` exportando `roleRepositoryContract(makeRepo, label)` (save novo/update, findById hit/miss, list vazio/povoado, isInUse true/false) e consumi-la em `role-repository.inmemory.test.ts` (sem guard) e `role-repository.drizzle.test.ts` (guard `MYSQL_INTEGRATION=1`). Deve falhar antes da suíte existir.
- [x] T009 [US2] W1→W3: tornar a suíte verde nos dois adapters; rodar `pnpm test` + `pnpm run test:integration:auth` (Docker). Consultar `drizzle-orm-expert` para o caso `isInUse` (junção `auth_user_role`). Fecha **T023** (e parte de T051) da 006.

**Checkpoint**: paridade de contrato do RoleRepository comprovada.

---

## Phase 5: User Story 3 - Coleção unificada reescrita (Priority: P1)

**Goal**: reescrever uma coleção única, por módulo, com auth/environment compartilhados, validada contra a rede (US1).

**Independent Test**: cada artefato da rede tem request correspondente em `api-collections/core-api/`; cobertura ≥ soma das 3 originais; 1 login, 1 environment.

**Especialista obrigatório**: `bruno-api-client-expert`.

- [x] T010 [US3] Implementar `0-auth/` (login admin + bare compartilhados; `setVar` de tokens de coleção) em `api-collections/core-api/0-auth/`. (depende de T002)
- [x] T011 [P] [US3] Reescrever os requests de **auth** em `api-collections/core-api/auth/` a partir de `safety-net/{bdd,tdd}/auth/`; marcar `traceability` → `reescrito`. (depende de T007, T010)
- [x] T012 [P] [US3] Reescrever **contracts** em `api-collections/core-api/contracts/` a partir da rede. (depende de T007, T010)
- [x] T013 [P] [US3] Reescrever **partners** em `api-collections/core-api/partners/` a partir da rede. (depende de T007, T010)
- [x] T014 [US3] Conferir cobertura: toda linha de `traceability.md` tem `request_unificado`; cobertura ≥ original. (depende de T011–T013)

**Checkpoint**: coleção unificada existe e mapeia 1:1 a rede.

---

## Phase 6: User Story 4 - Runner único Docker (Priority: P2)

**Goal**: um comando sobe infra, boota todos os módulos, roda toda a coleção, reporta e limpa.

**Independent Test**: `pnpm run test:integration:all` com Docker → resumo único, exit 0 se tudo passa, teardown sem órfãos.

**Especialistas obrigatórios**: `bruno-api-client-expert` + `docker-compose-expert`.

- [x] T015 [US4] Investigar seeds/drivers de **contracts** e **partners** no boot (D5): mapear como recebem seed/driver hoje (`scripts/e2e-*.sh`) e definir o conjunto de env de boot que semeia os 3 módulos idempotentemente. Registrar achados; se exigir ajuste mínimo de composition (fora do domínio), abrir sub-task. (depende de T014)
- [x] T016 [US4] Implementar `scripts/e2e-bruno-all.sh` (compose up mysql+minio --wait → secrets efêmeros → boot server todos-os-módulos+seeds → wait /health → `bru run api-collections/core-api -r --env local` → `trap EXIT` down -v + limpa secrets → propaga exit code) e o script `test:integration:all` no `package.json`. (depende de T015)
- [x] T017 [US4] Rodar `pnpm run test:integration:all` até verde (toda a coleção) com teardown comprovado (sem containers/volumes órfãos). Marcar linhas do `traceability` → `verde`. (depende de T016)

**Checkpoint**: gate único verde cobrindo a borda inteira.

---

## Phase 7: User Story 5 - Remover legado (Priority: P3)

**Goal**: eliminar a fonte de verdade duplicada.

**Independent Test**: nenhuma coleção `.bru` fora de `core-api/` nem scripts `test:e2e:*`/`test:integration:*` por módulo; runner único continua verde.

- [ ] T018 [US5] Remover `api-collections/{auth,contracts,partners}/` e os 14 scripts `test:e2e:*`/`test:integration:*` por módulo do `package.json` (manter `test:integration:all` + os de infra genéricos não-substituídos, ex.: `test:integration:infra`). (depende de T017 verde)
- [ ] T019 [US5] Rodar `pnpm run test:integration:all` de novo: continua verde (a remoção não tirou cobertura). Atualizar referências em docs/README/scripts e2e citados. (depende de T018)

**Checkpoint**: fonte única de verdade estabelecida.

---

## Phase 8: Polish & Cross-Cutting

- [ ] T020 [P] Marcar **T023** e **T051** da spec 006 como fechadas (cross-ref no `specs/006-gestao-acessos/tasks.md` + EXECUTION-LOG).
- [ ] T021 Gate W3 final: `pnpm run typecheck && pnpm run format:check && pnpm run lint && pnpm test`. (após cada ticket)
- [ ] T022 [P] Smoke de regressão (SC-006): introduzir falha proposital num request, confirmar exit ≠ 0 do `test:integration:all`, reverter.
- [ ] T023 [P] Atualizar `quickstart.md`/docs com o comando único e a localização da rede de rastreabilidade.

---

## Dependencies (ordem de conclusão das stories)

```
Setup (T001-T002) → Foundational (T003)
   ├─► US1 rede (T004-T007) ─────────────┐
   ├─► US2 contract suite (T008-T009)    │  (US1 e US2 paralelas)
                                          ▼
                                US3 coleção unificada (T010-T014)
                                          ▼
                                US4 runner único (T015-T017)
                                          ▼
                                US5 remover legado (T018-T019)
                                          ▼
                                Polish (T020-T023)
```

## Parallel opportunities

- **US1**: T004/T005/T006 (auth/contracts/partners) em paralelo — pastas diferentes.
- **US2** roda em paralelo com US1 inteira (toca `tests/`, não Bruno).
- **US3**: T011/T012/T013 (reescrita por módulo) em paralelo após T010.

## MVP scope

- **MVP mínimo**: US2 (fecha T023 — pendência concreta da 006) + US1 (rede). Já entrega valor: contract suite verde + cobertura auditável.
- **MVP do objetivo do dono**: US1→US4 (gate único rodando). US5 é higiene final.

## Estratégia de implementação

Incremental, **um ticket `.claude/.pipeline/` por US**, cada um W0→W3 com os especialistas obrigatórios da fase. US5 (remoção) só após US3+US4 verdes e `traceability.md` 100% em `verde`.
