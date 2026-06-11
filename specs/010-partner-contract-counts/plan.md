# Implementation Plan: Contagem de contratos/aditivos por parceiro nos grids

**Branch**: `feat/backlog-residual-sdd` | **Date**: 2026-06-11 | **Spec**: [spec.md](./spec.md)

**Input**: `specs/010-partner-contract-counts/spec.md`

## Summary

Dois eixos, independentes entre si:

- **Eixo A (R1+R2) — contagem cross-módulo.** Criar um **read port no `contracts/public-api`** que responde,
  por contratado, a contagem de contratos e aditivos (`countByContractor(type, ids) → Map<id,{contracts,
amendments}>`, em lote) e a pertinência por estado (`contractorIdsWithContractStatus(type, status) →
Set<id>` para o filtro do Fornecedor). O módulo **partners** consome esse port na borda HTTP (composição do
  list item de Colaborador/Fornecedor/ACT) — espelhando como `contracts` consome o `programs` read port
  (server.ts). Conta **todos os estados** (clarify); o filtro do Fornecedor é state-specific.
- **Eixo B (R3) — vínculo Colaborador↔Programa.** Adicionar `programId` (UUID, ref leve, opcional) ao
  agregado `Collaborator` + coluna `program_id` em `par_collaborators` (migration) + cadastro/edição + filtro
  `programIds` na listagem + borda HTTP. Referência por ID ao módulo `programs` (ADR-0014), sem FK física nem
  import de `programs/domain`.

## Technical Context

**Language/Version**: TypeScript 6 / Node.js 24 (ESM/NodeNext) · **Storage**: MySQL 8.4 (`ctr_*`, `par_*`)
· **Deps**: Drizzle + mysql2 · **Testing**: `node:test` (unit + repo in-memory) + `test:integration` (MySQL)
· **Project Type**: modular monolith (backend) · **Performance**: contagem por página = **2 GROUP BY** (sem
N+1), `WHERE contractor_type=? AND contractor_id IN (...)` · **Scale**: volume modesto de parceiros/contratos.

## Constitution Check

| Princípio                         | Status     | Nota                                                                                                                                                                                                                                                                                                                                                           |
| --------------------------------- | ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| I. TDD W0→W3                      | ✅         | W0 RED por fatia (read port, consumo, vínculo programa)                                                                                                                                                                                                                                                                                                        |
| II. Regressão zero                | ✅         | gate W3 ao fim (`/speckit-verify`)                                                                                                                                                                                                                                                                                                                             |
| III. pnpm                         | ✅         | —                                                                                                                                                                                                                                                                                                                                                              |
| IV. Modular Monolith / isolamento | ⚠️→✅      | **3 BCs tocados** (contracts expõe count via `public-api`; partners consome; partners→programs por ref de ID). Acoplamento **unidirecional, por contrato público / ref leve** (ADR-0006/0014) — sem leitura cruzada de tabela nem import de domínio alheio. Mesmo padrão do bloco `contractor` e do `programs` read port. **Justificado** (padrão sancionado). |
| V. Domínio puro                   | ✅         | count = read-model (sem regra); `programId` é ref leve no agregado (smart constructor valida UUID)                                                                                                                                                                                                                                                             |
| VI. MySQL único + Drizzle         | ✅         | **1 migration**: `par_collaborators.program_id` (`db:generate:partners`). Count usa colunas/índices existentes                                                                                                                                                                                                                                                 |
| VII. HTTP-first / CLI             | ✅         | mudança **aditiva** no DTO de item de lista + query; sem rota nova                                                                                                                                                                                                                                                                                             |
| VIII. TS strict + idioma          | ✅         | EN no código, PT em docs                                                                                                                                                                                                                                                                                                                                       |
| IX. Decisões ancoradas (ACDG)     | ⚠️ parcial | ancoradas em ticket + Clarifications + ADR-0006/0014 + padrão do programs read port. Citação literal MCP deferida.                                                                                                                                                                                                                                             |

**Resultado**: PASS. Sem 5º módulo, classe no domínio, JSON nativo, Redis/Kafka.

## Project Structure (source)

