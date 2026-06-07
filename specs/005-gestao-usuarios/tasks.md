# Tasks: Gestão Administrativa de Usuários

**Input**: Design documents from `/specs/005-gestao-usuarios/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: **OBRIGATÓRIOS** — a constituição (Princípio I: TDD fail-first W0→W3) exige teste RED antes de tocar `src/`. Cada slice de implementação é precedido por sua suíte RED.

**Organization**: agrupado por user story (P1→P3). Cada story estende o módulo `auth` (decisão DDD, `research.md` D1) e mapeia a um ou mais tickets de pipeline `.claude/.pipeline/<TICKET>/`.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: paralelizável (arquivos diferentes, sem dependência pendente)
- **[Story]**: US1..US7 (mapeia spec.md)
- Paths reais sob `src/modules/auth/` e `tests/modules/auth/` (mirror)

> **Mapa de tickets** (cada um percorre W0→W3 via `pnpm run pipeline:state init <ticket> --size <S|M>`):
> `AUTH-USER-VO-CPF`, `AUTH-USER-VO-TELEPHONE`, `AUTH-USER-PROFILE-AGG`, `AUTH-USER-SCHEMA-PROFILE`,
> `AUTH-USECASE-LIST-USERS`, `AUTH-USECASE-GET-USER`, `AUTH-USECASE-CREATE-USER`,
> `AUTH-USECASE-UPDATE-PROFILE`, `AUTH-USECASE-ACTIVATE-DEACTIVATE`, `AUTH-USER-PHOTO`, `AUTH-USER-ME`.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: confirmar pré-condições; nenhum projeto novo (o módulo `auth` já existe).

- [ ] T001 Confirmar que `StoragePort` (S3/MinIO, ADR-0019) e `EmailPort` (ADR-0010) já estão disponíveis para reuso em `src/modules/auth/application/ports/` e `src/shared/ports/`; anotar os símbolos exatos.
- [ ] T002 [P] Confirmar fluxos de senha reusáveis (`request-password-reset`, `confirm-password-reset`) em `src/modules/auth/application/use-cases/` e o canal de email que disparam.
- [ ] T003 [P] Mapear o agregado `User` atual em `src/modules/auth/domain/identity/user/` (campos, `ActiveUser`, eventos existentes) para a extensão da Phase 2.

---

## Phase 2: Foundational (Blocking Prerequisites)

**⚠️ CRITICAL**: bloqueia todas as user stories. VOs + extensão do agregado + migration + read model.

### Tests RED (escrever e ver falhar primeiro)

- [ ] T004 [P] Suíte RED de `Cpf` em `tests/modules/auth/domain/identity/cpf.test.ts` (normaliza dígitos; valida dígitos verificadores; rejeita inválido).
- [ ] T005 [P] Suíte RED de `Telephone` em `tests/modules/auth/domain/identity/telephone.test.ts` (normaliza; forma BR; rejeita inválido).
- [ ] T006 [P] Suíte RED de `ProfilePhotoRef` em `tests/modules/auth/domain/identity/profile-photo-ref.test.ts` (chave válida; rejeita vazia).
- [ ] T007 Suíte RED da extensão do agregado em `tests/modules/auth/domain/identity/user/profile.test.ts` (`updateProfile` atômico; `attachPhoto`/`removePhoto`; `activate`/`deactivate` idempotentes mapeando `status` `active`/`disabled` + `disabledAt`; invariante de auto-desativação).

### Implementação

- [ ] T008 [P] Implementar VO `Cpf` em `src/modules/auth/domain/identity/cpf.ts` (branded + smart constructor `Result`).
- [ ] T009 [P] Implementar VO `Telephone` em `src/modules/auth/domain/identity/telephone.ts`.
- [ ] T010 [P] Implementar VO `ProfilePhotoRef` em `src/modules/auth/domain/identity/profile-photo-ref.ts`.
- [ ] T011 Estender o agregado em `src/modules/auth/domain/identity/user/user.ts`: campos `cpf`, `telephone`, `photo`, `collaboratorId`; funções `updateProfile`, `attachPhoto`, `removePhoto`; ajustar `activate`/`deactivate` ao `status` existente (`active`/`disabled` + `disabledAt` bicondicional). (depende de T008–T010)
- [ ] T012 Adicionar eventos em `src/modules/auth/domain/identity/user/events.ts`: `UserCreated`, `UserProfileUpdated`, `UserActivated`, `UserDeactivated` (EN passado). (depende de T011)
- [ ] T013 Estender o schema em `src/modules/auth/adapters/persistence/schemas/mysql.ts`: colunas novas em `auth_user` (`cpf varchar(11)`, `telephone varchar(13)`, `image_url varchar null`, `collaborator_id varchar null`) + índice de busca por nome. **Não** criar boolean de status (reusar `status`/`disabled_at`). (depende de T011)
- [ ] T014 Gerar a migration com `pnpm run db:generate` e conferir à mão CHARSET/COLLATE e CHECKs (ADR-0020); versionar em `.../migrations/mysql/`. (depende de T013)
- [ ] T015 Atualizar o mapper row↔domínio (`Result`) em `src/modules/auth/adapters/persistence/repos/user-repository.drizzle.ts` (+ `.in-memory.ts`) para os campos de perfil. (depende de T011, T013)

**Checkpoint**: VOs, agregado estendido, migration e mapper prontos — user stories podem começar.

---

## Phase 3: User Story 1 - Listar, buscar e filtrar (Priority: P1) 🎯 MVP

**Goal**: listagem paginada com busca por nome e filtro por status.

**Independent Test**: popular N usuários; conferir paginação (5/10/25), busca parcial CI e filtro `active|disabled|all`.

**Ticket**: `AUTH-USECASE-LIST-USERS`.

### Tests RED

- [ ] T016 [P] [US1] Suíte RED do use case em `tests/modules/auth/application/use-cases/list-users.test.ts` (paginação/busca/filtro com repo fake; meta correta; busca vazia → zero itens).
- [ ] T017 [US1] Contract suite RED do read model em `tests/modules/auth/adapters/persistence/user-query.suite.ts` (consumida por in-memory e Drizzle/MySQL).

### Implementação

- [ ] T018 [P] [US1] Definir port `UserQuery` em `src/modules/auth/application/ports/user-query.ts` (`list({page,pageSize,search?,status})` → `{items, meta}`).
- [ ] T019 [US1] Implementar use case em `src/modules/auth/application/use-cases/list-users.ts` (`Result`; valida pageSize ∈ {5,10,25}). (depende de T018)
- [ ] T020 [P] [US1] Adapter in-memory do `UserQuery` em `src/modules/auth/adapters/persistence/repos/user-query.in-memory.ts`. (depende de T018)
- [ ] T021 [US1] Adapter Drizzle do `UserQuery` em `src/modules/auth/adapters/persistence/repos/user-query.drizzle.ts` (offset + LIKE CI + filtro status; índice de nome). (depende de T018)
- [ ] T022 [US1] Rota `GET /api/v1/users` em `src/modules/auth/adapters/http/` (Zod query + paginação) conforme `contracts/http-users.md`. (depende de T019)
- [ ] T023 [P] [US1] Subcomando CLI `listar-usuarios` (`--page/--page-size/--status/--search`) conforme `contracts/cli-users.md`. (depende de T019)

**Checkpoint**: US1 funcional e testável de forma independente (MVP).

---

## Phase 4: User Story 2 - Ver detalhe (Priority: P1)

**Goal**: detalhe completo por id (inclui telefone, foto, `massApprovalPermission` read-only, `collaboratorId`).

**Independent Test**: dado um id válido, retorna todos os campos; id inexistente → não encontrado.

**Ticket**: `AUTH-USECASE-GET-USER`.

### Tests RED

- [ ] T024 [P] [US2] Suíte RED em `tests/modules/auth/application/use-cases/get-user.test.ts` (achado; não encontrado; inclui flag mass-approve lida do RBAC).

### Implementação

- [ ] T025 [US2] Use case em `src/modules/auth/application/use-cases/get-user.ts` (compõe perfil + permissão efetiva `contract:mass-approve` read-only). (depende de Phase 2)
- [ ] T026 [US2] Rota `GET /api/v1/users/:id` em `src/modules/auth/adapters/http/` (404 sem vazar). (depende de T025)
- [ ] T027 [P] [US2] Subcomando CLI `ver-usuario --id`. (depende de T025)

**Checkpoint**: US1 + US2 funcionais.

---

## Phase 5: User Story 3 - Criar usuário (convite) (Priority: P2)

**Goal**: criar usuário ativo, sem senha, disparando convite por email.

**Independent Test**: cadastro válido aparece na listagem e emite `UserCreated`; email duplicado → conflito; inválido → erro por campo.

**Ticket**: `AUTH-USECASE-CREATE-USER`.

### Tests RED

- [ ] T028 [P] [US3] Suíte RED em `tests/modules/auth/application/use-cases/create-user-by-admin.test.ts` (cria `active` sem senha; emite `UserCreated`; recusa email duplicado; valida CPF/email/telefone).

### Implementação

- [ ] T029 [US3] Use case `create-user-by-admin` em `src/modules/auth/application/use-cases/create-user-by-admin.ts` — **distinto** do `register-user` (sem senha + convite). (depende de Phase 2)
- [ ] T030 [US3] Disparar o convite de ativação reusando `request-password-reset`/EmailPort a partir de `UserCreated` (wiring no composition root / consumidor do evento). (depende de T029)
- [ ] T031 [US3] Rota `POST /api/v1/users` (multipart/ref para foto opcional) conforme contrato. (depende de T029)
- [ ] T032 [P] [US3] Subcomando CLI `criar-usuario`. (depende de T029)

**Checkpoint**: US1–US3 funcionais.

---

## Phase 6: User Story 4 - Editar perfil (Priority: P2)

**Goal**: edição atômica dos dados cadastrais.

**Independent Test**: alterar campo e confirmar via detalhe; email em conflito → recusa; inválido → nada persiste.

**Ticket**: `AUTH-USECASE-UPDATE-PROFILE`.

### Tests RED

- [ ] T033 [P] [US4] Suíte RED em `tests/modules/auth/application/use-cases/update-user-profile.test.ts` (atomicidade; conflito de email; validação por campo).

### Implementação

- [ ] T034 [US4] Use case `update-user-profile` em `src/modules/auth/application/use-cases/update-user-profile.ts`. (depende de Phase 2)
- [ ] T035 [US4] Rota `PUT /api/v1/users/:id`. (depende de T034)
- [ ] T036 [P] [US4] Subcomando CLI `editar-usuario`. (depende de T034)

**Checkpoint**: US1–US4 funcionais.

---

## Phase 7: User Story 5 - Ativar e desativar (Priority: P2)

**Goal**: transição de status idempotente, com proteção de auto-desativação.

**Independent Test**: desativar ativo → `disabled`; reativar → `active`; repetir → no-op.

**Ticket**: `AUTH-USECASE-ACTIVATE-DEACTIVATE`.

### Tests RED

- [ ] T037 [P] [US5] Suíte RED em `tests/modules/auth/application/use-cases/activate-deactivate-user.test.ts` (idempotência; `status`/`disabled_at`; auto-desativação bloqueada).

### Implementação

- [ ] T038 [US5] Use cases `activate-user` / `deactivate-user` em `src/modules/auth/application/use-cases/`. (depende de Phase 2)
- [ ] T039 [US5] Rotas `PATCH /api/v1/users/:id/activate` e `.../deactivate` (idempotentes). (depende de T038)
- [ ] T040 [P] [US5] Subcomandos CLI `ativar-usuario` / `desativar-usuario`. (depende de T038)

**Checkpoint**: US1–US5 funcionais.

---

## Phase 8: User Story 6 - Foto de perfil (Priority: P3)

**Goal**: enviar/trocar/remover foto via storage de objetos.

**Independent Test**: enviar imagem válida → detalhe referencia a foto; tipo/tamanho inválido → recusa.

**Ticket**: `AUTH-USER-PHOTO` (integração — atrás de `*_INTEGRATION=1`).

### Tests RED

- [ ] T041 [P] [US6] Suíte RED em `tests/modules/auth/application/use-cases/set-profile-photo.test.ts` (valida tipo/tamanho; usa `StoragePort` fake).

### Implementação

- [ ] T042 [US6] Use case `set-profile-photo` (+ remoção) em `src/modules/auth/application/use-cases/set-profile-photo.ts` (valida `image/jpeg|png|webp`, limite de tamanho). (depende de Phase 2)
- [ ] T043 [US6] Rotas `PUT /api/v1/users/:id/photo` e `DELETE .../photo`. (depende de T042)
- [ ] T044 [P] [US6] Subcomando CLI `definir-foto-usuario --file`. (depende de T042)

**Checkpoint**: US1–US6 funcionais.

---

## Phase 9: User Story 7 - Minha Conta e senha (Priority: P3)

**Goal**: autosserviço de perfil + redefinição de senha.

**Independent Test**: usuário edita o próprio perfil; nega edição de terceiros; redefine a própria senha.

**Ticket**: `AUTH-USER-ME`.

### Tests RED

- [ ] T045 [P] [US7] Suíte RED em `tests/modules/auth/adapters/http/me.test.ts` (self edita; terceiros → 403; password-reset reusa fluxo).

### Implementação

- [ ] T046 [US7] Rotas `GET /api/v1/me` e `PUT /api/v1/me` (autorização self) em `src/modules/auth/adapters/http/`. (depende de US4)
- [ ] T047 [US7] Rota `POST /api/v1/me/password-reset` reusando `request-password-reset`. (depende de Phase 1)

**Checkpoint**: todas as stories funcionais.

---

## Phase 10: Polish & Cross-Cutting Concerns

- [ ] T048 [P] Autorização fail-closed em todas as rotas administrativas (permissions `user:*`); alinhar nomes com `006-gestao-acessos`.
- [ ] T049 E2E da CLI real em `tests/cli/` (listar→criar→ativar) seguindo o padrão `contracts.cli.test.ts`.
- [ ] T050 Integração MySQL + MinIO (`pnpm run test:integration`) para `user-query.drizzle` e foto — atrás de `*_INTEGRATION=1`.
- [ ] T051 [P] Rodar `quickstart.md` ponta a ponta e ajustar divergências.
- [ ] T052 Gate W3 final por ticket: `pnpm run typecheck && pnpm run format:check && pnpm run lint && pnpm test`.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (1)**: imediato.
- **Foundational (2)**: depende de 1 — **BLOQUEIA** todas as stories (VOs + agregado + migration + mapper).
- **User Stories (3–9)**: dependem de 2. US1/US2 (P1) primeiro; US3–US5 (P2); US6/US7 (P3).
- **Polish (10)**: depende das stories desejadas.

### Dependências entre stories

- **US2/US3/US4/US5** dependem do agregado estendido (Phase 2); são independentes entre si após isso.
- **US7** reusa a edição da US4 (perfil) e o reset da Phase 1.
- **US1** é a base de navegação (MVP) — entregar e validar primeiro.

### Parallel Opportunities

- T004–T006 (suítes RED dos VOs) e T008–T010 (impl dos VOs) em paralelo.
- Após Phase 2, cada user story pode ser tocada por um dev distinto (um ticket cada).
- Dentro de uma story: suíte RED [P] → use case → rota/CLI [P].

---

## Parallel Example: Foundational (Phase 2)

```bash
# Suítes RED dos VOs em paralelo:
T004 Cpf · T005 Telephone · T006 ProfilePhotoRef
# Implementações dos VOs em paralelo (após RED):
T008 cpf.ts · T009 telephone.ts · T010 profile-photo-ref.ts
```

---

## Implementation Strategy

### MVP First (US1)

1. Phase 1 (Setup) → Phase 2 (Foundational, CRÍTICO) → Phase 3 (US1).
2. **PARAR e VALIDAR**: listar/buscar/filtrar via CLI `memory` + contract suite.
3. Demonstrar à P.O.

### Incremental (um ticket de pipeline por slice)

1. Foundational pronto → base.
2. US1 → US2 (leitura completa) → demo.
3. US3 (criar+convite) → US4 (editar) → US5 (ativar/desativar) → demo.
4. US6 (foto) → US7 (minha conta) → demo.
5. Cada slice fecha W0→W3 (RED → GREEN → review → gate) antes da próxima.

---

## Notes

- **Tests RED são pré-condição** (W0) — não há implementação sem suíte vermelha antes (Princípio I).
- Cada story ≈ um ticket `.claude/.pipeline/<TICKET>/`; abrir com `pnpm run pipeline:state init <ticket> --size <S|M>`.
- Idioma: código EN; mensagens CLI em PT (`cli/formatters/`); erros internos kebab-case EN.
- Reuso, não reescrita: `register-user`, `request/confirm-password-reset`, `StoragePort`, `EmailPort`, schema `auth_user` (status existente).
- `006-gestao-acessos` consome os nomes de permission `user:*` definidos no T048.
