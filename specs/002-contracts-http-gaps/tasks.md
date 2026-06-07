# Tasks: Gaps de borda HTTP do módulo `contracts`

**Feature**: `specs/002-contracts-http-gaps/` · **Input**: plan.md · data-model.md · contracts/README.md · bdd/\*.feature · research.md

> Organizado por **ticket W0→W3** (cada ticket ≈ uma fatia da user story; ver `plan.md` §Fatiamento). Disciplina
> fail-first: tarefas de **teste (W0/RED)** precedem **implementação (W1)** dentro de cada ticket. `[P]` =
> paralelizável (arquivos distintos, sem dependência pendente). `[US1]`/`[US2]` mapeiam as user stories da spec.
> Cada ticket abre com `pnpm run pipeline:state init <TICKET> --size <S|M|L>` e fecha com W3 verde.
> Decisões travadas no `/speckit-clarify` (R1–R6 em `research.md`).

## Phase 1 — Setup

- [x] T001 Confirmar que o adapter HTTP de `contracts` pode importar `partners/public-api` (camada adapters, permitido — FR-012 só proíbe em `domain`/`application`); validar que o ESLint boundary não bloqueia `adapters/http/*` → `modules/partners/public-api/read.ts`. Zero dependência nova (Zod/Fastify/Drizzle já presentes).

---

## Phase 2 — Foundational: ticket `CONTRACTS-CONTRACTOR-METADATA-DOMAIN` (L) — bloqueia US1 e US2

**Goal**: agregado `Contract` ganha `contractor` (referência leve) + metadados `observations`/`email`/`telephone`, com persistência. **Independent test**: `ContractorRef.parse` valida tipo/id; `updateContract` aplica metadados; row↔domínio mapeia os 5 campos.

### W0 (RED)

- [x] T002 `pnpm run pipeline:state init CONTRACTS-CONTRACTOR-METADATA-DOMAIN --size L`
- [x] T003 [P] W0: `tests/modules/contracts/contractor-ref.test.ts` — `parseContractorType` (4 válidos lowercase; outro→`contractor-type-unknown`), `parseContractorId` (vazio→`contractor-id-empty`; malformado→`contractor-id-invalid`), `makeContractorRef` compõe; igualdade estrutural (RED)
- [x] T004 [P] W0: `tests/modules/contracts/contract-metadata.test.ts` — `Contract` aceita `observations`/`email`/`telephone`; `updateContract` aplica patch parcial; corpo vazio→`contract-metadata-empty`; `title`/`objective` vazio rejeitado; campos imutáveis inalcançáveis (RED)
- [x] T005 [P] W0: `tests/modules/contracts/contract-repo-contractor.in-memory.test.ts` — round-trip do agregado com `contractor` + metadados pelo repo in-memory (RED)
- [x] T006 W0: `tests/integration/contracts/ctr-contracts-contractor.mysql.test.ts` — colunas `contractor_*` NOT NULL + CHECK de `contractor_type`; metadados nullable (atrás de opt-in de integração) (RED)

### W1 (impl)

- [x] T007 W1: criar `src/modules/contracts/domain/shared/contractor.ts` — `ContractorType`, `ContractorId` (branded), `ContractorRef` + smart constructors `Result` (data-model §VO)
- [x] T008 W1: estender `src/modules/contracts/domain/contract/types.ts` — campo `contractor: ContractorRef` + `observations`/`email`/`telephone` (`string | null`)
- [x] T009 W1: estender `src/modules/contracts/domain/contract/contract.ts` — criação vincula `contractor`; `updateContract` cobre os 3 metadados (sem tocar imutáveis)
- [x] T010 W1: adicionar erros em `src/modules/contracts/domain/contract/errors.ts` — `'contractor-id-empty' | 'contractor-id-invalid' | 'contractor-type-unknown' | 'contract-metadata-empty'`
- [x] T011 W1: estender `src/modules/contracts/adapters/persistence/schemas/mysql.ts` — colunas `contractor_type` varchar(16)+CHECK, `contractor_id` varchar(36) NOT NULL, `observations` varchar(1000), `email` varchar(255), `telephone` varchar(32) (nullable)
- [x] T012 W1: `pnpm run db:generate` e versionar a migration gerada (colunas `contractor_*` NOT NULL direto — tabela vazia; `COLLATE utf8mb4_bin` em `contractor_id`)
- [x] T013 [P] W1: mapear row↔domínio dos 5 campos em `src/modules/contracts/adapters/persistence/repos/contract-repository.drizzle.ts` (`makeContractorRef` na leitura)
- [x] T014 [P] W1: idem em `src/modules/contracts/adapters/persistence/repos/contract-repository.in-memory.ts`

### W2/W3

- [x] T015 W2: review (ddd: referência por identidade — Vernon p.460; clean-code: smart constructors/Result; drizzle: CHECK/NOT NULL)
- [x] T016 W3: gate verde (`typecheck`+`format:check`+`lint`+`test`) + `pnpm run test:integration` + `pipeline:state close CONTRACTS-CONTRACTOR-METADATA-DOMAIN`

