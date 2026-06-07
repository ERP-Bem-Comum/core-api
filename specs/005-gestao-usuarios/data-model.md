# Data Model — Gestão Administrativa de Usuários (Fase 1)

Estende o agregado `User` do BC `auth` (não cria agregado novo). Tudo em `auth_*` (ADR-0014).

---

## Agregado: `User` (estendido)

Identidade já existente (`UserId`, `Email`, credencial, papéis). Esta feature adiciona a **faceta de
perfil administrativo**.

| Campo                    | Tipo (domínio)                         | Persistência (`auth_users`)    | Regra / Invariante                                           |
| ------------------------ | -------------------------------------- | ------------------------------ | ------------------------------------------------------------ |
| `id`                     | `UserId` (branded)                     | `varchar(36)` PK               | UUID v4 (ADR-0018).                                          |
| `name`                   | `string` (já existe)                   | `varchar`                      | Obrigatório; saneamento de capitalização só na apresentação. |
| `email`                  | `Email` (VO, já existe)                | `varchar` UNIQUE               | Único entre usuários (FR-007).                               |
| `cpf`                    | `Cpf` (VO novo)                        | `varchar(11)`                  | Só dígitos; dígitos verificadores válidos.                   |
| `telephone`              | `Telephone` (VO novo)                  | `varchar(11..13)`              | Só dígitos; forma BR válida.                                 |
| `photo`                  | `ProfilePhotoRef \| null` (VO novo)    | `image_url varchar null`       | Chave de objeto S3; nullable.                                |
| `status`                 | `active: boolean` (já há `ActiveUser`) | `active tinyint(1)`            | Ativo/inativo; governa acesso.                               |
| `collaboratorId`         | `string \| null` (opaco)               | `collaborator_id varchar null` | **Read-only**, sem FK cross-módulo (FR-017).                 |
| `massApprovalPermission` | derivado (RBAC)                        | — (não persistido aqui)        | Apenas **lido** do RBAC para exibição (FR-015).              |

### Transições de estado (status)

```
            activate
 [inactive] ─────────▶ [active]
     ▲                    │
     └──────── deactivate ┘   (ambas idempotentes em relação ao alvo)
```

- `activate(user)` → se já ativo, no-op (idempotente); senão `active=true` + evento `UserActivated`.
- `deactivate(user, actor)` → se já inativo, no-op; senão `active=false` + `UserDeactivated`.
  - Invariante: ator **não** pode desativar a própria conta na mesma sessão (proteção de lockout).

### Operações do agregado (funções puras → `Result<User, UserError>`)

- `User.create(props)` → cria **ativo**, sem senha; produz `UserCreated` (gatilho do convite).
- `User.updateProfile(user, patch)` → atualiza name/cpf/telephone; atômico; `UserProfileUpdated`.
- `User.attachPhoto(user, ref)` / `User.removePhoto(user)` → gerencia `photo`.
- `User.activate` / `User.deactivate` → ver transições.

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

| Evento               | Quando             | Consumidores prováveis                         |
| -------------------- | ------------------ | ---------------------------------------------- |
| `UserCreated`        | criação de usuário | Notifications (convite de ativação por email). |
| `UserProfileUpdated` | edição de perfil   | AuditLog (futuro).                             |
| `UserActivated`      | ativação           | AuditLog; revisão de acesso.                   |
| `UserDeactivated`    | desativação        | AuditLog; revogação de sessões (auth).         |

Nomes em **EN passado** (convenção). Contrato registrado em `handbook/architecture/`.

---

## Read model: `UserQuery` (port de leitura)

Separado do repositório de escrita. Suporta a listagem (FR-001..003):

- `list({ page, pageSize, search?, status })` → `{ items: UserListItem[], meta: PageMeta }`.
- `UserListItem`: subconjunto (id, name, email, status) — **sem** telefone/foto (espelha o legado).
- `PageMeta`: `{ currentPage, pageSize, totalItems, totalPages }`.
