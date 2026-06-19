# Tasks: Conta Cedente para Conciliação Bancária (extensão do agregado)

**Input**: Design documents from `/specs/019-fin-recon-cedente-account/`

**Prerequisites**: [plan.md](./plan.md) (required), [spec.md](./spec.md) (user stories), [research.md](./research.md)

**Tests**: INCLUÍDOS — o pipeline core-api é fail-first (W0 RED antes de `src/`). Cada user story tem seus testes antes da implementação.

**Organization**: tasks agrupadas por user story (US1..US4), em ordem de prioridade, cada uma independentemente testável.

**Ticket de pipeline**: `FIN-RECON-CEDENTE-ACCOUNT` (size **M** — fatiável em `…-DOMAIN-APP` + `…-HTTP` se o review pedir).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: pode rodar em paralelo (arquivos diferentes, sem dependência pendente)
- **[Story]**: US1..US4 (fases de user story); Setup/Foundational/Polish não têm label

---

## Phase 1: Setup

- [ ] T001 Inicializar o ticket de pipeline `FIN-RECON-CEDENTE-ACCOUNT` (`pnpm run pipeline:state init FIN-RECON-CEDENTE-ACCOUNT --size M`) e escrever o escopo em `.claude/.pipeline/FIN-RECON-CEDENTE-ACCOUNT/000-request.md` (referenciar spec/plan/research da 019).

---

## Phase 2: Foundational (bloqueia TODAS as user stories)

**⚠️ CRÍTICO**: nenhuma user story começa antes desta fase (extensão do agregado + migration + port + permissão são pré-requisito comum).

- [ ] T002 [P] W0 RED: testes do domínio estendido em `tests/modules/financial/domain/cedente/cedente-account.test.ts` — `create()` com `type`/`nickname`/`bankName`/`openingBalanceCents`/`openingBalanceDate`; rejeita `type` inválido; rejeita saldo de abertura sem data (par coeso, FR-006).
- [ ] T003 Estender o tipo do agregado em `src/modules/financial/domain/cedente/types.ts` — campos novos + erros `invalid-account-type` e `opening-balance-requires-date`.
- [ ] T004 Estender `create()` em `src/modules/financial/domain/cedente/cedente-account.ts` — validar `type` ∈ {corrente,poupanca,investimento} e o par saldo+data; preservar validações existentes (reuso de `close()`/`isClosed()`).
- [ ] T005 Estender o schema Drizzle em `src/modules/financial/adapters/persistence/schemas/mysql.ts` — 5 colunas NULLABLE (`type` VARCHAR(16), `nickname` VARCHAR(60), `bank_name` VARCHAR(80), `opening_balance_cents` BIGINT, `opening_balance_date` DATE) + `check(type IN ('corrente','poupanca','investimento'))` + `uniqueIndex` em (`bank_code`,`agency`,`account_number`,`account_digit`).
- [ ] T006 Gerar a migration: `pnpm run db:generate:financial` → versionar `src/modules/financial/adapters/persistence/migrations/mysql/0009_*.sql` (ALTER TABLE ADD COLUMN nullable + CREATE UNIQUE INDEX); revisar SQL emitido.
- [ ] T007 Estender o mapper em `src/modules/financial/adapters/persistence/mappers/cedente-account.mapper.ts` — `toRow`/`toDomain` dos campos novos (opcionais → null; saldo cents bigint↔number).
- [ ] T008 Adicionar `list()` e `findByNaturalKey()` ao port em `src/modules/financial/application/ports/cedente-account-store.ts`.
- [ ] T009 [P] Implementar `list()`/`findByNaturalKey()` no adapter Drizzle `src/modules/financial/adapters/persistence/repos/cedente-account-store.drizzle.ts` (`select().from(finCedenteAccounts)`; insert-only p/ create separado do `save()` upsert — research D2).
- [ ] T010 [P] Implementar `list()`/`findByNaturalKey()` no adapter in-memory `src/modules/financial/adapters/persistence/repos/cedente-account-store.in-memory.ts`.
- [ ] T011 [P] Registrar `bankAccountRead: 'bank-account:read'` e `bankAccountWrite: 'bank-account:write'` em `src/modules/financial/public-api/permissions.ts`.
- [ ] T012 W0 RED (integração): `tests/modules/financial/adapters/persistence/cedente-account-store.integration.test.ts` — `UNIQUE INDEX` rejeita conta duplicada; conta legada (sem campos novos) carrega via `toDomain` (FR-013). Roda atrás do opt-in `test:integration`.

**Checkpoint**: agregado estendido + migration + port + permissão prontos → user stories podem começar.

---

## Phase 3: User Story 1 - Cadastrar e listar a conta cedente (Priority: P1) 🎯 MVP

