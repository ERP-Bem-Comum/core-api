# W1 — Implementação até GREEN (FIN-LISTAGEM-TIMELINE)

**Wave**: W1 · **Status**: 🟢 GREEN (incremento 1 — Foundational + US1) · **Data**: 2026-06-15

> **Escopo deste incremento**: Foundational (domínio da trilha — projeção/diff puros) + US1 (listagem `findPaged`).
> Próximos incrementos (na mesma W1): US2 (trilha materializada + instrumentação dos use cases), optimistic lock, RBAC.

## Implementado

| Camada | Arquivo | Conteúdo | Skill/Agente |
| --- | --- | --- | --- |
| Domínio | `domain/timeline/types.ts` | `FieldChange`, `TimelineTarget`, `FinancialTimelineEntry` (read-model) | `ts-domain-modeler` |
| Domínio | `domain/timeline/projection.ts` | `diffDocument` + `projectEntry` (funções **puras**; diff sobre snapshots; serialização 1FN) | `ts-domain-modeler` |
| Domínio | `domain/document/query.ts` | `DocumentListFilter`, `DocumentListItem` (read-model leve), `Page<T>` | `ports-and-adapters` |
| Domínio | `domain/document/repository.ts` | `findPaged` adicionado ao port `DocumentRepository` | `ports-and-adapters` |
| Adapter | `adapters/persistence/repos/document-repository.in-memory.ts` | `findPaged` (filtros + paginação) + `toListItem` | — |
| Adapter | `adapters/persistence/repos/document-repository.drizzle.ts` | `findPaged` (query única `fin_documents`: WHERE composto + `count()` + LIMIT/OFFSET, ORDER BY `dueDate`/`idx_fin_doc_due`, sem tabelas filhas) | **`drizzle-orm-expert`** |
| Borda | `adapters/http/{plugin,composition,dto}.ts` | handler real `GET /documents` (substitui stub) + `listItemToSummaryDto`; `listDocuments` → `findPaged` | `fastify-server-expert` |

**Decisão de design (refino W1):** `findPaged` devolve um **read-model leve `DocumentListItem`** (não `Document` completo) —
evita reconstruir o agregado (overfetch das tabelas filhas) por linha; alinha com FR-004 ("payload enxuto"). Query única
no Drizzle.

