# PARTNERS-SUPPLIER-DOMAIN — Agregado de domínio `Supplier`

> **Size:** M · **ADR:** [ADR-0031](../../../handbook/architecture/adr/0031-partners-registry-module.md) · **Épico:** Fase 2

## Contexto

Segundo agregado de contraparte. Mais rico que `Financier`: adiciona a invariante **"destino de
pagamento"** (bancário OU pix — ao menos um), `serviceCategory` (enum de 39 valores) e VOs embedded
(`BankAccount`, `PixKey`). Reusa o padrão de ciclo de vida Active/Inactive do `Financier`. Só domínio
puro; application + persistência vêm em tickets seguintes.

Campos (legado `suppliers`, database.dbml:153-176): name, email, cnpj (UNIQUE), corporateName,
fantasyName, serviceCategory, bancaryInfo (embedded), pixInfo (embedded), active. `serviceEvaluation`/
`commentEvaluation` ficam para um use case de avaliação futuro (fora deste ticket).

## Escopo (`src/modules/partners/domain/supplier/`)

1. **`supplier-id.ts`** — VO `SupplierId` (generate + rehydrate).
2. **`service-category.ts`** — union `ServiceCategory` com os **39 valores legados literais** (D2:
   manter código legado — inclui typos `ONGANIZACAO_DE_EVENTOS`/`TRASPORTE`) + `parse`.
3. **`payment-target.ts`** — `PixKeyType` (EN: `cpf|cnpj|email|phone|random-key`), VOs `BankAccount`
   (bank/agency/accountNumber/checkDigit) e `PixKey` (keyType/key) com smart constructors.
4. **`types.ts`** — `ActiveSupplier`/`InactiveSupplier`; core com `bankAccount: BankAccount | null` e
   `pixKey: PixKey | null` (invariante garantida na construção); `RegisterSupplierInput`.
5. **`events.ts`** — `SupplierRegistered`/`SupplierDeactivated`/`SupplierReactivated`.
6. **`errors.ts`** — `SupplierError` (kebab).
7. **`supplier.ts`** — `register`/`deactivate`/`reactivate`. `register` valida campos texto, email
   (formato), CNPJ, serviceCategory, e a invariante de payment target.

## Fora de escopo

- Port/repo/use cases/persistência; `serviceEvaluation`/`commentEvaluation`; VO `Email` no kernel (D4 — ticket próprio).

## Critérios de aceite

- [ ] `register` válido (com bankAccount **ou** pixKey) → `ActiveSupplier` + `SupplierRegistered` (cnpj normalizado).
- [ ] `register` sem bankAccount **e** sem pixKey → `'supplier-payment-target-required'`.
- [ ] `register` rejeita: campo texto vazio (erro específico), email inválido (`'supplier-email-invalid'`), CNPJ inválido (`'invalid-cnpj'`), serviceCategory desconhecida (`'invalid-service-category'`).
- [ ] `ServiceCategory.parse` aceita os 39 valores legados e rejeita o resto.
- [ ] `BankAccount.create`/`PixKey.create` validam campos; `PixKey` rejeita `keyType` inválido.
- [ ] `deactivate`/`reactivate` com idempotência (já inativo/ativo → erro).
- [ ] W3 verde: typecheck + format:check + test + lint.

## Notas de disciplina

- W0 RED antes de `src/`. Código EN; `serviceCategory` literal PT (D2); `pixKeyType` EN. Erros kebab.
- `occurredAt`/`at` injetados; agregado imutável; reuso do VO `Cnpj` do kernel.
