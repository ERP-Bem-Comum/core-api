# Execution Log — 005-gestao-usuarios

> **Como funciona:** cada item ⬜ é um ticket de pipeline W0→W3 (`pnpm run pipeline:state init …`).
> Ao fechar: marco ✅ aqui, marco os checkboxes correspondentes em `tasks.md`, e faço **um commit por
> ticket**. Fonte de verdade dos tickets: `.claude/.pipeline/` + `pnpm run pipeline:status`. Borda
> HTTP-first (ADR-0037): validação E2E por coleção Bruno + `fastify.inject`, sem CLI.

**Status:** 🔄 em execução · **Branch:** `005-gestao-usuarios` · **Atualizado:** 2026-06-07

---

## Sequência (ordem de execução)

### Fase 0 — Fundação ✅ CONCLUÍDA

- [x] ADR-0037 (HTTP-first; aposenta CLI embutida) + alinhamento da spec 005
- [x] `AUTH-USER-VO-CPF` · `AUTH-USER-VO-TELEPHONE` · `AUTH-USER-VO-PROFILE-PHOTO-REF`
- [x] `AUTH-USER-PROFILE-AGG` (agregado + mapper + schema + migration 0004)

### Fase 1 — US1 Listar/buscar/filtrar (P1, MVP) 🔄

- [x] `AUTH-USECASE-LIST-USERS` — port `UserQuery` (read model) + use case + adapter in-memory (T016/T018/T019/T020) ✅ closed-green
- [x] `AUTH-HTTP-LIST-USERS` — adapter Drizzle `UserQuery` + rota `GET /api/v1/users` (T021/T022) ✅ closed-green (rota testada via `fastify.inject`, 8 CAs; designs consultados com `drizzle-orm-expert` + `fastify-server-expert`). **Pendentes:** coleção Bruno `users/list/` (T023, com `bruno-api-client-expert` + Docker) e integração real (`test:integration:auth`).
  - **📌 Notas de preparação (achados do estudo da borda HTTP):**
    - A rota `GET /api/v1/users` **espelha o padrão `/api/v1` do módulo `partners`** (`src/modules/partners/adapters/http/supplier-plugin.ts` + `supplier-list-query.ts` + `partners-schemas.ts`) — listagem paginada Zod/OpenAPI — **não** o padrão `auth` (`/api/v2/auth`, registro de credencial).
    - Registro no **edge shell** `src/server.ts` sob `/api/v1` (ADR-0028 localização da borda, ADR-0033 versionamento v1).
    - Decisão a confirmar no W1: novo plugin `auth/adapters/http/users-plugin.ts` (User vive no `auth`, mas roteia como `partners`); ou avaliar um sub-escopo HTTP. Handler usa `sendResult` + mapeia `ListUsersError` → status (`invalid-page`/`invalid-page-size` → 422; `user-query-unavailable` → 503).
    - Adapter Drizzle `UserQuery`: SELECT com `LIKE` CI no nome + filtro status + `LIMIT/OFFSET` + `COUNT` (espelhar query paginada de `partners`); índice de busca por nome. Validação real só com Docker (`test:integration:auth`).
    - Validação sem Docker: rota via `fastify.inject` injetando o adapter **in-memory**. Drizzle real + `bru run` = pendência pré-merge.
  - **🗺️ Plano de implementação (arquivos, na ordem):**
    1. `auth/adapters/http/users-schemas.ts` — Zod querystring (`page`,`limit`,`search?`,`status?`) + response paginado (espelha `partners/adapters/http/partners-schemas.ts`).
    2. Adapter Drizzle `auth/adapters/persistence/repos/user-query.drizzle.ts` — `SELECT … LIKE` CI + filtro status + `LIMIT/OFFSET` + `COUNT`; índice de nome no schema (nova migration).
    3. `auth/adapters/http/users-plugin.ts` — `usersHttpPlugin(deps, {requireAuth, authorize}) => FastifyPluginAsyncZodOpenApi`; rota `GET /users`; handler chama `listUsers` use case, `sendResult` (mapeia `invalid-page*`→422, `user-query-unavailable`→503); preHandler `authorize('user:list')`.
    4. `auth/adapters/http/composition.ts` — adicionar `userQuery` (Drizzle) e `listUsers` a `AuthHttpDeps`/`buildAuthHttpDeps`.
    5. `auth/public-api/http.ts` — exportar `usersHttpPlugin`.
    6. `src/server.ts` — registrar `{ plugin: usersHttpPlugin(authDeps, {requireAuth, authorize}), prefix: '/api/v1' }` (padrão dos partners, linhas ~100-143).
    7. W0: `tests/modules/auth/adapters/http/users-list.route.test.ts` via `fastify.inject` com adapter in-memory (RED).
    8. Coleção Bruno `api-collections/users/list/*.bru` (`bru run` = pendência Docker).
    - **Templates exatos a espelhar:** `partners/adapters/http/supplier-plugin.ts` (rota), `supplier-list-query.ts` (parse query→filtro+paginação), e o registro em `src/server.ts:100-143`.

