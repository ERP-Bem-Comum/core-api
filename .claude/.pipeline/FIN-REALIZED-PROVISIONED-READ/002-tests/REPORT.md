# FIN-REALIZED-PROVISIONED-READ — W0 (RED)

> Wave W0 · skill `tdd-strategist` · fatia 2/3 de `REPORTS-REALIZED-VS-PLANNED`.
> O subagente parou (sessão anterior encerrou) **após** escrever os testes e registrar no runner, mas
> **antes** de gravar este relatório. Reconstruído do artefato em disco e do RED reproduzido no fio
> principal. `src/` **intocado**.

## Arquivos criados

| Arquivo | Natureza | Roda em |
| :-- | :-- | :-- |
| `tests/modules/financial/public-api/realized-provisioned-boundary.test.ts` | estrutural (lê o fonte como texto) | `pnpm test` puro |
| `tests/modules/financial/public-api/realized-provisioned.drizzle-mysql.test.ts` | superfície + integração gated | estrutural sempre; integração sob `MYSQL_INTEGRATION=1` |

Registrado em `scripts/ci/test-integration.ts`, grupo `financial` (linha 158).

## Assinatura pinada para o W1

```ts
openRealizedProvisionedReader({ connectionString }): Promise<Result<RealizedProvisionedReader, string>>

RealizedProvisionedReader = {
  list(filter: { budgetPlanRef?: string; year?: number }):
    Promise<Result<readonly RealizedProvisionedRow[], string>>;
  close(): Promise<void>;
}

RealizedProvisionedRow = Readonly<{
  budgetPlanRef: string;
  categoryRef: string | null;   // documento pode não ter categoria
  month: string;                // 'YYYY-MM'
  realizedCents: number;
  provisionedCents: number;
}>
```

Arquivo a criar: `src/modules/financial/public-api/realized-provisioned-projection.ts`.
Molde: `realized-by-plan-projection.ts` (mesmo módulo, mesmo JOIN base, mesmo boot-scoped).

## ✅ A pergunta do CA4 foi RESPONDIDA pela modelagem (não é decisão em aberto)

**Pergunta:** o resto não-conciliado de um título parcial conta como provisionado?

**Resposta: NÃO — e não é escolha, é consequência do schema.** Provisionado exige
`fin_payables.status='Approved'`. Um título parcialmente conciliado tem `status='PartiallyReconciled'`,
**não** `Approved` — logo, por construção, ele **não** entra no provisionado. O realizado leva o valor
conciliado (60); o remanescente (40) **não aparece em nenhuma das duas medidas** até que uma nova
conciliação o cubra. Isso realiza o invariante ⊻ do CA4 sem regra extra.

O teste `CA4 (⊻)` encoda exatamente isso: parcial 6000 + cheio 20000 = **26000** realizado; só o
Approved separado (30000) provisionado; o 40 do parcial fica de fora.

> Se a P.O. **quiser** ver o remanescente do parcial como "ainda comprometido", isso é **escopo novo**
> (mudaria a definição de provisionado) → issue, não decisão de wave. Hoje o desenho segue o legado:
> provisionado = Approved-sem-conciliação.

## Cobertura (7 casos de integração + 2 estruturais)

- **CA2** realizado por `(plano, categoria, mês=reconciled_at)`; parcial soma o conciliado; `Undone` fora.
- **CA3** provisionado por `(plano, categoria, mês=due_date)` = `Approved` sem conciliação.
- **CA4** ⊻ — parcial entra só no realizado; remanescente em lugar nenhum.
- **CA5** só-`Undone` → zerado nos dois lados.
- **CA6** eixos de data independentes (vence em março, concilia em abril → dois buckets) + filtro `year`
  aplicando cada medida no seu eixo.
- filtro `budgetPlanRef` isolando um plano nas duas medidas.
- **CA8** (estrutural) conn malformada → `Result` err kebab EN, sem throw.
- fronteira **CA7** (boundary test): reader na public-api, sem import de domain/application de outro
  módulo (ADR-0006), só toca `fin_*` (ADR-0014) — refs de plano/categoria opacos.

## Prova do RED (fio principal)

```
✖ (a) o seam ... existe           → arquivo ausente
✖ (b) ADR-0006 ...                → assert.fail (sem fonte para auditar)
✖ (c) ADR-0014 ...                → assert.fail (sem fonte para auditar)
✖ realized-provisioned.drizzle-mysql.test.ts → ERR_MODULE_NOT_FOUND (import de topo)
```

RED **pelo motivo certo**: inexistência de
`src/modules/financial/public-api/realized-provisioned-projection.ts`. Não há asserção frouxa.

## Notas / armadilhas para o W1

1. **`categoryRef` é nullable** no schema (`fin_documents.category_ref`). O tipo já reflete
   (`string | null`). O `GROUP BY` tem de agrupar por ele mesmo quando NULL — não descartar.
2. **`month` como `'YYYY-MM'`**: derivar via `DATE_FORMAT(..., '%Y-%m')` sobre `reconciled_at`
   (realizado) e `due_date` (provisionado). São **duas** agregações com eixos de data distintos —
   provavelmente **duas queries** unidas em memória por `(plano, categoria, mês)`, não um JOIN único
   (juntar realizado e provisionado no mesmo FROM cruzaria os eixos e duplicaria). **Decisão do W1**,
   mas registrar o porquê.
3. **Provisionado = `Approved` SEM item de conciliação Active** — cuidado com o anti-join: um título
   Approved que ganhou conciliação Active deixou de ser Approved (vira Reconciled/Partially), então na
   prática o filtro `status='Approved'` já exclui os conciliados. Confirmar no dado (o teste CA3/CA4
   cobre), mas **não** presumir: se existir `Approved` COM item Active por inconsistência, o anti-join
   explícito protege.
4. **Molde do realizado pronto:** `realized-by-plan-projection.ts` já faz o 3-hop e o `Number()` do
   SUM (mysql2 devolve bigint agregado como string). Reusar o padrão.
5. **CA9 regressão zero:** não tocar `realized-by-plan-projection.ts` — tem consumidor vivo (#416).

## Próximo passo

W1 (GREEN) — `ports-and-adapters` (par `drizzle-orm-expert`).
