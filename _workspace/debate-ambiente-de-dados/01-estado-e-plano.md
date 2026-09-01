# Estado medido e plano das frentes

> Medição de 2026-09-01, por varredura do código em `dev` @ `092e3818`, excluindo worktrees.
> Nenhum número aqui é estimado. Onde falta medida, está dito.

## 1. O que o acervo JÁ respondeu — não remedir

Consultado antes de formular qualquer hipótese, conforme `CLAUDE.md` §"Fonte de verdade".

| Inquiry                                                                            | Estado          | O que cobre                                                    | Consequência para este debate                                                                                                                                                            |
| ---------------------------------------------------------------------------------- | --------------- | -------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [0034](../../handbook/inquiries/0034-in-memory-fora-de-local-custo-na-piramide.md) | `decided` 31/08 | in-memory como **ambiente** — fail-fast em toda env (ADR-0068) | A frente F **não** repergunta ambiente. Os 89 fakes de **teste** ficaram, por decisão explícita (alternativa B rejeitada). A fidelidade fake↔banco **não** foi decidida — é o que resta. |
| [0031](../../handbook/inquiries/0031-deadlock-na-reserva-atomica-de-remessa.md)    | `open`          | deadlock 1213 na emissão concorrente de remessa                | A frente E pergunta o **padrão**, não o caso — o caso é dela.                                                                                                                            |
| [0032](../../handbook/inquiries/0032-titulo-remetido-fronteira-do-agregado.md)     | `open`          | hard replace apaga título já remetido; fronteira do agregado   | H-E3 aponta para ela em vez de reabrir.                                                                                                                                                  |
| [0026](../../handbook/inquiries/0026-async-human-in-the-loop-and-drizzle-1-0.md)   | `open`          | Drizzle 1.0                                                    | Medido hoje: 3 de 4 itens fechados; gatilho refinado para duplo (ORM **e** kit em `latest`).                                                                                             |
| [0015](../../handbook/inquiries/0015-charset-drizzle-roadmap.md)                   | `blocked`       | charset/collate por tabela                                     | Upstream. Único item de (b) da 0026 ainda aberto cruza com esta.                                                                                                                         |
| [0014](../../handbook/inquiries/0014-schema-legado-vs-modelo-alvo.md)              | `blocked`       | schema legado vs modelo alvo                                   | A frente G herda o contexto em vez de recomeçar.                                                                                                                                         |

## 2. Números medidos

### Superfície

| Dimensão                                     |        Valor |
| -------------------------------------------- | -----------: |
| Módulos                                      |            8 |
| Tabelas (`mysqlTable`)                       |           67 |
| Colunas declaradas                           |          612 |
| Linhas de definição de schema                |        3.393 |
| `check()`                                    |          134 |
| `index()` / `uniqueIndex()` / `foreignKey()` | 79 / 39 / 26 |
| Variáveis `*_DATABASE_URL`                   |           13 |
| Bancos físicos                               |        **1** |

Por módulo — tabelas / colunas: financial 25/240 · partners 14/173 · auth 9/50 ·
contracts 9/82 · budget-plans 7/49 · programs 2/18 · shared 1/— · notifications 0/0.

### Leitura — 310 de 313 sítios `.from(` classificados

Classificação por varredura da cadeia até o fim do statement (`scratchpad/classify.awk`), não por
amostra. Os 3 não classificados escaparam por quebra de linha do Prettier.

| Categoria                               |  Nº |    % |
| --------------------------------------- | --: | ---: |
| (a) trivial por chave                   | 253 | 81,6 |
| — dos quais com `FOR UPDATE`            |  42 | 13,5 |
| (b) join / agregação de forma fixa      |  38 | 12,3 |
| (c) dinâmica (WHERE variável ou offset) |  19 |  6,1 |

Joins: 44 `innerJoin` + 34 `leftJoin` = 78, em 27 arquivos. **33 deles concentrados em 8 arquivos**
`financial/public-api/*-projection.ts`. `groupBy`: 18, sendo 12 nos mesmos 8 arquivos.

Dinâmicas, por arquivo: `payable-list-view` (4 filtros, 3 consumidores) · `budget-plan-repository`
(5 push) · `contract-repository` (4) · `user-query` (2) · `program-repository` (2).
**Zero ordenação escolhida pelo cliente** — toda `ORDER BY` é fixa.

### Escrita e concorrência

| Dimensão                       |         Valor |
| ------------------------------ | ------------: |
| `insert` / `update` / `delete` | 127 / 61 / 29 |
| `transaction()`                |            56 |
| `for('update')`                |            46 |
| `SKIP LOCKED`                  |            23 |
| `onDuplicateKeyUpdate()`       |            46 |
| `withDeadlockRetry`            |             5 |

