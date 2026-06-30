# W2 — Code Review read-only — CTR-DOMAIN-EXHAUSTIVE-SWITCH-FIX

> **Reviewer:** skill [`code-reviewer`](../../../skills/code-reviewer/SKILL.md) — wave W2 (read-only).
> **Rounds:** 1.
> **Veredito:** **APPROVED.**
> **Data:** 2026-05-20.

---

## Escopo do diff

| Arquivo | Tipo | Δ |
| :--- | :--- | :--- |
| `src/modules/contracts/cli/formatters/period.ts` | Edit | 1 linha (throw → return) |
| `src/modules/contracts/application/use-cases/homologate-amendment.ts` | Edit | 1 linha (throw → return) |
| `tests/regression/no-throw-in-exhaustive-default.test.ts` | Criação | 62 LOC |

Total em src/: **2 inserções, 2 deleções, 2 arquivos**.

---

## 1. Checklist contra `CLAUDE.md` raiz

| # | Regra | Verificação | Status |
| :-- | :-- | :-- | :-- |
| 1 | §"Anti-padrões" #7 — `throw new Error` no `default` exaustivo é proibido | `grep -rn "throw new Error" src/modules/contracts/ \| grep -E "default" \| head` → 0 hits | ✅ |
| 2 | §"Domínio puro" — `throw` proibido | `homologate-amendment.ts` está em `application/use-cases/` — a regra de "domínio puro stricto sensu" não se aplica direto a use case, MAS o §"Anti-padrões" #7 cobre o `default:` exhaustive em qualquer lugar do código. Era violação, agora corrigida | ✅ |
| 3 | §"Discriminated unions + `switch` exaustivo" — "Nunca usar `default: throw`" | Forma `default: { const _: never = x; return _; }` aplicada em ambos os sítios | ✅ |
| 4 | §"Sintaxe": `import type { X }` ou `import { type X }` | Imports dos 2 arquivos editados já usavam `type` — não foram tocados | ✅ |
| 5 | §"Trabalho não-trivial passa pela pipeline W0→W3" | Ticket aberto em `.claude/.pipeline/CTR-DOMAIN-EXHAUSTIVE-SWITCH-FIX/`, REPORTs W0+W1 escritos | ✅ |
| 6 | §"Imutabilidade absoluta" | N/A (não toca estruturas mutáveis) | ✅ |
| 7 | §"Sem `class`, sem `this`" | `grep -n '\bclass\b\|this\.' src/modules/contracts/cli/formatters/period.ts src/modules/contracts/application/use-cases/homologate-amendment.ts` → 0 hits | ✅ |
| 8 | §"Sem `any`" | 0 ocorrências introduzidas | ✅ |

---

## 2. Checklist contra a entrevista 0001 — Bloco C

| Decisão (linhas 879–923 do master doc) | Verificação | Status |
| :-- | :-- | :-- |
| DO C§32 — Exhaustive switch: "omitir `default` (preferível) ou `default: { const _: never = x; return _; }`. Nunca `throw`." | Padrão exato aplicado em ambos os sítios | ✅ |
| DON'T C§29 — `default: throw new Error(...)` viola "zero throw" | Removido em ambos | ✅ |
| DON'T C§30 — `assertNever(x: never): never` banido | Não usado | ✅ |
| DO C§28 (linha 880) — Modelar 2 eixos como aninhamento | N/A (não muda modelagem) | ✅ |

---

## 3. Critérios de aceitação do ticket

| CA | Verificação | Status |
| :-- | :-- | :-- |
| CA-1 (RED pré-W1) | W0 capturou 2/2 fail no regression guard | ✅ |
| CA-2 (GREEN pós-W1) | W1 mostrou 2/2 pass | ✅ |
| CA-3 (`period.ts` aplica padrão) | Verificado linha-a-linha §4.1 | ✅ |
| CA-4 (`homologate-amendment.ts` aplica padrão) | Verificado linha-a-linha §4.2 | ✅ |
| CA-5 (zero novos `throw` no diff) | `git diff -U0 \| grep '^+.*throw'` → 0 hits no diff | ✅ |
| CA-6 (zero novos `class`/`any`/`as`) | `git diff -U0 \| grep -E '^+.*(class\|: any\|as )'` → 0 hits | ✅ |
| CA-7 a CA-10 | Reservados para W3 | ⏭ |

---

## 4. Inspeção linha-a-linha

### 4.1 `src/modules/contracts/cli/formatters/period.ts`

```ts
4  export const formatPeriod = (p: Period): string => {
5    switch (p.kind) {
6      case 'Fixed':
7        return `${formatDate(p.start)} a ${formatDate(p.end)}`;
8      case 'Indefinite':
9        return `${formatDate(p.start)} (indefinido)`;
10     default: {
11       const _exhaustive: never = p;
12       return _exhaustive;          // ← antes: throw new Error(`unreachable: ${JSON.stringify(_exhaustive)}`)
13     }
14   }
15 };
```

