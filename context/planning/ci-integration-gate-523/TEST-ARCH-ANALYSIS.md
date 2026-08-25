# TEST-ARCH-ANALYSIS — Arquitetura de teste do core-api (issue #523)

> Investigação **READ-ONLY** conduzida pela skill `test-pyramid-engineer` (Pirâmide Prática de
> Ham Vocke + Quadrantes Ágeis de Gregory & Crispin). Decisões-chave ancoradas em citação
> literal via MCP `acdg-skills` (Princípio IX). Nenhum código/teste foi alterado.

---

## Veredito (TL;DR)

1. **Gating:** a camada de integração MySQL **faz parte do Definition of Done e DEVE bloquear o
   merge** — mas como **estágio próprio, obrigatório, do pipeline** (job de CI por suíte via o
   runner), **não** dentro de `pnpm test`, e **não** rebaixada a nightly meramente informativo.
   Vocke: os estágios do pipeline são definidos por **velocidade e escopo**, não por tipo — o
   lento/amplo vai para um estágio **posterior**, mas continua sendo **gate**.
2. **Contaminação (44 vs 8):** **CONFIRMADO**. As 44 falhas + 265 cancelados do
   `node --test 'tests/**'` all-at-once são majoritariamente **artefato de não-usar-o-runner**
   (falta o isolamento entre-suítes = banco recriado por módulo + `--test-concurrency=1`). O
   problema **real** de higiene que o runner **não** resolve é **intra-suíte**.
3. **#521 é ponta de iceberg:** o mecanismo exato foi confirmado no código, e o **padrão de
   limpeza é improvisado por arquivo** em toda a base de integração → **dívida sistêmica de
   isolamento intra-suíte**, não um typo isolado.

---

## Pergunta 1 — Onde a integração deve gatilhar no gate?

### Situação atual (o gate é cego para integração)

- `package.json` → `"test": "node --test … 'tests/**/*.test.ts'"` roda **tudo**, mas as suítes de
  integração ficam atrás de `if (integrationEnabled())` / `MYSQL_INTEGRATION=1` e **se auto-skipam**
  quando o env não está setado (`supplier-repository.drizzle.test.ts:22`,
  `payables-analysis.drizzle-mysql.test.ts` idem). Logo `pnpm test` puro = **só unit/offline**.
- `.github/workflows/ci.yml:39-46` roda `typecheck + format:check + lint + test` — e o próprio
  comentário do arquivo assume isso: _"Roda OFFLINE: os testes de integração (MySQL/MinIO) ficam
  atrás de opt-in (\*\_INTEGRATION=1) e NÃO disparam aqui"_ (`ci.yml:6-9`).
- O **único** workflow que chama o runner é `integration-notifications.yml` (SMTP/Mailpit), e
  **com `paths:` filtrado** para `src/modules/notifications/**` (`integration-notifications.yml:12-19`).
- `scripts/ci/test-integration.ts` declara **15 suítes** (contracts, auth, partners, programs,
  budget-plans, financial, etl\*, storage, photo, logo, infra, notifications). **14 delas nunca
  são executadas por nenhum workflow.** É exatamente por esse buraco que #519 chegou à `dev`.

### O que a Pirâmide Prática determina

O gate não deve ser organizado por **tipo** de teste, e sim por **velocidade/escopo** — e o lento
vai para um estágio **posterior**, o que **não** significa "opcional":

> ## Putting Tests Into Your Deployment Pipeline
>
> If you're using Continuous Integration or Continuous Delivery, you'll
> have a Deployment Pipeline in place that will run
> automated tests every time you make a change to your software. Usually
> this pipeline is split into several stages that gradually give you more
> confidence that your software is ready to be deployed to production.
> — _Ham Vocke, The Practical Test Pyramid (martinfowler.com), linha 987_

> A good build pipeline tells you that you messed up as quick as possible. (…) You could get this
> information within a matter of seconds (…) by putting the fast running tests in the earlier
> stages of your pipeline. Conversely you put the longer running tests - usually the ones with a
> broader scope - in the later stages to not defer the feedback from the fast-running tests. You
> see that defining the stages of your deployment pipeline is not driven by the types of tests but
> rather by their speed and scope.
> — _Ham Vocke, The Practical Test Pyramid, linha 999_

### O que os Quadrantes Ágeis determinam

Os testes de integração de repositório/DB são **technology-facing tests que dão suporte ao time**
(Quadrante 1 no modelo Marick/Gregory-Crispin): automatizados, executados a cada mudança, cuja
função é **dar confiança ao produto** — portanto, **gate**, não relatório opcional.

