# Code Review — Ticket CTR-VO-PERIOD — Round 1

**Veredito:** ✅ **APPROVED**

**Reviewer:** code-reviewer
**Data:** 2026-05-14
**Escopo revisado:**
- `src/modules/contracts/domain/shared/period.ts` (59 linhas)
- `tests/modules/contracts/domain/shared/period.test.ts` (172 linhas) — revisão de coerência

---

## Resumo executivo

Primeira aplicação de **discriminated union** no domínio. Implementação clara, exhaustive switch com `never` corretamente posicionado, defensividade contra `Date` inválida bem dimensionada. **Aprovado para W3**, zero issues bloqueantes.

---

## Checklist aplicado

### A. Regras absolutas do domínio

| Item | Status | Evidência |
| :--- | :---: | :--- |
| Zero `throw` em domínio | ⚠️ Exceção justificada | 1 ocorrência em `period.ts:40` — `default` do exhaustive switch. Conforme [`ts-exhaustive-switch.md`](../../skills/ts-domain-modeler/references/ts-exhaustive-switch.md): "branch inalcançável em código bem tipado; é a única exceção válida". |
| Zero `class` | ✅ | `grep "class"` → 0 |
| Zero `this` | ✅ | confirmado |
| Zero `any` | ✅ | confirmado |
| `Readonly<>` em entity | ✅ | Cada variante da union é `Readonly<{...}>` (linhas 5-6) |
| Toda função exportada tem return type | ✅ | linhas 19, 26, 30, 45, 59 |

### B. Smart constructors e Branded types

| Item | Status | Evidência |
| :--- | :---: | :--- |
| Smart constructor retorna `Result<Branded, Error>` | ✅ | `create` linha 19, `createIndefinite` linha 26 |
| `as Period` apenas após validação | ✅ | linhas 23, 28 — depois dos guards |
| Smart constructor não faz I/O | ✅ | puro síncrono |
| Erro é string literal union | ✅ | `PeriodError` linhas 10-13 |

### C. Discriminated unions e exhaustiveness — **primeira aparição no domínio**

| Item | Status | Evidência |
| :--- | :---: | :--- |
| Discriminator em literal EN (`kind`) | ✅ | linhas 5-6: `'Fixed'`, `'Indefinite'` |
| Campos diferentes por variante | ✅ | `Fixed` tem `end`, `Indefinite` não — sem optional fields |
| Switch com `default` `never` | ✅ | linhas 38-41 |
| `assertNever` via `throw new Error('unreachable: ...')` | ✅ | linha 40 — única exceção `throw` documentada |
| Cada `case` retorna explicitamente | ✅ | sem fallthrough |

### D. Ports & Adapters

N/A — domínio puro.

### E. Modular Monolith

| Item | Status | Evidência |
| :--- | :---: | :--- |
| `domain/` só importa de `shared/` | ✅ | imports `../../../../shared/` (result, brand) |

### F. ESM / NodeNext / TypeScript moderno

| Item | Status | Evidência |
| :--- | :---: | :--- |
| Imports terminam com `.ts` | ✅ | linhas 1-2 |
| `import type` em imports puramente de tipo | ✅ | `import type { Brand }`; `import { type Result, ok, err }` |
| Sem `require`/`enum`/`namespace` | ✅ | confirmado |
| `tsc --noEmit` zero erros | ✅ | rodado em W1 |

### G. Naming, EN/PT

| Item | Status | Evidência |
| :--- | :---: | :--- |
| Identificadores em EN | ✅ | `Period`, `Fixed`, `Indefinite`, `kind`, `start`, `end`, `create`, `createIndefinite`, `contains`, `equals`, `isIndefinite`, `isValidDate` |
| Erros string literal EN kebab-case | ✅ | `'period-invalid-start-date'`, `'period-invalid-end-date'`, `'period-end-before-start'` |

### H. Tests (coerência)

| Item | Status | Evidência |
| :--- | :---: | :--- |
| AAA explícito | ✅ | builders `fixed`/`indefinite` separam Arrange dos asserts |
| Cobertura proporcional à regra | ✅ | 25 testes para 5 funções + edge cases (NaN, inclusive bounds, kind mismatch) |
| Sem matchers vagos | ✅ | `assert.equal` exato em todos |

---

## Pontos positivos (explícitos)

1. **Discriminated union estruturalmente correta** — `Fixed` carrega `end`; `Indefinite` não. Sem `end?: Date` ambíguo. Reflete fielmente a regra de negócio.

