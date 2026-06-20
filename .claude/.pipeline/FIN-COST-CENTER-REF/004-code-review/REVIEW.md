# Code Review — FIN-COST-CENTER-REF (US2 Centro de custo)

**Veredito:** **APPROVED** (round 1)

**Reviewer:** code-reviewer · **Data:** 2026-06-20

**Escopo revisado:** `domain/cost-center/{cost-center-id,types,cost-center}.ts`, `application/ports/cost-center-read.ts`, `adapters/persistence/repos/cost-center-read.{in-memory,drizzle}.ts`, `adapters/persistence/seed/reference-cost-centers.ts`, `schemas/mysql.ts` (finCostCenters), `migrations/mysql/0013_*.sql`, `adapters/http/{schemas,dto,plugin,composition,error-mapping}.ts`, e os 3 testes do US2.

## Evidência objetiva

- `eslint` nos arquivos do ticket → **0 problemas** (a lição do US1 — sem `Array.isArray` que re-narrowa para `any` — foi aplicada já na escrita do W0).
- `tsc --noEmit` → 0 erros. 3 testes do US2 → 9 pass / 0 fail. Suíte HTTP financial → 123/123 (sem regressão).

## Checklist

| Categoria | Resultado |
| --- | --- |
| **A** Domínio puro | ✅ `Result`, branded id, `immutable`, sem `class`/`throw`/`any`/`let`. |
| **B** Smart constructor | ✅ `CostCenter.create → Result`; valida `code`/`name` não-vazios; `as Branded` só pós-`isUuidV4`. |
| **D** Ports & Adapters | ✅ `CostCenterReadPort` = `type Readonly<{}>`; drizzle `try/catch → Result`, mapper revalida via smart constructor; in-memory filtra `active` + ordena por `code`. |
| **E** Modular monolith (ADR-0006/0014) | ✅ Tudo `fin_*`. |
| **ADR-0020** | ✅ `varchar`/`boolean`; seed `INSERT ... AS new ON DUPLICATE KEY UPDATE`; sem ENUM/JSON. |
| **F** ESM/TS | ✅ imports `.ts`, `import type`, return types explícitos. |
| **G** Idioma | ✅ Código EN; erro `cost-center-read-unavailable` (EN kebab); seeds (`Administrativo`…) são dados de negócio. |

## 🔵 Sugestão (não-bloqueia)

- Schema `fin_cost_centers`: índice `code` é **não-único**. O data-model deixou "único? — confirmar". Mantido normal (YAGNI — sem FR de unicidade para CC; o seed já garante códigos distintos). Se a P.O. exigir unicidade de `code`, vira `uniqueIndex` numa migration futura.

## O que está bom

- Reuso integral do padrão do US1 (Categoria) já aprovado — divergência mínima e justificada (sem `group`, ordena por `code`).
- Lição do round 2 do US1 internalizada (teste HTTP nasceu lint-clean).

## Veredito: **APPROVED** → avançar para W3.
