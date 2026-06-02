# W1 — GREEN · PARTNERS-FINANCIER-PERSISTENCE

> Agente: drizzle-schema-author · Resultado: **GREEN** (unit 10/10 + integração 4/4 MySQL real)

## Arquivos

| Arquivo | Conteúdo |
| :--- | :--- |
| `domain/financier/financier.ts` (+`errors.ts`,`types.ts`) | `Financier.rehydrate` + erro `financier-inactive-requires-deactivated-at` + `RehydrateFinancierInput` |
| `adapters/persistence/schemas/mysql.ts` | tabela `par_financiers` (id varchar(36), cnpj UNIQUE, active+deactivated_at, CHECK consistência) |
| `drizzle.config.partners.ts` + `db:generate:partners` | config isolada do módulo |
| `migrations/mysql/0000_parched_songbird.sql` | gerada + ENGINE/charset + `utf8mb4_bin` em id/cnpj (manual) |
| `adapters/persistence/drivers/mysql-driver.ts` | `openPartnersMysql`; `migrationsTable: '__drizzle_migrations_partners'` |
| `adapters/persistence/mappers/financier.mapper.ts` | `financierToInsert`/`financierFromRow` |
| `adapters/persistence/repos/financier-repository.drizzle.ts` | `createDrizzleFinancierStore` (SELECT-then-UPDATE-or-INSERT; ER_DUP_ENTRY→duplicate) |
| `test:integration:partners` (package.json) | suíte gated do repo |

## Decisões de design

- **`migrationsTable` próprio** (`__drizzle_migrations_partners`) — par_*/auth_*/ctr_* dividem o DB `core`; journal isolado evita pular migrations entre módulos (gotcha conhecido).
- **`Financier.rehydrate`** no domínio — reconstrói estado persistido sem emitir evento; o mapper reidrata os VOs (id/cnpj) na borda e delega.
- **Sem ON DUPLICATE KEY** (ADR-0020) — `save` faz SELECT por id → UPDATE (preserva created_at) ou INSERT. CNPJ duplicado detectado por ER_DUP_ENTRY (1062) no índice `par_financiers_cnpj_idx`.
- **Mapper error em leitura = infra** — dado corrompido no banco vira `financier-repo-unavailable` (port fechado), com log stderr.

## Execução

```
# gate default (unit, sem Docker)
ℹ tests 10 · pass 10 · fail 0   (rehydrate + mapper round-trip)

# integração (MYSQL_PORT=3307 pnpm test:integration:partners — MySQL 8.4 real)
✔ save → findById round-trip
✔ findByCnpj acha o persistido
✔ list retorna os persistidos
✔ CNPJ duplicado (id distinto) → financier-cnpj-duplicate
ℹ tests 4 · pass 4 · fail 0
```

Migration aplicada com sucesso pelo migrator contra MySQL real (journal próprio). Porta 3307 para
não colidir com container alheio na 3306 (mesmo padrão da validação auth).
