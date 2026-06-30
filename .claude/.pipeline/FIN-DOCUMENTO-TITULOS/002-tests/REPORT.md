# W0 — Testes RED (FIN-DOCUMENTO-TITULOS)

**Wave**: W0 · **Skill**: `tdd-strategist` · **Outcome**: 🔴 RED · **Data**: 2026-06-15

> Fail-first (constituição I): testes escritos ANTES de `src/`, falhando por inexistência da API.
> Escopo deste W0: **Foundational (VOs)** + **US1 (domínio)** — Phases 2-3 do `tasks.md`. Demais stories nos próximos W0.

## Pré-requisito resolvido

Módulo `financial` legado (Payable-cêntrico, fonte `handbook/domain/` removida) **substituído** — ver
`specs/009-fin-documentos-titulos/adr/0006`. Arquivado em `git tag legacy/financial-payable-centric`. Path limpo.

## Testes criados (5 arquivos)

| Arquivo | Cobre | Cenários BDD |
| --- | --- | --- |
| `tests/modules/financial/domain/shared/refs.test.ts` | `ContractRef`/`BudgetPlanRef`/`CategoryRef`/`ProgramRef` (rehydrate-only, UUID v4) | ADR-0001 |
| `tests/modules/financial/domain/shared/ids.test.ts` | `DocumentId`/`PayableId` (generate + rehydrate) | — |
| `tests/modules/financial/domain/shared/taxes.test.ts` | `Retention` (ISS/IRRF/INSS/CSRF) + `RegisteredTax` (ICMS/.../CBS/IBS) | CT-004, CT-009 |
| `tests/modules/financial/domain/document/net-value.test.ts` | `computeNetValue` (fórmula R1; registrados fora; não-positivo rejeitado) | CT-003, CT-008 |
| `tests/modules/financial/domain/document/document.test.ts` | `Document.create` não-fiscal → 1 pai `Open`, líquido, evento | CT-001, CT-002 |

## Resultado da execução

```
node --test --experimental-strip-types --no-warnings tests/modules/financial/domain/**
ℹ tests 5 · pass 0 · fail 5
✖ todos falham com ERR_MODULE_NOT_FOUND (módulos src/modules/financial/* inexistentes)
```

**RED legítimo** — falha por inexistência da API, não por asserção. (Suíte do resto do projeto permanece verde; o legado removido era isolado.)

## API esperada (a implementar na W1)

- `src/modules/financial/domain/shared/refs.ts` — `ContractRef`/`BudgetPlanRef`/`CategoryRef`/`ProgramRef` (namespace-objeto `{ rehydrate }`, erro `financial-ref-invalid`).
- `src/modules/financial/domain/shared/ids.ts` — `DocumentId`/`PayableId` (`generate()` + `rehydrate(raw)`).
- `src/modules/financial/domain/shared/retention.ts` + `registered-tax.ts` — `create(input): Result<…>`, `value: Money`.
- `src/modules/financial/domain/document/financial-data.ts` — `computeNetValue(input): Result<Money, 'net-value-not-positive'>`.
- `src/modules/financial/domain/document/document.ts` — `create(input: CreateDocumentInput): Result<{ document, payables: { parent, children }, events }, DocumentError>` (não-fiscal: só pai; status `Open`; evento `DocumentSaved`).

## Próximo (W1)

Implementar os módulos acima (skills `ts-domain-modeler` + `typescript-language-expert`) até GREEN, na ordem inside-out
(VOs → financial-data → document). Geração de filhos (US2), aprovação (US3) etc. entram em W0/W1 das próximas fases.
