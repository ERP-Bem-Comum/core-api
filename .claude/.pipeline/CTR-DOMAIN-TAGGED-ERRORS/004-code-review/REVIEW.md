# W2 — Code Review read-only — CTR-DOMAIN-TAGGED-ERRORS

> **Reviewer:** skill [`code-reviewer`](../../../skills/code-reviewer/SKILL.md) (pipeline W2 — read-only).
> **Rounds:** 2 (round 1 REJECTED — 11 issues críticas + 4 sugestões; round 2 APPROVED após fixes).
> **Veredito final:** **APPROVED.**
> **Data:** 2026-05-20.
> **Roteado via:** `Agent(contratos-orchestrator)` — protocolo **Opção B**, 3ª de 4 invocações. **Lições aplicadas (executar gates do diff) confirmaram seu valor: Agent W1 declarou GREEN mas W2 detectou 21 erros de gates não rodados.**

---

## Round 1 — ❌ REJECTED (preservado para auditoria)

### Issues 🔴 Críticas (11)

| # | Arquivo:linha | Categoria | Problema |
| :--- | :--- | :--- | :--- |
| 1-4 | `contract.ts` L24-31, `amendment.ts` L26-28, `errors.test.ts` (2 files) | format | Quebras de linha desnecessárias contra Prettier |
| 5 | `cli/formatters/error.ts:152` | lint `no-unnecessary-condition` | `e !== null` é ramo morto após `typeof === 'object'` em `ErrorCode = string \| Readonly<{tag}>` |
| 6 | `amendment.test.ts:48,55,62` | lint `restrict-template-expressions` | `throw new Error(\`fixture broken: ${r.error}\`)` stringifica AmendmentError objeto |
| 7 | `contract.test.ts:52` | idem | idem para ContractError |
| 8 | `create-amendment.test.ts:32` | idem | idem para CreateContractError |
| 9 | `homologate-amendment.test.ts:60,65,81,86` | idem | 4 ocorrências |
| 10-11 | `errors.test.ts:224`, `errors.test.ts:144` (amendment) | lint `array-type` | `ReadonlyArray<T>` → `readonly T[]` |

**Total:** 21 erros eslint + 3 falhas prettier.

### Como round 1 falhou

W1 declarou GREEN mas **não rodou `npx prettier --check` nem `npx eslint`** específicos do diff. Lição CTR-SHARED-BRAND-UNIQUE-SYMBOL ("executar gates, não inferir") foi citada no briefing mas não aplicada pelo subagent W1.

W2 executou os 2 gates conforme briefing reforçado → caught 21 problemas.

---

## Round 2 — ✅ APPROVED (após fixes aplicados)

### Fixes aplicados (regressão para W1)

| Issue | Fix |
| :--- | :--- |
| 1-4 (format) | `npx prettier --write` em 4 arquivos |
| 5 (no-unnecessary-condition) | Simplificado `isTagged`: removido `&& e !== null` e cast `as { tag?: unknown }`; agora `typeof e === 'object' && typeof e.tag === 'string'` |
| 6-9 (template-expressions) | Substituído `${r.error}` por `${JSON.stringify(r.error)}` em 9 sítios |
| 10-11 (array-type) | `ReadonlyArray<T>` → `readonly T[]` em 2 sítios |

### Verificação round 2

```
$ npx prettier --check <9 arquivos do diff>
All matched files use Prettier code style!

$ npx eslint <11 arquivos do diff>
(saída vazia — exit 0)

$ pnpm run typecheck
(saída vazia — exit 0)

$ pnpm test
ℹ tests 595
ℹ pass 582
ℹ fail 0
ℹ skipped 13
```

✅ Todos os gates do diff verdes.

---

## Issues 🟡 Importantes (não-bloqueantes — registradas para futuro)

### P2 — Dicionário com chaves duplas em `formatters/error.ts`

W1 manteve 14+9 entradas kebab-case obsoletas no dicionário ("compat retrô"). Mas o **agregado não emite mais kebab**. As entradas kebab antigas do agregado (`'contract-not-active'`, `'amendment-not-pending'`, etc) são **dead code**.

**Sugestão:** ticket dedicado `CTR-CLI-FORMATTER-CLEANUP-KEBAB-DEAD-CODE` para remover. Manter agora aceita o débito.

### P3 — Asserts defensivos em use case tests

Os 6 asserts migrados em `homologate-amendment.test.ts` / `create-amendment.test.ts` usam guard `typeof r.error === 'object' && 'tag' in r.error` antes do tag check. Hoje os use cases ainda emitem misturado (strings de IDs + tagged de domínio), então a guarda é necessária — mas passa silenciosamente se o predicate é falso.

