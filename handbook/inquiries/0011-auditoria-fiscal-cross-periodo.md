# Inquiry-0011: Auditoria fiscal cross-período em sistema sob Strangler Fig

- **Status:** Open — aguardando deliberação da banca/squad
- **Opened:** 2026-05-07
- **Last updated:** 2026-05-14 (Apêndice D — achado de schema)
- **Opened by:** Gabriel Aderaldo (`gaderaldo10@gmail.com`)
- **Asked to:** Banca interna de arquitetura (squad de engenharia)
- **Impact:** Decisão arquitetural que afeta (a) schema de `core.fin_documentos` no marco M3, (b) política do `01-migration-strategy.md` §6 ("Não migrar"), (c) eventual ADR novo de Reporting/Read Model. Bloqueador suave para iniciar M3 sem retrabalho.

> 🆕 **Aviso ao leitor (2026-05-14):** o **Apêndice D** ao final desta inquiry registra um achado pós-abertura que **muda a base empírica** das Q3 e Q5 — o schema real do legado **não tem campos de NFe** (chave 44 dígitos, número de documento, série, modelo). Recomenda-se ler **§7 → Apêndice D → Apêndice A** nessa ordem para entender o estado atual da deliberação.
- **Origem:** Achado **F1.4 — Lacuna 1** da revisão `handbook/reviews/0001-revisao-refatoracao-migracao-segura.md`.
- **Formato:** O corpo desta inquiry é um **email longo** dirigido à banca, com toda a contextualização canônica e quatro hipóteses fundamentadas. Estrutura escolhida para ser lida sem dependência do resto do handbook por quem entrar do zero na discussão.

---

## Email para a banca

**De:** Gabriel Aderaldo `<gaderaldo10@gmail.com>`
**Para:** Banca interna de revisão arquitetural — squad de engenharia (Bem Comum / Envolve)
**Cc:** Arquivado em `handbook/inquiries/0011-auditoria-fiscal-cross-periodo.md`
**Assunto:** [Pedido de orientação] Auditoria fiscal cross-período em ERP financeiro migrando via Strangler Fig — quatro hipóteses fundamentadas e dúvidas concretas
**Data:** 2026-05-07

---

Prezada banca,

Escrevo na qualidade de aluno tentando estabelecer fundamentação rigorosa para uma decisão arquitetural cuja janela de oportunidade está se fechando: precisamos do desenho de `core.fin_documentos` antes do início do marco M3 do nosso plano de migração, e existe uma classe de cenário operacional — auditoria fiscal cross-período — que o handbook hoje **não trata** e que, se for tratada com atraso, encarece consideravelmente o retrabalho.

Para que esta carta possa ser lida e respondida sem que vocês precisem percorrer o handbook inteiro, organizei o material em oito seções: (1) contexto do projeto, (2) decisões arquiteturais já tomadas e o porquê delas, (3) o problema concreto que motiva a pergunta, (4) por que a solução não é óbvia, (5) quatro hipóteses fundamentadas com citação canônica, (6) tabela comparativa, (7) perguntas explícitas que gostaria de ver respondidas, (8) referências.

A pergunta final está condensada na seção 7 — leiam-na primeiro se o tempo for curto.

---

### 1. Contexto do projeto

Estou trabalhando na migração de um ERP financeiro brasileiro (**Bem Comum / Envolve**, módulo financeiro) sob as seguintes condições materiais:

- **Sistema legado:** ERP em **NestJS 10 + TypeORM 0.3 + MySQL 8**, modelado em torno do conceito de "**título avulso**" (CRUD-cêntrico, sem agregado raiz claro, sem máquina de estados explícita).
- **Sistema novo (`core-api`):** **Modular Monolith** (decisão registrada em `architecture/adr/0006-modular-monolith-core-api.md`) em **Node 24 LTS + Fastify + TypeScript 6**, hospedando os módulos **Financeiro** e **Contratos**. O módulo Financeiro é centrado em um agregado novo — o **Documento Fiscal** ("Fato Gerador") — soberano sobre os títulos derivados.
- **Banco de dados:** uma instância MySQL 8.4 LTS (gerenciada — RDS ou Cloud SQL) com **dois databases isolados** (`legacy` e `core`), cada um com seu usuário com `GRANT` estrito. ADRs vigentes: `0013-mysql-database-engine.md`, `0014-mysql-database-isolation.md`, `0015-mysql-outbox-pattern.md`.
- **Estratégia de migração:** **Strangler Fig** (Fowler, registrada em `architecture/adr/0001-strangler-fig-over-rewrite.md` e detalhada em `architecture/01-migration-strategy.md`). Ordem dos marcos: M0 (topologia em dev) → M1 (Bradesco em prod) → M2 (OCR) → **M3 (Documentos)** → M4 (Títulos & Liquidação) → M5 (Legado desligado). ETA conservador da janela total: 12-24 meses (ADR-0001).
- **Política operacional sobre dados históricos:** o `01-migration-strategy.md` §6 estabelece literalmente:

  > "🚫 **Não migrar.**
  >
  > Dados financeiros históricos ficam no schema `legacy.*`, **congelados**. O `core.*` cresce com dados novos. Os princípios de 'Time Travel' e auditoria do handbook valem do nascimento do `core` em diante.
  >
  > **Razão:** migrar histórico financeiro reescrevendo formato é risco operacional alto sem ganho proporcional. Auditoria do passado consulta o legado; do futuro, o novo."

A decisão de **não migrar histórico** é defensável e comum em ERPs financeiros brasileiros — registros históricos foram gerados sob conjunto de regras (alíquotas, retenções, formatos de documento) que **não vale a pena re-derivar** no modelo novo, e qualquer reescrita levanta risco de inconsistência fiscal retroativa. Essa decisão **não está sob questionamento aqui**.

A decisão **subjacente que está sob questionamento** é: aceitando que histórico fica congelado, **como tratar consultas que precisam atravessar a fronteira temporal entre o mundo legado e o mundo core?**

---

### 2. Decisões arquiteturais já tomadas (que restringem o espaço de soluções)

Para que as hipóteses na seção 5 sejam avaliadas com justiça, listo aqui as decisões que **não podem ser revisitadas** sem custo grande, ordenadas por força do compromisso:

