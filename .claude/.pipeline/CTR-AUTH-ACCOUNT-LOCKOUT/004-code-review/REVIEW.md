# W2 — Code Review

**Resultado: APPROVED**

- Modelo na camada de sessão (DD-USER-06), domínio puro (Result/Readonly/sem throw); cooldown sempre temporário com cap — sem "lockout permanente como DoS". ✓
- Resposta genérica em cooldown + verify dummy → não vaza existência/bloqueio e mantém o timing (consistente com BE-REC-002/DD-LOGIN-01). ✓
- `noUncheckedIndexedAccess` tratado no acesso a `stepsMinutes` (fallback). ✓
- Erros de store propagados (não engolidos); union estende `LoginLockoutStoreError` → 500 genérico nas rotas. ✓
- **Limitação aceita (épico):** store in-memory — não compartilha entre instâncias nem sobrevive a restart; um atacante distribuído por IPs não é totalmente contido sem store compartilhado. Follow-up: `CTR-AUTH-LOCKOUT-PERSISTENCE`.
