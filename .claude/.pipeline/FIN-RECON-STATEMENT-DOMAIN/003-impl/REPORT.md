# W1 — GREEN · FIN-RECON-STATEMENT-DOMAIN (#118)

**Agente:** ts-domain-modeler · **Resultado:** 🟢 GREEN (11/11 testes do ticket passam)

## Arquivos criados (domínio puro)

- `src/modules/financial/domain/statement/fitid.ts` — VO `Fitid` (`fromNative`/`synthesize`/`rehydrate`).
- `src/modules/financial/domain/statement/bank-statement-id.ts` — branded id (module-as-namespace).
- `src/modules/financial/domain/statement/statement-transaction-id.ts` — branded id.
- `src/modules/financial/domain/statement/types.ts` — `StatementTransaction`/`BankStatement`/`ParsedTransaction`/`ImportStatement{Input,Output}` (enums **EN** — C1).
- `src/modules/financial/domain/statement/events.ts` — `BankStatementImported` (EN-passado).
- `src/modules/financial/domain/statement/errors.ts` — `BankStatementError = 'empty-statement'`.
- `src/modules/financial/domain/statement/bank-statement.ts` — `importStatement` (dedup + atomicidade + evento).
- `src/shared/utils/hash.ts` — `sha256Hex` (encapsula `node:crypto`, como `id.ts` encapsula `randomUUID`).

## Prova GREEN

```
▶ financial/domain/statement/fitid — VO Fitid        ✔ 6/6
▶ financial/domain/statement/bank-statement          ✔ 5/5
ℹ tests 11 · pass 11 · fail 0
```

## Decisões de implementação (mínimo p/ GREEN)

- **Dedup** (`importStatement`): `Set<string>` semeado com `knownFitids` + `fitid`s já vistos no arquivo;
  colisão → `discardedDuplicates++` e `continue` (descarte silencioso, R5). `Fitid` é `Brand<string>`,
  comparável direto como chave do `Set`.
- **Atomicidade**: `input.transactions` vazio → `err('empty-statement')`; nada parcial.
- **`Fitid.synthesize`**: `sha256Hex(debitAccountRef|dateIso|valueCents|memo|seq)` — 64 chars hex
  (≤ limite), determinístico (CA4). OFX usa `fromNative`.
- **Pureza**: `Result<T,E>`, sem `throw`/`class`; ids gerados via `*.generate()` (padrão `payable-id.ts`,
  `newUuid` no kernel); `immutable<T>(...)` nos outputs. Enums em **EN** (C1).

## Escopo respeitado

Só domínio. **Sem** persistência/parser/HTTP (#119 parsers, #120 schema/migration/repos/borda).
`reconciliationStatus` nasce `Pending` na importação.

## Próxima wave

W2 (skill `code-reviewer`) — audit read-only (máx. 3 rounds): pureza, isolamento, EN, aderência ao contrato do W0.
