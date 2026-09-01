---
paths:
  - 'src/modules/financial/**/*.ts'
  - 'src/modules/budget-plans/**/*.ts'
  - 'tests/modules/financial/**/*.ts'
  - 'tests/modules/budget-plans/**/*.ts'
verify:
  - claim: 'o financial alcança budget-plans em DOIS arquivos — o ACL do caminho da taxonomia e o composition root; o rótulo do plano segue costurado no reports'
    root: 'src/modules/financial'
    pattern: "from '#src/modules/budget-plans"
    expect:
      - 'src/modules/financial/adapters/http/composition.ts'
      - 'src/modules/financial/adapters/persistence/repos/taxonomy-path-read.from-budget-plans.ts'
  - claim: 'fin_cost_centers continua existindo — a taxonomia operacional não foi deprecada'
    root: 'src/modules/financial/adapters/persistence/schemas'
    pattern: "'fin_cost_centers'"
    expect:
      - 'src/modules/financial/adapters/persistence/schemas/mysql.ts'
---

O `budget-plans` é dono da taxonomia do que é **planejável**; o `financial` guarda o que não pertence a plano algum ([ADR-0051](../../handbook/architecture/adr/0051-taxonomy-owner-budget-plan-scoped.md)). A árvore Centro de Custo → Categoria → Subcategoria é **escopada por plano** (`budget_plan_id NOT NULL` + FK em `bgp_cost_centers`) — **não existe taxonomia canônica global**. Que um módulo só alcance o outro por `public-api/` **já é cobrado** por `tests/cleanup/module-boundary.test.ts`, e a mecânica do read-model de fornecedor por sete suítes em `tests/modules/financial/.../supplier-view-*`. Não repetir aqui.

- **O `financial` não TRADUZ a árvore do plano — quem costura o rótulo é o `reports`.** O que o `financial` carrega é o `budget_plan_ref` **opaco**, carimbado na criação, e o LEFT JOIN que ele faz é intra-módulo (`fin_cost_centers`). A tradução `ref → nome` acontece a jusante, no `reports/adapters/http/plugin.ts`, que chama `resolvePlanLabels` do `budget-plans/public-api`. ⚠️ A consequência prática é que **um `ref` válido devolve nome `null` quando a costura falha, e o defeito não está no `financial`** — é a issue [#625](https://github.com/ERP-Bem-Comum/core-api/issues/625). Ao investigar rótulo faltando, o arquivo a abrir é o do `reports`.

  ⚠️ **Desde a M2 (reclassificação na conciliação), "o `financial` nunca importa `budget-plans`" é FALSO** — e a distinção que sobrevive é outra. Ele alcança o `budget-plans` em **dois** arquivos, e só por `public-api/read.ts`: o ACL `adapters/persistence/repos/taxonomy-path-read.from-budget-plans.ts` e o composition root que o liga. O que ele pede é **validação de caminho** ("esta subcategoria existe, e sob quais ancestrais?"), porque gravar taxonomia exige recusar caminho inexistente ou desativado (RN-M2-09/10) — e essa pergunta só o dono da árvore responde. Continua **não** pedindo rótulo, e continua sem tocar `bgp_*`. A leitura errada a evitar agora é a inversa da antiga: encontrar o import e concluir que o `financial` passou a conhecer a árvore. Ele conhece um port de cinco campos; quem conhece a árvore é o outro lado.

- **`fin_categories` e `fin_cost_centers` não são deprecadas, e a evidência é irredutível.** Não são fonte, não são projeção e **não devem ser removidas**: retêm a classificação **operacional** de lançamento que não pertence a plano nenhum. `Estorno` e `Ajuste de conciliação` não existem — e nunca existirão — num plano orçamentário, porque ninguém planeja um estorno. Uma projeção pura da árvore do plano não teria onde colocá-los. Se parecer duplicação, releia este parágrafo antes de agir.

- **`direction` e `group` são vocabulários de fases diferentes e não se unificam.** `direction` (`A PAGAR`/`A RECEBER`) vive no **planejamento**, em `bgp_cost_centers`; `group` (`despesa`/`receita`/`ajuste`) vive no **lançamento real**, no check de `fin_categories`. O mapeamento é do consumidor (`A PAGAR`→`despesa`, `A RECEBER`→`receita`) e é **assimétrico de propósito: `ajuste` não tem contraparte no plano, por definição.** Unificar os dois campos apaga exatamente a assimetria que o ADR-0051 preserva.

- **Dois regimes de consumo cross-módulo convivem no `financial`, e tratá-los como um só é o erro clássico.** O **assíncrono**: `fin_supplier_view` é alimentado só por evento do `partners` via outbox ([ADR-0045](../../handbook/architecture/adr/0045-financial-supplier-read-model.md), [ADR-0022](../../handbook/architecture/adr/0022-read-models-via-projection-over-event-stream.md)) — `supplierName`/`supplierDocument` vêm `null` enquanto o evento não chegou, e isso é consistência eventual esperada, não bug. O **síncrono**: `composition.ts` e `payee-bank-composition.ts` chamam `buildPartnersReadPort`/`ContractorReadPort` em runtime, na borda HTTP ([ADR-0032](../../handbook/architecture/adr/0032-transient-http-composition-read-until-bff.md)) — composição **explicitamente transitória**, até o BFF ([ADR-0049](../../handbook/architecture/adr/0049-core-api-bff-boundary.md)). ⚠️ Concluir "o `financial` nunca consulta o `partners` em runtime" a partir do read-model é falso, e leva a procurar um evento onde existe uma chamada.
