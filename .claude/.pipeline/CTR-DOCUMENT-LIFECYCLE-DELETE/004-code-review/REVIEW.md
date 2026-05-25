# Code Review - CTR-DOCUMENT-LIFECYCLE-DELETE - Round 1

**Veredito:** APPROVED

## Issues

Nenhuma critica/importante.

### Sugestao 🔵

#### S1 - Escopo reduzido: schema/migration/document-mapper/state-validator adiados

Decisão registrada no REPORT W1: este ticket entrega APENAS o domain + outbox mapper. CAs 5, 6, 8 parcialmente satisfeitos.

Justificativa: nenhum use case ainda chama `Document.logicallyDelete`. Sem caller, schema migration seria código morto.

**Quando completar:** quando entregar `CTR-USECASE-DELETE-DOCUMENT` (use case + CLI), abrir migration `0003_*.sql` + ALTER schema + document.mapper.ts update + state.ts validator extension. Já há código de domain pronto pra consumir.

## O que esta bom

1. **Refined types `Active` + `LogicallyDeleted`** segue padrao Contract.ts (`ActiveContract` + `ExpiredContract` + `TerminatedContract`). DO C§29 honrado.
2. **`logicallyDelete` aceita só `ActiveContractDocument`** — compile-time exhaustiveness impede re-deletar. CA-D6 valida com smoke type.
3. **Evento `ContractDocumentDeleted` shape domain** alinhado com `ContractEnded`, `AmendmentHomologated` (campos brandeds + occurredAt). Consistencia preservada.
4. **`CreateResult.document` narrowed para `ActiveContractDocument`** — consumers ganham type info sem `as` cast.
5. **Outbox mapper completo** (serialize + deserialize) pronto para wire format quando use case emergir.
6. **3 novos erros tagged** consistentes com padrao do projeto.

## CAs

7/10 plenos + 3 parciais documentados.

## Proximo passo

APPROVED -> W3.
