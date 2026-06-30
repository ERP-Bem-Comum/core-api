# W0 — Tests (RED)

## Contexto

A migração para pnpm 11 expôs um comportamento novo: **no pnpm 11 o `npm_config_user_agent` vem vazio em lifecycle scripts** (no v10 era `"pnpm/10.x ..."`). O guard `scripts/only-allow-pnpm.ts` dependia só do UA.

## RED observado

Sob pnpm 11, `tests/scripts/only-allow-pnpm.test.ts` falhou:

- `CA3: mensagem de erro está em PT-BR e cita ADR-0012` → `expected: /pnpm/, actual: ''` — o guard não abortava (UA herdado vazio), logo nenhuma mensagem em stderr.

Também `pnpm install` abortava em dois pontos legítimos da política nova:

- `[ERR_PNPM_TRUST_DOWNGRADE] undici-types@6.21.0` — `trustPolicy: no-downgrade` disparando (proteção funcionando).

## Cobertura adicionada

Casos novos no teste do guard, controlando `npm_execpath` além do UA:

- `CA1: aborta com UA "npm" mesmo que o execpath herdado seja pnpm` (regressão pnpm 11).
- `CA2: permite no pnpm 11 — UA vazio + execpath pnpm`.
