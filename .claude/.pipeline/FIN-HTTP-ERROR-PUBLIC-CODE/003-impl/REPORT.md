# W1 — Implementação mínima (FIN-HTTP-ERROR-PUBLIC-CODE)

**Resultado**: 🟢 GREEN.

## Mudanças

1. **Novo** `src/modules/financial/adapters/http/error-mapping.ts`: sets de classificação + `writeErrorStatus` + `toPublicCode` (slug → `not-found`/`conflict`/`bad-request`/`unprocessable`/`internal`) + `toPublicMessage` (dicionário PT-BR com fallback por code público). **Bug-fixes**: `partner-ref-invalid` em `BAD_REQUEST_CODES` (400, antes 422); `timeline-document-not-found` em `NOT_FOUND_CODES` (404, antes 422); slug morto `invalid-supplier-ref` removido.
2. `plugin.ts`: sets + `writeErrorStatus` movidos para `error-mapping.ts` (import). `sendDomainError` 4xx agora envia `toErrorEnvelope(toPublicCode(error), toPublicMessage(error), …)`; slug interno só em `log.debug`. 5xx inalterado.
3. `plugin.ts`: handler `DELETE` migrado de `sendResult` (compartilhado) para `sendDomainError` local — mantém `src/shared/http/reply.ts` intocado (ADR-0014, sem afetar outros módulos). Import `err` órfão removido.

## Execução

```
node --test tests/.../error-classification.test.ts          → 26/26
node --test tests/.../error-envelope-hardening.http.test.ts →  4/4
node --test tests/modules/financial/adapters/http/*.test.ts → 73/73
pnpm run typecheck                                          → verde
```

## Regressão endereçada (não-vazamento aplicado a teste existente)

`version-roundtrip.http.test.ts` (CVR-008) assertava `error.code === 'document-version-conflict'` (o slug que o #52 para de vazar). **Atualizado** para `'conflict'` (code público) — o 409 segue provando o optimistic lock; o contrato novo está em `contracts/README.md`. Não é regressão de produto: o teste codificava o comportamento inseguro.