### Migração

| Dimensão               |   Valor |
| ---------------------- | ------: |
| Migrations `.sql`      |     124 |
| Reversíveis (`down`)   |   **0** |
| Com DDL destrutivo     |       6 |
| Misturando DML com DDL |       4 |
| Snapshots / journals   | 131 / 7 |

Por módulo: financial 56 · contracts 24 · partners 20 · auth 10 · budget-plans 10 ·
notifications 2 · programs 2.

### Verificação

| Dimensão                       |                      Valor |
| ------------------------------ | -------------------------: |
| Arquivos `.test.ts`            |                        893 |
| Que exigem `MYSQL_INTEGRATION` |                        114 |
| Fakes `.in-memory.ts`          | 89 arquivos / 5.581 linhas |
| Adapters `.drizzle.ts`         |              13.106 linhas |

### Recursos de ORM em uso — o achado que reenquadra tudo

| Recurso                                                          |     Ocorrências |
| ---------------------------------------------------------------- | --------------: |
| `relations()` · `db.query.*` · `._query`                         |       0 · 0 · 0 |
| `defaultNow()` · `onUpdateNow()`                                 |           0 · 0 |
| `DEFAULT CURRENT_TIMESTAMP` nas migrations                       |               0 |
| `.prepare()`                                                     |               0 |
| Window function · CTE recursiva (ambas permitidas pelo ADR-0020) |           0 · 0 |
| `getTableColumns`                                                |               0 |
| `ON DELETE CASCADE`                                              |               2 |
| `deletedAt` (soft delete manual, com `isNull()` explícito)       |              13 |
| `customType`                                                     | 4, em 1 arquivo |

**Leitura:** não há ORM. Há um query builder tipado com schema-as-code. O único benefício de ORM em
uso é a tipagem `schema → query → resultado`.

### Coexistência com o legado

| Dimensão                  |                                         Valor |
| ------------------------- | --------------------------------------------: |
| Referências a `legacy_id` |                                           342 |
| Arquivos de ETL           |                                            38 |
| Stores de ETL             | 3 módulos (partners, budget-plans, financial) |

### Assincronia

3 workers de projeção (`supplier-view`, `payable-view`, `contract-count`), 7 workers no total,
6 grupos de jobs. Outbox por módulo + tabela de progresso por consumidor.

## 3. O sintoma — nomeado em 01/09/2026

Registrado como resposta ao Q0, e **reordena o resto deste documento**.

O dono marcou **três** dores, e deixou uma de fora:

|     | Dor                                                                                                  | Frentes que endereçam         |
| --- | ---------------------------------------------------------------------------------------------------- | ----------------------------- |
| 1   | **Medo de mudar o schema** — alterar coluna é caro e arriscado; deploy de migration dá insegurança   | B, H                          |
| 2   | **Bug recorrente de consistência** — dado errado, projeção atrasada, deadlock, vínculo órfão         | D, E                          |
| 3   | **Atrito para escrever e manter** — verbosidade, fakes duplicando adapters, receio de o teste mentir | A, F                          |
| —   | ~~Lentidão em tela ou relatório~~                                                                    | **descartada explicitamente** |

### A hipótese-síntese que isso produziu — H-Z1

> As três dores não são três problemas. São um só, visto de três ângulos: **o formato de um dado é
> descrito em quatro artefatos independentes, e nada verifica se eles concordam.**

Os quatro: (1) o schema TS — 67 tabelas, 612 colunas, 134 `CHECK`; (2) as 124 migrations SQL
irreversíveis, 4 delas carregando dados; (3) os 89 fakes in-memory, 5.581 linhas que reimplementam a
persistência sem conhecer nenhuma `CHECK`; (4) o domínio, que valida por conta própria.

**Medo de mudar** = quatro artefatos para sincronizar sem rede. **Bug de consistência** = o dado
atravessa um artefato que discorda de outro. **Atrito** = escrever a mesma verdade quatro vezes.
Errar um dos quatro não falha — falha em produção, ou num teste que só roda com
`MYSQL_INTEGRATION=1` e, sem ela, reporta verde.

**Falsificação:** um gate que verifique os quatro entre si deveria reduzir as três dores **juntas**.
Se elas tiverem causas independentes, H-Z1 cai.

## 3b. Lacunas — o que NÃO sabemos

1. ~~**O sintoma.**~~ **Respondido** — ver §3.
2. **Volume e carga.** Zero contagem de linhas, taxa de escrita, concorrência real, `EXPLAIN`.
   ⚠️ **Rebaixada:** era considerada bloqueante; como lentidão não é a dor, virou contexto útil, não
   pré-requisito.