```text
src/modules/contracts/
├── public-api/
│   ├── contract-count-read.ts            # NOVO port + buildContractCountReadPort (mysql) + tipos
│   └── index.ts                          # + reexporta port/builder
└── adapters/persistence/repos/
    ├── contract-count-read.drizzle.ts    # NOVO adapter (2 GROUP BY: contratos + aditivos; set por status)
    └── contract-count-read.in-memory.ts  # NOVO adapter (teste/memory: conta sobre store injetado)

src/modules/partners/
├── domain/collaborator/{types.ts,collaborator.ts}        # + programId: string | null (ref UUID opcional)
├── application/use-cases/list-collaborators.ts           # + filtro programIds
├── adapters/persistence/{schemas/mysql.ts,mappers/collaborator.mapper.ts,migrations/...}  # + program_id
└── adapters/http/
    ├── schemas.ts, collaborator-dto.ts, collaborator-list-query.ts   # + programId + counts
    ├── supplier-dto.ts, supplier-schemas.ts, supplier-list-query.ts  # + counts + filtro contractStatus
    ├── act-dto.ts                                          # + counts
    └── composition.ts, *-plugin.ts                         # injeta ContractCountReadPort; compõe no list item

src/server.ts                              # wira buildContractCountReadPort (mysql) em buildPartnersHttpDeps
```

**Structure Decision**: 2 fatias **independentes**. Fatia A (count port + consumo + filtro fornecedor) não
depende da Fatia B (vínculo programa). Implementar/testar em sequência sem bloqueio mútuo.

## Complexity Tracking

> Sem violações que exijam justificativa extra — o cross-módulo é o padrão sancionado (ADR-0006/0014).

## Migrations Drizzle (core-api)

- **Mudança de schema**: [x] coluna — `par_collaborators.program_id` `varchar(36)` **nullable** (ref leve;
  COLLATE utf8mb4*bin no SQL manual). Prefixo `par*\*`, **sem FK física** cross-módulo (ADR-0014). Gerar via
`pnpm run db:generate:partners` e versionar (editar charset/collate no SQL gerado, como nas demais).
- **Count (Eixo A)**: **sem** mudança de schema — usa `ctr_contracts.contractor_type/contractor_id` +
  `ctr_amendments.contract_id` (índice já existe). Índice `(contractor_type, contractor_id)` em
  `ctr_contracts` é **opcional** (perf) — decidir em tasks.
- **Outbox**: nenhum evento novo.

## Contrato HTTP (Fase 2+)

Mudança **aditiva** (sem rota nova):

- List item de Colaborador/Fornecedor/ACT: `+ contractsCount: number, amendmentsCount: number`.
- Detalhe/item + cadastro de Colaborador: `+ programId: string | null`.
- `GET /api/v1/collaborators`: `+ programIds` (filtro). `GET /api/v1/suppliers`: `+ contractStatus` (filtro).

## Estimativa de Pipeline (W0 size)

- **Tamanho**: [x] **L** — read port cross-módulo novo (2 adapters) + consumo na borda dos 3 grids + vínculo
  de domínio novo (Colaborador→Programa) com migration + filtros. 3 BCs.
- **Plano de testes W0 (RED)** (por fatia):
  - **A1** `contract-count-read.in-memory.test.ts`: `countByContractor(type, ids)` agrupa certo (contratos +
    aditivos); 0 para id sem contrato; sem vazamento entre type/id; `contractorIdsWithContractStatus`.
  - **A2** `collaborators-list.routes.test.ts` (+ supplier/act): item de lista traz `contractsCount`/
    `amendmentsCount` reais (read port injetado em memória); 1 chamada por página (batch).
  - **A3** supplier list: filtro `contractStatus` restringe corretamente.
  - **B1** `collaborator.test.ts`: `programId` opcional no register/edit (UUID inválido → erro).
  - **B2** `collaborator.mapper` + schema: round-trip de `program_id`.
  - **B3** `list-collaborators.test.ts`: filtro `programIds` casa só os vinculados.
  - **B4** `collaborators.routes.test.ts`: `programId` no cadastro/detalhe + filtro na query.
