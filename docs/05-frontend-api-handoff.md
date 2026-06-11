# Handoff de API: core-api → Frontend

> **Branch:** `feat/backlog-front-handoff` · **Gerado em:** 2026-06-10
>
> Este documento é a referência **completa** da superfície HTTP que o core-api expõe ao front
> nesta entrega, com destaque para os **breaking changes** (contratos que mudaram em relação ao
> que já estava integrado). Leia a **Seção 0** (convenções) antes de tudo; a **Seção 1** lista os
> breaking changes em ordem de impacto; a **Seção 2** é o catálogo endpoint-a-endpoint.
>
> Fonte da verdade: os schemas Zod em `src/modules/*/adapters/http/*-schemas.ts` e os plugins de
> rota. Em caso de divergência entre este doc e o código, **o código vence** — abra issue.

---

## 0. Convenções globais (leia primeiro)

### 0.1 Versionamento — ⚠️ os recursos NÃO estão todos na mesma versão

A API mistura dois prefixos. **Confira sempre a tabela** antes de montar a URL:

| Área                                                                         | Prefixo base            | Exemplo                                        |
| ---------------------------------------------------------------------------- | ----------------------- | ---------------------------------------------- |
| Autenticação / sessão                                                        | **`/api/v2/auth`**      | `POST /api/v2/auth/login`                      |
| Contratos                                                                    | **`/api/v2/contracts`** | `GET /api/v2/contracts`                        |
| Minha Conta (autosserviço)                                                   | **`/api/v1/me`**        | `GET /api/v1/me`                               |
| Usuários (admin)                                                             | **`/api/v1/users`**     | `GET /api/v1/users`                            |
| Acessos / RBAC                                                               | **`/api/v1`**           | `GET /api/v1/roles`, `GET /api/v1/permissions` |
| Parceiros (collaborators, suppliers, financiers, acts, geography, agregador) | **`/api/v1`**           | `GET /api/v1/suppliers`                        |
| Programas                                                                    | **`/api/v1/programs`**  | `GET /api/v1/programs`                         |

> **Atenção:** existem **dois `/me`** distintos: `GET /api/v2/auth/me` (retorna `userId` +
> `permissions` — use para montar o RBAC do front) e `GET /api/v1/me` (retorna o **perfil completo**
> do usuário). Não confunda.

### 0.2 Autenticação (Bearer JWT + refresh opaco)

1. `POST /api/v2/auth/login` → `{ accessToken, refreshToken, userId }`.
2. Em toda requisição protegida: header `Authorization: Bearer <accessToken>`.
3. `accessToken` é **JWT ES256**, TTL ~15 min (claims `sub=userId`, `iss=core-api`, `iat`, `exp`).
4. `refreshToken` é **string opaca** (não-JWT), TTL ~30 dias, e é **rotacionado a cada `/refresh`**
   (guarde sempre o novo). `POST /api/v2/auth/refresh` com `{ refreshToken }` → novo par.
5. `POST /api/v2/auth/logout` com `{ refreshToken }` revoga a sessão; `POST
/api/v2/auth/sessions/revoke-all` derruba todas.
6. Sem token → **401**. Token válido mas sem permissão → **403**.

### 0.3 RBAC (permissões `resource:action`)

- Permissões têm o formato `"resource:action"` (ex.: `supplier:read`, `contract:write`,
  `user:create`).
- `GET /api/v2/auth/me` → `{ userId, permissions: string[] }` — use a lista para habilitar/ocultar
  ações na UI (não confie só na UI: o backend é fail-closed).
- O catálogo completo está em `GET /api/v1/permissions`.

### 0.4 Envelope de paginação (HARMONIZADO — ver breaking change §1.4)

Toda listagem paginada responde:

```json
{
  "items": [
    /* ... */
  ],
  "meta": {
    "currentPage": 1,
    "itemsPerPage": 5,
    "itemCount": 5,
    "totalItems": 42,
    "totalPages": 9
  }
}
```

Query params comuns: `page` (≥1, default 1), `limit` (default varia por recurso), `order`
(`ASC|DESC`), `search`. Alguns recursos têm filtros adicionais (documentados por endpoint).

### 0.5 Envelope de erro e semântica de status

Erros retornam um envelope com um **código kebab-case** (ex.: `contract-not-found`,
`act-payment-target-required`) + `requestId`. Semântica:

| Status  | Significado                                                                   |
| ------- | ----------------------------------------------------------------------------- |
| **400** | Input malformado (falha de schema Zod, UUID inválido, query inválida)         |
| **401** | Não autenticado (token ausente/inválido)                                      |
| **403** | Autenticado mas sem a permissão RBAC necessária                               |
| **404** | Recurso não encontrado                                                        |
| **409** | Conflito de unicidade ou de estado (ex.: duplicado, já-ativo, otimistic-lock) |
| **413** | Payload grande demais (uploads acima do limite)                               |
| **415** | Content-Type não suportado (upload com mime inválido)                         |
| **422** | Viola invariante de negócio (validada no domínio — ex.: CNPJ com DV inválido) |
| **502** | Falha de dependência externa (storage S3, e-mail)                             |
| **503** | Repositório/storage indisponível                                              |

> **Regra prática:** **400** = "seu JSON está errado"; **422** = "seu JSON está bem-formado mas a
> regra de negócio recusou". Trate-os diferente na UI.

### 0.6 Tipos de dado (convenções)

- **Dinheiro:** sempre em **centavos**, como inteiro, no campo `cents`. Ex.: `{ "cents": 100000 }`
  = R$ 1.000,00. Nunca há float de reais.
- **Data-calendário (vigência, prazos):** `PlainDate` no formato **`YYYY-MM-DD`** (sem hora/timezone).
- **Instante (timestamps, assinaturas):** **ISO 8601** completo (`2026-06-10T13:00:00.000Z`).
- **CNPJ:** 14 dígitos sem máscara. **CPF:** 11 dígitos. O DV é validado no domínio (envie só
  dígitos; máscara pode ser recusada conforme o schema do recurso).
- **`Location` header:** todo **201 Created** retorna `Location: /api/vX/<recurso>/<id>`. Use-o para
  obter o id do recurso recém-criado (vários POSTs respondem **sem corpo**).

### 0.7 Upload de arquivos (binário, NÃO multipart)

Uploads usam corpo **binário cru** (`application/octet-stream` ou o próprio `image/*`), **não**
`multipart/form-data`. Metadados vão por **query string**. Os limites e tipos variam:

| Recurso                  | Content-Type                              | Limite | Tipos             | Validação extra    |
| ------------------------ | ----------------------------------------- | ------ | ----------------- | ------------------ |
| Documento de contrato    | `application/octet-stream`                | 20 MiB | `application/pdf` | magic bytes `%PDF` |
| Foto de perfil (user/me) | `application/octet-stream` + `?mimeType=` | 5 MiB  | jpeg/png/webp     | magic bytes        |
| Logo de programa         | `image/png\|jpeg\|webp`                   | 5 MiB  | png/jpeg/webp     | —                  |

---

## 1. ⚠️ BREAKING CHANGES (em ordem de impacto)

### 1.1 ACT reescrito: pessoa-física → **Acordo de Cooperação Técnica** (instituição/CNPJ)

O recurso `/api/v1/acts` foi **totalmente reescrito**. O ACT deixou de ser uma pessoa-física
(espelho de Colaborador) e passou a ser um **Acordo firmado com uma instituição parceira (CNPJ)**.

**Campos que SAÍRAM** (não envie mais; não existem na resposta):
`cpf`, `role`, `startOfContract`, `employmentRelationship`, `registrationStatus`. A rota
`PATCH /acts/:id/complete-registration` **não existe** para acts.

**Campos que ENTRARAM / mudaram:**

| Antes (pessoa-física)             | Agora (Acordo)                                                 |
| --------------------------------- | -------------------------------------------------------------- |
| `cpf`                             | **`cnpj`** (14 dígitos)                                        |
| `role`                            | **`legalRepresentative`** (representante legal / contato)      |
| `startOfContract`                 | **`startDate`** + **`endDate`** (vigência, `YYYY-MM-DD`)       |
| —                                 | **`actNumber`** (nº do instrumento jurídico — **único**)       |
| —                                 | **`corporateName`** (razão social)                             |
| —                                 | **`fantasyName`** (nome fantasia/sigla)                        |
| —                                 | **`hasFinancialTransfer`** (boolean)                           |
| —                                 | **`bankAccount`** / **`pixKey`** (ver regra de repasse abaixo) |
| `name`, `email`, `occupationArea` | mantidos (name = objeto do acordo)                             |

**Regra de repasse (nova invariante):** se `hasFinancialTransfer = true`, é **obrigatório** ao menos
um entre `bankAccount` e `pixKey` — senão **422** `act-payment-target-required`. Se `false`, ambos
podem ser `null`.

