# EPIC-COLLABORATORS-HTTP-V1 — Borda HTTP de Colaboradores (`/api/v1`)

> **Status:** Design aprovado (2026-06-03), aguardando execução das fatias.
> **Origem:** gap "Colaboradores · `partners/collaborator` · domínio pronto, falta borda HTTP".
> **Decisões do dono (brainstorming 2026-06-03):** épico completo (reads + writes); prefixo `/api/v1`
> para tudo que **espelha o legado** (ADR-0033); `routes: {plugin, prefix}` no `buildApp`; `POST` para
> ações de estado + `PATCH` para completar registro; **ADR-0033** antes do código.

---

## 1. Objetivo

Expor o agregado **Collaborator** (já modelado em `src/modules/partners/`) na borda HTTP, sob `/api/v1`,
espelhando o contrato do sistema legado (ADR-0033). O domínio, application (use cases) e persistência
**já existem e estão intocados** — este épico entrega **apenas a camada `adapters/http/` + wiring**,
espelhando o padrão consolidado de `contracts` (EPIC-CONTRACTS-HTTP, C0→C5).

**Fora de escopo:** import bulk (`importCollaborators` é fluxo de ETL, não HTTP), `link-to-profile`,
auto-cadastro público (`complete-registration-public`), suppliers/financiers (recursos partners futuros).

---

## 2. Pré-requisitos (já entregues)

- ✅ Domínio `Collaborator` (Active/Inactive, 9 VOs, eventos, errors) — `src/modules/partners/domain/collaborator/`.
- ✅ Use cases: `listCollaborators` (filtros), `registerCollaborator`, `completeCollaboratorRegistration`,
  `deactivateCollaborator`, `reactivateCollaborator`, `findCollaboratorByCpf` — `application/use-cases/`.
- ✅ Repository port + adapters Drizzle/in-memory; schema `par_collaborators`.
- ✅ Shell de borda `src/shared/http/` (`buildApp`, `sendResult`, error envelope) e padrão plugin-por-módulo (ADR-0028).
- ✅ `requireAuth` + `authorize(permission)` cross-módulo via `auth/public-api/http.ts` (ADR-0024).

**Gap conhecido:** não existe use case de **detalhe por id** (`getCollaboratorById`). A fatia **P1** cria
um use case fino sobre `CollaboratorRepository.findById` (W0 RED descreve o contrato).

---

## 3. Endpoints-alvo (todos sob `/api/v1/collaborators`)

| Método/URL | Use case | Pool | Permissão |
| :--- | :--- | :--- | :--- |
| `GET /api/v1/collaborators` | `listCollaborators` (search/status/registrationStatus/occupationArea/employmentRelationship + paginação) | reader | `collaborator:read` |
| `GET /api/v1/collaborators/:id` | `getCollaboratorById` *(novo, fino)* | reader | `collaborator:read` |
| `POST /api/v1/collaborators` | `registerCollaborator` | writer | `collaborator:write` |
| `PATCH /api/v1/collaborators/:id/complete-registration` | `completeCollaboratorRegistration` | writer | `collaborator:write` |
| `POST /api/v1/collaborators/:id/deactivate` | `deactivateCollaborator` | writer | `collaborator:write` |
| `POST /api/v1/collaborators/:id/reactivate` | `reactivateCollaborator` | writer | `collaborator:write` |

Verbo: `POST` para transições de estado (espelha contracts `activate`/`end`); `PATCH` para
preenchimento parcial de campos (`complete-registration`).

---

## 4. Componentes novos (espelham `contracts/adapters/http/`)

```
src/modules/partners/
├── adapters/http/
│   ├── plugin.ts            # collaboratorsHttpPlugin(deps, hooks): rotas /collaborators/*
│   ├── schemas.ts           # Zod request/response (list query, id param, register body, complete body, list/detail response)
│   ├── composition.ts       # buildPartnersHttpDeps(config): driver memory|mysql (RW split ADR-0026), instancia use cases
│   └── collaborator-dto.ts  # mappers Collaborator → DTO (list item + detail completo)
└── public-api/
    ├── http.ts              # exporta collaboratorsHttpPlugin, buildPartnersHttpDeps, tipos (ADR-0006/0028)
    └── permissions.ts       # COLLABORATOR_PERMISSION = { read: 'collaborator:read', write: 'collaborator:write' }

src/shared/http/app.ts       # GENERALIZA prefixo: routes: ReadonlyArray<{plugin, prefix?}> (default /api/v2); onSend cobre /api/v1 e /api/v2
src/server.ts                # registra collaboratorsHttpPlugin com prefix '/api/v1' + injeta {requireAuth, authorize}
src/modules/partners/application/use-cases/get-collaborator-by-id.ts   # novo use case fino (P1)
```

