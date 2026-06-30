# CTR-AUTH-RATELIMIT-LOGIN — Rate-limit dedicado de login/refresh (BE-REC-001, parte 1)

> **Size:** S · **Épico:** `.claude/.planning/EPIC-AUTH-SECURITY-HARDENING.md` · **Origem:** spec 003 (OWASP WSTG-ATHN-03).

## Escopo

Aplicar rate-limit **dedicado e mais restritivo** em `/api/v2/auth/login` e `/refresh`, separado
do teto global (200/min). Default: **5/min**, configurável.

## Fora de escopo (outros tickets do épico)

- Account lockout por conta (`CTR-AUTH-ACCOUNT-LOCKOUT`) — exige modelo de domínio.
- Store distribuído Redis (`CTR-AUTH-RATELIMIT-REDIS`) — follow-up de infra.

## Critérios de aceite

- [x] `/login` e `/refresh` retornam **429** ao exceder o limite dedicado.
- [x] `/register` (não-sensível) NÃO usa o limite restrito (herda o global).
- [x] Limite configurável: `AuthCompositionConfig.sensitiveRateLimit` + env `AUTH_LOGIN_RATE_LIMIT_MAX`/`_WINDOW`; default 5/min.
- [x] typecheck + lint + format + testes auth verdes.
