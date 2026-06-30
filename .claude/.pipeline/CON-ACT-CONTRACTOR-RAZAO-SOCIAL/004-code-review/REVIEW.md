# W2 — REVIEW — CON-ACT-CONTRACTOR-RAZAO-SOCIAL

**Data:** 2026-06-15 · **Skill:** code-reviewer · **Round:** 1 · **Veredito:** ✅ **APPROVED**

Escopo auditado: opção 1 do card (`snapshot.name` do contratado ACT = razão social `corporateName`).
Suíte (reportada em W1): 2628 pass / 0 fail · typecheck 0 · format OK.

## Checklist

| # | Item | Status | Evidência |
| :--- | :--- | :--- | :--- |
| 1 | Isolamento (ADR-0006/0014): direção `contracts → partners` pela public-api; sem import reverso | ✅ | `grep "modules/contracts" src/modules/partners/` → vazio. `contractor-composition.ts:14` importa só `#src/modules/partners/public-api/index.ts`. |
| 2 | `ActView`/`actToView` expõem `corporateName` (molde da `FinancierView`); sem vazar agregado | ✅ | `contractor-view.mapper.ts:65` + `:118`, idêntico ao molde `FinancierView:38`/`:91`. |
| 3 | `viewToSnapshot` ramo `act` = `corporateName ?? name`; snapshot/schema sem campo novo; função privada | ✅ | `contractor-composition.ts:50-57`; `ContractorSnapshot:23-31` e `contractorSnapshotSchema` (`schemas.ts:403-409`) inalterados; `viewToSnapshot` não exportado. |
| 4 | Não-regressão: supplier/collaborator/**financier** mantêm `snapshot.name = name` | ✅ | `contractor-composition.ts:57` (`else` → `view.name`); teste explícito `contractor-composition.test.ts:131-166` (financier `name` ≠ `corporateName`). |
| 5 | `actItem` = `corporateName ?? act.name`; `PartnerListItem`/schema inalterados | ✅ | `partner-aggregate-query.ts:82-89`; `PartnerListItem:20-26` intacto. |
| 6 | TS strict (`import type`, `.ts`, Readonly, sem `class`, EN) | ✅ | `mapper.ts:14-19`; `ActView` é `Readonly<{...}>`. |
| 7 | **Teste pré-existente de sort alterado — legítimo ou mascaramento?** | ✅ | **Legítimo** — ver abaixo. |
| 8 | YAGNI: sem `fantasyName`, sem campo novo no contrato | ✅ | Snapshot/schema intocados. |

## Item 7 — análise (ponto mais sensível): **legítimo, não é mascaramento**

1. `anAct('Delta', …)` (`partner-aggregate-query.test.ts:77-96`) seta `corporateName = 'Delta Instituição LTDA'` (≠ `name = 'Delta'`).
2. A mudança de produção (`partner-aggregate-query.ts:85`) faz o item ACT projetar `corporateName` — **comportamento mudou de fato**.
3. Sort `(name, type, id)` preservado: `'D' < 'G'`, então `'Delta Instituição LTDA'` segue entre `'Beta'` e `'Gama'`; só o label muda, não a posição.
4. Coerente com o RED novo do mesmo arquivo (`:210-221`). Antes, os dois testes eram contraditórios (inconsistência introduzida pela W0); a W1 resolveu de forma mínima. Sem `skip`/`.only`, sem asserção removida.

## Observações (não-bloqueantes)

1. **`??` defensivo sobre campo não-nullable.** `Act.corporateName`/`ActView.corporateName` são `string` não-opcional, logo o lado direito de `corporateName ?? name` (`contractor-composition.ts:53`, `partner-aggregate-query.ts:85`) é ramo morto. Lint-clean (`no-unnecessary-condition` off, `eslint.config.js:307`) e defensável (intenção/robustez). Não bloqueia.
2. Testes de rota (CA1/CA2/CA5) cobrem detalhe, criação e degradação graciosa (`snapshot: null`, 200), com `name ≠ corporateName` no fake. Sem import reverso.

## Issues

Nenhuma bloqueante. **APPROVED.**