1. **Strangler Fig sobre Big Bang Rewrite** (ADR-0001). Coexistência longa de legado + core durante 12-24 meses é premissa.
2. **Cada database tem UM único escritor** (ADR-0014, "Regra de Ouro"). `legacy.*` só é escrito por `legacy-api`; `core.*` só por `core-api`. Cross-database via outbox + evento, mesmo intra-processo entre módulos do core.
3. **Outbox MySQL é a única ponte cross-database entre serviços** (ADR-0015). Schema da outbox: `event_id` CHAR(36), `event_type` VARCHAR, `payload` JSON, `processed_at` DATETIME(6) NULL, índice composto em `(processed_at, occurred_at)`.
4. **BFF é "burro"** (ADR-0005). Não compõe respostas, não traduz entre v1 e v2, não acessa banco. Roteamento por prefixo apenas.
5. **`readonly_bi` user existe e tem `SELECT` em ambos os databases** (`03-data-architecture.md` §2 e §8). É o ponto de entrada permitido para BI e relatórios.
6. **ADR-0001 alerta contra "batalhas simultâneas"**: durante a migração de paradigma de domínio, evitamos qualquer compromisso operacional que abra uma segunda frente complexa.

Adiconalmente, há uma restrição fiscal **externa** ao handbook: dados fiscais brasileiros têm **retenção legal mínima de 5 anos** (`03-data-architecture.md` §6), o que significa que `legacy.*` não pode simplesmente ser apagado quando M5 for atingido — os dados precisam permanecer consultáveis.

---

### 3. O problema concreto que motiva esta pergunta

Cenário hipotético, mas perfeitamente plausível dado o domínio:

> **Ano 2027.** A Receita Federal — ou um auditor independente contratado pela Bem Comum, ou uma diligência em fusão/aquisição — solicita: *"forneçam todos os documentos fiscais emitidos pelo CNPJ do cliente X entre 01/01/2024 e 31/12/2027, com seus respectivos títulos derivados, valores originais, valores efetivamente liquidados, datas de pagamento e número da remessa CNAB associada."*

A janela 2024-2027 atravessa exatamente a fronteira da migração:

- **Documentos emitidos antes de M3 (≈2026 segundo nosso plano):** existem em `legacy.documentos_fiscais` (ou similar — o legado tem o conceito ainda atomizado em "títulos avulsos", o que agrava o problema). Modelados como CRUD, sem invariantes de selagem, sem agregado raiz.
- **Documentos emitidos depois de M3:** existem em `core.fin_documentos`, com schema novo — campos diferentes, máquina de estados explícita, eventos de domínio ("DocumentoSelado", "TituloAprovado") versionados.

A pergunta do auditor não pode ser respondida com **uma única consulta SQL** contra um schema único. Precisa ser respondida com:

1. Uma SELECT em `legacy.*` para o período pré-M3
2. Uma SELECT em `core.fin_*` para o período pós-M3
3. Um **mapeamento semântico** entre os dois mundos (o que era "título" no legado equivale a quê no Fato Gerador novo? O CNPJ de quem emitiu? O número do documento original?)
4. Uma reconciliação que preserve unicidade (não pode duplicar; não pode perder)
5. Uma exportação em formato consumível (CSV, XLSX, PDF certificado)

E esta é apenas a face visível do problema. A face invisível é: **se a chave de correlação entre os dois mundos não for desenhada com a antecedência correta, a reconciliação se torna impossível ou cara demais**. Por exemplo: se `core.fin_documentos` não armazenar `numero_documento_original_legado` ou equivalente, o auditor pode terminar com duas listas que **não correlacionam** porque os IDs são UUIDs novos no core e auto-increment no legado.

A janela de oportunidade para incluir essa chave de correlação **se fecha quando começarmos a desenhar o schema de `core.fin_documentos`**, ou seja, na entrada do marco M3.

---

### 4. Por que a solução não é trivial

Quatro complicadores que afastam o problema de uma "view de banco resolve":

**4.1. Mudança de paradigma de modelagem entre os dois mundos.** O legado modela "título avulso" como entidade primária. O handbook (`domain/DOCUMENTO_MESTRE.md`) modela "Documento Fiscal" como agregado raiz e títulos como entidades dependentes dentro do agregado. Não é correspondência 1-para-1: um documento no novo modelo pode ter N títulos derivados que no legado eram registros independentes. A reconciliação precisa **reconstruir agregação** ao subir do legado, ou **decompor agregação** ao descer do core.

**4.2. Eventos de domínio mudaram de matriz.** No core, "DocumentoSelado" é um evento de domínio com semântica forte (imutabilidade pós-selo, rastro de auditoria). No legado, não existe selo — qualquer linha pode ser editada com `UPDATE`. Auditoria que pergunte "este documento foi alterado depois de selado?" só faz sentido para registros pós-M3.

**4.3. Apresentação ao auditor é parte do contrato.** Auditor não consome SQL — consome relatório. Quem renderiza o relatório (BI, ferramenta dedicada, módulo do core) é parte da decisão. E o relatório precisa carregar a **proveniência** (este registro veio de `legacy` modelo antigo / este veio de `core` modelo novo), porque o auditor pode questionar campos que existem só num lado.

**4.4. Latência e snapshot fiscal.** Reporting fiscal frequentemente exige **snapshot estável** — "o estado em 31/12/2027 às 23:59:59". Se o reporting é um Read Model construído via consumo de eventos do outbox (Opção C abaixo), há latência de eventually-consistent. Se o auditor pergunta sobre operações ocorridas há 30 segundos, podemos não tê-las refletidas — risco fiscal.

---

### 5. Quatro hipóteses fundamentadas

A seguir, quatro caminhos que considerei. Cada um vem com (a) descrição operacional, (b) fundamentação canônica literal quando existe, (c) trade-offs, (d) ordem de magnitude de custo (S/M/L/XL) e risco (LOW/MEDIUM/HIGH).

#### 5.1. Hipótese A — `readonly_bi` direto (status quo, pré-correlação)

**Operacional:** o usuário `readonly_bi` já existe (`03-data-architecture.md` §2) e tem `SELECT` em `legacy.*` e `core.*`. BI ou auditor com esse acesso escreve uma query manual com `UNION ALL`, ou faz dois SELECTs em ferramentas como Metabase/Power BI e reconcilia ali. **Pré-requisito invisível mas crítico:** existir uma chave de correlação estável (provavelmente `cnpj_emitente + numero_documento_original`) replicada em ambos os schemas.

