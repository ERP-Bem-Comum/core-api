# W2 — Code Review (read-only) · BGP-MONTH-VO (#413)

**Agente/Skill:** `code-reviewer` · **Data:** 2026-07-15

## Round 1 — **REJECTED**

### 🟠 Minor-1 — Comentários sem acentuação, contra a regra do projeto e o padrão do módulo

**Arquivo:** `src/modules/budget-plans/domain/shared/exercise-month.ts` (linhas 4, 6, 13, 20)

```
// Padrao D (module-as-namespace): consumir com ...
// Mes do exercicio do plano (#413). O exercicio e o ano civil: 1..12, inteiro.
// Number.isInteger ja barra NaN, Infinity e fracao — nao precisa de guarda extra.
// Row -> dominio. Mesma regra do parse: o dominio nao confia no banco ...
```

**Regra violada** — output style do projeto (`.claude/output-styles/erp-contracts.md`, ativo em `settings.json`):

> Maintain full orthographic correctness for Portugues, including all required diacritical marks. **Never substitute accented characters with their ASCII equivalents** (e.g., never write "nao" for "não").

**Padrão do módulo** — os vizinhos acentuam:

```
budget-result.ts:15  // Lançamento calculado de uma subcategoria: o valor é derivado (server-side...
calc-model.ts:5      // Modelo de cálculo do lançamento: discriminated union cujo discriminante É...
```

**Causa:** o `budget-id.ts` (`// Padrao D...`) foi usado como molde — mas ele é **a exceção**, não a regra. Copiar o vizinho mais próximo sem checar a regra é precisamente o anti-padrão que a memória `adr-over-code-precedent-for-adherence` alerta: **julgar aderência pelo ADR/regra lida, nunca pelo precedente do código**.

**Correção:** acentuar os 4 comentários. Não tocar em identificadores (EN, corretos).

---

## ✅ Conformidade verificada

| Regra | Fonte | Estado |
| :--- | :--- | :--- |
| Zero `throw` | `.claude/rules/domain.md` §"throw proibido" | ✅ todo caminho devolve `Result` |
| Zero `class`, zero `this` | idem §"Sem class" | ✅ funções standalone |
| Sem `any` | idem §"Sem any" | ✅ |
| Branded type + smart constructor | idem §"Branded types" | ✅ `Brand<number, 'ExerciseMonth'>` + `parse` |
| Erro = string literal union EN kebab | idem §"Erros são string literal unions" | ✅ `'exercise-month-invalid'` |
| `import type` p/ tipo · extensão `.ts` | AGENTS.md §"sintaxe TS" | ✅ |
| Isolamento de módulo | ADR-0006 / ADR-0014 | ✅ nada fora de `budget-plans/domain/shared/` |
| Idioma: identificadores EN | AGENTS.md §"Idioma" | ✅ |
| Lint | `pnpm exec eslint` | ✅ limpo |
| Typecheck | `tsc --noEmit` | ✅ limpo |

## 👍 Pontos positivos

- **`Number.isInteger` sozinho** cobre `NaN`, `±Infinity` e fração. Correto e enxuto — evita a guarda tripla que a maioria escreveria.
- **`rehydrate` delega a `parse`** em vez de repetir a condição: uma regra, duas portas. Se a faixa mudar, muda num lugar só.
- **`FIRST`/`LAST` nomeados** em vez de `1`/`12` soltos no meio da expressão — o "ano civil" fica explícito.
- **Sem `generate()`**, ao contrário dos VOs de id vizinhos: mês não se gera, se informa. Ausência deliberada e correta.
- **`rehydrate` valida** em vez de confiar no `CHECK` do MySQL — respeita `adapters.md` §"mappers devolvem `Result`; domínio rejeita estado inválido vindo do banco".

## 📋 Escopo — verificado e aprovado

O escopo foi **corrigido durante o W1**: o `month` no agregado desceu para `BGP-MONTH-PERSIST` porque o typecheck provou que é mudança de assinatura transversal (7 call sites). **A decisão está correta** e é a única que preserva o gate W3 de cada fatia (§II — regressão zero). As alternativas rejeitadas (`month` opcional, default no mapper, typecheck vermelho entre fatias) estão registradas no `003-impl/REPORT.md` com o porquê. **Sem scope-creep:** esta fatia entrega **um** arquivo de produção.

---

## Round 2 — **APPROVED**

Minor-1 corrigido: os 4 comentários acentuados (`Padrão`, `Mês do exercício`, `é o ano civil`, `já barra`, `fração`, `não precisa`, `domínio não confia`). Nenhuma outra alteração. Lint, typecheck e a suíte seguem verdes (6/6).

**Veredito: APPROVED** — pronto para o W3.
