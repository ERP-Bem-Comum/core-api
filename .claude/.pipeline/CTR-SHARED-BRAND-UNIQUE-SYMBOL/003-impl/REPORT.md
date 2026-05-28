# W1 — GREEN Report — CTR-SHARED-BRAND-UNIQUE-SYMBOL

> **Status:** ✅ GREEN canônico. Todos os 4 erros TS da W0 resolvidos; suite completa 521/508/0/13; 10 consumidores intactos.
> **Skill:** [`ts-domain-modeler`](../../../skills/ts-domain-modeler/SKILL.md).
> **Data:** 2026-05-20.
> **Roteado via:** `Agent(contratos-orchestrator)` — protocolo **Opção B**, 2ª de 4 invocações.
> **Nota de protocolo:** Subagent não escreve em `.claude/.pipeline/*`. Conteúdo devolvido via sumário e escrito por Claude principal.

---

## Artefatos modificados

| Arquivo | Ação | LOC antes | LOC depois |
| :--- | :--- | :---: | :---: |
| `src/shared/brand.ts` | Reescrita completa | 3 | 30 (com JSDoc) |
| `src/shared/index.ts` | 1 linha editada | 7 | 7 |

### `src/shared/brand.ts` — estado final

```ts
/**
 * Marcação nominal de tipos (Brand types / nominal typing).
 *
 * Origem: handbook/interviews/0001-functional-ddd-domain-refresh.md §Bloco B
 *   - DO B§11: shared/brand.ts modernizado: unique symbol global + literal K.
 *   - DON'T B§12: declare const brand espalhado em cada arquivo de VO — centraliza aqui.
 *   - CONSIDER B§3: BrandOf<T> útil em testes/diagnóstico.
 *
 * USO RESTRITO: apenas VOs folha (Money, Period, ContractId, etc).
 * NUNCA em agregados — vide Bloco A DON'T §1 do master doc.
 */
declare const __brand: unique symbol;

export type Brand<T, K extends string> = T & { readonly [__brand]: K };

export type BrandOf<B> = B extends { readonly [__brand]: infer K } ? K : never;
```

(JSDoc específico de cada export omitido aqui — preservado no arquivo.)

### `src/shared/index.ts` — diff

```diff
-export type { Brand } from './brand.ts';
+export type { Brand, BrandOf } from './brand.ts';
```

---

## Mudanças aplicadas vs estado-alvo

| Item | Antes | Depois | Aplicado |
| :--- | :--- | :--- | :---: |
| Símbolo interno | `brand` | `__brand` | ✅ |
| Type param de `Brand` | `Tag extends string` | `K extends string` | ✅ |
| Helper `BrandOf<B>` | ausente | `B extends { readonly [__brand]: infer K } ? K : never` | ✅ |
| JSDoc citando entrevista 0001 §Bloco B | ausente | DO §11 + DON'T §12 + CONSIDER §3 + nota de uso restrito | ✅ |
| `index.ts` reexporta `BrandOf` | não | sim, como `type` | ✅ |

---

## Verificação obrigatória — execução

### `pnpm run typecheck`

```
$ pnpm run typecheck
(saída vazia — zero erros, exit 0)
```

Os 4 erros da W0 (TS2724 em L33 + cascata TS2322 em L109/L120/L131) desapareceram simultaneamente — sintoma da impl correta.

### `node --test tests/shared/brand.test.ts`

```
ℹ tests 12
ℹ suites 4
ℹ pass 12
ℹ fail 0
```

### `pnpm test` (suite completa)

```
ℹ tests 521
ℹ suites 174
ℹ pass 508
ℹ fail 0
ℹ skipped 13
ℹ duration_ms 50333
```

521 = 509 (baseline pós CTR-SHARED-IMMUTABLE) + 12 (novos do `brand.test.ts`). Conferência exata. Zero regressão nos 10 consumidores de `Brand<T, K>`.

---

## CAs fechados em W1

- ✅ **CA-2** — assinaturas exatas exportadas.
- ✅ **CA-3** — `__brand` renomeado.
- ✅ **CA-4** — `K` renomeado.
- ✅ **CA-5** (a/b/c) — `BrandOf<Brand<*, K>>` extrai `K` (3/3 it pass).
- ✅ **CA-6** (a/b/c) — `BrandOf<não-brandado>` é `never` (3/3 it pass).
- ✅ **CA-7** — 10 consumidores compilam (typecheck verde).
- ✅ **CA-8** — `index.ts` reexporta `BrandOf` (aplicado já em W1).
- ✅ **CA-10** — `pnpm run typecheck` verde (verificado nesta wave).
- ✅ **CA-12** — `pnpm test` verde com 521 tests.

CA-9, CA-11, CA-13 ficam para W2/W3.

---

## Por que GREEN é mínimo (Beck-canônico)

A impl aplicada é a única que passa simultaneamente as 6 verificações de `BrandOf`:

```ts
export type BrandOf<B> = B extends { readonly [__brand]: infer K } ? K : never;
```

Alternativas reprovadas:
- `type BrandOf<B> = 'Foo'` — passa CA-5a, reprova CA-5b/c (literais distintos).
- `type BrandOf<B> = K` — não tipa (K não está em escopo).
- `type BrandOf<B> = string` — reprova CA-5 (não é literal exato) e CA-6 (não é never).

Os 5 `it`'s adicionais de "estrutura nominal" (covariância no T, sentido oposto exige cast, brands distintos não-intercambiáveis) só passam com a estrutura `T & { readonly [__brand]: K }` exata.

---

## Compliance com CLAUDE.md raiz

- ✅ Zero `throw` em `src/shared/brand.ts` (puro tipo, sem runtime).
- ✅ Zero `class`, `this`, `any`.
- ✅ `import type { Brand, BrandOf }` no `index.ts` (verbatimModuleSyntax).
- ✅ `.ts` em imports relativos (NodeNext).
- ✅ Identificadores EN; JSDoc PT.
- ✅ Zero `let` reatribuído.

---

## Handoff para W2 — foco crítico (lição CTR-SHARED-IMMUTABLE)

Auditar o test file com o **mesmo rigor** de `src/`. Pontos sensíveis em `tests/shared/brand.test.ts`:

1. **L207** — `as unknown as AmendmentIdLike` único cast duplo; documentado in-line.
2. **Pattern `[X] extends [never] ? true : false`** (L106, L117, L128) — tupla wrapper evita distributividade de conditional types. Verificar justificativa via JSDoc.
3. **`const branded = 'value' as _SmokeBrand` (L47)** — cast simples; verificar se `@typescript-eslint/consistent-type-assertions` não reclama.
4. **Format Prettier** antecipar quebras (W3 ainda valida formalmente).

→ **Pronto para W2 (REVIEW read-only).**
