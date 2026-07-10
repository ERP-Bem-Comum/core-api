# W2 — REVIEW — CORE-WORKER-RUNNER-POOL-REGISTRY

**Skill:** `code-reviewer` · **Round 1** · **Veredito: APPROVED**

## Verificações
- **Fidelidade:** as 6 factories (`specs.ts`) montam os MESMOS adapters/delivery/runLoop dos 6 `run.ts` originais (conferido 1 a 1). Outbox usam o wrapper `runLoop` do módulo + `readWorkerConfig`; projeções/email usam `shared/outbox`; email roda 2 loops com delivery compartilhado + degradação graciosa sem `PARTNERS_DATABASE_URL`.
- **Pool-sharing (núcleo do #407):** cada factory obtém handle via `registry.getOrCreate(url)` → `openXMysqlOnPool`. Como as `*_DATABASE_URL` são a mesma string (core_app@mesmo-rds/core), o registry deduplica → 1 pool/grupo. **Provado empiricamente no x99 (CA-9)**.
- **Isolamento/shutdown:** factories não registram SIGTERM nem fecham handle (registry é dono; `close` no-op); passam `abortSignal: signal`. O `run.ts` cuida do sinal + `closeAll`. `runWorkerGroup` isola via `allSettled`.
- **Borda:** `Result` em toda factory; erros como string humana; sem `throw` cruzando; sem `process.exit`/`process.env` nas factories (env por parâmetro — testável).
- **Tipos:** typecheck verde; `openXMysqlOnPool` só nos 4 módulos usados por workers (YAGNI).

## Achado (não-bloqueante)
- **Duplicação temporária:** o bootstrap vive em 2 lugares (os 6 `run.ts` standalone + as factories). É intencional na Fatia 1 (os standalone seguem funcionando; zero regressão). A **Fatia 2** (deploy) troca o compose para o runner e pode então reduzir os `run.ts` standalone a delegação. Registrado no REPORT do W1.

**Veredito: APPROVED.**