**No front:** o form de ACT que coletava "Vigência (Meses)" precisa coletar/derivar **duas datas**
(`startDate` + `endDate`). Detalhes em `.claude/.pipeline/PAR-ACT-ACORDO/006-handoff/HANDOFF.md`.
Contrato completo em §2.6.4.

### 1.2 Política de senha: mínimo 8 → **12 caracteres** (OWASP 2025)

A senha mínima subiu de 8 para **12** caracteres (máx. 128; rejeita senhas comuns). **Não hardcode**
esse número no front — consuma a fonte única:

`GET /api/v2/auth/password-policy` → `{ "minLength": 12, "maxLength": 128 }` (público, sem auth).

Aplica-se a `register`, `change-password` e `reset-password`. Senha curta → **422**
`password-too-short`.

### 1.3 Minha Conta: e-mail **editável**, CPF **imutável** no autosserviço

`PUT /api/v1/me` aceita `name`, `email`, `telephone` (patch parcial). **CPF não é editável** no
autosserviço — só um admin muda CPF via `PUT /api/v1/users/:id`. Trocar para e-mail já usado → **409**
`email-already-registered`.

### 1.4 Paginação harmonizada (meta unificado)

O objeto `meta` de **todas** as listagens (contracts, partners, auth, programs) agora é uniforme:
`{ currentPage, itemsPerPage, itemCount, totalItems, totalPages }`. Se o front tinha um parser de
paginação por módulo, **unifique-o**. (Antes havia variação de nomes entre módulos.)

### 1.5 `Location` header em todo 201 Created

POSTs de criação (contracts, users, roles, suppliers, financiers, acts, collaborators, programs)
retornam **201 sem corpo** + header `Location` com a URL do recurso. Pegue o id de lá (não espere
o objeto no corpo, salvo onde indicado — programs retorna o detalhe).

### 1.6 Fornecedor ganhou avaliação (`serviceRating` + `ratingComment`)

`POST/PUT /api/v1/suppliers` e o detalhe aceitam/retornam `serviceRating`
(`RUIM|REGULAR|BOM|OTIMO|null`) e `ratingComment` (`string|null`). Catálogo em
`GET /api/v1/suppliers/service-ratings`.

### 1.7 Contratos: numeração automática, distrato com documento, cancelamento, blocos compostos

- **Numeração gerada pelo backend:** não envie `sequentialNumber` (contratos) nem `amendmentNumber`
  (aditivos) — são gerados (`NNNN/YYYY` e `N/YYYY`).
- **Distrato (`POST /contracts/:id/end`)** exige `kind` (`Expire` | `Terminate`); `Terminate` pede
  `terminatedAt` + `reason` e **documento `signed_termination`** anexado (senão 422).
- **Cancelamento:** `DELETE /contracts/:id` cancela um contrato **Pending** (→ `Cancelled`). Não é
  delete físico.
- **Rota "gorda" `GET /contracts/:id`** já compõe o **contratado** (`contractor`), os **aditivos**
  (`amendments`) e os **documentos** aninhados — e o bloco **`program`**. Envia headers
  `Deprecation`/`Sunset` (transitório até o BFF v2), mas é o contrato atual.

### 1.8 Novo: municípios parceiros cross-state

`GET /api/v1/partner-municipalities/added` lista (paginado) os municípios marcados como parceiros em
**todas** as UFs de uma vez (antes só dava para listar por UF via
`GET /api/v1/partner-municipalities?uf=XX`).

### 1.9 Novidades de grande porte (não "breaking", mas novas superfícies inteiras)

Estes módulos/recursos passam a existir para o front consumir: **Gestão de Usuários**
(`/api/v1/users`), **Gestão de Acessos/RBAC** (`/api/v1/roles`, `/permissions`), **Programas**
(`/api/v1/programs`), **foto de perfil** (user/me), **import CSV de colaboradores**, **export CSV**
(contracts/collaborators/suppliers/financiers/acts), **agregador de parceiros**
(`GET /api/v1/partners`), **contagem de contratos/aditivos nos grids de parceiros** + filtro
`contractStatus` (fornecedor) + vínculo **Colaborador↔Programa** (`programId`/filtro `programIds`
— ver §2.6). Detalhes na §2.

---

## 2. Referência completa por módulo