### Fase 2 — US2 Detalhe (P1) ✅

- [x] `AUTH-GET-USER` — use case `get-user` (perfil + mass-approve read-only das roles) **+** rota `GET /api/v1/users/:id` (combinados; reusa `UserReader.findById`, sem Drizzle novo) (T024/T025/T026) ✅ closed-green · 9 testes (use case + inject)
  - [ ] coleção Bruno `users/detail/` (T027, pendência Docker)

### Fase 3 — US3 Criar + convite (P2) ✅

- [x] `AUTH-USECASE-CREATE-USER` — domínio (`UserCreated` + `User.create`) + port `InviteMailer` + use case `create-user-by-admin` (T028/T029) ✅ closed-green · 8 testes de **segurança** (`security-backend-expert`).
- [x] `AUTH-HTTP-CREATE-USER` — adapter `invite-mailer.email` (`nodemailer-email-expert`) + wiring (reusa `dummyPasswordHash` como `unusablePasswordHash`) + rota `POST /api/v1/users` (`user:create`, 201/409/422) (T030/T031/T032) ✅ closed-green · 5 testes inject. **US3 entregue end-to-end.** Pendência: Bruno `users/create/` + email real (SMTP/Docker).

#### (planejamento original)

- [ ] `AUTH-USECASE-CREATE-USER` — `create-user-by-admin` (ativo, sem senha, `UserCreated`) (T028–T029)
- [ ] `AUTH-INVITE-ON-CREATE` — convite de ativação por email a partir de `UserCreated` (EmailPort/reset) (T030)
- [ ] `AUTH-HTTP-CREATE-USER` — rota `POST /api/v1/users` + Bruno `users/create/` (T031–T032)

### Fase 4 — US4 Editar (P2) ✅

- [x] `AUTH-USECASE-UPDATE-PROFILE` — estende `User.updateProfile` (email opcional) + use case `update-user-profile` (atômico; unicidade de email → 409; patch parcial) (T033–T034) ✅ closed-green · 7 testes
- [x] `AUTH-HTTP-UPDATE-USER` — rota `PUT /api/v1/users/:id` (`user:update`, 200/404/409/422) + wiring (composition/server) + `FIELD_VALIDATION_STATUS` compartilhado com POST (T035) ✅ closed-green · 6 testes inject. **US4 entregue end-to-end.** Pendência: Bruno `users/update/` (T036).

### Fase 5 — US5 Ativar/Desativar (P2) ✅

- [x] `AUTH-USECASE-ACTIVATE-DEACTIVATE` — `activateUser`/`deactivateUser` idempotentes sobre `enable`/`disable` (no-op = `event: null`, sem `save`); proteção `cannot-deactivate-self` (T037–T038) ✅ closed-green · 7 testes
- [x] `AUTH-HTTP-STATUS` — rotas `PATCH /api/v1/users/:id/activate|deactivate` (`user:activate`/`user:deactivate`; `actorId` do JWT) + wiring + 4 testes irmãos atualizados (T039) ✅ closed-green · 7 testes inject. **US5 entregue end-to-end.** Pendência: Bruno `users/status/` (T040).

### Fase 6 — US6 Foto (P3) ✅

- [x] `AUTH-USECASE-SET-PHOTO` — port `ProfilePhotoStorage` (próprio do auth, ADR-0006) + use cases `setProfilePhoto`/`removeProfilePhoto` (valida MIME allowlist + ≤5 MiB) + adapter in-memory (T041–T042) ✅ closed-green · 7 testes
- [x] `AUTH-HTTP-PHOTO` — rotas `PUT|DELETE /api/v1/users/:id/photo` (`user:update`; octet-stream + mimeType na query; magic bytes; rate-limit escrita) + adapter S3/MinIO + wiring (T043) ✅ closed-green · 7 testes inject. **US6 entregue end-to-end.** Pendência: Bruno foto (asset binário) + integração MinIO (T044, opt-in).

