# Phase 1 — Contratos HTTP (deltas): Financial Hardening

Deltas de contrato da borda `/api/v2/financial/*`. Nenhuma rota nova; três mudanças de contrato nas rotas existentes.

---

## 1. Envelope de erro 4xx (#52)

**Forma** (inalterada):

```json
{ "error": { "code": "<público>", "message": "<PT-BR>", "requestId": "<uuid>" } }
```

**Mudança**: `code` ∈ `{ conflict, not-found, bad-request, unprocessable }` (antes: slug interno). `message` em PT-BR. Slug interno só no log. 5xx mantém `{ code: "internal" }`.

### Mapeamento normativo slug-interno → code público

| Slug interno                                                                                                                                        | code público    | Status |
| --------------------------------------------------------------------------------------------------------------------------------------------------- | --------------- | :----: |
| `document-not-found`, `timeline-document-not-found`                                                                                                 | `not-found`     |  404   |
| `document-version-conflict`, `invalid-state-transition`, `cancel-not-allowed`                                                                       | `conflict`      |  409   |
| `financial-ref-invalid`, `partner-ref-invalid`, `document-id-invalid`                                                                               | `bad-request`   |  400   |
| `document-incomplete`, `net-value-not-positive`, `retention-not-allowed-for-type`, `money-*`, `retention-*`, `registered-tax-*`, `user-ref-invalid` | `unprocessable` |  422   |

**Correções de bug embutidas**: `partner-ref-invalid` hoje cai em 422 → passa a **400**; `timeline-document-not-found` hoje cai em 422 → passa a **404**. Slug morto `invalid-supplier-ref` removido do set.

**Exemplo (409, version stale)** — antes → depois:

```jsonc
// ANTES (vaza mecanismo interno)
{ "error": { "code": "document-version-conflict", "message": "document-version-conflict", "requestId": "…" } }
// DEPOIS
{ "error": { "code": "conflict", "message": "O documento foi modificado por outra operação. Atualize e tente novamente.", "requestId": "…" } }
```

---

## 2. `DELETE /api/v2/financial/documents/:id` — exige `version` (#55)

**Antes**: `DELETE /documents/:id` sem body; remove incondicionalmente.

**Depois**: exige body com a versão lida.

```http
DELETE /api/v2/financial/documents/:id
Content-Type: application/json

{ "version": 3 }
```

| Resultado                        | Status  | Body                                                             |
| -------------------------------- | :-----: | ---------------------------------------------------------------- |
| Cancelado (versão corrente)      | **204** | —                                                                |
| `version` ausente/ inválida      | **400** | `{ error: { code: "bad-request", … } }`                          |
| Versão defasada (outra tx mutou) | **409** | `{ error: { code: "conflict", … } }` — documento **não** apagado |
| Documento inexistente            | **404** | `{ error: { code: "not-found", … } }`                            |

Schema: `cancelDocumentBodySchema = z.object({ version: z.number().int().min(0).max(Number.MAX_SAFE_INTEGER) })`.

**Backward-compat**: mudança intencional de contrato de entrada (coordenada com web-app v2). Simetria com `PATCH`/approve/undo, que já exigem `version`.

---

## 3. `GET /api/v2/financial/documents/:id/timeline` — bounds em `changes.*` (#54)

**Payload de dados inalterado.** Só o **OpenAPI** ganha `maxLength`:

```jsonc
// trecho do response schema (OpenAPI gerado)
"changes": {
  "type": "array",
  "items": {
    "type": "object",
    "properties": {
      "field":  { "type": "string", "maxLength": 60 },
      "before": { "type": ["string", "null"], "maxLength": 65535 },
      "after":  { "type": ["string", "null"], "maxLength": 65535 }
    }
  }
}
```

Além disso, o enum `eventType` do response passa a refletir `TIMELINE_EVENT_TYPES` (4 valores, **sem** `DocumentCancelled`) — ver `data-model.md`.

**Garantia**: response schema (saída do banco); `.max()` espelha o constraint físico — nenhuma linha legítima existente é rejeitada (FR-012).
