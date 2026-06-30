# W1 — Implementação GREEN (CA6 / PATCH paymentDetail)

**Agente:** fastify-server-expert · **Outcome:** GREEN

Princípio: espelhar o campo `description` (já editável via PATCH). 9 pontos em 5 arquivos:

1. `adapters/http/schemas.ts` — `adjustDocumentBodySchema` ganha `paymentDetail: paymentDetailInput.nullable().optional()`.
2. `adapters/http/plugin.ts` — handler PATCH: `...(body.paymentDetail !== undefined ? { paymentDetail: body.paymentDetail } : {})`.
3. `application/use-cases/adjust-document.ts` — `AdjustDocumentCommand` + `buildChanges` + chamada `editMetadata`.
4. `domain/document/document.ts` — `AdjustDocumentChanges`, `adjust`, `EditMetadataInput`, `editMetadata`.
5. `domain/timeline/projection.ts` — `documentSnapshot` ganha `paymentDetail` (**9º ponto, não previsto**): a timeline deriva o diff before/after do snapshot do agregado; sem isso o CA6.5 falhava.

**Decisão de design (não-óbvia):** no `adjust` (caminho completo) usou-se `c.paymentDetail !== undefined ? c.paymentDetail : d.paymentDetail` em vez de `?? ` — `null ?? d.paymentDetail` não apagaria, quebrando CA6.2. (O `description` legado usa `??` e tem esse limite no caminho completo; `paymentDetail` ficou correto.)

**Resultado:** suíte **3265 testes / 0 falhas** (baseline 3255 → +10 novos, zero regressão). Typecheck limpo. Sem migration (coluna `payment_detail` já existe — 0026).
