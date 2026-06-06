# W2 — Code Review (read-only) · PARTNERS-SERVICE-CATEGORIES-HTTP — ✅ APPROVED

- A1: catálogo exposto direto do domínio (`listServiceCategories` = `[...CATEGORIES]`), fonte única (SSoT). Resolve a FR-017 do front confirmando 39 categorias canônicas (não 22).
- A2: códigos legados literais preservados (typos `TRASPORTE`/`ONGANIZACAO_DE_EVENTOS`) — fidelidade ao legado (ADR-0033/0031 §D2).
- A3: read-only sob `supplier:read` (401/403 testados); rota estática (sem param) — sem risco de IDOR.
- A4: response schema Zod (`z.array(z.string())`) na borda (ADR-0027).

**APPROVED.**
