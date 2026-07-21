# FIN-REALIZED-PROVISIONED-READ — W1 (GREEN)

> Wave W1 · skill `ports-and-adapters` (par `drizzle-orm-expert`) · fatia 2/3 de `REPORTS-REALIZED-VS-PLANNED`.
> Integração MySQL **não executada** (issue #500 — sem MySQL na 3306; bloco gated pulado, por desenho).

## Arquivos

| Arquivo | Natureza |
| :-- | :-- |
| `src/modules/financial/public-api/realized-provisioned-projection.ts` | reader boot-scoped (novo) |
| `src/modules/financial/public-api/index.ts` | +export do reader (convenção do molde #416) |

`realized-by-plan-projection.ts` **intocado** (CA9 — consumidor vivo #416). Schema `fin_*` **intocado**.

## Assinatura entregue (idêntica à pinada no W0)

```ts
openRealizedProvisionedReader({ connectionString }): Promise<Result<RealizedProvisionedReader, string>>
RealizedProvisionedReader = {
  list(filter: { budgetPlanRef?: string; year?: number }): Promise<Result<readonly RealizedProvisionedRow[], string>>;
  close(): Promise<void>;
}
RealizedProvisionedRow = Readonly<{
  budgetPlanRef: string; categoryRef: string | null; month: string; /* 'YYYY-MM' */
  realizedCents: number; provisionedCents: number;
}>
```

## As duas queries (e por que NÃO duplicam)

**Duas agregações separadas, costuradas em memória** por `(budgetPlanRef, categoryRef, mês)` — a
decisão que o W0 recomendou (nota 2).

**Realizado** (mês = `reconciled_at`): 3-hop do #416 (`items → reconciliations[status='Active'] →
payables → documents`), `SUM(reconciled_value_cents)`. `Active` no ON → `Undone` some (CA5); parcial
soma o valor conciliado (CA2).

**Provisionado** (mês = `due_date`): `payables[status='Approved'] → documents`, `SUM(value)`, com
**`NOT EXISTS`** de item de conciliação Active.

**Por que não cruzam os eixos:** cada medida agrega no seu próprio FROM e eixo de data, e só então é
somada por chave em memória. Um FROM único cruzaria `reconciled_at × due_date` na mesma linha
(deslocando buckets) e faria fan-out item×payable.

**Anti-join (CA4 ⊻):** `status='Approved'` já exclui conciliados por construção; o `NOT EXISTS` é a
**defesa** (nota 3 do W0) contra um `Approved` com item Active por inconsistência. Escolhido `NOT
EXISTS` e não `LEFT JOIN ... IS NULL` de propósito: título com múltiplos itens de conciliação faria o
LEFT JOIN fanar e a linha NULL escaparia do filtro; `NOT EXISTS` é booleano por título, sem fan-out.
O remanescente de um parcial não entra em lugar nenhum (o parcial não é `Approved`).

## Mapeamento

- **`categoryRef` nullable:** agrupado como está; a costura usa sentinela para categoria NULL, nunca
  descarta. **budget_plan_ref NULL:** linha pulada na costura (relatório é por plano; padrão do #416).
- **`Number()` sobre o SUM** (mysql2 devolve bigint agregado como string).
- **Erro → `Result` kebab EN (CA8):** conn malformada propaga o slug do driver; falha de query →
  `realized-provisioned-read-failure`. Zero `throw` na borda.
- **Boot-scoped (CA1):** `openMysqlFinancial({ applyMigrations: false })`, pool 1×, `close()`.
- **ADR-0006/0014 (CA7):** public-api, plain rows, só `fin_*`, refs opacos — boundary test confirma.

## Prova do GREEN

`pnpm test`: **4251 tests · pass 4232 (+5) · fail 0 · skipped 19** (baseline 4250/4227/4). Os 5 novos:
3 boundary + 2 superfície estrutural. Arquivos isolados: `5 tests · 5 pass`, bloco de integração
pulado (`MYSQL_INTEGRATION` não setado). `typecheck` + `format:check` + `lint` **verdes** (conferidos
no fio principal).

Nota de lint: `Bucket` foi `type` → `interface` (`consistent-type-definitions`).

## ⚠️ Notas para o W2 (foco do audit read-only)

1. **Chave de costura sem separador** (linha 64-65): `${budgetPlanRef}${categoryRef ?? 'null'}${month}`
   concatena direto. Funciona porque UUID é 36 chars fixos e mês é 'YYYY-MM' (7), então a fronteira é
   determinística — **mas é frágil**. Se algum dia o ref deixar de ser UUID de largura fixa, colide.
   Avaliar se um separador explícito (ex.: `|`) vale a robustez. Achado a confirmar/registrar.
2. **⊻ / anti-join:** confirmar `NOT EXISTS` como escolha certa contra fan-out; o invariante não pode
   depender só de `status='Approved'`.
3. **Eixos de data independentes:** `reconciled_at` (realizado) vs `due_date` (provisionado); `year`
   filtra cada medida no seu eixo.
4. **Regressão zero (#416):** `realized-by-plan-projection.ts` e schema `fin_*` intocados.
5. **Integração não rodada** — a verificação real das somas (16000, 40000, 26000/30000, buckets
   mar/abr) fica para a leva conjunta das 3 fatias quando a #500 fechar. **Não marcar verde no W3.**

## Próximo passo

W2 (REVIEW) — `code-reviewer`.
