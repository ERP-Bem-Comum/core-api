# Implementation Plan: Gestão Administrativa de Usuários

**Branch**: `005-gestao-usuarios` | **Date**: 2026-06-07 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/005-gestao-usuarios/spec.md`

## Summary

Adicionar o **lado administrativo/CRUD de usuários** ao core-api: listar (paginação/busca/filtro), detalhar, criar (com convite por email), editar perfil, ativar/desativar, foto de perfil (S3) e autosserviço "Minha Conta". A abordagem técnica é **estender o módulo `auth` existente** — que já é dono do agregado `User` (`auth/domain/identity/user`) — em vez de criar um novo módulo `users`. Essa decisão é fundamentada em DDD (ver `research.md`: a separação criaria reuso/bleeding entre Bounded Contexts sobre o mesmo agregado, anti-padrão alertado por Evans). A gestão de papéis/permissões fica na spec irmã `006-gestao-acessos`.

## Technical Context

**Language/Version**: TypeScript 6.0 (roadmap TS 7), Node.js 24 LTS, ESM/NodeNext

**Primary Dependencies**: Drizzle ORM + `mysql2` (MySQL 8.4), Fastify 5 + Zod/OpenAPI (ADR-0025/0027/0028), `@aws-sdk/client-s3` (ADR-0019), EmailPort/Nodemailer (ADR-0010)

**Storage**: MySQL 8.4 (tabelas `auth_*`, ADR-0014); foto em S3/MinIO (ADR-0019); outbox `core.outbox` (ADR-0015)

**Testing**: `node:test` + `--experimental-strip-types` (sem Jest/Vitest); contract suites parametrizadas; integração atrás de `*_INTEGRATION=1`

**Target Platform**: Servidor Linux (container), processo único (modular monolith)

**Project Type**: Web service (backend) — borda HTTP + paridade CLI

**Performance Goals**: Listagem perceptivelmente instantânea para milhares de usuários (SC-003); paginação por offset

**Constraints**: Domínio puro (`Result<T,E>`, sem throw/classes); idioma EN no código / PT nas mensagens; fail-closed na autorização (FR-014)

**Scale/Scope**: ~7 use cases novos, 2-3 VOs novos (`Cpf`, `Telephone`, `ProfilePhotoRef`), extensão do agregado `User`, extensão do schema `auth_users`, ~8 endpoints HTTP + subcomandos CLI

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Princípio                         | Status | Nota                                                                                               |
| --------------------------------- | ------ | -------------------------------------------------------------------------------------------------- |
| I. TDD W0→W3 fail-first           | ✅     | Cada use case abre ticket; W0 RED antes de `src/`.                                                 |
| II. Regressão zero                | ✅     | Gate W3 completo antes de fechar.                                                                  |
| III. pnpm único                   | ✅     | Sem npm.                                                                                           |
| IV. Modular monolith / isolamento | ✅     | **Estende `auth`**, não cria 6º BC. `collaboratorId` opaco — **sem** acesso a `partners` (FR-017). |
| V. Domínio puro                   | ✅     | `Cpf`/`Telephone`/`ProfilePhotoRef` = VOs com smart constructor + branded + `Result`.              |
| VI. MySQL 8 + Drizzle migrations  | ✅     | Colunas novas em `auth_users` via `pnpm run db:generate`. Sem JSON/ENUM nativos.                   |
| VII. CLI-first / HTTP             | ✅     | HTTP já oficial (ADR-0025+). Paridade CLI planejada.                                               |
| VIII. TS strict + idioma          | ✅     | `import type`, `.ts`, `#src/*`, EN no código.                                                      |
| IX. Consultoria ACDG + citação    | ✅     | Decisão de fronteira de BC citada (Evans, `research.md`).                                          |

**Resultado do gate**: PASS — nenhuma violação. `Complexity Tracking` não se aplica (não há 6º módulo nem desvio de princípio).

## Project Structure

### Documentation (this feature)

```text
specs/005-gestao-usuarios/
├── plan.md              # Este arquivo
├── spec.md              # Spec (clarificada)
├── research.md          # Fase 0 — decisão de fronteira de BC (DDD) + resoluções
├── data-model.md        # Fase 1 — agregado User estendido + VOs
├── quickstart.md        # Fase 1 — como exercitar via CLI/HTTP
├── contracts/           # Fase 1 — contratos HTTP (OpenAPI/Zod) + CLI
└── checklists/requirements.md
```

### Source Code (repository root)

```text
src/modules/auth/
├── domain/identity/
│   ├── user/                      # agregado User — ESTENDIDO (perfil: cpf, telephone, photo, status)
│   │   ├── user.ts                # +funções: updateProfile, activate, deactivate, attachPhoto
│   │   └── events.ts              # +UserCreated, UserProfileUpdated, UserActivated, UserDeactivated
│   ├── cpf.ts                     # NOVO VO (branded, normalizado, dígitos verificadores)
│   ├── telephone.ts               # NOVO VO (branded, normalizado)
│   └── profile-photo-ref.ts       # NOVO VO (referência a objeto S3)
├── application/
│   ├── use-cases/
│   │   ├── list-users.ts          # NOVO (paginação/busca/filtro)
│   │   ├── get-user.ts            # NOVO
│   │   ├── create-user.ts        # NOVO (emite UserCreated → convite de ativação)
│   │   ├── update-user-profile.ts# NOVO
│   │   ├── activate-user.ts      # NOVO (idempotente)
│   │   ├── deactivate-user.ts    # NOVO (idempotente; protege auto-desativação)
│   │   └── set-profile-photo.ts  # NOVO (valida tipo/tamanho; usa StoragePort)
│   └── ports/                     # +UserQuery (read model paginado), reuso StoragePort/EmailPort
├── adapters/
│   ├── persistence/               # schema auth_users ESTENDIDO + repo + UserQuery (Drizzle)
│   ├── http/                      # +rotas /users, /users/:id, /me (Zod/OpenAPI)
│   └── crypto|notifications/      # reuso (convite via EmailPort)
└── public-api/                    # +exports se necessário (sem vazar domain)

tests/modules/auth/
├── domain/identity/               # unit: cpf, telephone, user.updateProfile/activate/...
├── application/use-cases/         # unit: cada use case com fakes
└── adapters/                      # contract (repo/query) + integração (MySQL/S3) atrás de opt-in
```