**Fundamentação canônica:** nenhuma direta. É essencialmente "Database Integration" para fins de leitura. Newman (_Building Microservices_) proíbe Database Integration **entre serviços de escrita**, mas o próprio handbook (`03-data-architecture.md` §8) lista "Read replica usada por BI consultando ambos databases" como **padrão permitido**, justamente porque é read-only e não compromete isolamento de domínio.

**Trade-offs:**

- ✅ Custo de implementação: praticamente zero hoje. O usuário existe; falta apenas garantir a chave de correlação no `core.fin_documentos`.
- ✅ Resposta rápida quando demanda chega — auditor com Metabase resolve em horas.
- ❌ **Acoplamento BI ↔ schema interno.** Cada query cross-período é manuscrita; cada vez que `core.fin_documentos` evoluir (adicionar campo, renomear coluna), as queries do BI quebram silenciosamente. Newman descreve esse problema como o motivo central para Reporting Database (citação na hipótese B).
- ❌ Cada pergunta fiscal é refeita do zero — não há reuso. O quinto auditor refaz o mesmo trabalho do primeiro com bugs sutis diferentes.
- ❌ Não há proveniência embutida no resultado — o BI/ferramenta externa precisa carregar essa lógica.
- ❌ Sem garantia de snapshot estável.

**Custo:** S (tamanho de ajuste no schema do core + 1 parágrafo no handbook).
**Risco:** MEDIUM (acoplamento ao schema interno cresce com tempo; cada "evolução interna do core" obriga revisão de queries BI).

---

#### 5.2. Hipótese B — Reporting Database dedicado (Newman, canônico)

**Operacional:** criar um **terceiro database** (ex: `reporting`, ou um schema dedicado dentro do mesmo MySQL — em MySQL ambos significam o mesmo) com schema **estável e versionado** para reporting fiscal. Tabelas como `reporting.documentos_fiscais_unificados`, `reporting.titulos_unificados`, `reporting.remessas_cnab_consolidadas`. Cada lado (`legacy-api` e `core-api`) tem responsabilidade de empurrar dados pelo outbox, com worker dedicado que projeta para `reporting`. BI/auditor consulta apenas `reporting.*` — nunca `legacy.*` ou `core.*` direto.

**Fundamentação canônica (Sam Newman, _Building Microservices_, p. 115):**

> "As part of extracting microservices from our monolithic application, we also break apart our databases, as we want to hide access to our internal data storage. By hiding direct access to our databases, we are better able to create stable interfaces, which make independent deployability possible. Unfortunately, this causes us issues when we do have legitimate use cases for accessing data from more than one microservice, or when that data is better made available in a database, rather than via something like a REST API.
>
> With a reporting database, we instead create a dedicated database that is designed for external access, and we make it the responsibility of the microservice to push data from internal storage to the externally accessible reporting database, as seen in Figure 3-8.
>
> The reporting database allows us to hide internal state management, while still presenting the data in a database—something which can be very useful. For example, you might want to allow people to run off ad hoc defined SQL queries, run large-scale joins, or make use of existing toolchains that expect to have access to a SQL endpoint. The reporting database is a nice solution to this problem."
> — *(Linha 1518, p. 115, Sam Newman, _Building Microservices_)*

A leitura textual de Newman descreve **exatamente** o nosso caso: dois sistemas com schemas internos divergentes, necessidade de `large-scale joins` e `ad hoc defined SQL queries` por terceiros (auditores), e requisito de **estabilidade da interface** independente da evolução interna.

**Trade-offs:**

- ✅ Schema interno de `legacy` e `core` evolui sem quebrar BI ou auditor.
- ✅ Pattern explicitamente endossado pela literatura para o problema descrito.
- ✅ Pode-se conceder acesso direto a auditor externo sem expor mecânica interna do domínio (importante em diligências de M&A ou auditoria fiscal).
- ✅ Versionamento do schema de reporting é discutível e gerenciável (semver interno).
- ❌ **Worker novo de cada lado.** `legacy-api` precisa começar a emitir eventos para QUALQUER mudança que importe ao reporting (não só os 4 eventos cross-fronteira já catalogados em `04-integration-events.md` §6.1). Aumenta o escopo do "tocar no legado", o que ADR-0001 quer evitar.
- ❌ Schema unificado `reporting.documentos_fiscais_unificados` exige **decisão semântica** — como representar um documento que, no legado, era 3 títulos avulsos sem agregação? Inventar agregação retroativa? Manter 3 linhas? Marcar como "estilo legado"? Essa decisão não é técnica, é de negócio.
- ❌ ETL inicial: dados de `legacy.*` que JÁ existem precisam alimentar `reporting.*` no momento do bootstrap (não vão passar pelo outbox a posteriori, exceto se fizermos backfill sintético).
- ❌ Custo operacional: um database a mais para backup, monitorar, manter migrações de schema.

**Custo:** L (worker em cada lado + schema de reporting + ETL inicial + tooling de operação).
**Risco:** LOW (pattern maduro, limites bem entendidos), mas **custo no momento errado** se feito antes de M3.

---

#### 5.3. Hipótese C — Read Model unificado via CQRS dentro do `core-api` (Vernon, canônico)

**Operacional:** criar uma tabela `core.fin_documentos_unificados` (ou um schema lógico dentro de `core`) que é **denormalizado, dedicado à leitura, descartável e reconstruível**. Consome eventos do outbox de **ambos os lados**: o `legacy-api` passa a emitir eventos para mutações de documentos legados (não só os 4 eventos cross-fronteira atuais); o `core-api` já emite eventos para os documentos novos. Um worker dentro do `core-api` projeta ambos para `core.fin_documentos_unificados`. BI/auditor consulta essa tabela via `readonly_bi`.

**Fundamentação canônica (Vaughn Vernon, _Implementing Domain-Driven Design_, p. 201):**

