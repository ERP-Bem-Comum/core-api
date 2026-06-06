# Tasks: Gaps de borda HTTP do módulo `partners`

**Feature**: `specs/001-partners-http-gaps/` · **Input**: plan.md · data-model.md · contracts/README.md · bdd/\*.feature

> Organizado por **ticket W0→W3** (cada ticket ≈ uma user story; ver `plan.md` §Fatiamento). Disciplina
> fail-first: tarefas de **teste (W0/RED)** precedem **implementação (W1)** dentro de cada ticket. `[P]` =
> paralelizável (arquivos distintos, sem dependência pendente). Cada ticket abre com
> `pnpm run pipeline:state init <TICKET> --size <S|M|L>` e fecha com W3 verde.

## Phase 1 — Setup

- [ ] T001 Confirmar dependência de upload multipart (`@fastify/multipart`) instalada com limites; se ausente, adicionar via `pnpm add` e configurar `limits` no registro do plugin de colaboradores em `src/server.ts`

## Phase 2 — Foundational: ticket `CORE-CSV-PARSE-UTIL` (S) — bloqueia US-001

**Goal**: promover parsing CSV genérico ao util compartilhado (ADR-0002). **Independent test**: `parseCsv` converte texto→`Table` e rejeita vazio/malformado.

- [ ] T002 `pnpm run pipeline:state init CORE-CSV-PARSE-UTIL --size S`
- [ ] T003 [P] W0: escrever `tests/shared/utils/csv-parse.test.ts` — `parseCsv('a,b\n1,2')`→`{headers:['a','b'],rows:[['1','2']]}`; vazio→`err('csv-empty')`; malformado→`err('csv-malformed')`; campos com aspas/vírgula/escape RFC 4180 (RED)
- [ ] T004 W1: implementar `tokenizeCsv` + `parseCsv(content): Result<Table, CsvParseError>` em `src/shared/utils/csv.ts` (promover lógica de `src/modules/contracts/cli/import-parser.ts`, genérica)
- [ ] T005 W1: refatorar `src/modules/contracts/cli/import-parser.ts` para consumir `parseCsv`/`tokenizeCsv` do shared (sem regressão; suíte de contracts verde)
- [ ] T006 W2: review read-only do util (clean-code-reviewer) — pureza, escape, ausência de duplicação
- [ ] T007 W3: gate verde (`typecheck`+`format:check`+`lint`+`test`) e `pipeline:state close CORE-CSV-PARSE-UTIL`

## Phase 3 — US-001: ticket `PARTNERS-COLLAB-IMPORT-HTTP` (M) — depende de Phase 2

**Goal**: rota de import + wiring. **Independent test**: `POST /api/v1/collaborators/import` cria válidas e reporta inválidas.

- [ ] T008 `pnpm run pipeline:state init PARTNERS-COLLAB-IMPORT-HTTP --size M`
- [ ] T009 [P] [US1] W0: `tests/modules/partners/collaborator-import.http.test.ts` — CT-001..008 via `fastify.inject` (feliz, parcial, dup intra-arquivo, vazio, malformado→400, 403, 401, upload acima do limite) (RED)
- [ ] T010 [P] [US1] W0: `tests/modules/partners/collaborator-import-dto.test.ts` — mapeamento record CSV→`RegisterCollaboratorCommand` (Zod) rejeita campos faltando/ inválidos (RED)
- [ ] T011 [US1] W1: criar `src/modules/partners/adapters/http/collaborator-import-dto.ts` (record→`RegisterCollaboratorCommand` via Zod `.strict()`)
- [ ] T012 [US1] W1: wiring de `importCollaborators` em `PartnersHttpDeps` + `makeDeps` (`composition.ts`), reusando `collaboratorWriterRepo` + `clock`
- [ ] T013 [US1] W1: rota `POST /collaborators/import` em `src/modules/partners/adapters/http/plugin.ts` — multipart→`parseCsv`→map dto→`importCollaborators`→adaptar output `{created, failed:[{line,error}]}` (`index`→`line` considerando header); `authorize('collaborator:write')`
- [ ] T014 [US1] W1: aplicar limites de upload (fileSize/files:1) + cap de linhas + não-logar-PII (segurança, contracts §US-001)
- [ ] T015 [US1] W2: review (clean-code + security-backend-expert: upload, PII, DoS)
- [ ] T016 [US1] W3: gate verde + `pipeline:state close`

