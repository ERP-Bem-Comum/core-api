# FIN-CEDENTE-ACCOUNT-PERSIST — escopo

**Feature:** 016 (D-CEDENTE) · **Branch:** `016-fin-remessa-cnab240` · **Size:** M · **Épico:** #64

> Persistência da conta-cedente (sobre a fundação `FIN-CEDENTE-ACCOUNT`). Destrava `debit_account_ref`
> e a query de status (FR-015) para a conciliação (017) e a remessa (016).

## Em escopo

1. **Mapper** `adapters/persistence/mappers/cedente-account.mapper.ts` — `toRow(account): NewCedenteAccountRow`
   + `toDomain(row): Result<CedenteAccount, CedenteAccountMapperError>` (valida `status` ∈ {Active,Closed},
   rehidrata `id`). **Puro** — alvo do W0 RED (roda no gate).
2. **Schema** `fin_cedente_accounts` em `schemas/mysql.ts` (id varchar(36) PK; `bank_code`/`agency`/
   `account_number`/`account_digit`/`convenio`/`document` varchar; `status` varchar(8) CHECK ∈ {Active,Closed};
   `next_nsa` int CHECK ≥ 1). Exporta `CedenteAccountRow`/`NewCedenteAccountRow`.
3. **Coluna** `fin_documents.debit_account_ref` varchar(36) NULL (ref lógica — sem FK física, ADR-0014).
4. **Migration `0004`** via `pnpm run db:generate` (⚠️ atenção ao incidente `repos-dir-moved` — se algum
   dir for movido, `git checkout HEAD -- <dir>`). CHARSET/COLLATE à mão.
5. **Adapter Drizzle** `repos/cedente-account-store.drizzle.ts` (implementa `CedenteAccountStore` em MySQL,
   SELECT-then-UPDATE-or-INSERT). Testado por **`test:integration`** (Docker) — **fora** do gate W3.

## Fora de escopo

Alocação/incremento de NSA (lógica de remessa — 016). Geração CNAB/ACL/storage (016). Use-cases/HTTP.

## Critérios de aceite

- **CA1 (mapper round-trip)**: `toDomain(rowOf(account))` reconstrói os campos da conta (id/bankCode/status/nextNsa).
- **CA2 (mapper status inválido)**: row com `status='Bogus'` → `toDomain` retorna `err`.
- **CA3 (mapper id inválido)**: row com `id` não-UUID → `toDomain` retorna `err`.
- **CA4 (toRow)**: `toRow(account)` produz a row com os campos do schema (snake↔camel via Drizzle).
- **CA5 (integração, Docker — `test:integration`)**: adapter Drizzle `save`+`findById` round-trip em MySQL real;
  `findById` inexistente → `ok(null)`. (Roda fora do gate W3.)

## Definition of Done

W0 RED (mapper) → W1 GREEN (mapper + schema + migration `0004` + `debit_account_ref` + adapter Drizzle) →
W2 review → W3 gate verde (`typecheck`+`format`+`lint`+`test` — **sem** Docker). Migration gerada por
`db:generate` (nunca à mão). `test:integration` (Docker) rodado antes do merge. Idioma EN (C1); valores EN.
