# W1 — GREEN — CON-ACT-CONTRACTOR-RAZAO-SOCIAL

**Data:** 2026-06-15 · **Skill:** ports-and-adapters · **Resultado:** GREEN (`pnpm test`: 2628 pass / 0 fail · `typecheck`: 0 erros · `format:check`: OK)

Opção 1 do card: `snapshot.name` (e item de seleção) do contratado **ACT** passa a ser a **razão social**
(`corporateName`), não o objeto do acordo (`name`). YAGNI estrito: sem campo novo no contrato de resposta,
sem novo port.

## Arquivos alterados (produção — 3 toques)

1. `src/modules/partners/public-api/contractor-view.mapper.ts` — `ActView` ganhou `corporateName: string`
   (molde da `FinancierView`); `actToView` mapeia `corporateName: act.corporateName` (`Act.corporateName`
   é `string` não-opcional — `domain/act/types.ts:30`).
2. `src/modules/contracts/adapters/http/contractor-composition.ts` — `viewToSnapshot`: novo ramo
   `view.type === 'act'` → `name: view.corporateName ?? view.name` (mesmo `document`/`updatedAt`).
   `ContractorSnapshot`/`contractorSnapshotSchema` **inalterados**; `viewToSnapshot` segue **privado**.
   financier/collaborator caem no `else` com `view.name` — não-regressão.
3. `src/modules/partners/adapters/http/partner-aggregate-query.ts` — `actItem` →
   `name: r.act.corporateName ?? r.act.name` (molde de `financierItem`/`supplierItem`).

## Teste pré-existente corrigido (erro objetivo da W0 — justificado)

- `tests/modules/partners/adapters/http/partner-aggregate-query.test.ts` (teste de sort, `:136`):
  expectativa `'Delta'` → `'Delta Instituição LTDA'`.
  - **Causa:** a W0 adicionou um RED novo afirmando que o item ACT (`anAct('Delta')`, helper com
    `corporateName='Delta Instituição LTDA'`) deve ter `name = corporateName`, mas **não atualizou** o teste
    de sort do mesmo arquivo, que continuava assertando `'Delta'`. Os dois ficaram contraditórios sobre o
    mesmo item — inconsistência introduzida pela W0.
  - **Por que é mínimo/correto:** a ordenação `(name, type, id)` é preservada (`'Delta Instituição LTDA'`
    segue entre `'Beta'` e `'Gama'`); só o label muda, não a posição. Alinha à decisão de contrato W0#5.

## Prova do verde

```
ℹ tests 2646 · pass 2628 · fail 0 · skipped 18
$ tsc --noEmit         → 0 erros
$ prettier --check .   → All matched files use Prettier code style!
```

Transição: 2622 pass / 6 fail (W0 RED) → **2628 pass / 0 fail** (W1 GREEN). Os 6 RED do ticket passam;
zero regressão alheia.

## Conformidade

- Sem campo novo em `ContractorSnapshot`/schema. supplier/collaborator/financier mantêm
  `snapshot.name = name` (só ACT muda) — coberto por teste de não-regressão.
- Degradação graciosa (FR-006) preservada (lógica de `snapshot: null` intocada).
- `partners ↔ contracts` só pela public-api (`ContractorReadPort`/`ContractorView`) — direção já existente,
  sem ciclo.
