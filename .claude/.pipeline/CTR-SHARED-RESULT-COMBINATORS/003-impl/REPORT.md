# W1 — GREEN Report — CTR-SHARED-RESULT-COMBINATORS

> **Status:** ✅ GREEN (23/23 novos + 451/451 pré-existentes).
> **Skill:** [`ts-domain-modeler`](../../../skills/ts-domain-modeler/SKILL.md).
> **Data:** 2026-05-20.

---

## Diff

```
 src/shared/index.ts  |  2 +-
 src/shared/result.ts | 17 ++++++-----------
 2 files changed, 7 insertions(+), 12 deletions(-)
```

Tocou 2 arquivos. Zero alteração em call-sites (confirmado em W0 via grep — `mapError`/`flatMap`/`map`/`combine` antigos não tinham consumidores reais).

## `src/shared/result.ts` — antes × depois

**Antes** (29 LOC, exports: `Result`, `ok`, `err`, `isOk`, `isErr`, `map`, `flatMap`, `mapError`, `combine fail-fast`):
- `map<T,U,E>` — REMOVIDO (não está no kit canônico I§13).
- `flatMap<T,U,E>` — REMOVIDO (DON'T I§14 — "redundante com early return + narrowing nativo").
- `mapError<T,E,F>` — RENOMEADO para `mapErr` (DO I§13 — jargão canônico).
- `combine<T,E>` retornando `Result<T, E>` com early return no 1º erro — REESCRITO para semântica applicative collect-all retornando `Result<T, readonly E[]>` (DO I§15 + I§18).

**Depois** (24 LOC, exports exatos do kit canônico): `Result`, `ok`, `err`, `isOk`, `isErr`, `mapErr`, `combine collect-all`.

Implementação `combine`:
```ts
export const combine = <T extends readonly unknown[], E>(results: {
  readonly [K in keyof T]: Result<T[K], E>;
}): Result<T, readonly E[]> => {
  const values: unknown[] = [];
  const errors: E[] = [];
  for (const r of results) {
    if (r.ok) values.push(r.value);
    else errors.push(r.error);
  }
  return errors.length > 0 ? err(errors as readonly E[]) : ok(values as unknown as T);
};
```

Decisões de implementação:
- **Imperativo, não recursivo.** Mapped type no input → tupla preservada no output em `T`. Dois acumuladores locais (`values`, `errors`) — único `for…of`, sem `reduce`/`map`/`filter`.
- **Sem cast no input.** `T extends readonly unknown[]` + mapped type derivam o tipo de cada slot. O único cast (`as unknown as T`) sai no return de sucesso — encapsulado, auditado, no único ponto onde TS não consegue inferir tupla a partir do array imperativo (precedente: o `combine` anterior já fazia isso). `as readonly E[]` no caminho de erro é apenas reaperto do tipo (não há mismatch de runtime).
- **Comportamento literal do ticket CA-5:** `combine([ok(1), err('a'), ok(2), err('b')])` → `err(['a', 'b'])`. Verificado no test runner.

## `src/shared/index.ts` — antes × depois

```diff
-export { ok, err, isOk, isErr, map, flatMap, mapError, combine } from './result.ts';
+export { ok, err, isOk, isErr, mapErr, combine } from './result.ts';
```

Reexport sincronizado com o novo kit canônico (CA-7).

## Execução dos testes

### Testes novos do ticket
```
$ node --test --experimental-strip-types --no-warnings tests/shared/result.test.ts
…
ℹ tests 23
ℹ suites 8
ℹ pass 23
ℹ fail 0
ℹ skipped 0
ℹ duration_ms 107.079958
```

### Suite completa (verificação de não-regressão)
```
$ pnpm test
…
ℹ tests 487
ℹ suites 165
ℹ pass 474
ℹ fail 0
ℹ skipped 13          (= MySQL integration guards, pré-existentes — gate MYSQL_INTEGRATION=1)
ℹ duration_ms 52510
```

Antes do ticket: 451 tests. Depois: 474 tests (+23, alinhado com os 23 `it` novos). Skipped continua 13 (mesmas suítes de integração MySQL).

## Critérios de aceitação fechados em W1

- [x] **CA-1** — testes novos falhavam antes (W0) e passam agora (W1).
- [x] **CA-2** — `result.ts` exporta exatamente `Result`, `ok`, `err`, `isOk`, `isErr`, `mapErr`, `combine` (verificado por grep + lint do compilador na W0).
- [x] **CA-3** — `combine` retorna `Result<T, readonly E[]>` (`describe combine — collect-all`).
- [x] **CA-4** — `combine([])` → `ok([])` (`it 'com array vazio retorna ok([])'`).
- [x] **CA-5** — `combine([ok(1), err('a'), ok(2), err('b')])` → `err(['a','b'])` (`it 'CA-5 cenário do ticket'`).

## CAs restantes

| CA | Onde será verificado |
| :--- | :--- |
| CA-6 (≤ 50 LOC) | W2 (24 LOC reais, com margem) |
| CA-7 (reexport sincronizado) | W2 (verificação visual + grep) |
| CA-8 (zero throw/class/any) | W2 |
| CA-9 / CA-10 / CA-11 / CA-12 | W3 (typecheck / format / test / lint) |

## Compliance com Bloco I da entrevista 0001

| Decisão | Aplicada? |
| :--- | :--- |
| DO §13 — kit canônico exato `ok/err/mapErr/combine/isOk/isErr` | ✅ |
| DO §15 — `combine` coleta erros (não fail-fast) | ✅ |
| DO §16 — `mapErr` no fim aplicável (γ pattern testado) | ✅ |
| DO §17 — domínio 100% sync (zero `Promise`/`async` no `result.ts`) | ✅ |
| DO §18 — não introduzir técnica unificadora | ✅ (não há `andThen`/`pipe`/`flow`) |
| DO §19 — `shared/result.ts` única fonte de verdade | ✅ |
| DON'T §13 — sem fp-ts/Effect/neverthrow | ✅ |
| DON'T §14 — sem `andThen`/`flatMap`/`chain` | ✅ (`flatMap` removido) |
| DON'T §15 — sem `pipe`/`flow`/`compose` | ✅ |
| DON'T §16 — sem `traverse`/`sequence` | ✅ |
| DON'T §17 — sem `ResultAsync` | ✅ |

## Compliance com CLAUDE.md raiz

| Regra | Status |
| :--- | :--- |
| Zero `throw` | ✅ |
| Zero `class`/`this` | ✅ |
| Zero `any` | ✅ — `unknown` apenas como acumulador imperativo de `combine`, com cast auditado |
| `Readonly<>` no shape do `Result` | ✅ |
| `as unknown as T` documentado | ✅ — único uso é o cast final do tuple em `combine` (precedente do código anterior) |
| ESM `.ts` em imports | N/A (sem imports relativos) |
| `import type` | N/A (sem imports de tipo) |
| Domínio 100% sync | ✅ |

## Próxima wave

→ **W2 — REVIEW** (skill `code-reviewer`).