> Convenção abaixo: cada endpoint lista **permissão**, **request** (body/query/params) e **response**.
> Erros comuns (401/403/404/422/503) seguem a §0.5; só destaco os específicos.

### 2.1 Autenticação & Sessão — `/api/v2/auth`

| Método & rota               | Auth                   | Request                                 | Response                                                                                                  |
| --------------------------- | ---------------------- | --------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `POST /register`            | público                | `{ email, password(≥12) }`              | **201** `{ userId, email }`. 409 `email-already-registered`                                               |
| `POST /login`               | público (rate-limited) | `{ email, password }`                   | **200** `{ accessToken, refreshToken, userId }`. 401 `invalid-credentials`, 403 `user-disabled`           |
| `POST /refresh`             | público (rate-limited) | `{ refreshToken }`                      | **200** novo `{ accessToken, refreshToken, userId }` (rotaciona). 401 token inválido/expirado/rotacionado |
| `POST /logout`              | público                | `{ refreshToken }`                      | **204** (idempotente)                                                                                     |
| `POST /sessions/revoke-all` | Bearer                 | —                                       | **204** (derruba todas as sessões)                                                                        |
| `GET /me`                   | Bearer                 | —                                       | **200** `{ userId, permissions: string[] }`                                                               |
| `GET /password-policy`      | público                | —                                       | **200** `{ minLength: 12, maxLength: 128 }`                                                               |
| `POST /change-password`     | Bearer                 | `{ currentPassword, newPassword(≥12) }` | **204**. Revoga todas as sessões. 401 senha atual errada                                                  |
| `POST /forgot-password`     | público (rate-limited) | `{ email }`                             | **202** sempre (anti-enumeração; dispara e-mail)                                                          |
| `POST /reset-password`      | público (rate-limited) | `{ token, newPassword(≥12) }`           | **204**. Revoga sessões. 400 token inválido/expirado/usado                                                |

### 2.2 Minha Conta (autosserviço) — `/api/v1/me`

| Método & rota             | Auth   | Request                                                          | Response                                                                                                        |
| ------------------------- | ------ | ---------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `GET /me`                 | Bearer | —                                                                | **200** perfil: `{ id, name, email, cpf, telephone, imageUrl, active, massApprovalPermission, collaboratorId }` |
| `PUT /me`                 | Bearer | patch parcial `{ name?, email?, telephone? }` (CPF **imutável**) | **200** perfil atualizado. 409 `email-already-registered`                                                       |
| `PUT /me/photo`           | Bearer | binário + `?mimeType=image/jpeg\|png\|webp` (≤5 MiB)             | **200** perfil (`imageUrl` preenchida). 415/413/422                                                             |
| `DELETE /me/photo`        | Bearer | —                                                                | **200** perfil (`imageUrl: null`)                                                                               |
| `POST /me/password-reset` | Bearer | —                                                                | **202** `{ accepted: true }` (dispara e-mail ao próprio usuário)                                                |

### 2.3 Usuários (admin) — `/api/v1/users`

| Método & rota                 | Permissão         | Request                                                                                               | Response                                                                                        |
| ----------------------------- | ----------------- | ----------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `GET /users`                  | `user:list`       | query `page, pageSize(5\|10\|25), search, status(active\|inactive\|all)`                              | **200** `{ items:[{id,name,email,status}], meta }`                                              |
| `GET /users/:id`              | `user:read`       | —                                                                                                     | **200** `{ id,name,email,cpf,telephone,imageUrl,active,massApprovalPermission,collaboratorId }` |
| `POST /users`                 | `user:create`     | `{ name, cpf, email, telephone }`                                                                     | **201** `{ id }` + `Location`. Dispara e-mail de convite. 409 e-mail dup                        |
| `PUT /users/:id`              | `user:update`     | patch parcial `{ name?, email?, cpf?, telephone?, collaboratorId?(null ok) }` (**CPF editável aqui**) | **200** detalhe                                                                                 |
| `PATCH /users/:id/activate`   | `user:activate`   | —                                                                                                     | **200** detalhe (`active:true`)                                                                 |
| `PATCH /users/:id/deactivate` | `user:deactivate` | —                                                                                                     | **200** detalhe. 422 `cannot-deactivate-self`                                                   |
| `PUT /users/:id/photo`        | `user:update`     | binário + `?mimeType=` (≤5 MiB)                                                                       | **200** detalhe                                                                                 |
| `DELETE /users/:id/photo`     | `user:update`     | —                                                                                                     | **200** detalhe                                                                                 |

