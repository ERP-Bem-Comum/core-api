# Réplica ao parecer — texto pronto para enviar

> Escrito para ser copiado e enviado ao Arquiteto de Dados externo. Tom de resposta entre pares:
> começa pela errata, porque é ela que dá credibilidade ao resto.

---

Obrigado pelo parecer — ele rendeu mais do que uma segunda opinião. Levamos suas cinco frentes de
volta para dentro, cada uma para quem tinha feito a medição correspondente, e acrescentamos alguém
com a função explícita de defender o seu texto contra nós, para a sala não virar coro. O resultado
está abaixo, e ele começa com um erro nosso.

## Antes de tudo: dois números do dossiê estavam errados

Você escreveu, como evidência da H-X1: _"`ON DELETE CASCADE` usado apenas 2 vezes contra 13 soft
deletes manuais"_. Os dois números vieram do nosso documento, e os dois estão errados.

São **14 `ON DELETE CASCADE`**, não 2. Nossa varredura procurou `ON DELETE [A-Z ]+` e só capturou
maiúsculas; o `drizzle-kit` emite em minúsculas, e havia mais doze. O quadro real das 28 FKs com
política declarada é **14 cascade · 11 restrict · 3 no action** — integridade referencial delegada ao
servidor em mais da metade.

E "soft delete: 13" era contagem de **ocorrências do identificador `deletedAt`** no código,
concentradas em **um** arquivo de schema — não 13 tabelas. Lido ao lado de "CASCADE: 2", sugeria uma
proporção que não existe.

A errata está publicada no corpo do dossiê, não reescrita em silêncio. Lamentamos ter feito você
argumentar sobre dado ruim.

## Onde você está certo, e vira trabalho

**1. O CI que pula e reporta verde deve quebrar.** Sem defesa da nossa parte. Hoje 118 arquivos
somem quando `MYSQL_INTEGRATION` não está definida. O gate é uma asserção: `CI` definido ⇒ a variável
é obrigatória. Foi classificado internamente como o item de maior retorno de toda a medição, e é seu.

**2. `FOR UPDATE` prende conexão — e temos o número.** Você tem razão, e a distribuição qualifica:
dos 42 call sites, ~35 são lock por chave primária em transação de 2–4 round trips. O caso longo é
**um**: o `save` do documento segura o lock por 10–12 round trips. Uma medição anterior nossa já
havia cronometrado esse caminho — **mediana 119 ms, pior caso 428 ms** (N=20). Com pool de 10 e um
incidente de exaustão no histórico, 428 ms sob lock é risco real, não teórico.

Onde discordamos é na cura: o OCC não encurta esse lock. Aquele `FOR UPDATE` existe para serializar
dois `save` do mesmo documento, e removê-lo transforma a releitura em consistent read — que é
exatamente o defeito que nos custou uma investigação sobre pagamento em dobro. Encurtar exige tirar
trabalho de dentro da transação, não trocar de esquema de controle.

**3. Sua régua "invariante de negócio × integridade estrutural" é melhor que a nossa formulação — e
reduz o trabalho em 97 %.** Aplicando-a às 134 `CHECK`: **29 são estruturais** (26 de outbox/DLQ,
3 de `version`) e **105 são de negócio**. Das 105, o domínio **já valida 102**. Sobram **2 que ele não
valida e 1 que diverge**.

Ou seja: promover restrição ao contrato do port não são 134 casos. **São 3.** O inchaço que você
temia não aconteceria, e sua ressalva se honra por três linhas. Isso também nos obrigou a estreitar a
nossa própria hipótese — o risco não é o fake ignorar 134 regras, é ele ignorar as **relações entre
campos que nenhum smart constructor amarra**, que é a forma exata desses 3 casos.

**4. Sobre os pools, seu diagnóstico está certo e o remédio não.** Você escreveu _"passando a mesma
conexão para todos os módulos durante um request"_. Uma conexão `mysql2` é uma **sessão**: se os
módulos a dividissem, o `BEGIN` de um envolveria as leituras do outro, os locks seriam liberados pelo
primeiro `COMMIT` de qualquer um, e — o pior — **`FOR UPDATE SKIP LOCKED` deixaria de isolar**, porque
uma sessão não bloqueia a si mesma: o claim do outbox veria como livre o que ele próprio travou.

O que precisamos é um nível acima: **um pool por destino**, cada módulo pegando sua própria conexão.
Mesma concorrência por request, teto agregado cinco vezes menor. É o mecanismo que já roda nos nossos
workers, com o contrato de posse testado — falta levá-lo à borda HTTP.

Uma correção nossa, de passagem: apresentamos "62" como _piso_ ocioso, e não é — `maxIdle: 2` é teto
de retenção. **O piso real é 31**, porque cada driver faz um `SELECT 1` de warm-up no boot. Continua
sendo 52 % do teto antes do primeiro request.