## Phase 4 — US-003: ticket `PARTNERS-SUPPLIER-EXPORT-HTTP` (S)

**Goal**: rota de export. **Independent test**: `GET /api/v1/suppliers/export` devolve CSV filtrado.

- [ ] T017 `pnpm run pipeline:state init PARTNERS-SUPPLIER-EXPORT-HTTP --size S`
- [ ] T018 [P] [US3] W0: `tests/modules/partners/supplier-export.http.test.ts` — CT-201..203 (filtro por categoria, formula injection escapada, 403) (RED)
- [ ] T019 [US3] W1: rota `GET /suppliers/export` em `src/modules/partners/adapters/http/supplier-plugin.ts` — reusa `suppliersToCsv` + `queryToFilter`; headers `text/csv` + `Content-Disposition: attachment` + `nosniff`; `authorize('supplier:read')`
- [ ] T020 [US3] W2: review (security: exposição de dado bancário/PIX, auditoria de export)
- [ ] T021 [US3] W3: gate verde + close

## Phase 5 — US-004: ticket `PARTNERS-SERVICE-CATEGORIES-HTTP` (S)

**Goal**: catálogo read-only. **Independent test**: `GET /api/v1/suppliers/service-categories` → 39 códigos.

- [ ] T022 `pnpm run pipeline:state init PARTNERS-SERVICE-CATEGORIES-HTTP --size S`
- [ ] T023 [P] [US4] W0: `tests/modules/partners/service-categories.http.test.ts` — CT-204 (39 itens, typos literais) + 403/401 (RED)
- [ ] T024 [P] [US4] W1: `listServiceCategories()` em `src/modules/partners/domain/supplier/service-category.ts` (read-only do union)
- [ ] T025 [US4] W1: rota `GET /suppliers/service-categories` em `supplier-plugin.ts`; `authorize('supplier:read')`
- [ ] T026 [US4] W2: review read-only (clean-code-reviewer)
- [ ] T027 [US4] W3: gate verde (`typecheck`+`format:check`+`lint`+`test`) + `pipeline:state close PARTNERS-SERVICE-CATEGORIES-HTTP`

## Phase 6 — US-002: ticket `PARTNERS-TERRITORY` (L)

**Goal**: parceria territorial persistida (soft-delete) + rotas. **Independent test**: toggle de UF/município persiste; cross-state preservado.

### W0 (RED)

- [ ] T028 `pnpm run pipeline:state init PARTNERS-TERRITORY --size L`
- [ ] T029 [P] [US2] W0: `tests/modules/partners/partner-state.test.ts` — Entity `PartnerState` (activate/deactivate/reactivate; invariante soft-delete; idempotência) (RED)
- [ ] T030 [P] [US2] W0: `tests/modules/partners/partner-municipality.test.ts` — Entity `PartnerMunicipality` (idem + cross-state) (RED)
- [ ] T031 [P] [US2] W0: `tests/modules/partners/partner-geography-repo.in-memory.test.ts` — port (toggle/list) contra repo in-memory (RED)
- [ ] T032 [P] [US2] W0: `tests/modules/partners/partner-territory.http.test.ts` — CT-101..109 via `fastify.inject` (RED)
- [ ] T033 [US2] W0: `tests/integration/partners/partner-territory.mysql.test.ts` — CHECK de coerência soft-delete + persistência (atrás de opt-in de integração) (RED)

### W1 (impl)

