# W0 — Testes RED (FIN-TIMELINE-MODEL-TIDY)

**Disciplina**: tdd-strategist · **Resultado**: 🔴 RED.

## Gatilho RED (rename — #56a)

`tests/modules/financial/domain/timeline/projection.test.ts:97` — `assert.equal(docEntry.eventType, 'DocumentSaved')`.

```
pnpm run typecheck
projection.test.ts(97,27): error TS2339: Property 'eventType' does not exist on type
'Readonly<{ ...; kind: "DocumentSaved" | ... ; ... }>'.
```

RED por inexistência do campo `eventType` (o domínio ainda usa `kind`). Vira GREEN no W1 com o rename (6 edições).

## Cobertura adicional no W1

- **Byte-idêntico (#56a)**: CT-014 (`timeline.http.test.ts`) já lê `eventType` na resposta — passa antes/depois, provando que o JSON não muda.
- **Migration/CHECK (#56b)**: teste de integração (`document-repository.drizzle-mysql.test.ts`) — cancelar apaga a trilha (cascade) + INSERT direto com `event_type='DocumentCancelled'` rejeitado pelo CHECK — adicionado no W1 (roda em `test:integration:financial`).
