# Phase 1 — Contrato HTTP (delta): Financial List DTO (US1)

Uma mudança no item de `GET /api/v2/financial/documents` (sem nova rota; paginação/filtros inalterados).

## Item da listagem — campos adicionados

```jsonc
// item de "items[]" — ANTES → DEPOIS (só adição)
{
  "id": "…",
  "status": "Open",
  "documentNumber": "NFS-123",
  "type": "NFS-e",
  "supplierRef": "…uuid…",
  "netValueCents": "95000",
  "dueDate": "2026-12-31",
  "version": 1,
  // novos (US1):
  "series": "A1", // string | null
  "grossValueCents": "100000", // string de centavos
  "paymentMethod": "PIX", // string
  "contractRef": "…uuid…", // string | null (referência; NÃO o número legível — ver Out of Scope)
}
```

| Campo             | Tipo              | Nulo? | Observação                                      |
| ----------------- | ----------------- | :---: | ----------------------------------------------- |
| `series`          | string            |  sim  | série do documento                              |
| `grossValueCents` | string (centavos) |  não  | valor bruto                                     |
| `paymentMethod`   | string            |  não  | forma de pagamento                              |
| `contractRef`     | string (uuid)     |  sim  | referência do contrato vinculado (não o número) |

**Paginação**: inalterada (`{ items, page, pageSize, total }`). **Filtros**: inalterados (`status`, `supplierRef`, `type`, `dueFrom`, `dueTo`, `page`, `pageSize`).

**Backward-compat**: adição apenas — clientes que não conhecem os campos novos seguem funcionando; campos pré-existentes idênticos.

## NÃO incluído (US2 bloqueada / Out of Scope)

- `supplierName`, `supplierDocument` (CNPJ) — dependem do read-model de fornecedor (eventos do `partners` inexistentes).
- `dataEmissao` — coluna ausente (issue #48).
- número/rótulo do contrato — `contracts` não expõe leitura síncrona.