---

## 5. Fatiamento (W0→W3 por fatia, espelha contracts C0→C5)

### P0 — `PARTNERS-HTTP-V1-BOOTSTRAP` (size M) — ✅ closed-green (2026-06-03)

Estreia o `/api/v1` e o plugin HTTP do módulo partners.

- Generaliza `buildApp()`: `routes: ReadonlyArray<FastifyPluginAsync | {plugin, prefix?}>` (união
  retrocompatível; plugin direto/sem prefix → default `/api/v2`) + `onSend` no-store cobrindo `/api/v1`.
  **Zero mudança nos call-sites existentes** (auth/contracts seguem como plugin direto em v2); só o
  `server.ts` ganha a entrada nova `{plugin: collaboratorsHttpPlugin(...), prefix: '/api/v1'}`.
- `partners/public-api/permissions.ts` (`COLLABORATOR_PERMISSION`).
- `partners/adapters/http/composition.ts` (`buildPartnersHttpDeps`, driver memory|mysql, RW split).
- `partners/adapters/http/plugin.ts` + `schemas.ts` + `collaborator-dto.ts` com a **1ª rota**
  `GET /api/v1/collaborators` (lista, paginada, `authorize('collaborator:read')`).
- `partners/public-api/http.ts` (export do plugin + deps).
- `server.ts` registra o plugin sob `/api/v1`.
- **Seed RBAC:** `collaborator:read`/`collaborator:write` no `AUTH_SEED_JSON` de E2E.

**CA:** servidor sobe com v1+v2 coexistindo; `GET /api/v1/collaborators` 200 (lista) / 401 sem token /
403 sem permissão; auth/contracts seguem em `/api/v2` sem regressão (suite verde).

### P1 — `COLLABORATORS-HTTP-READS` — refatiada (decisões do dono 2026-06-03)

Contrato espelha `handbook/legacy_docs/openapi.yaml` (schema `Collaborator` + `PaginatedCollaborators`).
Decisões do dono que ampliaram o escopo (exigem **projeção da persistência**, não só o agregado):

- **`id`**: DTO expõe `id` (UUID do core) **e** `legacyId` (int|null). Rotas `/:id` por **UUID**.
- **Timestamps**: DTO inclui `createdAt`/`updatedAt` (da row — agregado não os carrega) → **read-model enriquecido**.
- **Filtros**: P1 cobre só os 5 do use case atual (search, status=registrationStatus, occupationArea,
  employmentRelationship, active) + paginação. Paridade total (age/yearOfContract/genderIdentities/breeds/
  educations/disableBy/roles) = **P1c** (estende `listCollaborators` no domínio/application).
- **Mapeamento legado**: legado `status` ← nosso `registrationStatus`; legado `active` ← (`status==='Active'`);
  legado `disableBy` ← nosso `disableBy` (null se Active). `meta { itemCount,totalItems,itemsPerPage,totalPages,currentPage }`.

Read-model: `CollaboratorReadRecord = { collaborator: Collaborator; legacyId: number|null; createdAt: Date; updatedAt: Date }`.
Read port em `partners/application/ports/` com adapters Drizzle (projeta a row via `collaboratorFromRow` + meta)
e in-memory (store semeável). `buildPartnersHttpDeps` ganha `seed` (memory, dev/test).

#### P1a — `COLLABORATORS-HTTP-DETAIL` (size M) — ✅ closed-green (2026-06-03)

- Read port `CollaboratorReader.getById(id)` + 2 adapters + `seed` no composition.
- `GET /api/v1/collaborators/:id` → 200 DTO `Collaborator` completo (id UUID + legacyId + ~24 campos + timestamps);
  404 inexistente; 400 `:id` não-UUID (Zod).

**CA:** detalhe espelha o schema legado `Collaborator`; mapeia status/active/disableBy; 404/400 corretos.

#### P1b — `COLLABORATORS-HTTP-LIST` (size M) — ✅ closed-green (2026-06-03)

- `CollaboratorReader.list()` + `GET /api/v1/collaborators` com DTO `Collaborator` completo (mesmo item),
  os 5 filtros atuais (reusa `collaboratorMatchesFilter`) + paginação (page/limit/order, meta legado).
- Substitui o envelope mínimo `{items, meta:{total}}` da P0 pelo shape legado.

**CA:** lista paginada espelha `PaginatedCollaborators`; 5 filtros funcionam; meta correta.

#### P1c — `COLLABORATORS-HTTP-LIST-FILTERS-PARITY` (size M) — ✅ closed-green (2026-06-03)

