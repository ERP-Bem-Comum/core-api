---
description: 'Task list — 021 reference:read no catálogo central'
---

# Tasks: Permissão `reference:read` no catálogo central de autorização

**Input**: Design documents from `/specs/021-reference-read-permission/`

**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅

**Tests**: **OBRIGATÓRIOS** — Princípio I (TDD fail-first W0→W3, não-negociável). W0 RED antes de tocar `src/`.

**Organização**: feature **S de 1 linha de produção** servindo 2 stories. Ordenada por **waves W0→W3** (o pipeline tem precedência sobre o agrupamento estrito por story — Princípio I), com rótulos `[US1]`/`[US2]` para rastreabilidade. Ticket único: **`FIN-REFERENCE-READ-CATALOG`**.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: paralelizável (arquivos distintos, sem dependência)
- **[Story]**: `[US1]` (admin/usuário com permissão lê) · `[US2]` (usuário sem permissão é barrado)
- Caminhos de arquivo exatos nas descrições

## Path Conventions

Repo existente (modular monolith). Produção em `src/modules/`, testes em `tests/modules/` (não co-locados).

---

## Phase 1: Setup (ticket)

**Purpose**: abrir o ticket de pipeline e ancorar o W0.

- [ ] T001 Inicializar o ticket de pipeline: `pnpm run pipeline:state init FIN-REFERENCE-READ-CATALOG --size S` e escrever `.claude/.pipeline/FIN-REFERENCE-READ-CATALOG/000-request.md` (escopo + CAs derivadas de spec.md FR-001..FR-008 e da matriz em contracts/reference-read-authorization.md)

---

## Phase 2: Foundational — W0 RED (catálogo, cross-cutting) ⚠️ BLOQUEIA as stories

**Purpose**: provar a ausência de `reference:read` no catálogo no nível de unidade. É o teste que **deveria** ter pego o gap. Ambas as stories dependem desta entrada existir.

**⚠️ CRITICAL**: escrever e ver FALHAR (RED) antes de qualquer edição em `src/`.

- [ ] T002 [P] Adicionar âncora `#200: contém reference:read` em `tests/modules/auth/domain/authorization/permission-catalog.test.ts` (`assert.equal(PermissionCatalog.all.includes(parseOrThrow('reference:read')), true)`). Deve FALHAR.
- [ ] T003 Atualizar, no mesmo arquivo `tests/modules/auth/domain/authorization/permission-catalog.test.ts`, o teste de "conjunto exato conhecido do sistema" (hoje ~L112) para incluir `reference:read`; e ajustar qualquer asserção de **contagem** do catálogo que quebre (verificar também `tests/modules/auth/application/use-cases/list-permission-catalog.test.ts`). Deve FALHAR antes do fix. _(sequencial — mesmo arquivo do T002)_

**Checkpoint**: catálogo coberto em RED.

---

## Phase 3: User Story 1 — Admin/usuário com permissão lê (Priority: P1) 🎯 MVP — W0 RED

**Goal**: quem tem `reference:read` obtém 200 nos 3 endpoints de referência; sem token → 401.

**Independent Test**: com o `authorize` REAL, um usuário cuja role contém `reference:read` recebe 200 em `/categories`, `/cost-centers`, `/programs`.

- [ ] T004 [US1] Criar `tests/modules/financial/adapters/http/reference-read-rbac.real-authorize.http.test.ts` montando o `authorize` **REAL** (`makeRequireAuth`/`makeAuthorize` de `#src/modules/auth/public-api/http.ts`) sobre um `UserReader` in-memory + `verifyAccessToken` de teste, com `financialHttpPlugin` (driver `memory`). Caso US1: usuário com role contendo `reference:read` → **200** nos 3 GETs; sem `Authorization` → **401**. Deve FALHAR (antes do fix, conceder `reference:read` à role é rejeitado por `setPermissions` → ator nunca chega a 200).

**Checkpoint**: caminho feliz coberto em RED com authorize real.

---

## Phase 4: User Story 2 — Usuário sem permissão é barrado (Priority: P2) — W0 RED

**Goal**: quem NÃO tem `reference:read` recebe 403, distinguindo do ator autorizado (prova que o gate é real, não "abre p/ todos").

**Independent Test**: no mesmo arquivo de authorize real, um usuário sem `reference:read` recebe 403 nos 3 endpoints, enquanto o de US1 recebe 200.

- [ ] T005 [US2] Adicionar em `tests/modules/financial/adapters/http/reference-read-rbac.real-authorize.http.test.ts` os casos negativos: usuário autenticado **sem** `reference:read` → **403** nos 3 GETs (contraste com o ator de US1). Deve FALHAR/ficar inconsistente antes do fix. _(sequencial — mesmo arquivo do T004)_

**Checkpoint**: discriminação 200×403 coberta em RED.

---

## Phase 5: Implementação — W1 GREEN (mudança mínima, compartilhada US1+US2)

**Purpose**: a única linha de produção que torna TODOS os testes RED verdes de uma vez.