**Sugestão:** quando `CTR-DOMAIN-STATE-MACHINE-*` migrar errors restantes, eliminar a guarda.

### P4 — Branch inalcançável em `contract.ts:200-206`

A 2ª chamada de `contractPeriodExtensionNotAfterCurrentEnd` no ramo `if (!newPeriod.ok)` é inalcançável dado que as guardas anteriores passaram. Sugere `contractPeriodExtensionInvalidNewPeriod` ou propagar `newPeriod.error`.

---

## Issues 🔵 Sugestões (estilo)

### S1, S2, S3 — registradas no round 1 (omitidas aqui — não-bloqueantes).

---

## Auditoria detalhada — round 2

### `src/modules/contracts/domain/contract/errors.ts`

- ✅ 14 tagged variants `Readonly<{ tag: 'PascalCase', ...payload? }>`.
- ✅ 14 case constructors free functions.
- ✅ 6 com payload de evidência (D23): `ContractNotActive` (currentStatus), `ContractCannotExpireYet` (currentEnd, attemptedAt), `ContractValueWouldGoNegative` (currentValue, attemptedDecrease), `ContractPeriodExtensionNotAfterCurrentEnd`, `ContractAmendmentAlreadyApplied`, `ContractSequentialNumberInvalidFormat`.
- ✅ JSDoc cita DO D§22/§23/§24 + DON'T D§21/§22.
- ✅ Zero namespace-object aninhado.

### `src/modules/contracts/domain/amendment/errors.ts`

- ✅ 9 tagged variants + 9 case constructors.
- ✅ Apenas `AmendmentNotPending` carrega payload (`currentStatus`).

### `src/modules/contracts/domain/contract/contract.ts` (após fix prettier)

- ✅ 14 call sites migrados para `err(ContractError.xxx(...))`.
- ✅ `import * as ContractError from './errors.ts'` (Padrão D).
- ✅ Helpers `assertActive`/`assertValidEventDate` declaram subtipo exato (DO D§24).

### `src/modules/contracts/domain/amendment/amendment.ts` (após fix prettier)

- ✅ 6 call sites migrados.
- ✅ `assertPending` carrega `currentStatus` (D23).

### `src/modules/contracts/cli/formatters/error.ts` (após fix isTagged)

- ✅ `isTagged` simplificado: `typeof e === 'object' && typeof e.tag === 'string'`.
- ✅ Dicionário com chaves duplas (kebab + PascalCase) — débito documentado em P2.

### Test files

- ✅ Prettier-clean em todos.
- ✅ ESLint zero diagnósticos.
- ✅ `JSON.stringify(r.error)` em 9 sítios — resolve `no-base-to-string` + `restrict-template-expressions`.
- ✅ `readonly T[]` em vez de `ReadonlyArray<T>`.

---

## Compliance ADR/CLAUDE.md raiz

- ✅ CLAUDE.md §"Regras invariantes" → Domínio puro: zero throw/class/any.
- ✅ DO D§22: tagged shape flat + free function ctors + Padrão D.
- ✅ DO D§23: payload de evidência em 6+1 invariantes runtime.
- ✅ DO D§24: PascalCase tag + camelCase ctor.
- ✅ DON'T D§21: zero namespace-object aninhado.

---

## Conclusão

**APPROVED round 2.** Todos os gates específicos do diff verdes. As 4 issues importantes (P2/P3/P4 + S1-3) ficam como débito documentado para tickets futuros.

→ **Pronto para W3 — QUALITY GATE.**

---

## Lição operacional consolidada

**3º caso em 5 tickets onde W2 detectou problema que W1 declarou GREEN:**
1. `CTR-SHARED-IMMUTABLE` — W2 deixou passar 3 issues em tests (lição #1).
2. `CTR-SHARED-BRAND-UNIQUE-SYMBOL` — W2 inferiu eslint (round 1 BLOCKED em W3 — lição #2).
3. `CTR-DOMAIN-TAGGED-ERRORS` — **W1 ignorou lições #1 e #2 do briefing**; W2 caught 21 erros em round 1 (este ticket).

**Padrão:** lições não se transferem automaticamente entre subagents. Cada invocação Agent começa "do zero" — briefings precisam **re-explicitar** lições de tickets anteriores. Mesmo briefing reforçado (como neste W1) não garante aplicação — Agent precisa ser instruído em forma de **comando direto** (`Execute: pnpm exec prettier --check ...`) em vez de princípio (`Lição XYZ: executar gates`).

Refinement do protocolo para próximos tickets: W1 deve receber um **checklist de saída** com comandos exatos a rodar antes de declarar GREEN.
