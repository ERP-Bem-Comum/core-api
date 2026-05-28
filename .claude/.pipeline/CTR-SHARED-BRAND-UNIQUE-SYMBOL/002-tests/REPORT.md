# W0 — RED Report — CTR-SHARED-BRAND-UNIQUE-SYMBOL

> **Status:** ✅ RED canônico atingido (via `tsc --noEmit`, não via test runner — ver §"Observação crítica").
> **Skill:** [`tdd-strategist`](../../../skills/tdd-strategist/SKILL.md) + ref [`typescript-language-expert`](../../../agents/typescript-language-expert.md).
> **Data:** 2026-05-20.
> **Roteado via:** `Agent(contratos-orchestrator)` — protocolo **Opção B**, 1ª de 4 invocações.
> **Nota de protocolo:** Subagent criou o test file mas não escreve em `.claude/.pipeline/*`. Conteúdo devolvido via sumário e escrito por Claude principal.

---

## Artefato criado

- **Arquivo:** `tests/shared/brand.test.ts` (212 LOC).
- AAA explícito em cada `it`, zero `throw`/`class`/`any`/`let` reatribuído.
- Imports: subpath `#src/shared/brand.ts` (NodeNext) + `node:test` + `node:assert/strict`.
- `import type { Brand, BrandOf }` (são tipos puros).

## Estrutura

4 `describe` × 12 `it`:

1. `shared/brand.ts — exports` — 1 `it` (smoke compile-time: importa `Brand` e `BrandOf`).
2. `BrandOf — extrai o literal K de tipos brandados` — 3 `it` (CA-5a/b/c).
3. `BrandOf — retorna never em tipos não-brandados` — 3 `it` (CA-6a/b/c).
4. `Brand — estrutura nominal e comportamento runtime` — 5 `it` (covariância no T, runtime `typeof`, brands distintos não-intercambiáveis).

## Mapeamento CA → cenário

