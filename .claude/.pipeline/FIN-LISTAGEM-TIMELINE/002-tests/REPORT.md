# W0 — Testes RED (FIN-LISTAGEM-TIMELINE)

**Wave**: W0 · **Status**: 🔴 RED (esperado) · **Skill**: `tdd-strategist` (+ `ts-domain-modeler` p/ domínio) · **Data**: 2026-06-15

> **Escopo deste incremento W0**: Foundational (projeção/diff da trilha) + US1 (listagem `findPaged` + borda).
> Os demais blocos (US2 trilha completa, optimistic lock, RBAC) recebem seus testes RED no próprio incremento
> dentro da W1 — mesmo ritmo da fatia 1 (W0 RED foundational+US1 → W1 incremental). Tags `W0` por tarefa em `tasks.md`.

## Testes RED escritos

| Arquivo | Cobre | Falha esperada (RED) |
| --- | --- | --- |
| `tests/modules/financial/domain/timeline/projection.test.ts` | CT-010/CT-011 — `diffDocument` (campos vitais, before=null na criação) + `projectEntry` | `ERR_MODULE_NOT_FOUND`: `domain/timeline/projection.ts` ainda não existe |
| `tests/modules/financial/adapters/persistence/document-repository-paged.test.ts` | CT-001/002/003/005 — `findPaged` (status, paginação, supplier, vazio) | `repo.findPaged is not a function` (port/adapter sem o método) |
| `tests/modules/financial/adapters/http/list-documents.http.test.ts` | CT-001/003 — listagem real não-vazia + filtro | stub atual devolve `{ items: [], total: 0 }` → asserções de não-vazio falham |

## Execução (RED comprovado)

```
node --test ... (3 arquivos)
ℹ tests 9 · pass 2 · fail 7
```

- **7 RED** (comportamento novo): projeção inexistente (3), `findPaged` ausente (4 — uma por cenário, `not a function`),
  listagem não-vazia (2 asserções no http).
- **2 PASS**: `CT-007` (ref malformada → 400) e `CT-008` (sem `fiscal-document:read` → 403) — guards já existentes da
  borda da fatia 1 (Zod `z.uuid()` + `authorize`). Mantidos como regressão-guard, não são alvo de implementação nova.

## Observação (esperada em W0)

`pnpm run typecheck` fica **vermelho** enquanto a W0 vigora: os testes referenciam `findPaged` (ainda não no port
`DocumentRepository`) e `domain/timeline/projection.ts` (inexistente). É o estado fail-first correto — vira verde na W1.

## Próximo

W1 (GREEN) do incremento: implementar `domain/timeline/{types,projection,repository}.ts` (Foundational) e `findPaged`
(port + in-memory + drizzle) + handler real `GET /documents`. Roteamento: `ts-domain-modeler` (projeção pura),
`ports-and-adapters` (port timeline), `drizzle-orm-expert` (findPaged + repo da trilha), `fastify-server-expert` (handler).
