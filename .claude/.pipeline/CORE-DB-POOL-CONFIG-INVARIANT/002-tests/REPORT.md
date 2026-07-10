# W0 — RED — CORE-DB-POOL-CONFIG-INVARIANT

**Skill:** `tdd-strategist` · **Data:** 2026-07-10 · **Branch:** `fix/pool-config-invariant`

## Testes escritos (RED por inexistência da API)
1. `tests/shared/persistence/mysql-pool-config.test.ts` — **CA-1..CA-6** (invariante estrutural do builder compartilhado) + **CA-8** (efeito de reaping, opt-in `MYSQL_INTEGRATION=1`, x99).
2. `tests/shared/persistence/driver-pool-delegation.test.ts` — **CA-7** (os 7 drivers delegam ao builder e propagam `Result`).

## Cobertura das 8 CAs
| CA | Asserção | Estado esperado no W1 |
| :- | :- | :- |
| CA-1 | config válida → `ok` com `maxIdle < connectionLimit` | reaper sempre arma |
| CA-2 | `maxIdle` explícito `>= connectionLimit` → `err('pool-config-idle-timeout-inert')` | falha alto, nunca config morta |
| CA-3 | `connectionLimit < 1` → `err('pool-config-connection-limit-invalid')` | — |
| CA-4 | `maxIdle` explícito `< 1` → `err('pool-config-max-idle-invalid')` | — |
| CA-5 | default preserva `timezone:'Z'`, `idleTimeout:270_000`, `enableKeepAlive`, `waitForConnections` (+ invariante) | idleTimeout agora **efetivo** |
| CA-6 | overrides válidos refletem no `PoolOptions` | — |
| CA-7 | os 7 `build*PoolOptions` retornam `Result` e propagam `err` de config inválida | invariante em 1 lugar |
| CA-8 | **EFEITO:** conexão ociosa acima de `maxIdle` fecha após `idleTimeout` (contagem viva converge) | prova a reciclagem real (x99) |

## Evidência RED
```
mysql-pool-config.test.ts     → ERR_MODULE_NOT_FOUND (#src/shared/persistence/mysql-pool-config.ts) · fail 1
driver-pool-delegation.test.ts → tests 14 · pass 0 · fail 14 (build*PoolOptions retorna PoolOptions cru → .ok = undefined)
```

CA-8 é o teste que o `CTR-DB-DRIVER-POOL-TUNING` **não** tinha (asseverou valor, não efeito) — a lição-mãe do Incident-0001.

## Próximo (W1 — GREEN)
- Criar `src/shared/persistence/mysql-pool-config.ts`: `buildPoolOptions(input): Result<PoolOptions, PoolConfigError>`, `maxIdle` default derivado `< connectionLimit`.
- **D2 a confirmar** com `mysql2-driver-expert` + `database-engineer`: valor do `maxIdle` default (proposta `min(2, connectionLimit-1)`). A invariante é inegociável; o literal é tunável.
- Delegar os 7 `build*PoolOptions` ao compartilhado (assinatura passa a `Result`).