**Structure Decision**: **Estender `src/modules/auth/`** (BC existente, dono do agregado `User`). Justificativa DDD em `research.md`. Não há novo módulo — o isolamento (ADR-0014) é respeitado e `collaboratorId` permanece opaco.

## Complexity Tracking

> N/A — Constitution Check passou sem violações. Nenhum 6º BC, nenhum desvio de princípio a justificar.

## Migrations Drizzle (core-api)

> **⚠️ `auth_user` já existe** (`mysql.ts:98`) com `id, email, password_hash, status ('active'|'disabled' +
CHECK), disabled_at, name, legacy_id`. **Status já é varchar+CHECK** — reusar, **não** criar boolean.

- **Mudanças de schema**: [x] colunas **novas** em `auth_user`: `cpf varchar(11)`, `telephone varchar(13)`, `image_url varchar null`, `collaborator_id varchar null` · [x] índice para busca por nome (novo) · [ ] tabelas novas (nenhuma) · [ ] FK nova (`collaborator_id` é coluna **opaca**, **sem** FK cross-módulo). Status `active`/`disabled` **já existe** — activate/deactivate reusa, sem nova coluna.
- **Prefixo de isolamento correto?** `auth_*` — ADR-0014: **sim**
- **Outbox**: novos eventos (`UserCreated`, `UserProfileUpdated`, `UserActivated`, `UserDeactivated`) exigem `INSERT` em `core.outbox`: **sim** (hoje os use cases do `auth` retornam evento no output sem publicar — confirmar wiring de outbox no W1).
- **Comando**: após editar `schema.ts`, rodar `pnpm run db:generate` e versionar a migration. CHARSET/COLLATE e índices conferidos à mão (ADR-0020).
- **Restrições MySQL 8** (ADR-0020): CPF/telefone como `varchar` normalizado (não JSON/ENUM); status permanece `varchar`+CHECK existente (`auth_user_status_chk`), **nunca** ENUM nativo nem boolean novo.

## Contrato HTTP (Fase 2+ — ativo via ADR-0025)

- **Endpoints novos** (sob `auth/adapters/http`, Zod/OpenAPI):
  - `GET /users` — query: `page`, `pageSize` (5|10|25), `search`, `status` (active|inactive|all); resp: itens + meta.
  - `GET /users/:id` — detalhe completo (inclui `massApprovalPermission` read-only, `collaboratorId` opaco).
  - `POST /users` — body: name, cpf, email, telephone, photo?(multipart/ref); cria ativo + dispara convite.
  - `PUT /users/:id` — edição de perfil (atômica).
  - `PATCH /users/:id/activate` · `PATCH /users/:id/deactivate` — idempotentes.
  - `PUT /users/:id/photo` — upload/troca; `DELETE /users/:id/photo` — remove.
  - `GET /me` · `PUT /me` — autosserviço; `POST /me/password-reset` — reusa fluxo existente.
- **Autorização**: cada rota administrativa exige permission correspondente (nomes definidos com `006`); `/me/*` exige apenas sessão (self).
- **Backward-compat / versionamento**: sob `/api/v1`; sem quebra de contratos existentes do `auth`.

## Estimativa de Pipeline (W0 size)

- **Tamanho**: [x] **L** — múltiplos use cases, VOs novos, extensão de agregado, schema + migration, outbox, borda HTTP e dependência de email/S3.
- **Justificativa**: a feature cruza domínio (VOs + agregado), application (7 use cases), persistência (schema + query paginada), borda HTTP e integrações (S3, EmailPort). Recomenda-se **fatiar em múltiplos tickets** por use case/slice (ex.: `AUTH-USER-VO-CPF`, `AUTH-USECASE-LIST-USERS`, …) mantendo cada um S/M.
- **Plano de testes W0 (RED)** (primeiras suites a falhar por inexistência da API):
  - `tests/modules/auth/domain/identity/cpf.test.ts` — `Cpf.create` valida/normaliza e rejeita inválido.
  - `tests/modules/auth/domain/identity/telephone.test.ts` — idem `Telephone`.
  - `tests/modules/auth/domain/identity/user/profile.test.ts` — `User.updateProfile/activate/deactivate` (idempotência, proteção de auto-desativação).
  - `tests/modules/auth/application/use-cases/list-users.test.ts` — paginação/busca/filtro com repo fake.
  - `tests/modules/auth/application/use-cases/create-user.test.ts` — cria ativo + emite `UserCreated` (convite), recusa email duplicado.
  - `tests/modules/auth/adapters/persistence/user-query.suite.ts` — contract suite (in-memory + Drizzle/MySQL).
