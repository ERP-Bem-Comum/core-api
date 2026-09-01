# Debate — o parecer externo confrontado com as medições

> 2026-09-01. Um Arquiteto de Dados externo leu o dossiê e emitiu parecer. Cinco participantes
> responderam: os quatro agentes que fizeram as medições — que carregam os números no próprio
> contexto — e um **advogado do parecer**, agente novo com a função de defendê-lo contra a casa.
>
> O advogado existe por método: quatro medidores respondendo a quem os contesta produzem coro.

## 0 · Errata — dois números nossos estavam errados

**Antes de qualquer placar.** O parecer construiu uma das três evidências da hipótese H-X1 sobre dois
números do dossiê. Os dois estavam errados, e o erro é nosso.

|                     | Dossiê v1–v5 | Medido                                                         |
| ------------------- | -----------: | -------------------------------------------------------------- |
| `ON DELETE CASCADE` |            2 | **14**                                                         |
| "Soft delete"       |           13 | **1 arquivo de schema** (13 eram ocorrências do identificador) |

**Causa:** a varredura procurou `ON DELETE [A-Z ]+` e só capturou maiúsculas. O `drizzle-kit` emite em
minúsculas — havia mais 12. O quadro real das 28 FKs com política declarada é **14 cascade · 11
restrict · 3 no action**.

**Quarto erro de padrão de grep nesta sessão**, e o mais caro: os três anteriores foram detectados
antes de sair; este foi publicado e um terceiro construiu argumento em cima. Os outros três, para
registro: `ADD COLUMN` (o Drizzle emite `` ADD `col` ``), `legacyId` em camelCase (o código usa
snake), e `grep -c` contando linhas onde eu queria ocorrências. **Os quatro produziram um número
para menos**; nenhum produziu um para mais. Varredura que devolve pouco merece a mesma desconfiança
que uma que devolve muito.

Errata publicada no corpo do dossiê (v6), não reescrita em silêncio.

## 1 · Onde o parecer está certo

### 1.1 O CI que pula e reporta verde deve quebrar — sem defesa

É a H-F2, e não há contra-argumento. **O gate mínimo:** um teste em `tests/cleanup/` que falhe se
`CI` estiver definido e `MYSQL_INTEGRATION` não. Hoje **118 arquivos somem em silêncio**. Uma linha
de asserção — nas palavras do agente que mediu, _"o item de maior retorno de toda esta medição"_.

### 1.2 `FOR UPDATE` prende conexão — o ponto mais forte do parecer

A casa concede, com número. Dos **42 call sites**, ~35 são lock por PK em transação de 2–4
round trips. **O caso longo é um:** `document-repository.save` segura X em `fin_documents` de `:227`
até o commit em `:404` — 3 diffs de filhas, timeline, outbox, ~10–12 round trips. A inquiry-0031 §6
já mediu esse caminho: **mediana 119 ms, pior caso 428 ms** (N=20).

Com `connectionLimit: 10` por pool e o Incident-0001 no histórico, 428 ms sob lock **é** risco de
pool, não teoria.

⚠️ **Mas a cura dele não cura.** O `FOR UPDATE` de `:227` existe para serializar dois `save` do mesmo
documento; removê-lo transforma a releitura em consistent read — o defeito que a inquiry-0032 mediu
como **pagamento em dobro**. Encurtar o lock exige **tirar trabalho de dentro da transação**, não
trocar de esquema de controle.

### 1.3 Os pools são o risco nº 1 — diagnóstico certo, remédio errado

Ele escolheu a medição 6 como prioridade, e a casa concorda. Mas o remédio que escreveu —
_"passando a mesma conexão para todos os módulos durante um request"_ — descreve compartilhar
**sessão**, e seria pior que a doença:

- o `BEGIN` de um módulo passaria a envolver as leituras que outro faz em seguida; um `ROLLBACK`
  desfaria o trabalho alheio;
- os locks de `FOR UPDATE` seriam liberados pelo primeiro `COMMIT` de **qualquer** módulo;
- **`FOR UPDATE SKIP LOCKED` deixaria de isolar** — uma sessão não bloqueia a si mesma, e o claim
  veria como livre o que ele próprio travou;
