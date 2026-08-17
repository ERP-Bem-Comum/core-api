---
inquiry: 0030
title: "O dead-man's switch que nunca vigiou — o ADR-0042 sai do código sem ser superado"
state: open
opened: 2026-08-17
decided:
last_reviewed: 2026-08-17
---

[← Voltar ao Índice de Inquiries](./INDEX.md)

# Inquiry-0030: O dead-man's switch que nunca vigiou — o ADR-0042 sai do código sem ser superado

- **Opened by:** Gabriel Aderaldo
- **Asked to:** verificação própria — estado do repositório, histórico de runs do Actions e o registro de aferição do ADR
- **Impact:** [ADR-0042](../architecture/adr/0042-deadman-switch-redundant.md) (`Accepted`, **não superado**) · épico #67 · o ponto cego que ele existia para cobrir segue aberto
- **Gatilho de fechamento:** existir um desenho que satisfaça os cinco requisitos da §5. Enquanto não houver, esta inquiry fica `open` — e o ADR-0042 fica de pé descrevendo um mecanismo que o código não tem.

---

## 1. Contexto

Em 2026-08-17, uma investigação sobre instabilidade do GitHub encontrou, de raspão, dois workflows
agendados vermelhos na `main`. Um deles era o `deadman-audit`. A checagem seguinte mostrou que ele
falhava **todo dia desde 2026-07-24** — 24 dias sem que ninguém percebesse.

O dead-man's switch tinha sido construído por inteiro: emissor em Go com assinatura HMAC-SHA256,
dois planos independentes de ingestão, dois workflows, contratos de dados documentados, script de
decisão testado. A aferição de 2026-07-31 (`context/decisions/ADR-0042.yaml`, veredito então
`partially-realized`) inventariou essas peças uma a uma e concluiu que o desenho estava quase todo
de pé.

Estava. As peças existiam. **Só que o sistema nunca recebeu um único sinal para vigiar.**

---

## 2. Pergunta(s)

1. O mecanismo do ADR-0042 chegou a cumprir a função que motivou a decisão — detectar um job que
   morre em silêncio?
2. Se não, o que exatamente falhou: o desenho, a implementação ou a operação?
3. O que a próxima tentativa precisa resolver para não repetir o mesmo fim?

---

## 3. Investigação — o que foi medido

### 2026-08-17 — estado dos dados no repositório

| Arquivo                | Estado medido      | Leitura                                            |
| :--------------------- | :----------------- | :------------------------------------------------- |
| `deadman/history.jsonl` | **0 linhas**       | nenhum ping jamais ingerido, por nenhum dos 2 planos |
| `deadman/audit.jsonl`   | 22 linhas          | o auditor rodou e registrou veredito 22 vezes       |
| `deadman/emitters.json` | 1 emissor          | `sweeper-vps-qa`, limite de 2 dias                  |

O `history.jsonl` vazio é o achado central. Os dois planos de ingestão do ADR — Object Storage e
`repository_dispatch` — convergiam nesse arquivo. Zero linha significa que **nenhum dos dois nunca
recebeu nada**: o emissor Go foi escrito, testado e nunca implantado em lugar algum.

### 2026-08-17 — histórico de execuções do `deadman-audit`

| Métrica              | Valor                                     |
| :------------------- | :---------------------------------------- |
| Primeira execução    | 2026-07-01 — `success`                    |
| Última `success`     | 2026-07-23                                |
| Primeira `failure`   | 2026-07-24                                |
| Total                | 23 `success` · 25 `failure`               |

As 23 execuções bem-sucedidas produziram os 22 vereditos do `audit.jsonl` — todos em **bootstrap**,
o estado que o próprio script trata explicitamente como "não é morte" por não existir `last_seen`.
O auditor passou a vida confirmando, uma vez por dia, que nunca soubera de nada.

### 2026-08-17 — a causa do vermelho a partir de 24/07

```
remote: error: GH006: Protected branch update failed for refs/heads/main.
error: failed to push some refs to 'https://github.com/ERP-Bem-Comum/core-api'
##[error]Process completed with exit code 1
```

