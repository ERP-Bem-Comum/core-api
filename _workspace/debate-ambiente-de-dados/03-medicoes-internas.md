# Medições internas — fase 2

> Disparadas em 2026-09-01, depois de o dono nomear o sintoma (§3 de `01-estado-e-plano.md`).
> Duas medições, em paralelo, ambas independentes da consulta externa.

## Medição 2 · desalinhamento entre os artefatos — **CONCLUÍDA**

Agente `general-purpose`, read-only, sobre `dev` @ `092e3818`, excluindo `.claude/worktrees/`.

### Linha de base confirmada pelo agente

**134 `check()`** — financial 59, partners 24, contracts 23, auth 13, budget-plans 9, programs 5,
shared 1. **67 `mysqlTable`**, **89 fakes** (5.581 linhas), **124 migrations**.

> Nuance de contagem: as migrations contêm **201** statements de `CHECK`, porque constraint
> redefinida conta duas vezes. Os 134 são as constraints vivas no schema; os 201 são statements
> históricos. Citar o número errado inverte conclusão.

### Q-A · schema × domínio

Critério declarado antes de contar — é o que torna a tabela auditável: **(c)** = o domínio expressa
a mesma regra e não aceita nada que o banco recuse (o domínio _pode_ ser mais estrito — isso é
defesa em profundidade, não drift); **(d)** = existe valor que um aceita e o outro recusa **na
direção que produz defeito**; **(a)** = nenhum artefato do domínio expressa a regra.

| Balde                          |                                          Nº |    % |
| ------------------------------ | ------------------------------------------: | ---: |
| (a) só no banco                |                                      **12** |  9,0 |
| (b) só no domínio, sem `CHECK` | **≥ 16 regras** (piso declarado, não total) |    — |
| (c) nos dois, concordando      |                                     **121** | 90,3 |
| (d) nos dois, divergindo       |                                       **1** |  0,7 |

**Por que (c) é tão alto:** o domínio faz o trabalho pesado. `Money.fromCents`, recusando negativo e
não-inteiro, sozinho torna corretas 13 `CHECK`. `Nsa`, `ExerciseMonth`, `SourceFileRef`,
`Retention`, `RefreshToken` e as unions discriminadas de `Contract`/`Amendment` fecham quase o
resto.

**Os 12 do balde (a), destrinchados:** 9 são `*_attempts_nonneg_chk` — contador de infra do
outbox/DLQ/`eventos_processados`, sem agregado de domínio, e o código só escreve `0` ou incrementa:
**risco inerte**. **3 são de risco vivo:**

| `CHECK`                               | O que o banco exige                | O que o domínio permite                                           |
| ------------------------------------- | ---------------------------------- | ----------------------------------------------------------------- |
| `fin_payables_paid_at_chk`            | `status='Paid' ⇒ paid_at NOT NULL` | `Payable` tem os dois campos independentes, sem smart constructor |
| `fin_payable_view_retention_type_chk` | 4 literais                         | `PayableView.retentionType` é `string \| null`                    |
| `fin_documents_version_chk`           | não-negativo                       | `version: number` cru                                             |

O primeiro já está documentado por escrito no próprio repositório:
`tests/modules/financial/adapters/persistence/remittance-repository.drizzle-mysql.test.ts:771` —
_"O fake in-memory **aceita** o estado sem data"_.

### Q-B · os fakes respeitam alguma `CHECK`?

**0 de 12 fakes amostrados.** Amostra: 1–2 por módulo com tabela (6 dos 7; `notifications` tem
schema de 16 linhas sem `CHECK`, `reports` não tem schema próprio), priorizando a tabela com mais
`CHECK` e/ou o bicondicional mais interessante.

O que os fakes espelham, quando espelham: **UNIQUE** (4 de 12) e optimistic lock (2) — nunca uma
regra de valor. O único que raciocina sobre paridade com o banco
(`payable-view-store.in-memory.ts:11-13`) espelha o **guard de recência por `occurred_at`** do
adapter, isto é, lógica de adapter, não constraint.

#### O achado que reformula o problema

> **Os fakes não estão "esquecendo" de espelhar a tabela — implementam corretamente um contrato que
> nunca mencionou a tabela.**

O fake implementa o **port**, cuja assinatura é feita de tipos de domínio. As 4 restrições que ele
respeita são exatamente aquelas que alguém **promoveu ao contrato** como literal de erro —
`err('supplier-cnpj-duplicate')`, `err('collaborator-cpf-duplicate')`. **Nenhuma das 134 `CHECK` tem
literal de erro em port algum.** Onde a regra entrou no port, o fake a espelhou sozinho.

Não é discordância entre artefatos — é **ausência de representação**. No eixo schema × domínio os
dois falam da mesma coisa e por isso são comparáveis; no eixo fake × banco o fake **não tem
vocabulário para a regra**.

### Q-C · existe gate comparando os artefatos?

**Zero**, nas 44 suítes de `tests/cleanup/` e nos 14 hooks de `.claude/hooks/`.

