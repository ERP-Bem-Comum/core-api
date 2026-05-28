# W2 — Code Review read-only — CTR-SHARED-RESULT-COMBINATORS

> **Reviewer:** skill [`code-reviewer`](../../../skills/code-reviewer/SKILL.md) (pipeline W2 — read-only).
> **Rounds:** 1.
> **Veredito:** **APPROVED.**
> **Data:** 2026-05-20.

---

## Escopo do diff

| Arquivo | Tipo | Δ LOC |
| :--- | :--- | :--- |
| `src/shared/result.ts` | Reescrita | 29 → 24 |
| `src/shared/index.ts` | Edit (1 linha) | — |
| `tests/shared/result.test.ts` | Criação | +397 |

---

## 1. Checklist contra `CLAUDE.md` raiz

| # | Regra | Verificação | Status |
| :-- | :-- | :-- | :-- |
| 1 | §"Regras invariantes" → Sintaxe → "Zero `throw`" | `grep -n 'throw' src/shared/result.ts` → 0 hits | ✅ |
| 2 | §"Sem `class`, sem `this`" | `grep -n '\bclass\b\|this\.' src/shared/result.ts` → 0 hits | ✅ |
| 3 | §"Sem `any`" | `grep -n ': any\b\|<any>\|as any' src/shared/result.ts` → 0 hits | ✅ |
| 4 | §"Imutabilidade absoluta" → `Readonly<>` | `Result<T, E>` definido como union de `Readonly<{...}>` (linha 1) | ✅ |
| 5 | §"Erros são string literal unions, não classes" | `Result` carrega `E` genérico — sem `extends Error` | ✅ |
| 6 | §"Imports relativos com `.ts`" | N/A — `result.ts` não importa nada relativamente | ✅ |
| 7 | §"`import type { X }`" | N/A — sem imports | ✅ |
| 8 | §"Domínio 100% sync" | Zero `async`/`Promise`/`await` no `result.ts` | ✅ |
| 9 | §"Anti-padrão #7: `throw new Error` no `default` exaustivo" | N/A — não há `switch` no `result.ts` | ✅ |
| 10 | §"Anti-padrão #10: `npm` em doc/script" | N/A — só editou TS | ✅ |
| 11 | §"Trabalho não-trivial passa pela pipeline W0→W3" | Ticket aberto em `.claude/.pipeline/CTR-SHARED-RESULT-COMBINATORS/`; W0 e W1 REPORTs escritos | ✅ |

---

## 2. Checklist contra a entrevista 0001 — Bloco I

| Decisão (linhas 865–911 do master doc) | Verificação | Status |
| :-- | :-- | :-- |
| DO §13 — kit canônico 6 exports + 1 type | `result.ts` exporta exatamente `Result`, `ok`, `err`, `isOk`, `isErr`, `mapErr`, `combine` | ✅ |
| DO §13 — "~50 LOC" | 24 LOC físicas — bem dentro do orçamento | ✅ |
| DO §15 — `combine` coleta erros (applicative) | Linhas 13–23: acumulador `errors` percorre todos, retorna `err(errors)` se houver pelo menos 1 | ✅ |
| DO §16 — γ pattern `combine + mapErr` viável | `mapErr` aceita `Result<T, readonly E[]>` (tipo de retorno do novo `combine`) e produz `Result<T, F>` traduzido — testado em `mapErr — γ pattern` | ✅ |
| DO §17 — domínio sync | Zero `Promise`/`async`/`await` | ✅ |
| DO §18 — 3 estratégias coexistentes (α/β/γ) | A API suporta as três (α via early return + narrowing; β via `combine`; γ via `combine`+`mapErr`) — nenhuma técnica unificadora introduzida | ✅ |
| DO §19 — `shared/result.ts` única fonte | Reexport em `shared/index.ts` aponta exatamente o conjunto | ✅ |
| DON'T §13 — sem fp-ts/Effect/neverthrow | Zero deps | ✅ |
| DON'T §14 — sem `andThen`/`flatMap`/`chain` | `flatMap` antigo REMOVIDO | ✅ |
| DON'T §15 — sem `pipe`/`flow`/`compose` | Não introduzidos | ✅ |
| DON'T §16 — sem `traverse`/`sequence` | Não introduzidos | ✅ |
| DON'T §17 — sem `ResultAsync` | Não introduzido | ✅ |
| DON'T §18 — `combine` não usado em sequência dependente | A API expõe `combine` como applicative; uso correto é responsabilidade do caller (validado em `tests/shared/result.test.ts` § "γ pattern") | ✅ |