- Estende `listCollaborators` para 6 filtros legados (genderIdentities, races, educations,
  disableReasons, roles, yearOfContract). **`age` adiado** (precisa de data de referência — follow-up).

### P2 — `COLLABORATORS-HTTP-REGISTER` (size M) — ✅ closed-green (2026-06-03)

- `POST /api/v1/collaborators` (`registerCollaborator`) → 201 + Location; 409 cpf/email duplicado;
  422 invariante de domínio; 400 Zod.
- `PATCH /api/v1/collaborators/:id/complete-registration` (`completeCollaboratorRegistration`) → 200;
  404 inexistente; 409/422 conforme transição.

**CA:** cadastro cria pré-cadastro (Active+PreRegistration); completar move PreRegistration→Complete;
erros de unicidade/transição mapeados ao status correto.

### P3 — `COLLABORATORS-HTTP-LIFECYCLE` (size S) — ✅ closed-green (2026-06-03)

- `POST /api/v1/collaborators/:id/deactivate` (`deactivateCollaborator`, body `{ disableBy }`) → 200;
  soft-delete.
- `POST /api/v1/collaborators/:id/reactivate` (`reactivateCollaborator`) → 200.

**CA:** desativar move Active→Inactive (disableBy/deactivatedAt setados); reativar Inactive→Active;
transições inválidas → 409.

### P4-EDIT — `COLLABORATORS-HTTP-EDIT` (size L) — gap vs legado `PUT /:id`

> Decisões do dono (2026-06-03): **todos os campos editáveis**, **porém campos VITAIS (CPF e afins)
> exigem aprovação de SUPER-ROLE** (diretores). Introduz RBAC elevado / possível fluxo de aprovação —
> conceito novo no sistema. **Exige operação de domínio nova** (não é só borda).

Lacuna real: o agregado `Collaborator` não tem operação de edição (só register/complete/deactivate/reactivate;
`completeRegistration` roda 1×). O legado tinha `PUT /collaborators/{id}` (`UpdateCollaborator`).

Brainstorming dedicado **antes do W0** deve fechar:
- **Quais campos são "vitais"** (CPF certo; e-mail? occupationArea? employmentRelationship?).
- **Mecanismo de aprovação**: (a) síncrono — uma permissão elevada (`collaborator:edit-sensitive` / role `director`) basta para editar o campo vital na hora; ou (b) assíncrono — um **fluxo de pedido→aprovação** (agregado/estado de "edição pendente" aprovada por super-role). (a) é muito mais simples; (b) é um subsistema.
- **Operação de domínio** `Collaborator.edit(...)` + re-checagem de unicidade (email/CPF) + imutáveis.
- **Use case** `editCollaborator` (writer) + **rota** `PUT`/`PATCH /:id`.

Skills: `ts-domain-modeler` (operação no agregado) + `ports-and-adapters` (use case + rota) + RBAC (auth).

### P4-SMOKE — `COLLABORATORS-HTTP-E2E-SMOKE` (size S, opcional) — ✅ closed-green (2026-06-03)

- Smoke com server real + MySQL (driver mysql), espelhando `scripts/e2e-contracts.sh`.

---

## 6. Invariantes transversais

- **ADR-0006/0028:** `server.ts` importa só de `partners/public-api/http.ts`; nenhuma rota/schema vive no
  shell `src/shared/http/`. Domínio/application sem Fastify.
- **ADR-0027:** Zod exclusivo em `adapters/http/`; OpenAPI 3.1.1 em `/docs`.
- **ADR-0033:** `/api/v1` = espelho do legado; contrato congelado.
- **ADR-0026:** RW split no composition (reader=writer sem réplica).
- **Result→HTTP:** erros via `sendResult`; nenhum `throw` vaza como 500.
- **Testes:** `app.inject()` com driver `memory` em `tests/modules/partners/adapters/http/*.routes.test.ts`,
  rodando em `pnpm test` puro.

---

## 7. Questões abertas (resolver na fatia correspondente)

1. **Shape exato do DTO legado:** os campos espelham o agregado `Collaborator` (já legado). Se o frontend
   legado espera nomes/formatos específicos (ex.: CPF formatado, datas ISO vs BR), confirmar com o dono na
   **P1** (detalhe) e **P2** (cadastro) antes do W0.
2. **Naming do plugin:** `collaboratorsHttpPlugin` (recurso) vs `partnersHttpPlugin` (módulo). Adotado
   `collaboratorsHttpPlugin` por YAGNI (único recurso partners com HTTP agora); suppliers/financiers
   futuros decidem se agrupam ou criam plugin próprio.
