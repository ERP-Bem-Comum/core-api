# Contrato HTTP — Remessas (financial)

Borda Fastify + Zod (ADR-0027). Prefixo `/api/v2/financial`. Aditivo — nenhuma rota existente muda.

## POST /api/v2/financial/remittances

Gera a(s) remessa(s) a partir de uma seleção de documentos. Agrupa por `debitAccountRef` → 1 lote por conta.

- **Permissão**: `payable:transmit` (nova).
- **Request body** (Zod):
  ```
  { documentIds: z.array(z.uuid()).min(1) }   // min(1) → 400 em seleção vazia (FR-013)
  ```
- **201 Created**:
  ```
  { remittances: Array<{
      id: uuid, debitAccountRef: uuid, nsa: number, hash: string(64),
      storageRef: { bucket, key, sizeBytes }, documentIds: uuid[]
  }> }
  ```
- **Status de erro**:
  | Código | Quando |
  |---|---|
  | `400` | body fora do shape / `documentIds` vazio / UUID inválido (Zod) |
  | `409` | algum documento não está `Approved`, já está `Transmitted`, ou forma de pagamento inelegível — corpo identifica os ofensores (`{ error, offendingDocumentIds }`) |
  | `422` | dados de cedente/título inválidos para o CNAB (ACL) |
  | `503` | storage/repositório indisponível |

  Erros internos em EN kebab-case: `document-not-approved`, `document-already-transmitted`, `payment-method-not-eligible`, `remittance-empty`, `cnab-translation-failed`, `cedente-account-not-found`.

## GET /api/v2/financial/remittances/:id

- **Permissão**: `payable:read`.
- **200**: metadados do lote (`id, debitAccountRef, nsa, hash, status, generatedAt, documentIds[]`).
- **404**: id inexistente. **400**: `:id` não-UUID.

## GET /api/v2/financial/remittances/:id/download

- **Permissão**: `payable:read`.
- **200**: arquivo CNAB (corpo `text/plain` + `content-disposition: attachment; filename="CB<nsa>.REM"`, `x-content-type-options: nosniff`) **ou** redirect `302` para signed URL do storage (decisão do ticket de borda).
- **404**: lote/arquivo inexistente.

## Notas

- Validação de borda (Zod) só checa shape; elegibilidade (`Approved` + forma) é regra de **domínio** → `409`/`422`, não `400`.
- A resposta lista **N remittances** (uma por conta-cedente presente na seleção) — SC-006.
