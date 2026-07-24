# FIN-RECON-DETAIL-MANUAL-CATEGORY — escopo (fatia 1: lançamento manual)

> Size **M**. No modal "Conciliação realizada — lançamento manual", o campo **Categoria** vem "—". O
> detalhe (`GET /financial/statement-transactions/:id/reconciliation`, #175) não expõe a categoria do
> lançamento manual. Popular a Categoria = expor `category` (NOME resolvido) no detalhe, para conciliação
> por **lançamento manual**. (Título real = fatia 2, follow-up.)

## Causa-raiz
- `transactionReconciliationToDto` (`dto.ts:376`) não tem campo `category`.
- `getTransactionReconciliation` → `findActiveByTransaction` → `toDomain` devolve **`manualEntry: null`** no
  caminho Drizzle (in-memory popula). Logo o `categoryRef` do lançamento manual não chega ao detalhe.

## Escopo (in)
1. **Reidratar `manualEntry`** no caminho de leitura Drizzle: novo mapper `manualEntryRowToDomain` (inverso
   de `manualEntryToRow`) + `findActiveByTransaction` carrega `fin_manual_entries` quando `type=ManualEntry`
   e passa ao `toDomain` (que deixa de fixar `null` quando recebe a linha). In-memory já popula.
2. **Resolver `categoryRef` → nome** na borda: helper `resolveCategoryName` (composition, via
   `CategoryReadPort.list()` — mesmo padrão do `resolveUserName`/export Nibo).
3. **DTO + response schema**: `category: string | null` em `transactionReconciliationToDto` /
   `TransactionReconciliationResponseDto` / `transactionReconciliationResponseSchema`. Handler resolve e
   passa o nome.

## Fora de escopo
- Categoria de conciliação com **título real** (do documento conciliado via `payableDocView`) — fatia 2.
- Campos de documento no detalhe (#370) — decisão da P.O.: não precisa.

## Critérios de aceite
- **CA1** `GET .../reconciliation` de uma transação conciliada por lançamento manual **com** `categoryRef`
  → 200 e `category` = **nome** da categoria (ex.: `categoryRef` da seed → `"Tarifas bancárias"`).
- **CA2** Lançamento manual **sem** `categoryRef` → `category = null` (não quebra).
- **CA3** Conciliação **sem** lançamento manual (Individual/Multiple) → `category = null` (fatia 1 não a resolve).
- **CA4** Regressão zero: `pnpm test` verde. (Reidratação real contra MySQL é #500-gated; wiring provado por inject.)

## Pipeline
| Wave | Skill/agente | Atividade |
| :-- | :-- | :-- |
| W0 | `tdd-strategist` | RED — inject: detalhe de manual entry ecoa `category` resolvida |
| W1 | `ts-domain-modeler` + `fastify-server-expert` | mapper inverso + reidratação + resolveCategoryName + DTO |
| W2 | `code-reviewer` | audit — null-safety, resolução na borda, sem regressão do detalhe |
| W3 | `ts-quality-checker` | gate |
