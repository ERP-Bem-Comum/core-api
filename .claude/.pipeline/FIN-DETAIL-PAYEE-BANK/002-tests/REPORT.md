# W0 — FIN-DETAIL-PAYEE-BANK (#255)

**Resultado:** RED ✅ (falha por inexistência da API)

**Arquivo:** `tests/modules/financial/adapters/http/payee-bank.http.test.ts` (4 CAs, `fastify.inject`, driver memory, `ContractorReadPort` FAKE injetado).

```
ℹ tests 4
ℹ pass 0
ℹ fail 4
```

Todos os 4 CAs falham com `payeeBank: undefined` — o campo não existe no DTO e o `contractorReadPort` ainda não é consumido (a opção é ignorada pelo `buildFinancialHttpDeps` atual). RED behavioral, exatamente o esperado em W0.

| CA | Cenário | Esperado (W1) | Falha atual |
| --- | --- | --- | --- |
| CA1 | supplier + PIX | `payeeBank.pixKey={keyType,key}`, `bankAccount=null` | `payeeBank` undefined |
| CA2 | supplier + conta | `payeeBank.bankAccount={...}`, `pixKey=null` | `payeeBank` undefined |
| CA3 | supplier not-found (port→null) | `payeeBank=null` (graciosa) | `payeeBank` undefined |
| CA4 | payeeKind=financier | `payeeBank=null` (sem bancário fora de supplier) | `payeeBank` undefined |

**Nota de gate:** o `typecheck` fica RED durante o W0 (a opção `contractorReadPort` e o campo `payeeBank` ainda não existem) — é a natureza do fail-first, **não** regressão. Volta a verde no W1.

**Próximo (W1):** `fastify-server-expert` — `composePayeeBank` (espelha `contracts/.../contractor-composition.ts`), wiring do `contractorReadPort` na composição, `payeeBank` no schema/DTO, marcação de transitoriedade (ADR-0032:39).
