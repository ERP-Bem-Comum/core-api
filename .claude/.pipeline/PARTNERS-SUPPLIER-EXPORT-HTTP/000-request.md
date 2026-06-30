# PARTNERS-SUPPLIER-EXPORT-HTTP — Rota de export de fornecedores (CSV)

**Épico**: `specs/001-partners-http-gaps/` (ticket #3) · **Size**: S · **US-003**

## Escopo
Expor `GET /api/v1/suppliers/export` (`supplier:read`) que filtra por search/active/categories e
serializa via `suppliersToCsv` (já existente, consome shared/utils/csv.ts). Headers text/csv + attachment.

## CAs
401 sem sessão; 403 sem permissão; filtro por categoria reflete no CSV; formula injection escapada (util); Content-Disposition attachment.