### 2.4 Acessos / RBAC — `/api/v1`

| Método & rota                     | Permissão                                   | Request                         | Response                                                                    |
| --------------------------------- | ------------------------------------------- | ------------------------------- | --------------------------------------------------------------------------- |
| `GET /permissions`                | `role:read`                                 | —                               | **200** `{ items:[{id,resource,action}] }` (catálogo fixo)                  |
| `GET /users/:id/permissions`      | `role:read`                                 | —                               | **200** `{ permissions: string[] }` (efetivas)                              |
| `GET /roles`                      | `role:read`                                 | —                               | **200** `{ items:[{id,name,active,permissions[]}] }`                        |
| `POST /roles`                     | `role:create`                               | `{ name, permissions[] }`       | **201** `{ id }` + `Location`. 409 nome dup, 422 permissão fora do catálogo |
| `PUT /roles/:id`                  | `role:update`                               | patch `{ name?, permissions? }` | **200** role. Propaga aos usuários                                          |
| `PATCH /roles/:id/deactivate`     | `role:update`                               | —                               | **200** role (archived). 409 `role-in-use` (revogue antes)                  |
| `POST /users/:id/roles`           | Bearer (use case valida `user:assign-role`) | `{ roleId }`                    | **200** `{ assigned:true }` (idempotente)                                   |
| `DELETE /users/:id/roles/:roleId` | Bearer (idem)                               | —                               | **200** `{ revoked:true }`. 422 `cannot-self-lockout`                       |

### 2.5 Contratos — `/api/v2/contracts`

Estados: `Pending → Active → (Expired | Terminated)`; `Pending → Cancelled`. Dinheiro em centavos;
vigência em `PlainDate`.

| Método & rota                                            | Permissão        | Request                                                                           | Response                                                                                          |
| -------------------------------------------------------- | ---------------- | --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `GET /contracts`                                         | `contract:read`  | query `page,limit(≤100),order,search,status`                                      | **200** `{ items:[lista-item], meta }`                                                            |
| `GET /contracts/export.csv`                              | `contract:read`  | —                                                                                 | **200** CSV (`text/csv`, `attachment; filename="contracts.csv"`)                                  |
| `GET /contracts/:id`                                     | `contract:read`  | —                                                                                 | **200** detalhe **gordo**: lista-item + `contractor` + `amendments[]` + `documents[]` + `program` |
| `PATCH /contracts/:id`                                   | `contract:write` | `{ title?, objective?, observations?, email?, telephone? }` (`.strict`, ≥1 campo) | **200** detalhe                                                                                   |
| `DELETE /contracts/:id`                                  | `contract:write` | —                                                                                 | **200** contrato `Cancelled`. 409 se não-Pending                                                  |
| `GET /contracts/:id/history`                             | `contract:read`  | —                                                                                 | **200** `[{ eventId, kind, occurredAt, actor, subjectAmendmentId }]`                              |
| `POST /contracts`                                        | `contract:write` | discriminado por `mode` (`Pending`/`Active`) — ver abaixo                         | **201** lista-item + `Location`                                                                   |
| `POST /contracts/:id/activate`                           | `contract:write` | `{ signedAt }`                                                                    | **200** Active. 409 sem documento `signed_contract`                                               |
| `POST /contracts/:id/end`                                | `contract:write` | `{ kind:'Expire' }` ou `{ kind:'Terminate', terminatedAt, reason }`               | **200** Expired/Terminated. 422 distrato sem documento                                            |
| `POST /contracts/:id/amendments`                         | `contract:write` | discriminado por `kind` (Addition/Suppression/TermChange/Misc)                    | **201** aditivo Pending                                                                           |
| `POST /contracts/:id/amendments/:amendmentId/homologate` | `contract:write` | `{ homologatedBy }`                                                               | **200** contrato (valores/período atualizados). 422 sem documento assinado                        |
| `POST /contracts/:id/documents`                          | `contract:write` | binário PDF + query `categoria,fileName,mimeType,signedElectronically`            | **201** documento                                                                                 |
| `POST /contracts/:id/amendments/:amendmentId/documents`  | `contract:write` | idem + `signedAt`                                                                 | **201** documento (upload+attach atômico)                                                         |
| `POST /contracts/:id/documents/:documentId/supersede`    | `contract:write` | `{ supersededByDocumentId }`                                                      | **200** documento `Superseded`                                                                    |
| `DELETE /contracts/:id/documents/:documentId`            | `contract:write` | `{ reason(1..500) }`                                                              | **204** (soft-delete)                                                                             |
| `GET /contracts/:id/documents/:documentId/content`       | `contract:read`  | —                                                                                 | **200** binário (`application/pdf`, `attachment`)                                                 |