Um parcial, num eixo só: `tests/cleanup/outbox-aggregate-types-in-check.test.ts` compara constante
TS do schema × `.sql` da migration (perguntando ao `git ls-files`, não ao disco), para **2 das 134**
(`fin_outbox_aggregate_type_chk`, `fin_outbox_dl_aggregate_type_chk`), só no financial — **1,5%**.
Não olha domínio nem fake, e o próprio docblock delimita o buraco: _"o que eles NÃO alcançam é
'listei, mas não rodei `db:generate`'"_.

Adjacentes que não são comparação de conteúdo: `partners-soft-delete-coherence.test.ts` compara
schema × schema (existência, não conteúdo, só em partners); e quatro testes de módulo
(`auth/.../role-status-schema.test.ts`, `auth/.../schema-hardening.test.ts`,
`contracts/.../schemas/mysql.test.ts`, `contracts/.../migrations/mysql.test.ts`) asseguram a `CHECK`
**pelo nome** — `assert.match(sql, /auth_role_status_chk/i)` não sabe o que há dentro dos parênteses.

### Q-D · quantas `CHECK` têm prova de rejeição?

**10 de 134 — 7,5%.** As outras **124 nunca foram exercitadas contra banco algum.**

As 10: `ctr_outbox_attempts_nonneg_chk`, `ctr_outbox_aggregate_type_chk`,
`ctr_outbox_dlq_aggregate_type_chk`, `ctr_contracts_ended_at_consistency_chk`,
`ctr_amendments_homologation_completeness_chk`, `fin_payables_paid_at_chk`,
`fin_outbox_event_type_nonempty_chk`, `fin_statement_transactions_entry_type_chk`,
`ck_fin_tl_event_type`, `fin_van_return_quarantine_reason_chk`.

Duas assimetrias que o percentual esconde:

1. Vivem em **2 módulos** — contracts 5, financial 5. **auth, partners, budget-plans, programs e
   shared têm zero: 52 `CHECK` sem uma prova.**
2. Todas rodam só na fatia de integração, que é minoria da suíte.

> **Divergência de contagem, resolvida.** O agente reportou 118 arquivos com `MYSQL_INTEGRATION`;
> esta mesa mediu 114. Causa: **118** = `grep -rl`, que conta quem apenas _menciona_ a variável
> (helper de `tests/support/`, comentário); **114** = os que de fato rodam sob ela. **114 é o
> critério correto.** A diferença 894 × 893 no total de `.test.ts` não foi explicada — provável
> disco × `git ls-files`, e não vale um turno.

### Veredito

**H-Z1 está derrubada no eixo em que foi enunciada.** "Quatro artefatos que discordam sobre o
formato de um dado" **não é o que este repositório é**: schema e domínio concordam em 121 de 134, e
divergem em 1.

O desalinhamento real está num eixo que a hipótese não mencionava, e nele é total.

> **H-Z2** — Toda restrição de dado que vive só na `CHECK` é **invisível ao contrato do port**; o
> fake é fiel ao port e portanto aceita o estado que o banco reverte; e como a maior parte da suíte
> roda contra fakes, **o verde não é evidência sobre nenhuma dessas regras**.
>
> **Falsificável:** existe alguma das 134 `CHECK` cuja violação seja recusada pelo fake, ou expressa
> como literal de erro do port? Medido: **0 de 12** na amostra. **Um único contraexemplo derruba.**

**O que muda de alvo:** o problema não é a `CHECK` divergir do domínio — é ela **não ter contraparte
no port**. Corrigir não é escrever mais `CHECK`; é **promover a regra a literal de erro do port**,
onde fake e adapter Drizzle passam a ser cobrados pela mesma assinatura. Isso é a mesma propriedade
que `.claude/rules/adapters.md` já exige — erro visível na assinatura.

**Gate que testaria H-Z2:** um `tests/cleanup/*` que, para cada `check()` do schema, exija ou um
literal de erro correspondente no port da tabela, ou entrada numa **allowlist justificada**.
Asserção de **propriedade** ("toda `CHECK` tem contraparte no contrato"), nunca de contagem — e que
comece com a allowlist cheia, esvaziando por fatia, como `integration-rerun-safety.test.ts` já fez.

---

## Medição 1 · custo real de mudar o schema — **EM CURSO**

Agente `drizzle-orm-expert`, em worktree isolada descartável. Bateu o limite de 60 turnos no
cenário A e foi retomado com prioridade invertida: laudo acima de gate verde.

Parcial registrado: a cascata inicial parou em **2 arquivos**. Se o número final ficar nessa ordem,
**empurra contra a dor nº 1 declarada** — e essa é a razão de a medição existir.

### Resultado — experimento real, não estimativa

Tabela: `prg_programs` (módulo `programs`) — tem os quatro artefatos, não é `financial` nem outbox,
e é o menor módulo com repo Drizzle + fake + mapper + 4 read-models. Piso honesto, sem distorção de
tamanho.

