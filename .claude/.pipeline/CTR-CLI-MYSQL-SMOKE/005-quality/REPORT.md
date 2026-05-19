# W3 — QUALITY — CTR-CLI-MYSQL-SMOKE

**Wave:** W3 (QUALITY)
**Data:** 2026-05-16
**Status:** ✅ COMPLETED — todos os gates clean, 10/10 CAs GREEN

## Gates finais

| Gate | Comando | Resultado |
| :--- | :--- | :--- |
| Smoke isolado | `MYSQL_INTEGRATION=1 node --test … contracts.cli.mysql.test.ts` | ✅ 10/10 GREEN em 13.8s |
| Typecheck | `pnpm run typecheck` | ✅ exit 0 |
| Lint | `pnpm run lint` | ✅ exit 0 |
| Format check | `pnpm run format:check` | ✅ All files use Prettier code style |
| Suite default | `pnpm test` | ✅ 433 tests / 422 pass / 0 fail / 11 skipped |
| Suite integration completa | `pnpm test:integration` | ✅ 57/57 pass em 18s |

## Variação na suite integration

Antes (#5): 47/47.
Depois (#7): 57/57 (= 47 anteriores + 10 do smoke novo).

## Estado consolidado do `pnpm test:integration`

```
tests/modules/contracts/adapters/persistence/migrations/mysql.test.ts (14 CAs)
tests/modules/contracts/adapters/persistence/mysql-driver.test.ts     (7 CAs)
tests/modules/contracts/adapters/persistence/drizzle-mysql.test.ts    (26 testes — suítes contratuais + constraints + CLI lifecycle)
tests/cli/contracts.cli.mysql.test.ts                                 (10 CAs)
                                                                       ────
                                                                       57 tests
```

**Cobertura completa da pirâmide de tests do módulo Contratos contra MySQL real:**

```
                  ┌──────────────────────────┐
                  │  CLI E2E smoke (10 CAs)  │  ← ticket #7
                  └────────────┬─────────────┘
                               │
                  ┌────────────┴─────────────┐
                  │  Repo level (26 testes)  │  ← ticket #4
                  └────────────┬─────────────┘
                               │
                  ┌────────────┴─────────────┐
                  │  Driver level (7 CAs)    │  ← ticket #4
                  └────────────┬─────────────┘
                               │
                  ┌────────────┴─────────────┐
                  │  Migration (14 CAs)      │  ← ticket #3
                  └────────────┬─────────────┘
                               │
                  ┌────────────┴─────────────┐
                  │  Schema (14 CAs default) │  ← ticket #2
                  └──────────────────────────┘
```

## Estado da sequência ADR-0020

| # | Ticket | Status |
| :-: | :--- | :--: |
| 1 | CTR-DB-COMPOSE-MYSQL | ✅ |
| 2 | CTR-DB-SCHEMA-MYSQL-CTR-PREFIX | ✅ |
| 3 | CTR-DB-MIGRATION-MYSQL | ✅ |
| 4 | CTR-DB-DRIVER-MYSQL | ✅ |
| 5 | CTR-CLEANUP-SQLITE | ✅ |
| 6 | CTR-DOCKERFILE-MYSQL (auditoria Docker) | ✅ (fora de pipeline formal) |
| 7 | CTR-CLI-MYSQL-SMOKE | ✅ (este ticket) |
| 8 | CTR-DOCS-UPDATE-FOR-ADR-0020 | ⬜ próximo |

## Conteúdo do commit semântico sugerido

```
test(contracts/cli): smoke E2E real contra MySQL via Docker compose

- tests/cli/contracts.cli.mysql.test.ts (10 CAs)
- package.json: test:integration glob ampliado com o novo arquivo
- Cobre 6 subcomandos da REGISTRY (criar/listar/mostrar/aditivo/anexar/homologar)
- Fluxo end-to-end: criar → aditivo Addition → anexar → homologar → mostrar
  (currentValue: 100k → 105k)
- Persistência cross-invocation comprovada (2 processos Node, 2ª vê o 1º)
- UNIQUE sequential_number em runtime (CA-8)
- RN-12 (homologação sem documento) em runtime (CA-9)
- Boundary de erro do driver: bad credentials → exit 74 (CA-10)
- Padrão `if (integrationEnabled())` herdado do #4; sem `t.skip` ruidoso
- Reuso do runCli helper; consistência com contracts.cli.test.ts (memory)

Pipeline: W0→W1→W2 (APPROVED self-review)→W3
Gates: typecheck + lint + format ✅; pnpm test 422/0/11; pnpm test:integration 57/57

Closes ticket CTR-CLI-MYSQL-SMOKE (#7 da sequência ADR-0020).
```

## Próximo ticket

**`CTR-DOCS-UPDATE-FOR-ADR-0020` (#8)**: ÚLTIMO da sequência. Varredura de CLAUDE.md, SKILLs (16+), ADR-0018 (banner de superseded), handbook se relevante. Atualizar referências a:
- `--driver sqlite` → `--driver mysql` (ou só `memory`)
- `drizzle.mysql.config.ts` → `drizzle.config.ts`
- `db:generate:mysql` → `db:generate`
- ADR-0018 referências → ADR-0020
- Remover menções a `better-sqlite3` / mappers SQLite legados