**`POST /contracts` body (criação):**

```jsonc
// mode "Pending" (assinatura depois) ou "Active" (assina já, exige signedAt):
{
  "mode": "Active",
  "title": "string",
  "objective": "string",
  "signedAt": "2026-06-10T12:00:00Z", // só em mode Active
  "originalValueCents": 100000, // centavos
  "periodStart": "2026-01-01",
  "periodEnd": "2026-12-31", // periodEnd null = indefinido
  "contractor": { "type": "supplier|financier|collaborator|act", "id": "<uuid>" },
  "classification": "CT|OS", // opcional, default CT
  "programId": null,
  "budgetPlanId": null,
  "categorizacao": null,
  "centroDeCusto": null,
}
```

**Bloco `contractor` no detalhe** (`type` + `id` + `snapshot{ name, document, updatedAt, bankAccount?,
pixKey? }`); `snapshot:null` em degradação (nunca quebra a rota). Para `type:'act'` o `document` é o
**CNPJ** do acordo (ver §1.1). **Categorias de documento:** `signed_contract`, `signed_amendment`,
`signed_termination`, `opinion`, `certificate`, `justification`, `technical_attachment`,
`publication`, `other`.

### 2.6 Parceiros — `/api/v1`

> **Contagem de contratos nos grids:** o **item de lista** de Colaborador, Fornecedor e ACT traz
> `contractsCount` e `amendmentsCount` (inteiros ≥ 0 — contratos do parceiro em **qualquer** estado e
> seus aditivos). Só na **lista** (o detalhe `GET /:id` não muda). Em degradação do módulo de
> contratos os campos vêm `0`/`0` (a listagem nunca quebra).

#### 2.6.1 Colaboradores — `/api/v1/collaborators`

| Método & rota                                    | Permissão                                                    | Notas                                                                                                                                                                                                                                   |
| ------------------------------------------------ | ------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET /collaborators`                             | `collaborator:read`                                          | filtros ricos: `search, active, status, occupationAreas, employmentRelationships, genderIdentities, breeds, educations, disableBy, roles, yearOfContract, programIds` + paginação. Item de lista com `contractsCount`/`amendmentsCount` |
| `GET /collaborators/export`                      | `collaborator:read`                                          | CSV                                                                                                                                                                                                                                     |
| `GET /collaborators/:id`                         | `collaborator:read`                                          | detalhe completo (27+ campos, incl. `programId: uuid \| null`)                                                                                                                                                                          |
| `POST /collaborators`                            | `collaborator:write`                                         | `{ name,email,cpf(11),occupationArea(PARC\|DDI\|DCE\|EPV),role,startOfContract,employmentRelationship(CLT\|PJ),programId? }` → **201**+Location. 409 cpf/email dup                                                                      |
| `PATCH /collaborators/:id/complete-registration` | `collaborator:write`                                         | completa os campos pessoais (todos opcionais/nullable)                                                                                                                                                                                  |
| `POST /collaborators/:id/deactivate`             | `collaborator:write`                                         | `{ disableBy }`                                                                                                                                                                                                                         |
| `POST /collaborators/:id/reactivate`             | `collaborator:write`                                         | —                                                                                                                                                                                                                                       |
| `PUT /collaborators/:id`                         | `collaborator:write` (+`collaborator:edit-sensitive` p/ CPF) | edição cadastral (mesmo body do POST, incl. `programId?` — `null` desvincula); **CPF exige permissão extra** (403 sem ela)                                                                                                              |
| `POST /collaborators/import`                     | `collaborator:write`                                         | **body `text/csv`** (≤2 MiB). Sempre **200** `{ created, failed:[{line,error}] }`                                                                                                                                                       |

**Vínculo a Programa (`programId`):** UUID de `GET /api/v1/programs` (ref leve — não há validação
de existência cross-módulo). Opcional no POST (ausente = não vinculado); no PUT, `null` desvincula.
Formato inválido → 400. **Filtro `programIds`:** param repetido (`?programIds=a&programIds=b`) ou
único; OR entre os valores (colaboradores vinculados a **qualquer** um dos programas).

#### 2.6.2 Fornecedores — `/api/v1/suppliers`

| Método & rota                                       | Permissão                                             | Notas                                                                                                                                                                         |
| --------------------------------------------------- | ----------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET /suppliers`                                    | `supplier:read`                                       | filtros `search, active, categories, contractStatus`. Item de lista com `contractsCount`/`amendmentsCount`                                                                    |
| `GET /suppliers/service-categories`                 | `supplier:read`                                       | `string[]` (catálogo)                                                                                                                                                         |
| `GET /suppliers/service-ratings`                    | `supplier:read`                                       | `["RUIM","REGULAR","BOM","OTIMO"]`                                                                                                                                            |
| `GET /suppliers/export`                             | `supplier:read`                                       | CSV                                                                                                                                                                           |
| `GET /suppliers/:id`                                | `supplier:read`                                       | detalhe                                                                                                                                                                       |
| `POST /suppliers`                                   | `supplier:write`                                      | `{ name,email,cnpj(14),corporateName,fantasyName,serviceCategory,bankAccount?,pixKey?,serviceRating?,ratingComment? }`. **≥1 payment target** obrigatório (422). 409 CNPJ dup |
| `POST /suppliers/:id/deactivate` · `.../reactivate` | `supplier:write`                                      | —                                                                                                                                                                             |
| `PUT /suppliers/:id`                                | `supplier:write` (+`supplier:edit-sensitive` p/ CNPJ) | —                                                                                                                                                                             |

