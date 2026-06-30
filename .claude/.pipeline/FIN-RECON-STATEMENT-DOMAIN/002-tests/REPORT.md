# W0 — RED · FIN-RECON-STATEMENT-DOMAIN (#118)

**Agente:** tdd-strategist · **Resultado:** 🔴 RED (testes falham por inexistência da API)

## Citação canônica (Princípio IX — TDD/Beck)

> "Código limpo que funciona, em uma frase concisa de Ron Jeffries, é o objetivo do Desenvolvimento
> Guiado por Testes (TDD). [...] É uma forma previsível de desenvolver. Você sabe quando acabou sem
> ter que se preocupar com uma longa trilha de erros. [...] Dá a você uma chance de aprender todas as
> lições que o código tem para ensinar."
> — Kent Beck, _TDD: Desenvolvimento Guiado por Testes_, p. 3 (linha 84).

W0 escreve o teste que **falha primeiro**; a API de domínio nasce no W1 para satisfazê-lo.

## Arquivos de teste (RED)

- `tests/modules/financial/domain/statement/fitid.test.ts` — VO `Fitid` (CA4, CA5).
- `tests/modules/financial/domain/statement/bank-statement.test.ts` — `importStatement` + dedup (CA1–CA3, CA6).

## Prova RED

```
✖ tests/modules/financial/domain/statement/fitid.test.ts
  code: 'ERR_MODULE_NOT_FOUND'
  url: .../src/modules/financial/domain/statement/fitid.ts
✖ tests/modules/financial/domain/statement/bank-statement.test.ts
ℹ tests 2 · pass 0 · fail 2
```

Falha por **inexistência** de `src/modules/financial/domain/statement/{fitid,bank-statement}.ts` — não
por asserção. Correto para o fail-first (constituição I).

## Contrato esperado (alvo do W1 GREEN)

### `domain/statement/fitid.ts` (module-as-namespace)
- `type Fitid = Brand<string, 'Fitid'>` · `type FitidError = 'invalid-fitid'`
- `fromNative(raw: string): Result<Fitid, FitidError>` — não-vazio, ≤ 64 chars.
- `synthesize(input: { debitAccountRef; dateIso; valueCents; memo; seq }): Fitid` — `sha256` determinístico (CSV).
- `rehydrate(raw: string): Result<Fitid, FitidError>`.

### `domain/statement/bank-statement.ts`
- Tipos `StatementTransaction` (campo `reconciliationStatus: 'Pending'` na importação; `movement: 'Debit'|'Credit'`), `BankStatement`, `BankStatementError`, `ImportStatementInput`, `ImportStatementOutput`.
- `importStatement(input: ImportStatementInput, knownFitids: ReadonlySet<string>): Result<ImportStatementOutput, BankStatementError>`
  - `ImportStatementOutput = { statement; discardedDuplicates: number; events: readonly BankStatementEvent[] }`.
  - Dedup silencioso por `Fitid` (contra `knownFitids` **e** repetições no próprio arquivo); reporta `discardedDuplicates`.
  - Importação sem nenhuma transação válida → `err` (atomicidade).
- Evento `BankStatementImported = { type: 'BankStatementImported'; statementId; debitAccountRef; importedCount; occurredAt }`.

Enums em **EN** (C1). Domínio puro: `Result<T,E>`, sem `throw`/`class`, branded types, erros string-literal-union EN.

## Próxima wave

W1 (skill `ts-domain-modeler`): implementar o mínimo para GREEN. **Não** tocar persistência/parser/HTTP
(tickets #119/#120).
