# FIN-MANUAL-ENTRY-TAXONOMY — W2 (REVIEW, read-only)

> S2 do épico #502 · `code-reviewer` · 2026-07-21 · Round 1 · **read-only** (`src/`+`tests/` intocados).
> Escopo do review: diff de `feat/fin-manual-entry-taxonomy` (schema+migration 0038, domínio
> `reconciliation/{types,manual-entry,reconciliation}.ts`, `record-manual-entry.ts`,
> `reconciliation.mapper.ts`, borda `schemas.ts`+`plugin.ts`, `scripts/ci/test-integration.ts`).

## Veredito

**APPROVED com ressalvas.** Nenhum Blocker. Um achado **Major** (assimetria do batch) que **não bloqueia
este ticket** por estar fora do escopo declarado e ser 100% back-compat — mas exige follow-up rastreado
antes de a taxonomia ser exposta/consumida no batch. Demais itens: Minor/observação.

## Gates (rodados no fio principal do review)

| Gate | Comando | Resultado |
| :-- | :-- | :-- |
| Typecheck | `pnpm run typecheck` (`tsc --noEmit`) | ✅ zero erros |
| Lint | `pnpm run lint` (`eslint .`) | ✅ zero erros |
| Test | `pnpm test` | ✅ **4270 tests / 4251 pass / 0 fail / 19 skipped** |

