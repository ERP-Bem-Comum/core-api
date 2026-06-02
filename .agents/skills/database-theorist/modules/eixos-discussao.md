# Eixos de Discussão Teórica

Identifique em qual eixo o usuário está e responda no registro adequado.

---

## Eixo 1 — Ratio legis das regras

"Por que essa regra existe?"

- **Por que normalizar até 3NF/BCNF?** → Prevenir anomalias de inserção/atualização/exclusão. Ramakrishnan formaliza via dependência funcional. Mas: existe trade-off contra performance de leitura (junções) — daí a discussão "vale 3NF sempre?" no Eixo 3.
- **Por que ACID e não "best effort"?** → Transações multi-passo precisam de garantia atômica para o usuário **raciocinar** sobre o estado. Sem A, você programa defensivamente em todo lugar. Sem D, perde dado em crash. Cite os 4 pilares com Ramakrishnan, depois mostre como InnoDB materializa cada um (refman 17.2).
- **Por que existem 4 níveis de isolamento e não só "Serializable"?** → Custo. Serializable garante tudo, mas degrada throughput. SQL standard expõe os 4 para o usuário escolher onde aceita anomalia.
- **Por que B-tree e não hash em todo lugar?** → B-tree suporta range queries (`WHERE x BETWEEN`); hash não. Por isso B-tree é default e hash é especializado.
- **Por que chave primária precisa ser NOT NULL?** → Definição matemática de relação não admite tuplas indistinguíveis; NULL não é valor, é ausência. Codd brigou com isso a vida toda.
- **Por que SQL é declarativo?** → Independência física: o usuário descreve **o que** quer, o otimizador escolhe **como**. Permite trocar plano sem reescrever query. Ramakrishnan defende esta abstração extensivamente.

Sempre cite o trecho do livro que sustenta o "por quê". Ramakrishnan tem o argumento; o refman tem a materialização.

---

## Eixo 2 — Comparações entre paradigmas e escolas

- **Relacional vs Documento (Mongo, DynamoDB).** Documento favorece denormalização e leitura rápida de agregados; relacional favorece consistência multi-entidade e queries ad-hoc. Não é "qual é melhor" — é qual carga você tem.
- **Relacional vs Grafo (Neo4j).** Grafo brilha quando o **relacionamento** é a entidade principal (recomendação, fraude, redes sociais) e queries são travessias multi-hop. SQL com `JOIN` recursivo (CTE) atende casos simples; grafo nativo paga conforme profundidade.
- **Relacional vs Columnar (BigQuery, Redshift, Parquet).** Columnar varre poucas colunas em muitas linhas — ideal pra OLAP. Row-store (Postgres, MySQL) varre muitas colunas de poucas linhas — ideal pra OLTP. Daí o split OLTP/OLAP que data warehouses formalizaram.
- **ACID vs BASE.** ACID = transações fortes, foco em consistência imediata. BASE = "Basically Available, Soft state, Eventual consistency" — surgiu pra justificar NoSQL pré-CAP. Hoje considerado falsa dicotomia: muitos NoSQL fazem ACID intra-shard; muitos relacionais fazem replicação eventual.
- **CAP vs PACELC.** CAP (Brewer 2000): em partição, escolha entre Consistência e Disponibilidade. PACELC (Abadi 2010): se Particionado, escolha CA; **Else** (operação normal), escolha entre Latência e Consistência. PACELC é mais útil pra discutir sistemas reais.
- **MySQL vs PostgreSQL (debates típicos).** MVCC: ambos têm, mas implementação difere — Postgres mantém versões antigas até VACUUM; InnoDB mantém em rollback segments. Tipos: Postgres tem JSON nativo + arrays + UUID + tipos custom; MySQL chegou tarde nessa frente. Replicação: MySQL nativo simples; Postgres mais flexível (lógica + física). Sem o livro debatendo, sinalize "comparação externa, sem citação canônica".
- **Codd vs Date (filosóficos).** Codd codificou o modelo; Date radicalizou a defesa contra NULLs e a favor de domínios fortes. Date publicou anti-NULL ferozmente; Codd era mais brando. Essa diferença historicamente impactou SQL: NULLs ficaram, Date nunca aceitou.

Prefira citar Ramakrishnan falando do paradigma comparado. Para NoSQL/CAP (que não estão centralmente nele), sinalize "comparação externa".

---

## Eixo 3 — Crítica e history of ideas

- **O que envelheceu?** Visão de "um SGBD pra tudo" (Stonebraker já enterrou em 2005: "One Size Fits All: An Idea Whose Time Has Come and Gone"). Catálogos centralizados. Replicação síncrona em larga escala. Otimizadores cost-based confiando em estatísticas estáticas.
- **O que continua atual?** Modelo relacional como contrato lógico, ACID como ferramenta de raciocínio, normalização como guia (não dogma), índice B-tree como estrutura de leitura.
- **O renascimento do SQL.** NoSQL crescelu 2009-2015; depois NewSQL (Spanner, CockroachDB, TiDB, YugabyteDB) trouxe SQL+ACID em escala distribuída. Lição: a abstração relacional é tão valiosa que a indústria pagou pra recuperar.
- **HTAP (Hybrid Transactional/Analytical).** Tendência de unificar OLTP+OLAP no mesmo sistema (TiDB, SingleStore, Snowflake Hybrid Tables). Re-questiona o split data warehouse vs OLTP que firmou nos anos 90.
- **Onde a comunidade saiu da rota?** "Sempre normalize" (não — depende da carga); "NoSQL escala melhor" (errado — escala diferente, nem sempre melhor); "ORM resolve modelagem" (não — esconde decisões); "índice resolve query lenta" (não — pode piorar se mal posto).
- **Discordâncias entre Ramakrishnan e a indústria.** Livro defende otimização baseada em custo com estatísticas — refman MySQL mostra o quanto disso é frágil na prática (`ANALYZE TABLE` manual, hints de query, `STRAIGHT_JOIN`).

---

## Como decidir o eixo

- Pergunta começa com "por que" → Eixo 1.
- Pergunta tem "vs", "comparado a", "diferença entre" → Eixo 2.
- Pergunta tem "ainda faz sentido?", "envelheceu?", "moderno?", "tendência" → Eixo 3.
