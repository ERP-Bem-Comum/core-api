# W0 — RED · FIN-RECON-STATEMENT-PERSIST-HTTP (#120)

**Agente:** tdd-strategist · **Resultado:** 🔴 RED · **Branch:** `017-fin-conciliacao-bancaria` (com cedente via rebase)

## Estratégia (fatia vertical grande)

#120 é schema → repo → use-case → mapper → borda HTTP → integração. O **alvo central do W0** (gate-visível,
puro de Docker) é o **use-case `importBankStatement`** — ele amarra o contrato: parse → resolve FITID →
dedup (repo) → save → evento. Os demais artefatos e seus testes entram no **W1**:
- **mapper** (statement/transaction row↔domínio, + normalização `entryType`→EN) — teste puro no gate;
- **borda HTTP** (`POST /bank-statements`, `GET .../transactions`) — teste `fastify.inject` (harness `buildApp`+`buildFinancialHttpDeps`);
- **Drizzle + índice único FITID** — `test:integration:financial` (Docker, fora do gate).

## Citação canônica (IX)

- **TDD (Beck)**, p. 3 (test-first).
- `.claude/rules/application.md`: "use cases são factory functions `(deps) => (input) => Promise<Result>`;
  validar → fetch → domain → persist → publish event (eventos só após save ok)." — molde do `importBankStatement`.

## Arquivo de teste (RED)

- `tests/modules/financial/application/use-cases/import-bank-statement.test.ts` — CA1–CA4.

## Prova RED

```
✖ import-bank-statement.test.ts  ERR_MODULE_NOT_FOUND .../use-cases/import-bank-statement.ts
ℹ pass 0 · fail 1
```

## Contrato esperado (alvo do W1)

- `application/use-cases/import-bank-statement.ts` — `importBankStatement(deps)(input): Promise<Result<Output, ImportError>>`:
  - `deps = { parser: BankStatementParser, repo: BankStatementRepository, clock: Clock, outbox }`;
  - `input = { debitAccountRef, format, content }`; `Output = { statementId, imported, discardedDuplicates, period }`.
  - Resolve FITID (nativo `Fitid.fromNative` / `null`→`Fitid.synthesize`), `repo.knownFitids` → domínio `importStatement` (dedup) → `repo.save` → `outbox.append(BankStatementImported)`.
- `application/ports/bank-statement-repository.ts` — `save`/`knownFitids`/`listTransactions`.
- `adapters/persistence/repos/bank-statement-repository.in-memory.ts` — `createInMemoryBankStatementRepository`.
- **Outbox/events**: incluir `BankStatementImported` no union aceito por `FinancialOutbox.append` (hoje só `DocumentEvent`) — extensão da `public-api/events.ts` (T004).
- Schema `fin_bank_statements`+`fin_statement_transactions`+índice único `(debit_account_ref, fitid)`; migration `0005`; mapper; adapter Drizzle; rotas HTTP.

## Próxima wave

W1 (`ts-domain-modeler`/`ports-and-adapters` + `drizzle-schema-author` + `fastify-server-expert`) —
implementar a fatia até GREEN; HTTP test + integração Docker incluídos.
