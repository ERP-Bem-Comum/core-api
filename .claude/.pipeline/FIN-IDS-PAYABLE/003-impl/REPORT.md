# W1 — Implementação GREEN (FIN-IDS-PAYABLE)

> **Wave:** W1 · **Outcome:** GREEN · **Agent:** `main-session`
> **Predecessor:** [`../002-tests/REPORT.md`](../002-tests/REPORT.md) (W0 RED)
> **Artefatos criados:** 4 arquivos de produção

---

## 1. Mudanças

| Arquivo | Linhas | Descrição |
| :--- | ---: | :--- |
| `src/modules/financial/domain/shared/payable-id.ts` | 18 | branded UUID v4 `PayableId` (Título Financeiro) |
| `src/modules/financial/domain/shared/remittance-id.ts` | 18 | branded UUID v4 `RemittanceId` (arquivo CNAB de remessa) |
| `src/modules/financial/domain/shared/bank-transaction-id.ts` | 23 | branded UUID v4 `BankTransactionId` (registro de transação bancária) |
| `src/modules/financial/domain/shared/ids.ts` | 30 | barrel — reexporta tipos + funções prefixadas |
| **Total** | **89** | |

### 1.1. Comentário no header de cada ID

Cada arquivo cita o **handbook com linha exata**:
- `payable-id.ts` → `handbook/domain/04-titulos-liquidacao-context.md:17` (`TituloFinanceiro.id: TituloID`).
- `remittance-id.ts` → `handbook/domain/04-titulos-liquidacao-context.md:32` (`rastreabilidade.remessaID`).
- `bank-transaction-id.ts` → `handbook/domain/05-integracao-bancaria-context.md:29` (entidade `TransacaoBancaria`).

`bank-transaction-id.ts` também documenta a **distinção em relação ao FITID**: FITID é o ID do banco; BankTransactionId é o ID que **nós** atribuímos ao persistir.

### 1.2. Imports modernos `#src/*`

Diferente de `src/modules/contracts/domain/shared/contract-id.ts` (que usa paths relativos longos `../../../../shared/...`), os novos arquivos usam o subpath alias `#src/*` declarado em `package.json#imports`. Esta é a forma canônica do projeto (CLAUDE.md §Sintaxe TS) e já tinha sido adotada em `fitid.ts` (FIN-VO-FITID W1).

Não refatoramos o `contract-id.ts` por escopo — fica como dívida técnica futura.

### 1.3. `as <Brand>` aparece restrito a `generate`/`rehydrate`

Cada arquivo tem exatamente 2 ocorrências do `as`:

```
payable-id.ts:15:        const generate = (): PayableId => newUuid() as PayableId;
payable-id.ts:18:          isUuidV4(raw) ? ok(raw as PayableId) : err('payable-id-invalid');
```

(análogo para os outros 2). CA-18 atendida — nenhum `as` fora dos smart constructors.

### 1.4. Barrel `ids.ts`

Padrão idêntico a `contracts/domain/shared/ids.ts`:
- Reexporta **tipos** com nome original (`PayableId`, `PayableIdError`).
- Reexporta **funções com prefixo** do VO (`payableIdGenerate`, `payableIdRehydrate`).
- Comentário no topo explica a regra (Padrão D não permite `import * as` em barrel com 3 namespaces colidindo).
- Cita o paralelo com `contracts/domain/shared/ids.ts` para rastreabilidade.

---

## 2. Verificação

### 2.1. Testes específicos do ticket

```bash
node --test --experimental-strip-types --no-warnings \
  tests/modules/financial/domain/shared/payable-id.test.ts \
  tests/modules/financial/domain/shared/remittance-id.test.ts \
  tests/modules/financial/domain/shared/bank-transaction-id.test.ts \
  tests/modules/financial/domain/shared/ids.test.ts
```

```
ℹ tests 33  suites 10  pass 33  fail 0  duration_ms 137
```

Decomposição:
- `PayableId` (suites + testes): 1 namespace + 2 generate + 6 rehydrate = **10 it** (3 describes)
- `RemittanceId`: idem = **10 it** (3 describes)
- `BankTransactionId`: idem = **10 it** (3 describes)
- `ids.ts` (barrel): **3 it** (1 describe)
- **Total: 33 testes em 10 suites.**

### 2.2. Suite completa

```
ℹ tests 901  pass 885  fail 0  skipped 16  duration_ms 38569
```

| Métrica | W3 do FIN-VO-FITID | W1 deste ticket | Delta |
| :--- | ---: | ---: | ---: |
| tests | 868 | 901 | **+33** |
| pass | 852 | 885 | **+33** |
| fail | 0 | 0 | 0 |
| skipped | 16 | 16 | 0 |

