# Phase 1 — Contracts (internos)

Feature interna (sem rota HTTP nova; mudanças aditivas em DTO/query). Os "contratos" são o novo read port
público de Contratos e os campos novos.

## 1. Read port — `contracts/public-api/contract-count-read.ts`

```ts
export type ContractorKind = 'supplier' | 'financier' | 'collaborator' | 'act';
export type ContractorCount = Readonly<{ contracts: number; amendments: number }>;
export type ContractCountReadError = 'contract-count-read-unavailable';

export type ContractCountReadPort = Readonly<{
  countByContractor: (
    type: ContractorKind,
    ids: readonly string[],
  ) => Promise<Result<ReadonlyMap<string, ContractorCount>, ContractCountReadError>>;
  contractorIdsWithContractStatus: (
    type: ContractorKind,
    status: ContractStatus,
  ) => Promise<Result<ReadonlySet<string>, ContractCountReadError>>;
  contractorIdsWithAnyContract: (
    type: ContractorKind,
  ) => Promise<Result<ReadonlySet<string>, ContractCountReadError>>;
}>;

// mysql (espelha buildProgramsReadPort): abre pool próprio; falha → DEGRADA (port que devolve 0/vazio).
export const buildContractCountReadPort: (
  config: Readonly<{ connectionString: string }>,
) => Promise<Result<ContractCountReadPort, 'contract-count-open-failed'>>;
```

- **Drizzle adapter**: 2 GROUP BY (contratos, aditivos) + SELECT DISTINCT por status. `ids` vazio → Map vazio
  (não consulta). `contractor_id IN (...)` com bind list.
- **In-memory adapter** `makeInMemoryContractCountReadPort(store = [])`: store de
  `{ contractorType, contractorId, status, amendments }`; conta por filtro. Usado em testes de borda de
  partners + boot `driver=memory` (devolve 0/vazio).

## 2. Consumo em partners (borda HTTP)

- `PartnersHttpDeps` ganha `contractCountRead: ContractCountReadPort`.
- No handler de lista de cada grid (collaborator/supplier/act): após obter a página de records, coletar os
  ids → `countByContractor(type, ids)` (1 chamada) → mapear cada item DTO com `{contractsCount,
amendmentsCount}` (default 0). **Degradação**: se o port falhar, contagens = 0 (não derruba a lista).
- Filtro do Fornecedor: se `contractStatus` presente → `contractorIdsWithContractStatus`/`...AnyContract` →
  pré-filtra os ids antes de paginar.

## 3. Wiring (server.ts)

```ts
// espelha programsReadPort: só mysql + CONTRACTS_DATABASE_URL; falha DEGRADA (contagens 0).
const contractCountRead = (PARTNERS usa contracts) ... buildContractCountReadPort({ connectionString: CONTRACTS_DATABASE_URL })
buildPartnersHttpDeps({ ..., contractCountRead })
```

(memory mode → `makeInMemoryContractCountReadPort()` vazio.)

## 4. Collaborator (Eixo B)

- `domain/collaborator/types.ts`: `programId: string | null` no core + nos inputs de register/edit/complete.
- `collaborator.ts`: valida `programId` (UUID v4 ou null) via smart constructor; preserva em edit/complete.
- `schemas/mysql.ts`: `program_id varchar(36)` nullable; `mappers/collaborator.mapper.ts`: row↔domínio.
- `list-collaborators.ts`: `programIds?: readonly string[]` no filter; predicado `programId ∈ programIds`.
- HTTP: `programId` no detalhe/item + body de cadastro; `programIds` na list query (parse).