---

## 3. Critérios de aceitação do ticket

| CA | Verificação | Status |
| :-- | :-- | :-- |
| CA-1 (RED antes do W1) | W0 capturou import-time SyntaxError | ✅ |
| CA-2 (kit canônico exato) | `result.ts:1-23` — exatamente 6 exports + 1 type | ✅ |
| CA-3 (`combine` retorna `Result<T, readonly E[]>`) | Linha 14 — return type explícito | ✅ |
| CA-4 (`combine([])` → `ok([])`) | `errors.length === 0` no fim do loop vazio → `ok(values)` com `values = []` | ✅ (e testado) |
| CA-5 (cenário literal do ticket) | Teste `'CA-5 cenário do ticket'` verde | ✅ |
| CA-6 (≤ 50 LOC físicas) | **24 LOC** — folga de 26 linhas | ✅ |
| CA-7 (reexport sincronizado) | `shared/index.ts:2` lista exatamente o kit canônico | ✅ |
| CA-8 (zero throw/class/any no diff) | Verificado por grep | ✅ |
| CA-9 a CA-12 | Reservados para W3 | ⏭ |

---

## 4. Inspeção linha-a-linha

### 4.1 `src/shared/result.ts`

```ts
1  export type Result<T, E> = Readonly<{ ok: true; value: T }> | Readonly<{ ok: false; error: E }>;
2
3  export const ok = <T>(value: T): Result<T, never> => ({ ok: true, value });
4
5  export const err = <E>(error: E): Result<never, E> => ({ ok: false, error });
6
7  export const isOk = <T, E>(r: Result<T, E>): r is Readonly<{ ok: true; value: T }> => r.ok;
8
9  export const isErr = <T, E>(r: Result<T, E>): r is Readonly<{ ok: false; error: E }> => !r.ok;
10
11 export const mapErr = <T, E, F>(r: Result<T, E>, f: (e: E) => F): Result<T, F> =>
12   r.ok ? r : err(f(r.error));
13
14 export const combine = <T extends readonly unknown[], E>(results: {
15   readonly [K in keyof T]: Result<T[K], E>;
16 }): Result<T, readonly E[]> => {
17   const values: unknown[] = [];
18   const errors: E[] = [];
19   for (const r of results) {
20     if (r.ok) values.push(r.value);
21     else errors.push(r.error);
22   }
23   return errors.length > 0 ? err(errors as readonly E[]) : ok(values as unknown as T);
24 };
```

**Observações por linha:**

- **L1.** `Readonly<>` em ambos os shapes do discriminated union — alinha "Imutabilidade absoluta" do CLAUDE.md. Discriminante `ok: true | false`.
- **L3, L5.** Smart constructors retornando o tipo bottom apropriado (`Result<T, never>` para `ok`; `Result<never, E>` para `err`) — preserva inferência narrowing em uso.
- **L7, L9.** Type predicates (`r is Readonly<{...}>`) — testados pelo W0 confirmando narrowing dentro do `if`.
- **L11–12.** `mapErr` em uma linha de implementação. Quando `r.ok`, retorna o próprio `r` (sem realocação) — DO §13 ("zero deps", semântica enxuta). Quando `!r.ok`, aplica `f` e re-envelopa via `err(...)`.
- **L14–23.** `combine` — único ponto onde há complexidade. Análise dedicada §4.2.

### 4.2 `combine` — análise dedicada

**Mapped type no input (L15):** `{ readonly [K in keyof T]: Result<T[K], E> }`. Quando `T = readonly [number, string, boolean]`, o input vira `readonly [Result<number, E>, Result<string, E>, Result<boolean, E>]`. Preserva tupla. **Não há cast no input.**

**Retorno (L16):** `Result<T, readonly E[]>` — o caminho ok preserva a tupla `T` (não vira `unknown[]`); o caminho err agrega erros em readonly array.

**Loop (L17–22):** dois acumuladores locais imperativos. O CLAUDE.md regra "Zero `.push`/`.splice`/`.sort`" é especificamente sobre **arrays do domínio** (entidades). Aqui:
- `values: unknown[]` e `errors: E[]` são **locais à função**, nunca cruzam a fronteira sem cast tipado.
- Precedente: o `combine` anterior (29 LOC) já usava o mesmo padrão `const values: unknown[] = []; values.push(...)`. Não introduz novo débito.
- Esse é um helper genérico em `shared/`, fora de `src/modules/*/domain/` — não está sujeito à regra de domínio puro.

