# Tasks: Agregador de busca + paridade de export CSV (`partners` `/api/v1`)

**Feature**: `specs/003-partners-aggregator-export/` · **Input**: plan.md · data-model.md · contracts/README.md · bdd/\*.feature · research.md

> Organizado por **ticket W0→W3** (cada ticket ≈ uma user story; ver `plan.md` §Fatiamento). Disciplina
> fail-first: tarefas de **teste (W0/RED)** precedem **implementação (W1)** dentro de cada ticket. `[P]` =
> paralelizável (arquivos distintos, sem dependência pendente). `[US1]`/`[US2]` mapeiam as user stories.
> Cada ticket abre com `pnpm run pipeline:state init <TICKET> --size M` e fecha com W3 verde.
> Decisões travadas no `/speckit-clarify` (R1–R4 em `research.md`): merge in-memory (`name,type,id` + cap
> 10k→503); permissão do agregador = AND das 4 reads. **Sem schema/migration** (só leitura/serialização na borda).

## Phase 1 — Setup

- [x] T001 Confirmar que os 4 readers (`supplier`/`financier`/`collaborator`/`act-reader`) e os helpers de `supplier-list-query.ts` (`paginateRecords`/`queryToFilter`/`*ForExport`) estão acessíveis à borda; e que `supplier-csv.ts`/`collaborator-csv.ts` existem (referência/reuso). Zero dependência nova.

---

## Phase 2 — US1: Agregador de busca (Priority: P2) — ticket `PARTNERS-AGGREGATOR-HTTP` (M)

**Goal**: `GET /api/v1/partners` paginado dos 4 tipos (projeção plana). **Independent test**: chamar o agregador e validar itens dos 4 tipos + `meta` + sort + cap + RBAC.

### W0 (RED)

- [x] T002 `pnpm run pipeline:state init PARTNERS-AGGREGATOR-HTTP --size M`
- [x] T003 [P] [US1] W0: `tests/modules/partners/adapters/http/partner-aggregate-query.test.ts` — projeção `PartnerListItem` (name/document/active por tipo); filtro `search` (name/document, case-insensitive) e `type`; merge + sort `(name,type,id)` determinístico; paginação (`meta` coerente, `totalPages=ceil`); cap `MAX_TOTAL` → erro (RED)
- [x] T004 [P] [US1] W0: `tests/modules/partners/adapters/http/partners-aggregate.routes.test.ts` — `GET /api/v1/partners` via `fastify.inject`: 200 com 4 tipos; `?type=supplier` filtra; `?search=` casa; `?type=invalido`→400; soma>cap→503 `partners-aggregate-too-large`; sem 1 das 4 reads→403; sem sessão→401 (RED)

### W1 (impl)

- [x] T005 [US1] W1: `src/modules/partners/adapters/http/partner-aggregate-query.ts` — projeção + filtro + merge (`Promise.all` dos 4 readers) + sort `(name,type,id)` + paginate + cap `MAX_TOTAL=10_000` (`Result`), funções puras (espelha `paginateRecords`)
- [x] T006 [US1] W1: `src/modules/partners/adapters/http/partners-schemas.ts` — Zod query `{ search?, type? (enum), page, limit (max 100) }` + response `PartnersPage`
- [x] T007 [US1] W1: `src/modules/partners/adapters/http/partners-plugin.ts` — rota `GET /partners`; **AND das 4 reads via preHandlers encadeados** (`authorize` é single-perm — achado I1): `preHandler: [requireAuth, authorize('supplier:read'), authorize('financier:read'), authorize('collaborator:read'), authorize('act:read')]` (1º 403 corta); mapeia cap→503; envelope
- [x] T008 [US1] W1: wiring dos 4 readers no agregador em `src/modules/partners/adapters/http/composition.ts` + registro `{plugin, prefix:'/api/v1'}` em `src/server.ts`
- [x] T009 [US1] W2: review (security: AND-perms, sem vazamento; ddd: composição read-side ADR/Vernon; clean-code) + W3 gate verde + `pipeline:state close PARTNERS-AGGREGATOR-HTTP`

**Checkpoint**: US1 completa — front troca fan-out de 4 GETs por 1 chamada.

---

## Phase 3 — US2: Paridade de export CSV (Priority: P3) — ticket `PARTNERS-EXPORT-PARITY-HTTP` (M)

**Goal**: `GET /<tipo>/export` para collaborators/financiers/acts (paridade com suppliers). **Independent test**: chamar cada export e validar CSV + headers + escape + RBAC.

### W0 (RED)

