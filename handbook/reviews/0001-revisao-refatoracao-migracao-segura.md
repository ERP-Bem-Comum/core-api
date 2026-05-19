# Revisão 0001 — Refatoração & Migração Segura

> **Data:** 2026-05-07
> **Revisor:** Claude (Opus 4.7) via MCP `acdg-skills`
> **Escopo:** Handbook completo (`handbook/**`), com foco em (1) estratégia de migração de DB, (2) topologia & eventos, (3) multi-cloud & infra, (4) governança documental.
> **Metodologia:** cada afirmação técnica é apoiada por **citação literal de ≥4 linhas** dos livros canônicos do corpus ACDG (skills_base), conforme `CLAUDE.md`. Quando não há citação, o trecho é marcado explicitamente como **opinião do revisor**.
> **Status:** _em construção — escrito incrementalmente para resistir a falhas de sessão._

---

## Sumário executivo

_(será preenchido ao final, com top findings e severidade)_

---

## Mapa do handbook avaliado

- `handbook/architecture/` — 5 documentos + 15 ADRs (0001 a 0015)
- `handbook/domain/` — 9 docs financeiro + 7 docs contratos
- `handbook/domain_questions/` — Q&A por bounded context (financeiro e contratos)
- `handbook/inquiries/` — 10 inquéritos (0001 a 0010)
- `handbook/infrastructure/` — 4 docs (handoff, environments, secrets, observability)
- `handbook/guidelines/bradesco_guideline/` — base de conhecimento de integração bancária
- `handbook/operations/`, `handbook/CHANGELOG.md`, `handbook/README.md`

**Sinal de alerta inicial:** existem ADRs para Postgres (0003 shared DB, 0004 outbox) **e** ADRs para MySQL (0013, 0014, 0015) — indica troca de motor de banco no caminho. Inquiry `0010-mysql-engine-correction.md` e `0008-postgres-driver-pg-vs-postgres.md` precisam ser cruzados para entender se os ADRs antigos foram **superseded** corretamente.

---

## 1. Estratégia de migração & dados

### 1.1 Achados

#### F1.1 — Strangler Fig: estratégia bem fundamentada `[LOW]` `[OK]`

`handbook/architecture/01-migration-strategy.md` adota Strangler Fig de Fowler com justificativa explícita contra Big Bang Rewrite e Refactor In-Place. A estratégia está alinhada à literatura canônica:

> "A technique that has seen frequent use during system rewrites is the strangler fig pattern, a term coined by Martin Fowler. Inspired by a type of plant, the pattern describes the process of wrapping an old system with the new system over time, allowing the new system to take over more and more features of the old system incrementally.
>
> The approach as shown in Figure 3-5 is straightforward. You intercept calls to the existing system—in our case the existing monolithic application. If the call to that piece of functionality is implemented in our new microservice architecture, it is redirected to the microservice. If the functionality is still provided by the monolith, the call is allowed to continue to the monolith itself."
> — *(Linha 1430, p. 110, Sam Newman, _Building Microservices_)*

E em PT-BR:

> "Quando se trata da descontinuação de um sistema legado, o que funciona melhor é uma migração gradativa. Na verdade, existe um nome para esse padrão de migração gradativa: **Strangler Fig**. Esse padrão, proposto por Martin Fowler, remete a uma variedade de figueira (a árvore que dá figos) que é estranguladora (*strangler fig*). Essa figueira cresce ao redor de uma árvore hospedeira, envolvendo-a aos poucos. Com o tempo, a árvore hospedeira vai morrendo por estrangulamento, até que reste apenas a figueira."
> — *(Linha 3192, Marco Tulio Valente, _Fundamentos de Manutenção de Software_)*

A topologia descrita (`/api/v1/*` legado, `/api/v2/*` novo, BFF roteando) **materializa exatamente** a interceptação de chamadas que Newman descreve. Sem ressalvas técnicas — o casamento entre handbook e canônico é direto.

#### F1.2 — Migrações isoladas por serviço: alinhado com evolutionary database design `[LOW]` `[OK]`

