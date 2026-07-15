# ADR-0051: Owner da taxonomia de categorização — o Plano é dono do planejável, o Financeiro guarda o operacional

- **Status:** Accepted
- **Date:** 2026-07-15
- **Deciders:** Tech Lead (Gabriel — endossado 2026-07-15) + P.O. (Alessandra — ratificou a premissa de negócio)
- **Issue:** [#448](https://github.com/ERP-Bem-Comum/core-api/issues/448) — follow-up prometido no #341 e nunca aberto
- **Complementa:** [ADR-0048](./0048-legacy-categorization-installments-mapping.md) (§D1 segue válido — a 020 fica intocada; este ADR nomeia o owner da Camada 3 que o 0048 apontou) · [ADR-0006](./0006-modular-monolith-core-api.md) (leitura cross-módulo via public-api) · [ADR-0014](./0014-mysql-database-isolation.md) (refs leves, sem FK cross-módulo)
- **Relates:** #341 (escopo A, fechada) · #316 (estrutura por plano) · #443 · #343 · #446 · #113

## Contexto

Ao fechar o **#341** ("categoria carrega `costCenterId`"), o 3º critério de aceite — _"documentado o **owner** da taxonomia e como os módulos leem"_ — ficou em aberto com a nota _"unificação canônica segue como follow-up"_. A nota não sobreviveu ao fechamento do ticket, e o resultado é o estado atual: **duas taxonomias convivem e nenhuma decisão diz qual é a verdadeira**. O `handbook/domain_questions/financeiro/07-categorization-taxonomy.md` registra isso explicitamente como _"divergência aceita por ora"_, com a unificação _"bloqueada hoje pelo escopo per-plano do `budget-plans`"_.

Isto **não é dívida abstrata**: bloqueia o **#443** (semear a taxonomia), o **#343** (subcategoria em Contratos), o **#446** (Análise de Pagamentos por Plano) e — o mais caro — o **ETL do legado**. Migrar o legado antes de decidir o owner ancora o dado numa taxonomia que talvez não seja a canônica; depois, ou se remigra, ou se convive com duas fontes para sempre.

### Premissa de negócio (ratificada pela P.O., 2026-07-15)

> A regra do backend está correta: **TUDO se vincula ao PLANO**. É a premissa que vem do legado, e deve ser mantida.

Logo a hierarquia canônica **não é de 3 níveis, é de 4**: **Plano Orçamentário → Centro de Custo → Categoria → Subcategoria**. A P.O. ratificou a **premissa**; qual implementação a honra melhor é decisão de engenharia — o que este ADR resolve.

### As duas árvores são modelos diferentes, para propósitos diferentes

|                | `bgp_*` (Orçamento, #316)                                            | `fin_*` (Financeiro, #341 escopo A)         |
| :------------- | :------------------------------------------------------------------- | :------------------------------------------ |
| Escopo         | **por plano** (`bgp_cost_centers.budget_plan_id` **NOT NULL**)        | **global**                                  |
| Direcionamento | `direction` ∈ `A PAGAR` / `A RECEBER` (**2 valores**)                 | `group` ∈ `despesa` / `receita` / `ajuste` (**3**) |
| Folha          | subcategoria com **Tipo de lançamento** (`IPCA`, `CAED`, `DESPESAS_PESSOAIS`, `DESPESAS_LOGISTICAS`) | subcategoria = categoria com `parentId`     |
| Serve para     | **planejar**                                                          | **classificar o lançamento real**           |

### Evidência medida (QA, 2026-07-15)

- `fin_categories` = **11** registros — **5 despesa + 4 receita + 2 ajuste** —, **0 com `cost_center_id`**, **0 com `parent_id`**. `fin_cost_centers` = 5.
- **As 2 categorias `ajuste` são `Estorno` e `Ajuste de conciliação`.** ← o fato decisivo deste ADR.
- `bgp_cost_centers.budget_plan_id` é **NOT NULL** — a árvore do Orçamento **já é por plano**.
- Documentos com `budget_plan_ref` preenchido: **0 de 91** (a coluna existe: `financial/.../mysql.ts:88`).
- `fin_categories` **não tem** `program_ref`.

### Grounding canônico

Evans descreve exatamente este cenário — dois times, o mesmo conceito (`Charge`), "reuso" que corrompeu ambos:

> The problem was that these two groups had different models, but they did not realize it, and there were no processes in place to detect it. **Each made assumptions about the nature of a charge that were useful in their context** (billing customers versus paying vendors). When their code was combined without resolving these contradictions, the result was unreliable software. (…) But the world of large systems development is not the ideal world. To maintain that level of unification in an entire enterprise system is more trouble than it is worth. It is necessary to allow multiple models to develop in different parts of the system, but **we need to make careful choices about which parts of the system will be allowed to diverge and what their relationship to each other will be**. (…) **Total unification of the domain model for a large system will not be feasible or cost-effective.**
>
> — Eric Evans, _Domain-Driven Design_, p. 199 (`shared-references/ddd/ddd--evans-livro-azul.md:4642`)

E os padrões de integração aplicáveis entre os dois contextos:

> - **Anticorruption Layer:** (…) As a downstream client, create an isolating layer to provide your system with functionality of the upstream system **in terms of your own domain model**. This layer talks to the other system through its existing interface, requiring little or no modification to the other system.
> - **Open Host Service:** Define a protocol that gives access to your subsystem as a set of services. Open the protocol so that all who need to integrate with you can use it.
>
> — Vaughn Vernon, _Implementing Domain-Driven Design_, p. 142 (`shared-references/ddd/ddd--vernon-livro-vermelho.md:2331`)

O ADR-0006 já fixa o mecanismo dentro do core-api:

> | Ports/adapters explícitos | Cada BC expõe interface de leitura/comando para outros |
>
> — [ADR-0006](./0006-modular-monolith-core-api.md), §"Fronteiras entre BCs (DENTRO do core-api)"

## Decisão

**O `budget-plans` é o owner da taxonomia do que é planejável. O `financial` não a duplica — lê do plano. E mantém, como dado próprio, apenas o que não pertence a plano nenhum.**

### 1. Owner da estrutura de planejamento = `budget-plans`

A árvore **Centro de Custo → Categoria → Subcategoria** é **escopada por plano** e o `budget-plans` é a **fonte de verdade** — não há taxonomia canônica *global*. Isso já é o estado do banco (`budget_plan_id` NOT NULL) e é a premissa do legado ratificada pela P.O.

### 2. O `financial` (e demais consumidores) lê a árvore **do plano do documento**

Via `budget-plans/public-api` (ADR-0006), como **Open Host Service** do lado do owner e **Anticorruption Layer** do lado do consumidor: o `financial` traduz para o seu próprio modelo, **nunca importa `budget-plans/domain`**. O `financial` **não espelha nem copia** a árvore.

### 3. `fin_categories` / `fin_cost_centers` **não são fonte, não são projeção e não são deprecadas**

Elas retêm **o que não é planejável** — a classificação **operacional** de lançamentos que não pertencem a plano algum. A evidência é irredutível: **`Estorno` e `Ajuste de conciliação` não existem, e nunca existirão, num plano orçamentário — ninguém planeja um estorno.** Uma projeção pura da árvore do plano não teria onde colocá-las.

Esta é a "escolha consciente sobre o que diverge" que Evans exige, e a razão pela qual **nem (A) pura nem (B) foram adotadas**:

| Regime do lançamento          | Fonte da taxonomia                                     |
| :---------------------------- | :----------------------------------------------------- |
| **Planejável** (tem plano)    | árvore **do plano**, via `budget-plans/public-api`      |
| **Operacional** (sem plano)   | `fin_categories` — `group = ajuste` e afins             |

### 4. `direction` × `group` não se unificam

`direction` (`A PAGAR`/`A RECEBER`) é vocabulário do **planejamento**; `group` (`despesa`/`receita`/`ajuste`) é do **lançamento real**. O mapeamento é do ACL do consumidor (`A PAGAR`→`despesa`, `A RECEBER`→`receita`); **`ajuste` não tem contraparte no plano — por definição**.

### 5. Regra do ETL do legado (pré-requisito da migração) — **complementa o ADR-0048, não o substitui**

O legado tem **34 categorias + 158 subcategorias**, organizadas **por programa**, **100% despesa** (0 de receita) — e **cada plano de cada ano tem sua cópia**, que é precisamente o modelo `bgp_*`. Portanto:

- **A árvore de planejamento do legado migra como estrutura de planos (`bgp_*`)** — é a Camada 3 para a qual o [ADR-0048](./0048-legacy-categorization-installments-mapping.md) já apontava. **`fin_categories` não recebe as 158 subcategorias do legado.**
- **A categorização dos documentos/títulos legados NÃO muda: continua valendo o [ADR-0048](./0048-legacy-categorization-installments-mapping.md) §D1** — a 020 fica **intocada** e a hierarquia legada é **achatada** via o Mapa A daquele ADR. Este ADR **não reabre** essa decisão.

#### Relação com o ADR-0048 (Proposed, 2026-06-23) — convergente

O ADR-0048 foi escrito **antes de o módulo `budget-plans` existir** (Fatia 1 = 2026-07-07) e, ainda assim, **já traçou esta mesma fronteira**, por duas vias independentes:

> | `CostCenterSubCategory.releaseType` | 3 | **— (sem equivalente)** | conceito de orçamento/calibração → **Camada 3** (Budget Plans), **não de categorização de lançamento** |
>
> | `CostCenter.type` (PAGAR/RECEBER) | — | `Category.group` (`despesa`/`receita`) | (…) **`ajuste` é novo (sem origem legada)** |
>
> — [ADR-0048](./0048-legacy-categorization-installments-mapping.md), §D1, Mapa A

Ou seja: o 0048 já dizia que **o `releaseType` pertence ao Orçamento** (hoje: `bgp_subcategories.launch_type`, com exatamente os 4 valores legados) e que **`ajuste` não tem origem legada** — o que a medição em QA confirmou empiricamente (`Estorno`, `Ajuste de conciliação`). Este ADR **nomeia o owner** dessa Camada 3 e formaliza a fronteira que o 0048 antecipou.

**O argumento Conformist do 0048 segue de pé e é respeitado:** portar a hierarquia legada **para dentro da categorização de lançamento** (a 020) seria Conformist e contradiria o ADR-0001 (modelo novo soberano). Este ADR **não faz isso** — ao contrário, é o que fundamenta `fin_categories` **não** receber as 158 subcategorias. A árvore legada vai para o `budget-plans`, onde reproduzir o legado é **decisão de domínio deliberada e já vigente** (spec `030-budget-plans-reproducao` — _"reprodução do legado no core-api"_), não submissão acidental.

## Consequências

### Positivas

- **Uma fonte por regime**, sem ambiguidade: acaba o "espelhar de qual plano?", que não tinha resposta.
- **Realizado × Planejado fecha por construção** — o lançamento é classificado na mesma árvore em que foi planejado (destrava o #446).
- **O ETL deixa de ser risco**: a regra existe **antes** da migração, então o dado não se ancora numa taxonomia provisória.
- **O #443 muda de natureza** (como o #448 previu): não se semeia `fin_categories` com a árvore do legado — ela vira **plano**. O #443 passa a depender do ETL de planos (Gap 2 do #374).
- **Nada a fazer no front**: a cascata já está ligada nas telas que categorizam.

### Negativas / custos aceitos

- **O `financial` ganha uma dependência de leitura** do `budget-plans` (ACL). Custo real, mitigado pelo ADR-0006 (já é o mecanismo padrão) e pelo ADR-0032/0022 se a leitura precisar de projeção por performance.
- **Documento sem plano não acessa a árvore de planejamento.** Hoje isso é **100% dos casos** (0/91). É estado transitório: enquanto o módulo de Plano não estiver completo (não se cria plano pela tela), o `financial` opera só com o catálogo operacional — que é exatamente o comportamento de hoje. **Nada regride.**
- **Duas tabelas continuam existindo.** Não é duplicação: é divergência **deliberada e documentada**, com fronteira explícita (planejável × operacional) — o que Evans p.199 prescreve, em vez da unificação total que ele desaconselha.

### Fora deste ADR (registrado para não se perder — enquadramento da P.O.)

Não são defeitos; são fios sem o que ligar enquanto o módulo de Plano não existir:

- Documento **persistir** `budget_plan_ref` (coluna existe; 0/91 hoje) e definir a origem (herda do contrato ou seletor na tela).
- Front enviar `budgetPlanRef` no create (o contrato de entrada **já aceita**; persistência pendente no #147).
- **`fin_payable_view` projetar o plano** — é o que destrava o #446.

## Alternativas rejeitadas

- **(A) pura — `fin_categories` vira projeção da árvore do plano.** Rejeitada: não responde onde vivem `Estorno` e `Ajuste de conciliação`, e com 0/91 documentos com plano, **nada seria classificável**.
- **(B) — taxonomia global no `financial`, plano como recorte.** Rejeitada: contraria a premissa ratificada pela P.O. e não explica de onde saem `direction` e `launch_type`, que só existem no planejamento.
- **`fin_categories` ganhar `program_ref`** (taxonomia por programa na referência global). Rejeitada: é a (B) disfarçada — o legado copia a árvore **por plano**, não por programa; e `plano ⊂ programa`, então escopar por plano já entrega "separado por programa" sem uma segunda fonte.
