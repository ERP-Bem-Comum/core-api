# W1 — GREEN · PARTNERS-SUPPLIER-DOMAIN

> Agente: ts-domain-modeler · Resultado: **GREEN** (13/13)

## Arquivos (`src/modules/partners/domain/supplier/`)

| Arquivo | Conteúdo |
| :--- | :--- |
| `supplier-id.ts` | VO `SupplierId` (generate + rehydrate) |
| `service-category.ts` | union `ServiceCategory` (39 valores legados literais, incl. typos `ONGANIZACAO_DE_EVENTOS`/`TRASPORTE`) + `parse` |
| `payment-target.ts` | `PixKeyType` (EN), VOs `BankAccount`/`PixKey` + `createBankAccount`/`createPixKey` |
| `types.ts` | `ActiveSupplier`/`InactiveSupplier`; core com `bankAccount`/`pixKey` (null-able); `RegisterSupplierInput` |
| `events.ts` | `SupplierRegistered`/`Deactivated`/`Reactivated` |
| `errors.ts` | `SupplierError` (kebab; compõe `PaymentTargetError`) |
| `supplier.ts` | `register`/`deactivate`/`reactivate` |

## Decisões de design

- **Invariante "destino de pagamento"** imposta no `register`: ao menos um entre `bankAccount`/`pixKey`,
  senão `supplier-payment-target-required`. Os campos ficam `| null` no core (estado garantido na construção).
- **`serviceCategory` literal PT** (D2) — fidelidade ao legado (typos inclusos); rótulo humano no formatter.
- **`pixKeyType` traduzido EN** (`cpf|cnpj|email|phone|random-key`) — não está nas exceções D2.
- **Email validado inline** (regex pragmática) — VO `Email` no kernel é ticket próprio (D4); `register`
  rejeita `supplier-email-invalid`.
- Mesmo padrão Active/Inactive + idempotência + `immutable` + reuso de `Cnpj` do kernel que o `Financier`.

## Execução

```
ℹ tests 13 · pass 13 · fail 0   (supplier.test.ts)
ℹ tests 66 · pass 66 · fail 0   (tests/modules/partners/** — módulo inteiro)
```
