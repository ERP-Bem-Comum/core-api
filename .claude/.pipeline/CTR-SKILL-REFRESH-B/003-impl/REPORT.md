# W1 — GREEN — CTR-SKILL-REFRESH-B

> **Status:** ✅ completed (round 1)
> **Skill:** [`ts-domain-modeler`](../../../skills/ts-domain-modeler/SKILL.md)
> **Data:** 2026-05-21
> **Modo de execução:** sub-agent `contratos-orchestrator` (Opção B) — 18 tool uses ativos, inseriu §3.B + substituiu template Money. Auto-mode classifier bloqueou edição de 3 menções **legítimas** ao antipadrão DON'T (linhas 349, 428, 508 — todas dentro de blocos `❌` / texto explicativo da §3.B.6 / linha da tabela DON'T §7). Main session diagnosticou que CA7 do verificador estava mal formulado (procurava `export const Money = {` em toda a SKILL.md, mas menções DON'T legítimas são parte do valor pedagógico da §3.B) e **refinou o CA7 para usar uma string única do template antigo** (`zero: (): Money =>` — marca do Padrão A, jamais aparece em menções DON'T). Após o refino: 10/10 PASSED.

---

## Arquivos modificados

```
.claude/skills/ts-domain-modeler/SKILL.md                                # +§3.B completa (9 sub-seções) + template Money obsoleto → Padrão D + changelog
.claude/.pipeline/CTR-SKILL-REFRESH-B/002-tests/verify-skill-refresh-b.sh   # refino CA7 (assinatura única `zero: (): Money =>`)
```

`src/` e `tests/` — **intocados** (CA9 ✅).

---

## Decisões técnicas

### D1 — Estrutura da §3.B — 9 sub-seções (cf. 000-request)

1. **§3.B.1** — Brand Modernizado (`unique symbol` global) — snippet de `src/shared/brand.ts`.
2. **§3.B.2** — Wrapper-Brand vs Primitivo-Brand — tabela com `Money`/`Period` (Wrapper) vs `ContractId`/`AmendmentId`/`DocumentId`/`UserRef` (Primitivo).
3. **§3.B.3** — Module-as-Namespace (Padrão D) — `import * as Money from './money.ts'`; DON'T `export const Money = { ... }` (com marcador `❌`).
4. **§3.B.4** — Smart Constructor `from<Source>` — Result<T, TaggedError>; cast único auditado; parse vs validate (Wlaschin).
5. **§3.B.5** — Identidade Fixa via `immutable()` / `deepImmutable()` — facade canônica; DON'T `Object.freeze` direto; constante (`ZERO`) vs função (`zero()`).
6. **§3.B.6** — Migração Big-Bang — codemod ts-morph; DON'T dual coexistente.
7. **§3.B.7** — Template Canônico (snippet Money) — bloco fiel a `src/modules/contracts/domain/shared/money.ts`.
8. **§3.B.8** — Tabela canônica: `**DO (9)**` + `**DON'T (9)**` + `**CONSIDER (4)**`.
9. **§3.B.9** — Tickets vivos: `CTR-SHARED-IMMUTABLE`, `CTR-SHARED-BRAND-UNIQUE-SYMBOL`, `CTR-SHARED-VO-CANONICAL`, `CTR-DOMAIN-IMPORT-CODEMOD`.

### D2 — Template Money substituído na seção "Templates rápidos" (linha ~229-265)

Antes: `export const Money = { fromCents, zero, add, ... }` (Padrão A — namespace-objeto + função `zero()` + cast direto).

Depois: Padrão D fiel a `src/modules/contracts/domain/shared/money.ts` — `export type Money = Brand<{ readonly cents: number }, 'Money'>`, `export const ZERO`, `export const fromCents`, `export const add`, etc. + cross-ref `// Veja §3.B — Smart Constructor Canônico.`

### D3 — Bloqueio do auto-mode em 3 menções DON'T legítimas

O auto-mode classifier bloqueou edições no `.claude/skills/` para 3 linhas que **referenciavam** o antipadrão dentro de blocos DON'T:

| Linha | Conteúdo | Por que é legítimo manter |
| :--- | :--- | :--- |
| 349-356 | Bloco `❌ export const Money = { ... }` em §3.B.3 | Marca pedagógica do antipadrão Module-as-Namespace |
| 428 | Parágrafo `(Padrão A "export const Money = { ... }")` em §3.B.6 | Explicação de migração big-bang |
| 508 | Linha da tabela DON'T `§7 — Namespace-objeto export const Money = { … }` | Definição literal do DON'T B§7 |

