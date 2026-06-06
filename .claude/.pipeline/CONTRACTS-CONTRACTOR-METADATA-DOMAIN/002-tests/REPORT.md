# W0 (RED) — CONTRACTS-CONTRACTOR-METADATA-DOMAIN

**Wave**: W0 (testes RED antes de tocar `src/`) · **Agente**: tdd-strategist · **Size**: L
**Feature**: `specs/002-contracts-http-gaps/` · **Data**: 2026-06-06

## Escopo (foundational)

`ContractorRef` VO + metadados `observations`/`email`/`telephone` no agregado `Contract` +
`updateContract` estendido + colunas em `ctr_contracts` + mapeamento nos repos. **Fora**: rotas HTTP,
use-cases de PATCH/composição (tickets #2/#4/#5).

## Decisões travadas (clarify/analyze — research.md R1–R6)

- `contractor` = **referência leve** `ContractorRef = { type: ContractorType; id: ContractorId }` (R1). Variantes ricas só na borda.
- Erros do VO em **string-literal kebab** (`'contractor-type-unknown'|'contractor-id-empty'|'contractor-id-invalid'`), como VOs folha (`user-ref.ts`/`contract-id.ts`). NÃO usar Tagged Errors (esses são do agregado).
- `title`/`objective` são **metadado editável** → W1 remove de `ContractImmutableField`; imutáveis reais = `id|sequentialNumber|signedAt|originalValue|originalPeriod`.
- Colunas: `contractor_type` varchar(16)+CHECK, `contractor_id` varchar(36) NOT NULL; `observations`/`email`/`telephone` nullable; sem índice (YAGNI). Tabela vazia → NOT NULL direto.

## Testes escritos (RED)

| # | Arquivo | Cobre |
|---|---------|-------|
| T003 | `tests/modules/contracts/domain/shared/contractor.test.ts` | `parseType` (4 válidos lowercase; PascalCase/desconhecido/vazio→`contractor-type-unknown`), `parseId` (v4 ok, ''→empty, não-uuid/v1→invalid), `make` (compõe, propaga erros, igualdade estrutural) |
| T004 | `tests/modules/contracts/domain/contract/contract-metadata.test.ts` | `create` exige/vincula `contractor` e inicia metadados null; `updateContract` altera observations/email/telephone **e** title/objective; preserva subtipo refinado + contractor; imutabilidade de valor/período = compile-time (comentado) |
| T005 | `tests/modules/contracts/adapters/persistence/contract-repository-contractor.test.ts` | round-trip in-memory (`save`→`findById`) preserva contractor + metadados; **asserção estrutural** das 5 colunas em `ctr_contracts` (sem DB, roda no gate default) |
| T006 | `tests/modules/contracts/adapters/persistence/contract-contractor-schema.mysql.test.ts` | round-trip MySQL real (Drizzle) de contractor + metadados; guard `MYSQL_INTEGRATION=1` (padrão #3) — W1 inclui no glob de `test:integration` |

## Execução — prova do RED

```
node --test ... (4 arquivos do ticket)
ℹ tests 4 · pass 0 · fail 4
code: 'ERR_MODULE_NOT_FOUND'
url: .../src/modules/contracts/domain/shared/contractor.ts
```

**RED por inexistência** (não por ambiente): os 4 arquivos falham porque
`src/modules/contracts/domain/shared/contractor.ts` ainda não existe. Os asserts de comportamento
(metadados, round-trip, colunas) só serão exercitados após o W1 criar o módulo, os campos e o
mapeamento. O arquivo de integração (T006) é no-op no gate default (guard `MYSQL_INTEGRATION`); sua
falha atual também é por inexistência do módulo (import top-level).

## Roteiro para o W1 (GREEN mínimo)

1. Criar `src/modules/contracts/domain/shared/contractor.ts` (VO + smart constructors, `isUuidV4`).
2. `types.ts`: `ContractRegistration` ganha `contractor: ContractorRef` + `observations`/`email`/`telephone` (`string|null`); remover `title`/`objective` de `ContractImmutableField`.
3. `contract.ts`: `create`/`createPending` recebem `contractor` e iniciam metadados `null`; `CreateContractInput`/`CreatePendingContractInput` ganham `contractor`.
4. `schemas/mysql.ts`: 5 colunas + CHECK de `contractor_type`; `pnpm run db:generate` + versionar migration.
5. Repos `contract-repository.{drizzle,in-memory}.ts` + mapper: persistir/ler os 5 campos.
6. Atualizar fixtures/`validInput` existentes que criam contrato sem `contractor` (senão typecheck quebra).
7. Incluir T006 no glob de `pnpm run test:integration`.

## Pendências / riscos para o W1

- **Quebra em cascata esperada**: tornar `contractor` obrigatório em `CreateContractInput` fará `tests/.../contract.test.ts` e `fixtures.ts` (`buildContract`/`buildPendingContract`) pararem de compilar. W1 deve atualizá-los (adicionar `contractor` default) — é regressão a corrigir, não a ignorar (Princ. II).
- Mapper row↔domínio deve validar `contractor_type`/`contractor_id` na leitura via `ContractorRef.make` (rejeitar estado inválido vindo do banco — regra de adapters).