> "The query model is a denormalized data model. It is not meant to deliver domain behavior, only data for display (and possibly reporting). If this data model is a SQL database, each table would hold the data for a single kind of client view (display). The table can have many columns, even a superset of those needed by any given user interface display view. Table views can be created from tables, each of which is used as a logical subset of the whole.
>
> It's worth noting that CQRS-based views can be both cheap and disposable (for development and in maintenance). This is especially so if you use a simple form of Event Sourcing (see the section "Event Sourcing" later in the chapter and Appendix A) and save all Events into a persistent store, which can be republished at any time to create new persistent view data. Doing so, any single view could be rewritten from scratch in isolation or the entire query model be switched to completely different persistence technology. This makes it easy to create and maintain views that continuously address ongoing UI needs."
> — *(Linha 3141, p. 201, Vaughn Vernon, _Implementing Domain-Driven Design_)*

A propriedade-chave que Vernon enfatiza — *cheap and disposable*, *can be rewritten from scratch* — é atraente: bug no schema do reporting? Limpa a tabela e reaplica os eventos. Mudança de regulamentação fiscal que muda o que precisa ser exposto? Reescreve a projeção sem tocar no domínio.

**Trade-offs:**

- ✅ Reconstruível em caso de bug.
- ✅ Mantém isolamento — `core_app` continua dono de `core.*`; nada novo cruza fronteira de processo.
- ✅ Único endereço para o auditor consultar.
- ❌ **Bootstrap não é trivial.** Eventos no outbox só existem para mutações que ocorreram **depois** de o outbox estar instalado. Documentos legados anteriores nunca passaram pelo outbox. Soluções possíveis: (i) ETL inicial one-shot do dump legado para popular `core.fin_documentos_unificados` direto; (ii) emitir eventos sintéticos retroativos no `legacy.outbox` durante o bootstrap; (iii) projeção lê tanto eventos novos quanto faz consulta direta em `legacy.*` para registros antigos. Cada caminho tem armadilhas próprias.
- ❌ Para que essa hipótese funcione bem, `legacy-api` precisa emitir eventos para **toda** mutação relevante de documentos durante a coexistência — significativamente mais que os 4 eventos hoje catalogados. Aumento de escopo do tocar-no-legado idêntico ao da hipótese B, mas com complexidade adicional de eventos sintéticos no bootstrap.
- ❌ A tabela vive **dentro** de `core-api`. Há risco arquitetural de o `core-api` virar "Deus do Reporting" — assumindo responsabilidades que estavam fora do escopo de Modular Monolith (`adr/0006`).
- ❌ Latência de eventually-consistent é exibida ao auditor sem disclaimer.

**Custo:** XL (worker + schema + ampliação de eventos no legado + ETL bootstrap + governança de projeção).
**Risco:** MEDIUM (arquitetonicamente correto mas operacionalmente complexo, e abre vetor para `core-api` extrapolar escopo).

---

#### 5.4. Hipótese D — Adiar com gatilho explícito + chave de correlação preservada hoje

**Operacional:** o `01-migration-strategy.md` §6 ganha um parágrafo curto:

> "Auditoria fiscal cross-período não é tratada nesta fase. A decisão sobre a estratégia (Reporting Database ou Read Model CQRS ou outro) será tomada quando **um** dos seguintes gatilhos disparar: (a) primeira solicitação fiscal cross-período concreta chegar, (b) início do planejamento detalhado do marco M3, (c) auditor externo solicitar acesso unificado. Em qualquer dos três casos, abre-se ADR próprio. Para preservar a opção, todas as tabelas de `core.fin_documentos` desde o início devem armazenar os campos de correlação com o legado: `numero_documento_original_legado`, `id_legado` (FK lógica em `legacy.*`, sem FK física), `cnpj_emitente`."

**Fundamentação canônica:** nenhuma direta no corpus indexado. É a aplicação prática do **princípio do último momento responsável** (Reinertsen, _Principles of Product Development Flow_; Mary Poppendieck, _Lean Software Development_) — adiar a decisão até ter mais informação, **desde que se preserve as opções**. Está alinhado com ADR-0001 ("uma briga de cada vez").

**Trade-offs:**

- ✅ Custo agora: praticamente zero. Um parágrafo no handbook + 3 colunas no schema futuro.
- ✅ Não fecha porta — qualquer das hipóteses A, B, C continua viável quando o gatilho disparar.
- ✅ Honra ADR-0001: não abrimos uma frente arquitetural antes de necessário.
- ✅ Permite que a decisão final seja informada pela primeira demanda real, não por especulação.
- ❌ Risco organizacional: a equipe pode esquecer que a decisão foi adiada. Vira débito invisível.
- ❌ Quando o gatilho disparar, escolher A/B/C **sob pressão de prazo** é pior que escolher hoje calmo.
- ❌ Se a primeira solicitação fiscal cross-período vier antes do gatilho (b), responder vira esforço ad hoc — possivelmente reciclável, possivelmente jogado fora.

**Custo:** XS (parágrafo + 3 colunas em schema novo).
**Risco:** LOW se houver disciplina de revisar nos gatilhos; MEDIUM se a equipe esquecer.

---

### 6. Tabela comparativa

| Critério | A — `readonly_bi` direto | B — Reporting DB | C — Read Model CQRS | D — Adiar com gatilho |
|---|---|---|---|---|
| Custo de implementação agora | S | L | XL | XS |
| Custo de manutenção ongoing | M (queries proliferam) | M (worker + schema) | H (workers + ETL + projeção) | XS |
| Fundamentação canônica direta | Não (mas permitido por exceção) | ✅ Newman (p. 115) | ✅ Vernon (p. 201) | Não (princípio lean, fora do corpus) |
| Mantém isolamento de domínio | Parcial | ✅ | ✅ | n/a |
| Resiste à evolução do schema interno do core | ❌ | ✅ | ✅ | n/a |
| Suporta auditor externo direto | ❌ (acoplaria a schema interno) | ✅ | ✅ | n/a |
| Reconstruível em caso de bug de schema | ❌ | Depende do worker | ✅ | n/a |
| Exige ampliação de eventos no legado | ❌ | ✅ (para alimentar reporting) | ✅ (para alimentar projeção) | ❌ |
| Bootstrap dos dados pré-existentes | n/a | ETL inicial | ETL inicial OU eventos sintéticos | n/a |
| Snapshot fiscal estável | Manual | Garantido pelo schema do reporting | Eventually-consistent | n/a |
| Compatível com ADR-0001 ("uma briga de cada vez") | ✅ | Marginalmente | ❌ no momento atual | ✅ |
| Quando começar | Antes de M3 | M3 ou M4 | M3 ou M4 | Hoje (parágrafo + 3 colunas) |