- [ ] T006 [US1] Adicionar `'reference:read'` ao `CATALOG_RAW` em `src/modules/auth/domain/authorization/permission-catalog.ts`, em ordem alfabética por resource (entre o bloco `program:*` e `reconciliation:*`), com comentário curto `// reference:* (modulo financial - dados de referencia de categorizacao, #200)`. Satisfaz T002/T003 (catálogo), US1 (200) e US2 (403/discriminação) e concede ao admin via `PermissionCatalog.all`.
- [ ] T007 Rodar os testes-alvo e confirmar GREEN: `pnpm test -- --test-name-pattern="permission-catalog"` e `pnpm test -- --test-name-pattern="reference-read-rbac"`.

**Checkpoint**: W1 GREEN funcional (verde de qualidade ainda pendente — W2/W3).

---

## Phase 6: W2 — Code review read-only

- [ ] T008 Revisão read-only (skill `code-reviewer`, máx. 3 rounds): confere ADR-0006 (sem import cross-módulo; só catálogo + permissão via public-api), idioma por camada, ausência de over-grant (FR-008), e que o teste exercita o authorize real (não o fake). Gravar `004-code-review/REVIEW.md` (APPROVED/REJECTED).

---

## Phase 7: W3 — Gate de qualidade & Polish

- [ ] T009 Validar `quickstart.md` (opcional manual via curl; obrigatório o caminho de testes).
- [ ] T010 Gate W3 (skill `ts-quality-checker`): `pnpm run typecheck && pnpm run format:check && pnpm run lint && pnpm test` — todos verdes (Princípio II, regressão zero). Gravar `005-quality/REPORT.md`.
- [ ] T011 Fechar o ticket: `pnpm run pipeline:state wave-finish` das waves e `pnpm run pipeline:state close FIN-REFERENCE-READ-CATALOG`. Referenciar #200 no PR (não auto-fechar — PRs vão p/ `dev`).

---

## Dependencies & Execution Order

### Wave order (Princípio I — não-negociável)

- **Setup (Phase 1)**: sem dependências.
- **W0 RED (Phases 2→3→4)**: TODOS os testes RED escritos e FALHANDO antes de tocar `src/`. Foundational (catálogo) bloqueia conceitualmente, mas os 3 RED podem ser escritos antes do W1.
- **W1 (Phase 5)**: só inicia após W0 RED completo. A linha do `CATALOG_RAW` torna tudo verde.
- **W2 (Phase 6)**: após W1 GREEN.
- **W3 (Phase 7)**: após W2 APPROVED. Fecha o ticket.

### Story Dependencies

- **US1 (P1)** e **US2 (P2)** compartilham a MESMA mudança de produção (T006). US2 não tem implementação própria — é satisfeita pela mesma linha (default-deny já existe; o fix habilita o contraste 200×403).

### Within waves

- T002 antes/independente de T003 (mesmo arquivo → T003 sequencial após T002).
- T004 antes de T005 (mesmo arquivo → sequencial).
- T006 depois de T002–T005 (W0 antes de W1).

### Parallel Opportunities

- **T002 [P]** pode começar junto com **T004** (arquivos distintos: `permission-catalog.test.ts` × `reference-read-rbac.real-authorize.http.test.ts`).
- T003 e T005 são sequenciais (mesmos arquivos dos anteriores).
- Pouca paralelização real: é uma feature S de 1 linha.

---

## Parallel Example: W0 RED

```bash
# Dois arquivos de teste distintos podem ser escritos em paralelo:
Task: "T002 — âncora reference:read em permission-catalog.test.ts"
Task: "T004 — suite real-authorize (200/401) em reference-read-rbac.real-authorize.http.test.ts"
# Depois, sequencialmente, T003 (mesmo arquivo do T002) e T005 (mesmo arquivo do T004).
```

---

## Implementation Strategy

### MVP (US1)

1. Phase 1 Setup → ticket aberto.
2. Phases 2–4: W0 RED (catálogo + authorize real, 200/401/403) — ver FALHAR.
3. Phase 5: W1 — adicionar `reference:read` ao `CATALOG_RAW` → GREEN.
4. **STOP & VALIDATE**: US1 (admin/usuário com permissão → 200) verificável de forma independente.
5. US2 (403 sem permissão) já coberto pela mesma mudança.

### Entrega

Feature indivisível na prática (1 linha). W2 + W3 fecham o ticket. PR referencia #200 (épico #64), merge na `dev`.

---

## Notes

- Princípio I (TDD W0→W3) tem precedência sobre o agrupamento por story nesta feature S — por isso a ordenação por waves.
- Ponto crítico (FR-006/SC-004): o teste DEVE usar o `authorize` real; o fake de header (`categories.http.test.ts:31-38`) mascarou o gap original.
- Sem migration, sem evento, sem rota nova (research.md D4).
- Princípio IX: citações canônicas já em `research.md` (Fowler YAGNI + OWASP least-privilege).
- Commit em PT-BR com escopo de módulo (ex.: `fix(auth): registra reference:read no catálogo de permissões (#200)`).
