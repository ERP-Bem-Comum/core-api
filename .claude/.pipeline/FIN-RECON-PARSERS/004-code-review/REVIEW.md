# Code Review — FIN-RECON-PARSERS (#119) — Round 1

**Veredito:** APPROVED

**Reviewer:** code-reviewer · **Data:** 2026-06-18T01:58Z

**Escopo revisado (read-only):**

- `src/modules/financial/application/ports/bank-statement-parser.ts`
- `src/modules/financial/adapters/statement-parsers/{amount,ofx-parser,csv-parser,bank-statement-parser,fake-parser}.ts`
- `tests/modules/financial/adapters/statement-parsers/{ofx-parser,csv-parser,bank-statement-parser}.test.ts`

---

## Issues encontradas

### 🔴 Crítica (bloqueia approval)

Nenhuma. Sem `throw`/`class`/`any`; port é `type Readonly<{...}>` (não interface/class); parsing puro
(sem I/O); erros sempre via `Result`; sem import cross-módulo; `tsc` e `lint` já verdes (W1).

### 🟡 Importante (não-bloqueia, registrar — handoff p/ #120)

1. **`entryType` carrega o token bruto do arquivo** (OFX `TRNTYPE`; CSV coluna `tipo`). No CSV de
   amostra a coluna `tipo` é `DEBITO`/`CREDITO` (movimento), então `entryType` acaba em **PT** e
   redundante com `movement`. O data-model define `entryType` como union EN (`PIX`/`TED`/.../`Other`).
   **Risco:** se o **#120** persistir esse valor cru em `fin_statement_transactions.entry_type` (que
   tem CHECK dos 10 valores EN), o INSERT falha; e PT vazaria (C1).
   **Esperado:** o #120 (ou um normalizador) mapeia o token bruto → union EN (ou `Other`), nunca
   persiste PT. O parser pode seguir devolvendo o bruto, mas isto **deve** ser tratado antes da
   persistência. Registrado para o #120.

### 🔵 Sugestão (estilo / clareza)

1. **`bank-statement-parser.ts`** usa `const _exhaustive: never = format; void _exhaustive;` no
   `default`. Cumpre o anti-padrão #7 (sem `throw`), mas o `void` é só para "marcar usado" — poderia
   ser apenas `const _: never = format;` se a config de unused-vars permitir `_`. Mantido (lint verde).

---

## Verificação por categoria

| Cat | Item | Resultado |
| :-- | :-- | :-- |
| A (adaptado a adapters) | sem `throw`/`class`/`any`/`this`; `let`/`.push` permitidos em adapter; erros via `Result` | ✅ |
| B | port `BankStatementParser` é `type Readonly<{...}>`; `ParseError` string-literal EN | ✅ |
| C | dispatcher: `switch` exaustivo com `const _: never` (sem `throw` no default) | ✅ |
| D | adapter converte/retorna `Result` na borda; parsing sync puro (sem I/O); `makeFakeParser` é o double InMemory | ✅ |
| E | `adapters/statement-parsers/` importa só de `application/ports/` (próprio módulo) + `shared/`; sem cross-módulo | ✅ |
| F | imports `.ts`; `import type`; sem `require`/`enum`/`namespace`; `tsc` verde | ✅ |
| G | identificadores EN; `movement` EN (`Debit`/`Credit`); `ParseError` EN kebab-case; reuso `isValidDate` | ✅ (ressalva 🟡 do `entryType` bruto) |
| H | testes com amostras OFX/CSV reais; asserções de regra (count, fitid, movement, valueCents, CA6, unsupported-format) | ✅ |

**Sem dependência nova** (ADR-0011/D-FORMATS) — parsing à mão; `shared/utils/csv.ts` (vírgula) não foi
forçado para o formato `;`, decisão correta. ✅

---

## O que está bom

- Contrato do port honrado exatamente (`ParsedStatement`/`ParsedTransaction` com `fitid: string|null`).
- **CA6** bem modelado: sinal do valor vira **direção** (`movement`), `valueCents` sempre magnitude.
- `parseAmountCents` evita float (inteiro × 100), determinístico.
- Dispatcher com exaustividade type-safe; `unsupported-format` no guard de runtime.
- Erros de formato (vazio / sem estrutura / linha curta / data inválida) todos mapeados em `Result`.

## Próximo passo

**APPROVED (round 1).** Avançar para **W3** (`ts-quality-checker`). A issue 🟡 (`entryType` bruto/PT) é
**handoff para o #120** — registrar lá que a normalização → union EN acontece antes da persistência.
