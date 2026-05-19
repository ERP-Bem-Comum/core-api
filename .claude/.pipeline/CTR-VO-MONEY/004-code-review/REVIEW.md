# Code Review — Ticket CTR-VO-MONEY — Round 1

**Veredito:** ✅ **APPROVED**

**Reviewer:** code-reviewer
**Data:** 2026-05-14
**Escopo revisado:**
- `src/modules/contracts/domain/shared/money.ts` (32 linhas)
- `tests/modules/contracts/domain/shared/money.test.ts` (133 linhas) — revisão de coerência

---

## Resumo executivo

Implementação **exemplar** para um primeiro VO sob a pipeline 4-wave do projeto. Aderência total às regras transversais, YAGNI estrito, e zero código além do mínimo necessário para 20/20 GREEN. **Aprovo para W3** sem rounds adicionais.

---

## Checklist aplicado (skill code-reviewer §A–H)

### A. Regras absolutas do domínio (`src/modules/contracts/domain/`)

| Item | Status | Evidência |
| :--- | :---: | :--- |
| Zero `throw` | ✅ | `grep "throw" src/modules/contracts/domain/` → 0 ocorrências |
| Zero `class` | ✅ | `grep "class" src/modules/contracts/domain/` → 0 ocorrências |
| Zero `this` | ✅ | `grep "this\\."` → 0 ocorrências |
| Zero `any` explícito | ✅ | `grep ": any\|<any>\|as any"` → 0 ocorrências |
| Zero `extends Error` | ✅ | confirmado |
| Zero `let` reatribuído | ✅ | `const diff` em `subtract` (linha 23) é único `const`, jamais reatribuído |
| Zero `.push`/`.splice`/`.sort` em domínio | ✅ | sem operações de array |
| Entity é `Readonly<>` | ✅ | `readonly cents: number` (linha 4) |
| Arrays de domínio `readonly T[]` | N/A | sem arrays neste VO |
| Funções exportadas têm return type explícito | ✅ | linhas 11, 17, 19, 22, 28, 30 — todos tipados |

### B. Smart constructors e Branded types

| Item | Status | Evidência |
| :--- | :---: | :--- |
| VO tem smart constructor que retorna `Result<Branded, Error>` | ✅ | `fromCents` linhas 11-15 |
| `as Branded` aparece apenas dentro do smart constructor | ⚠️ Aceitável | Cast `as Money` em 4 lugares — todos justificados (ver Nota 1) |
| Smart constructor não faz I/O | ✅ | puro síncrono |
| Erro é string literal union | ✅ | `MoneyError` linhas 6-8 |

### C. Discriminated unions e exhaustiveness

N/A — `Money` não é union.

### D. Ports & Adapters

N/A — código de domínio puro.

### E. Modular Monolith

| Item | Status | Evidência |
| :--- | :---: | :--- |
| `domain/` só importa de `shared/`/`shared-kernel/`/próprio módulo | ✅ | `../../../../shared/result.ts` e `../../../../shared/brand.ts` (linhas 1-2) |

### F. ESM / NodeNext / TypeScript moderno

| Item | Status | Evidência |
| :--- | :---: | :--- |
| Imports terminam com `.ts` | ✅ | linhas 1-2 |
| `import type` em imports puramente de tipo | ✅ | `import type { Brand }` (linha 2); `import { type Result, ok, err }` com inline type (linha 1) |
| Sem `require`/`module.exports`/`namespace`/`enum` | ✅ | confirmado |
| `tsc --noEmit` zero erros | ✅ | rodado em W1 |

### G. Naming, EN/PT, clareza (sob regra invariante)

| Item | Status | Evidência |
| :--- | :---: | :--- |
| Identificadores em **EN** | ✅ | `Money`, `fromCents`, `add`, `subtract`, `equals`, `greaterThan`, `cents` |
| Erros string literal **EN kebab-case** | ✅ | `'money-negative-value'`, `'money-non-integer-value'`, `'money-negative-result'` |
| Sem prefix `I` ou sufixo `Impl` | ✅ | confirmado |
| Nomes específicos (sem `data`, `value`, `info` vagos) | ✅ | `cents` é específico — unidade explícita |

### H. Tests (coerência)

| Item | Status | Evidência |
| :--- | :---: | :--- |
| AAA explícito | ✅ | cada `it()` segue Arrange/Act/Assert |
| Fakes injetáveis | N/A | VO puro, sem deps |
| UUIDs válidos quando aplicável | N/A | sem UUIDs |
| Cobertura proporcional à regra crítica | ✅ | 20 testes cobrem 6 funções, incluindo edge cases (`NaN`, `Infinity`, `1.5`, identidade, associatividade) |
| Sem matchers vagos | ✅ | `assert.equal` com valor exato em todos |

---

## Pontos positivos (explícitos)

