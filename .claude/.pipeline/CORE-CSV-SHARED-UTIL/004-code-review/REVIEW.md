# Code Review — Ticket CORE-CSV-SHARED-UTIL — Round 1

**Veredito:** APPROVED

**Reviewer:** code-reviewer
**Data:** 2026-06-01T17:40Z
**Escopo revisado:**
- `src/shared/utils/csv.ts` (novo)
- `src/modules/contracts/adapters/http/contracts-csv.ts` (refactor)
- Confronto com `tests/shared/utils/csv.test.ts` e `tests/modules/contracts/adapters/http/contracts-export-csv.routes.test.ts` (rede)

---

## Verificações do escopo (000-request.md)

| # | Critério | Resultado |
| --- | --- | --- |
| 1 | Output byte-a-byte idêntico | ✅ Lógica idêntica linha-a-linha (constantes, `neutralizeFormula`, escape, montagem `BOM + lines.join(CRLF) + CRLF`). Rede `contracts-export-csv.routes.test.ts` 9/9 verde sem alteração. |
| 2 | Regras de import | ✅ `#src/shared/utils/csv.ts` (subpath + `.ts`); `import type` para `Contract` e `ContractListItemDto`; `toCsv` import de valor (ok sob `verbatimModuleSyntax`). |
| 3 | Anti-fórmula CSV-injection | ✅ `FORMULA_TRIGGERS` = `= + - @ \t \r` preservado idêntico; caso combinado `\r` (fórmula + RFC4180) coberto no teste `csv.test.ts`. Security MUST mantido. |
| 4 | Sem domínio vazando p/ `shared/utils/` | ✅ `csv.ts` é mecânica pura de string; zero import de `Contract`/`Supplier`/qualquer agregado. Placement coerente com `shared/utils/{string,date,id}.ts`. |
| 5 | `cellsFor`/`HEADER` no módulo contracts | ✅ Permanecem em `contracts-csv.ts:12-67` (switch exaustivo por `status` conhece o agregado). |

---

## Categorias do checklist

- **F (ESM/NodeNext/TS):** ✅ imports `.ts`, `import type`, sem `require`/`enum`/`namespace`.
- **G (naming/idioma):** ✅ código EN; identificadores claros (`escapeCsvCell`, `toCsvLine`, `toCsv`); doc-comments PT (permitido).
- **TS estrito:** ✅ `value[0]` (`string | undefined` sob `noUncheckedIndexedAccess`) guardado com `first !== undefined`. Return types explícitos em todas as exports. Params `readonly` (satisfaz `prefer-readonly-parameter-types`).
- **D (adapters):** ✅ função pura, sem `throw`/`Result` (entrada já é `string`, sem I/O) — apropriado para transformação determinística.
- **E (modular monolith):** ✅ `shared/utils/` é consumível por qualquer módulo sem violar ADR-0006; nenhum import cross-módulo introduzido.

---

## O que está bom

- Extração cirúrgica: a mecânica saiu **idêntica**, sem reescrita — risco de regressão minimizado e provado pela rede de 9/9.
- `toCsv` deixou a projeção (achatamento) **fora** do util, exatamente a fronteira recomendada na sessão de design (`.planning/EXPORT-ABSTRACTION-DESIGN.md`): util agnóstico + projeção por módulo.
- Doc-comment do util documenta o "porquê" do anti-fórmula (security MUST) sem ruído.
- `contracts-csv.ts` encolheu para só o que conhece domínio; doc atualizado coerentemente.

---

## Próximo passo

- **APPROVED:** pipeline-maestro avança para W3 (gate de qualidade: typecheck + format:check + test + lint).
