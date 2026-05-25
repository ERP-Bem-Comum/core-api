# Code Review — Ticket FIN-IDS-PAYABLE — Round 1

**Veredito:** **APPROVED**

**Reviewer:** `code-reviewer` (skill canônica W2)
**Data:** 2026-05-22T19:01Z
**Round:** 1 / 3
**Escopo revisado:** 8 arquivos

| # | Arquivo | Linhas |
| :--- | :--- | ---: |
| 1 | `src/modules/financial/domain/shared/payable-id.ts` | 18 |
| 2 | `src/modules/financial/domain/shared/remittance-id.ts` | 18 |
| 3 | `src/modules/financial/domain/shared/bank-transaction-id.ts` | 22 |
| 4 | `src/modules/financial/domain/shared/ids.ts` | 32 |
| 5 | `tests/modules/financial/domain/shared/payable-id.test.ts` | 95 |
| 6 | `tests/modules/financial/domain/shared/remittance-id.test.ts` | 95 |
| 7 | `tests/modules/financial/domain/shared/bank-transaction-id.test.ts` | 95 |
| 8 | `tests/modules/financial/domain/shared/ids.test.ts` | 49 |

---

## Issues encontradas

### 🔴 Crítica (bloqueia approval)

Nenhuma.

### 🟡 Importante (não-bloqueia, mas registrar)

Nenhuma.

### 🔵 Sugestão (estilo / clareza)

#### Sugestão 1 — Inconsistência menor entre W1 REPORT e estado real

**Categoria:** I (documentação de pipeline — não código)
**Observação:** REPORT W1 §1 indica `bank-transaction-id.ts` com **23 linhas**; arquivo real tem **22**. Discrepância de 1 linha vem do fato que Prettier reformatou o arquivo após o Write, encurtando o multiline do `rehydrate` para 2 linhas (não 5 como W1 sugeria):

```ts
export const rehydrate = (raw: string): Result<BankTransactionId, BankTransactionIdError> =>
  isUuidV4(raw) ? ok(raw as BankTransactionId) : err('bank-transaction-id-invalid');
```

**Não bloqueia** — discrepância textual no REPORT, código está conformante.

#### Sugestão 2 — JSDoc poderia citar paralelo com `contract-id.ts` explicitamente

**Categoria:** G (clareza)
**Observação:** Os 3 arquivos novos não mencionam que são espelhos textuais de `contracts/domain/shared/{contract,amendment,document}-id.ts`. Adicionar uma linha "Padrão idêntico a `src/modules/contracts/domain/shared/contract-id.ts`" facilitaria rastreabilidade futura.

**Não bloqueia** — o `ids.ts` barrel já faz esse paralelo (linha 15). Reviewer/maintainer chegam em `ids.ts` antes de mergulhar nos arquivos individuais.

---

## O que está bom

### Auditoria automática — todas verdes

```
$ grep -nE "throw |class |new Error|: any\b|extends Error" \
    src/modules/financial/domain/shared/*.ts
(nenhum encontrado)

$ grep -nE "as (Payable|Remittance|BankTransaction)Id" src/modules/financial/domain/shared/*.ts
# 6 ocorrências em código (2 por arquivo × 3) + 3 em comentários JSDoc

$ grep -nE "^\s*(const|let)\s+(describe|it|test|assert|before|after)\s*=" \
    tests/modules/financial/domain/shared/*.test.ts
(nenhum)
```

- ✅ **Zero `throw`, `class`, `new Error`, `: any`, `extends Error`** nos 4 arquivos de produção.
- ✅ **`as <ID>` aparece exatamente 6 vezes em código** (2 por arquivo × 3) — todas dentro de `generate` ou `rehydrate`, após validação via `newUuid()` (gerador autoritativo) ou `isUuidV4()` (validador). CA-18 satisfeita literalmente.
- ✅ **Zero shadowing de built-ins** nos 4 testes — lição do `FIN-VO-FITID` W3 absorvida no design do ticket. Esperamos lint verde em W3.

### `payable-id.ts` / `remittance-id.ts` / `bank-transaction-id.ts`

- ✅ **Padrão D (module-as-namespace) consistente** com `contract-id.ts` e `fitid.ts`. Cada arquivo exporta `<Name>Id`, `<Name>IdError`, `generate`, `rehydrate`.
- ✅ **`<Name>IdError` é string literal single-variant union** (`'<id-kebab>-invalid'`), não classe. Conforme regras de domínio.
- ✅ **Headers citam handbook com linha exata:**
  - `payable-id.ts:11` → `handbook/domain/04-titulos-liquidacao-context.md:17` (TituloID).
  - `remittance-id.ts:9-10` → `handbook/domain/04-titulos-liquidacao-context.md:32` (remessaID).
  - `bank-transaction-id.ts:12-13` → `handbook/domain/05-integracao-bancaria-context.md:29` (TransacaoBancaria).
- ✅ **`bank-transaction-id.ts` documenta distinção vs FITID** (linhas 8-11) — antecipa pergunta natural de qualquer leitor que veja os 2 IDs próximos ("não é redundante?"). Excelente decisão de documentação.
- ✅ **Imports `#src/*`** em vez de paths relativos longos — modernização vs `contract-id.ts` original. Consistente com `fitid.ts` e CLAUDE.md §Sintaxe TS.
- ✅ **`import type { Brand }` + `import { type Result, ok, err }`** — conformidade total com `verbatimModuleSyntax`.
- ✅ **Return types explícitos** em `generate` e `rehydrate`.

