# W1 — GREEN — CORE-DB-POOL-CONFIG-INVARIANT

**Agentes:** `mysql2-driver-expert` (semântica) + skill `ports-and-adapters` + agente `general-purpose` (replicação mecânica nos 6 drivers) · **Data:** 2026-07-10

## Implementação
1. **`src/shared/persistence/mysql-pool-config.ts`** (novo): `buildPoolOptions(input): Result<PoolOptions, PoolConfigError>` — puro, sem `throw`.
   - Invariante por construção: `maxIdle` default = `max(1, min(2, connectionLimit-1))` → **sempre `< connectionLimit`** (reaper do mysql2 sempre arma).
   - Erros tipados: `pool-config-connection-limit-invalid` / `pool-config-max-idle-invalid` / `pool-config-idle-timeout-inert` (caller que força `maxIdle >= connectionLimit` falha alto, nunca config morta).
   - Preserva `timezone:'Z'`, `idleTimeout:270_000` (agora **efetivo**), `enableKeepAlive`, `keepAliveInitialDelay:10_000`, `waitForConnections`, `queueLimit:0`.
2. **7 drivers** (`{contracts,auth,financial,partners,programs,budget-plans,notifications}/.../mysql-driver.ts`): `build*PoolOptions` passa a **delegar** ao compartilhado e retornar `Result`; `createPoolSafe` desempacota e mapeia para `*-mysql-driver-pool-config-invalid`. Removida a duplicação (`DEFAULT_*` locais) que propagou o bug 7×.
3. **Teste-símbolo atualizado** (`mysql-driver-tuning.test.ts`, do CTR-DB-DRIVER-POOL-TUNING): desempacota o `Result` **e ganhou a asserção que faltava** (`maxIdle < connectionLimit`) — o teste que só via "valor" agora também vê a invariante.

## D2 (default do maxIdle) — resolvido
`maxIdle` default = `min(2, connectionLimit-1)` (poucas conexões quentes por pool, conservador dado o alto nº de pools/processo). A **invariante** `maxIdle < connectionLimit` é inegociável; o literal é tunável e será revisitado no `CORE-DB-CONNECTION-BUDGET`.

## Divergências do agente (bem-julgadas)
- Import: manteve o estilo de cada driver (`#src/...` vs relativo).
- Erro/log prefixado por módulo (os 6 usam erros prefixados) — não afeta CA-7 (testa `build*PoolOptions`, cujo erro é o `PoolConfigError` do compartilhado; a delegação é direta). Callers apenas re-exportam o union (sem switch exaustivo) — confirmado.

## Evidência
```
CA-1..CA-6 (builder)        → 6/6 pass
CA-7 (7 drivers × 2)        → 14/14 pass
CA-8 (efeito)               → skip (opt-in MYSQL_INTEGRATION — pendente x99)
pnpm test (repo inteiro)    → tests 3818 · pass 3795 · fail 0 · skipped 18 · todo 5
typecheck / lint / format:check → verdes
```

## Pendente
- **CA-8 (efeito de reaping) no x99** (`MYSQL_INTEGRATION=1`) — prova que a conexão ociosa fecha de fato. É a lição-mãe; validar antes do merge do PR.
