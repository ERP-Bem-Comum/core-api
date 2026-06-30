# CTR-SWEEPER-DBURL-FILE — 000 Request

## Escopo

Adicionar suporte a `CONTRACTS_DATABASE_URL_FILE` (Docker secret com a **connection string completa**) ao `readJobConfig` do job `contracts-sweeper`, conforme **decisão CA5** da issue [#50](https://github.com/ERP-Bem-Comum/core-api/issues/50#issuecomment-4714374093).

Restrito a `src/jobs/contracts/sweeper/config.ts` + teste novo `tests/jobs/contracts/sweeper/config.test.ts` (eventual `src/shared/**` para o reader, conforme recomendação do `nodejs-runtime-expert`).

## Fora de escopo (issue #50, tickets separados)

- Serviço `contracts-sweeper` no `compose.yaml` (`profiles: [jobs]`).
- Geração de `secrets/contracts_database_url.txt` no `secrets:setup`.
- Cron/scheduler em ERP-INFRA.

## Contexto / decisão

CA5 (#50): secret file com URL completa + `_FILE` no `readJobConfig`; **wrapper de entrypoint descartado**. Semântica **mutuamente exclusiva** (env direta XOR file) com falha explícita em config ambígua. `readJobConfig` permanece **função pura** (leitura de arquivo injetada como dependência; teste sem FS real).

## Critérios de aceite (testáveis)

- **CA1** — Dado `CONTRACTS_DATABASE_URL` setada e `_FILE` ausente, Quando `readJobConfig`, Então `connectionString` = a env direta (comportamento atual inalterado).
- **CA2** — Dado `CONTRACTS_DATABASE_URL` ausente e `CONTRACTS_DATABASE_URL_FILE` apontando a um arquivo legível, Quando `readJobConfig`, Então `connectionString` = conteúdo do arquivo com trailing whitespace/`\n` removido.
- **CA3** — Dado **ambas** setadas, Então `err('sweeper-ambiguous-connection-config')`.
- **CA4** — Dado **nenhuma** setada, Então `err('sweeper-missing-connection-string')` (inalterado).
- **CA5** — Dado `_FILE` setada mas o arquivo é ilegível (ENOENT/EACCES — reader retorna `err`), Então `err('sweeper-unreadable-connection-file')`.
- **CA6** — Dado `_FILE` setada mas o arquivo é vazio / só whitespace, Então `err('sweeper-unreadable-connection-file')`.
- **CA7** — Dado a URL vinda de `_FILE` + `SWEEP_BATCH_SIZE` setado, Então `batchSize` é respeitado (a fonte da URL é ortogonal ao batch).

## Definition of Done

- Ciclo W0 RED → W1 GREEN (`node:test`).
- Gate **W3**: `pnpm run typecheck` + `format:check` + `lint` + `pnpm test` verdes.
- **Sem regressão** — contagem ≥ baseline (2488).
- `readJobConfig` permanece pura (FS injetado; teste não toca FS real).