Regressão zero confirmada (CA8): `pass` 4251 − 12 (novos da S2) = **4239**, idêntico ao baseline pré-S2.
Integração (#500) não executada — registrada no grupo `financial` de `test-integration.ts` (ver §Foco 6).

---

## Foco 1 — COLLATE da migration 0038 · ✅ CONFORME

`0038_huge_clint_barton.sql` adiciona as 2 colunas como
`varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin`. Os refs irmãos em `fin_manual_entries`
(`0007_new_hercules.sql:12-15`) são `varchar(36) COLLATE utf8mb4_bin` sob tabela
`DEFAULT CHARSET=utf8mb4`. A collation efetiva das colunas novas e das irmãs é **idêntica: `utf8mb4_bin`
sobre charset `utf8mb4`** — um JOIN/compare entre `budget_plan_ref`/`subcategory_ref` e os irmãos **não
produz "illegal mix of collations"**. A migration é **puramente aditiva** (2 `ADD COLUMN`, nenhum
DROP/recreate) → INSTANT, regressão zero nos registros existentes (nascem NULL — CA1/CA4).

Nota (não-achado): a alegação do W1 de "byte-idênticos aos refs irmãos" é imprecisa no **texto** do DDL
(as irmãs omitem `CHARACTER SET`, derivando-o do prefixo da collation; a nova é explícita). O **resultado
efetivo** é o mesmo `utf8mb4_bin` — que é o que importa para JOIN. Sem ação.

## Foco 2 — Spillover em `reconciliation.ts` + varredura de construção de `ManualEntry` · ✅ CORRETO

`buildDifferenceManualEntry` (`reconciliation.ts:43-56`) monta um `ManualEntry` `type:'FeePenaltyInterest'`
(diferença de conciliação — juros/multa/desconto) com `budgetPlanRef: null` + `subcategoryRef: null`.
**Correto:** uma diferença de conciliação não pertence a plano orçamentário nenhum, exatamente como já
faz com `programRef: null`. Consistente com o princípio "a classificação planejável mora no título que o
operador cria", não numa diferença derivada. Pego pelo typecheck (literal exaustivo), sem mudança de
comportamento.

**Varredura completa dos pontos de construção de `ManualEntry` no módulo** (grep por `confirmManualEntry`
+ literais `: ManualEntry`): existem **3** sítios de montagem, todos verificados —

1. `manual-entry.ts:67` `confirmManualEntry` (o caminho do título manual) → propaga `?? null`. ✅
2. `reconciliation.ts:46` `buildDifferenceManualEntry` (diferença) → `null` deliberado. ✅
3. `confirm-counterpart-match.ts:120` `legB` (perna-B espelho de realocação patrimonial —
   Transfer/Investment/Redemption, #428) → **não** passa `budgetPlanRef`/`subcategoryRef`, caindo no
   default `?? null` de `confirmManualEntry`. **Correto e consistente:** essa perna também **não** carrega
   `categoryRef`/`programRef` (realocação de capital não é despesa/receita planejável). Nenhum ponto de
   construção foi esquecido.

## Foco 3 — Espelhamento completo dos 2 refs (fluxo single manual-entry) · ✅ COMPLETO

| Ponto | Onde | Status |
| :-- | :-- | :-- |
| Domínio — tipo | `types.ts:29-30` `ManualEntry` (`string \| null`) | ✅ |
| Domínio — input | `manual-entry.ts:30-31` `ConfirmManualEntryInput` (opcional) | ✅ |
| Domínio — montagem | `manual-entry.ts:72-73` (`?? null`) | ✅ |
| Use case — input | `record-manual-entry.ts:54-55` (opcional) | ✅ |
| Use case — rehydrate | `record-manual-entry.ts:127-134` (VO valida formato, `err` na borda) | ✅ |
| Use case — repasse | `record-manual-entry.ts:142-143` (spread-condicional) | ✅ |
| Use case — erro | `RecordManualEntryError` ganha `FinancialRefError` | ✅ |
| Mapper — toRow | `reconciliation.mapper.ts:81-82` | ✅ |
| Borda — body | `schemas.ts:656-657` (`z.uuid().optional()`) | ✅ |
| Borda — response | `schemas.ts:674-675` (`z.string().nullable()`) | ✅ |
| Borda — plugin passa | `plugin.ts:1101-1102` (spread-condicional) | ✅ |
| Borda — plugin ecoa | `plugin.ts:1121-1122` (`?? null`) | ✅ |

Espelhamento perfeito com os irmãos `categoryRef`/`programRef` **no endpoint single**. A única lacuna de
espelhamento está no batch (Foco 5).

Observação (não-achado): o use case rehidrata o VO e **descarta** o valor, repassando a string original
(`input.budgetPlanRef`). É consistente com o padrão de ref opaco (o domínio guarda `string`, não o VO) e
com a natureza UUID (valor do VO === string de entrada). É defense-in-depth além do Zod da borda. OK.

## Foco 4 — `toDomain` intocado (boundary `null`) · ✅ CONSISTENTE

O ramo `ManualEntry` de `reconciliation.mapper.ts` `toDomain` continua devolvendo `manualEntry: null`
(boundary não reidratado) — **comportamento pré-existente**, não um buraco novo. O roundtrip persistência
é provado via repo memory + eco no DTO de resposta (não via reidratação MySQL), o que é coerente com a
decisão anterior do módulo (o read-model da conciliação não reidrata o `manualEntry` para o domínio). Fora
do escopo desta S2 reidratar o boundary. Sem ação.

## Foco 6 — ADR-0014/CA7, CA6, CA4/CA8 · ✅ CONFORME

- **CA7 / ADR-0006/0014 (ref opaco):** `varchar(36)` sem FK, sem índice; o use case só chama
  `BudgetPlanRef.rehydrate`/`SubcategoryRef.rehydrate` (valida **formato**), **não** consulta budget-plans
  nem valida pertencimento, **não** toca `bgp_*`. ✅
- **CA6 (Payment + Receipt):** o carimbo é aplicado independentemente do `type`; o `type` enum já cobre
  `Payment` **e** `Receipt` (CHECK `fin_manual_entries_type_chk`). Classificação agnóstica de direção. ✅
- **CA5 (formato inválido → 400):** `z.uuid()` na borda rejeita não-UUID; `rehydrate` é defense-in-depth
  no use case (`FinancialRefError` → erro kebab). ✅
- **CA4/CA8 (opcional, back-compat, regressão zero):** ambos `.optional()`/nullable; entradas sem eles
  nascem NULL; `pass` estável em 4239. ✅
- **Integração (#500):** `manual-entry-taxonomy.drizzle-mysql.test.ts` adicionado ao grupo `financial` de
  `scripts/ci/test-integration.ts` com comentário justificando a não-execução nesta janela. Correto — o
  gate estrutural roda no `pnpm test` puro; o `information_schema` fica atrás do opt-in de integração.
  Sem esconder vermelho. ✅

---

## Achados

### Major (não-bloqueante para o escopo desta S2 — ver justificativa)

**M1 — Batch `/financial/reconciliations/batch` anuncia os 2 refs no schema mas o handler os descarta
silenciosamente.**

- **Onde:** `schemas.ts:680` (`batchBodySchema.template = manualEntryBodySchema`) expõe agora
  `budgetPlanRef`/`subcategoryRef` no template do batch; porém `plugin.ts:1144-1151` monta o `template`
  repassando **apenas** `supplier/category/costCenter/program` — e `confirm-batch.ts:12-23`
  (`ConfirmBatchInput.template`) sequer declara os 2 novos refs.
- **Por que é Major:** o padrão pré-S2 do batch era **propagar todos os refs** do template (4/4). A S2, ao
  reusar `manualEntryBodySchema`, passou o batch a **anunciar 6 refs e propagar só 4** — o OpenAPI do
  batch agora mente: aceita `budgetPlanRef`/`subcategoryRef` (201) e os joga fora. Se um integrador
  confiar no schema, a taxonomia some silenciosamente → **"realizado torto"**, exatamente o anti-objetivo
  do épico #502.
- **Por que NÃO bloqueia esta S2:** (a) o batch (`confirmBatch` / rota `/reconciliations/batch`) **não
  está no escopo declarado** do `000-request.md` (que enumera só `POST .../:id/manual-entry`); (b) é
  **100% back-compat** — campos opcionais, nenhum cliente atual envia taxonomia ao batch (o front da S2
  mira o endpoint single); (c) o W1 já **declarou** como follow-up. Blast radius **hoje** é zero.
- **Escalonamento:** vira impacto real **assim que** o front consumir o batch com taxonomia **ou** o
  OpenAPI do batch for publicado como contrato. Antes disso, decidir uma das duas correções:
  1. **Propagar** os 2 refs no batch (`confirm-batch.ts` template + `plugin.ts:1144`) — mantém o padrão de
     6/6; **ou**
  2. **Estreitar** o `batchBodySchema.template` para NÃO anunciar taxonomia planejável (evita o
     contract-lie enquanto a decisão de produto não vem).
- **Ação recomendada:** abrir issue rastreável (skill `issue-report`) com critério de aceite Dado/Quando/
  Então cobrindo o batch. **Não** consertar dentro desta S2 (scope-creep — ADR-0040).

### Minor / observações

- **m1 — Alegação "byte-idênticos" no W1 REPORT** (Foco 1): impreciso no texto do DDL; efetivo é idêntico.
  Só documentação, sem ação em `src/`.
- **m2 — Rehydrate-descarta no use case** (Foco 3): repassa a string original em vez do valor do VO.
  Aceitável para ref opaco/UUID; registrado para consistência mental, sem ação.

---

## Conclusão

O núcleo da S2 (carimbo `budgetPlanRef`+`subcategoryRef` no título manual via endpoint single) está
**correto, completo e espelhado** com os refs irmãos, respeita ADR-0014 (ref opaco), cobre Payment+Receipt,
é aditivo/back-compat e passa todos os gates locais. A única ressalva relevante (M1, batch) está **fora do
escopo declarado** e é **não-regressiva** — logo **APPROVED com ressalvas**, condicionado à abertura de um
follow-up para o batch antes de a taxonomia ser exposta/consumida ali.

**Próximo passo:** W3 (`ts-quality-checker`) — gate final (typecheck+format:check+lint+test); integração
#500 registrada como não-executada. Abrir o follow-up de M1 via `issue-report` (fora desta pipeline).
