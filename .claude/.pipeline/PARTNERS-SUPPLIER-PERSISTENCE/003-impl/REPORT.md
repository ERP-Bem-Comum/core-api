# W1 — Implementação GREEN · PARTNERS-SUPPLIER-PERSISTENCE

> **Outcome:** GREEN (mapper unit + integração real validada) · **Data:** 2026-06-01

## Arquivos

| Arquivo | Mudança |
| --- | --- |
| `domain/supplier/errors.ts` | + `supplier-inactive-requires-deactivated-at` |
| `domain/supplier/types.ts` | + `RehydrateSupplierInput` (VOs já tipados; payment target como `BankAccount\|null`/`PixKey\|null`) |
| `domain/supplier/supplier.ts` | + `Supplier.rehydrate` — reaplica invariantes (destino de pagamento; Inactive exige `deactivatedAt`); sem evento |
| `adapters/persistence/schemas/mysql.ts` | + `par_suppliers` + `SupplierRow`/`NewSupplierRow`; payment target achatado; 4 CHECKs + UNIQUE(cnpj) |
| `adapters/persistence/mappers/supplier.mapper.ts` | `supplierToInsert`/`supplierFromRow`; reconstrói VOs de payment target via `PaymentTarget.create*` na borda |
| `adapters/persistence/repos/supplier-repository.drizzle.ts` | `createDrizzleSupplierStore` (findById/findByCnpj/list/save); SELECT-then-UPDATE-or-INSERT; 1062→`supplier-cnpj-duplicate` |
| `migrations/mysql/0001_organic_zaladane.sql` | gerada + editada (ENGINE/charset; `utf8mb4_bin` em id/cnpj) |
| `package.json` | `test:integration:partners` estendido com a suíte do supplier repo |

## Schema `par_suppliers` — destaques

- Payment target **achatado** (ADR-0020, sem JSON): `bank_account_{bank,agency,number,check_digit}` + `pix_{key_type,key}`, todos nullable.
- CHECKs: (a) `active`↔`deactivated_at`; (b) ao menos um destino; (c) coerência bloco bancário (4 juntas) e bloco pix (`pix_key_type`↔`pix_key`).

## Execução

```
# Gate default (mapper unit)
node --test ... supplier.mapper.test.ts → tests 11 · pass 11 · fail 0
typecheck → tsc --noEmit OK

# Integração REAL (não falso-verde) — MySQL 8.4 via Docker, porta 3307
MYSQL_PORT=3307 pnpm run test:integration:partners → tests 9 · pass 9 · fail 0 (exit 0)
  (4 financier + 5 supplier: save→findById, round-trip bank, round-trip pix, findByCnpj, list, dup→supplier-cnpj-duplicate)
```

### Bug capturado pela integração (corrigido)

Round-trip pix falhou no 1º run: fixture `buildActive` usava `over.bankAccount ?? bankInput()` —
`null ?? bankInput()` resolvia para bankInput(), então o supplier "pix-only" nascia com banco. **Bug
de teste, não de código.** Corrigido para `'bankAccount' in over ? ... : ...` (distingue "não
informado" de "explicitamente null"). Re-run: 9/9. Validação real pegou o que o gate default não pegaria.

W2 (audit read-only) a seguir.
