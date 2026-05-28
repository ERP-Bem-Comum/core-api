# W2 — Code Review read-only — CTR-SHARED-BRAND-UNIQUE-SYMBOL

> **Reviewer:** skill [`code-reviewer`](../../../skills/code-reviewer/SKILL.md) (pipeline W2 — read-only).
> **Rounds:** 1.
> **Veredito:** **APPROVED.**
> **Data:** 2026-05-20.
> **Roteado via:** `Agent(contratos-orchestrator)` — protocolo **Opção B**, 3ª de 4 invocações.
> **Briefing W2:** explicitamente exigiu **auditar test file com mesmo rigor de src/** (lição da W2 do `CTR-SHARED-IMMUTABLE`). Cumprido linha-a-linha.
> **Nota de protocolo:** Subagent não escreve em `.claude/.pipeline/*`. Conteúdo devolvido via sumário e escrito por Claude principal.

---

## Sumário do diff

| Arquivo | Ação | LOC | Risco |
| :--- | :--- | :---: | :---: |
| `src/shared/brand.ts` | Reescrita (3 → 30 LOC) | +27 | Baixo (API estável) |
| `src/shared/index.ts` | Edição (1 linha) | 0 | Nulo |
| `tests/shared/brand.test.ts` | Criação | +212 | N/A (test) |

---

## Issues encontradas

### 🔴 Crítica (bloqueia approval)

**Nenhuma.**

### 🟡 Importante (não-bloqueia)

**Nenhuma.**

### 🔵 Sugestão (estilo / clareza — endereçar em ticket futuro, OPCIONAL)

#### Sugestão 1 — `tests/shared/brand.test.ts:97-101`

**Categoria:** clareza.
**Observação:** O JSDoc de bloco do CA-6 menciona o pattern `extends never ? true : false`, mas não explica POR QUE a tupla wrapper `[X]` (L106/117/128) é necessária. Leitor não-versado em TypeScript pode interpretar como ruído sintático.

**Contexto técnico:** sem `[...]`, `never extends never ? true : false` distribui sobre o union vazio e retorna `never` em vez de `true` (TypeScript Handbook §"Distributive Conditional Types"). A tupla previne distribuição.

**Fix sugerido (opcional, futuro):** adicionar 1 linha explicando. Pode ir junto com `CTR-SHARED-VO-CANONICAL` quando o pattern for reutilizado.

```ts
// Tupla [X] evita distributividade de conditional sobre `never` —
// sem ela, `never extends never` retorna `never` em vez de `true`.
type IsNever = [BrandOf<string>] extends [never] ? true : false;
```

---

## Auditoria detalhada (linha-a-linha)

### `src/shared/brand.ts`

| Verificação | Resultado |
| :--- | :---: |
| Zero `throw`, `class`, `this`, `any`, `extends Error` | ✅ |
| Zero `let` reatribuído / `.push`/`.splice` | ✅ (puro tipo) |
| `declare const __brand: unique symbol` — pattern idiomático canônico | ✅ |
| `naming-convention` aceita `__brand` (`leadingUnderscore: 'allow'`) | ✅ |
| `Brand<T, K extends string>` exportado com assinatura exata | ✅ |
| `BrandOf<B>` exportado com `B extends { readonly [__brand]: infer K } ? K : never` | ✅ |
| JSDoc cita entrevista 0001 §Bloco B (DO §11, DON'T §12, CONSIDER §3) | ✅ |
| Nota "USO RESTRITO: VOs folha — nunca agregados" (Bloco A DON'T §1) | ✅ |
| Prettier (visual): printWidth 100 / singleQuote / semi / indent 2 / LF | ✅ |

### `src/shared/index.ts`

| Verificação | Resultado |
| :--- | :---: |
| `export type { Brand, BrandOf } from './brand.ts';` | ✅ |
| `.ts` em import relativo (NodeNext + `allowImportingTsExtensions`) | ✅ |
| `export type` (`verbatimModuleSyntax` + `consistent-type-exports`) | ✅ |
| Outras 4 linhas intactas (sem regressão) | ✅ |

### `tests/shared/brand.test.ts` — auditoria anti-tangencial

| Verificação | Resultado |
| :--- | :---: |
| Estrutura AAA explícita em todos os 12 `it` | ✅ |
| `import { describe, it } from 'node:test'` (Node 24) | ✅ |
| `import { strict as assert } from 'node:assert'` (strict idiomático) | ✅ |
| `import type { Brand, BrandOf } from '#src/shared/brand.ts'` (subpath + `import type` + `.ts`) | ✅ |
| Cobertura CA-1 (smoke import): L41-53 | ✅ |
| Cobertura CA-5 a/b/c (extração K): L63-94 | ✅ |
| Cobertura CA-6 a/b/c (não-brandado → never): L104-135 | ✅ |
| Cobertura estrutura nominal (5 invariantes extras): L146-211 | ✅ |
| Triangulation Beck (3 formatos T por CA) | ✅ |

**Casts auditados linha-a-linha:**

| Linha | Cast | Justificativa | Veredito |
| :---: | :--- | :--- | :---: |
| L47 | `'value' as _SmokeBrand` | Smoke test sem smart constructor | ✅ |
| L152 | `raw as ContractIdLike` | Setup direto (em prod viria do smart ctor) | ✅ |
| L165 | `raw as MoneyLike` | Idem | ✅ |
| L175 | `'CTR-001' as ContractIdLike` | Idem | ✅ |
| L193 | `raw as ContractIdLike` | Documenta a invariante (comentário L191) | ✅ |
| L203 | `'CTR-001' as ContractIdLike` | Setup de não-intercambialidade | ✅ |
| L207 | `contractId as unknown as AmendmentIdLike` | **ÚNICO cast duplo** — justificado in-line (L205-206), mínimo necessário (brands distintos exigem ponte `unknown`) | ✅ |

**ESLint rules ativas em `tests/**`** (linhas 240-260 do `eslint.config.js`) — todas conformes:

| Regra | Status |
| :--- | :---: |
| `no-explicit-any` | ✅ |
| `no-restricted-syntax` (class) | ✅ |
| `consistent-type-imports` | ✅ |
| `no-import-type-side-effects` | ✅ |
| `no-unused-vars` (com `^_` ignorePattern) | ✅ (aliases `_SmokeBrand`, `_SmokeExtract` ignorados) |
| `no-shadow` | ✅ |
| `prefer-const`, `no-var` | ✅ |
| `consistent-type-assertions` (estilo `as`) | ✅ |
| `no-confusing-void-expression` | ✅ (N/A — sem void returns atribuídos) |

**Prettier-compliance visual:**

| Regra | Verificação |
| :--- | :---: |
| `printWidth: 100` | ✅ (linha mais longa L207 ≈ 78 cols) |
| `singleQuote: true` | ✅ |
| `semi: true` | ✅ |
| `tabWidth: 2`, `useTabs: false` | ✅ |
| `bracketSpacing: true` | ✅ |
| Sem `assert.throws` expandido multilinha | ✅ (não há `assert.throws` no arquivo) |

**Patterns type-level avançados:**

| Pattern | Linhas | Status |
| :--- | :---: | :---: |
| `BrandOf<Brand<T, K>>` com 3 formatos T | L63-94 | ✅ Triangulation |
| `[X] extends [never] ? true : false` (tupla anti-distributividade) | L106/117/128 | ✅ Idiomático |
| Covariância no T (`Brand<T, K>` → `T` sem cast) | L172-183 | ✅ |
| Não-covariância oposta (T → Brand exige cast) | L185-197 | ✅ |
| Brands com K distintos não intercambiáveis | L199-211 | ✅ |

---

## CAs fechados nesta wave (W2)

- ✅ **CA-8** — `shared/index.ts` reexporta `Brand` e `BrandOf` (ambos como `type`).
- ✅ **CA-9** — Zero `throw`, `class`, `any` no diff.

CA-10 a CA-13 ficam para W3.

---

## O que está bom

1. **JSDoc da fonte** cita entrevista 0001 §Bloco B com DO §11, DON'T §12, CONSIDER §3 + nota "USO RESTRITO: VOs folha, nunca agregados". Rastreabilidade exemplar.
2. **`@example` no `BrandOf`** documenta os 3 casos críticos.
3. **Triangulation Beck honrada no test file** — impede fake-it.
4. **JSDoc do test file** (L1-28) explica fail-by-absence, mecânica de assert type-level e a estrutura escolhida.
5. **Lição CTR-SHARED-IMMUTABLE internalizada** — todos os casts têm justificativa in-line; pattern `[X] extends [never]` é idiomático; Prettier-compliance visual conferida. W3 deve passar limpo.
6. **API pública estável** — renomeação interna invisível aos 10 consumidores.

---

## Próximo passo

- **APPROVED.** Pipeline avança para **W3 (QUALITY)**.
- Expectativa W3: verde sem fix loops. Diff é maduro e os pontos sensíveis foram revisados explicitamente nesta wave.