- padrões que hoje pegam **duas** conexões do mesmo pool (`runner/specs.ts:202-204`) entrariam em
  autobloqueio.

**A correção é um nível acima:** um **pool** por destino, cada módulo pegando sua própria conexão.
Mesma concorrência por request, teto agregado 5× menor — e é o mecanismo que já roda no
worker-runner desde a #407, com contrato de posse testado.

### 1.4 Invariante de negócio × integridade estrutural — melhor que a nossa formulação

A ressalva dele (não inchar o port com validação estrutural) é a mesma que a medição 2 levantou por
dentro. Aplicando a régua dele às 134:

| Classe                                                         |       n |
| -------------------------------------------------------------- | ------: |
| Integridade **estrutural** (26 de outbox/DLQ + 3 de `version`) |  **29** |
| Invariante de **negócio**                                      | **105** |
| — das quais o domínio **já valida**                            | **102** |
| — que o domínio **não valida**                                 |   **2** |
| — que **divergem**                                             |   **1** |

> **Promover ao port não são 134 casos. São 3.** O inchaço que ele temia não aconteceria, e o
> número torna a ressalva barata de honrar.

### 1.5 A View proibida por uma fronteira sem enforcement — confirmado

A pergunta final do advogado: _"o que quebra se a costura virar uma View — existe teste que ficaria
vermelho, ou só a rule?"_

**Verificado: nenhum teste. Só a rule.**

- `tests/cleanup/table-prefix-isolation.test.ts` verifica que cada módulo **declara `mysqlTable`**
  com o seu prefixo. Uma View criada por migration SQL não é `mysqlTable` — passa.
- `tests/cleanup/module-boundary.test.ts` lê o **specifier do import** TypeScript. Uma View no banco
  não gera import — passa.

E há agravante: `REPORTS_BUDGET_PLANS_DATABASE_URL`, `REPORTS_CONTRACTS_DATABASE_URL`,
`REPORTS_FINANCIAL_DATABASE_URL` — **o `reports` já lê de quatro módulos**, contra o mesmo `db core`.
A fronteira já é atravessada; só que por TypeScript, sem otimizador.

## 2 · Onde o parecer erra

### 2.1 OCC com token de versão — já existe, e não resolve o problema

`fin_documents.version` existe (`mysql.ts:155`), o CAS é `UPDATE … WHERE id=? AND version=?`
(`document-repository.drizzle.ts:243-251`), e o retry sob esse CAS já é provado seguro
(`retry-on-deadlock.ts:13-18`). Ele propõe adotar o que está adotado.

**E o OCC não resolve filho órfão:** o token está no **pai**, e quem regenera identidade é o
`DELETE`+`INSERT` das filhas. **Contraprova medida:** `bgp_budget_results` é hard-replaced **sem**
coluna `version` e **não tem** essa classe de defeito — porque ninguém referencia o id dela de fora.
**1 FK em 26** aponta para filha de hard replace. O eixo é **identidade**, não otimismo.

### 2.2 Testcontainers "em milissegundos" — falso nesta base

MySQL 8.4 sobe em **segundos**. E o contrato de isolamento (`.claude/rules/testing.md`) exige
`--test-concurrency=1` num banco **compartilhado**: um container por arquivo multiplicaria o boot por
dezenas e **quebraria as duas provas que a rule cobra** (ordem invertida e repetição sem recriar), que
só existem porque há resíduo entre arquivos.

A inquiry **0034** (31/08) recusou aposentar os fakes por três razões — 179 arquivos migrariam, o
`pnpm test` passaria a exigir Docker, a base da pirâmide viraria topo. **Testcontainers não resolve
nenhuma: ele também exige Docker.** Muda quem sobe o container, não onde os testes vivem.

> ⚠️ **A objeção do advogado procede em parte, e fica registrada:** a 0034 **não** avaliou
> Testcontainers nominalmente, e o `CLAUDE.md` admite que `pnpm run test:integration` **derruba a
> infra de dev**. O caminho verdadeiro é hostil por construção — então o fake não venceu um concurso,
> venceu por ausência de adversário. Isso não valida Testcontainers; **valida revisitar o custo do
> caminho real**, que é outra coisa.

