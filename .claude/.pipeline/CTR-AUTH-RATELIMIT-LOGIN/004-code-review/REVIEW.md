# W2 — Code Review

**Resultado: APPROVED**

- Override por rota via `config.rateLimit` é o mecanismo nativo do `@fastify/rate-limit` — não duplica plugin nem store. ✓
- Default seguro (5/min) aplicado quando a config é omitida; configurável por env (prod) e por `AuthCompositionConfig` (testes). ✓
- Apenas rotas sensíveis (login/refresh) afetadas; register/me intactos (controle no teste). ✓
- Limitação conhecida (registrada no épico): store in-memory — não compartilha entre instâncias nem sobrevive a restart. Mitigação real = `CTR-AUTH-RATELIMIT-REDIS`. Account lockout por conta = `CTR-AUTH-ACCOUNT-LOCKOUT`.