`03-data-architecture.md` §4 e ADR-0014 §"Migrações" estabelecem que cada serviço gerencia migrações do próprio database (`legacy-api` com TypeORM, `core-api` com drizzle-kit), sem requisito de uniformizar ferramentas. Isso reflete a abordagem canônica:

> "When I wrote the first edition of this book, I said that refactoring databases was a problem area. But, within a year of the book's publication, that was no longer the case. My colleague Pramod Sadalage developed an approach to evolutionary database design [mf-evodb] and database refactoring [Ambler & Sadalage] that is now widely used. The essence of the technique is to combine the structural changes to a database's schema and access code with data migration scripts that can easily compose to handle large changes."
> — *(Linha 2301, p. 68, Martin Fowler, _Refactoring_)*

A decisão do handbook de tratar database refactoring como prática comum (cada serviço dono do schema, migrations versionadas, sem janela de manutenção forçada) é exatamente o terreno onde a literatura de Sadalage opera.

#### F1.3 — Outbox Pattern: alinhamento conceitual sem citação literal canônica `[LOW]` `[INCOMPLETO]`

ADR-0015 e `04-integration-events.md` adotam o Outbox Pattern com referência a [microservices.io](https://microservices.io/patterns/data/transactional-outbox.html) (Chris Richardson). **O corpus canônico ACDG indexado não retornou trecho literal de ≥4 linhas tratando "Transactional Outbox Pattern" diretamente** — buscas por "transactional outbox", "dual write", "outbox database event" trouxeram resultados tangenciais (Newman discute event emission e ACID, mas não outbox por nome).

> Sobre o Outbox especificamente, **não tenho citação dos livros que uso** — o handbook está apoiado em fonte web reconhecida (microservices.io de Richardson), mas a regra de citação ≥4 linhas do corpus interno não é satisfeita. **Posso comentar como opinião:** o desenho técnico no ADR-0015 (transação ACID para atomicidade entre estado de domínio e linha da outbox; índice composto em `(processed_at, occurred_at)` substituindo partial index do PG; `FOR UPDATE SKIP LOCKED` em MySQL 8) está tecnicamente correto e cobre os modos de falha clássicos de dual-write. Mas isso é juízo do revisor, não chancela canônica do corpus.

**Recomendação `[LOW]`:** se a equipe quiser apoio canônico explícito para Outbox, ampliar a fonte (Richardson — _Microservices Patterns_, ou Hohpe & Woolf — _Enterprise Integration Patterns_). Não é bloqueador.

#### F1.4 — Política "não migrar dados históricos": pragmática mas sem ancoragem canônica explícita `[MEDIUM]` `[OPINIÃO]`

`01-migration-strategy.md` §6 estabelece que dados financeiros históricos ficam **congelados** em `legacy.*` e o `core.*` cresce do zero. A justificativa é operacional ("risco operacional alto sem ganho proporcional").

**Não tenho citação dos livros que uso** que afirme literalmente "não migrar dados históricos durante strangler fig". A literatura disponível (Newman, Valente) discute migração incremental de **funcionalidade**, não estabelece doutrina sobre dados históricos.

**Opinião do revisor (não canônica):** a decisão é defensável e comum em ERPs financeiros brasileiros, mas tem **três riscos** que o documento não trata explicitamente:

1. **Auditoria fiscal cross-período** — se o fisco solicitar análise que cruze "passado legacy + presente core", não há query única; é necessário consolidar via BI ou ETL ad-hoc. A seção §6 não menciona esse cenário operacional. → **Aprofundado em [Inquiry-0011](../inquiries/0011-auditoria-fiscal-cross-periodo.md)** com 4 hipóteses fundamentadas (readonly_bi, Reporting Database canônico, Read Model CQRS, adiar com gatilho), em formato de email para deliberação da banca/squad.
2. **Conciliação de títulos legados em aberto na data de corte** — quando o BC Títulos migrar (M4), títulos com vencimentos futuros nascidos no legado vão para `legacy.titulos` com fluxo separado dos novos em `core.fin_titulos`. O `01-migration-strategy.md` §5 só menciona "raro; evitar" para telas em transição, mas dois fluxos para títulos do mesmo cliente é cenário garantido durante M3-M5.
3. **M5 ("Legado desligado")** — se o legado for desligado mas seus dados precisarem permanecer consultáveis (5 anos de retenção fiscal — ver `03-data-architecture.md` §6), `legacy-api` precisa continuar de pé só para leitura, ou os dados precisam migrar para `core` (contradizendo §6). O documento não explicita o modo "legacy zumbi read-only".

**Recomendação `[MEDIUM]`:** adicionar à §6 (ou criar §6.1) um parágrafo sobre "regime do legado pós-M5" — se vai ficar como serviço read-only ou se haverá migração final de dados (com ADR próprio). Sem isso, M5 tem definição vaga.

#### F1.5 — Long-Term Refactoring & Branch By Abstraction: princípios canônicos pertinentes ao Strangler Fig `[LOW]` `[OK]` `[OPORTUNIDADE]`

A migração descrita no handbook dura 6+ meses (de M0 a M5, conservadoramente 12-18 meses). Isso é **long-term refactoring** no sentido literal de Fowler:

> "Most refactoring can be completed within a few minutes-hours at most. But there are some larger refactoring efforts that can take a team weeks to complete. Perhaps they need to replace an existing library with a new one. Or pull some section of code out into a component that they can share with another team. Or fix some nasty mess of dependencies that they had allowed to build up.
>
> Even in such cases, I'm reluctant to have a team do dedicated refactoring. Often, a useful strategy is to agree to gradually work on the problem over the course of the next few weeks. Whenever anyone goes near any code that's in the refactoring zone, they move it a little way in the direction they want to improve. This takes advantage of the fact that refactoring doesn't break the code—each small change leaves everything in a still-working state. To change from one library to another, start by introducing a new abstraction that can act as an interface to either library. Once the calling code uses this abstraction, it's much easier to switch one library for another. (This tactic is called Branch By Abstraction [mf-bba].)"
> — *(Linha 2193, p. 61, Martin Fowler, _Refactoring_)*

**Casamento com o handbook:**
- A regra "um BC end-to-end em produção antes de iniciar o próximo" (`01-migration-strategy.md` §4) honra o princípio de "each small change leaves everything in a still-working state".
- O BFF que roteia `/api/v1/*` ↔ `/api/v2/*` (§5) **é** uma "abstraction that can act as an interface to either library" — Branch By Abstraction aplicado em nível de roteamento HTTP.

**Oportunidade `[LOW]`:** o handbook não nomeia explicitamente Branch By Abstraction nem cita Fowler nesse capítulo. Adicionar uma menção em `01-migration-strategy.md` §5 ("Fronteira Entre Legado e Novo") deixaria a ancoragem canônica explícita para quem entrar no projeto novo. Não é problema — é polimento documental.

#### F1.6 — Critério de rollback de BC migrado: existe mas é raso `[MEDIUM]` `[OMISSÃO]`

`01-migration-strategy.md` §8 lista como critério de "BC Migrado":

> "4. ✅ Rollback documentado e testado (procedimento de voltar para o legado)."

A linha existe, mas o documento **não responde** três perguntas operacionais que o rollback impõe num cenário Strangler Fig com Outbox:

1. **Estado dos dados gerados em `core.*` durante a janela em que o BC novo estava em produção** — se o BC Bradesco rodou 3 semanas em produção gerando `core.fin_remessas_cnab`, e depois foi rollback'd, esses registros (a) ficam congelados em `core.*`, (b) são re-emitidos como eventos para o legacy reconstruir estado, ou (c) são descartados? Cada opção tem implicação fiscal/auditoria distinta.
2. **Estado da outbox no momento do rollback** — eventos `RetornoCnabProcessado` ainda não consumidos pelo `legacy-api` no instante do rollback: são deixados na `core.outbox`, ou re-aplicados manualmente, ou ignorados?
3. **Caminho reverso de migrações** — `drizzle-kit` gera migrations forward; o handbook não menciona se cada migration nasce com seu reverso (down) testado, sem o que rollback de schema fica artesanal.

**Por que isso é `[MEDIUM]`:** rollback é o tipo de procedimento que só vai ser exercitado em incidente — quando ninguém tem tempo de inferir a resposta. As três perguntas precisam ter respostas escritas **antes** de M1 entrar em produção.

**Recomendação:** expandir §8 critério 4 para um sub-checklist que inclua: (a) destino dos dados pós-rollback, (b) tratamento da outbox no momento, (c) presença obrigatória de `down` testado em cada migration de schema do `core-api`.

### 1.2 Citações canônicas usadas

| ID | Fonte | Linha | Assunto |
|---|---|---|---|
| C1 | Sam Newman, _Building Microservices_ | 1430 | Strangler Fig Pattern |
| C2 | Marco Tulio Valente, _Fundamentos de Manutenção de Software_ | 3192 | Strangler Fig (PT-BR) |
| C3 | Martin Fowler, _Refactoring_ | 2301 | Evolutionary Database Design |
| C4 | Martin Fowler, _Refactoring_ | 2193 | Long-Term Refactoring + Branch By Abstraction |

### 1.3 Resumo do Foco 1

| Achado | Severidade | Tipo |
|---|---|---|
| F1.1 Strangler Fig bem fundamentado | LOW | OK |
| F1.2 Migrações isoladas alinhadas com evolutionary DB design | LOW | OK |
| F1.3 Outbox sem citação canônica do corpus indexado | LOW | INCOMPLETO |
| F1.4 Política "não migrar histórico" sem ancoragem nem regime pós-M5 | MEDIUM | OPINIÃO/OMISSÃO |
| F1.5 Branch By Abstraction implícito mas não nomeado | LOW | OPORTUNIDADE |
| F1.6 Rollback de BC migrado raso | MEDIUM | OMISSÃO |



---

## 2. Topologia & eventos de integração

### 2.1 Achados

#### F2.1 — Resíduos de PostgreSQL em `02-system-topology.md` §2.4 `[HIGH]` `[INCONSISTENTE]` `[RESOLVIDO 2026-05-07]`

A seção §2.4 ("MySQL 8") tem o header correto, mas a tabela ainda traz dados da assunção antiga:

```
| Versão | 15+ (managed) |       ← versão é de PostgreSQL, não MySQL
| Auditoria | `pgaudit` em prod | ← pgaudit é extensão exclusiva do PostgreSQL
```

E a referência ao final da §2.4 aponta para `ADR-0003` (que está **Superseded by ADR-0014**) sem mencionar a versão vigente:

> "Detalhamento em [03-data-architecture.md](./03-data-architecture.md). Decisão em [ADR-0003](./adr/0003-shared-db-isolated-schemas.md)."

Isso contradiz diretamente:
- `ADR-0013` ("MySQL 8, preferencialmente 8.4 LTS")
- `ADR-0014` (decisão vigente sobre isolamento por database em MySQL)
- `03-data-architecture.md` §6 ("MySQL exige plugin específico ou feature do provedor cloud (RDS Database Activity Streams na AWS, Cloud SQL Audit Logs no GCP)")
- `Inquiry-0010` §6 que listou `architecture/02-system-topology.md` como atualizado — **a atualização ficou parcial**.

**Recomendação `[HIGH]`:**
1. Trocar "Versão | 15+ (managed)" por "Versão | 8.4 LTS (managed: RDS / Cloud SQL)".
2. Trocar "Auditoria | `pgaudit` em prod" por "Auditoria | RDS Database Activity Streams / Cloud SQL Audit Logs / MySQL Enterprise Audit (definir com Codebit)".
3. Atualizar o link ao final de §2.4 para apontar para ADR-0014 (vigente), mantendo ADR-0003 só como nota histórica.

> **Por que `[HIGH]`:** quem entrar no projeto agora e ler `02-system-topology.md` vai instalar `pgaudit` e quebrar o setup. É exatamente o tipo de contradição interna que o `Inquiry-0010` §7 ("Lição aprendida") jurou eliminar.

> **Aplicado em 2026-05-07:** corrigida tabela §2.4 (versão, estrutura, backup, auditoria, link para ADR vigente). Adicionalmente — fora do escopo original do achado mas alinhado com ele — corrigidos 3 resíduos terminológicos no mesmo arquivo (§3.1 "schema core" → "database core"; §4 princípios 2 e 4 "schema"→"database") para alinhar com a terminologia de ADR-0014.

#### F2.2 — Inconsistência menor entre ADR-0001 e `01-migration-strategy.md` em ETA `[LOW]` `[INCONSISTENTE]`

ADR-0001 §"Consequências/Negativas" afirma:

> "Migração total leva 12-24 meses, não 3-6."

`01-migration-strategy.md` §7 (Marcos) tem ETAs conservadoras que somam ~7-13 meses (M0+M1+M2+M3+M4+M5: 2 sem + 6-10 sem + 4 sem + 8-12 sem + 6-10 sem + 3-6 meses).

A diferença não é absurda (ADR-0001 é mais conservador, considerando atrasos), mas o handbook não explicita a relação. Recomendação: nota em §7 dizendo "ETAs conservadores; ADR-0001 estima janela total de 12-24 meses considerando coexistência prolongada".

#### F2.3 — Topologia bem alinhada com Strangler Fig + Modular Monolith `[LOW]` `[OK]`

O diagrama em §1 mostra corretamente:
- `bff-gateway` como ponto de interceptação por prefixo (`/api/v1/*` → legacy, `/api/v2/*` → core)
- `core-api` como Modular Monolith com módulos Financeiro/Contratos
- MySQL com dois databases isolados
- Eventos cross-fronteira via outbox

Os princípios invioláveis em §4 (BFF nunca toca DB; cada serviço só escreve no próprio schema; toda comunicação cross-BC via evento; sem joins cross-schema; falha de um não derruba outro) são consistentes entre si e com ADRs 0001, 0005, 0006, 0014, 0015.

#### F2.4 — BFF burro: decisão chancelada por Newman `[LOW]` `[OK]`

ADR-0005 estabelece um BFF gateway "burro" (200-300 linhas, 0 regra de negócio, 0 composição, 0 tradução v1↔v2). O alerta de Newman é literal:

> "For a solution owned by a single team, where one team develops the user interface and the backend microservices, I would be OK with having a single central aggregating gateway. That said, this team sounds like it is doing a LOT of work—in such situations, I tend to see a large degree of conformity across the user interfaces, which often removes the need for these aggregation points in the first place.
>
> If you do decide to adopt a single central aggregating gateway, please be careful to limit what functionality you put inside it. I'd be extremely wary of pushing this functionality into a more generic API gateway product, for example, for reasons outlined previously.
>
> The concept of doing some form of call filtering and aggregation on the backend can be really important, though, in terms of optimizing the user's experience of our user interfaces. The issue is that in a delivery organization with multiple teams, a central gateway can lead to requirements for lots of coordination among those teams."
> — *(Linha 7671, p. 588, Sam Newman, _Building Microservices_)*

A decisão do ADR-0005 (single team, gateway central, mas com restrições explícitas em §"Restrições Explícitas Para Resistir à Tentação") executa exatamente o "please be careful to limit what functionality you put inside it" de Newman. A lista de "NÃO faz" no ADR-0005 é o operacional dessa restrição.

**Observação `[LOW]`:** ADR-0005 não cita Newman explicitamente. Adicionar uma referência no §"Referências" reforçaria a ancoragem canônica para revisores futuros.



---

## 3. Multi-cloud & infraestrutura

_(em revisão — pendente)_

### 3.1 Achados
### 3.2 Citações canônicas relevantes

---

## 4. Governança documental

_(em revisão — pendente)_

### 4.1 Achados
### 4.2 Citações canônicas relevantes

---

## Apêndice A — Convenções desta revisão

- **Severidade dos achados:**
  - `[BLOCKER]` impede progresso seguro até resolver
  - `[HIGH]` risco material em produção/operação
  - `[MEDIUM]` débito que crescerá se ignorado
  - `[LOW]` polimento, consistência, clareza
- **Tipo do achado:**
  - `[CONTRA-CANON]` contradiz literatura canônica citada
  - `[INCONSISTENTE]` contradiz outro documento do próprio handbook
  - `[OMISSÃO]` falta um item esperado pela literatura
  - `[OPINIÃO]` julgamento do revisor sem chancela canônica

## Apêndice B — Histórico de chamadas MCP

_(será logado ao final, para rastreabilidade)_