---

### 7. Pontos onde gostaria de orientação explícita

Reunindo as dúvidas que estão me impedindo de fechar a decisão sozinho:

**7.1.** Existe um padrão estabelecido na literatura para "auditoria cross-período em sistemas sob Strangler Fig", ou esse é um problema que cada equipe inventa do zero? Caso exista, qual a referência? Newman trata Reporting Database em geral (p. 115) mas não trata o caso especificamente cross-temporal de migração.

**7.2.** A escolha entre Reporting Database (Newman) e Read Model CQRS (Vernon) para o nosso caso é uma diferença real ou superficial? Em ambos, projetamos dados via worker; em ambos, o consumidor é externo ao domínio; em ambos, o schema é estável e versionado. **A diferença está apenas em onde o database vive (terceiro DB vs schema dentro do core)**, ou há propriedades arquiteturais que distingam mais profundamente os dois?

**7.3.** A chave de correlação `cnpj_emitente + numero_documento_original` é suficiente, ou ela tem armadilhas (CNPJ que se reorganiza, numeração reiniciada, série fiscal)? Existe um padrão consolidado no domínio fiscal brasileiro para chave de correlação cross-sistema?

**7.4.** Se adotarmos C (Read Model CQRS), qual é a recomendação para o **bootstrap dos dados pré-existentes**? As três alternativas que enumerei (ETL one-shot direto na tabela / eventos sintéticos no `legacy.outbox` / projeção que lê direto do legado) têm trade-offs documentados na literatura, ou cada equipe escolhe ad hoc?

**7.5.** Latência de Read Model: para reporting fiscal, qual é o limite aceitável? Há jurisprudência (literal ou de comunidade) sobre apresentar a um auditor um dado com lag de minutos vs segundos vs imediato?

**7.6.** **Pergunta principal:** considerando o contexto descrito, qual seria a recomendação da banca — A, B, C, D ou um híbrido? E qual seria a sequência temporal recomendada? Minha hipótese de trabalho atual é **D agora, B como solução-alvo no gatilho**. Isso é razoável ou tem armadilhas que não enxerguei?

---

### 8. Referências consultadas

- Newman, S. — _Building Microservices_, 2ª ed. (citações literais nas seções 5.1 e 5.2).
- Vernon, V. — _Implementing Domain-Driven Design_ (citação literal na seção 5.3).
- Fowler, M. — _Refactoring_, 2ª ed. (Long-Term Refactoring, Branch By Abstraction, Evolutionary Database — citados na revisão `handbook/reviews/0001-revisao-refatoracao-migracao-segura.md`).
- Valente, M.T. — _Fundamentos de Manutenção de Software_ (Strangler Fig — `handbook/reviews/0001-...` §1.1).
- Reinertsen, D. — _Principles of Product Development Flow_ (princípio do último momento responsável; **fora do corpus indexado**, citado por familiaridade do autor).
- Handbook do projeto: `architecture/01-migration-strategy.md`, `architecture/02-system-topology.md`, `architecture/03-data-architecture.md`, `architecture/04-integration-events.md`, ADRs 0001, 0005, 0006, 0013, 0014, 0015.
- Inquiry-0010 — `inquiries/0010-mysql-engine-correction.md` (lição aprendida sobre validação de premissas técnicas, base epistêmica desta inquiry).

---

Agradeço o tempo da banca. Posso reapresentar qualquer das seções com mais ou menos profundidade conforme orientação. Esta inquiry permanecerá com status `Open` até que (a) a banca delibere, (b) seja registrado um ADR novo, OU (c) seja explicitamente fechada com a hipótese D ("adiar com gatilho").

Atenciosamente,
**Gabriel Aderaldo**
Engenheiro de Software — Bem Comum / Envolve
2026-05-07

---

## Apêndice A — Decisão registrada (rascunho do autor)

> ⚠️ **Status:** rascunho preparado pelo autor com base na fundamentação canônica do Apêndice C. **Pendente de deliberação da banca.** Os campos abaixo serão validados (ou contestados) na próxima reunião.

- **Hipótese escolhida (proposta):** **Hipótese D — Adiar com gatilho explícito + chave de correlação preservada hoje.**
- **Justificativa:** a Hipótese D não é "decisão lean fora do corpus" — é aplicação direta de três patterns canônicos: **Parallel Change / Expand-Contract** (Sadalage citado por Fowler, _Refactoring_ p. 68) para o mecanismo de adicionar colunas hoje sem reader; **disciplina arquitetural de aplicar pattern só onde mitiga risco específico** (Vernon, _IDDD_ p. 166) para a parte de adiar Reporting DB / Read Model CQRS; e **a "Cautionary Tale" do Anticorruption Layer** (Evans, _DDD_ p. 228) — *"integration is always expensive; we should be sure it is really needed"*. Valente §8.4.5 (em PT-BR) endossa explicitamente combinar estratégias de particionamento, e a Hipótese D é uma combinação seletiva de **Banco de Dados Dedicado** (já vigente em ADR-0014) com **replicação seletiva de chaves estáveis** (estratégia 4 de Valente, aplicada a colunas e não a tabelas).
- **ADR gerado:** [ADR-0017](../architecture/adr/0017-correlation-keys-cross-period-audit.md) — Status `Proposed`, aguardando aprovação da banca.
- **Data de fechamento:** _(a preencher após deliberação)_
- **Próximos passos concretos** (válidos se a Hipótese D for aprovada):
  1. Promover ADR-0017 de `Proposed` para `Accepted`.
  2. Adicionar parágrafo curto em [`architecture/01-migration-strategy.md`](../architecture/01-migration-strategy.md) §6 explicitando os três gatilhos.
  3. Incluir 3 colunas no schema desde o nascimento de `core.fin_documentos`: `numero_documento_original_legado VARCHAR(255) NULL`, `id_legado VARCHAR(64) NULL` (FK lógica, sem FK física — respeitando ADR-0014), `cnpj_emitente VARCHAR(14) NOT NULL`. Índice composto `(cnpj_emitente, numero_documento_original_legado)`.
  4. Validar com contabilidade (fora do corpus técnico) os campos exatos de correlação fiscal — questões Q3 e Q5 da Seção 7. Se forem identificados campos faltantes (chave NF-e 44 dígitos, série, modelo), abre-se ADR novo que **amplia** o ADR-0017 — não substitui — porque os 3 campos básicos continuam válidos.
  5. Registrar entrada no [`CHANGELOG.md`](../CHANGELOG.md).