**5. Sobre a View: você fez a melhor pergunta da consulta, e a resposta é desconfortável.** Fomos
verificar o que quebraria se a costura em memória virasse uma View no banco. **Nenhum teste ficaria
vermelho.** O gate de isolamento verifica que cada módulo _declara tabela_ com o seu prefixo — uma
View criada por migration não é declaração de tabela. O gate de fronteira lê _specifiers de import_
TypeScript — uma View não gera import. Só a norma escrita impede.

E há agravante que você não podia saber: o módulo de relatórios **já lê de quatro módulos**, com
variáveis de conexão distintas apontando para o mesmo banco. A fronteira já é atravessada — só que em
TypeScript, sem otimizador.

## Onde discordamos, com número

**O OCC que você propõe já está implementado.** A coluna `version` existe, o CAS
`UPDATE … WHERE id=? AND version=?` está no repositório, e o retry sob ele já foi provado seguro.
Mais importante: **OCC não resolve filho órfão.** O token de versão está no _pai_, e quem regenera
identidade é o `DELETE`+`INSERT` das filhas — o pai nem fica sabendo. A contraprova está no próprio
código: temos outra tabela hard-replaced **sem** coluna `version` que **não** tem essa classe de
defeito, porque nada referencia o id dela de fora. Só **1 FK em 26** aponta para filha de hard
replace. O eixo do problema é **identidade**, não otimismo.

**Testcontainers "em milissegundos" não sobrevive a esta base.** MySQL 8.4 sobe em segundos, e nosso
contrato de isolamento exige `--test-concurrency=1` num banco _compartilhado_ — um container por
arquivo multiplicaria o boot e quebraria as duas provas que exigimos da suíte (passar em ordem
invertida, e passar duas vezes sem recriar o banco), que só fazem sentido porque há resíduo entre
arquivos. Também já avaliamos aposentar os fakes, em agosto, e recusamos por três razões — e
Testcontainers não resolve nenhuma delas, porque **também exige Docker**. Muda quem sobe o container,
não onde os testes vivem.

Dito isso, o advogado que colocamos contra nós marcou um ponto que aceitamos: aquela avaliação **não
citou Testcontainers nominalmente**, e o caminho "teste contra banco real" é hostil por construção
aqui — nosso próprio comando de integração derruba a infra de desenvolvimento. O fake não venceu um
concurso; venceu por ausência de adversário. Isso não valida Testcontainers, mas nos obriga a
reprecificar o caminho real.

**"Falta de ORM" inverte a sua tese.** O projeto usa Drizzle. A decisão registrada fixa MySQL como
dialeto único e lista nominalmente as features SQL permitidas — o oposto de programar contra o mínimo
denominador portável. Não usar abstração é aproximar-se do banco, não fugir dele.

## O que a sua H-X1 realmente encontrou

Ela fica **parcial**: duas evidências caem (14 CASCADE, não 2; há ORM), e a terceira sobrevive — as
232 linhas de costura em memória são reais, e o raciocínio circular que você sugere **fecha**: a
fronteira que proíbe a View é prefixo de tabela no mesmo banco físico, e o servidor não a impõe.

Mas o diagnóstico é outro. Não é medo do banco: é o **preço do monólito modular**, pago para que a
extração futura de um módulo não encontre dois deles soldados por uma View. A escolha é defensável. O
defeito é ela **nunca ter sido precificada** — ninguém mediu o custo da costura contra o ganho em
separabilidade, e a decisão foi tomada uma vez, sem revisão.

E foi por aí que sua pergunta produziu a hipótese que faltava, que não é a sua:

> **As fronteiras deste sistema são todas culturais, e o custo delas nunca foi medido — só pago.**

Três frentes independentes chegaram nela. O `legacy_id` respeitou a fronteira do agregado por
disciplina e furou a do read-model. A `CHECK` existe no banco e não existe no contrato. A costura em
memória paga pedágio a uma linha que o servidor não conhece. **Nenhuma das três tem gate.**

## Respondendo à sua pergunta final

Você perguntou qual frente tem menor atrito para começar amanhã. Nenhuma das duas que você sugeriu —
há uma terceira, e é sua:

1. **O gate de `MYSQL_INTEGRATION` em CI.** Uma asserção, sem coordenação, e sem ela nenhuma das
   outras é verificável — porque hoje o verde não prova nada sobre esse caminho.
2. **Confirmar o `max_connections` vigente.** Uma consulta. Sem ele, a prioridade dos pools é
   estimada.
3. **Os pools na borda.** O mecanismo já existe e é testado; falta ligá-lo.

O refatoramento de agregados fica por último de propósito: é o único que mexe em código que, quando
erra, paga duas vezes o mesmo fornecedor.

Obrigado de novo — foi a consulta mais produtiva que fizemos, principalmente nos pontos em que você
nos contrariou.
