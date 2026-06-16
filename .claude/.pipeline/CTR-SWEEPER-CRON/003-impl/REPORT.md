# W1 — Implementação até GREEN (CTR-SWEEPER-CRON)

**Wave**: W1 · **Agente**: `docker-compose-expert` (+ correções inline do orquestrador) · **Status**: 🟢 GREEN · **Data**: 2026-06-16

## Implementado

| Arquivo | Conteúdo |
| --- | --- |
| `compose.yaml` | serviço `contracts-sweeper` (`profiles:[jobs]`, `restart:"no"`, reusa `image: core-api:dev`, `depends_on mysql:service_healthy`, secret `contracts_database_url`, `security_opt no-new-privileges`) + secret top-level |
| `scripts/setup-secrets.ts` | gera `./secrets/contracts_database_url.txt` = `mysql://core_app:<app-pwd>@mysql:3306/core` (host = serviço compose; prod injeta a real) |
| `handbook/infrastructure/06-contracts-sweeper-job.md` | runbook: disparo `docker compose --profile jobs run --rm contracts-sweeper`, cron 00:05 America/Sao_Paulo (ERP-INFRA), exit 1/78 → alerta sem restart loop, pré-req migration (CA6), cita ADR-0041 |

## 🐞 Bug funcional achado na validação (corrigido)

O agente assumiu que o `ENTRYPOINT` da imagem era `tini -- node` e que `command` sobrescreveria só o CMD. **Falso:** o `Dockerfile:129` tem `ENTRYPOINT ["tini","--","node","src/server.ts"]` — `src/server.ts` está NO entrypoint. Com `command: [run.ts]` **anexado**, o container rodaria `node src/server.ts src/jobs/.../run.ts` → **subiria o servidor, não o sweeper**. O teste de config (W0) não pega isso (só os CA-exit pegariam, e são gated).

**Fix:** `entrypoint: ['tini','--','node']` no serviço (override) → efetivo `tini -- node src/jobs/.../run.ts`. **+ teste de regressão `CA1g`**: entrypoint+command devem executar `run.ts`, nunca `server.ts`.

## Higiene de lint (regressão zero)

- `setup-secrets.ts`: `let appPwd` não-inicializado (`init-declarations`) → try/catch unificado com `const`.
- teste: regex `.test()` → `.includes()` (`prefer-includes`).

## RED → GREEN

`tests/infra/contracts-sweeper-compose.test.ts` — **8 pass / 0 fail** (CA1a–g + CA3). Antes: 6 RED.

## Gate (incremento)

```
pnpm run typecheck     → ✅
pnpm run format:check  → ✅
pnpm run lint          → ✅ (0 errors)
node --test tests/infra/contracts-sweeper-compose.test.ts → ✅ 8/8
docker compose config (default + --profile jobs) → ✅ exit 0
```

## Pendente p/ W3

**CA-exit** (rodar o container → exit 78 sem URL · exit 0 + `Expired` com URL válida) é bootstrap gated por `COMPOSE_INTEGRATION` — validar via `docker compose --profile jobs run` na W3 (sobe MySQL real). Próximo: **W2** (code-review + security do compose/secret).