- **Próximos passos** (caso a banca rejeite a Hipótese D):
  - Reabrir esta inquiry com seção apontando os pontos rejeitados.
  - ADR-0017 é marcado como `Deprecated` (sem Accepted intermediário) e cria-se ADR novo com a hipótese aprovada (B Reporting DB, C Read Model CQRS, ou variante).

## Apêndice B — Referências cruzadas no handbook

- `handbook/reviews/0001-revisao-refatoracao-migracao-segura.md` §1 (achado F1.4 que originou esta inquiry).
- `handbook/architecture/01-migration-strategy.md` §6 (política "não migrar").
- `handbook/architecture/03-data-architecture.md` §2 (usuários e GRANTs, incluindo `readonly_bi`) e §8 (padrões permitidos).
- `handbook/architecture/04-integration-events.md` §6.1 (catálogo atual de eventos cross-fronteira).
- `handbook/architecture/adr/0001-strangler-fig-over-rewrite.md`, `0005-thin-bff-gateway.md`, `0006-modular-monolith-core-api.md`, `0014-mysql-database-isolation.md`, `0015-mysql-outbox-pattern.md`.
- `handbook/inquiries/0010-mysql-engine-correction.md` (precedente metodológico de "lição aprendida").

## Apêndice C — Fundamentação canônica

> Este apêndice consolida as **8 citações literais** extraídas do corpus indexado das ACDG Agent Skills via MCP `acdg-skills` em **4 ondas de busca** realizadas em 2026-05-07. Citações organizadas por **camada da decisão** que sustentam. A regra de citação literal de ≥4 linhas do `CLAUDE.md` é cumprida em todas — paráfrase é proibida.

### C.1 Mecanismo técnico — adicionar colunas hoje sem reader (Fowler/Sadalage, _Refactoring_ p. 68)

> "When I wrote the first edition of this book, I said that refactoring databases was a problem area. But, within a year of the book's publication, that was no longer the case. **My colleague Pramod Sadalage developed an approach to evolutionary database design** [mf-evodb] **and database refactoring** [Ambler & Sadalage] **that is now widely used**. The essence of the technique is to combine the structural changes to a database's schema and access code with data migration scripts that can easily compose to handle large changes.
>
> (...) One difference from regular refactorings is that database changes often are best separated over multiple releases to production. This makes it easy to reverse any change that causes a problem in production. So, when renaming a field, **my first commit would add the new database field but not use it**. I may then set up the updates so they update both old and new fields at once. **I can then gradually move the readers over to the new field. Only once they have all moved to the new field, and I've given a little time for any bugs to show themselves, would I remove the now-unused old field**. This approach to database changes is an example of a general approach of **parallel change [mf-pc] (also called expand-contract)**."
> — *(Linha 2301, p. 68, Martin Fowler, _Refactoring_)*

**Aplicação à Hipótese D:** as 3 colunas de correlação (`numero_documento_original_legado`, `id_legado`, `cnpj_emitente`) são adicionadas desde o nascimento de `core.fin_documentos` **sem readers ainda**. Quando reporting cross-período for decidido (no gatilho), readers passam a usar essas colunas. A "contract" do parallel change clássico **não se aplica aqui** — retenção fiscal de 5+ anos exige que as colunas permaneçam indefinidamente. Variante operacional: **expand-and-preserve**.

### C.2 Tooling de schema migration (Newman, _Building Microservices_ p. 115)

> "There are many tools out there to help you manage the process of changing the schema of a relational database, but most follow the same pattern. **Each schema change is defined in a version-controlled delta script. These scripts are then run in strict order in an idempotent manner.** Rails migrations work in this way, as did DBDeploy, a tool I helped create many years ago.
>
> Nowadays I point people to either **Flyway or Liquibase** to achieve the same outcome, if they don't already have a tool that works in this way."
> — *(Linha 1510, p. 115, Sam Newman, _Building Microservices_)*

**Aplicação à Hipótese D:** confirma que adicionar 3 colunas idempotentes via delta migration script é técnica padrão e barata — alinhado a [ADR-0009](../architecture/adr/0009-node-24-typescript-6-with-7-roadmap.md) (TypeScript) + Drizzle migrations já decidido. Custo operacional XS.

### C.3 Reporting Database como solução-alvo no gatilho (Newman, _Building Microservices_ p. 115)

> "As part of extracting microservices from our monolithic application, we also break apart our databases, as we want to hide access to our internal data storage. By hiding direct access to our databases, we are better able to create stable interfaces, which make independent deployability possible. Unfortunately, this causes us issues when we do have legitimate use cases for accessing data from more than one microservice, or when that data is better made available in a database, rather than via something like a REST API.
>
> With a reporting database, we instead create a dedicated database that is designed for external access, and we make it the responsibility of the microservice to push data from internal storage to the externally accessible reporting database, as seen in Figure 3-8."
> — *(p. 115, Sam Newman, _Building Microservices_)*

**Aplicação à Hipótese D:** Reporting DB é a hipótese-alvo mais provável no gatilho. As 3 colunas de correlação preservadas hoje são pré-requisito para **qualquer** worker que projete `core.fin_documentos` para uma tabela `reporting.documentos_fiscais_unificados`.

### C.4 Read Model Projections + replay (Vernon, _IDDD_ p. 712)

> "(...) Read Model Projections can be realized through a simple set of Domain Event subscribers that are used to generate and update a persistent Read Model. In other words, they project Events to a persistent Read Model. When Event subscribers receive new Events, they calculate some query results and store them in the Read Model for later consumption.
>
> In a nutshell, a Projection is very similar to an Aggregate instance. As Events are received and handled, we use the data from them to build the Projection's state. **Read Model Projections are persisted after each update and can be accessed by many readers, both inside and outside the Bounded Context**."
>
> "Such Read Model Projections are frequently used to expose information to various clients (...), but they are also quite useful for **sharing information between Bounded Contexts and their Aggregates**. (...) **rebuild the Read Models by replaying all Events**."
> — *(Linhas 16133 e 16227, p. 712, Vaughn Vernon, _Implementing Domain-Driven Design_)*

