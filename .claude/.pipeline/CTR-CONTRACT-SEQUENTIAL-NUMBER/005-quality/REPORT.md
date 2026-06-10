# 005 — W3 (quality gate) — CTR-CONTRACT-SEQUENTIAL-NUMBER

Gate final. Todos os comandos verdes.

| Gate | Comando | Resultado |
| --- | --- | --- |
| Typecheck | `pnpm run typecheck` (`tsc --noEmit`) | ✅ sem erros |
| Format | `pnpm run format:check` (`prettier --check .`) | ✅ All matched files use Prettier code style |
| Lint | `pnpm run lint` (`eslint .`) | ✅ sem erros |
| Test (unit) | `pnpm test` | ✅ **2660 pass / 0 fail / 19 skipped** (2679 total) |
| Integração | `drizzle-mysql.test.ts` (MySQL real via Docker, `MYSQL_INTEGRATION=1`) | ✅ **28/28** (provado no W1; código inalterado desde então — W2 read-only) |

## Observações

- A integração foi executada no W1 contra MySQL 8 real (docker compose up mysql --wait), cobrindo o novo
  `nextSequentialNumber` (CA-2: monotônico por ano + reset) e CA-11 (UNIQUE como rede). Container derrubado
  (`down -v`) e secrets de teste removidos ao fim. W2 não alterou código → resultado permanece válido.
- Suíte completa de `pnpm test` inclui W0 GREEN (`contract-sequential-number.test.ts`, 4/4).

## Conclusão

W3 GREEN. Ticket pronto para `close` + mover `handbook/tickets/todo/` → `done/`.
