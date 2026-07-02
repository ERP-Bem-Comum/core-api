# ETL-LEGACY-DIRECT-CONNECTION — escopo

## Problema

Os 3 entrypoints do ETL (`scripts/etl/main.ts`, `scripts/etl/contracts/main.ts`,
`scripts/etl/financial/main.ts`) dependem de **Docker**: `withLegacyMysql()`
(`scripts/etl/legacy/restore.ts`) sobe um MySQL efêmero via `docker compose -f
compose.etl.yaml`, restaura um dump `.sql` em tmpfs e só então o reader lê. O reader
(`scripts/etl/legacy/connect.ts`) conecta **hardcoded** em `127.0.0.1:${ETL_MYSQL_PORT}`,
user `etl_ro`, db `legacy`.

No ambiente real (AWS, máquina operadora/bastião apontando para o legado), **a dependência
de Docker é inviável e deve sumir**. A migração passa a ler o legado por conexão de rede.

## Objetivo

O ETL lê o legado por uma connection string (`ETL_LEGACY_CONNECTION_STRING`), **sem Docker
e sem dump no processo**. Para onde a URL aponta — legado vivo, réplica, ou um dump que a
infra restaurou por fora — é decisão operacional; o código é o mesmo nos três casos.

## Decisões travadas (Gabriel, 2026-07-02, em reunião de infra)

1. **Remover Docker/dump de vez (YAGNI).** Sem modo fallback. Um único caminho de leitura.
2. **Rede privada sem TLS.** O legado é acessível em rede privada/VPC; reader conecta sem
   `ssl`. Risco de PII em texto claro assumido pela rede fechada.

## Escopo (o que muda)

- **`scripts/etl/legacy/connect.ts`** — `connectReadonly()` passa a ler
  `ETL_LEGACY_CONNECTION_STRING` (obrigatória) e conectar via `createConnection({ uri })`.
  Mantém `multipleStatements: false`, `dateStrings: false`, `timezone: 'Z'`,
  `decimalNumbers: false`. Ausência da env → erro claro (fail-fast), não default lab.
- **`scripts/etl/main.ts`, `contracts/main.ts`, `financial/main.ts`** — remover
  `withLegacyMysql(dumpPath, fn)`; chamar o reader direto. Remover a flag `--dump` e o
  `DEFAULT_DUMP`.
- **`scripts/etl/legacy/restore.ts`** — **apagar**.
- **`compose.etl.yaml`** — **apagar**.
- **`scripts/etl/diagnostics/check-duplicates.ts`** — passar a usar a mesma
  `ETL_LEGACY_CONNECTION_STRING` (hoje conecta no container via `EPHEMERAL_ROOT_PW`).
  Aposentar `PROD_DUMP`/`LEGACY_DUMP_DB` se não fizerem mais sentido.
- **Testes de integração** — 6 arquivos sobem o container hoje
  (`tests/etl/orchestrate.integration.test.ts`, `tests/etl/legacy/reader.integration.test.ts`,
  `tests/etl/contracts/reader.integration.test.ts` + runner `scripts/ci/test-integration.ts`).
  Migrar para um **MySQL de CI** (service container do GitHub Actions) apontado por
  `ETL_LEGACY_CONNECTION_STRING`, atrás do opt-in de integração existente.

## Fora de escopo

- Suporte a TLS no reader (decisão 2 = rede privada sem TLS). Se mudar, abrir ticket próprio.
- Gap de TLS no **destino** (`ETL_CORE_CONNECTION_STRING`) — issue separada.
- Provisionar rota de rede / credencial read-only no legado — responsabilidade da infra.

## Critérios de aceite

- **CA1** — Com `ETL_LEGACY_CONNECTION_STRING` válida, `node scripts/etl/main.ts --dry-run`
  lê o legado e reconcilia **sem Docker instalado/rodando**.
- **CA2** — Sem `ETL_LEGACY_CONNECTION_STRING`, os 3 entrypoints falham com erro explícito
  (kebab EN, ex.: `etl-legacy-connection-string-missing`), não com default lab.
- **CA3** — `restore.ts` e `compose.etl.yaml` não existem mais; nenhum arquivo importa
  `withLegacyMysql`/`compose.etl` (grep limpo).
- **CA4** — `check-duplicates.ts` roda contra a mesma URL, sem container.
- **CA5** — Suíte de integração do ETL (`pnpm run test:integration:etl*`) verde contra um
  MySQL de CI, sem `docker compose` no caminho.
- **CA6** — W3 verde: `typecheck` + `format:check` + `lint` + `test`.

## Notas / riscos

- **`caching_sha2_password` sem TLS**: se o user do legado (MySQL 8) usar o auth default,
  o mysql2 exige `allowPublicKeyRetrieval: true` na conexão sem TLS (era o motivo do
  `--mysql-native-password=ON` no `compose.etl.yaml`). Decidir na W1: setar a flag no reader
  **ou** exigir que o user do legado use `mysql_native_password`. Documentar no request de infra.
- **PII**: leitura de legado vivo toca dados de produção; garantir credencial **SELECT-only**
  e janela de execução acordada com a infra.