**Checkpoint**: agregado + persistência prontos — US1 e US2 podem começar.

---

## Phase 3 — US1: Vínculo de parceiro no contrato (Priority: P1) 🎯 MVP

**Goal**: criar contrato com contratado + ler o detalhe composto. **Independent test**: POST com `contractor` persiste; GET detalhe devolve `snapshot` (ou `null` degradado).

### Ticket `PARTNERS-CONTRACTOR-ACTVIEW` (S) — independente (módulo partners), pode rodar em paralelo a Phase 2

- [x] T017 `pnpm run pipeline:state init PARTNERS-CONTRACTOR-ACTVIEW --size S`
- [x] T018 [P] [US1] W0: `tests/modules/partners/contractor-actview.test.ts` — `actToView` produz `ActView` (espelha Collaborator); `ContractorView` aceita `type:'act'`; `ContractorReadPort` resolve `act` (RED)
- [x] T019 [US1] W1: adicionar `ActView` + `actToView` em `src/modules/partners/public-api/contractor-view.mapper.ts` (union 3→4)
- [x] T020 [US1] W1: suportar `type:'act'` em `src/modules/partners/application/ports/contractor-read.ts` + `adapters/persistence/repos/contractor-read.drizzle.ts`
- [x] T021 [US1] W2: review read-only (clean-code) + W3 gate verde + `pipeline:state close PARTNERS-CONTRACTOR-ACTVIEW`

### Ticket `CONTRACTS-CREATE-CONTRACTOR-HTTP` (M) — depende de Phase 2

- [x] T022 `pnpm run pipeline:state init CONTRACTS-CREATE-CONTRACTOR-HTTP --size M`
- [x] T023 [P] [US1] W0: `tests/modules/contracts/create-contract-contractor.http.test.ts` — POST com `contractor` válido→201 + persiste `contractor_type/id`; sem `contractor`→400; `id` não-uuid→400; 401/403 (RED)
- [x] T024 [US1] W1: estender schema Zod do POST em `src/modules/contracts/adapters/http/schemas.ts` — `contractor: { type: enum, id: uuid }` obrigatório (`ContractorRefInput`, contracts/README §1)
- [x] T025 [US1] W1: `src/modules/contracts/application/use-cases/create-contract.ts` recebe/valida `contractor` no command (sem validar existência em Parceiros — R4)
- [x] T026 [US1] W1: ajustar rota POST + `contract-dto.ts` em `adapters/http/` para refletir `contractor` na resposta; `authorize('contract:write')`
- [x] T027 [US1] W2: review (security: sem oráculo na criação; clean-code) + W3 gate verde + `pipeline:state close CONTRACTS-CREATE-CONTRACTOR-HTTP`

### Ticket `CONTRACTS-DETAIL-COMPOSITION-HTTP` (M) — depende de Phase 2 + T019/T020 + T024/T025

- [x] T028 `pnpm run pipeline:state init CONTRACTS-DETAIL-COMPOSITION-HTTP --size M`
- [x] T029 [P] [US1] W0: `tests/modules/contracts/contract-detail-composition.http.test.ts` — supplier→snapshot c/ bankAccount/pixKey; financier/collaborator/act→snapshot sem bancário; contratado ausente→`snapshot:null` + 200; headers `Deprecation`/`Sunset` (RED)
- [x] T030 [P] [US1] W0: `tests/modules/contracts/contractor-composition.test.ts` — orquestrador colapsa not-found e erro de IO no mesmo `null` (anti-oráculo); respeita timeout de 2s (RED)
- [x] T031 [US1] W1: criar `src/modules/contracts/adapters/http/contractor-composition.ts` — `ContractorRef` → `ContractorReadPort` (`buildPartnersReadPort`) → snapshot|null; timeout 2s (config); mapear todas as falhas para `null`
- [x] T032 [US1] W1: wiring de `buildPartnersReadPort` em `src/modules/contracts/adapters/http/composition.ts` (deps da rota gorda)
- [x] T033 [US1] W1: GET `/contracts/:id` em `adapters/http/plugin.ts` compõe `contractor` no `contract-dto.ts` + headers `Deprecation`/`Sunset` (RFC 8594); `authorize('contract:read')`
- [x] T034 [US1] W2: review (security: anti-oráculo, timeout; ddd: composição na borda ADR-0032) + W3 gate verde + `pipeline:state close CONTRACTS-DETAIL-COMPOSITION-HTTP`

**Checkpoint**: US1 completa — contrato deixa de ser "solto"; detalhe mostra o contratado.

---

## Phase 4 — US2: Update de metadados do contrato (Priority: P1) — depende de Phase 2

**Goal**: PATCH de metadados + DELETE recusado. **Independent test**: PATCH altera metadados; campo imutável/corpo vazio→400; DELETE→405.

### Ticket `CONTRACTS-PATCH-METADATA-HTTP` (M)

