# W3 — Gate de qualidade

**Agente:** ts-quality-checker
**Resultado:** **ALL-GREEN** ✅

## Comandos

| Comando | Resultado |
| --- | --- |
| `pnpm run typecheck` | ✅ RC=0 |
| `pnpm run format:check` | ✅ RC=0 — all files use Prettier style |
| `pnpm run lint` | ✅ RC=0 |
| `pnpm test` (full) | ✅ **1207 tests, 1191 pass, 0 fail, 16 skipped** (+3 do novo arquivo vs baseline 1204) |
| `pnpm run test:integration` (MySQL real) | ✅ **82 pass, 0 fail** — container `Healthy` na 1ª tentativa, sem `Permission denied`/`unhealthy` |
| `mysql-compose.test.ts` (prova funcional) | ✅ **21 pass, 0 fail** — CA-3 healthy, CA-5 `readonly_bi` SELECT, CA-6 privilege-denied, CA-16 modo restrito |

## Fechamento dos critérios de aceite

| CA | Como foi fechado |
| --- | --- |
| CA-1 | `tests/infra/integration-script-secret-perms.test.ts` CA-1/CA-1b (GREEN) |
| CA-2 | `mysql-compose.test.ts` CA-5/CA-6 — `readonly_bi` criado e funcional com `0644` |
| CA-3 | `test:integration` subiu `Healthy` na 1ª tentativa pelo script corrigido + `mysql-compose` CA-3 |
| CA-4 | `integration-script-secret-perms.test.ts` CA-4 — varredura de todos os scripts, zero ofensores |
| CA-5 | `pnpm run test:integration` 82/82 verde após a mudança |
| CA-6 | `mysql-compose.test.ts` CA-16 — `0644` = `rw-r--r--`, sem world/group-write; secrets efêmeros, não commitados |

## Higiene de infra

- Nenhum container `core-api-*` remanescente após os runs (`down -v` automático).
- `./secrets/*.txt` removidos; `git status secrets/` limpo.
- Stack do legacy (`erp-prod-*`) intacto durante toda a execução.

**Conclusão:** todos os gates verdes. Ticket pronto para fechar.
