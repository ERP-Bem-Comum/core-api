# Tasks: Fachada OO (objeto-fachada de arrow-functions) na borda HTTP

**Feature**: `specs/004-http-facade-controllers/` · **Input**: plan.md · research.md · data-model.md · contracts/README.md · quickstart.md

> Organizado por **ticket W0→W3** (cada ticket = 1 user story = 1 módulo; ver `plan.md` §Fatiamento).
> **REFACTOR comportamento-preservado:** o "W0" **NÃO escreve teste RED novo** (não há API nova) — ele **confirma a
> suíte de caracterização verde** e **congela a contagem** como baseline (R3/Fowler; ver Complexity Tracking do plan).
> `[P]` = paralelizável (arquivos distintos, sem dependência pendente). `[US1]`–`[US4]` mapeiam as user stories.
> Cada ticket abre com `pnpm run pipeline:state init <TICKET>` e fecha com W3 verde + `close`. **Um módulo por ticket**
> (ADR-0014). Decisões R1–R4 em `research.md`; invariantes de contrato em `contracts/README.md`.

## Phase 1 — Setup

- [ ] T001 Baseline GLOBAL da borda verde: `pnpm test -- tests/modules/auth/adapters/http/ tests/modules/contracts/adapters/http/ tests/modules/partners/adapters/http/ tests/modules/programs/adapters/http/` (64 arquivos) e registrar a contagem total como baseline do épico (SC-004). **Zero dependência nova.**
- [ ] T002 [P] Snapshot inicial SC-002: `grep -rnE '\b(class|this)\b' src/modules/*/adapters/http/` retorna vazio hoje — registrar como linha de base (a borda já é 100% funcional).

---

## Phase 2 — Foundational

**N/A — sem foundational de código.** Este é um refactor: não há schema, model ou infra bloqueante. O **padrão canônico**
(objeto-fachada dentro da closure, sem `class`/`this`) é **estabelecido no piloto US1 (auth)** e serve de **referência**
para US2–US4. Não há tarefas nesta fase.

---

## Phase 3 — US1: Fachada em `auth` (Priority: P1) 🎯 PILOTO — ticket `AUTH-HTTP-FACADE` (M)

**Goal**: os 4 plugins de `auth` (33 rotas) com handlers agrupados em objeto-fachada; **fixa o padrão canônico** que os demais copiam.
**Independent test**: `pnpm test -- tests/modules/auth/adapters/http/` (21 arquivos) verde **sem alteração de asserção** + gate W3.

### W0 (baseline de caracterização)

- [ ] T003 [US1] `pnpm run pipeline:state init AUTH-HTTP-FACADE --size M` + escrever `.claude/.pipeline/AUTH-HTTP-FACADE/000-request.md` (escopo: 4 plugins, zero mudança de comportamento)
- [ ] T004 [US1] W0: rodar `pnpm test -- tests/modules/auth/adapters/http/` — confirmar **verde** e **congelar a contagem (21 arquivos)** como baseline. **Nenhum teste novo** (R3).

### W1 (refactor — um plugin por task)

- [ ] T005 [US1] W1: `makeAuthController(deps, { requireAuth })` em `src/modules/auth/adapters/http/plugin.ts` (10 rotas) — **ESTABELECE O PADRÃO**: fachada construída dentro de `async (scope) => {}`; cada `scope.route({ handler: controller.<membro> })`; helper local `toStatusFilter` permanece fora; sem `class`/`this`
- [ ] T006 [P] [US1] W1: `makeUsersController` em `src/modules/auth/adapters/http/users-plugin.ts` (9 rotas) — segue o padrão de T005
- [ ] T007 [P] [US1] W1: `makeRolesController` em `src/modules/auth/adapters/http/roles-plugin.ts` (8 rotas) — segue o padrão de T005
- [ ] T008 [P] [US1] W1: `makeMeController` em `src/modules/auth/adapters/http/me-plugin.ts` (6 rotas) — segue o padrão de T005

### W2 / W3

- [ ] T009 [US1] W2: code review read-only (máx. 3 rounds) — valida o **padrão canônico**: sem `class`/`this`, fachada dentro da closure, inferência Zod preservada, contrato HTTP intacto (ver `contracts/README.md`). Documenta o padrão para US2–US4.
- [ ] T010 [US1] W3: `pnpm run typecheck && pnpm run format:check && pnpm run lint && pnpm test` verde · testes **≥ baseline (21)** · sem alteração de asserção + `pnpm run pipeline:state close AUTH-HTTP-FACADE`

**Checkpoint**: padrão canônico fixado e revisado → US2/US3/US4 podem começar (em paralelo, se houver capacidade).

---

## Phase 4 — US2: Fachada em `contracts` (Priority: P2) — ticket `CONTRACTS-HTTP-FACADE` (M)