2. **Helper privado `isValidDate`** (linha 15) — encapsula a verificação `!Number.isNaN(d.getTime())`, repetida 3 vezes. Privado (não exportado), zero ruído na API pública.

3. **Defensividade na borda** — `contains` valida `instant` antes de comparar (linha 30). `Date` corrompida não causa false-positive nem crash.

4. **Inclusive bounds em `Fixed.contains`** — `t >= start && t <= end`. Convenção esperada (período de 1 dia inclui o último instante daquele dia).

5. **`equals` correto sem switch** — duas guard clauses cobrem ambas as variantes; o `return false` final é unreachable em runtime mas mantém o TS feliz sem precisar de outro `throw`. Alternativa elegante ao switch + never.

6. **Mensagem de erro `unreachable` inclui o valor** via `JSON.stringify(_exhaustive)` — quando (por bug de tipos) alguém alcançar essa linha, terá a evidência impressa.

---

## Notas (🔵 não-bloqueantes)

### Nota 1 — `throw` no exhaustive switch

`period.ts:40` faz `throw new Error('unreachable: ...')` no default. Esta é a **primeira ocorrência de `throw` em todo o `src/modules/contracts/domain/`**. Mecanicamente o checklist §A diz "Zero `throw` em domínio", mas o reference `ts-exhaustive-switch.md` codifica a exceção:

> `assertNever` **throws**, contradizendo a regra "sem throw no domínio". Justificativa: o caminho é **inalcançável em código bem tipado**.

Em código bem tipado **esta linha é morta** — o compilador rejeita atribuir um tipo não-`never` a `_exhaustive`. Só vira live se: (a) `as Period` for usado fora do smart constructor com dados malformados, (b) `as any` mascarar um tipo errado, (c) novo `kind` for adicionado sem atualizar o switch.

Cenário (c) é **exatamente o que queremos detectar** — fail-fast em runtime caso o desenvolvedor tenha ignorado o erro de compilação. **Mantém como está.**

### Nota 2 — `Date` é mutável; cópia defensiva?

`Period.create(start, end)` recebe referências `Date` do caller e armazena diretamente. Caller poderia depois fazer `start.setHours(0)` e mutar `Period.start`.

Trade-off considerado:
- **A (atual):** confiar na política "trate `Date` como imutável" do CLAUDE.md raiz. Zero overhead.
- **B:** clonar `new Date(start.getTime())` internamente. Overhead pequeno, garantia mecânica.

Opção A é o caminho idiomático em projetos TS funcionais; B é defensivo demais quando a política é clara. **Mantém A.** Se algum bug futuro for rastreado a mutação externa de `Date`, reabrir.

### Nota 3 — `equals` poderia ser switch

```ts
equals: (a: Period, b: Period): boolean => {
  if (a.kind !== b.kind) return false;
  if (a.kind === 'Fixed' && b.kind === 'Fixed') { return ... }
  if (a.kind === 'Indefinite' && b.kind === 'Indefinite') { return ... }
  return false; // unreachable
}
```

Alternativa com switch + never seria mais "uniforme" com `contains`. Mas exige `throw` extra. A versão atual:
- Tem **uma única linha unreachable** (o `return false` final), implícita pelo TS — sem `throw`.
- Estrutura `if a.kind !== b.kind early return` é claríssima de ler.

**Mantém como está.** Mas vale registrar: se em algum futuro `equals` precisar despachar comportamento por variante (não apenas comparar), refatorar para switch.

### Nota 4 — `start === end` produz período de 1 instante

Aceito pelo critério D6 ("caller decide significado"). Implementação correta:
- `Period.create(d, d)` → `Ok({ kind: 'Fixed', start: d, end: d })`
- `Period.contains(p, d)` → `true` (inclusive)
- `Period.contains(p, d±1ms)` → `false`

Útil para representar vigência de "1 evento" ou "1 segundo". **Sem ação.**

### Nota 5 — Sem `isFixed(p)` complementar a `isIndefinite(p)`

API expõe `isIndefinite` mas não `isFixed`. Caller pode usar `!isIndefinite(p)` ou `p.kind === 'Fixed'`. **Aceitável** — YAGNI estrito. Se aparecer demanda, adicionar é trivial (1 linha).

---

## Próximo passo

W3 — `ts-quality-checker` roda checks finais. Esperado: ALL GREEN com 69 testes (Money 20 + IDs 24 + Period 25).
