# FIN-DOC-SUBCATEGORY-STAMP — W0 (RED)

> S1 do épico Taxonomia Planejável Unificada (#502) · skill `tdd-strategist` · 2026-07-21.
> `src/` intocado; só testes + registro no runner. Módulo: financial.

## Testes escritos (3 arquivos, nenhum existente tocado — CA8)

| Arquivo | Natureza | CAs |
| :-- | :-- | :-- |
| `tests/modules/financial/domain/shared/subcategory-ref.test.ts` | VO unit (`pnpm test` puro) | CA5, CA7 |
| `tests/modules/financial/adapters/http/subcategory-ref-stamp.http.test.ts` | borda HTTP driver `memory` (puro) | CA2, CA3, CA4, CA6 |
| `tests/modules/financial/adapters/persistence/subcategory-ref-stamp.drizzle-mysql.test.ts` | estrutural (puro) + integração gateada | CA1, CA8 |

Arquivo separado do `refs.test.ts` e do `create-categorization-refs.http.test.ts` (#147) de propósito —
os testes verdes existentes ficam intactos. Integração registrada no grupo `financial` de
`scripts/ci/test-integration.ts`, **não executada** (#500), escrita para não poluir o `pnpm test` puro.

## Prova do RED

| | tests | pass | fail | skipped |
| :-- | --: | --: | --: | --: |
| Antes | 4246 | **4227** | 0 | 19 |
| Depois | 4255 | **4227** | 9 | 19 |

`pass` estável (4227) — **regressão zero (CA8)**. 9 fails novos, todos pelo motivo certo:
- VO: `does not provide an export named 'SubcategoryRef'` (VO inexistente).
- Estrutural (3): coluna `subcategory_ref` ausente em `fin_documents`/`fin_payable_view` + índice.
- HTTP memory (5): CA2/CA3/CA4/CA6 + CA5 (`actual: 201, expected: 400` — hoje o ref malformado é
  descartado em silêncio pelo `z.object`).

Reconferido no fio principal: os 3 arquivos falham por inexistência de VO/coluna, não por asserção frouxa.

## Assinatura para o W1

**VO** — `financial/domain/shared/refs.ts` (espelha os irmãos):
```ts
export type SubcategoryRef = Brand<string, 'SubcategoryRef'>;
export const SubcategoryRef = {
  rehydrate: (raw: string): Result<SubcategoryRef, FinancialRefError> => rehydrateAs<SubcategoryRef>(raw),
} as const;
```
Sem `generate` (id nasce no dono, budget-plans). Ref **opaco**: sem resolve/validate contra o plano.

**Domínio** (`document/types.ts` + `document.ts`): `subcategoryRef: SubcategoryRef | null` em
`DocumentCore` e `DraftDocument`; propagar em `create`, `createDraft`, projeções e rehydrate — **todos
os pontos onde `budgetPlanRef`/`categoryRef` aparecem**.

**Schema** (`schemas/mysql.ts`): `subcategoryRef: varchar('subcategory_ref', { length: 36 })` em
`finDocuments` (~89) e `finPayableView` (~560); `index('fin_payable_view_subcategory_ref_idx').on(t.subcategoryRef)`.

**Mapper** (`document.mapper.ts`): **2 `toRow`** (Draft ~643 / Open ~689) + **2 `toDomain`** (~301 / ~454).

**Borda** (`http/schemas.ts`): create/update body `subcategoryRef: z.uuid().optional()`; response DTO
`subcategoryRef: z.string().nullable()`. **`dto.ts`: os 2 ramos** (Draft ~171 / Open ~205).

**Migration:** `db:generate` → `ADD COLUMN subcategory_ref VARCHAR(36) NULL` (aditiva/INSTANT) + `ADD INDEX`.

## Decisões de desenho
- **Validação-contra-plano FORA** (confirmado): ref opaco (ADR-0014), como `category_ref`/`budget_plan_ref`.
  VO valida **só formato** (UUID v4); Zod idem na borda. Pertencimento é S4/S5.
- **CA3 (0/91):** o roundtrip de `budgetPlanRef` já é padrão (#147) no memory; fechar o 0/91 é da camada
  MySQL. O W1 **confirma** que documento novo persiste `budgetPlanRef` no caminho mysql, sem reimplementar.

## Armadilhas para o W1
1. `z.object` descarta chave desconhecida — adicionar ao schema de create **e** update **e** DTO.
2. DTO tem **2 ramos** (Draft e Open) — sem o campo nos dois, o Draft não ecoa.
3. Mapper tem **2 `toRow` + 2 `toDomain`** — todos precisam do campo, senão o roundtrip MySQL perde o valor.
4. **`fin_payable_view` é projeção** — a coluna+índice satisfazem CA1, mas para o dado **existir** na
   view (S5), o `payable-view.mapper.ts` precisa **copiar** `subcategory_ref` do documento. Verificar.
5. Migration aditiva/INSTANT — revisar o SQL: só `ADD COLUMN`/`ADD INDEX`, nunca DROP/recreate.
6. Ref opaco — não chamar budget-plans public-api (ADR-0014/CA7).
7. Structural test exige `MySqlVarChar`, nome físico `subcategory_ref`, nullable, índice de coluna única.
8. Regressão zero — não editar `refs.test.ts` nem `create-categorization-refs.http.test.ts`.

## Próximo passo
W1 (GREEN) — `drizzle-schema-author` + `ports-and-adapters`.
