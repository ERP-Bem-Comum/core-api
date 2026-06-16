# W1 — CTR-AUTO-EXPIRE — REPORT (GREEN) ✓

**Outcome:** GREEN · **Data:** 2026-06-16 · **Orquestração:** ts-domain-modeler · ports-and-adapters · drizzle-orm-expert · nodejs-runtime-expert (+ acdg-skills via fallback para teoria).

## Resultado

```
pnpm run typecheck   → verde (tsc --noEmit)
pnpm run format:check → verde
ticket (expire-guard + sweeper) → 6/6 pass
suíte completa → 2488 testes · 2470 pass · 0 fail · 18 skipped (integration opt-in)
```

## Fatias implementadas

### A — Domínio: guarda D+1 (skill `ts-domain-modeler`)
`src/modules/contracts/domain/contract/contract.ts:251` — guarda de `expire` trocada de `isBefore(at, end)` para
`!PlainDate.isAfter(at, end)`: rejeita `at <= end` (o último dia conta inteiro; só expira quando `at > end`).
Transição total sobre tipo refinado (§3.D.2); tagged error `ContractCannotExpireYet` preservado; zero `throw`.
A rota manual `/end {Expire}` passa a respeitar a mesma regra (intencional — `IMPROVEMENTS`).

### B — Port + job (skill `ports-and-adapters`)
- `domain/contract/repository.ts` — novo `findExpirable(cutoff: PlainDate, limit): Promise<Result<readonly ActiveContract[], ContractRepositoryError>>`.
- `src/jobs/contracts/sweeper/sweeper.ts` — `runSweep(deps, config)`: `findExpirable(clock.today(), batchSize)` → `Contract.expire(active, clock.now())` → `repo.save(contract, [event])`. Declara só `Pick<…,'findExpirable'|'save'>` (baixo acoplamento). Evento `ContractEnded{kind:Expired}` vai ao **outbox** (ADR-0015), nunca publicado direto.

### C — Persistência (agente `drizzle-orm-expert`)
- `findExpirable` no adapter **in-memory** e **Drizzle** (`status='Active' AND current_period_kind='Fixed' AND current_period_end < cutoff ORDER BY current_period_end LIMIT`).
- Índice composto `ctr_contracts_expirable_idx (status, current_period_kind, current_period_end)` (igualdades antes do range — Refman 8.4 §10.2.1.2) + migration `0014_mysterious_randall_flagg.sql`.
- Teste de integração `tests/modules/contracts/adapters/persistence/repos/find-expirable.mysql.test.ts` (6 cenários, opt-in `MYSQL_INTEGRATION=1`).
- **Decisão CA5:** opção (a) `SELECT … LIMIT` simples (sem `FOR UPDATE`) — o lock não persistiria entre `findExpirable` (tx A) e `save` (tx B); coordenação multi-instância é **F-Plus** (ADR-0041: `GET_LOCK`/`UNIQUE`), single-instance hoje.

### D — Entrypoint one-shot (agente `nodejs-runtime-expert`)
- `src/jobs/contracts/sweeper/config.ts` (`readJobConfig`), `run.ts` (one-shot: abre MySQL → repo Drizzle → `withNewCorrelation(runSweep)` → fecha pool no `finally` → `process.exitCode`; **sem** AbortController/SIGTERM), `clock-sao-paulo.ts` (cutoff D+1 em `America/Sao_Paulo` via `Intl.DateTimeFormat`).
- `package.json`: script `job:contracts:sweep`.

## Transporte trocável (pub/sub-ready)
Por design: (1) o evento vai ao **outbox** via `repo.save` — a entrega real (log/HTTP/**Redis/NATS/RabbitMQ**) é trocável pelo `EventDelivery` port do outbox-worker, sem tocar domínio/sweep; (2) `runSweep` é agnóstico ao disparador — cron one-shot hoje, fila de jobs no futuro (ADR-0041 F-Plus).

## Mapa CA → implementação

| CA | Implementação | Teste |
|---|---|---|
| CA1 (expira + outbox) | `runSweep` → `expire` + `save([event])` | sweeper.test.ts 🟢 |
| CA2 (guarda `at <= end`) | guarda D+1 em `contract.ts:251` | expire-guard.test.ts 🟢 |
| CA3 (Indefinite) | guarda `kind==='Indefinite'` + filtro `findExpirable` | expire-guard + find-expirable 🟢 |
| CA4 (vigência atual) | `expire`/`findExpirable` usam `currentPeriod` (com aditivos) | expire-guard + find-expirable 🟢 |
| CA5 (lote / lock) | `LIMIT` no `findExpirable`; lock real = F-Plus (ADR-0041) | sweeper (batch) + find-expirable (filtro/limit) 🟢 |

## Pendência de infra (fora de `src/` — issue separada)
O cron que dispara `pnpm run job:contracts:sweep` 1×/dia (00:05 `America/Sao_Paulo`) em `ERP-INFRA` (systemd timer / `ofelia`).
