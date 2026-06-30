# W2 — Code Review (FIN-SUPPLIER-VIEW-SCHEMA)

**Veredito:** ✅ APPROVED · **Disciplina:** drizzle-orm-expert (read-only) · **Round:** 1/3
**Blocker:** 0 · **Major:** 0 · **Minor:** 1 (aceito)

## Escopo

Read-model `fin_supplier_view` (US2 #47): tipo `SupplierView`, port `SupplierViewStore`, adapters
in-memory + Drizzle (upsert com guard de recência), schema + migration, suíte de contrato + integração.

## Conformidade

- **Idempotência + ordem (FR-003).** O upsert `INSERT ... ON DUPLICATE KEY UPDATE` com
  `if(values(occurred_at) >= occurred_at, ...)` por coluna é **atômico** (sem SELECT-then-UPDATE) e
  seguro entre consumers concorrentes (multi-instância futura). **Validado contra MySQL real**: o
  caso "mais antigo NÃO regride" passa na integração. Alinha ADR-0022 (read-model por projeção
  idempotente) e o contrato ADR-0043. ✅
- **ADR-0020.** `ON DUPLICATE KEY UPDATE` é permitido; sem JSON/ENUM/trigger; `document` varchar
  (alfanumérico — ADR-0044). ✅
- **ADR-0014 (isolamento).** `fin_supplier_view` no prefixo `fin_*`, **sem FK física** para o
  `partners` (`supplier_ref` é referência lógica). ✅
- **Schema/migration.** PK varchar(36) sem AUTO_INCREMENT; CHARSET/COLLATE manual (PK `utf8mb4_bin`,
  tabela `utf8mb4_unicode_ci`) conforme o procedimento do módulo. ✅
- **Boundary (adapters.md).** try/catch → `Result`; nenhum `Error` cruza a borda. ✅
- **Suíte de contrato.** `nextRef` por caso garante isolamento no backend compartilhado (MySQL). ✅

## Minor (aceito)

1. **`VALUES()` no `ON DUPLICATE KEY UPDATE`** está deprecated desde o MySQL 8.0.20 (a forma moderna
   é o alias de linha `INSERT ... AS new`). Funciona no MySQL 8.4 (a integração comprova) e o Drizzle
   0.45 `onDuplicateKeyUpdate` não expõe o alias de forma direta. Aceito; follow-up quando o Drizzle
   suportar alias ou se o warning incomodar.

## Verificação

```
pnpm run typecheck / lint → verde
in-memory contract → 5/5
test:integration:financial → 19/19 (inclui SupplierViewStore drizzle: guard de recência)
```
