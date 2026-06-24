# W1 — FIN-DETAIL-PAYEE-BANK (#255)

**Resultado:** GREEN ✅ — implementado por `fastify-server-expert`, verificado pelo orquestrador.

## Arquivos

**NOVO**
- `src/modules/financial/adapters/http/payee-bank-composition.ts` — `composePayeeBank(port, ref, opts)` + tipo `PayeeBankBlock`. Espelha `contracts/.../contractor-composition.ts` (timeout 2s + degradação graciosa). `payeeKind!=='supplier'` / port nulo / not-found / IO/timeout → `null`. Cabeçalho `@transient` (ADR-0032). Importa `PayeeKind` do domínio (sem redefinição local — ajuste DRY do orquestrador).

**MODIFICADOS**
- `composition.ts` — `FinancialCompositionConfig.contractorReadPort?`; `FinancialHttpDeps.resolvePayeeBank`; `Pools.contractorReadPort`; memory usa o injetado, mysql constrói via `buildPartnersReadPort` e fecha no `shutdown`.
- `schemas.ts` — `payeeBank` nullable no `documentResponseSchema` (`{ bankAccount, pixKey }`).
- `dto.ts` — `documentToDto(..., payeeBank = null)` nos dois ramos (Draft/Open).
- `plugin.ts` — `loadAndSerialize(..., composePayee=false)`; GET /:id passa `true` (compõe); writes mantêm `false` (sem leitura cross-módulo, `payeeBank:null`).

## Decisões / desvios
- `payeeBank` só é composto no **GET /:id** (writes não pagam leitura cross-módulo). Schema nullable satisfaz ambos.
- Sentinel de timeout usa `'contractor-read-unavailable'` (não `'timeout'`) — a union de erro do port não tem `'timeout'`; colapsa no mesmo `null`.
- `domain/`/`application/` **intocados** (ADR-0006/0032 — composição só na borda).

## Verificação (orquestrador, não a palavra do sub-agente)
```
payee-bank.http.test.ts         → tests 4 · pass 4 · fail 0
competencia-debito.http.test.ts → tests 4 · pass 4 · fail 0
financial/adapters/http/*       → tests 157 · pass 157 · fail 0
pnpm run typecheck              → sem erros
```

**Próximo (W2):** `code-reviewer` (read-only) + par `zod-expert` na borda (schema `payeeBank`).
