# W0 — RED · PARTNERS-SUPPLIER-DOMAIN

> Agente: tdd-strategist · Resultado: **RED** (módulos inexistentes)

## Arquivo de teste

`tests/modules/partners/domain/supplier/supplier.test.ts` — cobre:

- `SupplierId.generate` → UUID v4.
- `ServiceCategory.parse` — aceita valores legados (incl. typos `ONGANIZACAO_DE_EVENTOS`/`TRASPORTE`); rejeita desconhecido (`invalid-service-category`).
- `PaymentTarget.createBankAccount`/`createPixKey` — validam campos; rejeitam keyType inválido/key vazia.
- `Supplier.register` — Active com banco **ou** pix; sem nenhum → `supplier-payment-target-required`;
  rejeita email inválido, CNPJ inválido, serviceCategory desconhecida, name vazio.
- `Supplier.deactivate`/`reactivate` — transição + idempotência (`supplier-already-inactive`/`-active`).

## Execução

```
Cannot find module '.../supplier/supplier-id.ts'
ℹ tests 1 · pass 0 · fail 1
```

RED legítimo. Liberado para W1.
