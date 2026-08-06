# Phase 1 — Data Model: `002-contracts-http-gaps`

> Modelo de domínio + persistência das mudanças no módulo `contracts`. Deriva de `spec.md` (FR-001..013) e
> `research.md` (R1–R6). Domínio puro (Princ. V): `Readonly`, smart constructor `Result<T,E>`, branded types,
> erros string-literal EN kebab-case.

## VO — `ContractorRef` (NOVO) — `contracts/domain/shared/contractor.ts`

Referência por identidade ao contratado (aggregate root do BC Parceiros). **Não** carrega payload das variantes.

```ts
export type ContractorType = 'supplier' | 'financier' | 'collaborator' | 'act';
export type ContractorId = Brand<string, 'ContractorId'>;
export type ContractorRef = Readonly<{ type: ContractorType; id: ContractorId }>;
```

| Campo  | Tipo             | Regra de validação                                                                                       |
| ------ | ---------------- | -------------------------------------------------------------------------------------------------------- |
| `type` | `ContractorType` | ∈ `{supplier,financier,collaborator,act}` (lowercase); fora → `contractor-type-unknown`                  |
| `id`   | `ContractorId`   | string não-vazia (UUID v4 esperado); vazia → `contractor-id-empty`; malformada → `contractor-id-invalid` |

**Smart constructors** (puros, retornam `Result`):

- `parseContractorType(raw: string): Result<ContractorType, 'contractor-type-unknown'>`
- `parseContractorId(raw: string): Result<ContractorId, 'contractor-id-empty' | 'contractor-id-invalid'>`
- `makeContractorRef(type: string, id: string): Result<ContractorRef, ContractorRefError>` (compõe os dois)

**Identidade/imutabilidade**: VO imutável; igualdade estrutural por `(type,id)`. Definido na criação do
contrato; **não muda** via PATCH (decisão Clarifications). Não há "substituição de contratado" nesta fase.

## Agregado `Contract` — campos adicionados — `contracts/domain/contract/types.ts`

| Campo          | Tipo             | Origem | Regra                                                                 |
| -------------- | ---------------- | ------ | --------------------------------------------------------------------- |
| `contractor`   | `ContractorRef`  | FR-002 | **obrigatório** na criação; imutável pós-criação                      |
| `observations` | `string \| null` | FR-009 | metadado opcional; editável via PATCH; `≤ 1000` chars                 |
| `email`        | `string \| null` | FR-009 | metadado opcional; editável via PATCH; formato e-mail quando presente |
| `telephone`    | `string \| null` | FR-009 | metadado opcional; editável via PATCH; `≤ 32` chars                   |

> Campos **imutáveis** já existentes (inalterados, fora do PATCH): `originalValue`, `originalPeriod`/datas,
> `sequentialNumber`, `status`. Mudam só por aditivo homologado / transições de estado.

### Mutação de metadados — `updateContract` (estende helper existente)

`update-contract-metadata` use-case → aplica patch parcial `{title?,objective?,observations?,email?,telephone?}`
sobre o agregado via `updateContract` (já em `contract.ts`). Invariantes:

- Pelo menos 1 campo presente (corpo vazio é barrado na borda — FR-007; defense-in-depth: use-case retorna `contract-metadata-empty` se chegar vazio).
- `title`/`objective` não podem virar string vazia (`min(1)`).
- Nenhum campo imutável é alcançável (não há setter; não está no command).

### Erros de domínio adicionados — `contracts/domain/contract/errors.ts`

`'contractor-id-empty' | 'contractor-id-invalid' | 'contractor-type-unknown' | 'contract-metadata-empty'`

## Projeção (borda, NÃO persiste) — `ContractorSnapshot`

Composta na leitura via `partners/public-api` (`ContractorView`). Forma no DTO de detalhe:

```ts
contractor: {
  type: ContractorType;
  id: string;
  snapshot:
    | { name: string; document: string; bankAccount: BankAccount | null; pixKey: PixKey | null; updatedAt: string } // supplier
    | { name: string; document: string; updatedAt: string }   // financier/collaborator/act (sem bancário/PIX)
    | null;  // contratado ausente/ilegível em Parceiros (degradação graciosa — FR-006)
}
```

> `bankAccount`/`pixKey` existem **só** para `supplier` (o domínio de Parceiros só modela destino de pagamento
> em Supplier — ver `payment-target.ts`). `snapshot: null` é idêntico para "não existe" e "erro de IO" (anti-oráculo).

## Persistência — `ctr_contracts` (colunas adicionadas) — `contracts/adapters/persistence/schemas/mysql.ts`

| Coluna            | Tipo MySQL      | Null     | Constraint / Nota                                                                         |
| ----------------- | --------------- | -------- | ----------------------------------------------------------------------------------------- |
| `contractor_type` | `varchar(16)`   | NOT NULL | CHECK `IN ('supplier','financier','collaborator','act')` (sem ENUM — ADR-0020)            |
| `contractor_id`   | `varchar(36)`   | NOT NULL | UUID; **sem FK física** (cross-db `par_*` — ADR-0014); `COLLATE utf8mb4_bin` na migration |
| `observations`    | `varchar(1000)` | NULL     | metadado de cadastro                                                                      |
| `email`           | `varchar(255)`  | NULL     | RFC 5321 (≤254)                                                                           |
| `telephone`       | `varchar(32)`   | NULL     | E.164 + ramal                                                                             |

- **Índices**: nenhum novo (YAGNI — sem query por contratado).
- **Mapeamento row↔domínio**: `contractor_type`+`contractor_id` → `makeContractorRef` (valida na leitura);
  os 3 metadados mapeiam direto (`null` ↔ ausência). Repos `drizzle` e `in-memory` espelham.
- **Migration**: `pnpm run db:generate`; colunas `contractor_*` `NOT NULL` direto (tabela vazia — R3).

## Toque em Parceiros — `ActView` — `partners/public-api/contractor-view.mapper.ts`

```ts
export type ActView = Readonly<{ type: 'act'; id: string; name: string; document: string; /* +campos do placeholder */ updatedAt: Date }>;
export type ContractorView = SupplierView | FinancierView | CollaboratorView | ActView; // 3 → 4
export const actToView = (act: Act, updatedAt: Date): ActView => ({ ... });
```

E o `ContractorReadPort`/adapter passa a resolver `type: 'act'`. Espelha `CollaboratorView` (Act = clone enxuto).

## Mapa de rastreabilidade FR → modelo

| FR     | Elemento de modelo                                                  |
| ------ | ------------------------------------------------------------------- |
| FR-001 | `Contract.contractor` obrigatório; command de criação               |
| FR-002 | VO `ContractorRef` + `ContractorType`/`ContractorId`                |
| FR-003 | colunas `contractor_type`/`contractor_id` (NOT NULL, CHECK, sem FK) |
| FR-005 | `ActView` + `ContractorView` 4/4                                    |
| FR-006 | `snapshot: null` (degradação)                                       |
| FR-007 | `update-contract-metadata` + `contract-metadata-empty`              |
| FR-009 | `observations`/`email`/`telephone` no agregado + colunas            |
| FR-010 | DELETE recusado (nenhuma mutação de modelo — política de borda)     |