- **Type system:** `Period = { kind: 'Fixed' } | { kind: 'Indefinite' }`. Após `case 'Fixed'` e `case 'Indefinite'`, `p` é narrowed para `never`. O `const _exhaustive: never = p` é o canary que trava o compilador se um `kind` novo for adicionado.
- **Runtime:** o branch `default` é unreachable se o type system estiver correto. `return _exhaustive` declara essa unreachability sem `throw` — sai do controle de fluxo via valor (que nunca existe), não via exceção.
- **Tipo de retorno:** `string`. `never ⊑ string`, então o `return` é type-safe.

### 4.2 `src/modules/contracts/application/use-cases/homologate-amendment.ts`

```ts
59 export const toContractAdjustment = (amendment: AmendmentEntity): ContractAdjustment => {
60   const amendmentId: AmendmentId = amendment.id;
61   switch (amendment.kind) {
62     case 'Addition':       return { kind: 'ValueIncrease', amount: amendment.impactValue, amendmentId };
63     case 'Suppression':    return { kind: 'ValueDecrease', amount: amendment.impactValue, amendmentId };
64     case 'TermChange':     return { kind: 'PeriodExtension', newEnd: amendment.newEndDate, amendmentId };
65     case 'Misc':           return { kind: 'Acknowledgment', amendmentId };
66     default: {
67       const _exhaustive: never = amendment;
68       return _exhaustive;          // ← antes: throw new Error(`unreachable: …`)
69     }
70   }
71 };
```

- **Type system:** `Amendment` é discriminated union por `kind` com 4 variantes. Idêntica análise do §4.1 — `amendment: never` após cobrir todas.
- **Tipo de retorno:** `ContractAdjustment` (union de 4 kinds). `never ⊑ ContractAdjustment`.
- **Localização:** este `toContractAdjustment` é função helper exportada do use case `homologateAmendment`. Apesar de estar em `application/`, é função pura (sem deps injetadas) — o `throw` antigo era violação clara do §"Anti-padrões" #7.

### 4.3 `tests/regression/no-throw-in-exhaustive-default.test.ts`

Já revisado em W0 (escrito + capturado RED). Análise resumida:

- 62 LOC, zero `throw`/`class`/`any`.
- Usa `node:fs/promises` e `node:url` para resolver paths cross-platform.
- `WATCHED_FILES: readonly string[]` — compliance com "readonly arrays".
- Regex `FORBIDDEN_PATTERN` declarada como `const` (não recriada a cada `it`).
- Mensagem de erro instrutiva — cita fonte normativa (Bloco C DO §32 + DON'T §29 + CLAUDE.md Anti-padrão #7).

---

## 5. Issues encontradas

**Nenhuma.** Round único. Padrão de fix idêntico ao precedente `CTR-DB-MAPPER-NO-THROW` (APPROVED round 1 em 2026-05-18), aplicado em 2 sítios em vez de 4.

---

## 6. Citações sustentando as decisões

- **CLAUDE.md raiz** §"Anti-padrões" #7: "**`throw new Error(...)` no `default` de switch exhaustivo** — usar `const _: never = x` apenas."
- **CLAUDE.md raiz** §"Regras invariantes" → Domínio puro → "Discriminated unions + `switch` exaustivo. (...) Nunca usar `default: throw` — usar `default: { const _: never = x; return _; }` ou omitir default."
- **Entrevista 0001** Bloco C DO §32 (linha 884): "Exhaustive switch: **omitir `default`** (preferível) ou `default: { const _: never = x; return _; }`. Nunca `throw`."
- **Entrevista 0001** Bloco C DON'T §29 (linha 922): "`default: throw new Error(...)` no exhaustive switch — viola 'zero throw' do CLAUDE.md raiz. **Contradição admitida do PhD** (usou no template após cobrança)."
- **Precedente** `CTR-DB-MAPPER-NO-THROW/004-code-review/REVIEW.md`: padrão `default: { const _exhaustive: never = x; return _exhaustive; }` APPROVED round 1.

---

## Veredito final

**APPROVED.** Diff alinhado integralmente com:
- CLAUDE.md raiz §"Anti-padrões" #7 + §"Discriminated unions".
- Entrevista 0001 Bloco C (DO §32 + DON'T §29/§30).
- 6/10 CAs verificáveis em W2 (CA-1 a CA-6 ✅; CA-7 a CA-10 → W3).
- Precedente idêntico em `CTR-DB-MAPPER-NO-THROW`.

→ **Pronto para W3 — Quality Gate.**