`bankAccount = { bank, agency, accountNumber, checkDigit }`; `pixKey = { keyType:
cpf\|cnpj\|email\|phone\|random-key, key }`.

**Filtro `contractStatus`:** `Pending | Active | Expired | Terminated | Cancelled | none` —
fornecedores com **ao menos um** contrato no estado pedido; `none` = fornecedores **sem nenhum**
contrato. Ausente → não filtra.

#### 2.6.3 Financiadores — `/api/v1/financiers`

| Método & rota                                        | Permissão                                               | Notas                                                                                           |
| ---------------------------------------------------- | ------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `GET /financiers`                                    | `financier:read`                                        | `search, active`                                                                                |
| `GET /financiers/export` · `GET /financiers/:id`     | `financier:read`                                        | CSV / detalhe                                                                                   |
| `POST /financiers`                                   | `financier:write`                                       | `{ name, corporateName, legalRepresentative, cnpj(14), telephone, address }` → **201**+Location |
| `POST /financiers/:id/deactivate` · `.../reactivate` | `financier:write`                                       | —                                                                                               |
| `PUT /financiers/:id`                                | `financier:write` (+`financier:edit-sensitive` p/ CNPJ) | —                                                                                               |

#### 2.6.4 Acordos (ACT) — `/api/v1/acts` ⚠️ ver breaking change §1.1