| Métrica                      | Baseline             | **A** — nullable                                           | **B** — `NOT NULL` + `CHECK`                                             |
| ---------------------------- | -------------------- | ---------------------------------------------------------- | ------------------------------------------------------------------------ |
| Arquivos editados à mão      | 0                    | **1** (só o schema)                                        | **4** + 1 VO novo                                                        |
| Arquivos gerados             | 0                    | 3 (`.sql`, snapshot, journal)                              | 3                                                                        |
| `typecheck`                  | 8,95 s ✅            | 8,91 s ✅ **0 erros**                                      | 8,57 s ❌ 1 erro → 9,38 s ✅                                             |
| `lint`                       | 33,25 s ✅           | 4,41 s ✅                                                  | 4,34 s ✅                                                                |
| `format:check`               | 12,10 s ✅           | 11,62 s ❌ **falhou**                                      | (mesma causa)                                                            |
| `test`                       | 115,66 s ✅ 11.478/0 | 111,21 s ✅ **11.478/0**                                   | 118,17 s ✅ **11.478/0**                                                 |
| Erros que o compilador pegou | —                    | **0**                                                      | 2 arquivos, em duas ondas                                                |
| Erros que **nada** pegou     | —                    | coluna órfã do domínio, do mapper, do fake e de todo teste | `CHECK` invisível ao fake; backfill não avisado; literal chumbado aceito |
| Tempo de parede              | 169,96 s             | **149,46 s**                                               | **184,23 s**                                                             |

Total do experimento: **503,65 s** de gate.

### Os cinco achados

1. **A cascata não explode — para em 2 arquivos.** No cenário caro o compilador apontou
   `domain/program/program.ts` e `mappers/program.mapper.ts`, e mais nada. O `update` escapa por
   usar spread; os 4 read-models, os 8 use-cases e os 29 arquivos de teste do módulo não foram
   tocados.
2. **No cenário A o compilador não exigiu nada. Zero.** Coluna nullable no schema, `typecheck`
   verde, `lint` verde, **11.478 testes verdes** — com uma coluna que não existe no domínio, não é
   escrita pelo mapper e não é lida por ninguém. **O custo não é alto: é invisível, que é pior.**
3. **O fake é estruturalmente incapaz de quebrar.** Resposta direta à pergunta central: não quebrou
   o `typecheck` em nenhum cenário. Medido no repositório inteiro — **86 dos 88 fakes não importam
   `schemas/mysql.ts`**; os 2 que importam são de outbox, e nenhum é repositório de agregado. Eles
   tipam contra o **domínio**, nunca contra a linha. Coluna nova, `NOT NULL` novo, `CHECK` novo:
   nada disso pode alcançá-los.
4. **Um literal chumbado leva o gate inteiro ao verde.** `visibility: 'PUBLICO'` escrito no mapper
   resolveu o único erro do cenário B e a suíte fechou 11.478/0. O gate não distingue campo
   preenchido pelo agregado de constante escrita pelo adapter.
5. **O `db:generate` gera arquivo que o próprio gate reprova.** O único gate que falhou no cenário A
   não foi por edição humana: `meta/_journal.json` e `meta/0002_snapshot.json` saem do `drizzle-kit`
   fora do estilo Prettier. **Toda geração de migration reprova o `format:check`**, nenhum script
   encadeia a correção, e a falha aparece longe da causa.

### O que o cenário B revelou sobre migration — por leitura, não execução

A migration emitiu `ADD COLUMN … NOT NULL` **sem `DEFAULT`** e o `ADD CONSTRAINT CHECK` num
statement separado, **sem uma linha de aviso**. Em tabela com dados isso falha pela metade — e o
repositório **já mediu esse caso**: `contracts/.../0020_busy_doctor_spectrum.sql` registra que
`NOT NULL` sem `DEFAULT` _"preencheria linhas existentes com string vazia (medido: nem
`STRICT_ALL_TABLES` impede)"_. O `''` viola o `IN (…)`, o 2º statement falha com **3819**, e a
coluna fica criada **sem** a constraint. O caminho seguro existe e está na
`0013_yielding_adam_warlock.sql`: `.default('CT')` junto do `.notNull()`.

> ⚠️ O agente **não executou** contra MySQL real. Esta parte é leitura do SQL emitido mais
> precedente medido no repositório — declarado como tal, não como medição própria.

### Veredito da medição 1

> **Mudar o schema aqui não é caro. É barato demais — e é isso que assusta.**

Uma coluna nullable custa **1 arquivo, 0 erros de compilador, 0 testes vermelhos**, em 149 s de
gate dos quais **111 s são a suíte inteira rodando por outros motivos**. Uma coluna `NOT NULL` com
`CHECK` custa 4 arquivos e 2 erros — e ainda assim fecha verde com um literal chumbado.

O agente registrou a própria surpresa: esperava que o `NOT NULL` explodisse em muitos arquivos e que
o fake fosse o primeiro a quebrar. **Errou nas duas.** O caro não é a cascata; é o silêncio.

---

## Síntese das duas medições — H-Z3

As duas rodaram em paralelo, com agentes distintos, métodos distintos e sem se consultarem.
Convergiram no mesmo ponto por caminhos independentes:

|             | Medição 1 (experimento)                                             | Medição 2 (varredura)                                                        |
| ----------- | ------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| Achado      | 86 de 88 fakes não importam o schema; coluna nova passa com 0 erros | 0 de 12 fakes respeitam `CHECK`; nenhuma das 134 tem literal de erro em port |
| Mesma causa | o fake tipa contra o **domínio**, não contra a linha                | a regra **não existe no contrato**, então não há o que espelhar              |

> **H-Z3 — O ambiente de dados não é rígido demais; é permeável demais. Nenhuma das três dores
> declaradas vem de custo. Todas vêm da mesma propriedade: o sistema aceita, em silêncio, um dado
> que não significa nada — e nenhum gate transforma esse silêncio em vermelho.**

