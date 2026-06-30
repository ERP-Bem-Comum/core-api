# PARTNERS-FINANCIER-PERSISTENCE — Adapter Drizzle + tabela `par_financiers`

> **Size:** L · **ADR:** [ADR-0031](../../../handbook/architecture/adr/0031-partners-registry-module.md) · ADR-0020/0014/0013 · **Épico:** Fase 2

## Contexto

Fecha o agregado `Financier`: persistência MySQL real. **Primeira tabela do módulo `partners`** —
estabelece `drizzle.config.partners.ts` + migration dir + driver + `migrationsTable` dedicado
(`__drizzle_migrations_partners`) para não colidir com contracts/auth no DB `core` compartilhado.

## Escopo

1. **Reidratação no domínio** — `Financier.rehydrate(input)` em `financier.ts` (necessária ao mapper;
   reconstrói `Active`/`Inactive` a partir de dados persistidos, sem emitir evento).
2. **Schema** `adapters/persistence/schemas/mysql.ts` — `par_financiers` (ADR-0020): id varchar(36),
   campos texto, `cnpj` varchar(14) UNIQUE, `active` boolean, `deactivated_at` datetime(3) nullable,
   timestamps; CHECK de consistência `active`↔`deactivated_at`.
3. **`drizzle.config.partners.ts`** + script `db:generate:partners`.
4. **Migration** `0000_*.sql` gerada por drizzle-kit + edição manual (ENGINE/charset; `utf8mb4_bin` em id/cnpj).
5. **Driver** `adapters/persistence/drivers/mysql-driver.ts` — espelha auth; `migrationsTable: '__drizzle_migrations_partners'`.
6. **Mapper** `adapters/persistence/mappers/financier.mapper.ts` — `financierToInsert` / `financierFromRow`.
7. **Repo Drizzle** `adapters/persistence/repos/financier-repository.drizzle.ts` — implementa
   `FinancierRepository` (findById/findByCnpj/list/save). `save` = SELECT-then-UPDATE-or-INSERT
   (ADR-0020 sem ODKU); UNIQUE cnpj → `financier-cnpj-duplicate` (ER_DUP_ENTRY 1062).
8. **Testes**: mapper unit (gate default) + repo integração (`MYSQL_INTEGRATION=1`, gated Docker).
9. Script `test:integration:partners` no package.json.

## Fora de escopo

- CLI, public-api, eventos/outbox de Financier; agregados supplier/collaborator.

## Critérios de aceite

- [ ] `Financier.rehydrate` reconstrói Active e Inactive (com `deactivatedAt`); incoerência (Inactive sem data) → erro.
- [ ] Mapper round-trip: `financierFromRow(financierToInsert(f, now))` reconstrói o agregado (unit, gate default).
- [ ] `drizzle-kit generate --config drizzle.config.partners.ts` emite `par_financiers`; migration tem ENGINE/charset + `utf8mb4_bin` em id/cnpj.
- [ ] **(Integração, gated)** repo: save→findById; findByCnpj; list; segundo save com mesmo cnpj (id distinto) → `financier-cnpj-duplicate`.
- [ ] Gate default (W3): typecheck + lint + format + `pnpm test` verdes (mapper unit roda; integração é skipped sem `MYSQL_INTEGRATION`).
- [ ] `test:integration:partners` documentado (invocação manual — gap conhecido do projeto).

## Notas de disciplina

- ADR-0020: sem ENUM/JSON/ODKU/AUTO_INCREMENT; UUID varchar(36); datetime(3) UTC.
- ADR-0014: prefixo `par_*`, `migrationsTable` próprio. Boundary: zero throw cruza a borda (Result).
- ⚠️ Repo Drizzle só valida sob integração (Docker); W3 default NÃO cobre o repo real (gap documentado).
