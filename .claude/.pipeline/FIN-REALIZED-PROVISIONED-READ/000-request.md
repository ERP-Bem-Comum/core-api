# FIN-REALIZED-PROVISIONED-READ — escopo (fatia 2/3 de `REPORTS-REALIZED-VS-PLANNED`)

> Size **M**. Expõe, na `public-api` do `financial`, o **realizado** e o **provisionado** agregados por
> `(budgetPlanRef, categoryRef, mês)` — as duas medidas que o relatório costura com o orçado que a
> fatia 1 (`BGP-READ-PORT`) já entrega.

## 🎁 Metade da semântica já existe em produção

`src/modules/financial/public-api/realized-by-plan-projection.ts` (do `BGP-INSIGHTS-REALIZED`, #416)
**já implementa a regra do realizado** que a P.O. definiu — só num grão mais grosso (total por plano,
não por categoria/mês). O JOIN de 3 saltos está pronto e validado:

```
fin_reconciliation_items → fin_reconciliations (status='Active')
  → fin_payables (document_id) → fin_documents (budget_plan_ref)
```

E o cabeçalho do arquivo já registra as decisões finas que valem aqui também:

> O Realizado de um plano = Σ dos `reconciled_value_cents` das reconciliações **Active** dos títulos
> cujo documento tem `budget_plan_ref = id do plano` (inclui parciais — o valor conciliado, não o do
> título — e exclui `Undone`).

**Consequência para este ticket:** a pergunta difícil ("o que conta como realizado?") está respondida e
em produção. O trabalho aqui é **mudar o grão** e **acrescentar o provisionado**.

## As duas medidas

| Medida | Regra (P.O., 2026-07-20) | Fonte |
| :-- | :-- | :-- |
| **Realizado** | título **conciliado** — reconciliação `Active`, inclui parciais (soma o valor conciliado, não o do título), exclui `Undone` | `fin_reconciliation_items.reconciled_value_cents` |
| **Provisionado** | título **aprovado e ainda NÃO conciliado** ("comprometido a pagar") | `fin_payables` com `status='Approved'` **sem** item de conciliação `Active` |

**Invariante:** um título **nunca** conta nas duas (realizado ⊻ provisionado) — CA4 do ticket pai.

## 📅 Decisão da P.O. (2026-07-20): qual data define o mês

| Medida | Data que define o mês | Coluna |
| :-- | :-- | :-- |
| **Realizado** | **data da conciliação** | `fin_reconciliations.reconciled_at` |
| **Provisionado** | **vencimento** (não há conciliação — é o único eixo possível) | `fin_payables.due_date` |

**Consequência aceita e documentada** (a P.O. foi informada ao decidir): conciliar hoje um título
antigo joga o valor no **mês de hoje**. Ou seja, **o relatório de um ano fechado pode mudar** quando
alguém concilia com atraso. Isso é comportamento **esperado** deste desenho, não defeito — não
"consertar" em wave futura sem nova decisão da P.O.

Segunda consequência: realizado e provisionado ficam em **eixos de data diferentes**. Um título que
vence em março e é conciliado em abril aparece em **março** enquanto provisionado e migra para
**abril** ao ser conciliado. Também esperado.

O **filtro de ano** segue a mesma regra por medida: realizado filtra por ano de `reconciled_at`,
provisionado por ano de `due_date`.

## Escopo (in)

Novo reader boot-scoped na `public-api` do `financial`, molde direto do
`realized-by-plan-projection.ts` (pool 1× + `close()`, incidente RDS 0001):

- Agregação por **`(budgetPlanRef, categoryRef, mês)`** nas duas medidas.
- Filtros combináveis: plano, ano, e o que o consumidor precisar repassar.
- Devolve **plain rows** (`string`/`number`), nunca agregados de domínio (ADR-0006).
- Erros como `Result` com slug kebab EN, nunca `throw` cruzando a borda.

## Fora de escopo

- **Contas a Receber** — não existe no core-api. Hoje o realizado cobre **só contas a pagar**
  (CA8 do ticket pai). Documentar, não silenciar.
- A costura e a rota (fatia 3).
- A linha "Sem orçamento previsto" (decisão CA7b) — é montagem, mora na fatia 3.
- Escrita: o reader é **read-only**.
- Mudar o schema `fin_*` ou o `realized-by-plan-projection.ts` existente (ele tem consumidor vivo —
  regressão zero).

## Critérios de aceite

- **CA1** Pool aberto **1×** no build; `close()` encerra.
- **CA2** **Realizado** por `(budgetPlanRef, categoryRef, mês)` = Σ `reconciled_value_cents` das
  reconciliações **Active**, mês vindo de `reconciled_at`. Parciais somam o valor **conciliado**.
- **CA3** **Provisionado** por `(budgetPlanRef, categoryRef, mês)` = Σ dos títulos `Approved`
  **sem** item de conciliação Active, mês vindo de `due_date`.
- **CA4** Um título **nunca** aparece nas duas medidas — inclusive o parcialmente conciliado
  (**decidir no W0** e registrar: o resto não-conciliado de um título parcial é provisionado ou não?
  Se a resposta não for óbvia no dado, **é pergunta para a P.O.**, não decisão de wave).
- **CA5** `Undone` **não** conta em nenhuma das duas.
- **CA6** Filtros aplicam-se coerentemente às duas medidas, cada uma no seu eixo de data.
- **CA7** ADR-0006: vive na `public-api`, devolve plain rows. **ADR-0014:** só `fin_*` — `budgetPlanRef`
  e `categoryRef` são **refs opacos**, nenhum nome resolvido aqui.
- **CA8** Erro → `Result` err com slug kebab EN, nunca `throw`.
- **CA9** Regressão zero: `realized-by-plan-projection.ts` e seus consumidores **intactos**.

## ⚠️ Nota de processo

A integração MySQL deste ticket **também** vai esbarrar no runner destrutivo (issue #500, ambiente de
dev na 3306). O plano combinado com a P.O.: **seguir sem rodar integração agora** e juntar as três
fatias numa leva só, quando a #500 fechar ou quando houver janela para o ritual manual. Os W3 devem
registrar a integração como **não-executada**, nunca como verde.

## Pipeline

| Wave | Skill/agente | Atividade |
| :-- | :-- | :-- |
| W0 | `tdd-strategist` | RED — as 2 medidas, o ⊻ (CA4), parciais, `Undone`, os 2 eixos de data |
| W1 | `ports-and-adapters` (par `drizzle-orm-expert`) | reader + query |
| W2 | `code-reviewer` | audit read-only (foco: ⊻, eixos de data, regressão no #416) |
| W3 | `ts-quality-checker` | gate (integração registrada como não-executada — ver §Nota) |
