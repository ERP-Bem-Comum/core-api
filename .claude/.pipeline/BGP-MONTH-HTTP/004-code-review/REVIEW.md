# W2 — Code Review (read-only) · BGP-MONTH-HTTP (#413)

**Agente/Skill:** `code-reviewer` · **Data:** 2026-07-15

## Round 1 — **REJECTED**

### 🟠 Minor-1 — Condição morta no filtro de mês

**Arquivo:** `application/use-cases/get-budget-results.ts:48`

```ts
const month = monthRaw === undefined ? undefined : ExerciseMonth.parse(monthRaw);
if (month !== undefined && !month.ok) return month;

const items =
  month === undefined || !month.ok        // ← `!month.ok` NUNCA é verdadeiro aqui
    ? list.value
    : list.value.filter((r) => r.month === month.value);
```

O early-return acima já garante `month.ok`. O ESLint provou:

```
48:7   error  Prefer using an optional chain expression instead    @typescript-eslint/prefer-optional-chain
48:30  error  Unnecessary conditional, value is always falsy       @typescript-eslint/no-unnecessary-condition
```

**Por que importa:** não é só ruído de linter — é **código morto que mente**. Quem lê a linha 48 acredita que `!month.ok` é um caso possível e vai procurar quando ele ocorre. O `Result` estava sendo carregado adiante quando só o **valor** interessava.

**Correção:** desempacotar o `Result` uma vez e seguir com `ExerciseMonth | undefined`:

```ts
let month: ExerciseMonth.ExerciseMonth | undefined = undefined;
if (monthRaw !== undefined) {
  const parsed = ExerciseMonth.parse(monthRaw);
  if (!parsed.ok) return parsed;
  month = parsed.value;
}
const items = month === undefined ? list.value : list.value.filter((r) => r.month === month);
```

_(O `= undefined` explícito satisfaz `@typescript-eslint/init-declarations`, apanhado na primeira tentativa do fix.)_

---

## ✅ Conformidade verificada

| Regra | Fonte | Estado |
| :--- | :--- | :--- |
| Borda contract-first Zod/OpenAPI | ADR-0027 | ✅ `satisfies FastifyZodOpenApiSchema`; `querystring` declarada |
| `z.coerce` na query, `z.int()` no body | `zod-expert` / padrão do módulo | ✅ e **justificado**: query é string, body é JSON |
| Bounds explícitos (`min`/`max`) no input | `zod-expert` | ✅ `1..12` nos dois |
| Soma no domínio, não na borda | `.claude/rules/application.md` | ✅ `Money.add` no use case; a borda só serializa |
| Application não importa `adapters/` | idem | ✅ |
| Erros EN kebab | AGENTS.md | ✅ `exercise-month-invalid` propaga do VO |
| Isolamento de módulo | ADR-0006 / ADR-0014 | ✅ nada fora de `budget-plans/` |
| `exactOptionalPropertyTypes` | tsconfig | ✅ `month?: number` no param, não em propriedade |

## 👍 Pontos positivos

- **`month` no DTO alcança as 5 rotas de graça** — `budgetResultToDto` é compartilhado pelos 4 POSTs e pelo GET; o CA2 sai junto do CA1 sem código extra. Reuso real, não coincidência.
- **O total acompanha o recorte** (`total` somado sobre `items`, não sobre a lista inteira). É a mesma classe do Blocker da fatia 2 (response que mente) — desta vez evitada por construção, e travada pelo CA3.
- **`z.coerce` só onde deve.** A distinção query × body está no comentário do schema, não na cabeça de quem escreveu: `"banana"` → `NaN` e `"3.5"` → `3.5` são ambos barrados por `int/min/max`.
- **Filtro em memória é escolha registrada, não descuido** — com o porquê (o grid já carrega o ano; `?month=` é conveniência de API) e o gatilho para revisar (volume multi-rede). Evita ampliar o port em duas implementações.
- **O CA5 trava a decisão de design** (12 itens numa ida, passador client-side): se alguém introduzir paginação ou filtro obrigatório, o teste quebra e a discussão volta — em vez de a decisão evaporar.

## 📋 Escopo

**Enxuto e fiel:** 4 arquivos, +50/−5. Nada além da leitura (US2) — a escrita já viera na fatia 2. Sem scope-creep.

---

## Round 2 — **APPROVED**

Minor-1 corrigido; o `Result` é desempacotado uma vez e o filtro opera sobre `ExerciseMonth | undefined`. `eslint` e `tsc` limpos; a suíte da borda segue **16/16**.

**Veredito: APPROVED** — pronto para o W3.
