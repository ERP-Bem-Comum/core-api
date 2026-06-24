# W2 — Code Review · FIN-PAYABLE-PAIDAT-READ (#231)

**Veredito:** ✅ APPROVED

- `paidAt` modelado no domínio (`Payable`), não derivado na persistência — correto (DDD; estado do título pago). Resolve o gap [[fin-document-status-domain-gap]] para `paidAt`.
- Migration aditiva nullable (não-quebrante); `paid_at` espelha `fin_payables`.
- Mappers simétricos (`mapPayablesToRows`/`mapPayableRows`); read path coerente Drizzle ↔ in-memory.
- `paidAt` date-only no DTO, consistente com `dueDate`/`issueDate` (#229).
- Cobertura: comportamento (HTTP in-memory) + persistência real (integração Drizzle 53/53).
