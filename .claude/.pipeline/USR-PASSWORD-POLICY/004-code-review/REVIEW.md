# W2 — Code Review (read-only)

**Ticket:** USR-PASSWORD-POLICY · **Wave:** W2 · **Round:** 1 · **Veredito:** APPROVED

## Checklist

| Item | Status |
| --- | --- |
| Mínimo 12 fundamentado (OWASP 2025/NIST, sem MFA) — ver `001-security-decision.md` | ✅ |
| Sem regras de complexidade (proposta legado rejeitada) | ✅ |
| Endpoint público expõe **só** `{ minLength, maxLength }` — blocklist nunca vaza (teste CA4 trava) | ✅ |
| Limites como fonte única (`Password.minLength/maxLength`) — sem duplicação | ✅ |
| Domínio puro (sem throw/any); schema Zod só na borda (ADR-0027) | ✅ |
| Fixtures de senha curta ajustadas; zero regressão na suíte auth | ✅ |

## Pontos de atenção (registrados, não bloqueiam)

- **Blocklist enfraquecida por design:** com MIN=12, entradas < 12 chars ficam inalcançáveis (rejeitadas por
  comprimento). Follow-up registrado em `001-security-decision.md` para expandir a blocklist com entradas ≥12.
- Endpoint sem rate-limit dedicado: aceitável (resposta estática, sem custo nem segredo).

## Evidência

```
typecheck: 0 errors · eslint (5 arquivos): exit 0
suíte auth: 491 pass / 0 fail
```

Aprovado para W3.
