# FIN-STRICT-RESPONSE-SCHEMAS — `.strict()` nos schemas Zod de resposta (#384)

**Issue:** #384 · **Follow-up:** FIN-MATCH-PAIDAT (#272) · **Size:** M · **Módulo:** `financial/adapters/http`

## Problema & risco (curadoria zod-expert)
Os `*ResponseSchema` do financial (`schemas.ts`, 85 `z.object`) não usam `.strict()`. **Não há vazamento
ativo** (CWE-200): o `serializerCompiler` (`fastify-zod-openapi` 5.6.1) usa `schema.safeParse` do Zod, e o
default `strip` **descarta** chaves extras (medido: campo extra → `{"a":"x"}`, não vaza). Nenhum
`.passthrough()` no código; DTO mappers montam por seleção explícita de campo. O ticket é **detecção
precoce de drift futuro**: com `.strict()`, um campo sensível adicionado ao DTO sem atualizar o schema
vira `500 FST_ERR_RESPONSE_SERIALIZATION` em CI/staging (o error handler NÃO ecoa nome de campo ao cliente),
forçando atualização consciente.

## Fatos de Zod 4.4.3 (medidos)
- `.strict()` funciona (≡ `z.strictObject()`); default de `.object()` é `strip`.
- `.strict()` é **RASO**: só o nível do objeto onde é chamado; aninhados (`payeeBank.bankAccount`,
  `payables[]`, itens de `z.array`) precisam de `.strict()` próprio. `.extend()` **preserva** o modo.
- A doc OpenAPI já emite `additionalProperties:false` — o gap é só no runtime (`safeParse`).

## Escopo (14 sensíveis + aninhados — decisão do dono 2026-07-10)
`documentResponseSchema`(+`payableResponseSchema`,`payeeBank.bankAccount`/`pixKey`), `documentSummarySchema`,
`cedenteAccountResponseSchema`(+`cedenteAccountListItemSchema` via extend), `accountStatementResponseSchema`
(+`statementViewDaySchema`/`statementViewLineSchema`), `statementTransactionsResponseSchema`(+item),
`payableListResponseSchema`(+`payableSummarySchema`), `payablesBatchResponseSchema`(+item),
`documentsBatchResponseSchema`(+item), `recentPaymentsResponseSchema`(+`recentPaymentSchema`),
`paidPayablesResponseSchema`(+`paidPayableSchema`), `transactionReconciliationResponseSchema`(+item),
`documentTimelineResponseSchema`(+`timelineEntrySchema`), `reconciliationPeriodsResponseSchema`(+item).
**Fora:** triviais (`{ok}`, catálogos estáticos, contadores) — não valem `.strict()`.

## CA
- Cada schema afetado: chave extra → `safeParse.success === false`; shape válido → `success === true` (regressão).
- Aninhados blindados: chave extra no nível interno → rejeitada.
- 1 teste de integração (`fastify.inject`) prova que o serializer real produz 500, não 200-com-vazamento.
- Gate W3 verde; nenhuma resposta legítima quebra (DTO mappers são explícitos → não passam campo não-declarado).

## DoD
W0 RED (contrato safeParse) → W1 (`.strict()`) → W2 (security + zod) → W3 verde.