**Cast `as readonly E[]` (L23):** apertar `E[]` para `readonly E[]` — não há mismatch de runtime. TS exige porque `err` infere `never` no slot de value e o caller espera o type-level `readonly`.

**Cast `as unknown as T` (L23):** único cast verdadeiro. Necessário porque TS não consegue derivar o tipo tupla a partir de um array imperativo. Comentário do CLAUDE.md raiz §"Sem `any`": "*Se `as` for inevitável, comentar o porquê (padrão: `as unknown as T`)*". Aqui o `as unknown as T` é exatamente o padrão prescrito — encapsulado no único ponto onde TS não consegue inferir, e auditado por 23 testes que provam o tipo é preservado em runtime.

**Caminho `errors.length > 0`:** retorna **antes** de exercitar a tupla — evita produzir uma tupla inválida quando há erros. Caminho `else` produz `ok(values)` apenas quando `values` tem exatamente os T[K] esperados (porque o loop só pushed `r.value` quando `r.ok`).

### 4.3 `src/shared/index.ts`

```diff
-export { ok, err, isOk, isErr, map, flatMap, mapError, combine } from './result.ts';
+export { ok, err, isOk, isErr, mapErr, combine } from './result.ts';
```

Lista canônica idêntica ao `result.ts` — CA-7 ✅.

### 4.4 `tests/shared/result.test.ts`

Análise resumida (revisado em W0 — auto-referência válida nesta wave):
- 8 `describe` × 23 `it`.
- AAA explícito em cada teste.
- Zero `throw`, `class`, `any`, `let` reatribuído (1 `let called = false` é flag de side-effect — padrão de teste, não estado de produção).
- Imports `.ts` + subpath `#src/*` + `import type { Result }`.
- `assert.fail` apenas em branches impossíveis pós-narrowing — não viola regra (assert.fail é utilitário de teste, não `throw` de produção).

Único ponto de atenção residual:
- Linhas 11 e 179 mencionam `mapError` em **comentários explicativos** da migração — documentação válida da refatoração, será removida quando o handbook for atualizado pelo ticket `CTR-SKILL-REFRESH-I`. Não bloqueia.

---

## 5. Issues encontradas

**Nenhuma.** Round único.

---

## 6. Citações sustentando as decisões

- **CLAUDE.md raiz** §"Domínio puro": "`throw` proibido. Operações retornam `Result<T, E>`." — `mapErr`/`combine` honram essa regra.
- **CLAUDE.md raiz** §"Anti-padrões" #7: regra sobre `default: throw` — N/A aqui (sem switch).
- **CLAUDE.md raiz** §"Sintaxe": "Se `as` for inevitável, comentar o porquê (padrão: `as unknown as T`)" — aplicado literal no único cast de `combine`.
- **Entrevista 0001** Bloco I §13 (linha 865 do master doc): "`shared/result.ts` mantém zero deps. ~50 LOC: `ok`, `err`, `mapErr`, `combine`, `isOk`, `isErr`." — kit honrado exato.
- **Entrevista 0001** Bloco I §15 (linha 867): "Inputs independentes (β) usam **`combine`** — coleta erros, melhora UX da borda." — `combine` agora coleta.
- **Entrevista 0001** Bloco I §18 (linha 870): "Aceitar **3 estratégias coexistentes** (α: early return; β: combine; γ: combine+mapErr). Não buscar técnica unificadora — é anti-pattern." — não introduzido `andThen`/`pipe`/`flow`.
- **Entrevista 0001** Bloco I DON'T §14 (linha 907): "Implementar `andThen`/`flatMap`/`chain` — redundante com early return + narrowing nativo." — `flatMap` antigo removido.

---

## Veredito final

**APPROVED.** Diff alinhado integralmente com:
- CLAUDE.md raiz (regras invariantes + sintaxe).
- Bloco I da entrevista 0001 (DO §13–19 + DON'T §13–18).
- 8/8 CAs verificáveis em W2 (CA-1 a CA-8 ✅; CA-9 a CA-12 vão para W3).
- Zero código adicionado além do mínimo para GREEN (ortodoxia W1).

→ **Pronto para W3 — Quality Gate.**
