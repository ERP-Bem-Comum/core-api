# W2 — Code Review (read-only) · PARTNERS-SUPPLIER-EXPORT-HTTP — ✅ APPROVED

## Achados
- **A1 — Reuso sem duplicação**: a rota consome `suppliersToCsv` (exporter já existente) + `supplierMatchesFilter` (filtro do use-case de lista). Zero lógica nova de serialização/filtro duplicada.
  > Duplicação de código é o principal code smell e aquele com o maior potencial para prejudicar a evolução de um sistema. Código duplicado aumenta o esforço de manutenção, pois alterações têm que ser replicadas em mais de uma parte do código.
  > — *(Linha 6161, p. 363, Marco Tulio Valente, *Engenharia de Software Moderna*)*
- **A2 — Segurança**: `supplier:read` (401/403 testados); escape anti-fórmula garantido pelo util (CT formula injection verde); headers `text/csv` + `Content-Disposition: attachment` + `nosniff` (evita render no browser). Export carrega dados bancários → barra `supplier:read` consistente com a leitura do recurso.
- **A3 — `queryToFilter` flexibilizado** para `Pick` — reuso entre lista e export sem acoplar paginação ao export. `suppliersForExport` puro e testável.
- **A4 — Rota estática `/export` antes de `/:id`**: precedência do Fastify garante (testes confirmam, sem 400 de UUID).

**APPROVED.**
