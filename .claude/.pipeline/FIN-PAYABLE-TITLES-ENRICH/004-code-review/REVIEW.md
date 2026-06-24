# W2 — Code Review · FIN-PAYABLE-TITLES-ENRICH (#229)

**Veredito:** ✅ APPROVED

- Campos aditivos em toda a cadeia (domínio→mapper→adapters→borda); paridade Drizzle ↔ in-memory mantida.
- `version` via `LoadedDocument` respeita FR-009 (optimistic lock exposto no read-model, como no grid por documento).
- Narrowing `'netValue' in doc` correto (rascunho não tem líquido); sem `as`/`any`.
- `dueDate`/`issueDate` date-only conforme pedido; schema de resposta valida a saída.
- Testes de regressão atualizados ao novo contrato (não suprimidos).
