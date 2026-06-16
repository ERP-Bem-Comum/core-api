# W0 — Testes RED (FIN-LIST-DTO-LOCAL)

**Disciplina**: tdd-strategist · **Resultado**: 🔴 RED.

## Arquivo

`tests/modules/financial/adapters/http/list-documents.http.test.ts` — +2 casos (`fastify.inject`):

- CT-DTO-01: item traz `series`, `grossValueCents`, `paymentMethod`, `contractRef`.
- CT-DTO-02: documento sem série/contrato → `series`/`contractRef` null.

## Execução

```
node --test list-documents.http.test.ts
ℹ tests 7 · pass 5 · fail 2
```

Os 2 RED falham porque os campos não existem no `DocumentListItem`/`documentSummarySchema` (mesmo se o objeto os tivesse, o response schema os removeria por strip). Viram GREEN no W1 (read-model + SELECT + DTO + schema). Cobertura de contrato de repo (findPaged) adicionada no W1.
