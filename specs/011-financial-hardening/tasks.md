---
description: 'Task list — Financial Hardening (pós-Fatia 2)'
---

# Tasks: Financial Hardening (pós-Fatia 2)

**Input**: Design documents from `/specs/011-financial-hardening/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/README.md, quickstart.md

**Tests**: INCLUÍDOS — o projeto é TDD fail-first W0→W3 (constituição §I, não-negociável). Cada user story tem testes RED antes da implementação.

**Organização**: por user story. Cada US = 1 ticket de pipeline independente, executável e testável isoladamente.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: paralelizável (arquivos diferentes, sem dependência pendente)
- **[Story]**: US1=#52, US2=#55, US3=#56, US4=#54

## Path Conventions

Modular monolith; todo o código em `src/modules/financial/` (+ referência a `src/shared/http/`). Testes em `tests/modules/financial/`.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: abrir os tickets de pipeline e fixar o baseline de regressão zero.

- [ ] T001 Abrir os 4 tickets de pipeline com `pnpm run pipeline:state init`: `FIN-HTTP-ERROR-PUBLIC-CODE --size M`, `FIN-CANCEL-OPTIMISTIC-LOCK --size M`, `FIN-TIMELINE-MODEL-TIDY --size M`, `FIN-TIMELINE-CHANGES-BOUNDS --size S`; escrever `000-request.md` de cada um a partir da issue correspondente.
- [ ] T002 [P] Capturar baseline da suíte (`pnpm test` — contagem de testes verdes) e registrar como piso da regressão zero (constituição §II).

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: garantir verde antes de tocar `src/`. Não há código compartilhado bloqueante — as 4 US são independentes.

**⚠️ CRITICAL**: confirmar gate verde no baseline antes de abrir qualquer W0.

- [ ] T003 Confirmar gate W3 verde no baseline (`pnpm run typecheck && pnpm run format:check && pnpm run lint && pnpm test`) na branch `011-financial-hardening`.

**Checkpoint**: foundation pronta — as user stories podem prosseguir em paralelo (atenção: US3 e US4 tocam ambas `adapters/http/schemas.ts` em regiões diferentes — coordenar merge).

---

## Phase 3: User Story 1 - Erros 4xx não vazam o mecanismo interno (Priority: P1) 🎯 MVP

**Goal**: respostas 4xx do financial expõem `code` público (`conflict`/`not-found`/`bad-request`/`unprocessable`) + `message` PT-BR; slug interno só no log. Ticket `FIN-HTTP-ERROR-PUBLIC-CODE`.

**Independent Test**: `fastify.inject` — PATCH version stale → 409 `code:"conflict"` sem slug; GET inexistente → 404 `not-found`; 5xx mantém `code:"internal"`.

### Tests for User Story 1 (W0 RED) ⚠️

- [ ] T004 [P] [US1] Criar `tests/modules/financial/adapters/http/error-envelope-hardening.http.test.ts` com CA-H1..H8 (409→conflict, 422→unprocessable, 404→not-found, 400→bad-request, 5xx→internal guard, DELETE→conflict) — devem FALHAR (slug vaza hoje).

### Implementation for User Story 1 (W1)

- [ ] T005 [P] [US1] Criar `src/modules/financial/adapters/http/error-messages.ts` — dicionário `Record<string,string>` PT-BR (mapeamento em `contracts/README.md`).
- [ ] T006 [US1] Em `src/modules/financial/adapters/http/plugin.ts` (`sendDomainError`, ~linha 90-108): `toPublicCode(slug)` (deriva de `CONFLICT_CODES`/`NOT_FOUND_CODES`/`BAD_REQUEST_CODES`, default unprocessable) + `toPublicMessage(slug)`; slug interno só em `request.log`. Corrigir bugs: `partner-ref-invalid`→400, `timeline-document-not-found`→404; remover slug morto `invalid-supplier-ref`.
- [ ] T007 [US1] Cobrir o caminho `DELETE`/`sendResult` em `src/shared/http/reply.ts` (~linha 47-49) com o mesmo mascaramento (helper compartilhado ou migrar DELETE para `sendDomainError`), sem afetar outros módulos.
- [ ] T008 [US1] W2 (review read-only) com **citação canônica OWASP API8:2023/ASVS V7** (constituição §IX) + W3 gate verde.

**Checkpoint**: US1 funcional e testável isoladamente (MVP).

---

## Phase 4: User Story 2 - Cancelamento respeita controle de concorrência (Priority: P2)

**Goal**: `cancelDocument` exige `expectedVersion`; versão defasada → 409 sem apagar. Ticket `FIN-CANCEL-OPTIMISTIC-LOCK`.

**Independent Test**: cancel version-ok → 204/removido; version-stale → 409 + documento permanece.

### Tests for User Story 2 (W0 RED) ⚠️

- [ ] T009 [P] [US2] Em `tests/modules/financial/application/use-cases/transitions.test.ts`: cancel `expectedVersion=0`→sucesso (findById→not-found); cancel `expectedVersion=999`→`document-version-conflict` (documento permanece).
- [ ] T010 [P] [US2] Em `tests/modules/financial/adapters/persistence/document-repository.suite.ts` (+ `document-repository.drizzle-mysql.test.ts`): `delete` com version correta → remove; com version defasada → conflict.
- [ ] T011 [P] [US2] Em `tests/modules/financial/adapters/http/financial-documents.http.test.ts`: DELETE sem `version`→400; version-ok→204; version-stale→409.

### Implementation for User Story 2 (W1)

- [ ] T012 [US2] Port `src/modules/financial/domain/document/repository.ts:51`: `delete(id, expectedVersion: number)`.
- [ ] T013 [US2] `src/modules/financial/adapters/persistence/repos/document-repository.drizzle.ts:337`: DELETE condicional dentro de `db.transaction` com SELECT FOR UPDATE prévio; `affectedRows===0`→`err('document-version-conflict')`.
- [ ] T014 [P] [US2] `src/modules/financial/adapters/persistence/repos/document-repository.in-memory.ts:116`: `delete` checa `existing.version !== expectedVersion`→conflict.
- [ ] T015 [US2] `src/modules/financial/application/use-cases/cancel-document.ts`: `CancelDocumentCommand` ganha `expectedVersion: number`; repassa a `repo.delete` (depende de T012).
- [ ] T016 [US2] `src/modules/financial/adapters/http/schemas.ts`: `cancelDocumentBodySchema = z.object({ version: z.number().int().min(0).max(Number.MAX_SAFE_INTEGER) })`; em `plugin.ts` handler DELETE lê `req.body.version` e mapeia `document-version-conflict`→409.
- [ ] T017 [US2] W2 com **citação canônica (lost-update / controle de concorrência)** + W3 gate + `pnpm run test:integration:financial`.

**Checkpoint**: US1 e US2 funcionais independentes.

---

## Phase 5: User Story 3 - Modelo da trilha consistente com a convenção (Priority: P3)

**Goal**: `kind`→`eventType` (resposta byte-idêntica) + `TIMELINE_EVENT_TYPES` sem `DocumentCancelled` (response schema + CHECK via migration). Ticket `FIN-TIMELINE-MODEL-TIDY`.

**Independent Test**: typecheck verde com `entry.eventType`; cancelar apaga a trilha (cascade); CHECK rejeita `DocumentCancelled`; CT-014 byte-idêntico.

### Tests for User Story 3 (W0 RED) ⚠️

- [ ] T018 [P] [US3] Em `tests/modules/financial/domain/timeline/projection.test.ts` (~linha 92): asserção `docEntry.eventType === 'DocumentSaved'` → `pnpm run typecheck` FALHA enquanto o campo for `kind`.
- [ ] T019 [P] [US3] Em `tests/modules/financial/adapters/persistence/document-repository.drizzle-mysql.test.ts`: cancelar → `findByDocument` vazio (cascade); `INSERT` direto com `event_type='DocumentCancelled'` → `assert.rejects` (CHECK, MySQL 3819).

### Implementation for User Story 3 (W1)

- [ ] T020 [US3] Rename `kind`→`eventType` (6 edições): `domain/timeline/types.ts:23`, `domain/timeline/projection.ts:70,91`, `adapters/persistence/mappers/timeline.mapper.ts:107,135`, `adapters/http/dto.ts:104`. NÃO tocar `target.kind`/`payable.kind`.
- [ ] T021 [US3] `src/modules/financial/domain/document/events.ts`: exportar `TIMELINE_EVENT_TYPES = exhaustiveStringUnion<Exclude<DocumentEvent['type'],'DocumentCancelled'>>()([...] as const)`; usar em `adapters/http/schemas.ts:228` (`z.enum([...TIMELINE_EVENT_TYPES])`).
- [ ] T022 [US3] `src/modules/financial/adapters/persistence/schemas/mysql.ts:380`: remover `'DocumentCancelled'` do `check('ck_fin_tl_event_type', …)`; `pnpm run db:generate` → versionar `migrations/mysql/0002_*.sql`; auditar o `ALTER TABLE … DROP CHECK / ADD CONSTRAINT`.
- [ ] T023 [US3] W2 com **citação canônica (DDD naming / discriminadores)** + W3 gate + integração + CT-014 prova byte-idêntico.

**Checkpoint**: US1, US2, US3 independentes.

---

## Phase 6: User Story 4 - Contrato da trilha reflete os limites de armazenamento (Priority: P3)

**Goal**: `maxLength` real em `changes.*` no OpenAPI. Ticket `FIN-TIMELINE-CHANGES-BOUNDS`.

**Independent Test**: `safeParse` rejeita N+1 chars; OpenAPI exibe `maxLength`.

### Tests for User Story 4 (W0 RED) ⚠️

- [ ] T024 [P] [US4] Criar `tests/modules/financial/adapters/http/timeline-schema-bounds.test.ts`: `safeParse('a'.repeat(61))` em `field` falha; `safeParse('x'.repeat(65536))` em `before`/`after` falha.

### Implementation for User Story 4 (W1)

- [ ] T025 [US4] `src/modules/financial/adapters/http/schemas.ts:248-250`: `field: z.string().max(60)`; `before/after: z.string().max(65535).nullable()`; `.meta({ description })` individual.
- [ ] T026 [US4] W3 gate verde + (opcional) snapshot do OpenAPI (`app.swagger()`) confirmando `maxLength`.

**Checkpoint**: as 4 user stories independentemente funcionais.

---

## Phase 7: Polish & Cross-Cutting Concerns

- [ ] T027 [P] Fechar as issues #52/#54/#55/#56 no GitHub referenciando os tickets/PR (sem auto-close — PRs vão para `dev`).
- [ ] T028 Rodar `quickstart.md` completo + `pnpm run test:integration:financial`; confirmar contagem de testes ≥ baseline (T002).
- [ ] T029 `pnpm run pipeline:state close` dos 4 tickets + `pnpm run pipeline:status` para o dashboard.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (P1)** → **Foundational (P2)** → **User Stories (P3–P6)** → **Polish (P7)**.
- As 4 user stories são independentes; podem ir em paralelo OU na ordem de prioridade.

### User Story Dependencies

- **US1 (#52)**, **US2 (#55)**, **US3 (#56)**, **US4 (#54)**: nenhuma depende da outra.
- ⚠️ **US3 e US4 tocam `adapters/http/schemas.ts`** (US3 linha 228 enum; US4 linhas 248-250 bounds) — regiões diferentes, mas coordenar merge/sequência.

### Within Each User Story

- W0 (testes) FALHAM antes de W1 (impl). Port antes do adapter (T012 antes de T013). W2 review + citação §IX antes de fechar. W3 gate verde.

### Parallel Opportunities

- US1..US4 podem ser 4 tickets em paralelo (ressalva US3/US4 em `schemas.ts`).
- Dentro de cada US, os testes [P] rodam juntos.

---

## Implementation Strategy

### MVP First (User Story 1 — P1)

Setup + Foundational → **US1 (#52, segurança)** → validar isolado → demo. É o maior risco do lote.

### Quick win alternativo

**US4 (#54, size S)** é o slice mais isolado (2 linhas + 1 teste) — bom para aquecer o pipeline antes do MVP, se preferir entregar valor cedo.

### Incremental Delivery

US1 → US2 → US3 → US4, cada um fechando seu ticket W0→W3 sem quebrar os anteriores. `/timeline` byte-idêntico travado pelo CT-014 em todas as etapas.

---

## Notes

- Tests RED obrigatórios (constituição §I); verificar que falham antes de implementar.
- Cada decisão-chave exige citação canônica ≥4 linhas (constituição §IX) — ver `research.md`.
- Commit por ticket/PR para `dev`; tickets fechados são histórico auditável (não deletar).
- Sem `npm` em nenhum script/doc (ADR-0012).
