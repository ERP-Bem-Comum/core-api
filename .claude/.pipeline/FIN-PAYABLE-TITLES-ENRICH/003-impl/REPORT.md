# W1 — Implementação (GREEN) · FIN-PAYABLE-TITLES-ENRICH (#229)

**Agentes:** fastify-server-expert + zod-expert · **Resultado:** GREEN ✅

## Cadeia propagada (7 arquivos)

| Arquivo | Mudança |
| --- | --- |
| `domain/payable/query.ts` | `PayableListItem` += `issueDate/paymentMethod/version/grossValueCents/netValueCents` |
| `mappers/payable-list.mapper.ts` | `PayableListRow` + `rowToPayableListItem` += campos |
| `repos/payable-list-view.drizzle.ts` | SELECT += `finDocuments.issueDate/paymentMethod/version/grossValue/netValue` |
| `repos/payable-list-view.in-memory.ts` | `source()` agora entrega `LoadedDocument`; `toItem(doc,p,version)` += campos |
| `http/composition.ts` | source mapeia `{ ...aggregate, version }` |
| `http/schemas.ts` | `payableSummarySchema` += 5 campos |
| `http/plugin.ts` | `payableListItemToDto` += campos; `dueDate`/`issueDate` **date-only** |

## Achados (typecheck como checklist)

- `version` só existe em `LoadedDocument` (não em `StoredDocument`) → o `source()` do in-memory passou a entregar `LoadedDocument`.
- `Document` é union — `DraftDocument` **não tem `netValue`** → narrowing `'netValue' in doc ? … : null`.
- 2 testes de regressão atualizados ao novo contrato (`payable-list.mapper.test` baseRow; `payable-list-view.in-memory.test` `LoadedDocument` + `version`).

Teste #229: 4/4 ✅. Suíte: 3146 pass / 0 fail.