### 2.3 "Falta de ORM" como evidência de fobia — inverte a tese

O projeto **usa** ORM: Drizzle 0.45 em `mysql-core`, com `drizzle-kit generate` obrigatório. O
ADR-0020 fixa MySQL como dialeto **único** e lista nominalmente as features SQL permitidas —
justamente para usar o banco de verdade em vez de programar contra o mínimo denominador portável.
Não usar abstração é **aproximar-se** do banco.

### 2.4 As 480 linhas de costura — os arquivos citados fazem JOIN no banco

O advogado somou 183 + 297 linhas como prova de costura em memória. Medido:

| Arquivo                                    | Linhas | `select` | `join` | `groupBy` |
| ------------------------------------------ | -----: | -------: | -----: | --------: |
| `suppliers-without-contract-projection.ts` |    183 |        2 |  **2** |     **2** |
| `realized-provisioned-projection.ts`       |    297 |        4 |  **6** |     **3** |
| `realized-read.stitch.ts`                  |    232 |    **0** |  **0** |     **0** |

Os dois primeiros **são SQL** — exatamente o banco sendo usado. O único que é costura pura é o
`stitch.ts`. **O número certo continua 232, não 480.**

### 2.5 "Pool é preguiçoso, o piso depende de warm-up" — meio certo, e corrige a casa

Ele acerta o conceito: `maxIdle: 2` é **teto de retenção**, não piso garantido — apresentar "62" como
_piso_ é impreciso, e a casa o fez.

Mas erra o caso: **há warm-up explícito.** Cada driver executa `await pool.query('SELECT 1')` no boot
(`financial/…/mysql-driver.ts:77`, `auth:74`, `budget-plans:65`, `contracts:82`).
**O piso real medido é 31 conexões — uma por pool, antes do primeiro request. 52 % de 60.** O 62 é o
máximo de ociosas retidas, não o piso.

## 3 · A hipótese que a sala produziu

H-X1 do parecer — _"a fobia de banco gerou a complexidade da aplicação"_ — fica **PARCIAL**: duas das
três evidências são factualmente falsas, e a terceira é verdadeira no fato e errada na causa. Não é
medo do banco; é **o preço declarado do modular monolith**, que nunca foi precificado.

Mas ele achou o que nenhuma das nossas oito hipóteses formulou, e as três frentes convergiram nisto:

> **H-Z4 — As fronteiras deste sistema são todas culturais, e o custo delas nunca foi medido, só
> pago.**
>
> - **`legacy_id`**: a fronteira do agregado segurou por disciplina; a do read-model furou. Nenhum
>   gate.
> - **`CHECK` × port**: a restrição existe no banco, o contrato não a menciona. Nenhum gate.
> - **Módulo × módulo**: 232 linhas de memória pagam pedágio a uma fronteira que o servidor não
>   conhece — e `reports` já a atravessa por TypeScript. Nenhum gate.
>
> **Falsificável:** existe alguma fronteira deste sistema cuja violação produza vermelho no CI, sem
> depender de alguém lembrar da regra? O isolamento por prefixo tem gate (`table-prefix-isolation`),
> mas ele cobre **declaração de tabela** — não View, não JOIN, não consulta.

## 4 · Ordem recomendada, com o parecer incorporado

| #   | Ação                                                                       | Origem                       | Custo      |
| --- | -------------------------------------------------------------------------- | ---------------------------- | ---------- |
| 1   | Gate: CI setado ⇒ `MYSQL_INTEGRATION` obrigatória                          | parecer (H-F2)               | 1 asserção |
| 2   | Confirmar `max_connections` vigente no RDS                                 | #930 · CA5                   | 1 consulta |
| 3   | `PoolRegistry` na borda HTTP — 31 → ~6 pools                               | medição 6                    | M          |
| 4   | Promover ao port as **3** restrições relacionais                           | medição 2 + régua do parecer | S          |
| 5   | Gate de replay das migrations num MySQL limpo (~64 s)                      | medição 3b                   | S          |
| 6   | Precificar a fronteira: quanto custa a costura em memória × separabilidade | H-Z4                         | inquiry    |

O item 6 é o único que não é execução — é a pergunta que a sessão inteira produziu e ninguém tinha
feito.
