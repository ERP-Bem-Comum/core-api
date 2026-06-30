# 000 — Request CTR-SHARED-RESULT-COMBINATORS

> **Frente A — Refactor radical do domínio (entrevista 0001).**
> Top-3 leverage #3 ("Zero throw / Result Homemade"). Ticket **folha** (sem dependências).
> Habilita downstream: `CTR-DOMAIN-COMPOSE-REFACTOR` e padrões α/β/γ canônicos.

---

## Origem

- **Entrevista canônica:** [`handbook/interviews/0001-functional-ddd-domain-refresh.md`](../../../handbook/interviews/0001-functional-ddd-domain-refresh.md), **Bloco I** (Composição Funcional) — fechado em 2026-05-19.
- **Decisões aplicáveis** (linhas 865–911 do master doc — DO/DON'T do Bloco I):
  - **DO I§13.** `shared/result.ts` mantém zero deps. ~50 LOC: `ok`, `err`, `mapErr`, `combine`, `isOk`, `isErr`.
  - **DO I§14.** Sequência dependente (α) usa **early return** com narrowing automático do TS.
  - **DO I§15.** Inputs independentes (β) usam **`combine`** — coleta erros, melhora UX da borda.
  - **DO I§16.** Tradução de erro na fronteira (γ) usa **`combine` + 1 `mapErr` no fim**.
  - **DO I§17.** Domínio 100% sync. `Promise` mora na Application Layer.
  - **DO I§18.** Aceitar 3 estratégias coexistentes (α/β/γ). Não buscar técnica unificadora.
  - **DO I§19.** Padrão D (module-as-namespace) protege contra proliferação de helpers. `shared/result.ts` é única fonte de verdade.
  - **DON'T I§13.** Adotar Effect, fp-ts, neverthrow no domínio.
  - **DON'T I§14.** Implementar `andThen`/`flatMap`/`chain` — redundante com early return + narrowing nativo.
  - **DON'T I§15.** Implementar `pipe`, `flow`, `compose` no domínio — vira jargão FP (Wlaschin: "domínio não fala jargão de programador").
  - **DON'T I§16.** Implementar `traverse`, `sequence`. Casos reais cabem em `combine` ou loop nativo.
  - **DON'T I§17.** `ResultAsync` no domínio. Mistura sync com async; viola Functional Core / Imperative Shell.
  - **DON'T I§18.** Usar `combine` em sequência dependente. `combine` é APPLICATIVE — pra independente.

- **Tabela canônica de tickets** (linha 962 do master doc):
  > `CTR-SHARED-RESULT-COMBINATORS` — Bloco I + E3 + A4 — `shared/result.ts` ganha `mapErr` + `combine` + (opcional) `isOk`/`isErr`. ~50 LOC. Testes cobrindo fail-fast vs collect. — **(sem dependências)**.

---

## Estado atual (snapshot 2026-05-20)

`src/shared/result.ts` (29 linhas) hoje exporta:

```ts
type Result<T, E>          // ✅ alinhado
ok, err                    // ✅ alinhados
isOk, isErr                // ✅ alinhados
map<T,U,E>                 // ❌ não está no kit canônico — remover
flatMap<T,U,E>             // ❌ DON'T I§14 — remover
mapError<T,E,F>            // ❌ nome divergente — renomear para `mapErr`
combine<T,E>               // ⚠️ fail-fast (retorna 1º erro) — exige collect-all
```

`src/shared/index.ts:2` reexporta tudo. **Uso real no código:** apenas `ok`, `err` e o type `Result` são importados por código de produção (~34 import sites). `mapError`, `flatMap`, `map`, `combine` são exportados mas zero usados — refactor sem ripple effect.

---

## Estado-alvo

`src/shared/result.ts` ≤ ~50 LOC, zero deps, kit canônico exato:

```ts
export type Result<T, E> = Readonly<{ ok: true; value: T }> | Readonly<{ ok: false; error: E }>;
export const ok    = <T>(value: T): Result<T, never>;
export const err   = <E>(error: E): Result<never, E>;
export const isOk  = <T, E>(r: Result<T, E>): r is Readonly<{ ok: true; value: T }>;
export const isErr = <T, E>(r: Result<T, E>): r is Readonly<{ ok: false; error: E }>;
export const mapErr = <T, E, F>(r: Result<T, E>, f: (e: E) => F): Result<T, F>;
export const combine = <T extends readonly unknown[], E>(
  results: { readonly [K in keyof T]: Result<T[K], E> }
): Result<T, readonly E[]>;
```

**Mudanças semânticas em `combine` (CRÍTICO):**
- **Antes:** fail-fast — retorna o 1º `err` encontrado, descarta o resto.
- **Depois:** collect-all — itera **todos** os results; se houver `err`s, retorna `err(readonly E[])` com todos eles na ordem original; se todos `ok`, retorna `ok([...])`.
- **Razão:** alinhamento com I§15 ("coleta erros, melhora UX da borda") + I§16 (γ = `combine + mapErr` traduz `readonly E[]` para o tipo de erro de borda).

`src/shared/index.ts` atualizado:
```ts
export type { Result } from './result.ts';
export { ok, err, isOk, isErr, mapErr, combine } from './result.ts';
```

---

## Escopo

### Em escopo

- Reescrever `src/shared/result.ts` para o kit canônico exato (6 exports + 1 type).
- Atualizar `src/shared/index.ts` removendo `map`, `flatMap`, `mapError`; adicionando `mapErr`.
- Testes `tests/shared/result.test.ts` cobrindo:
  - `ok`/`err` shape e brand discriminante.
  - `isOk`/`isErr` como type predicates (narrowing).
  - `mapErr` preserva `ok`, transforma só o `error`.
  - `combine` happy path (todos `ok` → tupla preservada).
  - `combine` collect-all: 3 inputs com 2 `err`s → `err([e1, e2])` na ordem.
  - `combine` array vazio → `ok([])`.
  - `combine` preserva tipos da tupla via `T extends readonly unknown[]`.

### Fora de escopo (deixar para tickets dependentes)

- `CTR-DOMAIN-COMPOSE-REFACTOR` — uso real de `combine` + `mapErr` em `applyHomologatedAdjustment`, use cases, mappers (depende deste ticket).
- `CTR-SKILL-REFRESH-I` — atualizar `.claude/skills/ts-domain-modeler/SKILL.md §3.I` (depende deste ticket + COMPOSE-REFACTOR).
- Adoção de `combine` nos use cases existentes (`create-amendment`, `homologate-amendment` etc.) — entra no COMPOSE-REFACTOR.
- Remoção do `throw new Error` em `homologate-amendment.ts:72` — ticket `CTR-DOMAIN-EXHAUSTIVE-SWITCH-FIX`.

---

## Critérios de aceitação

| # | Critério | Wave |
| :--- | :--- | :--- |
| CA-1 | `tests/shared/result.test.ts` existe e **falha** antes do W1 (módulo `mapErr` não exporta ainda) | W0 |
| CA-2 | Após W1, `result.ts` exporta apenas `Result`, `ok`, `err`, `isOk`, `isErr`, `mapErr`, `combine` (sem `map`, `flatMap`, `mapError`) | W1 |
| CA-3 | `combine` retorna `Result<T, readonly E[]>` com erros coletados na ordem | W1 |
| CA-4 | `combine([])` → `ok([])` | W1 |
| CA-5 | `combine([ok(1), err('a'), ok(2), err('b')])` → `err(['a', 'b'])` | W1 |
| CA-6 | `result.ts` ≤ 50 linhas físicas (alinhamento I§13) | W2 |
| CA-7 | `shared/index.ts` reexporta exatamente o kit canônico | W2 |
| CA-8 | Zero `throw`, zero `class`, zero `any` no diff | W2 |
| CA-9 | `pnpm run typecheck` verde | W3 |
| CA-10 | `pnpm run format:check` verde | W3 |
| CA-11 | `pnpm test` verde — todos os testes do projeto (não só os novos) | W3 |
| CA-12 | `pnpm run lint` verde (bonus, não bloqueante) | W3 |

---

## Skills obrigatórias

| Wave | Skill | Razão |
| :--- | :--- | :--- |
| W0 — RED | [`ts-domain-modeler`](../../skills/ts-domain-modeler/SKILL.md) | Escrever testes que consomem o kit canônico antes da impl |
| W0 — RED | [`tdd-strategist`](../../skills/tdd-strategist/SKILL.md) | Garantir AAA + cobertura fail-fast vs collect |
| W1 — GREEN | [`ts-domain-modeler`](../../skills/ts-domain-modeler/SKILL.md) | Aplicar Padrão D (module-as-namespace), `Readonly<>`, type predicates |
| W2 — REVIEW | [`code-reviewer`](../../skills/code-reviewer/SKILL.md) | Audit read-only contra CLAUDE.md raiz + Bloco I da entrevista 0001 |
| W3 — QUALITY | [`ts-quality-checker`](../../skills/ts-quality-checker/SKILL.md) | Gate final: tsc + format + test + lint |
| Todas | [`pipeline-maestro`](../../skills/pipeline-maestro/SKILL.md) | Orquestrar W0→W3 sequencialmente |

---

## Arquivos previstos

| Arquivo | Ação | Wave |
| :--- | :--- | :--- |
| `tests/shared/result.test.ts` | **Criar** (não existe) | W0 |
| `src/shared/result.ts` | **Reescrever** (de 29 LOC para ~50 LOC) | W1 |
| `src/shared/index.ts` | **Editar** (linha 2 — remover map/flatMap/mapError, adicionar mapErr) | W1 |
| `.claude/.pipeline/CTR-SHARED-RESULT-COMBINATORS/002-tests/REPORT.md` | **Criar** | W0 |
| `.claude/.pipeline/CTR-SHARED-RESULT-COMBINATORS/003-impl/REPORT.md` | **Criar** | W1 |
| `.claude/.pipeline/CTR-SHARED-RESULT-COMBINATORS/004-code-review/REVIEW.md` | **Criar** | W2 |
| `.claude/.pipeline/CTR-SHARED-RESULT-COMBINATORS/005-quality/REPORT.md` | **Criar** | W3 |
| `.claude/.pipeline/CTR-SHARED-RESULT-COMBINATORS/STATE.md` | **Atualizar** ao fim de cada wave | W0..W3 |

---

## Riscos e mitigações

| Risco | Probabilidade | Mitigação |
| :--- | :--- | :--- |
| Algum sítio usar `mapError`/`map`/`flatMap` e quebrar build | Baixa (grep confirmou zero uso) | Remoção pura — sem necessidade de codemod |
| `combine` collect-all mudar semântica para callers existentes | Baixa (zero callers hoje) | — |
| Quebrar testes existentes que importam de `shared/index.ts` | Baixa | W3 roda `pnpm test` completo, não só o novo |
| Reexport `shared/index.ts` ficar fora de sync com `result.ts` | Média | CA-7 verifica explicitamente |

---

## Próximos tickets habilitados

Após `CTR-SHARED-RESULT-COMBINATORS` em W3 verde:

1. **`CTR-DOMAIN-COMPOSE-REFACTOR`** — usa `combine`/`mapErr` em `applyHomologatedAdjustment` (α), use cases (β), mappers (γ).
2. **`CTR-DOMAIN-EXHAUSTIVE-SWITCH-FIX`** — remove o único `throw new Error` remanescente (`homologate-amendment.ts:72`).
3. **`CTR-SHARED-IMMUTABLE`** (paralelo) — folha do top-3 #2.
4. **`CTR-SHARED-BRAND-UNIQUE-SYMBOL`** (paralelo) — folha do top-3 #2.
5. **`CTR-DOMAIN-DEBRAND-AGG`** (paralelo) — folha que destrava `TAGGED-ERRORS` → `STATE-MACHINE-CONTRACT` (top-3 #1).

---

## Autor / data

- **Autor:** Claude (delegação do humano via `contratos-orchestrator`).
- **Aberto em:** 2026-05-20.
- **Skill canônica para abertura:** [`pipeline-maestro`](../../skills/pipeline-maestro/SKILL.md).
