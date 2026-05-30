# W2 — Code Review

**Resultado: APPROVED**

- **One-time** garantido: `consume` só no estado `pending`; token marcado usado após troca; 2º uso → `reset-token-used`. ✓
- Senha validada ANTES do `consume` → senha fraca não "queima" o token (coberto por teste). ✓
- **Revoga todas as sessões** após o reset (`revokeAllForUser`, OWASP ASVS V3.3) — coberto por teste. ✓
- Ordem canônica validar → consume → domain → persist; sem `throw`; erros como union propagados. ✓
- Mapeamento de erros na rota coerente (token → 400, senha → 422, disabled → 403); rate-limit dedicado. ✓
- **Pendência:** integração MySQL não exercida (porta 3306). Repo Drizzle do reset token (ticket anterior) também não validado contra MySQL real.
