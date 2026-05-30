# CTR-AUTH-ACCOUNT-LOCKOUT — Cooldown progressivo por conta (BE-REC-001, parte 2)

> **Size:** M · **Épico:** `.claude/.planning/EPIC-AUTH-SECURITY-HARDENING.md` · **Origem:** spec 003 (OWASP WSTG-ATHN-03).

## Escopo

Account lockout **por conta** complementar ao rate-limit por IP — defesa contra password spraying
(que erra pouco por conta e driblaria só o limite por IP). Decisões (AskUserQuestion 2026-05-30):

- **Por conta + resposta genérica:** conta falhas por userId; em cooldown responde o mesmo
  `invalid-credentials` (não vaza existência nem bloqueio) + verify dummy p/ timing.
- **Política:** 5 falhas → cooldown progressivo 1/5/15min, cap 60min; **sempre temporário** (anti-DoS); reset no login bem-sucedido.
- **Modelo:** camada de sessão (DD-USER-06), não no `User`.

## Fora de escopo

- Persistência real (Drizzle/Redis) — store **in-memory** por ora (follow-up `CTR-AUTH-LOCKOUT-PERSISTENCE`).

## Critérios de aceite

- [x] Domínio puro `AccountLockout` (cooldown progressivo, reset, sempre temporário).
- [x] Após 5 falhas, login com senha **correta** ainda retorna `invalid-credentials` (cooldown).
- [x] Falhas abaixo do threshold não impedem o login correto (reset).
- [x] Resposta genérica (anti-enumeração) + timing equalizado (verify dummy no ramo locked).
- [x] typecheck + lint + format + testes auth verdes.
