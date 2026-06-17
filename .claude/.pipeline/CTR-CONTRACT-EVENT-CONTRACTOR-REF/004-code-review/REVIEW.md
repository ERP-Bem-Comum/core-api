# W2 — Code Review · CTR-CONTRACT-EVENT-CONTRACTOR-REF (US6a)

**Agente:** code-reviewer (general-purpose) · **Outcome:** APPROVED (round 1) · 0 Blockers, 0 Majors, 4 Minors.

## Reconhecido correto
- **Aditivo sem bump** (`OUTBOX_SCHEMA_VERSION` segue `1`); `eventToOutboxInsert` **byte-idêntico** (consumidores existentes — timeline/worker — intocados).
- **Opção A fiel**: enriquecimento 100% no adapter; decoder de domínio (`outboxRowToEvent`) inalterado; CA4 prova retrocompat.
- `LIFECYCLE_WITH_CONTRACTOR` cobre **exatamente** os 3 eventos do ADR-0046 §2 (`ContractActivated`/`ContractStateUpdated` corretamente ignorados).
- Caminho `appendOutboxInTx` sem `contractor` (amendment/document repos) **idêntico** ao pré-diff — sem regressão.
- Wiring atômico preservado (mesma `db.transaction`, ADR-0015). `contract.contractor` é **campo obrigatório** do agregado — sem cast nem `?`.
- `decodeContractContractorRefV1` trata version-mismatch / payload inválido / sem-contraparte (→ `ok(null)`); shape de retorno plano, sem vazar branded IDs.

## Achados (4 Minors)
| ID | Achado | Disposição |
|----|--------|-----------|
| m1 | `JSON.parse`+re-`stringify` reordena chaves (irrelevante p/ consumidor JSON) | Aceito — trade-off certo do wrapper aditivo (não tocar o caminho original) |
| m2 | Duplicação de `parseJsonSafe` (public-api) vs `parseJSON` (adapter) | Justificável (camadas/erros distintos; YAGNI extrair) |
| m3 | Ramo de erro `contractorRef` malformado sem teste | **CORRIGIDO** — adicionado **CA5** (`id` faltando → `DecoderInvalidShape`) |
| m4 | Wiring #3 sem teste de integração dedicado | Aceito — payload-string aditivo sobre INSERT já testado; a projeção real da **US6b** cobre o write-path ponta-a-ponta |

## Gate
5/5 CAs (CA1–CA5) verde; lint limpo. Veredito **APPROVED** → W3.
