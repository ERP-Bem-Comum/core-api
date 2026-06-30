# W0 — Testes RED · PARTNERS-SUPPLIER-USECASES

> Skill: `tdd-strategist` · Outcome: **RED**

## Suite

`tests/modules/partners/application/supplier-usecases.test.ts` — espelha
`financier-usecases.test.ts`, acrescido da invariante de payment target e de
`serviceCategory`. Cobre os critérios de aceite do `000-request.md`:

| Bloco | Casos |
| --- | --- |
| `registerSupplier` | Active+evento · pixKey como destino · CNPJ duplicado (`register-supplier-cnpj-duplicate`) · CNPJ inválido (`invalid-cnpj`) · sem payment target (`supplier-payment-target-required`) · email inválido (`supplier-email-invalid`) · categoria desconhecida (`invalid-service-category`) |
| `deactivate/reactivate` | desativa · not-found · reativa inativo · reativar já ativo (`supplier-already-active`) · rehydrate inválido |
| `queries` | `listSuppliers` · `findSupplierByCnpj` acha + `null` quando ausente |
| `adapter InMemory` | `save` recusa CNPJ duplicado com id distinto (`supplier-cnpj-duplicate`) |

## Evidência RED

```
✖ tests/modules/partners/application/supplier-usecases.test.ts
  code: 'ERR_MODULE_NOT_FOUND'
  url: '.../adapters/persistence/repos/supplier-repository.in-memory.ts'
```

Falha por inexistência da API alvo (port, InMemory store, 5 use cases). RED legítimo
— nenhum arquivo de produção tocado em W0.
