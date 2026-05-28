# W2 — Code Review read-only — CTR-DOMAIN-DEBRAND-AGG

> **Reviewer:** skill [`code-reviewer`](../../../skills/code-reviewer/SKILL.md) (pipeline W2 — read-only).
> **Rounds:** 1.
> **Veredito:** **APPROVED.**
> **Data:** 2026-05-20.
> **Roteado via:** `Agent(contratos-orchestrator)` — protocolo **Opção B**, 3ª de 4 invocações.
> **Lições acumuladas aplicadas:** (1) audit tests com rigor; (2) executar gates do diff; (3) prettier + eslint específicos antes de marcar APPROVED.
> **Nota de protocolo:** Subagent não escreve em `.claude/.pipeline/*`. Conteúdo devolvido via sumário.

---

## Escopo do diff

| Arquivo | Tipo |
| :--- | :--- |
| `src/modules/contracts/domain/contract/types.ts` | Reescrita (Brand removido + helper) |
| `src/modules/contracts/domain/amendment/types.ts` | Reescrita (Brand removido + helper) |
| `src/modules/contracts/domain/contract/contract.ts` | 7 casts removidos + 6 transições via `updateContract` |
| `src/modules/contracts/domain/amendment/amendment.ts` | 3 casts removidos + 2 transições via `updateAmendment` |
| `tests/modules/contracts/domain/contract/contract.test.ts` | +7 it's W0 |
| `tests/modules/contracts/domain/amendment/amendment.test.ts` | +5 it's W0 |

---

## Gates executáveis (não inferidos — lição BRAND)

| Gate | Comando | Resultado |
| :--- | :--- | :---: |
| Format dos 6 arquivos | `npx prettier --check ...` | ✅ "All matched files use Prettier code style!" |
| Lint dos 6 arquivos | `npx eslint ...` | ✅ Exit 0, zero output |
| Zero `Brand<` em `types.ts` executável | grep -v JSDoc/comentário | ✅ 0 hits |
| Zero `as unknown as ContractEntity\|AmendmentEntity` executável | grep -v JSDoc/comentário | ✅ 0 hits |
| Zero `Object.freeze` direto em agregados | grep -v JSDoc/comentário | ✅ 0 hits |
| Casts estreitos `as Amendment\|as AmendmentEntity` | grep | ✅ 2 executáveis, justificados in-line |
| Zero `throw`/`class` em domain executável | grep -v comentário | ✅ 0 hits |

---

## Issues encontradas

### 🔴 Crítica
Nenhuma.

### 🟡 Importante
Nenhuma.

### 🔵 Sugestão
Nenhuma. Diff cirúrgico — cumpre integralmente o escopo do request.

---

## Auditoria detalhada

### `src/modules/contracts/domain/contract/types.ts`

- ✅ **Brand removido.** `export type Contract = Readonly<{...}>` puro.
- ✅ JSDoc cita ratio legis (DO A§1, DON'T A§1) — rastreabilidade ao master doc.
- ✅ `ContractImmutableField` lista os 7 campos invariantes pós-criação.
- ✅ `ContractUpdate = Partial<Omit<Contract, ContractImmutableField>>` type-safe em compile time.
- ✅ `updateContract` usa `immutable()` facade. Retorno tipado como `Contract` **sem cast** — ganho técnico central.

### `src/modules/contracts/domain/amendment/types.ts`

- ✅ Brand removido. `Amendment = AmendmentBase & AmendmentVariant`.
- ✅ `AmendmentImmutableField` inclui `kind`/`impactValue`/`newEndDate` — variant não editável.
- ✅ `updateAmendment` documenta cast `as Amendment` (JSDoc + inline). Justificativa correta: spread sobre discriminated union perde narrowing — limitação conhecida do TS, não falha de modelagem. Cast estreito (não `as unknown as`).

### `src/modules/contracts/domain/contract/contract.ts`

- ✅ **`Contract.create`** retorna `immutable({...})` com `'Active' as const` + `[] as readonly never[]` — TS infere `Contract` **sem cast** (7º cast eliminado).
- ✅ **6 transições** (`expire`, `terminate`, 4 branches de `applyHomologatedAdjustment`) usam `updateContract(contract, { ... })`.
- ✅ Switch exhaustivo sem `default` em `applyHomologatedAdjustment` — comentário documenta intencionalidade.

### `src/modules/contracts/domain/amendment/amendment.ts`

- ✅ **`Amendment.create`**: if-chain envolvida em `immutable(...)` + cast estreito `as AmendmentEntity` (NÃO `as unknown as`). Comentário in-line justifica.
- ✅ **`attachSignedDocument`/`homologate`** usam `updateAmendment(amendment, { ... })`.

### Test files (+12 it's W0)

**`contract.test.ts`:**
- ✅ Bloco "Contract — desbrandado": 2 it's verificam runtime ausência de `__brand` + compatibilidade estrutural.
- ✅ Bloco "updateContract — helper canônico": 5 it's cobrindo export, imutabilidade, merge, `Object.isFrozen` (CA-9), patch parcial.

**`amendment.test.ts`:**
- ✅ Bloco "Amendment — desbrandado": 1 it.
- ✅ Bloco "updateAmendment — helper canônico": 4 it's incluindo **preservação da discriminated union** — valida em runtime exatamente o invariante que o cast estreito reafirma.

Todos AAA literal explícito. Fixtures via `createActive()`/`createAddition()` helpers. UUIDs válidos (`VALID_UUID`).

---

## Compliance categórica

| Categoria | Status |
| :--- | :---: |
| A — Regras absolutas do domínio (zero throw/class/any/this/let-reassign) | ✅ |
| B — Brand apenas em VOs folha (agregados desbrandados) | ✅ |
| C — Discriminated unions + exhaustiveness (sem `default: throw`) | ✅ |
| F — ESM/NodeNext (`.ts` em imports, `import type`) | ✅ |
| G — Naming (status EN, errors EN kebab) | ✅ |
| H — Tests (AAA, fakes injetáveis, UUIDs válidos) | ✅ |

## Compliance ADR/CLAUDE.md raiz

- ✅ **CLAUDE.md §"Regras invariantes" → Domínio puro:** zero throw/class/any.
- ✅ **DO A§4** (master doc): helpers canônicos introduzidos.
- ✅ **DON'T A§1:** Brand removido dos agregados.
- ✅ **DON'T A§2:** 10/10 ocorrências de `as unknown as Entity` eliminadas.
- ✅ **CTR-SHARED-IMMUTABLE (DO B§10):** `immutable()` facade — zero `Object.freeze` direto.

---

## O que está bom

1. **Diferenciação `Contract` vs `Amendment`:** Contract.create sem cast (TS infere via `'Active' as const`); Amendment.create com cast estreito documentado (limitação TS sobre `?:` em discriminated union). Forma idiomática.
2. **JSDoc cita master doc literal** — rastreabilidade direta da decisão arquitetural ao código.
3. **`ContractImmutableField`/`AmendmentImmutableField` em compile time** — não é convenção, é o type system enforçando.
4. **Teste "preserva discriminated union"** valida em runtime o invariante que o cast estreito reafirma — coerência completa entre spec/test/impl.
5. **Comentário "Sem ramo `default` com `throw`"** em `contract.ts:191-193` antecipa revisor.

---

## Próximo passo

→ **W3 — QUALITY** (gate final):
- `pnpm run typecheck` (CA-11)
- `pnpm run format:check` (CA-12)
- `pnpm test` (CA-13) — esperado 564/551/0/13
- `pnpm run lint` (CA-14)

**Expectativa: verde round 1** — gates específicos já confirmados nesta wave.
