# W1 — GREEN · FIN-CEDENTE-ACCOUNT

**Agente:** ts-domain-modeler + ports-and-adapters · **Resultado:** 🟢 GREEN (6/6 testes) · **Branch:** `016-fin-remessa-cnab240`

## Arquivos criados

- `domain/cedente/cedente-account-id.ts` — branded `CedenteAccountId`.
- `domain/cedente/types.ts` — `CedenteAccount`, `CedenteAccountStatus` (`Active`/`Closed`), `CreateInput`, `CedenteAccountError` (enums EN — C1).
- `domain/cedente/cedente-account.ts` — `create` (validações + defaults `Active`/`nextNsa=1`), `isActive`, `isClosed`, `close`.
- `application/ports/cedente-account-store.ts` — port `CedenteAccountStore` (`findById`/`save`).
- `adapters/persistence/repos/cedente-account-store.in-memory.ts` — `createInMemoryCedenteAccountStore`.

## Prova GREEN

```
▶ cedente-account — create   ✔ CA1–CA4
▶ cedente-account — status   ✔ CA5 (isActive/isClosed/close + already-closed)
▶ cedente-account-store.in-memory  ✔ CA6 (save/findById/null)
ℹ tests 6 · pass 6 · fail 0
```

Sanity adiantado: `typecheck` ✅ e `lint` ✅ (após 2 ajustes p/ o padrão da casa: factory
`createInMemoryX` (não `make`) + arrows `async` no store — `promise-function-async`).

## Decisões

- `create`: guard-clauses por campo obrigatório (`bank-code`/`agency`/`account-number`/`document`),
  `nextNsa >= 1`; defaults `status='Active'`, `nextNsa=1`. Pureza total (`Result`, sem `throw`/`class`).
- `close`: `Active→Closed` por cópia; `already-closed` se repetido — base do guard FR-015 da conciliação.
- Port `CedenteAccountStore` (`type Readonly`); erro `cedente-account-store-unavailable` (padrão `<store>-unavailable`).
- Adapter in-memory `async (...) => Promise.resolve(...)` — espelha `supplier-view-store.in-memory.ts`.

## Escopo respeitado (fora: fatia `*-PERSIST`)

`fin_cedente_accounts` schema + migration `0004` + `fin_documents.debit_account_ref` + adapter Drizzle.
Alocação de NSA / geração CNAB (016). **Sem DB/Docker** nesta fatia.

## Próxima wave

W2 (skill `code-reviewer`) — audit read-only.