Como isso reescreve as três dores:

| Dor declarada                 | O que a medição encontrou                                                                                                                                                                                   |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **1. Medo de mudar o schema** | Mudar custa 1 arquivo e 149 s. O medo **não é do custo — é da ausência de confirmação.** Nada avisa que ficou certo, então nada avisa que ficou errado. É medo bem calibrado a um sistema que não dá sinal. |
| **2. Bug de consistência**    | Consequência direta: 124 das 134 `CHECK` nunca foram exercitadas, o fake não pode conhecê-las, e o verde de 87% da suíte não é evidência sobre nenhuma delas.                                               |
| **3. Atrito de manutenção**   | Parcialmente confirmada, e por motivo diferente do esperado: **111 s dos 149 s de cada ciclo são a suíte inteira**, rodando por motivos alheios à mudança.                                                  |

**Falsificação de H-Z3:** um gate que force a coluna nova a significar algo — contraparte no port,
ou allowlist justificada — deveria reduzir as três dores juntas. Se a dor 1 persistir depois disso,
ela era de custo, e H-Z3 cai.

## Dois defeitos achados de passagem — fora do escopo, a registrar

Ambos são achados reais que nenhuma das duas medições foi buscar. Pela regra do repositório
(anti-padrão nº 7), viram issue, não conserto nesta mesa.