- [ ] T034 [P] [US2] W1: domínio `src/modules/partners/domain/geography/partner-state.ts` (Entity + transições puras `Result`)
- [ ] T035 [P] [US2] W1: domínio `src/modules/partners/domain/geography/partner-municipality.ts`
- [ ] T036 [US2] W1: port `src/modules/partners/application/ports/partner-geography-repository.ts`
- [ ] T037 [P] [US2] W1: use-cases `toggle-partner-state.ts`, `toggle-partner-municipality.ts`, `list-partner-states.ts`, `list-partner-municipalities.ts` em `application/use-cases/`
- [ ] T038 [US2] W1: schema `par_states` + `par_municipalities` em `src/modules/partners/adapters/persistence/schemas/mysql.ts` (active+deactivated_at+CHECK, índices) — espelha `parSuppliers`
- [ ] T039 [US2] W1: `pnpm run db:generate --config drizzle.config.partners.ts` e versionar migration gerada
- [ ] T040 [P] [US2] W1: repos `partner-geography-repository.in-memory.ts` e `partner-geography-repository.drizzle.ts` em `adapters/persistence/repos/`
- [ ] T041 [US2] W1: `GEOGRAPHY_PERMISSION = { read, write }` em `src/modules/partners/public-api/permissions.ts` + seed RBAC
- [ ] T042 [US2] W1: plugin `src/modules/partners/adapters/http/partner-geography-plugin.ts` (GET/POST/DELETE; validar `:uf`/`:ibgeCode` ∈ catálogo; envelope) + schemas Zod
- [ ] T043 [US2] W1: wiring no `composition.ts` (repo memory|mysql) + registro `{plugin, prefix:'/api/v1'}` em `src/server.ts`

### W2/W3

- [ ] T044 [US2] W2: review (ddd: Entity/agregado pequeno; database-engineer: schema/índice; security: access control + validação de identificador)
- [ ] T045 [US2] W3: gate verde + `pnpm run test:integration` + `pipeline:state close PARTNERS-TERRITORY`

## Phase 7 — US-005: ticket `PARTNERS-COLLAB-FILTERS-DECISION` (S)

**Goal**: contrato de listagem não anuncia `programa`/`idade`. **Independent test**: query desses params é ignorada/rejeitada.

- [ ] T046 `pnpm run pipeline:state init PARTNERS-COLLAB-FILTERS-DECISION --size S`
- [ ] T047 [P] [US5] W0: `tests/modules/partners/collaborator-list-contract.test.ts` — CT-205 (params `programa`/`idade` não filtram; schema `.strict()` os rejeita/ignora) (RED)
- [ ] T048 [US5] W1: garantir `collaboratorListQuerySchema` (`collaborator-list-query.ts`) não inclui `programa`/`idade`; doc/OpenAPI alinhada
- [ ] T049 [US5] W2: review + W3 gate verde + close

## Phase 8 — Polish & Cross-Cutting

- [ ] T050 [P] Atualizar `web-app/specs/008-partners/api-readiness-report.md`: marcar gaps fechados (🔴/🟡 → 🟢) e referenciar este épico
- [ ] T051 [P] Promover ADR-0001 da feature a ADR do handbook que resolve a D9 do ADR-0031 + registrar em `handbook/CHANGELOG.md`
- [ ] T052 [P] Coleção Bruno de smoke e2e das 7 rotas novas em `api-collections/` (reusa padrão `e2e-bruno-partners.sh`)

## Dependencies

- **Phase 2 (`CORE-CSV-PARSE-UTIL`) bloqueia Phase 3 (import)**.
- Phases 4, 5, 6, 7 são **independentes entre si** (podem ser feitas em qualquer ordem / paralelo por pessoas distintas).
- Phase 8 (polish) só após os tickets cobertos estarem verdes.

## Parallel opportunities

- Dentro de cada ticket, as tarefas W0 marcadas `[P]` (arquivos de teste distintos) rodam juntas.
- Entre tickets: 4, 5, 6, 7 não compartilham arquivos críticos (export/catálogo tocam `supplier-plugin.ts` — serializar T019 e T025 se feitos juntos).

## MVP

- **MVP mínimo**: Phase 2 + Phase 3 (`CORE-CSV-PARSE-UTIL` + import) — destrava o gap P1 de maior valor com menor risco.
- **MVP territorial**: Phase 6 isolada — destrava os 2 sub-domínios do front que estão em mock total.
