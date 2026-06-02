# W1 — Implementação (CTR-TEST-MYSQL-PORT-CONFIGURABLE)

**Data:** 2026-06-02

Alinhados 9 arquivos de integração de contracts ao padrão já usado por auth/partners/etl:
`...@127.0.0.1:${process.env['MYSQL_PORT'] ?? '3306'}/core` (YAGNI: sem helper novo — segue o padrão inline existente no projeto).

Arquivos: `tests/cli/contracts.cli.mysql.test.ts`, `.../persistence/{drizzle-mysql,mysql-driver,mysql-driver-tuning,contract-repository-paged.integration,outbox-schema}.test.ts`, `.../persistence/repos/{outbox-repository,document-repository}.drizzle.test.ts`, `.../worker/outbox-worker.integration.test.ts`.

**Não tocado:** `parse-driver-flags.test.ts` — literais de teste de parsing da flag `--connection-string`, não conexões reais. Compose e scripts já prontos (`${MYSQL_PORT:-3306}`).