> ## Chapter 9: The Agile Testing Quadrants
>
> Brian Marick first wrote about the agile testing quadrants (…) The quadrants gave us a way to
> discuss all the different types of testing that a team might need to consider. They help us see
> the big picture.
> — _Janet Gregory, Lisa Crispin, Agile Testing Condensed, linha 1644_

> The agile testing quadrants model helps teams think through testing activities that are needed to
> give confidence to the product they are building. (…) makes the whole team’s responsibility for
> testing activities visible.
> — _Gregory & Crispin, Agile Testing Condensed, linha 1693_

### Recomendação (P1)

- **Integração ∈ Definition of Done que bloqueia merge.** Ela é o estágio **posterior** (mais
  lento, precisa de Docker), **paralelo** ao job unit, **required** no branch protection de
  `dev`/`main`.
- **Não** dobrar integração dentro de `pnpm test`: violaria o _fast feedback_ (Vocke:989-999) e
  exigiria Docker em cada rodada de unit local. Mantenha `pnpm test`/W3 rápido e offline.
- **Nightly ≠ gate suficiente.** Um nightly pode ser uma **segunda** rede (matriz ampla, ETL, x99
  real), mas o gate de PR precisa ser **bloqueante** — #519 era um defeito _mergeável_, e nightly
  pós-merge é justamente como os 4 defeitos vazaram para a `dev`.

---

## Pergunta 2 — Diagnóstico da contaminação: runner-misuse vs defeito real

**CONFIRMADO.** As 44 falhas + 265 cancelados são, na maior parte, **artefato de rodar sem o
runner**. Mecanismo, linha a linha:

1. **O runner recria o banco ENTRE suítes.** `scripts/ci/test-integration.ts:296-303`: cada
   invocação faz `docker compose up --wait` → `node --test` → **`finally` sempre `docker compose
down -v`** (`dockerDown`, linha 264-266, com `-v` = apaga o volume). `main()` roda **uma** suíte
   por processo (linha 284-286). Logo `contracts`, `partners`, `financial`… cada uma parte de um
   MySQL **virgem**. Isso é o isolamento **entre-suítes / entre-módulos**.
2. **O runner serializa dentro da suíte MySQL.** Toda `mysqlSuite` seta `concurrency1: true`
   (linha 32-38) → `--test-concurrency=1` (linha 271). Os arquivos rodam **um de cada vez**.
3. **`node --test 'tests/**'` all-at-once perde as duas coisas:\*\*
   - **Um único banco `core`** para ctr*/fin*/par*/bgp*/auth\_ ao mesmo tempo — cada arquivo aplica
     suas migrations no mesmo schema e os `beforeEach`/`before` de um módulo colidem com linhas de
     outro.
   - **`node:test` roda os arquivos em PARALELO por padrão** (sem `--test-concurrency=1`). Um
     `db.delete(finDocuments)` de um arquivo corre concorrente com o `insert` de um arquivo irmão
     que tem FK para `fin_documents` → **`ER_ROW_IS_REFERENCED_2` (errno 1451)**: o DELETE do pai
     é barrado por linha-filha ainda presente. Os 27× do relato são exatamente essa classe.
   - **265 "cancelados" = cascata do `node:test`:** quando um hook `before`/`beforeEach` lança
     (seja o 1451 acima, seja `ER_DUP_ENTRY` numa UNIQUE), o runner **cancela toda a subárvore** de
     testes daquele hook. Algumas dezenas de hooks envenenados cancelam centenas de testes. Não são
     309 asserções genuinamente quebradas.