- [x] T010 `pnpm run pipeline:state init PARTNERS-EXPORT-PARITY-HTTP --size M`
- [x] T011 [P] [US2] W0: `tests/modules/partners/adapters/export/financier-csv.test.ts` — HEADER fixo + achatamento de `Financier`; escape anti-injection (`=`/`+`/`-`/`@`); 0 registros → só cabeçalho (RED)
- [x] T012 [P] [US2] W0: `tests/modules/partners/adapters/export/act-csv.test.ts` — idem para `Act` (RED)
- [x] T013 [P] [US2] W0: `tests/modules/partners/adapters/http/partners-export-parity.routes.test.ts` — `GET /collaborators|financiers|acts/export` via `fastify.inject`: 200 text/csv + `Content-Disposition` + `nosniff`; respeita filtros; 403 sem `<tipo>:read`; 401 sem sessão (RED)

> ⚠️ **Achado U1 do `/speckit-analyze`**: só `supplier-list-query.ts` tem `*ForExport`. `financier`/`collaborator` têm `queryToFilter` (aplicar à lista para o export); **`act` não tem `act-list-query.ts`** (criar filtro mínimo). Refletido em T014a/T016–T018.

### W1 (impl)

- [x] T014 [P] [US2] W1: `src/modules/partners/adapters/export/financier-csv.ts` — serializer espelhando `supplier-csv.ts` (`toCsv` + HEADER fixo)
- [x] T015 [P] [US2] W1: `src/modules/partners/adapters/export/act-csv.ts` — idem para `Act`
- [x] T014a [P] [US2] W1: criar `act-list-query.ts` (`queryToFilter` + filtro mínimo p/ export, espelhando os demais `*-list-query.ts`); financier/collaborator REUSAM o `queryToFilter` existente (aplicar à lista — não há `*ForExport` pré-pronto)
- [x] T016 [US2] W1: rota `GET /collaborators/export` em `plugin.ts` — `queryToFilter` (collaborator-list-query) → lista filtrada → `collaborator-csv.ts` (já existe); `authorize('collaborator:read')` + headers CSV
- [x] T017 [US2] W1: rota `GET /financiers/export` em `financier-plugin.ts` — `queryToFilter` (financier-list-query) → `financier-csv.ts`; `authorize('financier:read')` + headers CSV
- [x] T018 [US2] W1: rota `GET /acts/export` em `act-plugin.ts` — filtro de `act-list-query.ts` (T014a) → `act-csv.ts`; `authorize('act:read')` + headers CSV
- [x] T019 [US2] W2: review (security: exposição de dado/PII no export, escape; clean-code: DRY dos serializers) + W3 gate verde + `pipeline:state close PARTNERS-EXPORT-PARITY-HTTP`

**Checkpoint**: US2 completa — 4/4 tipos têm export CSV.

---

## Phase 4 — Polish & Cross-Cutting

- [x] T020 [P] Atualizar `handbook/CHANGELOG.md`: agregador `/partners` + paridade de export (fecha gaps de partners `/api/v1` do `api-readiness-report` do front; ITENs 3/4 do ticket).
- [x] T021 [P] Coleção Bruno de smoke e2e das 4 rotas novas em `api-collections/partners/` (agregador + 3 exports), espelhando o padrão existente.

## Dependencies

- Os 2 tickets (`PARTNERS-AGGREGATOR-HTTP`, `PARTNERS-EXPORT-PARITY-HTTP`) são **independentes** — podem rodar em paralelo / qualquer ordem.
- Phase 4 (polish) só após os 2 tickets verdes.

## Parallel opportunities

- Dentro de cada ticket, as tarefas W0 `[P]` (arquivos de teste distintos) rodam juntas.
- T014/T015 (serializers financier/act) são `[P]` entre si.
- Os 2 tickets podem ser tocados por pessoas distintas em paralelo (arquivos majoritariamente distintos; atenção a `composition.ts`/`server.ts` só no ticket 1).

## MVP

- **MVP**: `PARTNERS-AGGREGATOR-HTTP` (US1) — destrava o seletor único de contratado (consumido pela feature 002). `PARTNERS-EXPORT-PARITY-HTTP` (US2) é incremento barato.

## Independent test por user story

- **US1**: `GET /api/v1/partners` retorna os 4 tipos paginados/ordenados; `type` filtra; `search` casa; cap→503; AND-perms→403.
- **US2**: cada `GET /<tipo>/export` devolve CSV com headers corretos, escapado, respeitando filtros e `<tipo>:read`.
