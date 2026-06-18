# Code Review — FIN-RECON-STATEMENT-DOMAIN (#118) — Round 1

**Veredito:** APPROVED

**Reviewer:** code-reviewer · **Data:** 2026-06-18T01:34Z

**Escopo revisado (read-only):**

- `src/modules/financial/domain/statement/fitid.ts`
- `src/modules/financial/domain/statement/bank-statement.ts`
- `src/modules/financial/domain/statement/types.ts`
- `src/modules/financial/domain/statement/events.ts`
- `src/modules/financial/domain/statement/errors.ts`
- `src/modules/financial/domain/statement/bank-statement-id.ts`
- `src/modules/financial/domain/statement/statement-transaction-id.ts`
- `src/shared/utils/hash.ts`
- (referência) `tests/modules/financial/domain/statement/{fitid,bank-statement}.test.ts`

---

## Issues encontradas

### 🔴 Crítica (bloqueia approval)

Nenhuma. Sem `throw`/`class`/`this`/`any`/`extends Error`; sem PT no código; sem import cross-módulo;
contrato do W0 honrado; `tsc --noEmit` já verde (evidência do W1).

### 🟡 Importante (não-bloqueia, registrar)

Nenhuma.

### 🔵 Sugestão (estilo / clareza)

1. **`types.ts` — `entryType: string`** (em `StatementTransaction`/`ParsedTransaction`). O data-model
   define `entryType` como union EN de 10 valores (`'PIX'|'TED'|'DOC'|'Fee'|'Boleto'|'DARF'|'Investment'|
   'Redemption'|'Transfer'|'Other'`). Aqui está `string` porque a **normalização/validação do tipo
   pertence ao parser (#119)**. OK para esta fatia; ao fechar #119, estreitar para a union.
2. **`fitid.ts:synthesize`** retorna `Fitid` (total), não `Result`. Correto por design — é uma
   **derivação** determinística (sha256 hex = 64 chars, sempre válida), análoga a `Money.ZERO`. O `as
   Fitid` é seguro por construção. (As fronteiras a partir de input não-confiável — `fromNative`/
   `rehydrate` — retornam `Result`.) Opcional: comentar o invariante "64 chars ⇒ válido" já está claro.
3. **`bank-statement.ts`** usa acumulador local imperativo (`kept.push` + `let discardedDuplicates`)
   para o dedup. É **deliberado e eficiente** (O(n), `Set` para lookup) e o array é congelado
   (`immutable`/`readonly`) na fronteira do agregado — não há mutação de estado de entidade. A regra
   "sem `.push` em arrays do domínio" visa imutabilidade de entidade, preservada aqui. Mantido.

---

## Verificação por categoria

| Cat | Item | Resultado |
| :-- | :-- | :-- |
| A | zero throw/class/this/any/extends Error; Readonly; readonly[]; return types explícitos; `occurredAt` injetado | ✅ |
| B | smart constructors `fromNative`/`rehydrate` → `Result`; `as Brand` só após validação; sync/puro; erro string-literal EN (`'invalid-fitid'`, `'empty-statement'`, `'*-id-invalid'`) | ✅ |
| C | evento discriminado por `type` EN-passado (`BankStatementImported`); sem switch (não aplicável nesta fatia) | ✅ |
| E | `domain/statement/` importa só de `../../../../shared/` e do próprio subdomínio; sem cross-módulo; sem leitura de `ctr_*` | ✅ |
| F | imports terminam em `.ts`; `import type`/`type` inline (verbatimModuleSyntax); sem `require`/`enum`/`namespace`; `tsc` verde | ✅ |
| G | identificadores EN; enums EN (C1: `Debit`/`Credit`, `Pending`/`Reconciled`/`ManualEntry`); erros EN kebab-case; sem `I`-prefix/`Impl`-suffix; nomes específicos | ✅ |
| H | testes com builders (`tx`/`baseInput`), asserções de regra (dedup count, status, evento), ids gerados reais | ✅ |

**`node:crypto` no domínio:** `fitid.ts` **não** importa `node:crypto` diretamente — usa
`shared/utils/hash.ts` (`sha256Hex`), espelhando `shared/utils/id.ts` (`randomUUID`). Encapsulamento
correto; domínio permanece livre de infra direta. ✅

---

## O que está bom

- Aderência **exata** ao contrato publicado no W0 (`002-tests/REPORT.md`): assinaturas, shape do
  output (`{ statement, discardedDuplicates, events }`) e do evento batem.
- Pureza impecável: `Result` em todas as fronteiras, zero `throw`/`class`, imutabilidade via
  `immutable<T>` + `readonly`.
- **C1 (idioma)** aplicado de ponta a ponta — todos os valores de enum em EN, casando
  `fin_payables.status`.
- Branded ids seguem fielmente o padrão `payable-id.ts` (module-as-namespace, `generate`/`rehydrate`).
- Dedup correto e eficiente (R5), com atomicidade (`empty-statement`).

## Próximo passo

**APPROVED (round 1).** Avançar para **W3** (skill `ts-quality-checker`): gate
`typecheck + format:check + lint + test`. As 3 sugestões 🔵 são não-bloqueantes; #1 (union de
`entryType`) fica registrada para o ticket #119 (parsers).
