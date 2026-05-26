# CTR-NODE-CORRELATION-ALS — Correlation-id via AsyncLocalStorage

## Origem

Auditoria de boas práticas (sessão 2026-05-26), gap Node #4. Não há nenhuma
instância de `AsyncLocalStorage` em `src/`. O outbox worker loga via
`process.stderr.write('[outbox-worker] ...')` sem id rastreável. Quando o módulo
Financeiro crescer e o worker processar eventos de dois módulos no mesmo processo
(e na Fase 2, sob Fastify), a ausência de correlação exige retrofit custoso.
Introduzir o primitive agora custa ~20 linhas (`reference/nodejs/Asynchronous context tracking.md`, Stability 2 - Stable).

## Escopo

1. **Primitive** `src/shared/observability/correlation.ts` (shared kernel, sem dep externa):
   - `runWithCorrelation<T>(correlationId, fn): T` — roda `fn` num escopo ALS.
   - `withNewCorrelation<T>(fn): T` — gera `randomUUID()` e delega.
   - `currentCorrelationId(): string | undefined` — lê o store atual.
2. **Wiring batch-level** no `outbox-worker.ts`: cada iteração de `runLoop`
   roda dentro de `withNewCorrelation`; os logs do worker passam a incluir o id.

## Critérios de aceitação

- CA1: `currentCorrelationId()` retorna `undefined` fora de qualquer escopo.
- CA2: dentro de `runWithCorrelation('abc', fn)`, `currentCorrelationId()` === `'abc'`, inclusive após `await`.
- CA3: `withNewCorrelation` gera id UUID v4 distinto por chamada; escopos aninhados não vazam (o interno sobrepõe, o externo é restaurado na saída).
- CA4: logs do worker incluem o correlation-id da iteração quando há escopo ativo; mantêm o prefixo `[outbox-worker]` quando não há.
- CA5: stats do worker (`delivered/failed/movedToDeadLetter`) inalterados — wiring não muda comportamento.

## Fora de escopo (YAGNI)

- Correlação **per-event** (vale quando houver processamento paralelo de batch).
- Wiring nos `main.ts` da CLI (uma operação por invocação — sem consumidor de log hoje).
- Handlers `uncaughtException`/`unhandledRejection` (gap #3, não solicitado).
- Propagação do correlation-id para dentro do payload do evento / outbox.
