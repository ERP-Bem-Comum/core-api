# W2 — Code Review read-only — CTR-SHARED-VO-CANONICAL

> **Reviewer:** skill [`code-reviewer`](../../../skills/code-reviewer/SKILL.md) (pipeline W2 — read-only).
> **Rounds:** 1.
> **Veredito:** **APPROVED.**
> **Data:** 2026-05-20.
> **Roteado via:** `Agent(contratos-orchestrator)` — protocolo **Opção B**, 3ª de 4 invocações.
> **Briefing aplicou 2 lições:**
> - **CTR-SHARED-IMMUTABLE:** audit tests com mesmo rigor de src/.
> - **CTR-SHARED-BRAND-UNIQUE-SYMBOL:** **executar** lint/format específicos do diff, não apenas inferir.
> **Nota de protocolo:** Subagent não escreve em `.claude/.pipeline/*`. Conteúdo devolvido via sumário e escrito por Claude principal.

---

## Verificação automatizada (lição BRAND aplicada — executar)

| Comando | Escopo | Resultado |
| :--- | :--- | :--- |
| `npx prettier --check` | 10 VO files | ✅ "All matched files use Prettier code style!" |
| `npx eslint` | 10 VO files | ✅ zero output, zero errors |
| `npx eslint` | 10 call sites em `src/` | ✅ zero output, zero errors |
| `npx eslint` | 12 test/fixture files do diff | ✅ zero output, zero errors |

## Grep audits (lição IMMUTABLE aplicada — cobrir src + tests)

| # | Padrão | Esperado | Resultado |
| :--- | :--- | ---: | :--- |
| 1 | `^export const \w+ = \{` em `domain/shared/*.ts` | 0 | ✅ |
| 2 | `import { Money }` runtime (não-`type`) | 0 | ✅ |
| 3 | `Object.freeze` em `src/modules/contracts/` | 0 | ✅ |
| 4 | `Money\.zero(` em src/ e tests/ | 0 | ✅ |
| 5 | `import { Period\|ContractId\|AmendmentId\|DocumentId\|UserRef\|BucketName\|StorageKey\|StorageRef }` runtime | 0 | ✅ |

Extra: `throw`/`class`/`extends Error`/`new Error`/`: any` em `domain/shared/*.ts` — **0 hits**.

---

## Surpresas do W1 — auditadas individualmente

### 1. `X.X` namespace-type pattern (2 sítios)

- `homologate-amendment.ts:58` — `const amendmentId: AmendmentId.AmendmentId = amendment.id;`
- `create-amendment.ts:64` — `contractId: ContractId.ContractId,`

**Veredito:** **legítimo e canônico no Padrão D.** Quando `import * as X` traz módulo como namespace runtime, o tipo homônimo só fica como `X.X`. Alternativas (dual import com type alias) preteridas pelo mais legível neste contexto. Conforme entrevista 0001 §B DO§8.

### 2. Dual import em `contract.mapper.ts`

```ts
import * as AmendmentId from '.../amendment-id.ts';                                      // L6
import * as ContractId from '.../contract-id.ts';                                        // L7
import type { AmendmentId as AmendmentIdType } from '.../amendment-id.ts';               // L8
```

**Veredito:** **legítimo.** L84 usa `const homologatedIds: AmendmentIdType[] = []` — sem o alias, anotar o array colidiria com o namespace `AmendmentId` (usado como valor em L86: `AmendmentId.rehydrate(...)`). Padrão "namespace + type-as-alias" é a saída correta no Padrão D quando o mesmo módulo é consumido como valor E como tipo no mesmo arquivo.

### 3. Barrel `ids.ts` ainda consumido por 11 arquivos

Todos os 11 consumidores usam **exclusivamente `import type`** — coerente com o comentário do barrel (L13-14). Padrão D respeitado.

---

## Adesão aos CAs (verificáveis em W2)

| # | Critério | Verificação | Status |
| :--- | :--- | :--- | :--- |
| CA-2 | Zero `export const X = {...}` em `shared/` | grep #1 = 0 | ✅ |
| CA-3 | `Money.ZERO` em vez de `Money.zero()` | grep #4 = 0 + ZERO em 6 sítios | ✅ |
| CA-4 | Smart constructors retornam via `immutable()` | `money.ts:26,34`, `period.ts:35,41`, `storage-ref.ts:46` | ✅ |
| CA-5 | `ids.ts` fragmentado + barrel | 4 arquivos + barrel de 30 LOC | ✅ |
| CA-6 | Zero `import { X }` runtime para os 8 VOs | greps #2 e #5 = 0 | ✅ |
| CA-9 | Zero `throw`/`class`/`any` novo no diff | greps auxiliares + lint verde | ✅ |
| CA-10 | Zero declaration merging | grep #1 = 0 | ✅ |

CA-11/12/13/14 → W3 (já antecipados aqui — verde esperado).

---

## Issues encontradas

### 🔴 Crítica
Nenhuma.

### 🟡 Importante
Nenhuma.

### 🔵 Sugestão (não-bloqueante)

#### Sug-1 — `contract.mapper.ts:8` — comentário explicando dual import

O padrão `import * as X` + `import type { X as XType }` é correto mas não-óbvio. Uma linha de comentário ajudaria leitor futuro:

```ts
// Dual import (Padrão D): namespace runtime + type alias para evitar colisão
// com o namespace quando o tipo é usado em anotação de array (L84).
import type { AmendmentId as AmendmentIdType } from '.../amendment-id.ts';
```

Não-bloqueante. Pode entrar em ticket futuro de docs/idioma.

#### Sug-2 — `ids.ts` lista de fontes inline

O barrel já documenta o uso esperado (L7-13). Acrescentar tabela `// type-source: contract-id.ts | amendment-id.ts | …` ajudaria navegação. Não-bloqueante.

---

## O que está bom

- **Padrão D aplicado uniformemente** nos 7 VOs — todos têm o mesmo cabeçalho citando §B DO§8 + uso esperado.
- **`Money.ZERO`** corretamente substituído em todos os 6 sítios (4 em `money.test.ts`, 2 em `amendment.test.ts`).
- **`UserRef` sem `generate`** — decisão correta documentada no próprio arquivo. Coerência com ADR-0014.
- **`bucket-name.ts` e `storage-key.ts` corretamente não usam `immutable()`** — strings são primitivas, comentário explícito.
- **`storage-ref.ts:46`** retorna `immutable(...)` sem cast — TS infere `Readonly<{...}>`.
- **Exhaustive switch em `period.ts:47-52`** sem `default` — TS pega via `noFallthroughCasesInSwitch`.
- **`homologate-amendment.ts:68-71`** usa o idioma canônico `const _exhaustive: never = amendment; return _exhaustive;` — anti-padrão #7 do CLAUDE.md respeitado.
- **Suite verde +31 tests** vs baseline — refator big-bang sem perda de cobertura.

---

## Veredito final

**APPROVED.** Diff massivo (7 VOs + 4 arquivos novos + 20 call sites) auditado tanto via execução de gates quanto via greps de invariantes. Zero issues bloqueantes. As 2 sugestões 🔵 são melhorias estilísticas para tickets futuros.

→ **Pronto para W3.** Esperado verde já antecipado em todas as 4 dimensões (typecheck/format/test/lint).
