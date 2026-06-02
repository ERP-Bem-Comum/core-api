# W3 — QUALITY GATE · PARTNERS-ETL-WRITE-PORT

**Skill:** ts-quality-checker · **Outcome:** GREEN ✅ · **Data:** 2026-06-02

## Gates

| Gate | Comando | Resultado |
| --- | --- | --- |
| Typecheck | `pnpm run typecheck` | ✅ zero erros |
| Format | `pnpm run format:check` | ✅ "All matched files use Prettier code style!" |
| Lint | `pnpm run lint` | ✅ zero erros |
| Testes (unit + skip dos gated) | `pnpm test` | ✅ **1895 pass · 0 fail · 16 skipped** (1911 tests) |
| Integração partners (home real) | `MYSQL_PORT=3307 pnpm run test:integration:partners` | ✅ **23 pass · 0 fail** (inclui os 4 novos `buildPartnersEtlPort`) |

### Nota — gate de integração (não falso-verde)

`pnpm test` puro skipa o gate partners (sem `MYSQL_INTEGRATION=1`). Rodei `test:integration:partners` no home real (MySQL 8.4 via Docker em **:3307**, pois 3306 = stack `bemcomum-*` do usuário — não tocada). 23/23 pass (todos os repos de partners + os 4 novos). Container/volume derrubados (`down -v`).

## Cobertura dos critérios de aceite (000-request.md)

- [x] `provision` cria com `legacy_id`; 2ª chamada mesmo `legacyId` → `already-exists` e não reescreve (idempotência skip-não-UPDATE), nas 4 entidades.
- [x] `findByLegacyId` retorna a ref migrada (ou null); funciona para `userProfiles` (PK `user_ref`).
- [x] Agregado `Inactive` migra preservando estado (rehydrate no CORE; port não altera).
- [x] `ER_DUP_ENTRY` em `par_<x>_legacy_id_idx` (corrida) → `already-exists`.
- [x] Port montável de connection-string sem Fastify; exportado pela public-api.
- [x] Teste de integração gated cobre idempotência das 4 entidades + `findByLegacyId`; adicionado a `test:integration:partners`.
- [x] W3 verde: typecheck + format + lint + test.

## Conclusão

**GREEN.** Todos os gates verdes; 7 CAs cumpridos. Ticket pronto para fechar.
