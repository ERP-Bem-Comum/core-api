# Tasks: Contagem de contratos/aditivos por parceiro nos grids

**Feature**: `specs/010-partner-contract-counts` · **Branch**: `feat/backlog-residual-sdd` · **Size**: L (3 BCs)

**Disciplina**: TDD W0→W3 (RED antes de `src/`). Gate via `/speckit-verify`. `[P]` paraleliz. · `[Ax]/[Bx]` fatia.

Duas fatias independentes: **A** (contagem cross-módulo + filtro fornecedor) · **B** (vínculo colaborador↔programa).

---

## Phase 1 — Setup

- [x] T001 Confirmar branch/feature ativa (`specs/010-partner-contract-counts`); nenhuma dependência nova.

## Phase 2 — Fatia A: read port de contagem (núcleo, R1) + filtro fornecedor (R2)

- [x] T002 [P] [A] W0 RED: `tests/modules/contracts/public-api/contract-count-read.in-memory.test.ts` —
      `countByContractor(type, ids)` agrupa contratos+aditivos; id sem contrato → {0,0}; sem vazamento type/id;
      `contractorIdsWithContractStatus`/`...AnyContract`.
- [x] T003 [A] Definir o port + tipos em `src/modules/contracts/public-api/contract-count-read.ts`
      (`ContractCountReadPort`, `ContractorCount`, erro) + reexport em `public-api/index.ts`.
- [x] T004 [A] Implementar `contract-count-read.in-memory.ts` (conta sobre store injetável; default vazio).
- [x] T005 [A] Implementar `contract-count-read.drizzle.ts` (2 GROUP BY + sets por status; `IN (...)`) +
      `buildContractCountReadPort` (pool próprio, falha DEGRADA — espelha `buildProgramsReadPort`).
- [x] T006 [P] [A] W0 RED: `tests/modules/partners/adapters/http/partners-list-contract-counts.routes.test.ts`
      — item de lista (collaborator/supplier/act) traz `contractsCount`/`amendmentsCount` reais (port in-memory
      semeado via `contractCountRead`); **1** chamada de `countByContractor` por página (spy).
- [x] T007 [A] Injetar `contractCountRead` em `PartnersHttpDeps` (`composition.ts`) + compor as contagens nos
      list items de collaborator/supplier/act (helper `contract-counts.ts`; `*ListItemSchema` em `*-schemas.ts`;
      plugins) — degrada para 0/0 se o port falha.
- [x] T008 [P] [A] W0 RED: supplier list — filtro `contractStatus`
      (`tests/.../suppliers-contract-status-filter.routes.test.ts`): estado X → só com contrato nesse estado;
      `none` → só sem contrato; ausência → não filtra.
- [x] T009 [A] Implementar o filtro `contractStatus` no `supplier-list-query.ts`/`supplier-schemas.ts`
      (`resolveContractStatusFilter` pré-filtra ids via `contractorIdsWithContractStatus`/`...AnyContract`
      antes de paginar).
- [x] T010 [A] Wirar `buildContractCountReadPort` (mysql, reusa `CONTRACTS_DATABASE_URL`) em `src/server.ts`
      → `buildPartnersHttpDeps` (memory → in-memory vazio; handle fechado no graceful shutdown).

**Checkpoint A**: os 3 grids mostram contagens; filtro de status do fornecedor funciona.

## Phase 3 — Fatia B: vínculo Colaborador↔Programa (R3)

- [x] T011 [P] [B] W0 RED: `tests/modules/partners/domain/collaborator/collaborator.test.ts` — `programId`
      opcional no register/edit/complete; UUID inválido → erro; null aceito.
- [x] T012 [B] Adicionar `programId: string | null` ao core/inputs em `domain/collaborator/types.ts` +
      validação (UUID v4|null) em `collaborator.ts` (register/edit/complete preservam).
- [x] T013 [B] Schema: `par_collaborators.program_id varchar(36)` nullable em `schemas/mysql.ts`;
      `mappers/collaborator.mapper.ts` row↔domínio. W0 RED do mapper/round-trip antes.
- [x] T014 [B] Gerar migration `pnpm run db:generate:partners` + editar charset/collate (COLLATE bin) +
      versionar; validar `db:generate` → "nothing to migrate" (snapshot consistente).
- [x] T015 [P] [B] W0 RED: `tests/modules/partners/application/use-cases/list-collaborators.test.ts` —
      filtro `programIds` casa só os vinculados; ausência do filtro não afeta.
- [x] T016 [B] Adicionar `programIds?` ao `ListCollaboratorsFilter` + predicado em `list-collaborators.ts`.
- [x] T017 [P] [B] W0 RED: `tests/modules/partners/adapters/http/collaborators-*.routes.test.ts` —
      `programId` no cadastro/detalhe + `programIds` na query.
- [x] T018 [B] HTTP do colaborador: `programId` no body/dto/schema; `programIds` no `collaborator-list-query.ts`.

**Checkpoint B**: colaborador vincula programa; filtro por programa funciona.

## Phase 4 — Polish & Cross-Cutting

- [x] T019 [P] Integração: `contract-count-read.drizzle` + `program_id` no MySQL real (`test:integration`). Pré-merge.
- [x] T020 [P] Atualizar `docs/05-frontend-api-handoff.md` (counts nos list items; `programId`/`programIds`;
      `contractStatus`) e o handoff do front.
- [x] T021 Mover `handbook/tickets/todo/PAR-GRID-CONTRACTS-COUNT.md` → `done/` (após W3 verde). Anotar R3
      entregue (vínculo programa).
- [x] T022 Gate W3 (`/speckit-verify`): typecheck + format:check + lint + test verdes (2657 testes, 0 fail;
      integração MySQL: contracts 91 pass + partners 33 pass).

---

## Dependências

- **Fatia A (T002–T010)** e **Fatia B (T011–T018)** são independentes — podem ir em sequência.
- Dentro de A: T002→(T003,T004,T005)→T006→T007; T008→T009; T010 por último de A.
- Dentro de B: T011→T012; T013→T014; T015→T016; T017→T018.
- Polish (T019–T022) por último.

## MVP

**Fatia A** entrega o núcleo (coluna Contratos/Aditivos nos 3 grids + filtro de status do fornecedor). **Fatia
B** (vínculo programa) é incremento independente.
