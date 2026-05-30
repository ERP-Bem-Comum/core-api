# W2 — Code Review

**Resultado: APPROVED**

- BE-REC-004: userId sempre de `req.userId` (JWT via `requireAuth`), nunca do body → sem IDOR. changePassword ja revoga todas as sessoes apos a troca (DD-USER-06). ✓
- BE-REC-002: port `PasswordHasher` intacto; dummy hash injetado como dep, computado uma vez no boot. Ordem anti-enumeration de DD-LOGIN-01 preservada. ✓
- BE-REC-005: blocklist no dominio (puro), erro propagado pela union; mapeado a 422 nas rotas que aplicam policy. Sem rede (offline). ✓
- Regras de camada respeitadas (domain puro, application factory, Zod só na borda). Sem `throw` fora de adapter/boot.
