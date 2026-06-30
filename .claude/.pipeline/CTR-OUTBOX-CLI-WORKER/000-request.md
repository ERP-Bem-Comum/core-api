# 000 — Request CTR-OUTBOX-CLI-WORKER

> **Ticket #6/7 da série Outbox. Size: S.** Expõe `runLoop` (do #5) como subcomando CLI `run-outbox-worker`. Graceful shutdown SIGTERM via AbortController.
> Depende de `CTR-OUTBOX-WORKER` ✅ (#5).
> 23º ticket Opção B.

## Decisão aplicável

- **D4** ✅ Worker como **subcomando da CLI** (`pnpm cli:contracts run-outbox-worker [...]`). Reusa driver/context. Vira systemd service em prod.

## Escopo

### 1. Novo subcomando `run-outbox-worker`

```
src/modules/contracts/cli/commands/run-outbox-worker.ts
```

Assinatura SubCommand (cf. `cli/registry.ts`):

```ts
export const descricao = 'Executa o worker do outbox em loop até SIGTERM/SIGINT.';
export const help = `...usage...`;

export const run = async (ctx: CliContext, argv: readonly string[]): Promise<number> => {
  // 1. Parse flags (batch-size, max-attempts, poll-ms, idle-sleep-ms)
  // 2. Validar driver — só `mysql` faz sentido (memory não persiste outbox real)
  // 3. Construir WorkerDeps com:
  //    - outbox: ctx.outbox  (Drizzle adapter expandido)
  //    - delivery: LoggerEventDelivery(consumerId='cli-logger')
  //    - clock: ctx.clock
  //    - abortSignal: AbortController + SIGTERM/SIGINT handlers
  // 4. process.stdout.write banner inicial (config + 'press Ctrl+C to stop')
  // 5. await runLoop(deps, config)
  // 6. process.stdout.write final stats
  // 7. Cleanup: pool.end() — driver mysql expõe disposer
  // 8. Return 0 (clean) or 1 (erro crítico)
};
```

### 2. Flags suportadas

| Flag | Default | Descrição |
| :--- | :--- | :--- |
| `--batch-size N` | 10 | Eventos por iteração |
| `--max-attempts N` | 5 | Antes de DLQ |
| `--poll-ms N` | 100 | Intervalo entre rounds com trabalho |
| `--idle-sleep-ms N` | 500 | Intervalo quando outbox vazia |
| `--consumer-id ID` | `cli-logger-default` | ID do consumer (idempotência) |
| `--log-file PATH` | (vazio) | Se presente, LoggerEventDelivery também escreve em arquivo |

Reusa `parse-flags.ts` ou `parse-driver-flags.ts` existentes.

### 3. Driver mysql expande `CliContext.outbox`

Hoje (após #4) `mysql.ts` instancia o outbox repo via `createDrizzleOutboxRepository`. Confirmar que **expõe os 4 helpers** (`findPendingForUpdate`, `markProcessed`, `markFailed`, `moveToDeadLetter`) ao `CliContext` — necessários pelo worker.

Se hoje `CliContext.outbox` é apenas `OutboxPort` (`append`), expandir o tipo:

```ts
// cli/context.ts
export type CliContext = Readonly<{
  // ... existentes
  outbox: OutboxPort & WorkerOutboxOps;  // helpers para o worker
  outboxCleanup?: () => Promise<void>;   // para fechar pool no shutdown
}>;
```

Driver `memory.ts` rejeita o subcomando (erro: "outbox real exige driver mysql").

### 4. Graceful shutdown SIGTERM/SIGINT

```ts
const controller = new AbortController();
const shutdown = () => { controller.abort(); };
process.once('SIGTERM', shutdown);
process.once('SIGINT', shutdown);

try {
  const stats = await runLoop({ ...deps, abortSignal: controller.signal }, config);
  process.stdout.write(`Worker shutdown — stats: ${JSON.stringify(stats)}\n`);
  return 0;
} catch (cause) {
  process.stderr.write(`Worker fatal: ${String(cause)}\n`);
  return 1;
} finally {
  if (ctx.outboxCleanup) await ctx.outboxCleanup();
}
```

### 5. Registro no `registry.ts`

```ts
import * as runOutboxWorker from './commands/run-outbox-worker.ts';

export const REGISTRY = {
  // ... existentes
  'run-outbox-worker': runOutboxWorker,
};
```

### 6. Tests

```
tests/modules/contracts/cli/commands/run-outbox-worker.test.ts
```

Cenários:
- **CA-T1:** `run` chamado com `driver=memory` retorna exit 1 + mensagem clara.
- **CA-T2:** Flags inválidas (`--batch-size abc`) → exit 64 (EX_USAGE).
- **CA-T3:** Smoke: chama com AbortController pré-abortado → runLoop retorna imediatamente, exit 0.
- **CA-T4:** Flag `--help` ou `-h` mostra help e exit 0.

Integration test (opcional — talvez fora de escopo para esse ticket S):
- Spawn child process `pnpm cli:contracts run-outbox-worker --driver mysql --batch-size 5`, aguardar 2 segundos, enviar SIGTERM, verificar exit 0 + stats no stdout.

### 7. Documentação operacional

Atualizar `CLAUDE.md` (seção "Comandos") com exemplo:

```bash
# Worker em foreground (dev/test)
pnpm cli:contracts run-outbox-worker --driver mysql --connection-string 'mysql://...'

# Worker como systemd service (prod)
# Veja handbook/operations/outbox-worker.md (criar nesse ticket — opcional)
```

## Critérios de aceitação

- **CA1** — `src/modules/contracts/cli/commands/run-outbox-worker.ts` existe e exporta `descricao`, `help`, `run`.
- **CA2** — Registrado em `registry.ts` como `'run-outbox-worker'`.
- **CA3** — Parser de flags com defaults sensatos (cf. §2).
- **CA4** — Driver `memory` rejeita com exit 1 + mensagem clara.
- **CA5** — Driver `mysql` instancia `LoggerEventDelivery` + `runLoop`.
- **CA6** — SIGTERM/SIGINT → AbortController.abort() → runLoop retorna → cleanup do pool.
- **CA7** — `--help` mostra usage + exit 0.
- **CA8** — Tests cobrem 4 cenários CA-T1..T4.
- **CA9** — `CliContext` expandido para incluir helpers do worker no outbox + opcional `outboxCleanup`.
- **CA10** — Gates verdes (typecheck/test/lint/format).

## Não-objetivos

- Métricas Prometheus → futuro.
- Integration test com child process real → opcional (smoke do test unit cobre).
- Documentação systemd unit file → opcional, mais para `handbook/operations/`.
- `public-api/events.ts` → ticket #7.

## Risco / pontos de atenção

1. **`CliContext.outbox` expansão:** hoje pode ser só `OutboxPort` (após #4). Verificar se já tem os 4 helpers ou precisa expandir.
2. **Pool MySQL no shutdown:** worker em loop infinito segura connection do pool. `pool.end()` no finally é crucial.
3. **`LoggerEventDelivery` consumerId:** o tipo de port espera consumerId — usar default `cli-logger-default` ou aceitar via flag `--consumer-id`.
4. **Driver memory:** rejeitar cedo — em-memória não persiste outbox, worker não faz sentido.
5. **Test com SIGTERM** pode ser flaky — usar AbortController explícito + clock fake para determinismo.
