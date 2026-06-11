# Phase 1 — Data Model

## Entidades

### Contract (existente, `ctr_contracts`) — usado pelo count port

| Campo             | Tipo                                             | Papel aqui                                  |
| ----------------- | ------------------------------------------------ | ------------------------------------------- |
| `contractor_type` | varchar IN (supplier/financier/collaborator/act) | chave da consulta inversa                   |
| `contractor_id`   | varchar(36)                                      | id do parceiro contratado                   |
| `status`          | varchar                                          | usado só pelo filtro R2 (não pela contagem) |
| `id`              | varchar(36)                                      | join com `ctr_amendments.contract_id`       |

`ctr_amendments` (existente): `contract_id` (index) → conta aditivos por contrato.

### Collaborator (existente, `par_collaborators`) — Eixo B

- **Novo campo (domínio)**: `programId: string | null` (UUID v4 ou null; ref leve ao módulo `programs`).
- **Nova coluna**: `program_id varchar(36)` nullable, COLLATE utf8mb4_bin (migration via `db:generate:partners`).
- **Regra**: opcional; quando presente, deve ser UUID v4 (smart constructor). Sem FK física (ADR-0014).

## Projeção de leitura (read-model novo) — `ContractCountReadPort`

```
ContractorCount = { contracts: number; amendments: number }

countByContractor(type, ids: string[]) → Map<id, ContractorCount>   // ids ausentes ⇒ {0,0}
contractorIdsWithContractStatus(type, status) → Set<id>             // R2: filtro do Fornecedor
contractorIdsWithAnyContract(type) → Set<id>                        // R2: "sem contrato" = complemento
```

- Exposto por `contracts/public-api`; consumido por `partners` (borda HTTP).
- Conta **todos os estados** (contagem); o filtro R2 é state-specific.

## Projeção de lista (DTO de item) — campos novos

| Grid        | Campos aditivos no item                          |
| ----------- | ------------------------------------------------ |
| Colaborador | `contractsCount`, `amendmentsCount`, `programId` |
| Fornecedor  | `contractsCount`, `amendmentsCount`              |
| ACT         | `contractsCount`, `amendmentsCount`              |

## Filtros novos (query)

| Recurso              | Filtro           | Semântica                                         |
| -------------------- | ---------------- | ------------------------------------------------- |
| `GET /collaborators` | `programIds[]`   | colaboradores vinculados a algum dos programas    |
| `GET /suppliers`     | `contractStatus` | fornecedores com (ou sem) contrato no estado dado |