| Método & rota                                  | Permissão   | Notas                                                                                                                                           |
| ---------------------------------------------- | ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET /acts`                                    | `act:read`  | filtros `search, active, hasFinancialTransfer(0\|1), occupationArea(PARC\|DDI\|DCE\|EPV)`. Item de lista com `contractsCount`/`amendmentsCount` |
| `GET /acts/export`                             | `act:read`  | CSV (colunas do acordo)                                                                                                                         |
| `GET /acts/:id`                                | `act:read`  | detalhe do acordo                                                                                                                               |
| `POST /acts`                                   | `act:write` | body abaixo → **201**+Location. 409 `actNumber` dup                                                                                             |
| `PUT /acts/:id`                                | `act:write` | substituição total (mesmo body)                                                                                                                 |
| `POST /acts/:id/deactivate` · `.../reactivate` | `act:write` | —                                                                                                                                               |

**Body POST/PUT `/acts`:**

```jsonc
{
  "actNumber": "ACT-2026-001", // único (409 se duplicado)
  "name": "Acordo de Cooperação X",
  "email": "contato@instituicao.org",
  "cnpj": "11222333000181", // 14 dígitos (DV no domínio → 422 se inválido)
  "corporateName": "Instituição Parceira LTDA",
  "fantasyName": "IP",
  "occupationArea": "PARC", // PARC|DDI|DCE|EPV
  "legalRepresentative": "João Diretor",
  "startDate": "2026-01-01", // vigência (YYYY-MM-DD); endDate<startDate → 422
  "endDate": "2026-12-31",
  "hasFinancialTransfer": false, // true ⇒ exige bankAccount OU pixKey (422)
  "bankAccount": null, // { bank, agency, accountNumber, checkDigit } | null
  "pixKey": null, // { keyType, key } | null
}
```

A resposta de `GET` inclui ainda `id`, `legacyId`, `active`, `createdAt`, `updatedAt`.

#### 2.6.5 Geografia parceira — `/api/v1/partner-states`, `/api/v1/partner-municipalities`

| Método & rota                                             | Permissão         | Notas                                            |
| --------------------------------------------------------- | ----------------- | ------------------------------------------------ |
| `GET /partner-states`                                     | `geography:read`  | `[{ uf, isPartner }]` (27 UFs)                   |
| `POST /partner-states/:uf` · `DELETE /partner-states/:uf` | `geography:write` | toggle idempotente → **200** `{ uf, isPartner }` |
| `GET /partner-municipalities?uf=MG`                       | `geography:read`  | `[{ ibgeCode, uf, name, isPartner }]`            |
| `GET /partner-municipalities/added`                       | `geography:read`  | **paginado**, cross-state (só parceiros)         |
| `POST /partner-municipalities/:ibgeCode` · `DELETE ...`   | `geography:write` | toggle idempotente → **200** DTO                 |

#### 2.6.6 Agregador de parceiros — `GET /api/v1/partners`

- **Permissão:** exige **as 4** (`supplier:read` **e** `financier:read` **e** `collaborator:read`
  **e** `act:read`).
- **Query:** `page, limit(≤100), search, type(supplier|financier|collaborator|act)`.
- **Response:** `{ items:[{ type, id, name, document, active }], meta }` — projeção plana unificada
  (document = CNPJ ou CPF conforme o tipo).

### 2.7 Programas — `/api/v1/programs`

Identidade dupla: `id` (UUID) + `programNumber` (sequencial gerado). Otimistic-lock por `version`.

| Método & rota                   | Permissão            | Request                                                                  | Response                                                                                        |
| ------------------------------- | -------------------- | ------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------- |
| `GET /programs`                 | `program:read`       | `page, limit(5\|10\|25), order, search, status(ATIVO\|INATIVO)`          | **200** `{ items:[{id,programNumber,name,sigla,generalCharacteristics,logoKey,status}], meta }` |
| `POST /programs`                | `program:write`      | `{ name, sigla, director?, generalCharacteristics?, logoKey? }`          | **201** detalhe + `Location`. 409 `program-sigla-duplicated`                                    |
| `GET /programs/:id`             | `program:read`       | —                                                                        | **200** detalhe (+ `director, version, createdAt, updatedAt`)                                   |
| `PUT /programs/:id`             | `program:write`      | `{ name, sigla, director?, generalCharacteristics?, logoKey?, version }` | **200** detalhe. 409 `program-version-conflict` / sigla dup                                     |
| `POST /programs/:id/deactivate` | `program:deactivate` | —                                                                        | **200** detalhe (`INATIVO`). 409 já inativo                                                     |
| `POST /programs/:id/reactivate` | `program:deactivate` | —                                                                        | **200** detalhe (`ATIVO`). 409 já ativo                                                         |
| `POST /programs/:id/logo`       | `program:write`      | binário `image/png\|jpeg\|webp` (≤5 MiB)                                 | **200** `{ logoKey }`. 413/415/422                                                              |

---

## 3. Checklist de migração para o front

- [ ] Atualizar o cliente HTTP para diferenciar **`/api/v1`** e **`/api/v2`** por recurso (§0.1).
- [ ] Implementar fluxo de token: Bearer + **rotação do refresh** a cada `/refresh` (§0.2).
- [ ] Montar o RBAC da UI a partir de `GET /api/v2/auth/me.permissions` (§0.3).
- [ ] Unificar o parser de paginação no novo `meta` (§1.4).
- [ ] Ler o id de criação do header **`Location`** (POSTs respondem sem corpo) (§1.5).
- [ ] **ACT:** refazer o form (CNPJ, razão social, vigência início/fim, repasse + payment target,
      `actNumber`) — §1.1.
- [ ] **Senha:** consumir `GET /api/v2/auth/password-policy` (mín. 12) em vez de hardcode (§1.2).
- [ ] **Minha Conta:** e-mail editável, CPF read-only (§1.3).
- [ ] Uploads binários (não multipart): documentos de contrato (PDF/20 MiB), fotos (5 MiB), logo (§0.7).
- [ ] Tratar **400 vs 422** diferente na UI (schema vs regra de negócio) (§0.5).
