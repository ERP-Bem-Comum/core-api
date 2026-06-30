# W0 — Testes RED · AUTH-DOMAIN-OUTBOX

> Skill: `tdd-strategist` · Outcome: **RED** · 4 arquivos / 13 casos

Testes antes de tocar `src/` (fail-first), cobrindo CA1–CA7: schema/mapper do `auth_outbox`,
emissão atômica de `PasswordResetRequested` (reset) e `UserInvited` (invite) na mesma tx,
anti-enumeração (sem evento p/ conta inexistente/inativa) e rollback conjunto. Falham por
inexistência da API. Suíte existente verde.
