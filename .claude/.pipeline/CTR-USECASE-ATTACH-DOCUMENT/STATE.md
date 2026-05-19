# Estado do Ticket CTR-USECASE-ATTACH-DOCUMENT

| Wave | Status |
| :--- | :--- |
| W0 | ✅ |
| W1 | ✅ — 171/171 |
| W2 | ✅ APPROVED (padrão simples, sem Clock — anexação é estado puro) |
| W3 | ✅ ALL GREEN |

## 🎉 Ticket FECHADO

**Artefatos:**
- `src/modules/contracts/application/use-cases/attach-signed-document.ts` (66 linhas)
- `tests/modules/contracts/application/use-cases/attach-signed-document.test.ts` (118 linhas, 5 testes)

**Padrões aplicados:**
- **Sem Clock injetado** — anexação não cria evento temporal (o evento usa `amendment.createdAt`).
- **Deps mínimas** (`amendmentRepo`, `eventBus` apenas) — não precisa de `contractRepo`; só vê o `Amendment`.
- **Validação `DocumentId` no use case** — caller passa string raw, use case re-valida.

**Próximo:** `CTR-USECASE-QUERIES` (listContracts + getContract)