| CA | Onde | Tipo |
| :--- | :--- | :--- |
| CA-1 (RED via importação) | `exports > re-importa Brand e BrandOf` | structural (TS2724) |
| CA-5a (`BrandOf<Brand<number, 'Foo'>>` ≡ `'Foo'`) | `BrandOf > CA-5a` | type-level + runtime |
| CA-5b (`BrandOf<Brand<string, 'ContractId'>>` ≡ `'ContractId'`) | `BrandOf > CA-5b` | type-level + runtime |
| CA-5c (`BrandOf<Brand<{ readonly cents: number }, 'Money'>>` ≡ `'Money'`) | `BrandOf > CA-5c` | type-level + runtime |
| CA-6a (`BrandOf<string>` ≡ `never`) | `BrandOf never > CA-6a` | type-level (TS2322 em estado atual) |
| CA-6b (`BrandOf<number>` ≡ `never`) | `BrandOf never > CA-6b` | type-level |
| CA-6c (`BrandOf<{ value: number }>` ≡ `never`) | `BrandOf never > CA-6c` | type-level |
| Estrutura nominal (5 it's adicionais) | `Brand — estrutura nominal` | regression guards |

## Saída de execução (RED)

**Árbitro do RED:** `tsc --noEmit` (não o test runner — ver §"Observação crítica").

```
$ pnpm run typecheck

tests/shared/brand.test.ts(33,22): error TS2724: '"#src/shared/brand.ts"' has no exported member named 'BrandOf'. Did you mean 'Brand'?
tests/shared/brand.test.ts(109,11): error TS2322: Type 'true' is not assignable to type 'false'.
tests/shared/brand.test.ts(120,11): error TS2322: Type 'true' is not assignable to type 'false'.
tests/shared/brand.test.ts(131,11): error TS2322: Type 'true' is not assignable to type 'false'.

ELIFECYCLE  Command failed with exit code 2.
```

**Interpretação Beck-canônica:**

1. **TS2724** (L33) — fail-by-absence puro: o módulo `#src/shared/brand.ts` não exporta `BrandOf` ainda.
2. **TS2322 ×3** (L109/120/131) — cascata: como `BrandOf` cai em `any`/erro, a checagem `[X] extends [never] ? true : false` resolve incorretamente e `const isNever: false = true;` rejeita.

Quando W1 adicionar `BrandOf<B>` corretamente, os 4 erros TS desaparecem juntos.

## ⚠️ Observação crítica (descoberta da wave)

**`node --test --experimental-strip-types` NÃO executa typecheck.** O strip-types do Node 24 apenas apaga as anotações de tipo sem rodar o compilador. Resultado:

```
$ node --test --experimental-strip-types --no-warnings tests/shared/brand.test.ts
ℹ tests 12 ℹ pass 12 ℹ fail 0
```

O test runner passa verde **mesmo com type errors no arquivo**. Para tickets puramente type-level (como este), **`tsc --noEmit` é o árbitro do RED**, não o test runner.

**Implicação para W3:** combinação dos dois gates é o que prova RED→GREEN em features type-level:
- `pnpm run typecheck` — vermelho hoje, alvo verde após W1.
- `pnpm test` — verde hoje em runtime (asserts rodam), continua verde após W1.

Este ponto vai ser registrado em STATE.md como lição operacional permanente.

## Triangulation (impede fake-it na W1)

`BrandOf<B>` não pode ser hardcoded — a impl tem que ser a real:

- **CA-5a/b/c** exigem 3 literais distintos (`'Foo'`, `'ContractId'`, `'Money'`) extraídos de 3 formatos de T diferentes. `type BrandOf<B> = 'Foo'` reprova CA-5b/c.
- **CA-6a/b/c** exigem `never` em 3 tipos não-brandados. `type BrandOf<B> = K` (sem conditional) reprova todos.

Única impl que passa simultaneamente é a canônica do ticket:
```ts
export type BrandOf<B> = B extends { readonly [__brand]: infer K } ? K : never;
```

## Compliance (lição aplicada do CTR-SHARED-IMMUTABLE)

- ✅ AAA literal em todos os 12 `it`.
- ✅ `import type { Brand, BrandOf }` (verbatimModuleSyntax).
- ✅ Subpath `#src/shared/brand.ts`.
- ✅ Zero `throw`, `class`, `any`, `let` reatribuído.
- ✅ Zero `// @ts-expect-error` — RED é via mismatch real, não via supressão.
- ✅ Zero `assert.throws` em forma expandida (não foi usado).
- ✅ Único cast `as unknown as` em "brands distintos não-intercambiáveis" — documentado in-line como invariante nominal.
- ✅ Asserts type-level via valor concreto (`const extracted: BrandOf<X> = 'X'`) + `assert.equal` em runtime.
- ✅ Prettier-compliant antecipadamente.

## Critérios de saída W0

- [x] Test file existe e estruturalmente correto.
- [x] `tsc --noEmit` falha por inexistência de `BrandOf` (TS2724) + cascata em conditional types (TS2322).
- [x] Cobertura dos CAs 1, 5a/b/c, 6a/b/c.
- [x] AAA literal.
- [x] Nenhuma linha de `src/` tocada.

→ **Pronto para W1.**

---

## Handoff para W1

**Estado atual** (`src/shared/brand.ts`, 3 LOC):
```ts
declare const brand: unique symbol;
export type Brand<T, Tag extends string> = T & { readonly [brand]: Tag };
```

**Mínimo para passar W0:**
1. Renomear `brand → __brand` (CA-3) e `Tag → K` (CA-4).
2. Adicionar `export type BrandOf<B> = B extends { readonly [__brand]: infer K } ? K : never;` (CA-2).
3. Atualizar `src/shared/index.ts` para `export type { Brand, BrandOf } from './brand.ts';` (CA-8).
4. Adicionar JSDoc citando §Bloco B DO §11 / DON'T §12 / CONSIDER §3.

**Critério de saída W1:** `pnpm run typecheck` verde + `pnpm test` continua verde (≥ 509 tests).