3. **Observabilidade.** Nenhum slow query log analisado, métrica de pool ou tracing citado em código.
4. **Custo de mudança.** Nunca cronometrado quanto leva levar uma coluna nova até produção.
   ⚠️ **Promovida a medição nº 1** — é a dor nº 1 declarada, e é a única que ninguém tentou medir.

## 4. As 8 frentes

| Frente | Tema                                            | Hipóteses | Estado                               |
| ------ | ----------------------------------------------- | --------- | ------------------------------------ |
| A      | Camada de acesso                                | H-A1…A4   | medida                               |
| B      | Schema, migração, fonte da verdade              | H-B1…B3   | medida                               |
| C      | Topologia e fronteira física                    | H-C1…C3   | parcial — falta pool em runtime      |
| D      | Consistência, outbox, read-models               | H-D1…D3   | parcial — falta latência de projeção |
| E      | Concorrência e locking                          | H-E1…E3   | parcial — 0031/0032 abertas          |
| F      | Verificação: fake × banco                       | H-F1…F2   | medida                               |
| G      | Coexistência com o legado                       | H-G1      | superficial                          |
| H      | Operação (deploy de migration, observabilidade) | —         | **não medida**                       |

## 5. Plano da fase 2 — medição com agentes e MCP

**Não executar antes do retorno dos especialistas.** As respostas externas devem calibrar o que vale
medir; medir antes é gastar em pergunta que pode não importar.

**Acesso a banco autorizado:** MySQL do **x99**, via MCP `database`. Não é produção — o volume que
sair dali é indicativo. Produção e homologação **não** foram autorizadas.

### Ordem, reordenada pela resposta ao Q0

> ⚠️ **A ordem anterior deste documento estava errada e fica registrada como tal.** Ela dizia
> _"lacuna de volume primeiro, sem ela A/C/D/E respondem no vácuo"_ — premissa válida só se o
> sintoma fosse performance. Não é. Medir volume primeiro teria sido gastar a primeira rodada na
> pergunta que o dono descartou.

| #   | Mede                                                                  | Quem                                           | Como                                                                                                                                                         | Dor     |
| --- | --------------------------------------------------------------------- | ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------- |
| 1   | **Custo real de mudar o schema**                                      | `database-engineer` (skill)                    | cronometrar o caminho completo de uma coluna nova: schema TS → `db:generate` → adapter → fake → teste → deploy. Contar arquivos tocados e gates atravessados | 1       |
| 2   | **Desalinhamento entre os quatro artefatos** — o teste direto de H-Z1 | `drizzle-orm-expert` + `test-pyramid-engineer` | para as 134 `CHECK`: quantas têm contraparte no domínio? quantas o fake violaria? montar o gate que compara                                                  | 1, 2, 3 |
| 3   | **Schema.sql + lint de migração**                                     | `database-engineer` + Atlas                    | extrair fonte única; rodar `atlas migrate lint` sobre as 124; classificar os 6 DDL destrutivos e os 4 com DML                                                | 1       |
| 4   | **Janela de inconsistência das projeções**                            | `nodejs-runtime-expert`                        | latência real do ciclo dos 3 workers; o que a UI mostra durante a janela                                                                                     | 2       |
| 5   | **Padrões de concorrência**                                           | `mysql-database-expert` + MCP `acdg-skills`    | ODKU × SELECT-FOR-UPDATE; gap lock e o índice do claim; cruzar com 0031/0032                                                                                 | 2       |
| 6   | **Pools em runtime**                                                  | `suporte_infra` + MCP `incus`                  | contar pools abertos na borda HTTP (a dedup não a alcança); conexões no destino                                                                              | 2       |
| 7   | **Volume** (contexto, não pré-requisito)                              | MCP `database` no x99                          | linhas por tabela, cardinalidade, tamanho de índice                                                                                                          | —       |
| 8   | **Perfil do `legacy_id`**                                             | `mysql-database-expert` + acervo 0014          | dependência real das 342 referências                                                                                                                         | 1       |

MCPs úteis: `database` (SQL direto no x99), `incus` (VMs), `acdg-skills` (teoria canônica de banco —
Refman 8.4 + Ramakrishnan indexados; obrigatório antes de decidir lock/isolamento), `aws-docs` (RDS).

### Saída esperada da fase 2

Um veredito por frente, mais o veredito sobre **H-Z1** — que decide se o trabalho é _uma_ correção
estrutural (fonte única verificada) ou _três_ correções independentes. Depois disso, inquiry **0035**
com o ritual completo, e ADR se houver decisão que mude norma.