O último passo do workflow fazia `git push` na `main` — o commit de auditoria que servia de
*keep-alive* contra a suspensão de 60 dias que o GitHub aplica a workflows agendados. Quando a
proteção da `main` entrou (#523, Fase 2), o push passou a ser recusado.

---

## 4. Análise — três falhas distintas, e a terceira é a que ensina

**Falha 1 — operacional: o emissor nunca foi implantado.** O código estava pronto; o *deploy* nunca
aconteceu. Um detector de ausência sem fonte de sinal não detecta ausência. Isto sozinho já basta
para o mecanismo nunca ter funcionado, e é anterior a qualquer problema técnico.

**Falha 2 — de aferição: contamos peças, não função.** A verificação de 2026-07-31 conferiu se o
emissor existia, se o `Dockerfile` terminava em `FROM scratch`, se os dois workflows estavam lá — e
todas as respostas eram sim. Nenhuma pergunta foi "isto já detectou alguma coisa?". A evidência que
teria denunciado o problema estava a um `wc -l` de distância, no mesmo diretório que a aferição
citava. Ela chegou a registrar *"`deadman/history.jsonl` está no repo — o plano de fallback gravando
de fato"*: o arquivo existia, e disso concluiu-se que gravava. Estava vazio.

**Falha 3 — de desenho: o switch não tinha como anunciar a própria morte.** Esta é a que transcende
o caso. O único canal pelo qual o sistema se manifestava era o `git push` do keep-alive. Quando esse
push quebrou, o mecanismo perdeu simultaneamente a função *e* a voz — e ficou 24 dias em silêncio,
que é exatamente o modo de falha que um dead-man's switch existe para eliminar em **outros**
sistemas. Ele foi vítima da doença que deveria diagnosticar.

Vale notar que o próprio ADR-0042 já havia identificado a forma abstrata deste problema, na D2:
*"redundância na ingestão não é redundância na decisão"*. O que ele não previu foi que o decisor
também era o **notificador**, e que perder o canal de escrita cala as duas funções de uma vez.

---

## 5. O que a próxima solução precisa resolver

Requisitos derivados das três falhas acima. Um desenho que não responda aos cinco repete este fim:

1. **Provar recebimento antes de valer como vigilância.** O mecanismo só conta como ativo depois de
   registrar um sinal real de um emissor real. Antes disso é obra em andamento, e deve se declarar
   assim — nunca "implantado".
2. **O vigia precisa de quem o vigie.** Um detector cujo silêncio é indistinguível de "está tudo
   bem" não serve. Precisa haver caminho por onde a morte *dele* apareça — e não pode ser o mesmo
   caminho que ele usa para operar.
3. **Não depender de escrita no repositório.** Foi acoplamento a uma política (proteção de branch)
   que pode mudar por motivo alheio, e mudou. O keep-alive por commit amarra a sobrevivência do
   mecanismo às regras de governança do código.
4. **Aferição por função, não por inventário.** A pergunta de verificação é "quando foi o último
   sinal recebido?", não "os arquivos existem?".
5. **Custo de operação compatível com o valor.** O desenho anterior pedia emissor compilado,
   *deploy* próprio, Object Storage, dois workflows e contratos de dados — para vigiar **um** job.
   Foi caro o bastante para nunca ser terminado. Vale medir o que um serviço pronto de heartbeat
   resolveria, mesmo que o ADR-0042 os tenha rejeitado: aquela rejeição pesou controle, custo e
   privacidade contra um custo de construção que se assumiu pagável — e que, medido agora, não foi
   pago.

---

## 6. Situação do ADR-0042 — de pé, e sem substituto

O código foi removido em 2026-08-17 (2 workflows, script de decisão, teste, emissor Go, dados e o
doc de contratos — 1.970 linhas). A decisão **não** foi superada e segue `Accepted`:

- **Não se abriu ADR novo**, porque não há decisão nova a registrar. Não decidimos parar de detectar
  job morto — decidimos parar de manter um mecanismo que nunca detectou. O problema continua real e
  descoberto.
- **O ADR-0042 não é a solução**, e a partir de agora descreve algo que o código não tem. Essa
  divergência é conhecida e está registrada em dois lugares: no `assessment` de
  `context/decisions/ADR-0042.yaml` (veredito `unrealized`, aferido contra `d8599aaa`) e aqui.
- **Quando existir o desenho que satisfaça a §5**, ele vira ADR novo com `supersedes: [ADR-0042]`, e
  esta inquiry fecha como `decided` apontando para ele.

### Referências que ficaram apontando para arquivos removidos

Deliberadamente **não** foram reescritas, por serem registros datados — reescrevê-las seria apagar o
que era verdade quando foram escritas:

| Arquivo                                      | Natureza                                  |
| :------------------------------------------- | :---------------------------------------- |
| `context/decisions/ADR-0042.yaml` (`claims`)  | aferição de 2026-07-31 contra `722b0371`  |
| `context/decisions/_PROGRESS.md`              | diário da destilação, datado              |
| `context/planning/ASYNC-MESSAGING-STRATEGY.md` | pesquisa não-normativa de 2026-06-16      |
| `ARCHIVED-BRANCHES.md`                        | registro histórico de branches            |
| `handbook/specs/038/`, `040/`                 | specs congeladas                          |

O `handbook/architecture/adr/README.md` mantém o ADR-0042 listado como `Accepted`, que é o estado
declarado correto — ADR aceito não se edita.

---

## 7. Saídas pendentes

- [ ] Desenhar a substituição atendendo aos cinco requisitos da §5 — **sem dono e sem prazo**; o
      ponto cego (job que morre em silêncio) fica descoberto até lá.
- [ ] Decidir o destino das issues abertas do épico #67 que descreviam o mecanismo removido
      (#70, #71, #72 e o #368 dos 14 falsos positivos).
