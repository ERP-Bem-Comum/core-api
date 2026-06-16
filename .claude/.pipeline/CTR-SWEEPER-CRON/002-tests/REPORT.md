# W0 — Testes RED (CTR-SWEEPER-CRON)

**Wave**: W0 · **Skill**: `tdd-strategist` · **Camada**: `tests/infra/` (`test-pyramid-engineer`) · **Status**: 🔴 RED · **Data**: 2026-06-16

## Estratégia

A #50 é **infra Docker** — o coração é a **config do serviço** `contracts-sweeper` no `compose.yaml`. O RED valida essa config via **`docker compose config`** (resolve profiles/secrets/depends_on) **sem subir container** — espelha o padrão de sintaxe de `tests/infra/mysql-compose.test.ts`.

- **Skip-guard** (FIN-TEST-INFRA-SKIP-GUARD): pulado sem o plugin `docker compose` no PATH — nunca falha por ambiente.
- Os **CA-exit** (rodar o container → exit 78/0) são bootstrap pesado (sobe mysql + executa o sweeper) → ficam atrás de `COMPOSE_INTEGRATION` na validação da W1, fora deste W0 de sintaxe.

## Teste criado

`tests/infra/contracts-sweeper-compose.test.ts` — 7 casos:

| Caso | Verifica | Estado |
| --- | --- | --- |
| CA1a | serviço `contracts-sweeper` existe (`--profile jobs`) | 🔴 |
| CA1b | `restart: "no"` (one-shot — ADR-0041) | 🔴 |
| CA1c | pertence ao `profiles: [jobs]` | 🔴 |
| CA1d | `depends_on mysql: service_healthy` | 🔴 |
| CA1e | secret `contracts_database_url` (serviço + top-level) | 🔴 |
| CA1f | `security_opt: no-new-privileges:true` | 🔴 |
| CA3 | sem `--profile jobs`, o serviço **não** é ativado (opt-in) | ✅ invariante |

## Resultado

```
node --test tests/infra/contracts-sweeper-compose.test.ts
ℹ tests 7 · pass 1 · fail 6 · skipped 0
```

RED correto: os 6 CAs de configuração falham por **inexistência do serviço** no compose. CA3 já passa — é o guard de opt-in (vale antes e depois da implementação; garante que o job nunca suba no `up` default).

## Próximo (W1)

`docker-compose-expert` adiciona o serviço `contracts-sweeper` ao `compose.yaml` (modelado em `app` + `minio-bootstrap`) + secret `contracts_database_url` (compose `secrets:` + `scripts/setup-secrets.ts`) + doc de disparo (ERP-INFRA, cron 00:05 America/Sao_Paulo) → GREEN.