1. **YAGNI estrito** — 32 linhas, nada além do mínimo. Sem `multiply`, `divide`, `min`, `max`, `toString` — confirma D7.
2. **API consistente** — todas as funções aceitam `Money` argumentos nomeados, return types explícitos, padrão "namespace de funções" via object literal (D2).
3. **Cast `as Money` controlado** — só em 4 lugares, todos seguros (Nota 1).
4. **Branded type bem dimensionado** — `Brand<{ readonly cents: number }, 'Money'>` carrega exatamente o necessário, com `readonly` no campo.
5. **Erros tipados e descritivos** — `MoneyError` cobre falhas de construção; `subtract` tem subset próprio (`'money-negative-result'`), revelando que só esse erro pode acontecer ali.
6. **Convenção de import idiomática TS 5+** — `import { type Result, ok, err }` (inline `type` em import misto) bate com `verbatimModuleSyntax: true`.

---

## Notas (🔵 não-bloqueantes)

### Nota 1 — Múltiplos casts `as Money`

`as Money` aparece em **4 lugares** (linhas 14, 17, 20, 25). Justifico cada um:

| Linha | Função | Por que o cast é seguro |
| :---: | :--- | :--- |
| 14 | `fromCents` | É **o** smart constructor — cast só após `Number.isInteger` + `cents ≥ 0`. |
| 17 | `zero()` | `{ cents: 0 }` satisfaz invariante (`cents ≥ 0`, inteiro) por construção. |
| 20 | `add(a, b)` | Invariante: se `a` e `b` são `Money` válidos (≥ 0, inteiros), `a.cents + b.cents` também é. Confiável **por tipo de entrada**. |
| 25 | `subtract` | Cast só após `if (diff < 0) return err(...)`. |

**Aceitável** porque cada cast é matematicamente justificado. Alternativa "purista" seria fazer `add` retornar `Result` via `fromCents(a.cents + b.cents)` — adiciona overhead sem ganho real. **Sugestão:** considerar comentário curto em `add` (linha 19) explicando a invariância para futuros mantenedores ler em 5s. Ex.: `// safe: Money invariant ensures a.cents, b.cents are non-negative integers.` Mas vai contra "default no comments" do CLAUDE.md raiz — então **deixar como está** é razoável.

### Nota 2 — `-0` cruza `fromCents` silenciosamente

`Money.fromCents(-0)` retorna `Ok({ cents: -0 })` porque:
- `Number.isInteger(-0) === true`
- `-0 < 0 === false`

`-0` é equivalente a `0` em quase todas as operações JS (`0 === -0` é `true`, `-0 + 5 === 5`, etc.), exceto `1 / -0 === -Infinity` (irrelevante aqui). **Não vejo cenário operacional onde isso quebra regra de negócio.** Pode ser anotado como curiosidade. Adicionar teste explícito não muda o comportamento (já passa). **Não bloquear.**

### Nota 3 — Sem teste de overflow `MAX_SAFE_INTEGER`

`add(a, b)` com `a.cents + b.cents > Number.MAX_SAFE_INTEGER` (~9×10¹⁵) produz resultado impreciso silenciosamente. Para contexto: 10¹⁵ centavos = R$ 10 trilhões — impraticável para ERP de cooperativa. **YAGNI confirmado, não bloquear.** Se eventualmente houver demanda real (improvável), abrir ticket para migrar `cents: number` → `cents: bigint`.

### Nota 4 — Helper `c(n)` nos testes usa `throw`

Em `tests/modules/contracts/domain/shared/money.test.ts` (linhas 56-60, 91-95, 122-126), o helper `c(n)` faz `throw new Error('test fixture broken: ...')`. **Aceitável em testes** — `throw` aqui apenas indica "fixture quebrada, falhe rápido". O grep mecânico de `throw` reportaria, mas o checklist da skill (§A) é específico a `src/modules/*/domain/` — testes em `tests/` não estão sob essa regra. **Sem ação.**

---

## O que ficou particularmente bom

- **Coesão `Money` tipo + valor** — `type Money` e `const Money = { ... }` coexistem sem fricção. Idiomático TS, claríssimo para o leitor.
- **`MoneyError` separa "erros de construção" (`fromCents`) de "erro de operação" (`subtract`).** A função `subtract` retorna `Result<Money, 'money-negative-result'>` — não a união completa — comunicando que **só esse erro é alcançável** naquele caminho. Aderência precisa ao Result Pattern.
- **`add` decididamente sem `Result`** (D4) — escolha consciente, justificada no REPORT W0. Operação total sob invariante; introduzir `Result` seria ruído.

---

## Próximo passo

W3 — `ts-quality-checker` roda `tsc --noEmit` + `pnpm test` + format (se houver) e produz `005-quality/REPORT.md`. Esperado: ALL GREEN, ticket fecha.