**Dead code removido (follow-up W2 #3):** `documentToSummaryDto` (órfão) — a listagem usa `listItemToSummaryDto` sobre o read-model.

## RED → GREEN

- `domain/timeline/projection.test.ts` (CT-010/011) — ✅ GREEN.
- `adapters/http/list-documents.http.test.ts` (CT-001/003/007/008) — ✅ GREEN (16 antes RED por stub).
- `findPaged` movido para a **contract suite** (`document-repository.suite.ts`) → exercitado por in-memory (unit) **e**
  drizzle (integração MySQL real). Casos: filtro de status (Open vs Approved no mesmo fornecedor), paginação, janela de
  vencimento inclusiva, conjunto vazio. **Isolation-safe** (escopo por `supplierRef` único — o DB Drizzle é compartilhado
  entre os `it()` da suite, ao contrário do in-memory fresh).

## Gate (incremento)

```
pnpm run typecheck                  → ✅
pnpm run format:check               → ✅
pnpm run lint                       → ✅
pnpm test                           → ✅ 2474 pass · 0 fail · 18 skipped
pnpm run test:integration:financial → ✅ 8 pass · 0 fail (findPaged Drizzle vs MySQL real)
```

## Achado durante a integração (corrigido)

A primeira execução da integração acusou 2 falhas no `findPaged` Drizzle (filtro status + paginação). **Causa-raiz: não
era o código do agente** — a integração Drizzle compartilha o mesmo MySQL entre os `it()` da suite (estado acumula),
enquanto o in-memory é fresh por teste. Os testes que filtravam por `status` global contavam docs de testes anteriores.
**Correção nos testes** (não no `findPaged`): escopar cada caso por `supplierRef` único → isolation-safe nos dois adapters.
Política de regressão zero: causa endereçada, integração 8/8 verde.

## Incremento 2 — US2: Trilha por-campo (Time Travel) — GREEN

**Data**: 2026-06-15 · **Implementado por agentes especialistas (1 camada por agente) + validação cruzada por agentes.**

### Quem fez o quê (cada camada por um agente)

| Camada | Entrega | Agente |
| --- | --- | --- |
| Persistência | tabelas `fin_document_timeline` + `fin_timeline_field_changes` + migration `0001_natural_shadowcat.sql` + `timeline-repository.{drizzle,in-memory}.ts` + `timeline.mapper.ts` + `save(aggregate, timelineEntries)` na MESMA tx | **`drizzle-orm-expert`** |
| **Validação persistência** | review read-only do DDL/migration/CASCADE/índices/tx | **`mysql-database-expert`** → APPROVED (1 blocker = optimistic lock, que é o próximo incremento FR-009; ternário morto corrigido) |
| Aplicação | `timeline-recording.ts` (helper) + instrumentação dos 6 use cases mutantes (before/after → `projectEntry` → `save` na tx; `clock` injetado) + `get-document-timeline.ts` + composition (store compartilhado / timeline repo) | **`typescript-language-expert`** |
| Borda HTTP | `GET /api/v2/financial/documents/:id/timeline` (rota + `documentTimelineResponseSchema` + `timelineToDto`; 404/403) | **`fastify-server-expert`** |
| **Validação borda (Zod)** | review read-only dos schemas (contract-first ADR-0027) | **`zod-expert`** (criado em `.claude/agents/zod-expert.md`) → CHANGES-REQUESTED: M1 `eventType` `z.string()`→`z.enum` + `.meta()` — **aplicados pelo `fastify-server-expert`** |

### Decisões de design (dos agentes, validadas)

- **Trilha na MESMA transação do agregado** (ADR-0001/Vernon:3257): `save` recebe `timelineEntries` e grava doc+payables+trilha em um `db.transaction` (drizzle) / store compartilhado (in-memory). Rollback atômico → sem trilha órfã (SC-004/NFR-001).
- **Diff por função pura** sobre snapshots (eventos da fatia 1 intactos). `eventType` no response é `z.enum` derivado de `DocumentEvent['type']` com `satisfies` anti-drift (achado M1 do zod-expert).
- **Cancelamento**: `delete` cascateia a trilha (FK ON DELETE CASCADE — SC-006); registro permanente fica no evento de outbox.

### RED → GREEN

- W0: `timeline.http.test.ts` (CT-014/015/016) — agora GREEN.
- Unidade (in-memory): `timeline-recording.test.ts` — recording por use case.
- **Integração (MySQL real)**: novo caso em `document-repository.drizzle-mysql.test.ts` — `save` grava trilha na tx → `findByDocument` lê → `delete` cascateia. **9/9 verde**.

### Gate (incremento US2)

```
pnpm run typecheck                  → ✅
pnpm run format:check               → ✅
pnpm run lint                       → ✅
pnpm test                           → ✅ 2479 pass · 0 fail · 18 skipped
pnpm run test:integration:financial → ✅ 9 pass · 0 fail (inclui trilha vs MySQL)
```

### Higiene de gate feita inline (não-camada)

Lint dos arquivos de persistência do agente (readonly params do Drizzle via `eslint-disable`, `async` nas factories, `!== undefined` redundante em row `T|null`) + ternário morto que o `mysql-database-expert` apontou — disciplina `ts-quality-checker`.

## Incremento 3 — Optimistic lock (FR-009) + remoção de permissões inertes (FR-010) — GREEN

**Data**: 2026-06-16 · **Cada camada por um agente + validação cruzada por agentes.**

### W0 RED → GREEN

- `optimistic-lock.http.test.ts` (CT-018/019/020/021): versão stale → `409 document-version-conflict`.
- `permission-catalog.test.ts`: lista exaustiva sem `payable:read`/`payable:undo-approval` (deepEqual).

### Quem fez o quê

| Camada | Entrega | Agente |
| --- | --- | --- |
| Persistência (lock) | `save(aggregate, entries, expectedVersion?)`; `UPDATE ... WHERE id=? AND version=expectedVersion` → `affectedRows=0` → `document-version-conflict`; in-memory passa a modelar versão (`{aggregate, version}`); `document-version-conflict` no `DocumentRepositoryError` | **`drizzle-orm-expert`** |
| Aplicação (lock) | `expectedVersion: number` em `Adjust/Approve/UndoApproval Command`; use cases repassam ao `save`; +forward mínimo na borda (regressão zero) | **`typescript-language-expert`** |
| Validação borda (Zod) | review do `version`/409 → **Major**: `version` sem `.max()` (overflow `1e30`); +Minor `rateBps` sem `.max()` | **`zod-expert`** |
| Correção da borda | `.max(Number.MAX_SAFE_INTEGER)` no `version`; `.max(10000)` no `rateBps` | **`fastify-server-expert`** |
| RBAC (FR-010) | remove `payable:read`/`payable:undo-approval` do catálogo do auth + `FINANCIAL_PERMISSION`; verifica zero consumidores órfãos | **`security-backend-expert`** |

### Decisão de design (validada)

- **Optimistic lock**: `expectedVersion` opcional no `save` (criadores não passam; mutações de doc existente passam). `WHERE version=expectedVersion` (Refman §13.2.17 — `affectedRows=0` em divergência). `SELECT FOR UPDATE` serializa txs (Refman §15.7.2.4). Enforçado em ambos os adapters (in-memory + Drizzle) — a borda testa contra in-memory.

### Gate (incremento)

```
pnpm run typecheck                  → ✅
pnpm run format:check               → ✅
pnpm run lint                       → ✅
pnpm test                           → ✅ 2483 pass · 0 fail · 18 skipped
pnpm run test:integration:financial → ✅ 10 pass · 0 fail (inclui version-conflict + trilha vs MySQL)
```

### Incremento 4 — Exposição de `version` na resposta (consumo do front) — GREEN

O Minor do zod-expert ("`version` não exposto") foi **implementado** (não adiado), pois sem ele o front não consegue usar o lock. Cada camada por um agente:

| Camada | Entrega | Agente |
| --- | --- | --- |
| Persistência/leitura | `findById` → `LoadedDocument` (com `version`); `DocumentListItem.version` | **`drizzle-orm-expert`** |
| Borda | `version` em `documentResponseSchema`/`documentSummarySchema`; `documentToDto(...,version)`; `loadAndSerialize` repassa | **`fastify-server-expert`** |
| Validação Zod | review → APPROVED (3 Minors: `.max` simetria, cobertura undo, doc) | **`zod-expert`** |
| Correção | `.max(MAX_SAFE_INTEGER)` no `version` da resposta + CVR-007/008 (undo) | **`fastify-server-expert`** |

- **Regra preservada**: os use cases de mutação usam `cmd.expectedVersion` (versão do CLIENTE), nunca a recém-lida — o `version` exposto é só para o cliente reenviar.
- **Prova**: `version-roundtrip.http.test.ts` (CVR-001..008) — criação→v0, PATCH→v1, stale→409, approve→v2, undo→v3, lista com version.
- **Fundamentação canônica**: Vernon `ddd--vernon-livro-vermelho.md:8869` (cópia do cliente carrega a versão; stale → rejeitada).
- **Docs (consumo do front)**: [`frontend-optimistic-lock.md`](../../../specs/010-fin-listagem-timeline/frontend-optimistic-lock.md) + `contracts/financial-http.md` atualizado + entrada em `handbook/CHANGELOG.md` (2026-06-16).
- **Gate**: typecheck + format + lint + `pnpm test` 2491 · 0 fail + integração 10/10.

## W1 — completa

Os 3 incrementos da W1 estão GREEN: (1) Foundational + US1 listagem; (2) US2 trilha por-campo; (3) optimistic lock + RBAC.
Próximo: **W2** (code-review + segurança) e **W3** (gate final).

## Incremento 5 — Correções da W2 round 1 (GREEN)

**Data**: 2026-06-16 · A W2 round 1 deu **REJECTED** (1 Major de segurança + 2 🟡). Os 3 bloqueantes foram corrigidos, cada camada por um agente, e re-validados (W2 round 2 → APPROVED). Ver `004-code-review/REVIEW.md` §"Round 2".

| Bloqueante | Fix | Arquivos | Agente |
| --- | --- | --- | --- |
| M1 (🔴 seg.) — filtro `type` arbitrário | `type: documentTypeSchema.optional()` (enum dos 7 tipos) + CT-009 (`?type=FOO` → 400) | `adapters/http/schemas.ts`, `tests/.../list-documents.http.test.ts` | **`fastify-server-expert`** (validado por **`zod-expert`** → APPROVED) |
| Issue 2 (🟡) — paginação instável + paridade | Drizzle `.orderBy(asc(dueDate), asc(id))`; in-memory ordena dueDate ASC (NULLs primeiro — Refman §11.4.2) + tie-breaker `id`; 2 casos na contract-suite (empate de dueDate; Drafts antes) | `document-repository.{drizzle,in-memory}.ts`, `tests/.../document-repository.suite.ts` | **`drizzle-orm-expert`** |
| Issue 3 (🟡) — `satisfies` sem exhaustividade | helper `exhaustiveStringUnion` (no-extra **AND** no-missing); fonte única `DOCUMENT_EVENT_TYPES` no domínio, consumida por schema HTTP + timeline mapper | `src/shared/primitives/exhaustive.ts` (novo), `src/shared/index.ts`, `domain/document/events.ts`, `adapters/http/schemas.ts`, `mappers/timeline.mapper.ts` | **`typescript-language-expert`** |

**Gate (3 fixes juntos):** `typecheck` ✅ · `format:check` ✅ · `lint` ✅ · `pnpm test` ✅ **2494 pass · 0 fail · 18 skipped**.
**Pendente p/ W3:** `pnpm run test:integration:financial` (MySQL real — prova o tie-breaker do Fix 2 contra o `ORDER BY` real).
