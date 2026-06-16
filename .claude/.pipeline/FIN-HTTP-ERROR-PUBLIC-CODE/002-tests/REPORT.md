# W0 — Testes RED (FIN-HTTP-ERROR-PUBLIC-CODE)

**Disciplina**: tdd-strategist · **Resultado**: 🔴 RED.

## Arquivos

1. `tests/modules/financial/adapters/http/error-classification.test.ts` — **unit** do classificador (`writeErrorStatus`/`toPublicCode`/`toPublicMessage`). Cobre os 2 bugs de mapeamento (`partner-ref-invalid`→400, `timeline-document-not-found`→404).
2. `tests/modules/financial/adapters/http/error-envelope-hardening.http.test.ts` — **e2e** `fastify.inject`: CA1 (409 conflict version-stale), CA2 (409 conflict invalid-state), CA3 (404 not-found), CA4 (422 unprocessable) — cada um com `code` público, `message` PT-BR e sem slug.

## Execução

```
# unit — RED por inexistência de error-mapping.ts (fail-first)
ERR_MODULE_NOT_FOUND: src/modules/financial/adapters/http/error-mapping.ts
ℹ tests 1 · pass 0 · fail 1

# e2e — RED: slug vaza hoje no body 4xx
ℹ tests 4 · pass 0 · fail 4
```

Todos falham por inexistência da regra (módulo + mascaramento). Viram GREEN no W1 com `error-mapping.ts` + `sendDomainError` mascarado + migração do DELETE.