**Goal**: o plugin denso de `contracts` (16 rotas) com handlers em `makeContractsController`.
**Independent test**: `pnpm test -- tests/modules/contracts/adapters/http/` (15 arquivos) verde sem alteração + gate W3.

### W0 (baseline)

- [ ] T011 [US2] `pnpm run pipeline:state init CONTRACTS-HTTP-FACADE --size M` + `000-request.md`
- [ ] T012 [US2] W0: `pnpm test -- tests/modules/contracts/adapters/http/` verde + congelar contagem (15 arquivos)

### W1 (refactor)

- [ ] T013 [US2] W1: `makeContractsController(deps, hooks)` em `src/modules/contracts/adapters/http/plugin.ts` (16 rotas) — **PRESERVAR fora da fachada** os helpers locais `toErrorCode`/`writeErrorStatus`/`magicBytesMatch`/`sanitizeFilename`/`sendDomainError`; manter idênticos os headers `Deprecation`/`Sunset` (ADR-0033) e a composição de borda (contractor/children/files)

### W2 / W3

- [ ] T014 [US2] W2: review read-only — foco: headers `Deprecation`/`Sunset`, composição na borda, `sanitizeFilename`/`magicBytesMatch` intactos, envelope de erro
- [ ] T015 [US2] W3: gate verde · testes ≥ baseline (15) · sem alteração de asserção + `pnpm run pipeline:state close CONTRACTS-HTTP-FACADE`

**Checkpoint**: `auth` + `contracts` sob o padrão.

---

## Phase 5 — US3: Fachada em `partners` (Priority: P3) — ticket `PARTNERS-HTTP-FACADE` (M)

**Goal**: os 6 plugins de `partners` (40 rotas) → 6 controllers (1:1 plugin↔controller).
**Independent test**: `pnpm test -- tests/modules/partners/adapters/http/` (23 arquivos) verde sem alteração + gate W3.

### W0 (baseline)

- [ ] T016 [US3] `pnpm run pipeline:state init PARTNERS-HTTP-FACADE --size M` + `000-request.md`
- [ ] T017 [US3] W0: `pnpm test -- tests/modules/partners/adapters/http/` verde + congelar contagem (23 arquivos)

### W1 (refactor — 6 plugins paralelos)

- [ ] T018 [P] [US3] W1: `makeCollaboratorsController` em `src/modules/partners/adapters/http/plugin.ts` (9 rotas)
- [ ] T019 [P] [US3] W1: `makeSuppliersController` em `src/modules/partners/adapters/http/supplier-plugin.ts` (9 rotas)
- [ ] T020 [P] [US3] W1: `makeActController` em `src/modules/partners/adapters/http/act-plugin.ts` (7 rotas)
- [ ] T021 [P] [US3] W1: `makeFinancierController` em `src/modules/partners/adapters/http/financier-plugin.ts` (7 rotas)
- [ ] T022 [P] [US3] W1: `makePartnerGeographyController` em `src/modules/partners/adapters/http/partner-geography-plugin.ts` (7 rotas)
- [ ] T023 [P] [US3] W1: `makePartnersController` em `src/modules/partners/adapters/http/partners-plugin.ts` (1 rota, agregador) — manter AND-4-reads, cap→503, headers CSV/projeção idênticos

### W2 / W3

- [ ] T024 [US3] W2: review read-only — agregador (AND-4-reads/cap→503), headers CSV dos exports, projeção. **Se o diff dos 6 plugins for grande demais para 1 round, sub-fatiar por plugin** (6 sub-tickets S — ver `plan.md` §Estimativa)
- [ ] T025 [US3] W3: gate verde · testes ≥ baseline (23) · sem alteração de asserção + `pnpm run pipeline:state close PARTNERS-HTTP-FACADE`

**Checkpoint**: `auth` + `contracts` + `partners` sob o padrão.

---

## Phase 6 — US4: Fachada em `programs` (Priority: P4) — ticket `PROGRAMS-HTTP-FACADE` (S)

**Goal**: o plugin de `programs` (8 rotas) → `makeProgramsController`; **fecha 100% da borda** (SC-001/SC-002).
**Independent test**: `pnpm test -- tests/modules/programs/adapters/http/` (5 arquivos) verde sem alteração + gate W3.

### W0 (baseline)

- [ ] T026 [US4] `pnpm run pipeline:state init PROGRAMS-HTTP-FACADE --size S` + `000-request.md`
- [ ] T027 [US4] W0: `pnpm test -- tests/modules/programs/adapters/http/` verde + congelar contagem (5 arquivos)

### W1 (refactor)

- [ ] T028 [US4] W1: `makeProgramsController(deps, hooks)` em `src/modules/programs/adapters/http/plugin.ts` (8 rotas) — preservar `sendWriteError` fora da fachada; a rota de **logo (multipart)** mantém transporte/headers/status idênticos

### W2 / W3