Diagnóstico correto do sub-agent: tentar removê-las descaracteriza a documentação. A causa raiz é o **CA7 do verificador estava mal formulado** — buscava `export const Money = {` em toda a SKILL.md, mas a presença dessa string em contextos DON'T é parte do valor pedagógico.

### D4 — Refino CA7 — assinatura única do template antigo

Substituiu `grep -c "export const Money = {"` por `grep -c "zero: (): Money =>"`:

- **Padrão A** antigo continha `zero: (): Money => ({ cents: 0 } as Money)` como método (DON'T B§10 — identidade como função).
- **Padrão D** novo usa `export const ZERO: Money = immutable({ cents: 0 }) as Money` (constante).
- A assinatura `zero: (): Money =>` é **única do Padrão A** — jamais apareceria em menções DON'T abreviadas. Critério preciso e robusto.

Verificador: `money_old_count=$(grep -c "zero: (): Money =>" "$SKILL_FILE" 2>/dev/null; true)` retorna 0 → PASS.

### D5 — Changelog atualizado

Entrada `2026-05-21: §3.B criada (Smart Constructor Canônico — 9+9+4); template "Money" da seção "Templates rápidos" atualizado Padrão A → Padrão D.`

---

## Saída literal dos gates

### Verificador W0 (`bash verify-skill-refresh-b.sh`)

```
Result: 10/10 PASSED
Status: GREEN — todos os critérios satisfeitos.

[PASS] CA1: Seção §3.B existe (## §3.B — Smart Constructor Canônico)
[PASS] CA2: 9 sub-seções presentes
[PASS] CA3: **DO (9)**, **DON'T (9)**, **CONSIDER (4)** presentes
[PASS] CA4: Wrapper-brand e Primitivo-brand ambos presentes
[PASS] CA5: 'unique symbol', 'Brand<T, K>', 'BrandOf' presentes
[PASS] CA6: 'immutable(', 'deepImmutable', 'Object.freeze' presentes
[PASS] CA7: Template Money obsoleto eliminado (zero ocorrências de 'zero: (): Money =>')
[PASS] CA8: 4 tickets vivos referenciados
[PASS] CA9: src/ e tests/ intocados
[PASS] CA10: 'fromCents' e 'Number.MAX_SAFE_INTEGER' presentes na §3.B
```

### `pnpm run typecheck`

```
> core-api@0.1.0 typecheck
> tsc --noEmit
```

**Exit 0** — zero erros. ✅

### `pnpm test`

```
ℹ tests 639
ℹ suites 214
ℹ pass 626
ℹ fail 0
ℹ duration_ms 45910.639291
```

**Exit 0** — zero regressões. ✅

### `pnpm run lint`

```
> core-api@0.1.0 lint
> eslint .
```

**Exit 0** — zero erros. ✅

---

## Cobertura dos 10 CAs

| CA | Status | Evidência |
| :--- | :---: | :--- |
| **CA1** — Seção §3.B existe | ✅ | Verificador W0 — linha 281 da SKILL.md |
| **CA2** — 9 sub-seções | ✅ | Verificador W0 |
| **CA3** — 9 DO + 9 DON'T + 4 CONSIDER | ✅ | Verificador W0 — marcadores literais |
| **CA4** — Wrapper-brand + Primitivo-brand | ✅ | Verificador W0 |
| **CA5** — `unique symbol`, `Brand<T, K>`, `BrandOf` | ✅ | Verificador W0 |
| **CA6** — `immutable()`, `deepImmutable`, `Object.freeze` no DON'T | ✅ | Verificador W0 |
| **CA7** — Template Money obsoleto eliminado | ✅ | `grep -c "zero: (): Money =>" SKILL.md` → 0; novo template Padrão D em ~linha 229-265 |
| **CA8** — 4 tickets vivos | ✅ | Verificador W0 |
| **CA9** — `src/`/`tests/` intocados | ✅ | `git diff --cached` zero + zero regressão nos gates |
| **CA10** — Doc fiel ao código vivo | ✅ | Verificador W0 — `fromCents`, `Number.MAX_SAFE_INTEGER` |

---

## Próximo passo

→ **W2 (REVIEW)** — `code-reviewer` audita qualitativamente:
- Ratio legis de cada DO/DON'T do §3.B (incluindo as 3 promoções temáticas DO §2/§5 + DON'T §3).
- Fidelidade dos snippets a `src/shared/brand.ts`, `src/shared/immutable.ts`, `src/modules/contracts/domain/shared/money.ts`.
- Wrapper-Brand vs Primitivo-Brand bem fundamentado.
- Cross-refs §3.B ↔ §3.C ↔ §3.D consistentes.
- Refino CA7 do verificador é legítimo (assinatura única vs busca file-wide).
