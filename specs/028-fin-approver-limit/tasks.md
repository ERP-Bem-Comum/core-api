---
description: 'Task list — feature 028 validação de alçada do aprovador'
---

# Tasks: Validação de alçada do aprovador no Lançar Documento

**Input**: Design documents from `/specs/028-fin-approver-limit/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: OBRIGATÓRIOS — projeto é TDD fail-first W0→W3 (Constituição, Princípio I). Cada fase escreve testes RED antes de tocar `src/`.

**Organization**: por user story (US1/US2/US3). Cada fase mapeia a um **ticket de pipeline** (1 módulo/sessão — ADR-0014):

| Fase                                   | User Story    | Ticket de pipeline                   | Módulo    |
| -------------------------------------- | ------------- | ------------------------------------ | --------- |
| Phase 2 (Foundational) + Phase 4 (US2) | — / US2       | **FIN-APPROVER-LIMIT-AUTH** (M)      | auth      |
| Phase 3 (US1)                          | US1 (P1, MVP) | **FIN-APPROVER-LIMIT-POLICY** (M)    | financial |
| Phase 5 (US3)                          | US3 (P3)      | **FIN-APPROVER-LIMIT-CASCADE** (S→M) | financial |

**Ordem de execução dos tickets**: AUTH (Foundational bloqueia tudo) → POLICY (MVP) → CASCADE.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: paralelizável (arquivos distintos, sem dependência pendente)
- **[Story]**: US1/US2/US3 (fases de story); Setup/Foundational/Polish sem label

---

## Phase 1: Setup

**Purpose**: inicialização do processo (sem código de produção).

- [ ] T001 Inicializar os 3 tickets de pipeline: `pnpm run pipeline:state init FIN-APPROVER-LIMIT-AUTH --size M`, `... FIN-APPROVER-LIMIT-POLICY --size M`, `... FIN-APPROVER-LIMIT-CASCADE --size S`, cada um com `000-request.md` (escopo + CAs da spec) em `.claude/.pipeline/<TICKET>/`
- [ ] T002 [P] Confirmar baseline verde antes de tocar `src/`: `pnpm run typecheck && pnpm run lint && pnpm test` na branch `028-fin-approver-limit`

---

## Phase 2: Foundational (Blocking) — ticket FIN-APPROVER-LIMIT-AUTH (auth core)

**Purpose**: alçada como atributo do papel + leitura via public-api. **BLOQUEIA US1 e US3** (sem dado legível, não há o que validar).

**⚠️ CRITICAL**: nenhuma story de validação começa antes disto.

### Tests (W0 RED) ⚠️ escrever primeiro, garantir que FALHAM

- [ ] T003 [P] Teste RED do agregado em `src/modules/auth/domain/authorization/role.test.ts`: `Role.create/update` aceita `approvalLimitCents` válido (≥0) e rejeita `<0` com `role-approval-limit-invalid`; `null` = sem alçada
- [ ] T004 [P] Teste RED de integração em `tests/integration/auth/approver-authority.test.ts`: `getApproverAuthority` (MAX dos papéis com `payable:approve`; `canApprove=false` sem permissão; `limitCents=null` sem limite; `null` se usuário inexistente) e `listApproversWithAuthority`

### Implementation

- [ ] T005 [Foundational] Adicionar `approvalLimit: Money | null` ao agregado `Role` + erro `role-approval-limit-invalid` (smart constructor valida via `Money.fromCents`, `<0` falha) em `src/modules/auth/domain/authorization/role.ts`
- [ ] T006 [Foundational] Adicionar coluna `approval_limit_cents` `bigint('approval_limit_cents')` NULL ao `authRole` em `src/modules/auth/adapters/persistence/schemas/mysql.ts`
- [ ] T007 [Foundational] Gerar migration (`pnpm run db:generate`), versionar em `src/modules/auth/adapters/persistence/migrations/mysql/`, e validar o `ALTER ... ADD COLUMN` no MySQL real (INSTANT 8.4, **sem hint `ALGORITHM`** — ver memória do #274)
- [ ] T008 [Foundational] Persistir/rehidratar `approvalLimit` no mapper/repo do role em `src/modules/auth/adapters/persistence/repos/` (row `approval_limit_cents` ↔ `Money | null`)
- [ ] T009 [P] [Foundational] Definir `ApproverAuthorityView` + `getApproverAuthority` + `listApproversWithAuthority` no port `src/modules/auth/application/ports/user-read.ts`
- [ ] T010 [Foundational] Implementar as queries em `src/modules/auth/adapters/persistence/repos/user-read.drizzle.ts` (JOIN `auth_user_role`→`auth_role`→`auth_role_permission`→`auth_permission`, filtro `payable:approve`, `MAX(approval_limit_cents)` por usuário)
- [ ] T011 [Foundational] Re-exportar os tipos/port estendidos em `src/modules/auth/public-api/read.ts`

**Checkpoint**: alçada persistida e legível via `public-api`. US1 e US3 desbloqueadas.

---

## Phase 3: User Story 1 — bloquear aprovador sem alçada suficiente (Priority: P1) 🎯 MVP

**Ticket**: FIN-APPROVER-LIMIT-POLICY (financial). **Goal**: recusar documento cujo aprovador tem alçada < líquido; aceitar quando ≥. **Independent Test**: com aprovador de alçada conhecida, lançar documentos de líquido abaixo/igual/acima e verificar recusa só no acima.

### Tests (W0 RED) ⚠️

- [ ] T012 [P] [US1] Teste RED do domínio em `src/modules/financial/domain/document/approval-policy.test.ts`: `checkApprover` cobre a tabela-verdade (`null`→`approver-not-found`; `!canApprove`→`approver-missing-permission`; `limit===null`→`approver-limit-exceeded`; `limit<net`→`approver-limit-exceeded`; `limit>=net`→`ok`)
- [ ] T013 [P] [US1] Teste RED de integração em `tests/integration/financial/document-approver-limit.test.ts`: `POST /financial/documents` com aprovador de alçada < líquido → 4xx PT sem vazar interno; ≥ líquido → criado

### Implementation

- [ ] T014 [P] [US1] Criar port `ApproverAuthorityReader` (+ tipo `ApproverAuthority { userId, canApprove, limit: Money|null }`) em `src/modules/financial/application/ports/approver-authority-reader.ts`
- [ ] T015 [US1] Implementar `checkApprover` (puro, `Result<void, ApprovalError>`) em `src/modules/financial/domain/document/approval-policy.ts`
- [ ] T016 [US1] Adapter do reader (delegando a `buildAuthUserReadPort`, traduzindo `limitCents → Money`) e wire em `src/modules/financial/adapters/http/composition.ts`
- [ ] T017 [US1] Integrar `checkApprover` no `save-document.ts` (create) quando há `approverRef` e `netValue !== null` em `src/modules/financial/application/use-cases/save-document.ts`
- [ ] T018 [US1] Integrar `checkApprover` na submissão Draft→Open em `src/modules/financial/application/use-cases/save-draft.ts` (#91)
- [ ] T019 [US1] Mapear `approver-not-found`/`approver-missing-permission`/`approver-limit-exceeded` → 4xx PT (dicionário) sem vazar interno em `src/modules/financial/adapters/http/error-mapping.ts`

**Checkpoint**: MVP — validação de alçada funcional no create e no submit.

---

## Phase 4: User Story 2 — definir a alçada de um papel (Priority: P2)

**Ticket**: FIN-APPROVER-LIMIT-AUTH (resto — borda). **Goal**: gerir a alçada do papel via HTTP. **Independent Test**: definir alçada de um papel, consultar e confirmar persistência/atualização. **Depende de**: Phase 2 (Foundational).

### Tests (W0 RED) ⚠️

- [ ] T020 [P] [US2] Teste RED de borda em `tests/integration/auth/roles-approval-limit.test.ts`: `POST /api/v1/roles` e `PATCH /api/v1/roles/:id` aceitam `approvalLimitCents` (int ≥0 ou null) e o refletem na resposta; `<0`/não-int → 400

### Implementation

- [ ] T021 [P] [US2] Adicionar `approvalLimitCents: z.number().int().min(0).nullable().optional()` aos schemas em `src/modules/auth/adapters/http/roles-schemas.ts` (request + response)
- [ ] T022 [US2] `create-role`/`update-role` aceitam e propagam `approvalLimitCents` ao agregado em `src/modules/auth/application/use-cases/{create-role,update-role}.ts`
- [ ] T023 [US2] `roles-plugin` passa o limite ao use-case e inclui na resposta em `src/modules/auth/adapters/http/roles-plugin.ts`

**Checkpoint**: alçada gerenciável pela borda; US1 passa a operar com dados reais.

---

## Phase 5: User Story 3 — cascata para nível superior (Priority: P3)

**Ticket**: FIN-APPROVER-LIMIT-CASCADE (financial). **Goal**: quando a alçada do aprovador indicado é insuficiente, encaminhar ao próximo aprovador com alçada suficiente. **Independent Test**: cadeia A(R$1k)→B(R$10k), documento R$5k indicado a A → encaminha a B; nenhum suficiente → erro. **Depende de**: US1 (reusa `approval-policy.ts` e o reader).

### Tests (W0 RED) ⚠️

- [ ] T024 [P] [US3] Teste RED do domínio em `src/modules/financial/domain/document/approval-policy.test.ts`: `escalate` escolhe o **menor** limite ≥ líquido; conjunto vazio → `no-approver-with-sufficient-limit`
- [ ] T025 [P] [US3] Teste RED de integração em `tests/integration/financial/document-approver-cascade.test.ts`: documento indicado a aprovador insuficiente é encaminhado ao próximo suficiente; sem nenhum → 4xx PT

### Implementation

- [ ] T026 [US3] Implementar `escalate` (puro, `Result<ApproverAuthority, ApprovalError>`) em `src/modules/financial/domain/document/approval-policy.ts`
- [ ] T027 [US3] Quando `checkApprover` falha por limite, chamar `reader.list()` + `escalate` e persistir o `approverRef` efetivo no fluxo de create/submit (`save-document.ts`/`save-draft.ts`)
- [ ] T028 [US3] Mapear `no-approver-with-sufficient-limit` → 4xx PT em `src/modules/financial/adapters/http/error-mapping.ts`

**Checkpoint**: cascata funcional; todas as user stories independentemente testáveis.

---

## Phase 6: Polish & Cross-Cutting

- [ ] T029 [P] Validar `quickstart.md` ponta a ponta (curl/`fastify.inject` + coleção Bruno se aplicável)
- [ ] T030 Gate W3 por ticket: `pnpm run typecheck && pnpm run format:check && pnpm run lint && pnpm test` + `pnpm run test:integration:auth` + `pnpm run test:integration:financial` (rodar format+lint na sessão principal — sub-agentes pulam o hook prettier)
- [ ] T031 [P] Verificar autocontenção (FR-007a): `financial` importa só `auth/public-api/read.ts`; zero toque em `mass-approver-role`/#45/spec 005; `ALTER` validado no MySQL real
- [ ] T032 Atualizar a issue #289 (e checklist da #89) com o status; fechar quando os 3 tickets fecharem verdes

---

## Dependencies & Execution Order

### Ordem por ticket (1 módulo/sessão)

1. **FIN-APPROVER-LIMIT-AUTH** (auth) = Phase 2 (Foundational) **+** Phase 4 (US2). Bloqueia os demais.
2. **FIN-APPROVER-LIMIT-POLICY** (financial) = Phase 3 (US1, MVP). Depende do Foundational.
3. **FIN-APPROVER-LIMIT-CASCADE** (financial) = Phase 5 (US3). Depende de US1.

### User Story Dependencies

- **Foundational (Phase 2)**: pré-requisito de US1, US2, US3.
- **US1 (P1)**: após Foundational. Independente de US2.
- **US2 (P2)**: após Foundational. Independente de US1 (mesma sessão/ticket do auth).
- **US3 (P3)**: após US1 (reusa `approval-policy.ts` + `reader.list`).

### Parallel Opportunities

- Setup: T002 [P].
- Foundational: T003/T004 (testes) [P]; T009 [P] (port, arquivo distinto do schema).
- US1: T012/T013 (testes) [P]; T014 [P] (port).
- US2: T020 [P]; T021 [P].
- US3: T024/T025 (testes) [P].
- Polish: T029/T031 [P].

---

## Implementation Strategy

### MVP First

1. Phase 1 (Setup) → Phase 2 (Foundational/AUTH) → Phase 3 (US1/POLICY).
2. **STOP & VALIDATE**: documento recusa aprovador sem alçada; aceita com alçada ≥ líquido.
3. Demo do MVP (controle de alçada já entrega a #289 no essencial).

### Incremental

- - US2 (borda de gestão da alçada) → gestão operável pelo negócio.
- - US3 (cascata) → automação de encaminhamento.

### Notas

- Verificar testes FALHANDO antes de implementar (W0 RED).
- `[P]` = arquivos distintos sem dependência.
- Autocontenção é invariante (FR-007a): nada de "ticket que resolve outro ticket".
- Citação canônica (Princípio IX) já registrada no `research.md` (Vernon, _Think Minimalistic_).
