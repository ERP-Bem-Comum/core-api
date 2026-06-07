# Data Model — Gestão Administrativa de Usuários (Fase 1)

Estende o agregado `User` do BC `auth` (não cria agregado novo). Tudo em `auth_*` (ADR-0014).

---

## Agregado: `User` (estendido)

Identidade já existente (`UserId`, `Email`, credencial, papéis, **status**). Esta feature adiciona a
**faceta de perfil administrativo** (cpf, telephone, foto, collaboratorId).

> **⚠️ Alinhamento com o schema real** (`mysql.ts:98`): `auth_user` hoje tem **apenas** `id`, `email`,
> `password_hash` (nullable, OIDC-ready), **`status varchar(16)` com CHECK `IN ('active','disabled')`** +
> `disabled_at` bicondicional, `created_at`, `updated_at`, `legacy_id`. **NÃO há boolean `active`** (status
> é string) **NEM `name`** — o `name` NÃO existe nem na tabela nem no agregado `UserCore`. Colunas **novas**
> desta feature: **`name`**, `cpf`, `telephone`, `image_url`, `collaborator_id` (todas nullable para não
> quebrar `register-user`/OIDC, que não as fornecem). O agregado `User` é uma **discriminated union**
> `ActiveUser | DisabledUser` sobre `UserCore { id, email, passwordHash, roles }` — `disable` existe, mas
> **não há `enable`** (reativação) nem campos de perfil; ambos entram nesta feature.

| Campo                    | Tipo (domínio)                           | Persistência (`auth_user`)                            | Regra / Invariante                                                                       |
| ------------------------ | ---------------------------------------- | ----------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `id`                     | `UserId` (branded)                       | `id varchar(36)` PK (existe)                          | UUID v4 (ADR-0018).                                                                      |
| `name`                   | `string \| null` (**novo**)              | `name varchar(128) null` (**migration**)              | Obrigatório na criação **admin** (use case); nullable no agregado p/ self-register/OIDC. |
| `email`                  | `Email` (VO, já existe)                  | `email varchar(254)` UNIQUE (existe)                  | Único entre usuários (FR-007).                                                           |
| `status`                 | `'active' \| 'disabled'` (**já existe**) | `status varchar(16)` + CHECK (existe) + `disabled_at` | Governa acesso; bicondicional com `disabled_at`.                                         |
| `cpf`                    | `Cpf` (VO novo)                          | `cpf varchar(11)` (**migration**)                     | Só dígitos; dígitos verificadores válidos.                                               |
| `telephone`              | `Telephone` (VO novo)                    | `telephone varchar(13)` (**migration**)               | Só dígitos; forma BR válida.                                                             |
| `photo`                  | `ProfilePhotoRef \| null` (VO novo)      | `image_url varchar null` (**migration**)              | Chave de objeto S3; nullable.                                                            |
| `collaboratorId`         | `string \| null` (opaco)                 | `collaborator_id varchar null` (**migration**)        | **Read-only**, sem FK cross-módulo (FR-017).                                             |
| `massApprovalPermission` | derivado (RBAC)                          | — (não persistido aqui)                               | Apenas **lido** do RBAC para exibição (FR-015).                                          |

### Transições de estado (status `'active' | 'disabled'`)

```
            enable (novo)             (status='active',  disabled_at=NULL)
 [disabled] ─────────▶ [active]
     ▲                    │
     └──────── disable ───┘           (status='disabled', disabled_at=now())  [JA EXISTE]
                                      (ambas idempotentes em relação ao alvo)
```

> **Reuso de vocabulário** (decisão de modelagem): "ativar/desativar" da spec mapeiam para as transições do
> agregado `enable`/`disable`. O `disable` (evento `UserDisabled`) **já existe** em `user.ts`; esta feature
> adiciona o **`enable`** (evento `UserEnabled`), par que faltava. Não se introduz `UserActivated`/
> `UserDeactivated` — seria vocabulário duplicado para a mesma transição. Status técnico permanece
> `active`/`disabled` (varchar+CHECK existente), sem boolean novo.