**Aplicação à Hipótese D:** se a hipótese-alvo no gatilho for C (Read Model CQRS) em vez de B (Reporting DB), o replay de eventos é o mecanismo de rebuild — mas isso não dispensa a chave de correlação física no `core.fin_documentos`, porque o legado **não tem eventos** para replay (legado é congelado).

### C.5 Disciplina arquitetural de adiar pattern (Vernon, _IDDD_ p. 166)

> "Architecture Isn't a Coolness Factor
>
> The following architectural styles and patterns are not a grab bag of cool tools we should apply everywhere possible. **Instead, use them only where applicable, where they mitigate a specific risk that would otherwise increase the potential for project or system failure.**
>
> (...) For sure, SaaSOvation did not need every architectural influence all at once, but its teams needed to choose wisely from the options available to them."
> — *(Linha 2652, p. 166, Vaughn Vernon, _Implementing Domain-Driven Design_)*

**Aplicação à Hipótese D:** Vernon transforma "adiar Reporting DB / Read Model CQRS" de "argumento lean fora do corpus" em **dever arquitetural canônico**. Construir B ou C **hoje** seria adicionar arquitetura para risco que ainda não existe.

### C.6 Estratégias de particionamento legado/novo — em PT-BR (Valente §8.4.5)

> "**Particionamento do Banco de Dados** [§8.4.5]
>
> Por último, mas não menos importante, temos que decidir como vamos dividir o banco de dados entre o legado e o novo serviço que pretendemos extrair. Algumas das possíveis soluções de particionamento são apresentadas a seguir.
>
> **Banco de Dados Compartilhado.** (...) **Banco de Dados Dedicado.** (...) As possíveis estratégias de migração de tabelas são as seguintes:
>
> 1. Migrar tabelas de uso exclusivo do novo serviço (...).
> 2. Particionar verticalmente tabelas que são usadas pelo legado e pelo novo serviço. (...)
> 3. Criar uma API no legado para permitir que o novo serviço acesse tabelas que ficaram nesse sistema. (...)
> 4. Replicar tabelas do legado no novo serviço. Essa solução é recomendada para dados que não mudam com frequência (...). A vantagem é que o novo serviço ficará desacoplado do legado no que tange a tais tabelas.
>
> Para concluir, é importante esclarecer que **qualquer esforço de migração, normalmente, inclui uma combinação das soluções descritas acima**."
> — *(Linha 3363, Marco Tulio Valente, _Fundamentos de Manutenção de Software_)*

**Aplicação à Hipótese D:** já estamos em **Banco de Dados Dedicado** (ADR-0014). As 3 colunas de correlação são uma **variação seletiva da estratégia 4** — replicamos chaves estáveis, não tabelas inteiras. Valente autoriza explicitamente combinar estratégias.

### C.7 Strangler Fig + benchmark Netflix 7 anos — em PT-BR (Valente §8.3.2)

> "Quando se trata da descontinuação de um sistema legado, o que funciona melhor é uma migração gradativa. Na verdade, existe um nome para esse padrão de migração gradativa: **Strangler Fig**. Esse padrão, proposto por Martin Fowler, remete a uma variedade de figueira (a árvore que dá figos) que é estranguladora (*strangler fig*). (...)
>
> **Mundo Real:** Um caso conhecido de aplicação do padrão Strangler Fig foi a migração dos sistemas da Netflix de um monolito implementado em Java, executado em servidores próprios, para uma arquitetura de microsserviços rodando na nuvem. A migração começou em 2008 (...). **A descontinuação do monolito foi realizada de forma gradual ao longo de cerca de sete anos**. (...) Em 2016, os últimos servidores usados pela empresa foram desligados, e toda a infraestrutura da Netflix passou a operar na nuvem."
> — *(Linha 3192, Marco Tulio Valente, _Fundamentos de Manutenção de Software_)*

**Aplicação à Hipótese D:** os 12-24 meses estimados em [ADR-0001](../architecture/adr/0001-strangler-fig-over-rewrite.md) são **conservadores** comparados aos 7 anos da Netflix. Coexistência longa não é falha de planejamento — é norma do pattern. As colunas de correlação precisam viver pelo menos esse horizonte.

### C.8 "Integration is always expensive — be sure it is really needed" (Evans, _DDD_ p. 228)

> "(...) The translation is an ANTICORRUPTION LAYER. (...) This isolation will allow us to develop our new application mostly independently of the old one, though we'll have to invest quite a bit in translation. (...)
>
> **A Cautionary Tale**
>
> To protect their frontiers from raids by neighboring nomadic warrior tribes, the early Chinese built the Great Wall. (...) Although China might not have become so distinct a culture without the Great Wall, the Wall's construction was immensely expensive and bankrupted at least one dynasty, probably contributing to its fall. **The benefits of isolation strategies must be balanced against their costs.** (...)
>
> There is overhead involved in any integration (...). **Integration can be very valuable, but it is always expensive. We should be sure it is really needed.**"
> — *(Linha 5052, p. 228, Eric Evans, _Domain-Driven Design_)*

**Aplicação à Hipótese D:** Evans dá **o argumento de fechamento**. Construir Reporting DB ou Read Model CQRS hoje, sem auditor real, sem histórico no `core`, sem demanda concreta, é construir uma Grande Muralha que pode falir uma dinastia. A Hipótese D mantém a opção de integrar (3 colunas), mas não paga o overhead até a integração ser comprovadamente necessária.

---

### C.9 Lacunas explicitamente fora do corpus

Conforme decisão metodológica registrada nesta inquiry e na memória do projeto:

