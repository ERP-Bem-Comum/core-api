# W0 — Testes RED · BATCH-FINANCIAL-PAYABLES (#357)

**Skill:** `tdd-strategist` · **Outcome:** RED · **Driver:** memory (sem Docker).

## Arquivo

`tests/modules/financial/adapters/http/payables-batch.http.test.ts` — borda HTTP via `fastify.inject`,
hooks de auth FAKE (o Bearer carrega as permissões por vírgula), espelhando `financial-documents.http.test.ts`.

## Resultado

```
✖ CA1: sem Authorization → 401            (404 !== 401)  — rota inexistente
✖ CA2: token sem fiscal-document:read → 403 (404 !== 403)
✖ CA3: refs com UUID mal-formado → 400    (404 !== 400)
✖ CA4: refs vazio → 400 (min 1)           (404 !== 400)
✖ CA5: refs > 200 → 400 (max 200)         (404 !== 400)
✖ CA6: refs=[existente, inexistente] → 200 com items + missing (404 !== 200)
✔ CA7: POST /payablesXYZ → 404            (guard de roteamento — já verde)
```

CA1–CA6 falham **por inexistência da rota** `POST /api/v2/financial/payables:batch` (fail-first).
CA7 já passa: valida que o custom method `:batch` **não vaza** para paths irmãos — invariante que a
implementação W1 (param com regex `^:batch$`) deve preservar.

## Cobertura vs contrato (ADR-0049 / #350)

- RBAC 401/403 (`fiscal-document:read`) — CA1/CA2.
- Validação de borda Zod: UUID mal-formado, `min(1)`, `max(200)` — CA3/CA4/CA5.
- Caminho feliz + `missing[]` (UUID válido sem registro não derruba o lote) + shape do item
  (`ref`/`documentId`/`documentNumber`/`documentType`/`valueCents`/`dueDate`/`status`/`paymentMethod`/
  `supplierRef`/`supplierName`/`supplierDocument`) — CA6.
- `supplierName`/`supplierDocument` = `null` no driver memory (read-model `fin_supplier_view` vazio);
  resolução real diferida para `test:integration` / Bruno E2E.

## Decisão de roteamento desriscada (para o W1)

`:batch` não é caminho estático em find-my-way v9 — é parâmetro. Adotar
`url: '/financial/payables:action(^:batch$)'` (regex fixa o literal; `/payables*` → 404). Detalhe em
`000-request.md §Decisão de roteamento`.

## Próximo (W1)

Port `getPayablesSummaryByIds` (+ adapters InMemory/Drizzle) → schema Zod → rota + fiação em
`composition.ts` até GREEN. Skill: `ports-and-adapters` + `drizzle-schema-author` / `fastify-server-expert`.