### `ids.ts` (barrel)

- ✅ **Comentário no topo (linhas 1-15) explica integralmente o padrão**:
  - Por que não há `import * as` em barrel (colisão de 3 namespaces).
  - Como consumir funções (importar direto do módulo fragmentado).
  - Como consumir tipos (barrel é confortável para `import type { ... }`).
  - Paralelo explícito com `contracts/domain/shared/ids.ts`.
- ✅ **Reexports separados em 4 blocos**: 3 reexports de tipos (linhas 17-19) + 3 reexports de funções prefixadas. Prettier escolheu single-line para `payableIdGenerate/Rehydrate` (linha 21) e multi-line para os outros 2 (linhas 23-31) — variação determinística pelo tamanho do nome, sem inconsistência semântica.
- ✅ **Funções com prefixo** (`payableIdGenerate`, etc.) — evita colisão de nomes nus quando 3 módulos exportam `generate`/`rehydrate`.

### Tests

- ✅ **AAA explícito em comentário** em todos os 33 testes.
- ✅ **Fixtures literais distintas por ID**: `7f3a1234...` (PayableId), `a1b2c3d4...` (RemittanceId), `deadbeef-1234...` (BankTransactionId) — debug fica trivial quando assertion falha (UUID na mensagem identifica o arquivo).
- ✅ **`UUID_V4_REGEX` idêntico em todos os 3 arquivos** — única source-of-truth para o formato.
- ✅ **Cobertura proporcional**: 2 namespace smoke + 2 generate + 6 rehydrate = 10 testes por ID. Boundaries cobertos (empty, non-UUID, v1, trailing whitespace, lowercase, uppercase).
- ✅ **Barrel test (`ids.test.ts`) com 3 testes**: type-level reexport (compile-time), funções prefixadas presentes, ausência de namespace-objetos aninhados (DON'T B§7).
- ✅ **`as unknown as string` no `assert.match(id as unknown as string, regex)`** — pattern correto para "destrandar" o tipo para a API de regex match, sem violar a integridade de Brand em código de produção (só em test).
- ✅ **Sem mocks, sem fakes mágicos** — VOs testados por construção direta.

---

## Checklist explícita aplicada

| Categoria | Resultado |
| :--- | :--- |
| A. Regras absolutas de domínio | ✅ Zero throw/class/this/any/extends Error/let; return types explícitos; sem arrays mutáveis (N/A — sem arrays) |
| B. Smart constructors / Branded | ✅ `generate`/`rehydrate` retornam `Result`/Brand; `as <ID>` só dentro deles; sync, puro; erro é string literal union |
| C. Discriminated unions | N/A — Errors são single-variant string unions |
| D. Ports & Adapters | N/A — VOs de domínio puro |
| E. Modular Monolith | ✅ `domain/shared/` importa apenas de `#src/shared/primitives/*` e `#src/shared/utils/id.ts`; zero cross-module |
| F. ESM / NodeNext / TS moderno | ✅ extensão `.ts` em todos os relativos; `import type` para `Brand`; `type` inline em `{ type Result, ok, err }`; sem require/namespace/enum |
| G. Naming, PT/EN, clareza | ✅ identifiers EN (`PayableId`, `RemittanceId`, `BankTransactionId`); funções no barrel com prefixo do VO; erros kebab-case EN; sem `I`/`Impl` |
| H. Tests | ✅ AAA em comentários; UUIDs literais válidos (não fake-id); cobertura proporcional; sem matchers vagos; sem shadowing |

---

## Observação meta — padrão consolidado

Os 5 tickets já closed-green do módulo `financial` evidenciam **padrão repetível e confiável**:

| Ticket | Tipo | W2 round | Lições propagadas |
| :--- | :--- | ---: | :--- |
| FIN-MODULE-SCAFFOLD | XS | 1 | Padrão D / module-as-namespace |
| FIN-CLI-WIRE | XS | 1 | Comentário ESLint local para `prefer-readonly-parameter-types` |
| FIN-VO-FITID | XS | 1 | `as <Brand>` dentro de smart constructor |
| FIN-IDS-PAYABLE | XS | 1 | Aplicou lição de no-shadow preventivamente |

A **lição do `no-shadow` aplicada preventivamente** neste ticket valida o ciclo de aprendizado do pipeline — o que era 🔵 em FIN-VO-FITID W2 (e virou BLOCKER em W3) foi evitado no design daqui.

---

## Próximo passo

- **APPROVED** → pipeline-maestro avança para **W3** (`ts-quality-checker`).
- Após W3 ALL-GREEN, `pnpm run pipeline:state close FIN-IDS-PAYABLE` (5º ticket FIN).
- **Próximo ticket da fatia:** `FIN-VO-BENEFICIARY-BANK-DATA` (S) — VO composto com `bank`, `agency`, `account` (provavelmente subcomponentes próprios). Sai do regime XS — primeiro ticket S do módulo financial.
