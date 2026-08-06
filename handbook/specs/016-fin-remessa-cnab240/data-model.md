# Phase 1 — Data Model: Geração de remessa CNAB 240

## Agregado `Remittance` (NOVO — `financial/domain/remittance/`)

Um lote de remessa por **conta-cedente**, produzido numa geração.

| Campo             | Tipo (domínio)                          | Notas                                             |
| ----------------- | --------------------------------------- | ------------------------------------------------- |
| `id`              | `RemittanceId` (branded UUID)           | smart constructor                                 |
| `debitAccountRef` | `CedenteAccountId` (branded)            | conta-cedente do lote                             |
| `nsa`             | `Nsa` (branded int ≥ 1)                 | sequência por conta; monotônico                   |
| `hash`            | `RemittanceHash` (branded, SHA-256 hex) | checksum do blob (R2)                             |
| `storageRef`      | `StorageRef`                            | bucket/key/hashSha256/sizeBytes (molde contracts) |
| `items`           | `readonly RemittanceItem[]`             | títulos incluídos (≥1)                            |
| `status`          | `'Generated'`                           | nesta fatia só `Generated` (retorno é sub-fatia)  |
| `generatedAt`     | `Date`                                  | injetado via `Clock`                              |

`RemittanceItem`: `{ documentId: DocumentId; valueCents: bigint; favored: FavoredSnapshot }` (snapshot do favorecido p/ o arquivo — imutável).

**Invariantes** (smart constructor `Remittance.create`, retorna `Result<Remittance, RemittanceError>`):

- `items.length ≥ 1` (sem lote vazio — FR-013).
- Todos os itens da **mesma** `debitAccountRef`.
- `nsa ≥ 1`; `hash` 64 hex.

**VOs novos**: `Nsa` (`fromInt`), `RemittanceHash` (`fromHex`), `CedenteAccountId`. Reusa `StorageRef`, `Money`/cents, `DocumentId`.

**Erros** (string-literal union EN): `'remittance-empty'`, `'remittance-mixed-accounts'`, `'remittance-invalid-nsa'`, `'remittance-invalid-hash'`.

## Transição no agregado `Document` (EXISTE — `financial/domain/document/`)

Nova operação `Document.transmit(doc, remittanceId, at): Result<{ document, event }, DocumentError>`:

- **Pré**: `status === 'Approved'` E `paymentMethod ∈ {TED, TransferenciaBancaria}`.
- **Pós**: `status = 'Transmitted'`; emite `DocumentTransmitted`.
- **Erros**: `'document-not-approved'` (não-Approved), `'payment-method-not-eligible'` (forma manual), `'document-already-transmitted'` (FR-012).
- `fin_payables` espelha o status (como nas transições atuais).

## Eventos (outbox)

- `RemittanceGenerated`: `{ type, remittanceId, debitAccountRef, nsa, hash, storageRef, documentIds: string[], occurredAt }`
- `DocumentTransmitted`: `{ type, documentId, remittanceId, occurredAt }`
- Em `public-api/events.ts` (schema v1, aditivo); `isFinancialModuleEvent` cobre os novos.

## Configuração `CedenteAccount` (NOVO)

| Campo                                 | Tipo                      | Notas                |
| ------------------------------------- | ------------------------- | -------------------- |
| `id`                                  | `CedenteAccountId`        |                      |
| `bankCode`                            | `'237'`                   | Bradesco             |
| `branch` / `account` / `accountDigit` | string                    | agência/conta/dígito |
| `agreement`                           | string                    | convênio Bradesco    |
| `cnpj`                                | `Cnpj` (kernel, ADR-0044) | CNPJ do cedente      |
| `nextNsa`                             | int                       | contador NSA (D-NSA) |

## Schema MySQL (`fin_*` — Drizzle; migration `0004` via `db:generate`)

```text
fin_cedente_accounts(
  id varchar(36) PK, bank_code varchar(3), branch varchar(8), account varchar(16),
  account_digit varchar(2), agreement varchar(24), cnpj varchar(14), next_nsa int NOT NULL DEFAULT 1,
  created_at datetime(3), updated_at datetime(3)
)

fin_remittances(
  id varchar(36) PK, debit_account_ref varchar(36) NOT NULL,  -- FK lógica → fin_cedente_accounts
  nsa int NOT NULL, hash varchar(64) NOT NULL, status varchar(16) NOT NULL DEFAULT 'Generated',
  bucket varchar(63) NOT NULL, storage_key varchar(1024) NOT NULL, size_bytes bigint NOT NULL,
  generated_at datetime(3) NOT NULL,
  UNIQUE(debit_account_ref, nsa)  -- NSA único por conta
)

fin_remittance_items(
  id varchar(36) PK, remittance_id varchar(36) NOT NULL,  -- FK lógica → fin_remittances
  document_id varchar(36) NOT NULL, value_cents bigint NOT NULL,
  favored_name varchar(...), favored_document varchar(14), favored_bank/branch/account ...,
  INDEX(remittance_id), INDEX(document_id)
)

-- alteração em tabela existente:
fin_documents ADD COLUMN debit_account_ref varchar(36) NULL  -- D-CEDENTE
```

Restrições ADR-0020: sem JSON/ENUM nativo/trigger. `status` = varchar + CHECK. `UNIQUE(debit_account_ref, nsa)` garante não-reuso de NSA por conta no nível do banco.

## Mapeamento domínio↔CNAB (na ACL, fora do data-model)

`RemittanceOrder { cedente: CedenteAccount, payments: [{ favored, valueCents, paymentDate, bankDetails }] }` → segmentos P (título), Q (favorecido), J (se boleto — N/A aqui, só TED/Transferência) + header/trailer arquivo+lote. Detalhe de posições = `FIN-CNAB-ACL`, guiado pelo guideline local-only.
