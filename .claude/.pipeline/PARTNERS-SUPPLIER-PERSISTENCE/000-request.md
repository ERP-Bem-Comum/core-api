# PARTNERS-SUPPLIER-PERSISTENCE — Adapter Drizzle + tabela `par_suppliers`

> **Size:** L · **ADR:** [ADR-0031](../../../handbook/architecture/adr/0031-partners-registry-module.md) · ADR-0020/0014/0013 · **Épico:** `.claude/.planning/EPIC-PARTNERS-CADASTROS.md` (Fase 2)
> **Espelha:** `PARTNERS-FINANCIER-PERSISTENCE` (template já entregue). Reusa `drizzle.config.partners.ts`, driver `openPartnersMysql` e `migrationsTable __drizzle_migrations_partners` já existentes — **2ª tabela** do módulo `partners`, mesmo DB `core`.

## Contexto

Fecha o agregado `Supplier`: persistência MySQL real. Diferença-chave vs. Financier — o **destino de
pagamento embedded** (`bankAccount: BankAccount | null` / `pixKey: PixKey | null`) é **achatado em
colunas** (`bank_account_*` / `pix_*`), e a invariante de domínio "ao menos um destino" vira CHECK.

## Escopo

1. **Reidratação no domínio** — `Supplier.rehydrate(input)` em `supplier.ts` (necessária ao mapper;
   reconstrói `Active`/`Inactive` a partir de dados persistidos, **sem emitir evento**, reusando
   `PaymentTarget.createBankAccount`/`createPixKey` para revalidar e a invariante "ao menos um destino").
2. **Schema** `adapters/persistence/schemas/mysql.ts` — adicionar `par_suppliers` (ADR-0020):
   - `id` varchar(36) PK, `cnpj` varchar(14) UNIQUE, `name`/`email`/`corporate_name`/`fantasy_name` varchar,
     `service_category` varchar(50) (literal legado, **não ENUM**), `active` boolean, `deactivated_at` datetime(3) nullable, timestamps.
   - **Payment target achatado (nullable):** `bank_account_bank`, `bank_account_agency`,
     `bank_account_number`, `bank_account_check_digit`; `pix_key_type`, `pix_key`.
   - CHECKs: (a) `active`↔`deactivated_at` (como financier); (b) **ao menos um destino** —
     `bank_account_bank IS NOT NULL OR pix_key IS NOT NULL`; (c) coerência do bloco bancário
     (os 4 `bank_account_*` juntos NULL ou juntos preenchidos) e do bloco pix (`pix_key_type`↔`pix_key`).
   - UNIQUE `par_suppliers_cnpj_idx`.
3. **Migration** `0001_*.sql` via `pnpm db:generate:partners` + edição manual (ENGINE/charset;
   `utf8mb4_bin` em `id`/`cnpj`).
4. **Mapper** `adapters/persistence/mappers/supplier.mapper.ts` — `supplierToInsert(s, now)` /
   `supplierFromRow(row): Result<Supplier, ...>` (row→domínio via `rehydrate`; rejeita estado inválido).
5. **Repo Drizzle** `adapters/persistence/repos/supplier-repository.drizzle.ts` — implementa
   `SupplierRepository` (findById/findByCnpj/list/save). `save` = SELECT-then-UPDATE-or-INSERT
   (ADR-0020 sem ODKU); UNIQUE cnpj → `supplier-cnpj-duplicate` (ER_DUP_ENTRY 1062). Transient →
   `supplier-repo-unavailable`.
6. **Testes**: mapper round-trip unit (gate default) + repo integração (`MYSQL_INTEGRATION=1`, gated Docker).
7. Estender `test:integration:partners` para incluir a suíte do supplier repo.

## Fora de escopo

- CLI, public-api, eventos/outbox de Supplier; agregado collaborator; export CSV (já entregue).

## Critérios de aceite

- [ ] `Supplier.rehydrate` reconstrói Active e Inactive; Active+bank, Active+pix, e incoerências
      (Inactive sem `deactivatedAt`; zero destino de pagamento) → erro.
- [ ] Mapper round-trip: `supplierFromRow(supplierToInsert(s, now))` reconstrói o agregado para os 3
      casos (bank, pix, inactive) — unit, gate default.
- [ ] `db:generate:partners` emite `par_suppliers`; migration tem ENGINE/charset + `utf8mb4_bin` em
      `id`/`cnpj` + os CHECKs (a)/(b)/(c).
- [ ] **(Integração, gated)** repo: save→findById; findByCnpj; list; 2º save com mesmo cnpj (id distinto)
      → `supplier-cnpj-duplicate`; round-trip de bank e pix preserva os campos achatados.
- [ ] Gate default (W3): typecheck + lint + format + `pnpm test` verdes (mapper unit roda; integração skipped sem `MYSQL_INTEGRATION`).
- [ ] `test:integration:partners` cobre supplier (invocação manual — gap conhecido).

## Notas de disciplina

- ADR-0020: sem ENUM/JSON/ODKU/AUTO_INCREMENT; UUID varchar(36); datetime(3) UTC; `service_category` é varchar.
- ADR-0014: prefixo `par_*`, reusa `migrationsTable __drizzle_migrations_partners`. Boundary: zero throw cruza a borda (Result).
- ⚠️ Repo Drizzle só valida sob integração (Docker); W3 default NÃO cobre o repo real (gap documentado).
- Gate local: usar `MYSQL_PORT=3307` OU `docker stop bemcomum-mysql` (com autorização) para evitar conflito de porta da suíte de infra.