### Fase 7 — US7 Minha Conta (P3) ✅

- [x] `AUTH-HTTP-ME` — plugin `meHttpPlugin`: `GET|PUT /api/v1/me` (self por construção via `req.userId`; PUT restrito a name/telephone) + `POST /me/password-reset` (202, reusa `requestPasswordReset`) (T045–T047) ✅ closed-green · 6 testes inject. **US7 entregue end-to-end.** Pendência: Bruno `users/me/` (T047).

### Fase 8 — Fechamento 005 🔄

- [x] Coleção Bruno `api-collections/auth/` **completa** (US1–US7 + segurança) + `pnpm run test:e2e:bruno:auth` reproduzível — **45 requests / 59 testes verdes** (foto via `body:file`+`@file`/`@contentType` com asset `assets/sample.jpg`; `/me` em `4-me/`). (T049 ✅, T044 ✅ Bruno-side, T047 ✅ Bruno-side)
- [x] Integração auth MySQL (`MYSQL_PORT=3307 pnpm run test:integration:auth`, Docker) — **38/38 verde**; migrations 0004/0005 + mappers + `user-query.drizzle`. (T050 ✅ MySQL)
- [x] Integração foto MinIO (`pnpm run test:integration:photo`, `STORAGE_INTEGRATION=1`) — **3/3 verde**; adapter S3 (upload/remove) contra MinIO real. (T050 ✅ MinIO)
- [x] `quickstart.md` reescrito e alinhado à implementação real (coleção `auth/`, runner, integração). (T051 ✅)
- [x] Gate W3 final: typecheck + format + lint + `pnpm test` (**2400 pass / 0 fail / 18 skipped**).
- [ ] Alinhar permissions `user:*` com spec 006 (T048 — quando a 006 existir).
- [ ] Abrir PR da 005 (T052) — aguardando decisão do humano (sem `origin` oficial; só remote `backup`).

### Fase 9 — Spec 006 (Acessos) — depois da 005

- [ ] Alinhar 006 ao ADR-0037 (converter tasks CLI → Bruno, simétrico à 005)
- [ ] Foundational 006 (permission-catalog, RoleName, status `auth_role`, agregado Role)
- [ ] US1–US7 da 006

---

## Log cronológico