Delta corresponde exatamente aos 33 testes do ticket. **Zero regressão** dos 852 pré-existentes.

---

## 3. Critérios de aceitação (000-request §4)

| # | Critério | Status |
| :--- | :--- | :--- |
| CA-1 | 3 arquivos de produção criados | ✅ §1 |
| CA-2 | Barrel `ids.ts` criado e reexporta | ✅ §1.4 |
| CA-3 | `Brand<string, '<Tag>'>` por ID | ✅ tests passam |
| CA-4 | Error `<id-kebab>-invalid` exato | ✅ tests `rehydrate` validam mensagem literal |
| CA-5 | `generate()` retorna UUID v4 válido | ✅ regex match |
| CA-6 | `generate()` retorna valores distintos | ✅ |
| CA-7 | `rehydrate(v4-lowercase)` ok | ✅ |
| CA-8 | `rehydrate(v4-uppercase)` ok (case-insensitive) | ✅ |
| CA-9 | `rehydrate('')` err | ✅ |
| CA-10 | `rehydrate(v1-uuid)` err | ✅ |
| CA-11 | `rehydrate('not-a-uuid')` err | ✅ |
| CA-12 | Barrel permite `import type { ... }` agregado | ✅ test type-level |
| CA-13 | Barrel exporta com prefixo | ✅ test `payableIdGenerate`, etc. |
| CA-14 | `pnpm run typecheck` | ⏳ W3 |
| CA-15 | `pnpm run format:check` | ⏳ W3 (já roda em pré-Write hook; provável GREEN) |
| CA-16 | `pnpm test` verde | ✅ §2.2 |
| CA-17 | `pnpm run lint` (sem shadowing) | ⏳ W3 |
| CA-18 | `as <ID>` só em `generate`/`rehydrate` | ✅ §1.3 |

---

## 4. Decisões tomadas em W1

- **Padrão `#src/*` em todos os 4 arquivos novos** — consistência com `fitid.ts` e CLAUDE.md §Sintaxe TS. Não refatoramos `contract-id.ts`/`amendment-id.ts`/`document-id.ts` que ainda usam paths relativos (escopo).
- **Header doc cita handbook com linha exata** — auditor rastreável.
- **`bank-transaction-id.ts` documenta distinção vs FITID** — antecipa pergunta de revisor/leitor futuro.
- **Sem otimização prematura** — não tentei fundir os 3 IDs num arquivo só (`ids/index.ts` com 3 factories), nem usar genéricos (`<T>Id<T extends string>`). Os 3 arquivos repetitivos são intencionais — match com padrão validado de contracts, baixo custo de manutenção, alta clareza.

---

## 5. Lição W1 (registrar)

**Prettier reformatou `bank-transaction-id.ts` após Write** (PostToolUse hook). Sem impacto funcional — apenas re-indentação do tipo de retorno do `rehydrate` (quebra de linha multilinha). O fato de o arquivo ter 23 linhas (vs 18 dos outros 2) é exatamente porque o Prettier preferiu quebrar a assinatura:

```ts
export const rehydrate = (
  raw: string,
): Result<BankTransactionId, BankTransactionIdError> =>
  isUuidV4(raw) ? ok(raw as BankTransactionId) : err('bank-transaction-id-invalid');
```

vs. nos outros (caberia em 1 linha):

```ts
export const rehydrate = (raw: string): Result<PayableId, PayableIdError> =>
  isUuidV4(raw) ? ok(raw as PayableId) : err('payable-id-invalid');
```

A diferença é o nome `BankTransactionId` ser mais longo, ultrapassando o `printWidth` do Prettier. Não há discrepância de estilo — apenas variação determinística do formatter.

---

## 6. Pronto para W2

`code-reviewer` deve validar:

1. **Sem shadowing de built-ins** em qualquer dos 4 arquivos de teste (lição do FIN-VO-FITID W3). Verificação rápida: nenhum `const describe =`, `const it =`, `const test =`, `const assert =` em escopo de teste.
2. **`as <ID>` aparece restrito a `generate`/`rehydrate`** — `grep -n "as PayableId\|as RemittanceId\|as BankTransactionId"` deve mostrar exatamente 6 ocorrências (2 por arquivo × 3 arquivos).
3. **Headers citam handbook com linha exata** (rastreabilidade).
4. **Barrel exporta funções prefixadas** (não nomes nus que colidiriam).
5. **Sem `throw`, `class`, `this`, `any`, `extends Error`** nos 4 arquivos.
6. **Imports `#src/*`** em vez de paths relativos longos — consistência com `fitid.ts`.
7. **Fixtures distintas por ID** nos tests — facilita debug.

Envelope XS — review esperada em 1 round.