1. **`db:generate` sempre reprova `format:check`.** → **[#926](https://github.com/ERP-Bem-Comum/core-api/issues/926)**
2. **`ADD … NOT NULL` sem `DEFAULT` não tem guarda.** → **[#927](https://github.com/ERP-Bem-Comum/core-api/issues/927)**

### O que a revisão acrescentou antes de abrir — e por que valeu revisar

Ambos foram reportados pelo agente como "ninguém tratou". **A revisão mostrou que é pior: alguém
tratou, e a régua não se propagou** — o padrão que a memória do repositório já nomeia, e o mesmo das
issues #808 e #810.

|           | Como o agente reportou                                           | O que a revisão mediu                                                                                                                                                                                                                                                                                                                                |
| --------- | ---------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Defeito 1 | "o drizzle-kit gera desformatado, nenhum script encadeia format" | O `.prettierignore` **já isenta** `meta/` de `contracts` e `auth` (linhas 34-35), com intenção escrita: _"Drizzle Kit artifacts — não formatar"_. Origem: commit `c9f05ddd`, 2026-05-30, num PR de `auth`. **Cobre 2 dos 7 módulos.** No disco, os 2 isentos estão **desformatados** e os 5 restantes **formatados à mão** — duas réguas convivendo. |
| Defeito 2 | "não tem guarda"                                                 | **7 com `DEFAULT`, 7 sem** — metade e metade. Dos 7 sem, **3 justificam** a omissão em comentário (todos `consumer_id` de outbox vazio) e **4 não dizem nada**, em `ctr_contracts`, `bgp_budget_results` e `fin_remittance_documents` — tabelas de negócio, não staging.                                                                             |

⚠️ **Erro de medição meu, corrigido no caminho.** Meu primeiro grep procurou `ADD COLUMN … NOT NULL`
e voltou **vazio** — o que quase encerrou o defeito 2 como inexistente. O Drizzle emite
`` ADD `col` ``, **sem a palavra `COLUMN`**. O vazio era do padrão errado, não do repositório. Fica
registrado porque é a classe de engano que a memória do projeto já cobra: varredura que devolve zero
merece a mesma desconfiança que uma que devolve muito.

### A dedup mudou o encaminhamento do achado central

**A [#853](https://github.com/ERP-Bem-Comum/core-api/issues/853) já registra H-Z2** — aberta em
24/08/2026, a partir do PR #850, com o **mesmo** exemplo (`fin_payables_paid_at_chk`, errno 3819) e
já formulada como pergunta de desenho: _"fakes devem conhecer CHECKs de schema, e por qual
mecanismo"_.

Não foi aberta issue nova. Foi **comentada** com o que a medição acrescenta
([comentário](https://github.com/ERP-Bem-Comum/core-api/issues/853#issuecomment-5497331161)): a
escala (0/12, 86/88, 10/134, 52 sem prova em 5 módulos), a causa-raiz (o port silencioso), a
hipótese **derrubada** (schema × domínio concordam em 121/134 — poupa caminho a quem for consertar) e
a proposta de mecanismo com a armadilha declarada: **nem toda `CHECK` deve subir ao port** — 9 das
134 são contador de infra, e inchar o contrato com elas piora o desenho.

> Que o achado central já tivesse issue **não desperdiça a medição** — dá a ela escala, causa e
> mecanismo, que é o que faltava para a #853 sair de "pergunta de desenho" para trabalho executável.
> Mas é um lembrete: o acervo devia ter sido consultado por `gh issue list` **antes** de disparar as
> medições, não depois. **Incorporado:** as 5 medições da segunda leva levam `gh issue list` como
> passo obrigatório antes de concluir.

---

## Medição 7 · volume e perfil de carga — **NÃO MENSURÁVEL COM O ACESSO DISPONÍVEL**

Executada diretamente nesta mesa em 01/09/2026, via MCP `database` (read-only), único acesso a banco
autorizado pelo dono.

### O que o acesso alcança

|                             |                                                        |
| --------------------------- | -----------------------------------------------------: |
| Servidor                    |             MySQL **8.4.11**, container `195e9c491d15` |
| Schema                      |                                                 `core` |
| Tabelas presentes           | **26** — 25 `fin_*` + `__drizzle_migrations_financial` |
| Tabelas do repositório      |                                                 **67** |
| Linhas em tabela de negócio |                                        **16** no total |
| Dados / índices             |                                        0,4 MB / 0,8 MB |

Distribuição real: `__drizzle_migrations_financial` 52 · `fin_categories` 11 · `fin_cost_centers` 5 ·
**todas as demais 23 tabelas em zero**.

As 16 linhas não são dado de negócio: `fin_categories` e `fin_cost_centers` são o **seed de
referência das migrations** (o mesmo que a `.claude/rules/testing.md` avisa não apagar). É o banco da
suíte de integração do `financial` — nada mais.

### Veredito

> **A lacuna de volume permanece aberta, e agora com precisão sobre o porquê.** O único banco
> alcançável tem 26 das 67 tabelas, zero dado de negócio e nenhuma das tabelas que interessariam
> (`fin_documents`, `fin_payables`, `ctr_contracts`, `par_suppliers` — todas vazias ou ausentes).
> Nenhuma afirmação de performance, cardinalidade ou plano de execução pode se apoiar nele.

Isso **não bloqueia** o resto: lentidão foi descartada pelo dono na resposta ao Q0, e por isso o
volume já havia sido rebaixado de pré-requisito a contexto. Registrar o não-mensurável é o resultado.

**O que destravaria:** acesso read-only a homologação (Codebit) ou produção — ambos **não
autorizados** nesta sessão. Continua sendo a resposta ao Q1/Q4 dos especialistas externos, não a
uma medição interna.

> ⚠️ `information_schema.table_rows` é **estimativa** no InnoDB. Em tabela de milhões erraria; aqui,
> com todas em 0 ou dezenas, a ordem de grandeza é confiável — e a conclusão ("não há dado") não
> depende da precisão.

---

## Medição 3 · `schema.sql` e as migrations — **CONCLUÍDA**

Agente `drizzle-orm-expert`, worktree descartável. Atlas instalado pelo dono no meio da execução.

**`schema.sql` é extraível hoje, e é barato:** `drizzle-kit export --dialect=mysql --sql` — sem banco,
sem Docker. **1.236 linhas**, 67 `CREATE TABLE`, 79 índices, 26 FKs, **determinístico** (`diff` vazio
byte a byte entre duas execuções). `eventos_processados` aparece **uma** vez.

**Drift TS × migrations: zero.** `db:generate` nos 7 módulos devolve _"No schema changes"_ em todos.

⚠️ **A ressalva que decide a adoção:** o export é fiel ao **TypeScript**, não ao **banco**. **Nenhuma
das 1.236 linhas contém `ENGINE=InnoDB`** — o Drizzle 0.45 não emite charset/collate de tabela; as 33
migrations que têm o sufixo, têm porque alguém digitou. Um `schema.sql` assim recria tabelas herdando
`@@collation_server`: o modo de falha da **#808**. Serve **hoje** como fonte única de _leitura_
(review, onboarding, diff de PR); para provisionamento, falta pós-processamento.

### 46 de 123 migrations foram editadas à mão — 37,4 %

Prova **mecânica**: o `export` deu o oráculo do que o gerador emite; a diferença contra o disco é a
marca da mão humana. Comentário `--` 39 · `ENGINE=InnoDB` 33 · DML 5 · `ALTER` fundido 3 ·
`DROP TABLE IF EXISTS` 1 · nome fora do dicionário do gerador 1 (383 adjetivos × 920 heróis extraídos
do `bin.cjs`). **77 (62,6 %) estão 100 % geradas e intocadas.**

> 🔴 **O anti-padrão nº 4 do `CLAUDE.md` — _"escrever migration à mão — sempre `db:generate`"_ — é
> ficção em 37,4 % dos casos.** E as razões medidas não são preguiça: ordem por dependência (o gerador
> ordena por tipo de operação, não por dependência), `ENGINE`/`CHARSET` que o Drizzle não expõe, fusão
> de cláusulas para conseguir `INPLACE, LOCK=NONE`, e backfill entre dois DDLs.
>
> **A norma a escrever é "gerar sempre, editar quando necessário, e DECLARAR a edição."** A
> `contracts/0020_busy_doctor_spectrum.sql` já faz isso exemplarmente, com 15 linhas de comentário
> citando a medição. É padrão a promover, não infração a punir.

### Classificação das 123

DDL aditivo puro 83 (67,5 %) · DDL mutante 32 (26,0 %) · DML+DDL 5 (4,1 %) · destrutivo de dado 3
(2,4 %). As 5 com DML são **todas do `financial`**.

### 🔴 L1 — achado novo, sem issue, e toca provisionamento

**11 migrations criam 12 tabelas sem `ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`**
— entre elas `fin_remittance_payables` na `0050_same_jack_power`, **a migration exata que a #808 diz
que quebra** um provisionamento do zero (erro 1267). A #808 trata da _coluna_; **isto é a causa um
nível acima e não está coberta.**

### Atlas — a minha ressalva estava errada

Eu avisei que o `--dir-format` seria o obstáculo. **Não é.** O formato default do Atlas é `.sql` em
ordem lexicográfica + `atlas.sum`, e `--> statement-breakpoint` é comentário SQL válido. As 123
copiadas **sem nenhuma edição**: `atlas migrate hash` → `atlas.sum` com 123 entradas, `exit=0`;
`atlas migrate validate` → `exit=0`. Nas duas variantes.

Parou no `atlas migrate lint`, que exige `--dev-url`, porque o **OrbStack não está no ar** — e o
agente não o subiu, corretamente (app pesado é decisão do dono). Comando pronto no laudo.

Das 8 regras de lint propostas, o Atlas cobre **3** prontas (`destructive`, `data_depend`,
`backward-incompatible`); **L1, L3, L4, L5, L7, L8 são específicas deste repositório** e teriam de ser
escritas — o Atlas não sabe que aqui `ENGINE=InnoDB` é obrigatório nem que `ALGORITHM=` é proibido.

---

## Medição 4 · janela de inconsistência — **CONCLUÍDA**

Cadência das 3 projeções: **500 ms `poll` / 1000 ms `idle`, literal no código em 4 pontos idênticos.
São as únicas sem env var** — mudar a cadência em produção **exige deploy**. Sono obrigatório mesmo
com fila cheia; teto ~20 eventos/s por projeção.

5 saltos, **duas transações e duas conexões, nunca atômicas**. Claim em READ COMMITTED com
`FOR UPDATE SKIP LOCKED` e anti-join em `eventos_processados`.

**O que o consumidor vê durante a janela:**

| Projeção       | Vê                                           | Consequência                                               |
| -------------- | -------------------------------------------- | ---------------------------------------------------------- |
| supplier-view  | `supplierName`/`supplierDocument` **`null`** | LEFT JOIN sem par                                          |
| payable-view   | **linha ausente**                            | o título **some de 6 dos 8 relatórios** — #326 em produção |
| contract-count | **`0`**                                      | indistinguível de "sem contratos"                          |

**Defasagem estruturalmente inaferível:** `fin_supplier_view` e `fin_payable_view` têm
`updated_at`/`occurred_at` e **nenhum read path os seleciona**; `par_contract_count_view` **não tem
coluna de tempo**. Sonda manual existe só para `payable-view`.

**H-D2 — confirmada, e MAL NOMEADA.** Sem backoff (`consumer-progress.ts:72`, que o confessa: _"um
giro infinito sobre um evento venenoso"_), 5 falhas queimam em **~2,5 s**, o evento vai para DLQ
**terminal** (sem job, rota ou script que republique) e a linha fica defasada **para sempre**, sem
métrica, heartbeat ou campo que denuncie.

> A janela de ~1 s é latência aceita, absorvida por idempotência. **A defasagem permanente
> indetectável é corrupção silenciosa de dado exibido como verdade.** A hipótese nomeava só o
> primeiro; o segundo é o risco real.

**H-D3 — confirmada.** Dos 8 arquivos de projeção: 5 leem a view (eventual), 2 leem a fonte (forte), e
`general-report-projection.ts` lê **as duas na mesma query** (`:142` fonte, `:191` view). Nenhum ADR ou
rule diz quando materializar. Escolha feita issue a issue.

**Observabilidade:** `src/shared/observability/` tem **um** arquivo (`correlation.ts`). `/health` é
`{status:'ok'}` sem consultar nada. **Nenhum worker emite heartbeat.**

---

## Medição 6 · pools em runtime — **CONCLUÍDA** 🔴

|                                               |                                                       |
| --------------------------------------------- | ----------------------------------------------------: |
| Pools num boot de `src/server.ts`             |                 **31** (eram **14** no Incident-0001) |
| `connectionLimit` / `maxIdle` / `idleTimeout` | 10 / 2 / 270 s — **sem override por env** (grep zero) |
| Conexões teóricas, só HTTP                    |                                               **310** |
| **Piso ocioso** (31 × 2)                      |                                                **62** |
| `max_connections` medido no Incident-0001     |                                                **60** |
| Boot (smoke `SELECT 1`)                       |                                 31 = **52 % do teto** |
| Total HTTP + workers                          |                                           **350–390** |

**O piso ocioso de um único processo HTTP já excede o teto do servidor.**

Distribuição: **reports 12** · **financial 9** · budget-plans 4 · contracts 2 · auth 1 · partners 1 ·
programs 1 · programsReadPort 1. Verificado nesta mesa: `reports/adapters/http/composition.ts` chama
**7 builders de read-port** (3× partners, 2× budget-plans, 2× contracts), e cada `build*ReadPort`
abre pool próprio.

**Causa: `src/server.ts` não usa o `PoolRegistry`** — grep vazio para `PoolRegistry`,
`createPoolRegistry` e `closeAll`. O `server.ts` aceita injeção de read-port e **nunca injeta**.

**H-C1 — confirmada e SUBESTIMADA.** A ilusão de isolamento não está nas 13 envs: está na
**assinatura de cada builder**, que só sabe receber `connectionString`.

**A dedup alcançaria a borda — é omissão, não desenho.** Faltam 4 coisas: `*OnPool` em `programs` e
`budget-plans` (grep zero); variante sobre `Pool` nos ~16 builders que só assinam `{ connectionString }`;
`server.ts` criar o registry; trocar os 8 `shutdown()` por `closeAll()`.

⚠️ **Ironia medida:** a #407 consolidou os workers para reduzir pools contra o RDS. **O crescimento da
borda anulou a economia.**

⚠️ `max_connections=60` é o valor **da época** (10/07/2026), lido do post-mortem — que em `:141` pedia
confirmar sua origem, ação **pendente**. **Não verificável sem acesso ao RDS.**

**Dedup confirmado por 3 caminhos: não existe issue para o crescimento 14 → 31.** O follow-up
"consolidação 14→~7" existe **só como checkbox não marcado** em
`handbook/incidents/0001-prod-rds-connection-exhaustion-2026-07-10.md:151`.

---

## Medição 5 · concorrência — **CONCLUÍDA**

⚠️ **Limitação declarada pelo agente:** ele **não teve acesso a MCP nenhum** — o `.mcp.json` do
projeto traz `mcpServers: {}`. Nenhum número deste laudo vem de execução em banco; tudo é leitura
estática + o Refman 8.4 versionado no repo + o fallback local declarado no próprio `.mcp.json`.
(Esta mesa tem acesso ao MCP `database` por config de usuário; os subagentes não.)

### Correções de contagem — ocorrência × call site

| Métrica                 | Informado | Medido                                               |
| ----------------------- | --------: | ---------------------------------------------------- |
| `transaction(`          |        56 | **57**                                               |
| `for('update')`         |        46 | 46 ocorrências / **42 call sites** (4 em comentário) |
| `SKIP LOCKED`           |        23 | 23 ocorrências / **10 call sites**, em 5 arquivos    |
| `onDuplicateKeyUpdate`  |        46 | **47**                                               |
| **`withDeadlockRetry`** |     **5** | **5 ocorrências / 2 CALL SITES**                     |

> 🔴 A última muda a leitura. "5 `withDeadlockRetry`" sugere 5 caminhos com rede. Existem **dois** —
> `document-repository.drizzle.ts:220` e `payable-repository.drizzle.ts:111`, **ambos no `financial`**.
> `auth`, `contracts`, `partners`, `budget-plans`, `programs` e `notifications` não têm nenhuma.

### H-E1 — **DERRUBADA**

A condição de gatilho do manual é **duas ou mais uniques colidíveis na mesma linha**. Medido: 67
tabelas, **27** com UNIQUE além da PK, 40 só-PK. **44 dos 47 call sites de ODKU são sobre tabela
só-PK (94 %)**; dos 3 restantes, 2 têm PK UUID novo a cada chamada (não colide) e o terceiro
(`bgp_budget_results`) tem duas uniques **mas `legacy_id` nunca é escrito no caminho do ODKU** — o
outro escritor usa SELECT-then-UPDATE com `for('update')`.

**0 de 47 call sites reúnem a condição do manual.** A proibição global custa caro por um risco que
não se materializa.

**E a citação que sustenta a proibição está com a numeração da 8.0.** `document-repository.drizzle.ts:8-12`
cita "§13.2.6.2" e "§15.7"; na 8.4 são §15.2.7.2 e §17.7. Pior: `:20` cita §15.7.2.4, que **na 8.4 é
"SET RESOURCE GROUP Statement"**. O texto invocado sobrevive, **mas a paráfrase omite a condição** — o
manual diz _"avoid on tables with multiple unique indexes"_, não "sempre".

### H-E2 — **DERRUBADA**: READ COMMITTED é idiomático, não remendo

RC para locking read é item da **lista canônica de deadlock do próprio manual**
(`17-innodb-storage-engine.part01.md:4015` e `:4017`), irmão de "add well-chosen indexes". **Nenhum
índice dispensa baixar o isolamento:** o claim é range scan, e range trava a faixa varrida (`:3274`) —
que é, por definição, onde o produtor insere. Só RC remove o gap num range scan (`:3281`).
`SKIP LOCKED` não ajuda ("only apply to row-level locks", `:3591`), e o manual **sanciona o padrão
nominalmente para "queue-like table"** (`:3589`).

### H-E3 — **PARCIAL**

O atrito não é otimista × destrutivo — o `version` cobre o mesmo agregado e funciona. É **identidade
regenerada × referência externa**. Ordem correta: (a) estabilizar a identidade da filha (diff por
linha, não por conjunto — `payableKey` é chave de **conteúdo** e churna a cada mudança de valor), ou
referenciar `(document_id, chave-de-negócio)` em vez do surrogate; (b) até lá, FK `RESTRICT` é a
autoridade e **já existe**; (c) **nunca** releitura sob lock no ajuste.

### 🔴 Transversal — e o achado que ninguém foi buscar

**8 repositórios abrem transação de escrita sem `FOR UPDATE` e sem rede de deadlock.** Sete escrevem
tabela única ou raiz própria — sem aresta cruzada. **Um fecha ciclo AB-BA na `dev`:**
`reconciliation-repository.confirm` faz `fin_payables` (`:108`) → `fin_documents` (`:146`), **inverso**
do `save` (`:227` → `:316`).

> **A aresta é nova: entrou em `4ec8445e` (27/08) — depois da inquiry-0032, que ainda afirma que esse
> repositório "nunca toca `fin_documents`".** Registro que mente sobre o código, exatamente a classe
> de defeito que o `CLAUDE.md` manda registrar.

**Dedup:** **#902 cobre integralmente** o ciclo AB-BA (mesmas linhas, mesmo diagrama) — **não abrir**.
#810 cobre o hard replace fora do `financial`; #893 é adjacente. **Sem issue:** a superfície de lock do
`fin_payables_status_idx` (item aberto na inquiry-0031 §6), a proibição mal-endereçada de ODKU (norma,
não defeito) e **a divergência inquiry-0032 × código**.

---

## Estado da fase 2 — completa

| #   | Medição                        | Estado | Resultado em uma linha                                     |
| --- | ------------------------------ | ------ | ---------------------------------------------------------- |
| 1   | Custo de mudar o schema        | ✅     | 1 arquivo, 0 erros — barato demais, não caro               |
| 2   | Desalinhamento entre artefatos | ✅     | H-Z1 derrubada; H-Z2 (port silencioso) confirmada          |
| 3   | `schema.sql` + migrations      | ✅     | extraível e determinístico; **46/123 editadas à mão**      |
| 4   | Janela das projeções           | ✅     | H-D2 confirmada e mal nomeada — DLQ terminal é o risco     |
| 5   | Concorrência                   | ✅     | **H-E1 e H-E2 DERRUBADAS**; H-E3 parcial                   |
| 6   | Pools em runtime               | ✅     | 🔴 **31 pools, piso ocioso 62 > teto 60**                  |
| 7   | Volume                         | ⛔     | não mensurável — banco de laboratório                      |
| 8   | `legacy_id`                    | ✅     | H-G1 confirmada — andaime abaixo do agregado, modelo acima |

## Medição 3b · o replay contra MySQL 8.4 real — **EXECUTADA EM 01/09/2026**

Autorizada pelo dono. MySQL 8.4 efêmero subido no x99 (imagem já local — o host não tem internet),
porta 3399 bindada só no IP do cabo, container **destruído após a medição**.

### 🔴 O provisionamento do zero QUEBRA — e está reproduzido

```
-- 1m3.533260792s
-- 112 migrations ok, 1 with errors
-- 423 sql statements ok, 1 with errors
Error 1267 (HY000): Illegal mix of collations
  (utf8mb4_0900_ai_ci,IMPLICIT) and (utf8mb4_unicode_ci,IMPLICIT) for operation '='
  … from version "00113"
```

A versão `00113` é **`financial/0050_same_jack_power.sql`** — exatamente a migration que a
[#808](https://github.com/ERP-Bem-Comum/core-api/issues/808) nomeia. Collations lidas do banco após a
falha:

| Tabela                        | `table_collation`                                                   |
| ----------------------------- | ------------------------------------------------------------------- |
| `fin_payables`                | `utf8mb4_unicode_ci` (sufixo digitado à mão)                        |
| `fin_remittance_documents`    | `utf8mb4_unicode_ci` (idem)                                         |
| **`fin_remittance_payables`** | **`utf8mb4_0900_ai_ci`** — sem sufixo, herdou o default do servidor |

**O L1 sai de hipótese para defeito reproduzido.** Comentado na #808
([link](https://github.com/ERP-Bem-Comum/core-api/issues/808#issuecomment-5497933124)).

### ⚠️ `atlas migrate lint` virou pago — e isso muda a recomendação

```
Abort: Starting with v0.38, 'atlas migrate lint' is available only to Atlas Pro users.
```

Binário testado: **v1.3.3**. O `migrate apply` e o `migrate validate` seguem abertos na Community
Edition; o **lint**, que era a razão principal de adotar Atlas aqui, não.

**Consequência para a opção C** (`schema.sql` como fonte da verdade + lint de migração no CI),
recomendada na primeira rodada desta sessão: **a metade "lint do Atlas" está fora**, salvo licença.

**Mas a medição encontrou um gate melhor, e grátis:** o **replay das 123 num MySQL 8.4 limpo roda em
~64 s**, sem seed e sem fixture, e pega exatamente a classe de defeito que interessa — o que quebra
num provisionamento do zero. Não depende do Atlas (um laço de `mysql < arquivo.sql` faz o mesmo) e
hoje **nenhum gate faz isso**: a suíte de integração parte de um banco já migrado.

> Este é o achado que fecha a frente B. A pergunta era "vale extrair `schema.sql` e adicionar lint?".
> A resposta medida: **o `schema.sql` sai por um comando, o lint pago não vale, e o gate que faltava
> é o replay** — mais barato que os dois e o único que teria pego a #808 antes de ela existir.

---

### Hipóteses: o placar

**Derrubadas: 3** (H-Z1, H-E1, H-E2). **Confirmadas: 5** (H-Z2, H-Z3, H-D2 reformulada, H-D3, H-C1
subestimada, H-G1). **Parcial: 1** (H-E3).

Três hipóteses derrubadas por medição, duas delas **em defesa do código** — o repositório está mais
correto do que a investigação supunha em concorrência, e menos correto do que supunha em contratos de
port e em pools.
