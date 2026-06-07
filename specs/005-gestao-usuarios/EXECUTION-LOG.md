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
- [ ] `AUTH-HTTP-LIST-USERS` — adapter Drizzle `UserQuery` + contract suite param + rota `GET /api/v1/users` + coleção Bruno `users/list/` (T017/T021/T022/T023)

### Fase 2 — US2 Detalhe (P1)

- [ ] `AUTH-USECASE-GET-USER` — use case `get-user` (perfil + mass-approve read-only) (T024–T025)
- [ ] `AUTH-HTTP-GET-USER` — rota `GET /api/v1/users/:id` + Bruno `users/detail/` (T026–T027)

### Fase 3 — US3 Criar + convite (P2)

- [ ] `AUTH-USECASE-CREATE-USER` — `create-user-by-admin` (ativo, sem senha, `UserCreated`) (T028–T029)
- [ ] `AUTH-INVITE-ON-CREATE` — convite de ativação por email a partir de `UserCreated` (EmailPort/reset) (T030)
- [ ] `AUTH-HTTP-CREATE-USER` — rota `POST /api/v1/users` + Bruno `users/create/` (T031–T032)

### Fase 4 — US4 Editar (P2)

- [ ] `AUTH-USECASE-UPDATE-PROFILE` — use case `update-user-profile` (atômico) (T033–T034)
- [ ] `AUTH-HTTP-UPDATE-USER` — rota `PUT /api/v1/users/:id` + Bruno `users/update/` (T035–T036)

### Fase 5 — US5 Ativar/Desativar (P2)

- [ ] `AUTH-USECASE-ACTIVATE-DEACTIVATE` — use cases sobre `enable`/`disable` (idempotente; proteção lockout) (T037–T038)
- [ ] `AUTH-HTTP-STATUS` — rotas `PATCH .../activate|deactivate` + Bruno `users/status/` (T039–T040)

### Fase 6 — US6 Foto (P3)

- [ ] `AUTH-USECASE-SET-PHOTO` — use case `set-profile-photo` (StoragePort; valida tipo/tamanho) (T041–T042)
- [ ] `AUTH-HTTP-PHOTO` — rotas `PUT|DELETE .../photo` + Bruno `users/photo/` (integração MinIO) (T043–T044)

### Fase 7 — US7 Minha Conta (P3)

- [ ] `AUTH-HTTP-ME` — rotas `GET|PUT /me` + `POST /me/password-reset` + Bruno `users/me/` (T045–T047)

### Fase 8 — Fechamento 005

- [ ] Coleção Bruno completa + `bru run` reproduzível (T048–T049)
- [ ] Integração auth (`pnpm run test:integration:auth`, Docker) — valida migration 0004 + mapper (T050)
- [ ] Gate W3 final + abrir PR da 005 (T051–T052)

### Fase 9 — Spec 006 (Acessos) — depois da 005

- [ ] Alinhar 006 ao ADR-0037 (converter tasks CLI → Bruno, simétrico à 005)
- [ ] Foundational 006 (permission-catalog, RoleName, status `auth_role`, agregado Role)
- [ ] US1–US7 da 006

---

## Log cronológico

- **2026-06-07** — Fase 0 concluída (ADR-0037 + 4 tickets Foundational closed-green). Roadmap criado. Iniciando Fase 1 (US1).
- **2026-06-07** — `AUTH-USECASE-LIST-USERS` closed-green (port `UserQuery` + use case `list-users` + adapter in-memory; 12 testes; gate 2313 pass). Fase 1 parte 1/2. Próximo: `AUTH-HTTP-LIST-USERS`.
