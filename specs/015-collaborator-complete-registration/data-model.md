# Data Model — Feature 015

Tipagem canônica: UUID em `varchar(36)`; enums como `varchar` snake_case (sem ENUM nativo — ADR-0020); datas `datetime(3)`; sem JSON nativo. Todos os campos novos do Colaborador são **nullable** (aditivo backward-compatible).

## VOs (domínio)

### `BankAccount` / `PixKey` (promovido para `domain/shared/payment-target.ts` — US1)

```
BankAccount = Readonly<{ bank, agency, accountNumber, checkDigit }>   // todos string
PixKey      = Readonly<{ keyType: 'cpf'|'cnpj'|'email'|'phone'|'random-key', key }>
```

- `createBankAccount`: não-vazios + `agency` regex `^\d{4}(-?\d)?$` → `bank-agency-invalid`.
- `createPixKey`: `keyType` no set → erro de enum.
- **Financier/Collaborator**: ambos opcionais (sem invariante "≥1 destino" do Supplier).

### `Sex` (US2) — `domain/collaborator/sex.ts`

```
Sex = 'F' | 'M'    // smart constructor → 'sex-invalid'
```

### `MaritalStatus` (US2) — `domain/collaborator/civil-status.ts`

```
MaritalStatus = 'single'|'married'|'divorced'|'widowed'|'stable_union'   // → 'marital-status-invalid'
```

### `Territory` (US3) — `domain/collaborator/territory.ts`

```
Territory = Readonly<{ uf: string|null, municipality: string|null }>
```

- `uf` validada contra catálogo `domain/geography/state.ts` → `territory-uf-invalid`; `municipality` texto livre.

## Agregados estendidos

### `Collaborator` (US2/US3) — campos novos em `par_collaborators` (nullable)

| Coluna                              | Tipo              | US                 |
| ----------------------------------- | ----------------- | ------------------ |
| `sex`                               | varchar(1)        | US2                |
| `marital_status`                    | varchar(20)       | US2                |
| `has_children`                      | boolean           | US2                |
| `children_count`                    | int               | US2                |
| `children_ages`                     | varchar(100)      | US2 (CSV `5,8,12`) |
| `is_pwd`                            | boolean           | US2                |
| `pwd_description`                   | varchar(255)      | US2                |
| `is_on_leave`                       | boolean           | US2                |
| `leave_duration`                    | varchar(50)       | US2                |
| `leave_renewable`                   | boolean           | US2                |
| `leave_renewal_duration`            | varchar(50)       | US2                |
| `public_sector_experience_duration` | varchar(50)       | US2                |
| `territory_uf`                      | varchar(2)        | US3                |
| `territory_municipality`            | varchar(255)      | US3                |
| `bank_account_*` (4 cols)           | varchar           | US1                |
| `pix_key_type` / `pix_key`          | varchar(20)/(255) | US1                |

- **Invariante**: `has_children=false ⇒ children_count/children_ages vazios` (no agregado).
- **Coexistência**: `sex` é independente de `gender_identity` (existente).

### `Financier` (US1) — colunas novas em `par_financiers`

`bank_account_bank`, `bank_account_agency`, `bank_account_number`, `bank_account_check_digit`, `pix_key_type`, `pix_key` (todas nullable; ambos os blocos opcionais).

## Entidades novas

### `CollaboratorInviteToken` (US5) — `par_invite_tokens`

| Coluna            | Tipo             | Nota                            |
| ----------------- | ---------------- | ------------------------------- |
| `id`              | varchar(36)      | PK                              |
| `token_hash`      | varchar(64)      | UNIQUE (hash, nunca claro)      |
| `collaborator_id` | varchar(36)      | FK lógica → `par_collaborators` |
| `expires_at`      | datetime(3)      | TTL 7 dias                      |
| `used_at`         | datetime(3) NULL | consumo uso-único               |
| `created_at`      | datetime(3)      | —                               |

- Estado: `pending` → `used`/`expired` (precedência `used > expired > pending`). Consumo atômico.

### `CollaboratorHistory` (US4) — `par_collaborator_history`

| Coluna            | Tipo         | Nota                                            |
| ----------------- | ------------ | ----------------------------------------------- |
| `id`              | varchar(36)  | PK                                              |
| `collaborator_id` | varchar(36)  | FK lógica                                       |
| `tipo_alteracao`  | varchar(100) | tipo da mudança                                 |
| `snapshot_before` | text         | snapshot genérico                               |
| `snapshot_after`  | text         | snapshot genérico                               |
| `data_alteracao`  | datetime(3)  | índice `(collaborator_id, data_alteracao DESC)` |

- Projetado de `CollaboratorEdited`/`Deactivated`/`Reactivated`. Cadastro inicial **não** gera linha.
- Export CSV legado: `tipo_alteracao;historico_antes;historico_depois;data_alteracao` (+ coluna `programa` vazia), datas `dd/MM/aaaa`.

### `ContractCountView` (US6, read-model) — `par_contract_count_view`

| Coluna             | Tipo        | Nota                                         |
| ------------------ | ----------- | -------------------------------------------- |
| `partner_ref`      | varchar(36) | PK (contractorId)                            |
| `partner_type`     | varchar(20) | contractorType                               |
| `contracts_count`  | int         | derivado                                     |
| `amendments_count` | int         | derivado                                     |
| `contract_status`  | varchar(20) | estado vigente projetado (Fornecedor filtro) |
| `occurred_at`      | datetime(3) | guard de recência (não regride)              |
| `updated_at`       | datetime(3) | auditoria do consumer                        |

- Mantido por projeção de `ctr_outbox` (eventos enriquecidos com `contractorRef`); upsert `ON DUPLICATE KEY UPDATE` com guard `occurred_at` (molde `fin_supplier_view`). Derivado/reconstruível.
- **Mapeamento de identidade (registrar no ADR-0046):** o `contractorRef { contractorType, contractorId }` do evento do Contratos **é** a referência ao parceiro — `partner_ref = contractorId` e `partner_type = contractorType`. O "contratado" de um contrato é um parceiro; não há entidade separada.
- `contract_status` ∈ `Pending|Active|Expired|Cancelled` (espelha `ContractStatus = Contract['status']` do Contratos).
