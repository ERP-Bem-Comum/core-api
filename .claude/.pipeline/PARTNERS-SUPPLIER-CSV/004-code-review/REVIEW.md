# Code Review — Ticket PARTNERS-SUPPLIER-CSV — Round 1

**Veredito:** APPROVED

**Reviewer:** code-reviewer
**Data:** 2026-06-01T18:52Z
**Escopo revisado:**
- `src/modules/partners/adapters/export/supplier-csv.ts` (novo)
- `tests/modules/partners/adapters/export/supplier-csv.test.ts`
- Confronto com `src/modules/partners/domain/supplier/{types,payment-target,supplier}.ts` e `#src/shared/utils/csv.ts`

---

## Verificações do escopo (000-request.md)

| # | Critério | Resultado |
| --- | --- | --- |
| 1 | Switch exaustivo por `status` sem `default: throw` | ✅ `switch (s.status)` com `Active`/`Inactive`, sem `default` (cobre a union; satisfaz `switch-exhaustiveness-check` + `noImplicitReturns`). `supplier-csv.ts:53-58`. |
| 2 | Payment target discriminado (null → colunas vazias) | ✅ `bank?.x ?? ''` / `pix?.x ?? ''` (`:46-51`). Active+bank e Active+pix cobertos no teste. |
| 3 | `deactivatedAt` ISO só em Inactive | ✅ `.toISOString()` só no ramo `Inactive` (`:57`); `''` em `Active` (`:55`). |
| 4 | Consome o util, sem escape/BOM/separador próprios | ✅ Delegado a `toCsv(HEADER, ...)` (`:61-62`); zero constante de formato local. CA atendido. |
| 5 | Imports `#src/` + `.ts` + `import type` | ✅ `toCsv` import de valor; `import type { Supplier }` (`:9-10`); relativo `.ts`. |
| 6 | Sem import cross-módulo proibido (ADR-0006) | ✅ Só importa o próprio domínio (`../../domain/...`) + `shared/utils`. Nenhum acesso a outro módulo. |
| 7 | Zero domínio reimplementado | ✅ Não reescreve `Supplier`/payment target; só lê campos do agregado. |

---

## Categorias do checklist

- **C (discriminated union):** ✅ discriminador `status` (EN); exaustivo sem default.
- **D (adapters):** ✅ função pura, sem IO/`throw`/`Result` (transformação determinística sobre domínio válido).
- **E (modular monolith):** ✅ adapter de `partners` consome só seu domínio + `shared/`.
- **F (ESM/TS):** ✅ `.ts`, `import type`, sem `require`/`enum`/`namespace`.
- **G (naming/idioma):** ✅ EN; `supplierToCells`/`suppliersToCsv`/`HEADER`/`paymentTarget`/`identity` claros; doc-comment PT (permitido).
- **TS estrito:** ✅ branded `s.id`/`s.cnpj`/`s.serviceCategory` atribuíveis a `string` sem `as`; sem index-access (não dispara `noUncheckedIndexedAccess`).
- **H (testes):** ✅ fixtures via `Supplier.register`/`deactivate` (IDs/instantes injetados, UUID v4 real); asserções por coluna, não só "não lança"; cobre os 5 CAs + escape integrado.

---

## O que está bom

- Simetria deliberada com `contracts-csv.ts` (mesmo `HEADER`/`cellsFor`→`toCsv`), exatamente a topologia desenhada em `.planning/EXPORT-ABSTRACTION-DESIGN.md`: projeção concreta por módulo + util agnóstico.
- `paymentTarget` extraído uma vez e reusado nos dois ramos do switch — sem duplicar as 6 células.
- Teste valida a **integração** projeção→escape (vírgula citada, `=` prefixado) sem re-testar a mecânica do util — fronteira de cobertura correta.
- Adapter de apresentação puro: pronto pra futura rota/CLI sem refactor, como previsto no escopo.

---

## Próximo passo

- **APPROVED:** pipeline-maestro avança para W3 (typecheck + format:check + test + lint).