- [x] T035 `pnpm run pipeline:state init CONTRACTS-PATCH-METADATA-HTTP --size M`
- [x] T036 [P] [US2] W0: `tests/modules/contracts/patch-contract-metadata.http.test.ts` — PATCH metadados→200; `originalValue` no body→400 (`.strict()`); `{}`→400 (`.refine`); `title:""`→400; contrato inexistente→404; 401/403 (RED)
- [x] T037 [P] [US2] W0: `tests/modules/contracts/delete-contract-refused.http.test.ts` — DELETE→405 code `contract-delete-forbidden`; sem sessão→401 (RED)
- [x] T038 [P] [US2] W0: `tests/modules/contracts/update-contract-metadata.usecase.test.ts` — use-case aplica patch; contrato inexistente→`contract-not-found` (RBAC puro, sem tenant) (RED)
- [x] T039 [US2] W1: `src/modules/contracts/application/use-cases/update-contract-metadata.ts` (sobre `updateContract`; 404 para contrato inexistente; RBAC puro — sem ownership por tenant)
- [x] T040 [US2] W1: schema Zod PATCH em `adapters/http/schemas.ts` — `.strict()` + `.refine(≥1 campo)` (contracts/README §3)
- [x] T041 [US2] W1: rota PATCH `/contracts/:id` em `adapters/http/plugin.ts`; `authorize('contract:write')`; resposta = DTO de detalhe
- [x] T042 [US2] W1: rota DELETE `/contracts/:id` em `adapters/http/plugin.ts` — recusa **405** + envelope `contract-delete-forbidden`; `requireAuth` antes da política
- [x] T043 [US2] W2: review (security: mass-assignment/`.strict()`, RBAC; clean-code) + W3 gate verde + `pipeline:state close CONTRACTS-PATCH-METADATA-HTTP`

**Checkpoint**: US2 completa — metadados editáveis; imutabilidade e exclusão lógica preservadas.

---

## Phase 5 — Polish & Cross-Cutting

- [x] T044 [P] Marcar no `po-feedback/0001-gap-api-v2-contracts.md` os itens fechados (Bucket B/D: #2 children/files→contractor; #3 PATCH) referenciando este épico
- [x] T045 [P] Atualizar OpenAPI/doc do `/api/v2`: `contractor` obrigatório no POST (breaking documentado), bloco `contractor` no detalhe com `Sunset`, PATCH/DELETE — entrada no `handbook/CHANGELOG.md` (OpenAPI é gerado do Zod, ADR-0027)
- [x] T046 [P] Coleção Bruno de smoke e2e das rotas (POST c/ contractor, GET detalhe, PATCH, DELETE recusado) em `api-collections/contracts/` (espelha padrão partners)

---

## Dependencies

- **Phase 2 (`CONTRACTS-CONTRACTOR-METADATA-DOMAIN`) bloqueia tudo** (US1 create/detail e US2 patch dependem do agregado + persistência).
- `PARTNERS-CONTRACTOR-ACTVIEW` (T017–T021) é **independente** — pode rodar em paralelo a Phase 2 (módulo partners, não compartilha arquivos com contracts).
- `CONTRACTS-CREATE-CONTRACTOR-HTTP` depende de Phase 2.
- `CONTRACTS-DETAIL-COMPOSITION-HTTP` depende de Phase 2 + ActView (T019/T020) + create (T024/T025, para haver contrato com contractor a ler).
- `CONTRACTS-PATCH-METADATA-HTTP` depende de Phase 2 (US2 independe de US1).
- Phase 5 (polish) só após os tickets cobertos estarem verdes.

## Parallel opportunities

- Dentro de cada ticket, as tarefas W0 marcadas `[P]` (arquivos de teste distintos) rodam juntas.
- `PARTNERS-CONTRACTOR-ACTVIEW` roda 100% em paralelo a Phase 2.
- US2 (`CONTRACTS-PATCH-METADATA-HTTP`) roda em paralelo a US1 após Phase 2 (tocam o mesmo `plugin.ts`/`schemas.ts` → serializar T033/T041/T042 se feitos juntos, ou coordenar merge).
- T013/T014 (repos drizzle/in-memory) são `[P]` entre si.

## MVP

- **MVP mínimo**: Phase 2 + US1 create+detail (`CONTRACTS-CONTRACTOR-METADATA-DOMAIN` + `PARTNERS-CONTRACTOR-ACTVIEW` + `CONTRACTS-CREATE-CONTRACTOR-HTTP` + `CONTRACTS-DETAIL-COMPOSITION-HTTP`) — destrava o bloqueador real (contrato com contratado). É o que "trava de verdade o front".
- **Incremento**: US2 (`CONTRACTS-PATCH-METADATA-HTTP`) — edição de metadados, independente.

## Independent test por user story

- **US1**: criar contrato com `contractor:{type,id}` e confirmar que o GET de detalhe devolve o snapshot composto (e `null` quando o parceiro não existe) — sem depender de US2.
- **US2**: editar `title`/`observations` via PATCH e confirmar na leitura; tentar campo imutável → 400; DELETE → 405 — sem depender de US1.
