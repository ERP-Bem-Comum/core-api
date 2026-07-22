# W0 — Testes RED · ETL-LEGACY-DIRECT-CONNECTION

**Skill:** tdd-strategist · **Outcome:** RED · **Runner:** `node:test` + `--experimental-strip-types` (sem Docker)

## Arquivos criados

- `tests/etl/legacy/connect.test.ts` — unitário, função pura `resolveLegacyConnectOptions`.
- `tests/etl/legacy/no-docker.test.ts` — estrutural (lê source como texto), CA3.

## Comando

```bash
node --test --experimental-strip-types --enable-source-maps --no-warnings \
  tests/etl/legacy/connect.test.ts tests/etl/legacy/no-docker.test.ts
```

## Resultado RED (por inexistência da API — fail-first correto)

| Teste | Falha esperada (RED) | Vira GREEN no W1 quando… |
| --- | --- | --- |
| `connect` — env ausente → `etl-legacy-connection-string-missing` | `SyntaxError: does not provide an export named 'resolveLegacyConnectOptions'` | `connect.ts` exportar a função pura |
| `connect` — vazia/whitespace → err missing | idem (import falha) | idem |
| `connect` — URL válida → ok com uri + flags (`multipleStatements:false`, `dateStrings:false`, `timezone:'Z'`, `decimalNumbers:false`) | idem (import falha) | idem |
| `no-docker` — `restore.ts` removido | `true !== false` (arquivo ainda existe) | apagar `scripts/etl/legacy/restore.ts` |
| `no-docker` — `compose.etl.yaml` removido | `true !== false` (ainda existe) | apagar `compose.etl.yaml` |
| `no-docker` — entrypoints sem `withLegacyMysql`/`--dump` | `scripts/etl/main.ts ainda usa withLegacyMysql` | remover a costura dos 3 mains |
| `no-docker` — `connect.ts` sem `restore.ts`, com `ETL_LEGACY_CONNECTION_STRING` | `connect.ts ainda importa restore.ts` | reescrever o reader |
| `no-docker` — `check-duplicates.ts` usa a URL do legado | `não usa ETL_LEGACY_CONNECTION_STRING` | migrar o diagnostics |

Total: `connect.test.ts` falha no link (1 arquivo, cobre 3 casos); `no-docker.test.ts` 5 asserts RED.

## Cobertura dos CAs (000-request.md)

- **CA2** (fail-fast sem env) → `connect.test.ts`.
- **CA3** (sem Docker: restore/compose removidos, sem `withLegacyMysql`) → `no-docker.test.ts`.
- **CA4** (check-duplicates via URL) → `no-docker.test.ts`.
- **CA1/CA5** (dry-run e suíte de integração contra MySQL de CI, sem Docker) → **diferidos p/ W1**: exigem MySQL real; entram no runner de integração (`scripts/ci/test-integration.ts`) atrás do opt-in, não no `pnpm test` puro.

## Observações para o W1

- **`caching_sha2_password` sem TLS**: rede privada sem TLS (decisão travada). Se o user do legado usar auth default, avaliar `allowPublicKeyRetrieval: true` na conexão **ou** exigir `mysql_native_password`. O teste unitário NÃO amarra essa flag (asserts campo a campo, não `deepEqual`) — W1 tem liberdade.
- Ao apagar `restore.ts`, ajustar todos os importadores: `connect.ts`, os 3 mains, `reader.ts`, `history-archive.ts`, `check-duplicates.ts` + o runner `scripts/ci/test-integration.ts`.
