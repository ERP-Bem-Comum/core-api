# W2 — Code Review (read-only) · PAR-COLLABORATOR-PROFILE-FIELDS (US2)

**Veredito:** APPROVED (round 1) · auto-review do implementador.

| Critério | Status |
|----------|--------|
| Domínio puro (Result, sem throw/class) | ✅ VOs + coerência via Result |
| Erros kebab-case (`sex-invalid`, `marital-status-invalid`, `collaborator-children-inconsistent`) | ✅ |
| ADR-0020 (sem JSON/ENUM nativo) | ✅ enums varchar; `childrenAges` CSV |
| Aditivo backward-compatible | ✅ campos opcionais no input; legados válidos (suite verde) |
| `sex` ≠ `genderIdentity` (decisão PO) | ✅ campo independente |
| Migration gerada | ✅ `0011` (12 colunas) |
| Borda valida; erro→422 | ✅ |

## Achados
- **Nenhum Blocker/Major.**
- **Nota (consciente):** `childrenAges` como CSV em `varchar` perde consultabilidade relacional — aceito por YAGNI/clarify (sem query por idade). `parseChildrenAges` filtra tokens não-finitos (defensivo contra dado corrompido).
- **Escopo:** PUT cadastral não toca os campos de perfil (são de `complete-registration`) — coerente com a US.

## Conclusão
Aprovado para W3.
