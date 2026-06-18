# W0 — RED · FIN-CEDENTE-ACCOUNT

**Agente:** tdd-strategist · **Resultado:** 🔴 RED (testes falham por inexistência da API) · **Branch:** `016-fin-remessa-cnab240`

## Citação canônica (IX)

- **TDD (Beck)**, p. 3 (test-first; mesma base dos tickets anteriores).
- **D-CEDENTE** (research da 016): a conta-cedente é a referência de identidade que liga documento →
  conta-débito. (Citação Evans — *Entities* — a anexar via MCP `acdg-skills` (ON) no gate das decisões;
  o requisito IX pesado é da fronteira ACL/agregado da remessa, não desta entidade de configuração.)

## Arquivos de teste (RED)

- `tests/modules/financial/domain/cedente/cedente-account.test.ts` — `create`/`isActive`/`isClosed`/`close` (CA1–CA5).
- `tests/modules/financial/adapters/persistence/repos/cedente-account-store.in-memory.test.ts` — store (CA6).

## Prova RED

```
✖ cedente-account.test.ts                ERR_MODULE_NOT_FOUND .../domain/cedente/cedente-account-id.ts
✖ cedente-account-store.in-memory.test.ts ERR_MODULE_NOT_FOUND .../domain/cedente/cedente-account-id.ts
ℹ pass 0 · fail 2
```

## Contrato esperado (alvo do W1)

### `domain/cedente/`
- `cedente-account-id.ts` — branded `CedenteAccountId` (module-as-namespace).
- `types.ts` — `CedenteAccountStatus = 'Active'|'Closed'`, `CedenteAccount` (`bankCode`, `agency`, `accountNumber`, `accountDigit`, `convenio`, `document`, `status`, `nextNsa`), `CreateInput`, `CedenteAccountError`.
- `cedente-account.ts` — `create(input): Result<CedenteAccount, CedenteAccountError>` (validações + defaults `status='Active'`/`nextNsa=1`); `isActive`/`isClosed`; `close(acc): Result<CedenteAccount, 'cedente-account-already-closed'>`.

### `application/ports/cedente-account-store.ts`
- `CedenteAccountStore = Readonly<{ findById(id): Promise<Result<CedenteAccount|null, 'persistence-error'>>; save(acc): Promise<Result<void, 'persistence-error'>> }>`.

### `adapters/persistence/repos/cedente-account-store.in-memory.ts`
- `makeInMemoryCedenteAccountStore(): CedenteAccountStore`.

Enums em **EN** (C1). Domínio puro; **sem DB** nesta fatia (adapter in-memory).

## Próxima wave

W1 (`ts-domain-modeler` + `ports-and-adapters`) — implementar domínio + port + adapter in-memory até GREEN.
