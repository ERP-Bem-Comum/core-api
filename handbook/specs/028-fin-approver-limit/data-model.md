# Data Model — feature 028 (alçada do aprovador)

Phase 1. Entidades, campos, validações e transições. Idioma do código = EN.

## 1. `Role` (auth) — ESTENDIDO

`src/modules/auth/domain/authorization/role.ts`

| Campo               | Tipo                     | Regra                                                                                                          |
| ------------------- | ------------------------ | -------------------------------------------------------------------------------------------------------------- |
| `id`                | `RoleId` (branded)       | existente                                                                                                      |
| `name`              | `RoleName` (branded)     | existente                                                                                                      |
| `permissions`       | `readonly Permission[]`  | existente; relevante: `payable:approve`                                                                        |
| `status`            | `'active' \| 'archived'` | existente                                                                                                      |
| **`approvalLimit`** | **`Money \| null`**      | **NOVO.** `null` = papel sem alçada (não aprova — FR-008). Quando presente, `Money.fromCents(n)` com `n >= 0`. |

- **Smart constructor** `Role.create`/`update`: aceita `approvalLimitCents?: number | null`; valida via `Money.fromCents` (retorna `Result`); `< 0` → erro `role-approval-limit-invalid` (novo erro EN kebab-case no `RoleError`).
- **Imutável** (`Readonly`), sem `throw`.

### Persistência — `auth_role` (ESTENDIDO)

`src/modules/auth/adapters/persistence/schemas/mysql.ts`

| Coluna                 | Tipo          | Nota                                                                       |
| ---------------------- | ------------- | -------------------------------------------------------------------------- |
| `approval_limit_cents` | `BIGINT NULL` | NOVO. Mapeia `approvalLimit` (centavos). `NULL` = sem alçada. Sem default. |

- Migration: `ALTER TABLE auth_role ADD COLUMN approval_limit_cents BIGINT NULL` — INSTANT (8.4), **sem hint `ALGORITHM`**. Gerada por `pnpm run db:generate`.
- Sem índice (coluna não filtrada isoladamente; lida junto do papel).

## 2. `ApproverAuthorityView` (auth → public-api) — NOVO

`src/modules/auth/application/ports/user-read.ts` (re-exportado por `public-api/read.ts`)

Projeção **mínima** (Vernon, estado remoto mínimo — research D2) consumida pelo `financial`:

```ts
type ApproverAuthorityView = Readonly<{
  userId: string;
  canApprove: boolean; // possui ≥1 papel com 'payable:approve'
  limitCents: number | null; // MAX dos limites dos papéis aprovadores; null = sem alçada (D3)
}>;
```

Operações do port (read-only):

| Operação                     | Assinatura                                                                              | Uso                                                                   |
| ---------------------------- | --------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| `getApproverAuthority`       | `(userId: string) => Promise<Result<ApproverAuthorityView \| null, AuthUserReadError>>` | US1 — autoridade do aprovador indicado (`null` = usuário inexistente) |
| `listApproversWithAuthority` | `() => Promise<Result<readonly ApproverAuthorityView[], AuthUserReadError>>`            | US3 — base da cascata (aprovadores com `payable:approve` + limites)   |

- Query (`user-read.drizzle.ts`): JOIN `auth_user_role` → `auth_role` → `auth_role_permission` → `auth_permission`, filtrando `payable:approve`; `MAX(approval_limit_cents)` por usuário. Indexada pelas PKs/FKs existentes.

## 3. `ApproverAuthorityReader` (financial port) — NOVO

`src/modules/financial/application/ports/approver-authority-reader.ts`

Port do `financial` que **espelha** a leitura do `auth` (o adapter delega para `auth/public-api/read.ts`):

```ts
type ApproverAuthorityReader = Readonly<{
  get: (userId: string) => Promise<Result<ApproverAuthority | null, ApproverAuthorityReadError>>;
  list: () => Promise<Result<readonly ApproverAuthority[], ApproverAuthorityReadError>>;
}>;
// ApproverAuthority = { userId; canApprove: boolean; limit: Money | null }  (reconstrói Money de limitCents)
```

- O adapter (`composition.ts`) constrói via `buildAuthUserReadPort` e traduz `limitCents → Money` (ACL: a fronteira reconstrói o VO local).

## 4. `ApprovalPolicy` (financial domain) — NOVO

`src/modules/financial/domain/document/approval-policy.ts` — funções **puras**, `Result<T,E>`.

| Função          | Assinatura                                                                                                | Regra                                                                                                                                                                             |
| --------------- | --------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `checkApprover` | `(netValue: Money, authority: ApproverAuthority \| null) => Result<void, ApprovalError>`                  | US1: `null`→`approver-not-found`; `!canApprove`→`approver-missing-permission`; `limit===null`→`approver-limit-exceeded`; `limit < netValue`→`approver-limit-exceeded`; senão `ok` |
| `escalate`      | `(netValue: Money, candidates: readonly ApproverAuthority[]) => Result<ApproverAuthority, ApprovalError>` | US3: dentre `canApprove && limit !== null && limit >= netValue`, escolhe o de **menor** `limit`; vazio → `no-approver-with-sufficient-limit`                                      |

```ts
type ApprovalError =
  | 'approver-not-found'
  | 'approver-missing-permission'
  | 'approver-limit-exceeded'
  | 'no-approver-with-sufficient-limit';
```

- **Gatilho:** só quando `netValue !== null` (Draft sem líquido não valida — FR-011) e há `approverRef`.

## 5. `Document` (financial) — INALTERADO no schema

- Já possui `approverRef: UserRef | null` (`types.ts:80`) e `netValue: Money | null` (`query.ts:34`).
- Mudança é de **comportamento** nos use-cases (`save-document`, `save-draft`/submit): após resolver `approverRef` e calcular o líquido, chamar `ApprovalPolicy.checkApprover` (e `escalate` na cascata). Nenhuma coluna nova em `fin_*`.

## Estado / transições

- **Create** (documento com `approverRef` + líquido): valida `checkApprover`; falha ⇒ recusa o create (sem persistir).
- **Submit** Draft→Open (#91): ao calcular o líquido, valida; falha ⇒ não transiciona.
- **Cascata** (quando insuficiente, se US3 ativa): `escalate` resolve o `approverRef` efetivo; persiste o aprovador escolhido (decisão a confirmar no ticket CASCADE).
- Alteração de alçada do papel **não** revalida documentos já encaminhados (FR — edge case).
