# Code Review — Ticket PARTNERS-SUPPLIER-PERSISTENCE — Round 1

**Veredito:** APPROVED

**Reviewer:** code-reviewer
**Data:** 2026-06-01T19:15Z
**Escopo revisado:**
- `domain/supplier/{errors,types,supplier}.ts` (rehydrate + RehydrateSupplierInput + erro novo)
- `adapters/persistence/schemas/mysql.ts` (`par_suppliers`)
- `adapters/persistence/mappers/supplier.mapper.ts`
- `adapters/persistence/repos/supplier-repository.drizzle.ts`
- `migrations/mysql/0001_organic_zaladane.sql`
- `package.json` (`test:integration:partners`)
- Confronto com o template aprovado `PARTNERS-FINANCIER-PERSISTENCE`

---

## Verificações do escopo (000-request.md)

| # | Critério | Resultado |
| --- | --- | --- |
| 1 | ADR-0020 (sem JSON/ENUM/ODKU/AUTO_INCREMENT; UUID varchar(36); datetime(3); payment target achatado) | ✅ `service_category` é varchar (não ENUM); payment target em 6 colunas (não JSON); `save` SELECT-then-UPDATE-or-INSERT (sem ODKU); id varchar(36). |
| 2 | ADR-0014 (prefixo `par_*`; reusa `migrationsTable`) | ✅ `par_suppliers`; driver `openPartnersMysql` reusado (mesmo `__drizzle_migrations_partners`); 2ª tabela do módulo. |
| 3 | `Supplier.rehydrate` reaplica invariantes, sem evento | ✅ payment-target-required antes do status; Inactive→`supplier-inactive-requires-deactivated-at`; retorna `Result`, sem evento (`supplier.ts`). |
| 4 | Mapper retorna `Result` (zero throw); reconstrói VOs via `PaymentTarget.create*` | ✅ `bankFromRow`/`pixFromRow` via `createBankAccount`/`createPixKey`; ausência total → `null`; erro VO → `supplier-mapper-invalid-payment-target`. Zero throw. |
| 5 | `save` SELECT-then-UPDATE-or-INSERT; 1062→`supplier-cnpj-duplicate` índice correto | ✅ `isCnpjDupEntry` casa `errno 1062` + `par_suppliers_cnpj_idx` (índice certo, não copiou o do financier). |
| 6 | Migration: ENGINE/charset + `utf8mb4_bin` em id/cnpj + 4 CHECKs | ✅ Header documentado; `COLLATE utf8mb4_bin` em `id` e `cnpj`; `ENGINE=InnoDB ... utf8mb4_unicode_ci`; CHECKs (a) soft-delete, (b) ao-menos-um-destino, (c) bloco bancário, (c) bloco pix; UNIQUE(cnpj). |
| 7 | Imports `#src/`+`.ts`+`import type`; sem cross-módulo proibido | ✅ Só `shared/` + próprio módulo `partners`; `import type` para tipos; namespaces `* as` para chamadas runtime. |

---

## Categorias do checklist

- **A (domínio):** ✅ `rehydrate` sem throw/class/any; `Readonly` via `immutable`; `Result`; erro kebab EN. Return type explícito.
- **C (discriminated union):** ✅ `status` Active/Inactive; rehydrate ramifica sem default penjante (early-return por status).
- **D (adapters):** ✅ repo converte exceção em `Result` (try/catch → err); `Clock.now()` injetado (sem `new Date()`); mapper na borda.
- **E (modular monolith):** ✅ persistência de `partners` consome só seu domínio + `shared/`.
- **F/G:** ✅ ESM `.ts`, `import type`, sem `enum`/`require`; naming EN claro; erros kebab.
- **CHECK logic:** ✅ "ao menos um destino" `(bank_account_bank NOT NULL) OR (pix_key NOT NULL)` é suficiente combinado com os CHECKs de coerência de bloco — se `bank_account_bank` preenchido, bloco bancário completo; idem pix.

---

## Issues encontradas

### 🔵 Sugestão (estilo — não bloqueia)

#### `mappers/supplier.mapper.ts` — `bankFromRow`/`pixFromRow` retornam `{ ok: true, value: null }` literal

O arquivo importa o helper `err` mas, no caminho de sucesso, constrói o `Result` inline
(`{ ok: true, value: null }`) em vez de usar `ok(null)`. Funciona e tipa, mas é menos idiomático que
o resto do código (que usa `ok`/`err`). Trocar por `ok(null)` uniformiza. Não bloqueia.

---

## O que está bom

- **Integração validada de verdade** (9/9 contra MySQL 8.4 real, porta 3307) — e o processo pegou um
  bug de fixture (`?? ` engolindo `null`), corrigido em W1. Persistência não passou em falso-verde.
- Achatamento do payment target com 3 níveis de CHECK (soft-delete, ao-menos-um, coerência de bloco)
  — a invariante de domínio "ao menos um destino" fica garantida também no banco, não só no código.
- `isCnpjDupEntry` corretamente apontando para `par_suppliers_cnpj_idx` (erro comum seria copiar o do
  financier) — atenção ao detalhe.
- Mapper trata corrupção de dado persistido como infra (`reconstruct` → `supplier-repo-unavailable` + log),
  fiel ao template.

---

## Próximo passo

- **APPROVED:** pipeline-maestro avança para W3. A sugestão 🔵 é opcional (pode aplicar no W1 antes do W3 ou deixar registrada).