- [ ] T029 [US4] W2: review read-only — foco: upload/display de logo (multipart), CRUD + ciclo de vida
- [ ] T030 [US4] W3: gate verde · testes ≥ baseline (5) · sem alteração de asserção + `pnpm run pipeline:state close PROGRAMS-HTTP-FACADE`

**Checkpoint**: **100% da borda HTTP sob objeto-fachada.**

---

## Phase 7 — Polish & Cross-Cutting

- [ ] T031 Verificação **GLOBAL** dos critérios: SC-001 `grep -rn 'handler: async (' src/modules/*/adapters/http/` → **vazio** (zero handler inline) **e** SC-002 `grep -rnE '\b(class|this)\b' src/modules/*/adapters/http/` → **vazio** (zero `class`/`this`) em toda a borda
- [ ] T032 [P] Atualizar o board `.claude/.planning/HTTP-FACADE-CONTROLLERS.md` (épico concluído) e marcar as user stories/SC concluídas em `spec.md`
- [ ] T033 [P] Rodar `quickstart.md` (validação por módulo) + coleções Bruno e2e da borda (smoke de **contrato preservado** — ADR-0034)

---

## Dependencies & Execution Order

### Phase / Ticket Dependencies

- **Setup (Phase 1)**: sem dependências — começa já.
- **Foundational (Phase 2)**: N/A (refactor).
- **US1 `auth` (Phase 3) — PILOTO**: começa após Setup. **Estabelece o padrão canônico.**
- **US2/US3/US4 (Phases 4–6)**: dependem de US1 **como referência de padrão** (não bloqueio técnico). Entre si são **independentes e paralelizáveis** (módulos distintos — ADR-0014: nunca na mesma sessão).
- **Polish (Phase 7)**: depende de US1–US4 concluídas.

### Within each ticket

- W0 (baseline verde + contagem) **antes** de tocar `src/`.
- W1 refatora os plugins do módulo (membros de fachada), mantendo a suíte verde.
- W2 (review read-only, máx. 3 rounds) → W3 (gate verde + `close`).

### Parallel Opportunities

- T002 [P] junto do T001 (Setup).
- Dentro de US1: T006/T007/T008 [P] após T005 (que fixa o padrão).
- Dentro de US3: T018–T023 [P] (6 plugins, arquivos distintos).
- Entre tickets: US2, US3, US4 podem rodar em paralelo após o piloto US1 (devs distintos, módulos distintos).

---

## Parallel Example: US1 (auth)

```bash
# T005 primeiro (fixa o padrão em plugin.ts). Depois, em paralelo:
Task: "makeUsersController em src/modules/auth/adapters/http/users-plugin.ts"
Task: "makeRolesController em src/modules/auth/adapters/http/roles-plugin.ts"
Task: "makeMeController  em src/modules/auth/adapters/http/me-plugin.ts"
```

## Parallel Example: US3 (partners)

```bash
# Os 6 plugins são arquivos distintos — todos [P] após o W0 (T017):
Task: "makeCollaboratorsController em .../plugin.ts"
Task: "makeSuppliersController     em .../supplier-plugin.ts"
Task: "makeActController           em .../act-plugin.ts"
Task: "makeFinancierController     em .../financier-plugin.ts"
Task: "makePartnerGeographyController em .../partner-geography-plugin.ts"
Task: "makePartnersController      em .../partners-plugin.ts"
```

---

## Implementation Strategy

### MVP First (US1 — piloto `auth`)

1. Phase 1 Setup → 2. US1 (`auth`) completo W0→W3 → 3. **STOP e VALIDAR**: padrão canônico revisado e gate verde → serve de referência.

### Incremental Delivery

1. Setup → 2. US1 `auth` (MVP, fixa padrão) → 3. US2 `contracts` → 4. US3 `partners` → 5. US4 `programs` (fecha 100%) → 6. Polish.
   Cada ticket entrega um módulo uniformizado sem quebrar os demais (cada um com seu W0→W3).

### Parallel Team Strategy

Após o piloto US1: Dev A → `contracts`; Dev B → `partners`; Dev C → `programs`. Módulos isolados (ADR-0014) integram sem conflito (assinatura dos plugins e `server.ts` não mudam).

---

## Notes

- **Refactor ≠ feature nova**: nenhuma task escreve teste de produto novo; a rede é a **caracterização** existente (64 arquivos). A única exceção tolerada é teste **acoplado a detalhe interno** do plugin — ajuste mínimo, **contado e justificado** no ticket (SC-003).
- `[P]` = arquivos distintos, sem dependência pendente. `[US#]` = rastreabilidade à user story.
- Cada ticket é independente e fecha com W3 verde + `pipeline:state close` (regressão zero — Princ. II).
- **Não misturar módulos** numa sessão (ADR-0014): um ticket = um BC.
- Commit por task ou grupo lógico (PT-BR, escopo de módulo — ex.: `refactor(auth): agrupa handlers em makeAuthController`).
