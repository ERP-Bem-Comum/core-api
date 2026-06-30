# W3 — Gate + validação Docker real (GREEN) — CORE-MIGRATE-BOOT-INVERT (Slice B)

## Gate de código

| Comando | Resultado |
| --- | --- |
| `pnpm run typecheck` | ✅ 0 erros |
| `pnpm run format:check` | ✅ clean |
| `pnpm run lint` | ✅ 0 erros |
| `pnpm test` | ✅ **3089 testes · 3071 pass · 0 fail · 18 skipped** |
| `docker compose config` (via testes meta) | ✅ default só-infra; profile app inclui migrate+http |

## Validação Docker real (o ponto de risco do Slice B)

`bash scripts/e2e-auth.sh` — sobe mysql, roda o job migrate, sobe o server com `applyMigrations:false`, smoke contra MySQL real:

```
core-api-mysql  Healthy
[migrate] auth: ok
[migrate] contracts: ok
[migrate] financial: ok
[migrate] notifications: ok
[migrate] partners: ok
[migrate] programs: ok
[migrate] ok: auth, contracts, financial, notifications, partners, programs
✔ AUTH-HTTP-E2E-SMOKE — borda auth (server real + MySQL via fetch)
  ✔ CA1: GET /health -> 200 e GET /me sem token -> 401
  ✔ CA2-CA7: register -> login -> me -> refresh -> logout -> refresh revogado (MySQL real)
ℹ pass 2 · fail 0
```

**Prova:** (1) o job `migrate` rodou ANTES do server e provisionou os 6 módulos; (2) o server subiu
com `applyMigrations:false` — **não migrou no boot** — e operou contra o schema pré-criado. O fluxo
`migrate → http` funciona ponta-a-ponta. Teardown (`down -v`) limpou tudo.

Delta de testes: +7 (3082 → 3089) — boot-inversion (12) menos o guard CA9 do Slice A removido (5).

**Regressão zero:** nenhum vermelho.
