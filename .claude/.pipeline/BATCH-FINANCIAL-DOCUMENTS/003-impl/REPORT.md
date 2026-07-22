# W1 — Implementação mínima até GREEN (ports-and-adapters + fastify-server-expert + drizzle)

## Arquivos criados (5)

| Arquivo | Papel |
|---------|-------|
| `application/ports/document-summary-by-ids-view.ts` | Port `DocumentSummaryByIdsView` + `DocumentSummaryRow` (ISP, subset de 9 campos) |
| `adapters/persistence/repos/document-summary-by-ids-view.in-memory.ts` | Adapter memory + `loadedDocumentToSummaryRow` (status cru, paridade com grid memory) |
| `adapters/persistence/repos/document-summary-by-ids-view.drizzle.ts` | Adapter Drizzle: `fin_documents ⟕ recon ⟕ fin_supplier_view`, displayStatus derivado (ADR-0022) |
| `tests/.../adapters/http/documents-batch.http.test.ts` | W0 — 7 CAs (memory) |
| `tests/.../adapters/persistence/document-summary-by-ids-view.drizzle-mysql.test.ts` | CI1–CI4 (integração, gate `MYSQL_INTEGRATION=1`) |

## Arquivos editados (4)

| Arquivo | Mudança |
|---------|---------|
| `adapters/http/schemas.ts` | `documentsBatchBodySchema` + `documentBatchItemSchema` + `documentsBatchResponseSchema` |
| `adapters/http/dto.ts` | `documentBatchItemToDto` (row → DTO; netValueCents/dueDate nullable) |
| `adapters/http/plugin.ts` | Rota `POST /financial/documents:action(^:batch$)` (custom method AIP-136) |
| `adapters/http/composition.ts` | Wiring: deps + Pools + pool memory (`loadedDocumentToSummaryRow`) + pool mysql (Drizzle) |
| `scripts/ci/test-integration.ts` | Registra o teste de integração no gate `financial` (lista explícita, não glob) |

## Decisões honradas

- **status derivado** só no Drizzle (displayStatus, igual `findPaged`); **cru** no memory (igual `toListItem`). Sem divergência grid↔batch em nenhum driver.
- **Custom method** idêntico ao #357: regex `^:batch$` → 404 p/ irmãos (CA7).
- **Degradação graciosa**: ref inexistente → omitido; borda deriva `missing` por diferença de conjunto.

## Resultado: GREEN ✅

```
ℹ tests 8 · pass 8 · fail 0   (7 CAs HTTP memory + integração pulado sem MYSQL_INTEGRATION)
typecheck: tsc --noEmit — verde
format:check: All matched files use Prettier code style!
lint: 0 erros nos arquivos tocados
```

Integração real (LEFT JOIN `fin_supplier_view`, CI2/CI3) roda no x99 sob `MYSQL_INTEGRATION=1` —
não executada localmente (sem MySQL up; sem subir Docker sem autorização). Próximo: W2 code review.