- **Q3** (chave de correlação fiscal específica — `cnpj_emitente + numero_documento_original` é suficiente, ou faltam série, modelo, chave NF-e 44 dígitos?) e **Q5** (latência aceitável para reporting fiscal): tratadas como **questões de negócio**. Validação direta com contabilidade da Bem Comum / Envolve e/ou especialistas em ERPs de mercado (Totvs Datasul, Senior, SAP localizado). **O corpus indexado é de software engineering — não cobre regulação fiscal brasileira.**
- **OWASP AI Exchange (linha 6362)** menciona LGPD por nome em contexto de privacidade em IA, mas **não trata** auditoria fiscal cross-período. LGPD foca em dados pessoais (consentimento, direito de esquecimento, retenção mínima necessária); auditoria fiscal está sob outro regime regulatório (RFB, retenção mínima de 5 anos por obrigação legal — geralmente vence direito de esquecimento por base legal de obrigação regulatória).

---

> 📚 **Resumo da fundamentação:** 8 citações canônicas literais, sendo **2 em PT-BR** (Valente §8.3.2 e §8.4.5) — pode ser apresentada à banca brasileira sem necessidade de tradução. Cobertura completa de Q1 (reformulação B), Q2 e Q4. Q3 e Q5 reconhecidas como fora do corpus.

---

## Apêndice D — Achado empírico do schema legado (adicionado 2026-05-14)

> **Origem:** análise do dump real (`database/.dump/schema-only.sql`, derivado de `Cloud_SQL_Export_2026-04-30 (15_09_35).sql`) e documento mestre [`../domain/10-mapeamento-legado-schema.md`](../domain/10-mapeamento-legado-schema.md). Registrado também em [Inquiry-0014](./0014-schema-legado-vs-modelo-alvo.md) §Q1.

### D.1 O que muda na premissa

A pergunta §7.3 desta inquiry assumia que o legado teria **campos de documento fiscal** que poderiam servir de chave de correlação cross-período (CNPJ emitente + número de documento original, eventualmente complementados por série, modelo, chave NF-e 44 dígitos).

**A análise sistemática das 32 tabelas do dump mostrou que isso não existe.** O domínio do legado é **"fluxo financeiro de obrigações"** (payables, receivables, installments, accounts, bank-reconciliation) — não **"documento fiscal soberano"**.

Concretamente, não há no schema:

- Coluna `chave_nfe` (44 dígitos) em nenhuma tabela
- Coluna `numero_documento_original` ou equivalente
- Coluna `serie` / `modelo` (CT-e, NFS-e, NF-e)
- Coluna `cfop`, `cst`, `regime_tributario`
- Tabela de "documento fiscal" como entidade própria

O conceito de **Fato Gerador** do handbook é **uma adição do modelo alvo, não uma migração**.

### D.2 Impacto em [ADR-0017](../architecture/adr/0017-correlation-keys-cross-period-audit.md)

O ADR-0017 propõe adicionar **3 colunas** em `core.fin_documentos`:

| Coluna proposta | Existe no legado? | Veredito |
| :--- | :--- | :--- |
| `numero_documento_original_legado` | ❌ Não existe campo equivalente | **Inviável como proposto** |
| `id_legado` | ✅ FK simbólica preservável | Viável |
| `cnpj_emitente` | ⚠️ Existe em `suppliers.cnpj` (UNIQUE) — mas não no payable/receivable diretamente | Viável **via join `payables.supplierId → suppliers.cnpj`** |

### D.3 Reformulação proposta (autor)

> 💡 **Hipótese de trabalho do autor — refinamento da Hipótese D:**
>
> Na ausência de chave fiscal natural no legado, a correlação cross-período deve usar **(id_legado + tipo_origem + createdAt_legado)** como tripla simbólica de ligação. A "chave de correlação preservada" passa a ser um identificador surrogate + timestamp de evento de negócio, não uma chave fiscal.
>
> **Consequências:**
>
> 1. O ADR-0017 precisa ser **revisado** (ou superseded por um ADR-0017a). O título mais correto passa a ser **"Chaves simbólicas de correlação cross-período entre `legacy` e `core`"** — não "chaves fiscais".
> 2. A auditoria fiscal cross-período **depende de manter o legado vivo + readonly indefinidamente**. O legado vira o "registro de obrigação histórica" porque é o único lugar onde as obrigações pré-corte existem. O core nasce com Fato Gerador para obrigações pós-corte.
> 3. A política de retenção fiscal de 5 anos passa a ser cumprida pelo **par `legacy` (read-only, snapshot frozen no corte) + `core` (write-active, modelo novo)**, mediados por uma **view materializada** ou Reporting Database (Newman §3.5) que apresenta os dois lados com schema uniforme para o auditor.

### D.4 Achados adjacentes que reforçam a Hipótese D

| Achado do schema | Reforça a Hipótese D porque… |
| :--- | :--- |
| Cardinalidade modesta (`accounts` AUTO_INCREMENT ≈ 6, dump 1.3MB) | Construir Reporting DB hoje sem demanda real é claramente prematuro (Vernon p. 166 + Evans p. 228). |
| Sem outbox no legado | Não há mecanismo nativo para emitir eventos retroativos cross-período. Confirma necessidade de **mediação externa** (worker de projeção) se a banca optar por C ou B. |
| `categorization` como hub analítico (10 FKs) | A "auditoria" do legado é **análise de rateio orçamentário**, não "trilha fiscal". Confirma que a janela de auditoria do legado é diferente da janela de auditoria do core. |
| `receivables.identifierCode` (UNIQUE) | **Único campo do legado que pode servir de chave natural** — sugere que o legado já tinha **algum** identificador externo para receivables (possivelmente código de boleto/fatura). Vale investigar no código. |

### D.5 Pergunta adicional para a banca

> **Q7.7 (nova).** Dada a ausência de campos fiscais no legado, a Hipótese D refinada (id_legado + tipo + createdAt como tripla simbólica, legado preservado read-only como "memória de obrigações pré-corte") continua sendo a recomendação? Ou o achado muda a deliberação para C (Read Model CQRS construído sobre o legado preservado) ou B (Reporting DB com projeção)?

> 📎 **Próximo passo se a banca confirmar a Hipótese D refinada:** revisar [ADR-0017](../architecture/adr/0017-correlation-keys-cross-period-audit.md) renomeando para "chaves simbólicas" e ajustando as 3 colunas; documentar política de "legado read-only frozen" em [`../architecture/01-migration-strategy.md`](../architecture/01-migration-strategy.md); registrar entrada no [`../CHANGELOG.md`](../CHANGELOG.md).
