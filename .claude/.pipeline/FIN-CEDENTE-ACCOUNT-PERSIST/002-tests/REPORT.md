# W0 — RED · FIN-CEDENTE-ACCOUNT-PERSIST

**Agente:** tdd-strategist · **Resultado:** 🔴 RED · **Branch:** `016-fin-remessa-cnab240`

## Estratégia de teste desta fatia (nota importante)

Schema/migration são DDL (não unit-testáveis) e o adapter **Drizzle** é integração (Docker, roda em
`test:integration`, **fora** do gate W3). Logo o **alvo TDD visível no gate** é o **mapper** (puro,
row↔domínio). O adapter Drizzle é coberto por `test:integration` (CA5), gated por opt-in.

## Citação canônica (IX)

- **TDD (Beck)**, p. 3 (test-first).
- `.claude/rules/adapters.md`: "Mappers (row ↔ domínio) devem retornar `Result<T, E>` — domínio rejeita
  estado inválido vindo do banco." — base do mapper aqui.

## Arquivo de teste (RED)

- `tests/modules/financial/adapters/persistence/mappers/cedente-account.mapper.test.ts` — `toRow`/`toDomain` (CA1–CA4).

## Prova RED

```
✖ cedente-account.mapper.test.ts  ERR_MODULE_NOT_FOUND .../mappers/cedente-account.mapper.ts
ℹ pass 0 · fail 1
```

## Contrato esperado (alvo do W1)

### `adapters/persistence/mappers/cedente-account.mapper.ts`
- `toRow(account: CedenteAccount): NewCedenteAccountRow`.
- `toDomain(row: CedenteAccountRow): Result<CedenteAccount, CedenteAccountMapperError>` — valida
  `status` ∈ {Active,Closed} (senão `invalid-status`), rehidrata `id` (senão `invalid-id`).

### `schemas/mysql.ts`
- `fin_cedente_accounts` (id PK; bank_code/agency/account_number/account_digit/convenio/document varchar;
  status varchar(8) CHECK ∈ {Active,Closed}; next_nsa int CHECK ≥ 1) → exporta `CedenteAccountRow`/`NewCedenteAccountRow`.
- `fin_documents.debit_account_ref` varchar(36) NULL (ref lógica, sem FK).

### Migration + adapter
- Migration `0004` via `pnpm run db:generate` (⚠️ incidente `repos-dir-moved` — recuperar com `git checkout HEAD -- <dir>`).
- `repos/cedente-account-store.drizzle.ts` (SELECT-then-UPDATE-or-INSERT). Teste em `test:integration` (CA5, Docker).

## Próxima wave

W1 (`drizzle-schema-author` + `ports-and-adapters`) — mapper + schema + migration `0004` + coluna +
adapter Drizzle até GREEN (gate sem Docker; integração à parte).
