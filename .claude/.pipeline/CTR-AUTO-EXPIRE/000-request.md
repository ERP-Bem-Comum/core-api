# CTR-AUTO-EXPIRE — Transição automática `Active → Expired` (job de sweep one-shot + guarda D+1)

> **Origem:** GitHub issue [#39](https://github.com/ERP-Bem-Comum/core-api/issues/39). Consolida `CTR-AUTO-EXPIRE`
> + `CTR-CONTRACT-AUTO-EXPIRE` + decisões de `CTR-AUTO-EXPIRE-IMPROVEMENTS` (P.O., 2026-06-15).
> **Arquitetura:** segue o [ADR-0041](../../../handbook/architecture/adr/0041-specialized-workers-and-oneshot-jobs.md)
> — este é o **job piloto** do padrão. **Size:** M.

## Problema

Contrato `Active` com vigência `Fixed` encerrada permanece `Active` **indefinidamente** — a transição
`Contract.expire` existe (`src/modules/contracts/domain/contract/contract.ts:239`) mas só é disparada manualmente
(`POST /contracts/:id/end {Expire}`). Não há sweep/scheduler. Caso real: **CT 0776/2026**. Status incorreto → glosa.

## Decisão da P.O. (negócio)

- **Automático é mandatório** (compliance — o usuário esquece e gera glosa).
- **Vigência inclusiva → D+1**: o último dia conta inteiro; vira `Expired` a partir da **zero hora do dia seguinte**, na timezone do negócio (**America/Sao_Paulo**).
- **Distrato (`Terminate`)** é caminho próprio (imediato) — **fora deste escopo**.

## Arquitetura (ADR-0041): job one-shot, NÃO `setInterval`

O sweep é um **processo one-shot** disparado por **cron externo** (em `ERP-INFRA`): conecta → expira em lote (1 transação) → fecha o pool → `exit 0`. **Não** é `setInterval` long-running, **não** vive no loop do outbox worker.

## Escopo (o que muda em `src/`)

1. **Domínio — endurecer a guarda D+1** (`contract.ts:250-253`): hoje rejeita só quando `at < end` (expira em
   `at >= end`); passa a rejeitar quando **`at <= end`** (expira só quando `at > end`). Slug inalterado
   `contract-cannot-expire-yet`. "O último dia conta" é invariante de negócio → vive no domínio (regra única).
2. **Persistência — `findExpirable(cutoff, limit)`**: novo método no port `ContractRepository`
   (`domain/contract/repository.ts`) + adapter Drizzle. Query: `status='Active' AND current_period_kind='Fixed'
   AND current_period_end < :cutoff`, com **`FOR UPDATE SKIP LOCKED`** + `LIMIT :batch`.
3. **Application — lógica pura `runSweep(deps, config)`**: para cada elegível, `Contract.expire(active, today)` +
   `repo.save(contract, [event])` (estado + `ContractEnded{kind:Expired}` no outbox, **mesma transação** — ADR-0015).
   Recebe `Clock` port (testável). Retorna `SweepResult = { expired, skipped, runAt }`.
4. **Persistência — índice composto** `(status, current_period_kind, current_period_end)` (igualdades antes do
   range — Refman 8.4 §10.2.1.2), via `pnpm run db:generate`. O `ctr_contracts_status_idx` monocolunar deixa o resto residual.
5. **Job one-shot** em `src/jobs/contracts/sweeper/` (padrão ADR-0041):
   - `run.ts` — entrypoint: `readJobConfig(env)` → abre MySQL → `withNewCorrelation(runSweep)` → fecha pool → `process.exitCode`. **Sem** `AbortController`/SIGTERM listener (one-shot; SIGTERM = rollback + refaz no próximo disparo).
   - `config.ts` — `readJobConfig(env): Result` (`CONTRACTS_DATABASE_URL`, `SWEEP_BATCH_SIZE`, `SWEEP_TZ=America/Sao_Paulo`).
   - `sweeper.ts` — `runSweep` (lógica pura, item 3).
   - Script `package.json`: `job:contracts:sweep` → `node src/jobs/contracts/sweeper/run.ts`.
6. **Timezone**: o cutoff D+1 = "hoje em `America/Sao_Paulo`" (não `today()` UTC cru — 3h de drift expiraria cedo). Calculado no job a partir do `Clock`.
7. **Coordenação multi-instância** (ADR-0041): **documentada, não implementada** — single-instance hoje (o cron garante 1×). Quando chegar: `GET_LOCK('contracts:auto-expire:<data>')` ou `UNIQUE(job_name, run_date)`. Sem Redis.

## Fora de escopo (deste ticket)

- **Infra do cron** (systemd timer / `ofelia` no Compose, 00:05 `America/Sao_Paulo`) → **nota/issue separada em `ERP-INFRA`** (não é código de `src/`).
- Consumidor de `ContractEnded{kind:Expired}` (não há hoje; emissão é consistência preventiva — ADR-0015).
- Distrato; rota HTTP de disparo manual (o `/end {Expire}` já existe).

## Critérios de aceite (issue #39)

- **CA1** — Dado `ActiveContract` Fixed com fim ontem, Quando o job roda após 00h de hoje (SP), Então status vira `Expired` **e** `ContractEnded{kind:Expired}` é emitido no outbox (mesma transação).
- **CA2** — Dado a guarda do domínio, Quando `expire(at)` com `at <= currentPeriod.end`, Então rejeita `contract-cannot-expire-yet`.
- **CA3** — Dado um contrato `Indefinite`, Quando o job avalia, Então **não** expira.
- **CA4** — Dado um contrato com aditivo de prazo homologado, Quando avalia, Então usa o `currentPeriod` (com aditivos), não o original.
- **CA5** — Dado mais de uma instância, Quando o job roda concorrente, Então `FOR UPDATE SKIP LOCKED` evita double-expire.

## Plano de testes W0 (RED)

- **Domínio** (`tests/modules/contracts/domain/contract/expire-guard.test.ts`): `expire(active, at=end)` → `err('ContractCannotExpireYet')` (**hoje passa indevidamente** → RED); `at=end+1` → ok; `Indefinite` → erro. **(CA2/CA3/CA4 — guarda D+1 sobre `currentPeriod`)**
- **Sweep** (`tests/jobs/contracts/sweeper/sweeper.test.ts`): `runSweep` com `InMemoryContractRepository` — expira elegíveis + 1 evento cada; `Indefinite`/`Active`-vigente intactos; `SweepResult` coerente; idempotência (2ª passada não reexpira). **(CA1/CA3/CA4)**
- **Repo/integração** (`tests/integration/contracts/find-expirable.mysql.test.ts`, atrás de opt-in `*_INTEGRATION=1`): `findExpirable` filtra corretos; `SKIP LOCKED` não retorna linhas travadas por outra tx. **(CA5)**
