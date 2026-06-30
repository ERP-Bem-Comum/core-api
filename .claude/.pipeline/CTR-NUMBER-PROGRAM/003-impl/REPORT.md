# 003 — W1 (impl) — CTR-NUMBER-PROGRAM

Implementação mínima até GREEN, test-first por camada (padrão dos tickets grandes). As camadas
internas (domínio + persistência + use cases + composição program) já vinham do W1 anterior; esta
sessão wirou a **borda HTTP** (itens 1-6 do plano que faltavam).

## Entregue nesta sessão (borda HTTP)

### Camada A — DTO + schemas (GREEN)
- `adapters/http/schemas.ts`: `registrationShape` += `classification` (enum CT|OS) + `programId`/
  `budgetPlanId`/`categorizacao`/`centroDeCusto` (nullable) + bloco `program` (`programBlockSchema`,
  objeto-nullable com `snapshot:{name,sigla,programNumber}`). `contractWriteShape` += os mesmos
  campos (opcionais) no body de escrita (`programId`/`budgetPlanId` como `z.uuid()`).
- `adapters/http/contract-dto.ts`: `contractToListItem(c, program = null)` (2º arg) serializa os 5
  campos crus + bloco `program`; `contractToDetailDto(detail, contractor, program = null)` (3º arg).
- Testes: `contract-dto.test.ts` (deepEqual estrito atualizado + 3 casos novos).

### Camada B — CSV (GREEN)
- `adapters/http/contracts-csv.ts`: HEADER += 5 colunas crus ao FIM (posições existentes preservadas);
  `cellsFor` reestruturado (registration + `effectiveCells` + meta). Bloco `program` composto NÃO
  entra no CSV (só leitura web).
- Teste: `contracts-export-csv.routes.test.ts` (HEADER_ROW atualizado + 1 caso de valores crus).

### Camada C — composition + plugin + server (GREEN)
- `adapters/http/program-composition.ts`: + `programBlockFromSnapshots(programId, snapshots)` (projeção
  batch → bloco, sem nova chamada ao port).
- `adapters/http/composition.ts`: config += `programReadPort?` (injetável; NÃO construído aqui — a
  connection de programs é do server); deps += `getProgramBlock` (single) + `getProgramSnapshots` (batch).
- `adapters/http/plugin.ts`: lista **batch**-compõe (1 chamada/página, sem N+1); detalhe + PATCH
  compõem single; escritas (POST/activate/end/homologate/cancel) repassam `program` via
  `listItemWithProgram`; POST repassa classification + metadados aos commands.
- `server.ts`: constrói `buildProgramsReadPort(PROGRAMS_DATABASE_URL)` quando `PROGRAMS_DRIVER=mysql`,
  injeta em `buildContractsHttpDeps`, fecha no graceful shutdown. Falha de abertura DEGRADA (não
  derruba o boot — composição opcional, ADR-0032).
- Teste novo: `contracts-program.routes.test.ts` (5 casos: POST classification+metadados, lista batch
  sem N+1, degradação null, detalhe single).

## Suporte de teste
- `fixtures.ts`: `ContractOverrides` += classification + metadados; `registrationMeta()` (spread
  condicional, `exactOptionalPropertyTypes`).

## Bug encontrado e corrigido
- `plugin.ts` lista usava `.map(contractToListItem)` — o `.map` passava o **índice** como 2º arg
  (`program`), serializando `program: 0` → 500 na validação de response. Corrigido para `.map((c) =>
  contractToListItem(c))`. (Efeito colateral clássico de adicionar 2º parâmetro a função usada em `map`.)

## Fora de escopo (YAGNI)
- `import-contracts.ts` intacto: o legado v1 não traz classification/programId; o default `CT` + `null`
  (já em `buildContract`) cobre CA-1/CA-2 para legado sem tocar o use case.

## Gate W3 (verde)
- `pnpm run typecheck` ✓ · `pnpm run format:check` ✓ · `pnpm run lint` ✓
- `pnpm test`: 2571 testes · 2554 pass · 17 skip · **0 fail**

## Correções de regressão (lint pré-existente do W1 anterior + testes W0)
- `domain/contract/contract.ts`: comparação morta (`classification !== 'OS'` após narrowing) → `includes`.
- `programs/.../program-read.drizzle.ts`: import `Result` não usado removido.
- `program-composition.test.ts`: fake `getProgramViews` async sem await → `Promise.resolve`.
