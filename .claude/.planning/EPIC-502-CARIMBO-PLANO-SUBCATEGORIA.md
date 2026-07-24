# EPIC #502 — Carimbar o título financeiro com Plano Orçamentário + Subcategoria na criação

> **Natureza deste documento:** desenho de arquitetura para **decisão** do @Gabriel / P.O. Não é
> implementação, não abre ticket de pipeline. Nenhuma linha de `src/` foi tocada. Todos os fatos
> abaixo estão ancorados em arquivo:linha ou §ADR — nada de memória.
>
> **Autor:** contratos-orchestrator · **Data:** 2026-07-21 · **Status:** aguardando decisão.

---

## 0. TL;DR (para quem vai decidir em 2 minutos)

- Hoje o título financeiro **não sabe em que subcategoria do plano foi lançado** — `fin_documents`
  carrega `category_ref` (taxonomia operacional global), **não** a folha do plano. E, na prática,
  **0 de 91** documentos carregam sequer o `budget_plan_ref`.
- Consequência direta: o relatório **Realizado × Planejado** (e a Análise de Pagamentos, #446)
  **vem zerado por construção** — a query descarta toda linha sem plano.
- O **ADR-0051 (Accepted)** já resolveu a pergunta de fundo: o **owner da taxonomia planejável é o
  `budget-plans`**; o `financial` **lê** a árvore do plano via ACL, **não a duplica**. Ele
  **explicitamente rejeita** colocar as 158 subcategorias do legado em `fin_categories`.
- Portanto a opção **(a)** ("popular `fin_categories.parent_id`") **contraria o ADR-0051** e exigiria
  um novo ADR que o `supersedes`. A opção **(b)** (nova coluna `subcategory_ref` apontando para a
  folha do plano) é o caminho que o ADR-0051 **sanciona**.
- **A decisão que resta é de engenharia + política**, não de princípio: (i) qual variante de (b);
  (ii) o carimbo é **referência viva** ou **snapshot congelado**; (iii) o que fazer com os 91
  documentos históricos; (iv) de onde vem o `budget_plan_ref` (herda do contrato ou seletor na tela).

---

## 1. Problema e impacto (1 parágrafo)

O relatório **Realizado × Planejado** cruza o que foi **planejado** (owner: `budget-plans`, grão
`subcategoria × mês` — `planned-amounts-read.ts:18-30`) com o que foi **realizado/provisionado**
(owner: `financial`). Mas o lado realizado só consegue agrupar por `(budgetPlanRef, categoryRef,
mês)` (`realized-provisioned-projection.ts:5-16`) e, pior, **descarta toda linha cujo
`budgetPlanRef` é nulo** (`realized-provisioned-projection.ts:185`: _"relatório é POR plano → linha
sem plano fica fora"_). Como **0 de 91** documentos têm `budget_plan_ref` preenchido (ADR-0051
§"Evidência medida", linha 36) e **nenhum** documento tem sequer o conceito de subcategoria (não
existe `subcategory_ref` em `fin_documents` — verificado por `grep`, zero ocorrências), o relatório
**resolve para vazio**: há planejado, mas não há realizado carimbado na mesma folha em que se
planejou. Sem o carimbo `(plano, subcategoria)` na **criação** do título, os relatórios REP-5 (#416)
e REP-3/#446 são estruturalmente incapazes de fechar — não é "falta tela", é que **a folha do plano
não existe no contrato do título**.

---

## 2. Fatos verificados (a base de qualquer decisão)

### 2.1. O que `fin_documents` carrega hoje

`src/modules/financial/adapters/persistence/schemas/mysql.ts:86-91`:

```ts
// Refs cruzadas opcionais (cross-BC — ADR-0014): sem FK física.
contractRef: varchar('contract_ref', { length: 36 }),
budgetPlanRef: varchar('budget_plan_ref', { length: 36 }),
categoryRef: varchar('category_ref', { length: 36 }),
costCenterRef: varchar('cost_center_ref', { length: 36 }),
programRef: varchar('program_ref', { length: 36 }),
```

→ **Não há `subcategory_ref`.** As refs são soft (sem FK física — ADR-0014).

O domínio já modela `budgetPlanRef`/`categoryRef`/`costCenterRef`/`programRef` como VOs, e o mapper
de escrita **persiste** `budgetPlanRef` e `categoryRef` hoje
(`document.mapper.ts:689-690`). **Nuance importante:** o ADR-0051 §"Fora deste ADR" (linha 129)
registrava _"persistência pendente no #147"_ — no código atual a persistência do `budget_plan_ref`
**já existe no mapper**; o gap real é que **nenhum documento carrega o valor na prática** (front não
manda plano + subcategoria não é um conceito modelado em lugar nenhum do `financial`).

### 2.2. O estado medido das taxonomias (ADR-0051 §"Evidência medida", linhas 33-37)

> - `fin_categories` = **11** registros — **5 despesa + 4 receita + 2 ajuste** —, **0 com
>   `cost_center_id`**, **0 com `parent_id`**. `fin_cost_centers` = 5.
> - **As 2 categorias `ajuste` são `Estorno` e `Ajuste de conciliação`.** ← o fato decisivo deste ADR.
> - `bgp_cost_centers.budget_plan_id` é **NOT NULL** — a árvore do Orçamento **já é por plano**.
> - Documentos com `budget_plan_ref` preenchido: **0 de 91** (a coluna existe: `financial/.../mysql.ts:88`).

→ Ou seja: `fin_categories.parent_id` existe mas está **vazio** (0/11); a hierarquia de
subcategoria **nunca foi povoada** no `financial`. E a árvore de plano (`bgp_*`) **já é escopada por
plano** (`bgp_cost_centers.budget_plan_id` NOT NULL — `mysql.ts:156`).

### 2.3. Onde vive a subcategoria do plano

`bgp_subcategories` é a **folha** da árvore do plano, escopada por plano via
`categoria → centro de custo → budget_plan_id` (`budget-plans/.../schemas/mysql.ts:207-234`). Tem
`launch_type` (IPCA/CAED/DESPESAS_PESSOAIS/DESPESAS_LOGISTICAS) — conceito que **só existe no
planejamento**, nunca no lançamento real (ADR-0051 §4, linhas 84-85).

### 2.4. O que o ADR-0051 (Accepted, 2026-07-15) já decidiu

- **Decisão (linha 62):** _"O `budget-plans` é o owner da taxonomia do que é planejável. O
  `financial` não a duplica — lê do plano. E mantém, como dado próprio, apenas o que não pertence a
  plano nenhum."_
- **Decisão 2 (linhas 68-70):** o `financial` lê a árvore **do plano do documento** via
  `budget-plans/public-api`, como **Open Host Service** do owner e **Anticorruption Layer** do
  consumidor — _"o `financial` **não espelha nem copia** a árvore"_.
- **Decisão 5 (linha 91):** _"**`fin_categories` não recebe as 158 subcategorias do legado.**"_
- **Alternativa (A) rejeitada (linha 134):** _"(A) pura — `fin_categories` vira projeção da árvore do
  plano. Rejeitada: não responde onde vivem `Estorno` e `Ajuste de conciliação`, e com 0/91
  documentos com plano, **nada seria classificável**."_
- **Consequência que nos aponta o caminho (linha 130):** _"**`fin_payable_view` projetar o plano** —
  é o que destrava o #446."_
- **Enquadramento do transitório (linha 121):** _"Documento sem plano não acessa a árvore de
  planejamento. Hoje isso é **100% dos casos** (0/91). É estado transitório (…). **Nada regride.**"_

### 2.5. O descompasso de grão que ninguém pode ignorar

| Lado | Owner | Grão | Fonte |
| :--- | :--- | :--- | :--- |
| **Planejado** | `budget-plans` | `subcategoria × mês` | `planned-amounts-read.ts:18-30` |
| **Realizado/Provisionado** | `financial` | `categoria × mês` | `realized-provisioned-projection.ts:5-16` |

O plano planeja na **folha** (subcategoria); o realizado só sabe a **categoria**. Mesmo que os 91
documentos tivessem `budget_plan_ref`, o cruzamento **não fecharia na folha** — fecharia só até
categoria. É exatamente esse degrau que o épico #502 precisa eliminar: **carimbar a folha
(subcategoria do plano) no título, na criação.**

---

## 3. Opções de desenho (com trade-offs honestos)

### Opção (a) — Povoar `fin_categories.parent_id` com as subcategorias; front seleciona a folha; `category_ref` passa a carregar a subcategoria

**Como funcionaria:** popular a hierarquia auto-referente de `fin_categories` (a coluna `parent_id`
existe — `mysql.ts:963`) com as subcategorias; o front seleciona a folha; o `category_ref` do título
passa a apontar para a subcategoria em vez da categoria-pai.

**Schema:** nenhuma coluna nova em `fin_documents` — reusa `category_ref`. Precisa **semear** ~158
subcategorias em `fin_categories`.
**Criação (borda + use case):** cascata já existe no comentário do schema
(`mysql.ts:964-967`: _"Cascata no front: costCenterId (top-level) + parentId (subcategoria)"_);
`save-document` continua recebendo `categoryRef`.
**Front:** cascata lê `fin_categories` (como hoje).
**Leitura (`realized-provisioned-projection.ts`):** passa a agrupar por `categoryRef` = subcategoria
— o join com o plano teria de casar UUID de `fin_categories` com UUID de `bgp_subcategories`.

**❌ Por que (a) contraria o ADR-0051 — literal:**

1. **Viola a Decisão 5 (linha 91):** _"`fin_categories` não recebe as 158 subcategorias do
   legado."_ Esta opção é **exatamente** o que o ADR proíbe.
2. **É a Alternativa (A) já rejeitada (linha 134):** _"não responde onde vivem `Estorno` e `Ajuste de
   conciliação`"_. `fin_categories` é a taxonomia **operacional** (o que não é planejável); enfiar as
   subcategorias planejáveis ali refaz a confusão das "duas árvores" que o ADR-0051 fechou.
3. **Perde o escopo por plano.** `bgp_*` é **por plano** (`budget_plan_id` NOT NULL); `fin_categories`
   é **global** (ADR-0051 tabela linhas 24-29). A mesma subcategoria ("Combustível") existe em N
   planos com N ids; achatá-la numa tabela global reabre o _"espelhar de qual plano?"_ que o ADR-0051
   §"Positivas" (linha 112) declara **acabado**.
4. **Duplica a fonte de verdade** — contraria a Decisão (linha 62) e Decisão 2 (_"não espelha nem
   copia a árvore"_).

**Custo real:** para adotar (a) seria preciso **um novo ADR que `supersedes` o 0051** (anti-padrão #5
do AGENTS.md proíbe editar ADR aceito). Só faz sentido se o Gabriel concluir que o ADR-0051 está
**errado** — o que este documento **não** recomenda, mas registra como possível.

---

### Opção (b) — Nova coluna `subcategory_ref` em `fin_documents` apontando para a folha **do plano** (`bgp_subcategories`) + `budget_plan_ref` populado; relatório resolve a folha via `budget-plans/public-api` (ACL)

**Este é o caminho que o ADR-0051 sanciona.** Confirmação literal: Decisão 2 (linhas 68-70, ACL) +
Consequência linha 130 (_"`fin_payable_view` projetar o plano — é o que destrava o #446"_).

**Schema:** `ALTER TABLE fin_documents ADD COLUMN subcategory_ref varchar(36)` (nullable, soft ref,
sem FK física — igual às irmãs, ADR-0014). Migration **aditiva/INSTANT** (não-quebrante). Mesma
adição na projeção `fin_payable_view` (`mysql.ts:551-591`) para destravar #446.
**Criação (borda + use case):** `save-document`/`save-draft` passam a aceitar `subcategoryRef` (e a
garantir `budgetPlanRef`); novo VO `SubcategoryRef` no `financial/domain/shared/refs.ts` (molde dos
refs existentes). A borda HTTP ganha o campo **opcional** no create (aditivo — o contrato de entrada
já aceita `budgetPlanRef`/`categoryRef` opcionais, `http/schemas.ts:106-109`).
**Front:** a cascata passa a vir da **árvore do plano** (via `budget-plans` HTTP), escopada ao plano
selecionado — `plano → centro de custo → categoria → subcategoria` (folha). **Este é o custo real
da opção**: o front hoje lê `fin_categories` (que está vazio, 0/11); precisa passar a ler o plano.
**Leitura:** `realized-provisioned-projection.ts` passa a agrupar por `subcategoryRef` e o
consumidor resolve a folha (nome + trilha) via o **ACL** `budget-plans/public-api/read.ts`. ⚠️ Hoje
o `PlannedAmountsReadPort` **só** faz `listPlannedAmounts` (grão subcategoria×mês) —
**não há** um "resolver esta subcategoria → sua trilha". Ou o relatório **costura** o `subcategory_ref`
do realizado contra as linhas planejadas (que já trazem `subcategoryId`/`subcategoryName` —
`planned-amounts-read.ts:26-27`), ou adiciona-se um método de leitura reversa ao port. A primeira via
é a mais barata e é o que o desenho do REP-5 já pressupõe.

**Trade-offs honestos:**
- ✅ Respeita o ADR-0051 na íntegra — nenhum ADR novo necessário.
- ✅ Fecha o relatório **na folha** (grão subcategoria), não só na categoria.
- ✅ `category_ref` continua existindo para os documentos **operacionais** (Estorno, Ajuste de
  conciliação — `group='ajuste'`), honrando a tabela "uma fonte por regime" (ADR-0051 linhas 78-82).
- ⚠️ Ganha uma **dependência de leitura** do `financial`/`reports` sobre o `budget-plans` (ACL) — custo
  já aceito pelo ADR-0051 §"Negativas" (linha 120).
- ⚠️ O front ganha dependência da árvore do plano na tela de lançamento (ver §6).

---

### Opção (c) — Variante de (b): **carimbo denormalizado (snapshot congelado)** vs referência viva

Esta não é uma alternativa a (b), é a **decisão fina dentro de (b)** — mas é grande o suficiente para
merecer status próprio, porque muda o significado da palavra "carimbar".

O título da épica é **"carimbar"** (stamp). Há um risco concreto: a árvore do plano é **reescrita por
replace-all a cada save** da estrutura (`bgp_cost_centers` comentário, `budget-plans/.../mysql.ts:150-151`:
_"Reescrita por inteiro (replace-all) a cada `save` da estrutura"_). Um `subcategory_ref` **vivo**
pode, portanto, **dangling** se o plano for reeditado e a folha desaparecer/mudar de id. (Mitigante
parcial: `bgp_subcategories` tem `active` e _"Desativar NUNCA apaga"_ — `mysql.ts:214-216` — mas isso
depende de disciplina do módulo de plano, não de FK.)

- **(c-ref) — referência viva:** `fin_documents` guarda só `subcategory_ref` (+ `budget_plan_ref`); a
  trilha (centro/categoria/nome) é **sempre** resolvida na leitura via ACL. Prós: sempre reflete o
  plano atual; menos colunas. Contras: dangling se o plano reescrever a folha; leitura sempre paga o
  ACL.
- **(c-snapshot) — carimbo congelado:** na criação, grava-se um **retrato imutável** do caminho
  (`budget_plan_ref`, `cost_center_ref`, `category_ref`, `subcategory_ref` e, opcionalmente, os
  **nomes**) — o título "lembra" onde foi lançado mesmo que o plano mude depois. Prós: robusto a
  reescrita do plano; leitura barata (não precisa do ACL para exibir a trilha). Contras: denormaliza;
  pode divergir do plano atual (mas isso é frequentemente **desejável** num carimbo contábil — o
  lançamento foi feito _naquele_ contexto).

> **Observação de projeto:** "carimbo" em linguagem contábil quase sempre quer dizer **snapshot**
> (o documento fixa o contexto do fato gerador). Se o Gabriel confirmar essa semântica, **(c-snapshot)**
> é o desenho mais fiel — e ainda respeita o ADR-0051, porque a **fonte** do carimbo continua sendo o
> plano lido via ACL na hora da criação; o `financial` não vira owner de nada, apenas **fotografa**.

---

## 4. O dado histórico (91 documentos) — formular, **não decidir**

Não há como inferir a folha (subcategoria do plano) automaticamente para os 91 documentos
existentes: eles não têm `budget_plan_ref` (0/91) nem qualquer sinal de subcategoria. As opções, para
o Gabriel/P.O. escolherem:

1. **Migração assistida (humano no loop).** Um operador/P.O. mapeia cada documento (ou lote por
   contrato/fornecedor) para `(plano, subcategoria)`. Mais caro, mas o histórico entra no relatório
   na folha. Pode ser faseado (só os documentos que importam para o REP-5 do exercício corrente).
2. **Aceitar que o histórico fica no grão categoria (ou fora do relatório).** É **exatamente o
   comportamento de hoje** e o que o ADR-0051 §"Negativas" (linha 121) chama de _"estado transitório
   (…) Nada regride"_. O relatório passa a fechar **daqui pra frente**; o legado aparece agregado só
   até categoria, ou é omitido do Realizado × Planejado por não ter plano.
3. **Backfill parcial só do `budget_plan_ref`** (se for inferível do `contract_ref` → plano do
   contrato — ver §5), deixando `subcategory_ref` nulo. Fecha o relatório no grão **categoria** para
   o histórico e no grão **subcategoria** para o novo. Meio-termo: menos trabalho manual que (1),
   mais cobertura que (2), à custa de grão misto no relatório.

> ⚠️ **Não há recomendação aqui** — é decisão de negócio (P.O.) sobre custo de curadoria vs valor do
> histórico. O desenho técnico suporta qualquer das três.

---

## 5. Origem do `budget_plan_ref` — decisão acoplada (ADR-0051 §"Fora deste ADR", linha 128)

O ADR-0051 deixou explicitamente em aberto: _"Documento **persistir** `budget_plan_ref` (…) e definir
a origem (**herda do contrato** ou **seletor na tela**)."_ Duas rotas:

- **(i) Herda do contrato:** se o documento tem `contract_ref`, e o contrato conhece seu plano, o
  `budget_plan_ref` é derivado — menos fricção no operador, mas exige que Contratos exponha "plano do
  contrato" via ACL e cobre o caso de documento **sem** contrato.
- **(ii) Seletor na tela:** o operador escolhe o plano no lançamento; a cascata de subcategoria
  depende dessa escolha (o front carrega a árvore **daquele** plano). Mais trabalho na tela, zero
  dependência de Contratos.

Isso **precisa ser decidido junto** com a opção (b/c), porque a cascata do front (§6) muda conforme a
resposta: se herda do contrato, o plano pode já vir "travado"; se é seletor, o plano é o primeiro
passo da cascata.

---

## 6. Sequência de entrega sugerida (fatias) — e o que cada uma destrava

Tamanho estimado: **M**, fatiado em 3 tickets, 1 módulo por vez (respeita anti-padrão #4 do
AGENTS.md — não misturar `fin_*` e `bgp_*` no mesmo ticket; a leitura cross-módulo é via ACL, não
import). Assume **opção (b)/(c)** escolhida.

| Fatia | Escopo | Camadas | Destrava |
| :--- | :--- | :--- | :--- |
| **A — VO + Schema** | VO `SubcategoryRef` no `financial/domain/shared/refs.ts`; coluna `subcategory_ref` em `fin_documents` (+ `fin_payable_view`); migration aditiva INSTANT; mapper lê/grava | domain + adapters/persistence | Base para tudo |
| **B — Fluxo de criação** | `save-document`/`save-draft` aceitam `subcategoryRef` + garantem `budgetPlanRef`; borda HTTP com campo opcional; front lê a cascata **do plano** (via `budget-plans` HTTP), conforme origem decidida no §5 | application + adapters/http + front | Passa a **carimbar daqui pra frente** |
| **C — Leitura** | `fin_payable_view` projeta plano+subcategoria; `realized-provisioned-projection.ts` agrupa por `subcategoryRef`; reports costura contra `listPlannedAmounts` (ou novo método de leitura reversa no ACL) | public-api + reports | **REP-3/#446** (Análise de Pagamentos — ADR-0051 linha 130) e **REP-5/#416** (Realizado × Planejado, fatia 3 hoje pausada) |

> A fatia **C** é a que **fecha o valor** (relatórios saem do zero), mas depende de A + B **e** de
> haver dado carimbado (novos documentos, ou o backfill do §4). O REP-5 fatia 3 e o #446 **não
> destravam** só com código: destravam quando existir título com `(plano, subcategoria)` gravado.

---

## 7. Impacto de contrato (front + compatibilidade)

- **Create do documento (HTTP):** adicionar `subcategoryRef` **opcional** ao payload de criação é
  **aditivo/não-quebrante** — o schema de entrada já aceita `budgetPlanRef`/`categoryRef`/
  `costCenterRef` opcionais (`financial/adapters/http/schemas.ts:106-109`). Clientes antigos que não
  mandam o campo continuam funcionando (documento fica sem carimbo de folha, como hoje).
- **Cascata da tela de lançamento (mudança real de UX):** hoje a cascata do `financial` lê
  `fin_categories` (`mysql.ts:964-967`), que está **vazia** (0/11). Nas opções (b)/(c), a cascata
  passa a vir da **árvore do plano** (`budget-plans`), escopada ao plano selecionado. O ADR-0051
  §"Positivas" (linha 116) afirma _"Nada a fazer no front: a cascata já está ligada nas telas que
  categorizam"_ — **atenção à nuance:** a cascata *ligada* é a de `fin_categories` (vazia); para
  trazer dado **real** por plano, o front precisa passar a consumir a árvore do **plano**. Isso é
  trabalho de front novo, não coberto pelo "nada a fazer".
- **Semântica de `category_ref`:** em (b)/(c) ela **não muda** — continua sendo a classificação
  operacional (Estorno/Ajuste). Em (a) ela mudaria de significado (passaria a ser a subcategoria),
  o que é uma **quebra semântica** silenciosa para todo consumidor de `category_ref`.
- **Quebra de compatibilidade:** nenhuma em (b)/(c) no contrato de entrada (tudo opcional/aditivo).
  Em (a), quebra semântica de `category_ref` + necessidade de re-seed + novo ADR.

---

## 8. Perguntas explícitas para o @Gabriel (as decisões que só ele/a P.O. tomam)

1. **Opção:** confirma **(b)/(c)** (carimbar a folha **do plano** via `subcategory_ref` + ACL,
   dentro do ADR-0051)? Ou há motivo para reabrir o ADR-0051 e ir de **(a)** (o que exige **novo ADR
   que o `supersedes`**)?
2. **Semântica do carimbo:** é **referência viva (c-ref)** ou **snapshot congelado (c-snapshot)**?
   (Recomendação técnica: para um "carimbo" contábil, snapshot; mas é decisão de negócio.)
3. **Nomes no snapshot:** se snapshot, congela só ids ou também os **nomes** da trilha
   (centro/categoria/subcategoria) para exibição sem ACL?
4. **Histórico (91 docs):** migração assistida (§4.1), aceitar grão categoria / fora do relatório
   (§4.2) ou backfill parcial só do `budget_plan_ref` (§4.3)?
5. **Origem do `budget_plan_ref`:** herda do contrato (§5.i) ou seletor na tela (§5.ii)? (Define a
   cascata do front.)
6. **Grão do REP-5:** o Realizado × Planejado deve fechar na **folha (subcategoria)** ou basta
   **categoria**? (Se categoria basta, o custo de (b) cai — mas o plano planeja na folha, então
   provavelmente é folha.)
7. **ADR-0051:** estende (nota de esclarecimento sobre `subcategory_ref` como o mecanismo do
   carimbo) ou fica como está (o ADR já sanciona (b), então talvez só um adendo)?

---

## 9. Fontes citadas (para auditoria)

- `handbook/architecture/adr/0051-taxonomy-owner-budget-plan-scoped.md` — §Evidência medida (l.33-37),
  Decisão (l.62), Decisão 2 (l.68-70), Decisão 5 (l.91), §4 (l.84-85), Positivas (l.112-116),
  Negativas (l.120-122), Fora deste ADR (l.128-130), Alternativas rejeitadas (l.134-136).
- `src/modules/financial/adapters/persistence/schemas/mysql.ts` — `fin_documents` (l.63-221, refs
  l.86-91), `fin_payable_view` (l.551-591), `fin_categories` (l.954-976, `parent_id` l.963,
  cascata l.964-967).
- `src/modules/financial/adapters/persistence/mappers/document.mapper.ts` — escrita de refs
  (l.630-690).
- `src/modules/financial/public-api/realized-provisioned-projection.ts` — grão (l.5-16), descarte de
  linha sem plano (l.185).
- `src/modules/budget-plans/public-api/read.ts` + `application/ports/planned-amounts-read.ts`
  (`PlannedAmountRow` l.18-30) — o ACL de leitura do orçado.
- `src/modules/budget-plans/adapters/persistence/schemas/mysql.ts` — `bgp_cost_centers` (l.152-178,
  `budget_plan_id` NOT NULL l.156, replace-all l.150-151), `bgp_subcategories` (l.207-234).
- `src/modules/financial/adapters/http/schemas.ts` — create aceita refs opcionais (l.106-109).
- `src/modules/reports/application/ports/analysis-read.ts` — REP-3/#446 (grão categoria×centro×mês).
- Verificação por `grep`: **zero** ocorrências de `subcategoryRef`/`subcategory_ref`/`subcategoryId`
  em `src/modules/financial/`.

---

## Adendo (2026-07-21) — ressalva M2 da revisão do PR #503, para o desenho da fatia 3

A revisão do PR #503 (os read ports) levantou uma **armadilha de costura** que a fatia 3 (rota) precisa resolver — registrada aqui para não se perder enquanto a fatia 3 está pausada:

**Eixo de tempo divergente entre os dois readers.**
- Fatia 1 (orçado): `month: number` 1..12 (mês do **exercício do plano**); a linha carrega `budgetPlanId` mas **não** `year`.
- Fatia 2 (realizado): `month: 'YYYY-MM'` do **calendário do evento** (`reconciled_at`/`due_date`).

Consequência: um título de plano 2026 conciliado em `2027-01` cai no bucket `'2027-01'`, **sem contraparte** na grade de 12 meses do plano → valor realizado **órfão** na costura. E o filtro `year` significa coisas diferentes nos dois lados (`budgetPlans.year` vs `year(reconciled_at)`).

**Sugestão da revisão (aditiva, barata):** incluir `year` em `PlannedAmountRow` para a chave de costura ser **absoluta** (`plano, ano, mês`), e a fatia 3 decidir explicitamente o que fazer com realizado fora do exercício do plano (órfão vira linha "fora do exercício"? é descartado? soma no mês do plano?). **Não** foi aplicado no PR #503 — é decisão de desenho da fatia 3, e depende de como o carimbo (este épico) define o vínculo título↔plano. Deixado aqui de propósito para ser decidido junto com o resto do desenho.

---

## ✅ Decisões da P.O. (sessão de análise, 2026-07-21)

### Decisão nº 1 — semântica do carimbo: **referência viva** + integridade na origem

O carimbo é **referência viva**, não snapshot: o título guarda `subcategory_ref` + `budget_plan_ref`, e a trilha (Centro → Categoria → Subcategoria) + nomes são resolvidos na leitura, **sempre do plano atual**. Razão: é um relatório — deve refletir o plano de agora, não o de quando o título foi lançado.

**Por que é seguro (verificado no código):** os ids de `bgp_subcategories` são **estáveis** e a desativação é **soft** ("Desativar NUNCA apaga" — `schemas/mysql.ts:214`), porque `bgp_budget_results.subcategory_id` já aponta pra lá **sem FK** e órfãozaria se os ids trocassem. A referência viva do título pega carona nessa mesma invariante — não cria risco novo.

**Integridade garantida na origem (decisão da P.O.):** em vez de tolerar órfão no relatório, a **exclusão é barrada** quando houver vínculos, com mensagem informando o quê. A guarda é **por nível** (verificado 2026-07-21):

| Excluir | Barra se houver | Onde checar (via public-api, ADR-0006) |
| :-- | :-- | :-- |
| **Subcategoria** | valores orçados · documentos lançados | `bgp_budget_results` (local) + `financial` |
| **Categoria / Centro** | idem, agregando os filhos | idem |
| **Plano** (cenário #453) | + **contratos vinculados** | + `contracts` (por `budget_plan_id`) |

**Fato que refina a tabela:** o **contrato NÃO se liga à subcategoria** — carrega `budget_plan_id` (`contracts/.../schemas:89`); `categorizacao`/`centroDeCusto` são **rótulos de texto livre**, não refs de taxonomia (busca por "subcateg" no módulo contracts = vazia). Logo contrato só entra na guarda de **plano**, não na de subcategoria — o que **reduz** o acoplamento da guarda fina para dois módulos (local + financial).

**Ordem de entrega (consequência):** a parte da guarda que checa `financial` (documentos) só é possível **depois** que o documento passar a carregar `subcategory_ref` — que é o que este épico entrega. Então: (1) carimbo primeiro; (2) guarda de subcategoria com a checagem de `bgp_budget_results` já vale hoje, a de documentos vem após o carimbo. A guarda é **escopo próprio** (protege contrato e dado orçado, não só o relatório) — não apêndice do carimbo.

**Interação com o relatório:** com a guarda na origem, a linha "Sem orçamento previsto" (CA7b do REP-5) fica reservada ao que **nunca** teve plano (Estorno, Ajuste — ADR-0051 §4), não a subcategoria removida. Semântica mais limpa.

### Decisão nº 2 — grão do relatório: **pendente** (próxima a analisar)
### Decisão nº 3 — origem do budget_plan_ref (herda do contrato vs seletor): **pendente**
### Decisão nº 4 — histórico dos 91 documentos: **pendente**

### Decisão nº 2 — grão do relatório: **folha (subcategoria)** ✅

O relatório fecha na **subcategoria**, batendo com o legado (4.536 linhas de subcat). Confirmado pela tela de lançamento (P.O., 2026-07-21): a seção "Categorização" **já tem o dropdown SUBCATEGORIA**. O carimbo (`subcategory_ref`) alimenta esse grão; `realized/provisioned` deixam de morar só em categoria.

### Decisão nº 3 — origem do vínculo: **híbrido editável** ✅

A seção "Categorização" do lançamento (evidência: screenshot da P.O., 2026-07-21) funciona assim:

- **Com contrato vinculado ao lançamento:** Programa / Plano / Centro / Categoria / Subcategoria são **herdados do contrato**, e **permanecem editáveis** — o operador pode sobrescrever o dado herdado.
- **Sem contrato:** o operador **seleciona** nos dropdowns, respeitando a cascata **Plano → (Centro de Custo → Categoria → Subcategoria)**.
- Toggle de modo na tela: "SEM CONTRATO · Livre · Alterar".

**Consequências de modelagem:**

1. O que se grava no título é a **seleção final** (herdada-e-talvez-editada), não uma derivação do contrato em tempo de leitura. Ou seja: `budget_plan_ref` + `subcategory_ref` (+ centro/categoria conforme o modelo) ficam **no próprio título** — reforça a decisão de carimbar no documento, não resolver via contrato na leitura. O plano do título **pode divergir** do plano do contrato (override consciente) — e isso é permitido por desenho.
2. A cascata dos dropdowns precisa ser alimentada pela **árvore do plano** (`budget-plans/public-api`), escopada ao plano selecionado — **não** por `fin_categories` (que está vazio, 0/11). O front **já tem a UI** (os 6 dropdowns existem na tela); falta ligar a fonte ao plano e persistir `subcategory_ref` no backend. Isso **reduz** o custo de front do §6 fatia B: é wiring de fonte + persistência, não construção de tela.
3. Herança do contrato exige o `contracts/public-api` expor "taxonomia do contrato" (Programa/Plano/Centro/Categoria/Subcategoria) para o front pré-preencher. ⚠️ **Nuance a verificar na implementação:** o contrato hoje carrega `budget_plan_id` + `categorizacao`/`centroDeCusto` como **rótulos de texto livre** (não refs de subcategoria — verificado 2026-07-21). Então "herdar do contrato" hoje só entrega o **plano**; herdar centro/categoria/subcategoria exige que o contrato passe a carregar essas refs, ou que a herança seja só do plano e o resto o operador selecione. **Decisão de implementação da fatia B**, registrada aqui.

### Decisão nº 4 — histórico dos 91 documentos: **pendente** (última a analisar)

### Decisão nº 4 — histórico dos 91 documentos: **fica de fora; migra como está; regra nova só para os novos** ✅

Os 91 documentos existentes **não são reclassificados** — migram no estado atual (sem plano/subcategoria). O carimbo `(plano, subcategoria)` é **obrigatório-por-regra apenas para lançamentos novos**. O relatório fecha **daqui pra frente**.

**Refinamento forçado no CA7b (linha "Sem orçamento previsto"):** a decisão cria dois tipos de "sem plano" que NÃO podem compartilhar o mesmo balde:

| Caso | `budget_plan_ref` | No relatório |
| :-- | :-- | :-- |
| Título **com plano**, gasto em subcategoria fora da árvore planejada | preenchido | linha **"Sem orçamento previsto"** (off-plan real) |
| Título **legado** (os 91, não carimbados) | nulo | **fora do relatório** (não atribuível a plano) |
| **Estorno / Ajuste** (nunca têm plano — ADR-0051 §4) | nulo | **fora do relatório** |

Ou seja: "Sem orçamento previsto" = **tem plano, caiu fora da árvore**. Sem `budget_plan_ref` = **fora do relatório de plano**. O reader da fatia 2 **já implementa isso** (`realized-provisioned-projection.ts:185` descarta linha sem `budget_plan_ref`) — código já aderente à decisão.

**Aviso operacional:** o lado Realizado do relatório sobe **quase vazio** (só títulos novos carimbados) e **enche com o tempo**. Alinhar expectativa com o usuário — "vazio" inicial é esperado, não defeito.

---

## Estado da análise: as 4 decisões estão TOMADAS

| # | Decisão | Resultado |
| :-- | :-- | :-- |
| 1 | Semântica do carimbo | **Referência viva** + integridade barrada na origem (guarda por nível) |
| 2 | Grão do relatório | **Folha (subcategoria)** |
| 3 | Origem do vínculo | **Híbrido editável** (herda do contrato / seleciona na cascata do plano) |
| 4 | Histórico (91 docs) | **Fica de fora**; migra como está; regra nova só para novos |

**Não requer novo ADR** — tudo dentro do ADR-0051 (talvez um adendo esclarecendo `subcategory_ref` como mecanismo do carimbo). Próximo passo (quando a P.O. decidir): fatiar o épico em tickets de pipeline (VO+schema → fluxo de criação+front → leitura+guarda), respeitando 1 módulo por ticket.
