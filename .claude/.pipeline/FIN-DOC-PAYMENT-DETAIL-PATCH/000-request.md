# FIN-DOC-PAYMENT-DETAIL-PATCH — editar/remover `paymentDetail` via PATCH (CA6 / US2 da #273)

## Contexto

A issue **#273** (`[financial] persistir paymentDetail no lançamento de documento`) foi entregue
parcialmente pelo ticket `FIN-DOC-PAYMENT-DETAIL` (closed-green, PR #276): **CA1–CA5** (create +
persistência + detalhe + listagem + back-compat + validação 400). O **CA6 (editar/remover via PATCH +
timeline)** foi **deferido** para esta fase US2 — documentado no contrato e no comentário do teste de
rotas (`document-payment-detail.routes.test.ts:10`).

Este ticket entrega o CA6 e fecha a #273.

## Escopo

Tornar `paymentDetail` editável via `PATCH /api/v1/financial/documents/:id`, seguindo o precedente
JÁ existente do campo `description` (mesmo contrato `.nullable().optional()` no `adjustDocumentBodySchema`,
mesma semântica de edição no domínio, mesma auditoria de timeline).

Fonte normativa: `specs/027-fin-document-payment-detail/contracts/http-payment-detail.md:39-52` (§2):

```ts
paymentDetail: paymentDetailInput.nullable().optional(),  // null apaga; ausente não altera
```

| Cenário                       | Status | Resultado                                 |
| ----------------------------- | ------ | ----------------------------------------- |
| novo valor válido             | 200    | atualiza; timeline registra before/after  |
| `null`                        | 200    | apaga (volta a "não informado"); auditado |
| ausente                       | 200    | sem alteração no campo                    |
| inválido (vazio/control/>255) | 400    | rejeitado                                 |

## Cadeia de camadas (seguir o paralelo de `description`)

1. `adapters/http/schemas.ts` — `adjustDocumentBodySchema` ganha `paymentDetail: paymentDetailInput.nullable().optional()`.
2. `adapters/http/plugin.ts` — handler PATCH propaga `body.paymentDetail` ao comando (semântica `undefined` = não altera).
3. `application/use-cases/adjust-document.ts` — comando aceita e repassa `paymentDetail` ao domínio.
4. `domain/document/document.ts` — `adjust`/ajuste-leve aplica `paymentDetail` (undefined preserva; null/valor atualiza), preservando a auditoria de before/after.

## Critérios de aceite (CA6 desdobrado — testáveis)

- [ ] **CA6.1 — Dado** documento `Open` com `paymentDetail`, **Quando** `PATCH` envia novo valor válido, **Então** 200, persiste o novo valor e o `GET /:id` retorna idêntico.
- [ ] **CA6.2 — Dado** documento com `paymentDetail`, **Quando** `PATCH` envia `paymentDetail: null`, **Então** 200 e o campo volta a `null` (apagado).
- [ ] **CA6.3 — Dado** um `PATCH` **sem** a chave `paymentDetail`, **Quando** aplicado, **Então** o campo é preservado (sem alteração).
- [ ] **CA6.4 — Dado** `paymentDetail` inválido (vazio/só-espaços/control chars/>255), **Quando** enviado no PATCH, **Então** 400 (sem persistir).
- [ ] **CA6.5 — Dado** uma edição de `paymentDetail`, **Quando** consultada `GET /:id/timeline`, **Então** registra before/after do campo.

## Definition of Done

- [ ] Testes cobrindo CA6.1–CA6.5 (W0 RED → W1 GREEN — `fastify.inject` + integração se tocar persistência).
- [ ] Gate **W3** verde: `typecheck` + `format:check` + `lint` + `test`.
- [ ] Sem regressão — contagem de testes ≥ baseline.
- [ ] Sem migration nova (coluna `payment_detail` já existe — migration 0026).
- [ ] Issue #273 fechada após merge (link ao PR).

## Classificação

- **Tipo:** gap-contrato (US2 da #273) · **Severidade:** média · **Tamanho:** S
- **dedup-key:** `financial:document-adjust:payment-detail`
