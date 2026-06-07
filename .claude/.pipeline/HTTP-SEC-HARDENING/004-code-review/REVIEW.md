# W2 — Code Review · HTTP-SEC-HARDENING

**Agente:** code-reviewer · **Round:** 1 · **Veredito:** APPROVED

## Checklist

- **F3**: 5xx não vaza componente; code real só no log (correlação por requestId). 4xx preservado
  (não quebra contratos de erro do cliente já testados). ✅
- **F4**: regex allowlist conservadora; rastreabilidade legítima (id válido) preservada (CA4). ✅
- **F5**: rate-limit por rota reusa o padrão de `plugin.ts` (`config.rateLimit`); só escrita. ✅
- **Sem regressão**: 2376 pass / 0 fail; suítes de erro existentes (404/validation) intactas. ✅
- Idioma/estilo: comentários PT explicando o "porquê" (não-óbvio de segurança); código EN. ✅

## Observações

- F5 a 30/min é folgado para os testes atuais (<30 escritas/app) e restritivo o suficiente contra
  abuso de convite em massa. Quando o core-api escalar horizontalmente, o store precisa ser
  compartilhado (Valkey, ADR-0030 Proposed) — já anotado no app.ts.

Sem issues bloqueantes.