- `enable(user)` (**novo**) → `DisabledUser → ActiveUser` (`status='active'`, `disabled_at=NULL`) + `UserEnabled`. Idempotente (no-op se já `active`).
- `disable(user, at)` (**já existe**) → `ActiveUser → DisabledUser` + `UserDisabled`. Idempotente.
  - Invariante (no use case `deactivate-user`): ator **não** pode desativar a própria conta na mesma sessão (proteção de lockout).

### Operações do agregado (funções puras → `Result<User, UserError>`)

- `register(input, at)` (**já existe**) → cria `ActiveUser` com perfil **vazio** (campos de perfil `null`). Inalterado em assinatura; passa a preencher os campos novos como `null`.
- `updateProfile(user, patch, at)` (**novo**) → atualiza `name`/`cpf`/`telephone`/`collaboratorId`; atômico; `UserProfileUpdated`.
- `setPhoto(user, ref \| null, at)` (**novo**) → define/remove `photo`; `UserProfileUpdated`.
- `enable(user, at)` (**novo**) / `disable(user, at)` (**já existe**) → ver transições.

> Campos de perfil são **nullable** no `UserCore` — `register`/`register-user`/OIDC criam sem perfil. A
> obrigatoriedade de `name`/`cpf`/`telephone` é validada no use case `create-user-by-admin` (US3), não no agregado.

> **Relação com use cases existentes do `auth`** (evitar duplicação):
>
> - `register-user` (existe) é **self-register** `{ email, password }` — cria identidade autenticável com
>   senha. O `create-user` **administrativo** desta feature é **distinto**: recebe perfil completo
>   (name, cpf, telephone), **sem senha**, e dispara convite (FR-016). Reusa `User.register`/unicidade de
>   email, mas com fluxo de credencial diferente. Decidir no W1 se é um novo use case ou um parâmetro de
>   modo no existente — preferir **novo use case** (`create-user-by-admin`) para não sobrecarregar o self-register.
> - Migração dos ~23 usuários legados: já há infra — `provision-legacy-user` + coluna `legacy_id`
>   (`mysql.ts:116`, UNIQUE, idempotente). A importação inicial reusa esse caminho, não o `create-user`.

---

## Value Objects novos

### `Cpf`

- Branded `string`. Smart constructor `Cpf.create(raw): Result<Cpf, 'cpf-invalid'>`.
- Normaliza (remove máscara) → 11 dígitos; valida dígitos verificadores. Armazena só dígitos.

### `Telephone`

- Branded `string`. `Telephone.create(raw): Result<Telephone, 'telephone-invalid'>`.
- Normaliza para dígitos; valida forma BR (DDD + número). Armazena só dígitos.

### `ProfilePhotoRef`

- Branded `string` (chave do objeto no storage). `ProfilePhotoRef.create(key): Result<…, 'photo-ref-invalid'>`.
- Não contém o binário; o upload/validação de tipo-tamanho ocorre no use case via StoragePort.

---

## Eventos de domínio (outbox — ADR-0015)

| Evento                     | Quando             | Consumidores prováveis                         |
| -------------------------- | ------------------ | ---------------------------------------------- |
| `UserCreated`              | criação de usuário | Notifications (convite de ativação por email). |
| `UserProfileUpdated`       | edição de perfil   | AuditLog (futuro).                             |
| `UserEnabled` (novo)       | reativação         | AuditLog; revisão de acesso.                   |
| `UserDisabled` (já existe) | desativação        | AuditLog; revogação de sessões (auth).         |

Nomes em **EN passado** (convenção). Contrato registrado em `handbook/architecture/`.

---

## Read model: `UserQuery` (port de leitura)

Separado do repositório de escrita. Suporta a listagem (FR-001..003):

- `list({ page, pageSize, search?, status })` → `{ items: UserListItem[], meta: PageMeta }`.
- `UserListItem`: subconjunto (id, name, email, status) — **sem** telefone/foto (espelha o legado).
- `PageMeta`: `{ currentPage, pageSize, totalItems, totalPages }`.
