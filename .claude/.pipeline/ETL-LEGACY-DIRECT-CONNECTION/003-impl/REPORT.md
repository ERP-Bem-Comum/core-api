# W1 — Implementação (GREEN) · ETL-LEGACY-DIRECT-CONNECTION

**Skill/expert:** mysql2-driver-expert (reader por URI) + nodejs-runtime-expert (refactor scripts/env) · **Outcome:** GREEN

## O que mudou (14 arquivos)

### Produção (`scripts/`)
- **`legacy/connect.ts`** — reescrito. Nova função pura `resolveLegacyConnectOptions(raw)` (valida
  `ETL_LEGACY_CONNECTION_STRING` → `err('etl-legacy-connection-string-missing')` se ausente/vazia).
  `connectReadonly()` monta a conexão via `createConnection({ uri, ... })`. Rede privada sem TLS →
  `allowPublicKeyRetrieval: true` (caching_sha2 sem TLS). Removido host/user/senha/porta hardcoded.
- **`legacy/restore.ts`** — **apagado** (`git rm`).
- **`compose.etl.yaml`** — **apagado** (`git rm`).
- **`main.ts` / `contracts/main.ts` / `financial/main.ts`** — removido `withLegacyMysql`, `dumpPath`,
  `--dump`, `DEFAULT_DUMP`, kind `'restore'` e `RestoreError`. `runEtl`/`runContractsEtl`/`runFinancialEtl`
  agora leem o legado direto (`readLegacy*Data()`); assinaturas perdem `dumpPath`. financial mantém
  `--contracts-depara` + `ETL_CEDENTE_DOCUMENT`.
- **`diagnostics/check-duplicates.ts`** — usa `connectReadonly()` (mesma URL). Removido `withLegacyMysql`,
  `EPHEMERAL_ROOT_PW`, `PROD_DUMP`, `LEGACY_DUMP_DB`, `ETL_MYSQL_PORT`. Fail-fast se a URL faltar.
- **`orchestrate.ts`** — comentário atualizado (sem `withLegacyMysql`).

### Testes / CI
- **`tests/etl/helpers/load-fixture.ts`** (NOVO) — `loadLegacyFixture(url, path)`: carrega a fixture
  sintética via mysql2 (`multipleStatements`), recriando o DB (idempotente). Substitui o restore-via-Docker.
- **5 testes de integração** reescritos (`legacy/reader`, `contracts/reader`, `orchestrate`,
  `contracts/writer`, `financial/writer`) — sem `restore.ts`/`execFileSync('docker')`; gate por
  `PARTNERS_ETL_INTEGRATION=1` + `ETL_LEGACY_CONNECTION_STRING`; `before()` carrega a fixture; chamadas
  usam as novas assinaturas (sem `dumpPath`).
- **`scripts/ci/test-integration.ts`** — suites ETL injetam `ETL_LEGACY_CONNECTION_STRING` +
  `ETL_CORE_CONNECTION_STRING` (DBs `legacy`/`core` no MySQL de teste do `compose.yaml`); suite `etl`
  passa a subir `mysql`. Sem referência a `compose.etl.yaml`.

## Gates executados nesta wave

| Gate | Resultado |
| --- | --- |
| Testes W0 (`connect` + `no-docker`) | ✅ GREEN (todos os asserts) |
| `tsc --noEmit` (repo inteiro) | ✅ limpo |
| `prettier --check` (arquivos ETL) | ✅ limpo |
| `eslint` (scripts/etl, runner, tests/etl) | ✅ limpo |
| `pnpm test` completo | ✅ 3410 testes · 3392 pass · **0 fail** · 18 skipped (integração gateada) |

## Cobertura dos CAs

- **CA1** (dry-run sem Docker) — caminho implementado (reader por URI, `withLegacyMysql` removido).
  Execução end-to-end contra um legado real **não verificada aqui** (exige MySQL/rede + sem autorização
  para subir Docker; validar no ambiente).
- **CA2** (fail-fast sem env) — ✅ `resolveLegacyConnectOptions` (W0) + `connectReadonly` lança.
- **CA3** (sem Docker) — ✅ `no-docker.test.ts` GREEN.
- **CA4** (check-duplicates via URL) — ✅ reescrito + coberto por `no-docker.test.ts`.
- **CA5** (integração verde contra MySQL de CI) — código pronto + runner cabeado; **run ao vivo não
  executado** (sem MySQL/Docker nesta sessão). Testes skipam limpo sem a env. Requer o service MySQL do
  CI (`.github/workflows`) — follow-up de infra, fora do código deste ticket.
- **CA6** (W3 green) — antecipado verde nos 4 gates acima; confirmação formal na W3.

## Notas para W2/W3

- `allowPublicKeyRetrieval: true` no reader e no loader é a escolha de "rede privada sem TLS"
  (decisão travada). Trade-off de MITM aceito pela rede fechada — documentado em `connect.ts`.
- O gap de TLS no destino (`ETL_CORE_CONNECTION_STRING`) segue fora de escopo (issue separada).