**Goal**: criar uma conta cedente e vê-la no grid (listar/consultar). Desbloqueia o import (#120).

**Independent Test**: `POST /api/v2/financial/cedente-accounts` cria; `GET` lista com `status=ativa`; `GET /:id` recupera.

### Tests (W0 RED)

- [ ] T013 [P] [US1] Teste do use-case em `tests/modules/financial/application/create-cedente-account.test.ts` — cria; rejeita duplicata (FR-016, `cedente-account-duplicate`).
- [ ] T014 [P] [US1] Teste do use-case em `tests/modules/financial/application/list-cedente-accounts.test.ts`.
- [ ] T015 [P] [US1] Teste HTTP (via `fastify.inject`) em `tests/modules/financial/adapters/http/cedente-accounts.routes.test.ts` — POST 201, GET 200 (lista), GET/:id 200/404, validação 400, autorização.

### Implementation

- [ ] T016 [US1] `createCedenteAccount` em `src/modules/financial/application/use-cases/create-cedente-account.ts` — gera id, valida via domínio, checa unicidade (`findByNaturalKey` → `cedente-account-duplicate`), persiste insert-only (não usar `save()` upsert — research D2).
- [ ] T017 [P] [US1] `listCedenteAccounts` em `src/modules/financial/application/use-cases/list-cedente-accounts.ts`.
- [ ] T018 [US1] Schemas Zod (`createCedenteAccountBodySchema`, `cedenteAccountIdParamSchema`) em `src/modules/financial/adapters/http/schemas.ts` — `type` z.enum; saldo `centsStringSchema` opcional + data `z.iso.date()` opcional com `.refine()` (par coeso); `nickname`/`bankName` bounded.
- [ ] T019 [US1] `cedenteAccountToDto` em `src/modules/financial/adapters/http/dto.ts` (saldo cents→string, data→ISO, id→String, status preservado).
- [ ] T020 [US1] Rotas `POST /financial/cedente-accounts`, `GET /financial/cedente-accounts`, `GET /financial/cedente-accounts/:id` em `src/modules/financial/adapters/http/plugin.ts` (`preHandler: [requireAuth, authorize(bankAccountWrite|Read)]`).
- [ ] T021 [US1] Wiring de `createCedenteAccount`/`listCedenteAccounts` em `src/modules/financial/adapters/http/composition.ts` + tipo `FinancialHttpDeps` (`cedenteStore` já plugado).
- [ ] T022 [US1] Mapear `cedente-account-duplicate` → HTTP 409 + mensagem PT-BR em `src/modules/financial/adapters/http/error-mapping.ts`.

**Checkpoint**: US1 funcional e testável de forma independente (MVP demonstrável).

---

## Phase 4: User Story 2 - Encerrar a conta e bloquear operações (Priority: P2)

**Goal**: encerrar conta; conta encerrada rejeita import e conciliação (`account-closed`).

**Independent Test**: `POST /:id/close` → `status=encerrada`; import e conciliação contra ela são rejeitados.

### Tests (W0 RED)

- [ ] T023 [P] [US2] Teste do use-case em `tests/modules/financial/application/close-cedente-account.test.ts` — encerra; já encerrada → `cedente-account-already-closed`.
- [ ] T024 [P] [US2] Teste em `tests/modules/financial/application/import-bank-statement.test.ts` — import contra conta encerrada → `account-closed` (FR-011, guard hoje ausente).
- [ ] T025 [P] [US2] Teste HTTP em `tests/modules/financial/adapters/http/cedente-accounts.routes.test.ts` — `POST /:id/close` 200/404/409.

### Implementation

- [ ] T026 [US2] `closeCedenteAccount` em `src/modules/financial/application/use-cases/close-cedente-account.ts` — `findById` + domain `close()` + `save()`.
- [ ] T027 [US2] Guard `account-closed` em `src/modules/financial/application/use-cases/import-bank-statement.ts` — carregar conta por `debitAccountRef`, `if (isClosed(acc)) return err('account-closed')` (espelha `confirm-reconciliation.ts:85-91`).
- [ ] T028 [US2] Rota `POST /financial/cedente-accounts/:id/close` em `plugin.ts` + wiring no `composition.ts` (erro `cedente-account-already-closed` já mapeado em `error-mapping.ts`).

**Checkpoint**: US1 + US2 funcionais; FR-011 e FR-012 cobertos por teste (FR-012 já existia em `confirm-reconciliation`).

---

## Phase 5: User Story 3 - Editar os dados da conta (Priority: P2)

**Goal**: editar conta; após histórico, só `apelido`/`bankName` (trava dados bancários — FR-008).

**Independent Test**: `PATCH /:id` altera apelido (sem histórico edita tudo; com histórico, alterar dados bancários → 409).

### Tests (W0 RED)

- [ ] T029 [P] [US3] Teste do use-case em `tests/modules/financial/application/edit-cedente-account.test.ts` — sem histórico edita tudo; com histórico, alterar banco/agência/conta-DV → `cedente-account-bank-data-locked`.
- [ ] T030 [P] [US3] Teste HTTP em `tests/modules/financial/adapters/http/cedente-accounts.routes.test.ts` — `PATCH /:id` 200/404/409.

### Implementation

- [ ] T031 [US3] Detecção de histórico: método para checar se a conta tem extrato importado/conciliações (ex.: `statementRepo`/`reconciliationRepo` por `debit_account_ref`) — adicionar ao port/use-case conforme `research.md` (entrada de FR-008).
- [ ] T032 [US3] `editCedenteAccount` em `src/modules/financial/application/use-cases/edit-cedente-account.ts` — `findById`; se há histórico, rejeitar alteração de `bankCode`/`agency`/`accountNumber`/`accountDigit` (`cedente-account-bank-data-locked`); senão aplicar tudo; `save()`.
- [ ] T033 [US3] Schema Zod `editCedenteAccountBodySchema` (parcial) + rota `PATCH /financial/cedente-accounts/:id` em `schemas.ts`/`plugin.ts` + mapear `cedente-account-bank-data-locked` → 409 em `error-mapping.ts`.

**Checkpoint**: US1+US2+US3 funcionais e independentes.

---

## Phase 6: User Story 4 - Saldo de abertura para conciliação retroativa (Priority: P3)

**Goal**: saldo de abertura + data opcionais habilitam conciliação retroativa.

**Independent Test**: criar conta com saldo+data persiste/recupera; sem → válido; saldo sem data → rejeita.

### Tests (W0 RED)

- [ ] T034 [P] [US4] Teste em `tests/modules/financial/application/create-cedente-account.test.ts` (cenário US4) — round-trip de `openingBalanceCents`+`openingBalanceDate`; ausência → válido; saldo sem data → rejeitado.
- [ ] T035 [P] [US4] Teste de serialização do saldo em `tests/modules/financial/adapters/http/cedente-accounts.routes.test.ts` — DTO devolve saldo (string) + data (ISO) quando presentes; ausentes quando não informados.

### Implementation

- [ ] T036 [US4] Garantir o round-trip do saldo de abertura no `cedenteAccountToDto`/mapper (a maior parte vem da extensão foundational T003-T007); confirmar que a ausência dos campos não quebra a serialização (FR-013).

**Checkpoint**: todas as user stories independentemente funcionais.

---

## Phase 7: Polish & Cross-Cutting

- [ ] T037 Gate W3: `pnpm run typecheck` + `pnpm run format:check` + `pnpm run lint` + `pnpm test` todos verdes (+ `pnpm run test:integration` p/ T012).
- [ ] T038 Princípio IX: ancorar citação canônica (Evans — invariante de agregado; Vernon — consistency boundary) no `research.md`/`004-code-review` quando MCP `acdg-skills` ou base local estiver disponível.
- [ ] T039 Validar a pré-condição do `UNIQUE INDEX` (FR-016) contra dados legados da 016 antes do deploy da migration; documentar o resultado.
- [ ] T040 [P] Atualizar/adicionar coleção Bruno (`.bru`) para as rotas `cedente-accounts` (smoke e2e da borda), se a suíte Bruno cobrir o financial.

---

## Dependencies & Execution Order

- **Setup (T001)** → **Foundational (T002-T012)** bloqueia tudo.
- Foundational pronto → **US1 (T013-T022, MVP)** → **US2 (T023-T028)** / **US3 (T029-T033)** / **US4 (T034-T036)** podem seguir; US2/US3/US4 são independentes entre si (integram com US1 mas testam isolado).
- **Polish (T037-T040)** após as stories desejadas.

### Within each story (TDD)

- Testes (W0 RED) **antes** da implementação; domínio → use-case → borda HTTP.

### Parallel Opportunities

- T009/T010/T011 (arquivos diferentes) em paralelo na Foundational.
- Dentro de cada story, os testes marcados [P] em paralelo; T017 (list use-case) paralelo ao T016.
- US2, US3, US4 podem ser tocadas por devs distintos após a Foundational.

---

## Implementation Strategy

### MVP First (US1)

1. Phase 1 (Setup) → 2. Phase 2 (Foundational, CRÍTICA) → 3. Phase 3 (US1) → **validar US1 isolado** → demo.

### Incremental

US1 (MVP) → US2 (ciclo de vida + guard) → US3 (edição) → US4 (saldo retroativo). Cada story agrega sem quebrar a anterior.

---

## Notes

- `[P]` = arquivos diferentes, sem dependência pendente.
- Verificar que os testes W0 **falham** antes de implementar (fail-first).
- Commit por task ou grupo lógico — **somente quando o humano autorizar** (specs hoje em draft, não-commitadas).
- Decisão-chave (research D2): `create` **não** reusa o `save()` upsert; `edit` aplica a imutabilidade de FR-008.
