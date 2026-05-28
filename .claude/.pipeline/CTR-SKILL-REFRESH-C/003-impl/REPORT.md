# W1 — GREEN — CTR-SKILL-REFRESH-C

> **Status:** ✅ completed (round 1)
> **Skill:** [`ts-domain-modeler`](../../../skills/ts-domain-modeler/SKILL.md)
> **Data:** 2026-05-20
> **Modo de execução:** sub-agent `contratos-orchestrator` (Opção B) — 44 tool uses, ~6.3 min, completou todo o trabalho documental. Parou pedindo autorização para corrigir bug no script verificador W0 (falso negativo POSIX). Main session: aplicou o fix no script + validou os 4 gates verdes + escreveu este REPORT.

---

## Arquivos modificados

```
.claude/skills/ts-domain-modeler/SKILL.md                                # +§3.C completa (6 sub-seções) + fix linha 99 + changelog
.claude/.pipeline/CTR-SKILL-REFRESH-C/002-tests/verify-skill-refresh-c.sh   # fix POSIX no CA5 (grep -c + zero matches → exit 1)
```

`src/` e `tests/` — **intocados** (CA9 ✅).

---

## Decisões técnicas

### D1 — Estrutura da §3.C — 6 sub-seções autocontidas

W0 alertou que CA6 e CA10 estavam passando via §3.D (greps file-wide). Resposta no W1: cada sub-seção da §3.C tem **instâncias próprias** dos conceitos (não depende de §3.D):

1. **§3.C.1 — Aninhamento como Padrão de 2 Eixos** — exemplo `AmendmentVariant` + `AmendmentCore` reescrito no contexto C.
2. **§3.C.2 — Dupla Taxonomia Legítima** — `Amendment` vs `ContractAdjustment`, snippet de `domain/contract/types.ts:114-119`.
3. **§3.C.3 — Função-Ponte Retorna Array** — `Amendment.toAdjustments`, snippet de `homologate-amendment.ts:57-73`, 3 cardinalidades (1:1, 1:N, 0:1).
4. **§3.C.4 — Exhaustive Switch — Sem `throw`** — Padrão A (omitir default) + Padrão B (`const _: never; return _`) + DON'Ts (`throw new Error`, `assertNever`).
5. **§3.C.5 — Tabela canônica** — `**DO (5)**` + `**DON'T (5)**` + `**CONSIDER (2)**` (divergência documentada vs L971 que dizia 6+6+2).
6. **§3.C.6 — Tickets vivos** — 4 IDs literais.

### D2 — Issue pré-existente SKILL.md:99 corrigida

`throw new Error(...)` no exhaustive default da seção "Obrigações" foi substituído por **Padrão B** do §3.C.4:

```ts
// Antes:
default: { const _exhaustive: never = amendment; throw new Error(`unreachable: ${_exhaustive}`); }

// Depois:
default: { const _exhaustive: never = amendment; return _exhaustive; }
// Veja §3.C.4 (Padrão B) — exhaustive sem throw.
```

`grep -c "throw new Error" .claude/skills/ts-domain-modeler/SKILL.md` → **0**.

### D3 — Bug POSIX no verificador W0 corrigido pela main session

`grep -c PATTERN FILE` retorna exit 1 com zero matches (POSIX), mesmo imprimindo `"0"` no stdout. O W0 estava usando:

```bash
throw_count=$(grep -c "throw new Error" "$SKILL_FILE" 2>/dev/null || echo "0")
```

Quando zero matches:
- grep imprime `"0"` no stdout + sai com 1.
- `||` aciona `echo "0"` → stdout vira `"0\n0"`.
- `[ "0\n0" -eq 0 ]` falha → falso negativo.

Fix aplicado pela main session em `verify-skill-refresh-c.sh:109`:

```bash
throw_count=$(grep -c "throw new Error" "$SKILL_FILE" 2>/dev/null; true)
```

`; true` força exit 0 do subshell mantendo o stdout do `grep -c`. Após o fix: **10/10 PASSED**.

### D4 — Divergência 5+5+2 vs L971 documentada

A tabela L971 da entrevista declara `6 DO + 6 DON'T + 2 CONSIDER` mas a contagem real `(C)` na entrevista é **5+5+2**. Decisão: usar contagem real, registrar divergência no 000-request §"Discrepância de contagem". Não inventar regras para chegar a 6+6.

### D5 — Changelog atualizado

Entrada `2026-05-20: §3.C criada (Discriminated Unions & Exhaustive Switch); fix do exhaustive default na seção "Obrigações"`.

---

## Saída literal dos gates

### Verificador W0 (`bash verify-skill-refresh-c.sh`)

```
Result: 10/10 PASSED
Status: GREEN — todos os critérios satisfeitos.

[PASS] CA1: Seção §3.C existe
[PASS] CA2: 5 sub-seções presentes
[PASS] CA3: **DO (5)**, **DON'T (5)**, **CONSIDER (2)** presentes
[PASS] CA4: Padrão A + Padrão B documentados
[PASS] CA5: Zero ocorrências de 'throw new Error' na SKILL.md
[PASS] CA6: cross-product + AmendmentVariant + AmendmentCore presentes
[PASS] CA7: Dupla taxonomia + DON'T 'Eliminar ContractAdjustment'
[PASS] CA8: 4 tickets vivos referenciados
[PASS] CA9: src/ e tests/ intocados
[PASS] CA10: PendingWithoutDocumentAmendment + (applyHomologatedAdjustment | toContractAdjustment)
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
ℹ cancelled 0
ℹ skipped 13
ℹ duration_ms 38189.109
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

| CA | Estado | Evidência |
| :--- | :---: | :--- |
| **CA1** — Seção §3.C existe | ✅ | Verificador W0 |
| **CA2** — 5 sub-seções | ✅ | Verificador W0 — 5 títulos (Aninhamento / Dupla Taxonomia / Função-Ponte / Exhaustive / Tabela) |
| **CA3** — 5 DO + 5 DON'T + 2 CONSIDER | ✅ | Verificador W0 — marcadores literais |
| **CA4** — Padrão A + Padrão B | ✅ | Verificador W0 — strings `Padrão A` e `Padrão B` presentes |
| **CA5** — Issue SKILL.md:99 corrigida | ✅ | `grep -c "throw new Error" SKILL.md` retorna 0 |
| **CA6** — Aninhamento anti cross-product | ✅ | Verificador W0 |
| **CA7** — Dupla taxonomia explicitada | ✅ | Verificador W0 |
| **CA8** — 4 tickets vivos | ✅ | Verificador W0 |
| **CA9** — `src/`/`tests/` intocados | ✅ | `git diff --cached` zero + typecheck/test/lint zero regressão |
| **CA10** — Doc fiel ao código vivo | ✅ | Verificador W0 (snippets fiéis ao `src/`) |

---

## Próximo passo

→ **W2 (REVIEW)** — `code-reviewer` audita qualitativamente:
- Ratio legis de cada DO/DON'T do §3.C.
- Fidelidade dos snippets ao código vivo (Amendment aninhado, ContractAdjustment, toContractAdjustment, exhaustive switch real).
- Validação que o fix da linha 99 não introduziu regressão semântica (Padrão B aceito, comentário explicativo presente).
- Cross-refs §3.C ↔ §3.D consistentes.
