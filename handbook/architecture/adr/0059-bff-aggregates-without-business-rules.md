[← Voltar para ADRs](./README.md)

# ADR-0059: O BFF agrega, mas não decide — "burro" passa a significar sem regra de negócio

- **Status:** Accepted (`supersedes` parcialmente [ADR-0005](./0005-thin-bff-gateway.md) — apenas a cláusula "Zero composição de respostas" e o alvo de 200-300 linhas; o resto segue vigente)
- **Date:** 2026-08-05
- **Deciders:** Gabriel (dono do repo — decisão declarada no gate humano da Fase 1 da spec 040)
- **Complementa:** [ADR-0049](./0049-core-api-bff-boundary.md) (fronteira core ↔ BFF, ratificado na mesma data)
- **Contexto de origem:** verificação da alegação `ADR-0049-C6` do inventário — a resposta do dono do repo revelou contradição com o ADR-0005, que ninguém tinha confrontado

## Contexto

O [ADR-0005](./0005-thin-bff-gateway.md) enumerou três opções e escolheu a segunda:

> 1. **Front escolhe URL diretamente** (legacy.example.com vs api.example.com).
> 2. **BFF burro** entre front e serviços (só roteia).
> 3. **BFF inteligente** que compõe respostas e tem regra de negócio.

E decidiu, literalmente: _"**Zero regra de negócio. Zero composição de respostas. Zero cache de domínio.** Tamanho-alvo inicial: **200-300 linhas**."_

**O BFF real ficou entre a 2 e a 3, e o ADR não previu esse ponto.** Descrição do dono do repo em 2026-08-05:

> "Regras de negócio do serviço da API não são validadas no BFF, porém o BFF mantém suas
> responsabilidades sim. Por exemplo ele é um agregador de serviços — pense como se o BFF fosse o
> assistente pessoal do client-side: ele que irá buscar todas as ferramentas que o client precisa,
> mastigar e entregar tudo já processado e pronto para o client só se preocupar com a exibição e
> interação das telas."

Agregar e "mastigar" **é composição de respostas**, o que a opção 2 proíbe. Mas **não é regra de negócio**, o que a opção 3 traria junto. O ADR-0005 tratou as duas como um pacote — e elas não são.

Por que isso passou despercebido até agora: o inventário de decisões confronta ADRs com `src/`, e o BFF **não vive neste repositório**. O `ADR-0005` nunca foi verificado contra o BFF real; a contradição só apareceu quando a alegação `ADR-0049-C6` foi levada ao dono do repo para verificação humana.

## Decisão

### 1. "Burro" significa SEM REGRA DE NEGÓCIO — invariante

O BFF **MUST NOT** conter regra de negócio, invariante de domínio ou validação de escrita. Isso é o núcleo do ADR-0005 e **permanece integralmente**: quem decide é o core-api, sempre.

### 2. Composição para o client é responsabilidade legítima — invariante

O BFF **MAY** compor respostas de múltiplas chamadas ao core, remodelar payload por tela e entregar view-model pronto para exibição. É o papel canônico de um Backend-for-Frontend, e a cláusula "Zero composição de respostas" do ADR-0005 fica **superseded**.

O critério que separa o permitido do proibido é o do [ADR-0049](./0049-core-api-bff-boundary.md): _"O banco precisa fazer isso? → core-api. É montar/formatar o que já veio? → BFF."_ Compor é montar o que já veio. Decidir é do core.

### 3. O alvo de tamanho sai — invariante

O alvo de **200-300 linhas** do ADR-0005 fica **superseded**. Ele era proxy para "não deixe virar a opção 3", e proxy numérico envelhece: um BFF que agrega dez telas passa disso sem ganhar uma linha de regra de negócio. A régua que substitui é a §1, que é verificável por leitura e não por contagem.

### 4. O core não afrouxa contando com o BFF — invariante

Nada nesta decisão autoriza o core a delegar authz, validação ou isolamento multi-tenant ao BFF. O `ADR-0049` (ratificado nesta mesma data) fixa que **o core é público em definitivo** — não há topologia futura em que o BFF seja a única porta. Guardrail do core é permanente.

## Consequências

### Positivas

- **A contradição sai do acervo.** O ADR-0005 dizia "zero composição" e o BFF compõe; agora o registro descreve o que existe.
- **A distinção fica nomeável.** "Sem regra de negócio" é verificável por leitura de código; "sem composição" não distinguia agregação legítima de vazamento de domínio.
- **Remove um limite que envelheceria sozinho.** O alvo de 200-300 linhas seria contraditado por crescimento legítimo — o mesmo defeito de forma que o [ADR-0058](./0058-runtime-tracks-recommended-lts.md) documenta para versões.

### Negativas, declaradas

1. **A fronteira fica menos mecânica.** "Zero composição" era grep-ável; "sem regra de negócio" exige julgamento em review. Aceito conscientemente: a régua anterior era verificável e ERRADA, o que é pior que correta e subjetiva.
2. **Não há gate.** O BFF vive noutro repositório, e este ADR não pode cobrar nada de lá. Segue valendo por disciplina e review — declarado, não escondido.
3. **A opção 3 fica mais perto.** Ao permitir composição, o degrau até "BFF inteligente com regra de negócio" encurta. A §1 é a única barreira, e ela é textual.

### Neutras

- O roteamento por prefixo, o cross-cutting (auth, rate limit, request-id, log) e o "Zero cache de domínio" do ADR-0005 **permanecem vigentes** — esta decisão não os toca.
- A regra `.claude/rules/http-edge.md` é atualizada junto: a enumeração "roteia, valida JWT, aplica rate limit" descrevia a opção 2 e passa a refletir esta decisão.

## Alternativas Consideradas

### A. Manter o ADR-0005 como está e tratar a agregação como dívida do BFF

Rejeitada pelo dono do repo. A agregação **é o papel do BFF** no padrão canônico — remover exigiria empurrar composição para o client ou para o core, e o `ADR-0049` já proíbe a segunda ("o core não retorna DTO de tela").

### B. Corrigir apenas a rule `http-edge.md`, sem ADR

Rejeitada. Deixaria o ADR-0005 dizendo "Zero composição de respostas" e a rule dizendo outra coisa — **duas fontes divergindo sobre a mesma norma**, que é a fábrica de drift que este acervo passou a semana inteira desfazendo.

### C. Superseder o ADR-0005 por inteiro

Rejeitada. O roteamento, o cross-cutting e a proibição de regra de negócio continuam corretos e em uso. Supersessão total descartaria decisão válida para corrigir duas cláusulas — o `ADR-0009` já estabeleceu o precedente de supersessão **parcial** neste acervo.

## Gatilho de reavaliação

Este ADR **MUST** ser reaberto por um ADR que o supersede se:

1. O BFF passar a conter regra de negócio ou validação de escrita — a §1 caiu, e aí a fronteira precisa ser redesenhada, não remendada.
2. O BFF for absorvido pelo front (SSR/server functions) ou pelo core, deixando de existir como serviço.

**Pendência declarada:** nenhuma cláusula deste ADR é verificável a partir deste repositório. Quando o BFF entrar num monorepo com o core, ou ganhar inventário próprio, a §1 vira candidata a gate.
