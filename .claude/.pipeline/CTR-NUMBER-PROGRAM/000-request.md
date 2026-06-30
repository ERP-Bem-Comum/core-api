# 000 — Request CTR-NUMBER-PROGRAM

> Origem: `handbook/tickets/todo/CTR-NUMBER-PROGRAM.md` (handoff front web-app v2). "Faça como o
> front pede" (Gabriel, 2026-06-10). Size L (2 módulos: programs + contracts). É também o **G1** do
> card `CTR-CONTRACT-METADATA-E-ADITIVOS` (este ticket o realiza).

## Estado / o que já existe
- **#1 Numeração sequencial real**: ✅ FEITO (CTR-CONTRACT-SEQUENTIAL-NUMBER — backend gera `NNNN/YYYY`
  por ano). O front não inventa mais. Resta o **prefixo `CT`/`OS`**, que depende da classificação (#2).

## Decisões de modelagem (aval do Gabriel — "como o front pede")

- **D1 — Classificação `CT`/`OS`** no agregado Contract (registration): enum de domínio
  `ContractClassification = 'CT' | 'OS'` (varchar+CHECK; ADR-0020 sem ENUM nativo). Coluna
  `classification` NOT NULL DEFAULT `'CT'` (legado vira CT, como o front assume). Exposta em list-item +
  detalhe. O front compõe o rótulo `CT 0001/2026` / `OS 0001/2026` (prefixo + número gerado).
- **D2 — Metadados de cadastro** (registration, nuláveis): `programId` (UUID, ref ao módulo programs),
  `budgetPlanId` (UUID, ref — **sem BC de Orçamento; guardado/retornado cru, sem nome**),
  `categorizacao` (string), `centroDeCusto` (string). Persistidos + retornados em list-item + detalhe.
- **D3 — Composição de `program` (id + nome/sigla)** via **novo `ProgramsReadPort`** no
  `programs/public-api` (cross-módulo só por public-api — ADR-0006/0014; espelha `ContractorReadPort`
  de Parceiros). **Batch** (`getProgramViews(ids)` → Map) porque a coluna "Programa" está no GRID
  (evita N+1 na listagem). Degrada para `snapshot: null` quando programs indisponível (driver memory).
- **D4 — `budgetPlan` (nome) NÃO entregue** — não existe BC de Orçamento. Só `budgetPlanId`. Flag pro front.

## Plano de implementação

### Módulo programs (novo read port)
- `application/ports/program-read.ts`: `ProgramReadPort = { getProgramViews(ids) => Result<Map<id,
  ProgramView>, 'program-read-unavailable'> }`; `ProgramView = { id, name, sigla, programNumber }`.
- `adapters/persistence/repos/program-read.drizzle.ts`: `createDrizzleProgramReadStore(handle)` —
  SELECT id,name,sigla,program_number WHERE id IN (...). id inexistente → ausente no Map. Erro infra → err.
- `public-api/read.ts`: `buildProgramsReadPort({connectionString})` (applyMigrations:false; mirror partners).
- `public-api/index.ts` (NOVO barrel): exporta `buildProgramsReadPort`, `ProgramReadPort`, `ProgramView`.

### Módulo contracts
- Domínio `types.ts`: `ContractClassification`; `ContractRegistration` += `classification` +
  `programId|budgetPlanId|categorizacao|centroDeCusto` (todos os estados herdam).
- `contract.ts`: `create`/`createPending` validam (classification enum; programId/budgetPlanId UUID se
  presentes). `errors.ts`: erro de classificação inválida se preciso.
- Persistência: `schemas/mysql.ts` (+5 colunas + CHECK classification) + migration; `mappers/contract.mapper.ts`
  (round-trip nos 3 branches: Pending/efetivo/Cancelled).
- Use cases `create-contract`/`create-pending-contract`/`import-contracts`: aceitam os novos campos.
- Borda HTTP: `schemas.ts` (body `contractWriteShape` + `registrationShape` com classification+metadados+
  bloco `program`); `contract-dto.ts` (serializa); `program-composition.ts` (NOVO — single + batch);
  `composition.ts` (wira `ProgramReadPort` via `PROGRAMS_DATABASE_URL`, degrada null); `plugin.ts`
  (list batch-compõe; detalhe compõe; writes passam os campos); `contracts-csv.ts` (+colunas).

## Critérios de Aceitação
1. `classification` (`CT`/`OS`) persistida + retornada (list-item + detalhe). Default `CT` p/ legado.
2. `programId`/`budgetPlanId`/`categorizacao`/`centroDeCusto` persistidos + retornados.
3. Bloco `program` no contrato traz `{ id, snapshot: { name, sigla, programNumber } | null }` (sigla
   popula a coluna Programa); batch na listagem (sem N+1); degrada para `null` sem programs.
4. Numeração já gerada (CTR-CONTRACT-SEQUENTIAL-NUMBER) — front aplica prefixo CT/OS.
5. Cross-módulo só via `programs/public-api` (ADR-0006/0014); domínio/application intactos.

## Fora de escopo
- BC de Orçamento / `budgetPlan` nome. Aditivos (G2/G3 já feitos). Prefixo CT/OS no backend (é do front).

## Fechamento
W0 RED → W1 → W2 (drizzle-orm-expert + typescript-language-expert) → W3 (+ integração programs+contracts).
Ao fechar: mover CTR-NUMBER-PROGRAM → done/; reconciliar kanban (G1 do CTR-CONTRACT-METADATA realizado).
