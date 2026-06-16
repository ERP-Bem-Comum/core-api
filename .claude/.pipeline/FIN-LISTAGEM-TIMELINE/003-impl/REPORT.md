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

## Próximo incremento (W1)

US2 — trilha materializada (`domain/timeline/repository.ts` port + tabelas `fin_*` + migration + repo drizzle/in-memory
compartilhando tx + instrumentação dos 7 use cases) e `GET /:id/timeline`; depois optimistic lock (409) e remoção de
permissões inertes.
