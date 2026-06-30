# 000 — Request CLI-RETIRE-EMBEDDED

> Arrancar a **CLI embutida** do core-api (decisão do Gabriel, 2026-06-10), executando a remoção
> faseada já autorizada pelo **ADR-0037** (HTTP-first; "remoção futura de `src/modules/*/cli/` e
> scripts `cli:*` é refactor sem mudança de comportamento de negócio"). Size L.

## Achado crítico (pré-execução)

A CLI não era só a UX da P.O. — estava acoplada a infra/deploy:
- **Dockerfile ENTRYPOINT** = `contracts/cli/main.ts` (legado; `src/server.ts` é o entrypoint HTTP real).
- **Runner do worker do outbox** (`cli/commands/run-outbox-worker.ts`, ADR-0015) é o ÚNICO trigger do
  worker (loop em `worker/outbox-worker.ts`, fora da CLI).

## Decisões (aval do Gabriel)

- **D1 — Worker:** manter, mas como worker DE VERDADE — extrair para entrypoint standalone
  `src/modules/contracts/worker/run.ts` (+ `worker/config.ts` puro para parsing de env), **zero
  dependência de `cli/`**. Lê config de ENV (`CONTRACTS_DATABASE_URL` + `OUTBOX_*`). Wira
  `openMysql` + `createDrizzleOutboxRepository` + `ClockReal` + `LoggerEventDelivery`; SIGTERM/SIGINT →
  AbortController; shutdown fecha o pool. Script `pnpm run worker:outbox`.
- **D2 — Docker:** `Dockerfile` ENTRYPOINT → `node src/server.ts` (HTTP, borda primária ADR-0037);
  remove `CMD listar-contratos`. `compose.yaml` serviço `app` (profile `app`, hoje roda
  `listar-contratos`) → ajustado/removido.
- **D3 — Import ETL:** comando CLI `importar-contratos` sai com a CLI; use case `importContracts` +
  parser de domínio permanecem em `application/` para futura rota HTTP. Sem trigger de import até lá.

## Remoção (footprint, sem reverse-deps fora de cli/)

- `src/modules/contracts/cli/` + `src/modules/financial/cli/` (dirs inteiros) — exceto a lógica
  extraída do worker (D1).
- `tests/cli/` + `tests/modules/contracts/cli/` + `tests/modules/financial/cli/`.
  **NÃO tocar** `tests/pipeline/state-cli.test.ts` (é o CLI do pipeline, `scripts/pipeline/`).
- `package.json`: scripts `cli:contracts`, `cli:financial` (+ adicionar `worker:outbox`).
- `AGENTS.md` (exemplos `cli:contracts`), `.worktreeinclude` (`cli-state.json`).

## Invariante (ADR-0037 §5)

Domínio e application **intactos** — a CLI é adapter de entrada (driving). A remoção não toca
`domain/`, `application/use-cases/`, `adapters/persistence/`, `adapters/http/`, nem o loop do worker.

## Critérios de Aceitação

1. `src/modules/*/cli/` removido; `pnpm test` + `typecheck` + `lint` + `format` verdes.
2. Worker do outbox roda via novo entrypoint standalone (`worker:outbox`), sem `cli/`; integração verde.
3. Docker ENTRYPOINT = HTTP server; imagem buildável; compose coerente.
4. Nenhum import órfão de `cli/`; domínio/application/persistência/HTTP inalterados.

## Fechamento

W1 (cirurgia) → W2 (review: nodejs-runtime-expert no worker + clean-code-reviewer no diff) → W3
(typecheck/format/lint/test + integração + build da imagem) → close. Atualizar ADR-0037? Não — este
ticket é a execução da remoção que o ADR já previu; registrar no CHANGELOG.
