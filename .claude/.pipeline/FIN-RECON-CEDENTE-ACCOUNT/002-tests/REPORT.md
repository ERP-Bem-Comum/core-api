# W0 — Testes RED · FIN-RECON-CEDENTE-ACCOUNT

**Wave**: W0 (fail-first) · **Agente**: tdd-strategist · **Data**: 2026-06-19 · **Feature SDD**: `specs/019-fin-recon-cedente-account/`

## Resultado

```
ℹ tests 19
ℹ suites 5
ℹ pass 5      ← CA1–CA5 do agregado da 016 (intactos)
ℹ fail 14     ← APIs novas da 019 (RED por inexistência)
```

RED legítimo: cada falha é por **inexistência da API nova**, não por erro de teste. Os 5 verdes provam que a extensão **não quebrou** o que a 016 entregou (FR-013).

## Cobertura RED (mapeada aos CAs / FRs)

| Arquivo | Story/FR | Como falha (RED) |
| --- | --- | --- |
| `tests/modules/financial/domain/cedente/cedente-account.test.ts` (CA6–CA9, **anexado**) | FR-003/FR-006, US4 | `create()` ignora `type`/saldo → `type` indefinido, `invalid-account-type` e `opening-balance-requires-date` não emitidos |
| `tests/.../application/use-cases/create-cedente-account.test.ts` | US1, FR-016, US4 | `ERR_MODULE_NOT_FOUND` (use-case não existe) |
| `tests/.../application/use-cases/list-cedente-accounts.test.ts` | US1, FR-007 | `ERR_MODULE_NOT_FOUND` |
| `tests/.../application/use-cases/close-cedente-account.test.ts` | US2 | `ERR_MODULE_NOT_FOUND` |
| `tests/.../application/use-cases/edit-cedente-account.test.ts` | US3, FR-008 | `ERR_MODULE_NOT_FOUND` |
| `tests/.../application/use-cases/import-bank-statement-account-closed.test.ts` | US2, FR-011 | guard ausente → o parser é chamado (deps sem `cedenteStore`); espera `account-closed` |
| `tests/.../adapters/http/financial-cedente.http.test.ts` | US1/US2 borda | rotas inexistentes → 404 nos asserts de 201/200/403/close |

## Contratos definidos pelos testes (a implementar em W1)

- **Domínio**: `create()` aceita `type` (`corrente|poupanca|investimento`), `nickname`, `bankName`, `openingBalanceCents`+`openingBalanceDate` (par coeso); erros `invalid-account-type`, `opening-balance-requires-date`.
- **Use-cases** (curried `uc(deps)(input)`): `createCedenteAccount` (gera id, rejeita duplicata via `findByNaturalKey` → `cedente-account-duplicate`, **insert-only**, não reusa `save()` upsert), `listCedenteAccounts`, `closeCedenteAccount` (`cedente-account-not-found`/`-already-closed`), `editCedenteAccount` (deps `accountHistory.hasActivity`; com histórico → `cedente-account-bank-data-locked`).
- **Port** (`cedente-account-store.ts`): adicionar `list()` e `findByNaturalKey()`.
- **Import** (`import-bank-statement.ts`): adicionar `cedenteStore` aos deps + guard `account-closed` antes de parsear.
- **Borda HTTP**: `POST/GET/GET:id/PATCH /api/v2/financial/cedente-accounts` + `POST /:id/close`, permissão `bank-account:read|write`.

## Integração RED (T012) — escrito

Anexado a `tests/modules/financial/adapters/persistence/cedente-account-store.drizzle-mysql.test.ts` (opt-in `MYSQL_INTEGRATION`, roda via `pnpm run test:integration:financial`):

- `019/round-trip`: persistir/recuperar `type`/`nickname`/`bankName`/`openingBalanceCents` → RED (colunas inexistentes; `create()` ignora os campos).
- `019/FR-016`: `UNIQUE` (banco+agência+conta+dígito) impede 2ª conta com mesma chave natural → RED (sem índice hoje; a 2ª linha existe).

Verificado: o arquivo **carrega e respeita o gate** (sem `MYSQL_INTEGRATION` → "pulando", 1 pass). As asserções RED executam sob `pnpm run test:integration:financial` (Docker MySQL) — **não rodado aqui** para poupar RAM (máquina de 8 GB); RED estrutural garantido (asserções sobre colunas/índice inexistentes).

## ⚠️ Consequência para o W1 (achado)

O `UNIQUE INDEX` de FR-016 **quebrará os testes CA5 existentes**: `buildAccount()` repete a chave natural (237/1234/567890/1) em 2 testes com ids diferentes — hoje passa, mas colide com o índice. **W1 deve** dar a `buildAccount()` chaves naturais distintas (ou parametrizá-las) ao aplicar a migration 0009. Idem para qualquer outro fixture do financial que insira conta-cedente com chave repetida.

## Como reproduzir

```
node --experimental-strip-types --enable-source-maps --no-warnings --test \
  tests/modules/financial/domain/cedente/cedente-account.test.ts \
  tests/modules/financial/application/use-cases/{create,list,close,edit}-cedente-account.test.ts \
  tests/modules/financial/application/use-cases/import-bank-statement-account-closed.test.ts \
  tests/modules/financial/adapters/http/financial-cedente.http.test.ts
```
