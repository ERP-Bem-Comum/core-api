# W3 — FIN-RECON-EXECUTOR-NAME (#207)

**Resultado:** ALL-GREEN ✅ — `ts-quality-checker` (via `contratos-orchestrator`), **re-verificado pelo orquestrador-pai**.

```
pnpm run typecheck     → tsc --noEmit, sem erros
pnpm run format:check  → All matched files use Prettier code style!
pnpm run lint          → eslint ., exit 0
pnpm test              → tests 3197 · pass 3179 · fail 0 · skipped 18
```

Testes novos do ticket: **11/11** (`reconciliation-executor-name.http.test.ts` CA1–CA4 + `resolve-user-name.test.ts` CA5×6 + `user-read.drizzle.test.ts` gated). Baseline anterior 3185 → 3197 (+12). Integração (18 skip) atrás de `MYSQL_INTEGRATION` (Docker bloqueado localmente; roda no CI).

Isolamento ADR-0006 confirmado por grep (financial/domain|application sem import de auth). #207 entregue: `reconciledByName`/`closedByName` via composição síncrona ADR-0032.