- **2026-06-07** — Fase 0 concluída (ADR-0037 + 4 tickets Foundational closed-green). Roadmap criado. Iniciando Fase 1 (US1).
- **2026-06-07** — `AUTH-USECASE-LIST-USERS` closed-green (port `UserQuery` + use case `list-users` + adapter in-memory; 12 testes; gate 2313 pass). Fase 1 parte 1/2. Próximo: `AUTH-HTTP-LIST-USERS`.
- **2026-06-07** — `AUTH-HTTP-LIST-USERS` closed-green. Rota `GET /api/v1/users` (plugin Zod/OpenAPI + RBAC `user:list`) + adapter Drizzle `UserQuery` + índice `auth_user_name_idx` (migration 0005) + wiring (composition/public-api/server.ts). Testada via `fastify.inject` (8 CAs); gate 2321 pass. **Designs consultados com `drizzle-orm-expert` e `fastify-server-expert`** (ancorados no handbook). **US1 (listar) entregue na borda HTTP.** Pendências: coleção Bruno (T023) + `test:integration:auth` (Docker). Próximo: **US2** (`AUTH-USECASE-GET-USER` → `AUTH-HTTP-GET-USER`).
- **2026-06-07** — `AUTH-GET-USER` closed-green (US2 combinada: use case + rota num ticket). `getUser` reusa `UserReader.findById` (sem Drizzle novo); `massApprovalPermission` das roles; rota `GET /api/v1/users/:id` (`user:read`, 400/404). 9 testes (5 use case + 4 inject); gate **2330 pass**. **US2 (detalhe) entregue.** Pendência: Bruno `users/detail/`. Próximo: **US3** (criar + convite por email).
- **2026-06-07** — `AUTH-USECASE-CREATE-USER` + `AUTH-HTTP-CREATE-USER` closed-green. **US3 (criar + convite) entregue end-to-end.** Consultoria de 2 especialistas: `security-backend-expert` (fluxo seguro: `unusablePasswordHash` placeholder, convite fail-closed, anti host-injection, `UserCreated` sem PII) e `nodemailer-email-expert` (adapter `invite-mailer.email`). Wiring reusa o `dummyPasswordHash` existente. Rota `POST /api/v1/users` (`user:create`). 13 testes (8 segurança + 5 inject); gate **2343 pass**. Próximo: **US4** (editar perfil) — `AUTH-USECASE-UPDATE-PROFILE` + `PUT /users/:id`.
- **2026-06-07** — `AUTH-USECASE-UPDATE-PROFILE` + `AUTH-HTTP-UPDATE-USER` closed-green. **US4 (editar perfil) entregue end-to-end.** Domínio: `User.updateProfile` ganha `email?` (patch parcial). Use case `update-user-profile`: validar → fetch (404) → VOs → unicidade de email (SELECT-then-UPDATE; próprio = no-op, outro = 409) → domain → save; edição atômica (FR-009). Rota `PUT /api/v1/users/:id` (`user:update`); resposta 200 reusa `getUser` (shape do GET /:id); `FIELD_VALIDATION_STATUS` extraída e compartilhada com POST. 13 testes (7 use case + 6 inject); gate **2356 pass**. Próximo: **US5** (ativar/desativar) — `AUTH-USECASE-ACTIVATE-DEACTIVATE` + `PATCH .../activate|deactivate`.
- **2026-06-07** — QA E2E + segurança: coleção Bruno `api-collections/auth/` (39 req / 49 testes) verde contra MySQL real no Docker + `pnpm run test:e2e:bruno:auth`. Auditoria de 2 especialistas (Bruno + segurança backend). 3 tickets de hardening closed-green: `HTTP-SEC-HARDENING` (F3 erro 5xx genérico, F4 `x-request-id` validado, F5 rate-limit escrita), `HTTP-SWAGGER-GUARD` (F1 Swagger dev-only) + F2 (search `.max(128)`). Todos os 5 findings endereçados.
- **2026-06-07** — `AUTH-HTTP-ME` closed-green. **US7 (Minha Conta) entregue end-to-end.** Plugin `meHttpPlugin`: `GET/PUT /api/v1/me` (self por construção — opera só em `req.userId`, sem `:id`; PUT restrito a name/telephone, menor privilégio) + `POST /me/password-reset` (202; email da identidade autenticada; reusa fluxo BE-REC-003). Sem use case/domínio novo. 6 testes inject; gate **2399 pass**. **🎉 Todas as 7 user stories da spec 005 concluídas.** Resta a Fase 8 (fechamento): Bruno completo + integração Docker + PR.
- **2026-06-07** — `AUTH-USECASE-SET-PHOTO` + `AUTH-HTTP-PHOTO` closed-green. **US6 (foto de perfil) entregue end-to-end.** Port `ProfilePhotoStorage` próprio do auth (ADR-0006); use cases set/remove (MIME allowlist `image/jpeg|png|webp` + ≤5 MiB); rotas `PUT|DELETE /api/v1/users/:id/photo` (`user:update`; binário octet-stream + magic bytes anti-spoofing); adapter S3/MinIO com fallback in-memory. 14 testes (7 use case + 7 inject); gate **2393 pass**. Próximo: **US7** (Minha Conta) — `GET|PUT /me` + `POST /me/password-reset`.
- **2026-06-07** — `AUTH-USECASE-ACTIVATE-DEACTIVATE` + `AUTH-HTTP-STATUS` closed-green. **US5 (ativar/desativar) entregue end-to-end.** Use cases `activateUser`/`deactivateUser` reusam `User.enable`/`User.disable`; idempotência por leitura de estado (no-op = `event: null`, sem `save`); `deactivateUser` recebe `actorId` e bloqueia auto-desativação (`cannot-deactivate-self`). Rotas `PATCH /api/v1/users/:id/activate|deactivate` (`actorId` do JWT, nunca do body); resposta 200 idempotente reusa `getUser`. Validação de docker local: stack ERP-INFRA/local derrubada e re-subida UP/healthy; `/health` 200 via Caddy. 14 testes (7 use case + 7 inject); gate **2370 pass**. Próximo: **US6** (foto de perfil, P3) — `AUTH-USECASE-SET-PHOTO` + `PUT|DELETE .../photo` (StoragePort/MinIO).