4. **Pelo runner → 8 falhas reais.** Com banco virgem por suíte + serialização, sobram os defeitos
   **verdadeiros** (ex.: #519 varchar(16) < 'PartiallyReconciled'; a colisão intra-suíte #521).

**Conclusão:** as 44 são, no essencial, **ruído de isolamento** que o runner já elimina entre
suítes. O resíduo real de higiene é **DENTRO de uma suíte** — e esse o runner **não** cura, porque
os 13/30 arquivos de uma mesma suíte compartilham **um** banco sem reset entre arquivos.

---

## Pergunta 3 — #521 é ponta de iceberg? (mapa de contaminação intra-suíte)

### #521 confirmado no código (mecanismo exato)

Ordem dos arquivos na suíte `partners` (o runner passa os paths nessa ordem e roda serial):
`supplier-repository` (`test-integration.ts:77`) **antes** de `suppliers-batch-reader`
(`test-integration.ts:87`).

- `supplier-repository.drizzle.test.ts` insere **em todos os testes** um supplier com o **mesmo
  CNPJ** `11222333000181` (linhas 83, 98, 110, 122, 131, 150, 174). Seu `beforeEach` limpa
  `parSuppliers` **antes de cada teste** (linha 72-76) e o `after` só fecha o handle (linha 68) —
  **não há `afterEach`**. Logo a **linha do ÚLTIMO teste** (CNPJ `11222333000181`, id UUID random
  via `SupplierId.generate()`) **sobrevive** ao fim do arquivo.
- `suppliers-batch-reader.drizzle.test.ts` no `before` faz
  `delete(parSuppliers).where(inArray(id, [A, B, MISSING]))` — **apaga só 3 UUIDs fixos** (linha
  34-35) — e então **insere A com CNPJ `11222333000181`** (linha ~57). O resíduo do
  `supplier-repository` tem **id diferente** mas **CNPJ igual** → o delete-por-id **não** o remove
  → o INSERT colide em `par_suppliers_cnpj_idx` (UNIQUE) → **`ER_DUP_ENTRY` (1062)**. Isso **é**
  #521.

**A falha é 100% ordem-dependente entre dois arquivos da MESMA suíte** — invisível entre-suítes
(o runner recria o banco) e afogada no ruído no all-at-once. O runner **não** protege contra ela.

### O padrão de limpeza é improvisado por arquivo (a dívida sistêmica)

Não existe helper compartilhado de "reset para estado conhecido". Cada arquivo inventa a própria
limpeza, quase sempre **só das tabelas que ele conhece** e **antes de cada teste** (sem `afterEach`
→ resíduo do último teste sempre fica). Mapa por classe de risco:

| Suíte / arquivo (`path`)                                                               | Padrão de limpeza                                                                                                                  | Risco intra-suíte                                                                                  |
| -------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `partners/…/repos/supplier-repository.drizzle.test.ts`                                 | `beforeEach` → `delete(parOutbox, parSuppliers)` (só na entrada)                                                                   | **Fonte do resíduo** — deixa CNPJ `11222333000181` para o próximo arquivo                          |
| `partners/…/repos/suppliers-batch-reader.drizzle.test.ts`                              | `before` → `delete(...).where(inArray(id,[A,B,MISSING]))` — **por id, parcial**                                                    | **ALTO** — herda resíduo com UNIQUE de negócio colidente (**#521**)                                |
| `partners/…/repos/financier-repository.drizzle.test.ts`                                | `beforeEach` → `delete(parFinanciers)`                                                                                             | **MÉDIO** — CNPJ é UNIQUE; mesma classe de #521 se um irmão deixar resíduo                         |
| `partners/…/repos/collaborator-repository.drizzle.test.ts`                             | `beforeEach` → `delete(parCollaborators)`                                                                                          | BAIXO                                                                                              |
| `partners/…/repos/{collaborator-invite-token,contract-count-store,user-profile}`       | `beforeEach` → delete só da(s) própria(s) tabela(s)                                                                                | BAIXO                                                                                              |
| `partners/…/public-api/partners-etl-port.integration.test.ts`                          | `beforeEach` → delete **global** de userProfiles+suppliers+financiers+collaborators                                                | BAIXO na entrada (mas deixa resíduo pós-último-teste)                                              |
| `partners/…/public-api/partners-etl-store-integrity.integration.test.ts`               | idem 4 deletes globais; usa CNPJ `11222333000181`                                                                                  | BAIXO na entrada                                                                                   |
| `partners/…/public-api/partners-read-port.integration.test.ts`                         | `beforeEach` → delete suppliers+financiers+collaborators+acts; usa `11222333000181`                                                | BAIXO na entrada                                                                                   |
| `financial/…/{category-read,cost-center-read}.drizzle-mysql.test.ts`                   | **sem limpeza** — só lê **seed** da migration 0013                                                                                 | SEGURO (read-only sobre seed)                                                                      |
| `financial/…/persistence/*` (≈22 arquivos)                                             | `beforeEach=0, delete=0` — setup no `before` + **UUID fixo por arquivo**, sem limpeza global                                       | **LATENTE** — seguro só enquanto não colidir UUID/UNIQUE com irmão; nada garante isso              |
| `financial/…/public-api/{payables-analysis,payment-position}.drizzle-mysql.test.ts`    | `beforeEach` → **global** em finPayableView/finSupplierView, mas **por-id** (`inArray`) em finCategories/finCostCenters (têm seed) | **MÉDIO** — mesmas UUID/`code` de referência entre arquivos; delete-por-id não cobre UNIQUE `code` |
| `financial/…/public-api/{realized-by-plan,realized-provisioned}.drizzle-mysql.test.ts` | `beforeEach` → **global** em finReconciliationItems/finReconciliations/finPayables/finDocuments                                    | BAIXO na entrada                                                                                   |
| `budget-plans/…/persistence/*.drizzle-mysql.test.ts` (7 arq.)                          | `before` → delete "árvore" bgp\_\* (5–7 tabelas)                                                                                   | BAIXO na entrada                                                                                   |
| `budget-plans/…/public-api/{etl,read}-port.integration.test.ts`                        | `beforeEach` → delete com `where`                                                                                                  | BAIXO                                                                                              |

**Padrões-raiz (as duas falhas de contrato que produzem #521 e seus primos):**

- **(A) Limpeza por PK específico** quando existe **UNIQUE de negócio** (CNPJ, CPF, `code`,
  `legacy_id`): `delete(...).where(inArray(id, [...]))` **não** protege contra resíduo de mesmo
  valor natural com id diferente. Ofensores: `suppliers-batch-reader` (partners), e o par
  categorias/cost-centers dos report-tests (financial).
- **(B) `beforeEach` limpa ANTES, sem `afterEach`** → o **último teste de cada arquivo sempre
  deixa resíduo** para o arquivo seguinte da mesma suíte. É o combustível universal; qualquer
  arquivo-vítima do padrão (A) transforma esse resíduo em falha.

**Conclusão P3:** #521 **não é isolado**. É a **aresta afiada** de uma dívida **sistêmica** — a
ausência de um contrato de isolamento compartilhado e enforced. O mesmo defeito latente mora em
todo lugar onde uma **chave natural única** é reusada entre arquivos irmãos cuja limpeza é parcial
(por-id) ou inexistente na entrada — em `partners` (CNPJ) e em `financial` (UUID/`code` de
referência + os ≈22 arquivos `delete=0`).

---

## Pergunta 4 — Política de doubles / camada

**Está correta pela pirâmide, e não há duplicação a empurrar para baixo.** Os testes de integração
exercitam os repos Drizzle contra **MySQL real**, que é exatamente o que a camada Integration deve
cobrir — a parte que vive **fora** da aplicação:

> ## Integration Tests
>
> All non-trivial applications will integrate with some other parts
> (databases, filesystems, network calls to other applications). (…)
> **Integration Tests** are there to help. They test the integration of your application with all
> the parts that live outside of your application.
> — _Ham Vocke, The Practical Test Pyramid, linha 341_

**Prova concreta de que não é sobreposição com unit — o defeito #519:** o schema declara
`status: varchar('status', { length: 16 })` em **duas** tabelas — `finDocuments`
(`src/modules/financial/adapters/persistence/schemas/mysql.ts:63` / coluna linha **116**) e
`finPayables` (decl. linha **234** / coluna linha **249**) — enquanto o **próprio CHECK** dessas
tabelas admite `'PartiallyReconciled'` (linhas **186** e **274**), string de **19 caracteres**.
`varchar(16) < 19` → todo INSERT/UPDATE com esse status **estoura** (`ER_DATA_TOO_LONG`, 1406) no
MySQL. O **fake in-memory** (`reconciliation-repository.in-memory.ts`) guarda a string JS sem
limite de largura e **passa verde**; o VO de domínio aceita o valor; até o CHECK do DDL o lista.
**Só o adapter Drizzle contra MySQL real captura a largura da coluna.** Não há nível mais baixo
onde esse defeito possa ser pego — é o caso-livro do Vocke.

Sobre duplicação (as duas regras de ouro), o projeto está do lado certo:

> As with production code you should strive for simplicity and avoid duplication. (…)
>
> - If a higher-level test spots an error and there's no lower-level test failing, you need to
>   write a lower-level test
> - Push your tests as far down the test pyramid as you can
>   — _Ham Vocke, The Practical Test Pyramid, linha 999/1003_

- **Doubles:** unit usa **fakes** (`clock-fixed.ts`, `*.in-memory.ts`), não mocks de verificação
  de interação — coerente com a política do projeto. **Não** encontrei over-mocking sistêmico.
- **Onde há risco leve de duplicação:** os report/read-model tests (`payables-analysis`,
  `payment-position`, `realized-*`) reafirmam agregação que **em parte** poderia viver em unit — mas
  o miolo é `GROUP BY`/`DATE_FORMAT`/JOIN de 3 saltos, **genuinamente DB-side** → integração é a
  camada certa. Recomendação: manter cálculo puro (se houver) em unit e a **forma do SQL** em
  integração; não é dívida material hoje.

**Veredito P4:** camada correta, doubles corretos, sem push-down pendente. A integração Drizzle↔MySQL
é **load-bearing e não-redundante**.

---

## Pergunta 5 — Recomendação de arquitetura (gating + contrato de isolamento)

### A. Gating do W3/CI

1. **Novo estágio required no CI, por suíte, via o runner existente.** Generalizar
   `integration-notifications.yml` para uma matriz sobre as suítes de
   `scripts/ci/test-integration.ts` (contracts, auth, partners, programs, budget-plans, financial,
   etl\*, storage/photo/logo). Job **paralelo** ao `quality`, **required** no branch protection de
   `dev`/`main`. É o "estágio posterior" da Pirâmide — lento porém **bloqueante**.
2. **`pnpm test`/W3 permanece rápido e offline** (fast feedback). O Definition of Done do ticket
   passa a incluir explicitamente "suíte(s) de integração do módulo tocado verdes pelo runner".
3. **Nightly amplo como 2ª rede, não como gate primário** (ETL/x99 real, matriz completa).
4. **Backlog imediato:** as duas colunas de `varchar(16)` de #519 (`mysql.ts:116` e `:249`) precisam
   caber ≥ 19 (o maior literal do CHECK); registrar via skill `issue-report` se ainda não houver
   ticket, e cobrir com um caso de integração que faça UPDATE→`'PartiallyReconciled'` e leia de volta.

### B. Contrato de isolamento que cada arquivo de suíte deve honrar

> **Todo arquivo de suíte de integração parte de — e não deixa resíduo que quebre — um estado
> conhecido para TODAS as tabelas cujo espaço de chaves ele escreve (não só as que ele lê). A
> limpeza é por TABELA (ou por classe de chave única de negócio), executada na ENTRADA, e nunca
> por PK específico quando existe UNIQUE natural (CNPJ, CPF, `code`, `legacy_id`). Um arquivo não
> pode depender da ordem em que roda dentro da suíte.**

Concretamente:

- **Limpar na entrada por tabela**, não por id: trocar `delete(...).where(inArray(id, [...]))` por
  `delete(<tabela>)` nas tabelas com UNIQUE de negócio (corrige `suppliers-batch-reader`, elimina a
  classe do #521). Para tabelas com **seed** (finCategories/finCostCenters), limpar só o range de
  teste **por `code`/pela UNIQUE**, não por id.
- **Centralizar num helper compartilhado** de reset por módulo (ex. `resetPartnersTables(handle)`,
  `resetFinancialTables(handle)`), chamado no `beforeEach` de todo arquivo da suíte — mata o
  "improviso por arquivo" e o resíduo pós-último-teste. (Ver anti-padrão do próprio repo:
  _"antes de extrair lógica, ver se o repositório já a faz"_ — hoje **ninguém** faz reset global,
  então o helper é criação legítima, não terceira cópia.)
- **#521 viola** o contrato em dois pontos: `suppliers-batch-reader` limpa **por id** (viola "por
  tabela / por chave única") e depende da **ordem** relativa a `supplier-repository` (viola
  "independente de ordem").

### C. Follow-ups sugeridos (via `issue-report`, fora do escopo deste relatório)

- Gate de CI matricial para as 14 suítes órfãs do runner (a causa-raiz de #523).
- Helper de reset por módulo + refactor dos ofensores (batch-reader + os ≈22 `delete=0` do
  financial que escrevem).
- Correção de largura de `varchar(16)` em finDocuments/finPayables (#519) com teste de integração.

---

### Apêndice — fontes canônicas citadas (grounding OK via `acdg-skills`)

- Vocke, _The Practical Test Pyramid_ — linhas **341** (Integration), **987** (Deployment
  Pipeline), **999** (Fast Feedback / velocidade+escopo), **1003** (Avoid Test Duplication).
- Gregory & Crispin, _Agile Testing Condensed_ — linhas **1644** e **1693** (Agile Testing
  Quadrants).
