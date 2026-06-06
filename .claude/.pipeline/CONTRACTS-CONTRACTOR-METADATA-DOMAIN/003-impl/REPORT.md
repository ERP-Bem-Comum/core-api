# W1 (GREEN) — CONTRACTS-CONTRACTOR-METADATA-DOMAIN

**Wave**: W1 (implementação mínima até GREEN) · **Agente**: ports-and-adapters · **Size**: L
**Feature**: `specs/002-contracts-http-gaps/` · **Data**: 2026-06-06

## Resultado

Todos os gates verdes: `typecheck` ✓ · `format:check` ✓ · `lint` ✓ · `test` ✓ (**2232 testes, 0 falhas**).
Os 4 testes RED do W0 agora passam; o teste de integração MySQL (T006) permanece guarded por
`MYSQL_INTEGRATION=1` (no-op no gate default).

## Decisão de escopo (registrada em sessão com o humano)

Tornar `contractor` **obrigatório** no agregado `Contract` é um campo obrigatório no agregado central —
cascateia para **todo** site de construção de contrato. O plano original alocava parte disso ao ticket #2
(HTTP create) e ao ticket de import. Decisão tomada: **absorver o create-path inteiro no #1** (mantendo a
spec: contractor obrigatório + colunas NOT NULL). Consequência: o #1 ficou grande e o #2 encolhe para
essencialmente a composição do `GET /contracts/:id` (a parte de POST/create já está pronta aqui).

## Mudanças — produção (`src/`)

**Domínio:**
- `domain/shared/contractor.ts` (NOVO) — `ContractorType` (union), `ContractorId` (branded), `ContractorRef` (VO), smart constructors `parseType`/`parseId`/`make` → `Result` (erros kebab string-literal).
- `domain/contract/types.ts` — `ContractRegistration` ganha `contractor` + `observations`/`email`/`telephone` (`string|null`); `title`/`objective` **removidos** de `ContractImmutableField` (passam a editáveis); `contractor` adicionado aos imutáveis; `CreateContractInput`/`CreatePendingContractInput` ganham `contractor`.
- `domain/contract/contract.ts` — `create`/`createPending` vinculam `contractor` e iniciam metadados `null`.

**Persistência:**
- `adapters/persistence/schemas/mysql.ts` — `ctr_contracts` + `contractor_type` varchar(16)+CHECK, `contractor_id` varchar(36) NOT NULL, `observations`/`email`/`telephone` nullable.
- `adapters/persistence/mappers/contract.mapper.ts` — `contractToInsert`/`contractFromRow` mapeiam os 5 campos; novo erro `ContractMapperInvalidContractor` (reidrata via `ContractorRef.make`, rejeita estado inválido do banco).
- ⚠️ **Migration `db:generate` ainda NÃO rodada** — ver Pendências.

**Application:**
- `create-contract.ts` / `create-pending-contract.ts` — command ganha `contractorType`/`contractorId`; parse via `ContractorRef.make`; erro propagado.
- `import-contracts.ts` — `ImportContractRow` ganha `contractorType?`/`contractorId?`; `toCreateCommand` repassa (ausência → linha falha, modelo D3).

**Borda/CLI:**
- `adapters/http/schemas.ts` — `createContractBodySchema` ganha `contractor: { type: enum, id: uuid }`.
- `adapters/http/plugin.ts` — POST mapeia `body.contractor` → command.
- `cli/commands/criar-contrato.ts` — flags `--contratado-tipo`/`--contratado-id` (obrigatórias).
- `cli/import-parser.ts` + `cli/commands/importar-contratos.ts` — colunas `contratado_tipo`/`contratado_id` (CSV/JSON) + schema doc.

## Mudanças — testes (cascata de `contractor` obrigatório)

~22 arquivos atualizados para fornecer `contractor`/`contractorType`+`contractorId`: fixtures compartilhadas
(`fixtures.ts` + `someContractor`), testes de domínio/use-case (create, create-pending, activate, end,
upload-document, homologate ×3, r4-chronology, contract, contract-pending), mapper (`BASE_ROW` + createPending),
drizzle-mysql (insert seed), regression, HTTP routes (writes `activeBody`/`pendingBody`, documents flow),
import unit (`baseRow`), e **6 invocações de CLI E2E** (criar-contrato/importar) via seus helpers.

## Pendências / próximos passos

- **Migration Drizzle**: rodar `pnpm run db:generate` e versionar a migration das 5 colunas (com `COLLATE utf8mb4_bin` em `contractor_id`). Não rodada neste W1 (requer ambiente Drizzle Kit); o teste de integração T006 só fica verde após isso + inclusão no glob `test:integration`. **Sinalizar no W2/W3.**
- **Glob de integração**: incluir `contract-contractor-schema.mysql.test.ts` em `package.json#scripts.test:integration`.
- **Ticket #2** (`CONTRACTS-CREATE-CONTRACTOR-HTTP`): a parte de POST/create já está implementada aqui — #2 reduz-se à composição do `GET` (ticket #4) ou pode ser fundido. Revisar fatiamento.
- **Import legado**: o mapeamento do contratado a partir dos dados v1 (contractType + supplierId/...) continua fora de escopo (ticket de import / decisão de produto). Hoje o import exige as colunas `contratado_*` no arquivo.

## Aderência às regras

- Domínio puro (Princ. V): VO `Readonly` + `Result` + branded; sem classe/throw.
- VO folha usa erro kebab string-literal (não Tagged Errors do agregado) — convenção respeitada.
- Cross-módulo: nenhum import de `partners/*` adicionado a `contracts/domain|application` (FR-012 intacto).
- MySQL (Princ. VI): varchar+CHECK, sem ENUM; sem FK física cross-db (ADR-0014).
