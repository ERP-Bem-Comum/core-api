# W3 — QUALITY — CTR-DOCS-UPDATE-FOR-ADR-0020

**Wave:** W3 (QUALITY)
**Data:** 2026-05-16
**Status:** ✅ COMPLETED — todos os gates clean, 11/11 CAs GREEN

## Gates

| Gate | Resultado |
| :--- | :--- |
| `tests/cleanup/docs-update.test.ts` | ✅ 11/11 GREEN |
| `pnpm run typecheck` | ✅ exit 0 |
| `pnpm run lint` | ✅ exit 0 |
| `pnpm run format:check` | ✅ |
| `pnpm test` (suite default) | ✅ 444 tests / 433 pass / 0 fail / 11 skipped |
| `pnpm test:integration` | ✅ 57/57 (2ª execução; 1ª teve CA-3 flaky herdado do #7) |

## Variação na suite default

Antes (#7): 433 / 422 pass / 11 skip.
Depois (#8): 444 / 433 pass / 11 skip.

Diff: **+11 tests** = 11 CAs do `docs-update.test.ts`.

## Conteúdo do commit semântico sugerido

```
docs: atualiza CLAUDE.md + handbook + SKILLs para estado pós-ADR-0020

- CLAUDE.md: stack (mysql2), ADRs críticos (ADR-0020 vigente), comandos pnpm,
  topologia por driver (memory|mysql), estrutura de pastas (sem sqlite)
- handbook/architecture/06-persistence-strategy.md: reescrito como guia
  MySQL único + banner ADR-0020 + §8 sobre SELECT-then-UPDATE-or-INSERT
- handbook/architecture/README.md: índice da seção 06 atualizado
- 8 SKILLs com refs operacionais atualizadas:
  - database-engineer (tabela completa de stack de persistência)
  - application-cli-builder (drivers vigentes memory|mysql)
  - tdd-tutor + tdd-strategist (exemplos E2E com cli.mysql.test.ts)
  - database-tutor (schemas/migrations/mappers paths)
  - ports-and-adapters (persistência MySQL única)
  - clean-code-theorist (DRY vs WET pragmático com contexto histórico)
- 16 outras SKILLs intactas (sem refs operacionais a SQLite)
- tests/cleanup/docs-update.test.ts: 11 CAs estruturais validando o cleanup
- Refs históricas (database-theorist, ADR-0018 em comparações) preservadas

Pipeline: W0→W1→W2 (APPROVED self-review)→W3
Gates: typecheck + lint + format ✅; pnpm test 433/0/11; pnpm test:integration 57/57

Closes ticket CTR-DOCS-UPDATE-FOR-ADR-0020 (#8 — ÚLTIMO da sequência ADR-0020).
```

## 🎉 Sequência ADR-0020 ENCERRADA

| # | Ticket | Status |
| :-: | :--- | :--: |
| 1 | CTR-DB-COMPOSE-MYSQL | ✅ |
| 2 | CTR-DB-SCHEMA-MYSQL-CTR-PREFIX | ✅ |
| 3 | CTR-DB-MIGRATION-MYSQL | ✅ |
| 4 | CTR-DB-DRIVER-MYSQL | ✅ |
| 5 | CTR-CLEANUP-SQLITE | ✅ |
| 6 | CTR-DOCKERFILE-MYSQL (auditoria Docker) | ✅ |
| 7 | CTR-CLI-MYSQL-SMOKE | ✅ |
| 8 | CTR-DOCS-UPDATE-FOR-ADR-0020 | ✅ (este) |

Módulo Contratos do `core-api` está **100% MySQL** em:
- **Código** (driver, mappers, repos, schemas, migrations) — #1-#5
- **Infra** (Dockerfile, compose, secrets) — #1, #6
- **Tests** (unit, contract suite, integration, smoke E2E) — #3, #4, #5, #7
- **Docs** (CLAUDE.md, handbook, SKILLs) — #8

## Pós-condições

- CLAUDE.md leitor entende em 30s qual é a stack atual e qual driver usar.
- `06-persistence-strategy.md` é o guia operacional canônico para MySQL.
- 8 SKILLs atualizadas refletem o estado vigente sem mentir sobre o passado.
- ADR-0018 fica preservado como evidência histórica (banner Superseded apontando ADR-0020).
- `tests/cleanup/docs-update.test.ts` serve como guard rail: qualquer futuro dev que re-introduzir refs operacionais a SQLite quebra o build.

## Próximo

**Não há próximo ticket na sequência ADR-0020.** Próximas frentes lógicas (fora desta sequência):
- HTTP daemon — wire de adapter HTTP por cima dos use cases existentes.
- Storage real — wire do port `DocumentStorage` no `attachSignedDocument`.
- Outbox MySQL — entrega exactly-once de eventos cross-módulo (ADR-0015).
- Módulo Financeiro (`fin_*`) — segundo módulo do monolith.
