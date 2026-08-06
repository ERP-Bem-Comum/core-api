---
inquiry: 0024
title: "Inquiry 0024 — ADR como contexto de agente: o que o campo convergiu, e onde estamos fora"
state: decided
last_reviewed: 2026-08-06
---

[← Voltar para Inquiries](./README.md)

# Inquiry 0024 — ADR como contexto de agente: o que o campo convergiu, e onde estamos fora

- **Data:** 2026-07-31
- **Gatilho:** Ao iniciar o hardening de `.claude/`, o dono do repo suspendeu uma decisão em curso com a pergunta certa: _"errei no jeito que estamos encarando os ADRs — pode ver como os ADRs em questão de política/filosofia e formato estão sendo usados para LLMs e principalmente para o Claude Code nos últimos meses?"_ A suspeita se confirmou: a decisão que eu havia formulado ("ADR vence ou código vence?") era um **falso dilema**.
- **Método:** Pesquisa web (o recorte "últimos meses" cai depois do cutoff de conhecimento do modelo) + teoria canônica via MCP `acdg-skills`, citada literalmente com verificação de grounding. Confrontada com o inventário de 55 ADRs em [`context/decisions/`](../../context/decisions/) e com a auditoria em [`context/HARNESS-AUDIT-2026-07-31.md`](../../context/HARNESS-AUDIT-2026-07-31.md).

---

## Veredito central

**O campo convergiu numa separação de ARTEFATOS, não numa hierarquia de autoridade.** A pergunta "quem
vence quando ADR e código discordam" não é a pergunta certa — ela pressupõe que ADR e regra operacional
são o mesmo artefato. São dois, com mutabilidades opostas:

|                     | **ADR**                             | **Spec / `AGENTS.md` / rules**     |
| ------------------- | ----------------------------------- | ---------------------------------- |
| Propósito           | registrar **por que** decidimos     | definir **como funciona agora**    |
| Mutabilidade        | **imutável** — supersede, não edita | **vivo** — atualizado com o código |
| Papel para o agente | **contexto de restrição** no plano  | **instrução operacional**          |

Formulação mais limpa encontrada, em [ASDLC](https://asdlc.io/patterns/the-adr/): _"An ADR captures
thinking at a specific moment. A spec evolves with implementation."_ E o fechamento, em
[Rick Pollick](https://rickpollick.com/blog/adr-comeback-anchoring-agentic-engineering-teams):
_"An ADR is never deleted. Status changes. The record stays."_

**Consequência: ADR não é a fonte de instrução do agente.** É o "por quê" que impede o agente de
refatorar uma razão para fora. O "o que fazer" mora em outro artefato.

---

## Onde estamos fora

`AGENTS.md:19` — _"Quando código e handbook discordam, **o handbook vence**"_ — e `AGENTS.md:23` coloca
ADRs na **posição 1 de uma hierarquia de instruções** (_"ADRs aceitos, IMUTÁVEIS, vencem tudo"_). E a
spec 039 destilou as `.claude/rules/` **a partir dos ADRs**, não do código.

Fizemos do registro histórico a fonte de instrução. Os números da auditoria são a consequência direta:
**11 rules FALSAS** (mandam fazer o que o código não faz) e **21 alegações `contradicted`** no inventário.

Aplicada literalmente, a regra do `AGENTS.md` manda reverter a consolidação de workers 6→3 — que existe
**por causa** do incidente `handbook/incidents/0001-prod-rds-connection-exhaustion-2026-07-10.md`
(56/60 conexões, severidade Alta). Obedecer o documento reproduziria um quase-outage.

---

## O nome do que encontramos: _agentic drift_

O termo emergiu no período e descreve exatamente o achado: _"uma erosão lenta e plausível da intenção
arquitetural, cometida em PRs pequenos, cada um parecendo um refactor razoável por si"_. O exemplo
canônico que a literatura usa é literalmente o nosso caso: _"the bug from the 2024 incident comes back
because nobody told the agent the bug had ever happened."_

E o argumento de por que ADRs passam a valer **mais** com agentes, não menos
([Rick Pollick](https://rickpollick.com/blog/adr-comeback-anchoring-agentic-engineering-teams)): agentes
produzem código arquiteturalmente significativo em volume, _"from a process that has no memory of why the
existing design exists"_. O ADR externaliza a memória institucional que o agente não tem por intuição.

A assimetria que muda o cálculo: no mundo em que o custo do drift era limitado pela velocidade da
digitação humana, o decaimento era sobrevivível. **Agentes não digitam devagar.**

---

## Validação inesperada: nosso formato já é o emergente

O [actual.ai](https://www.actual.ai/blog/agent-optimized-adrs) descreve o "agent-optimized ADR" com cinco
recomendações. O [`context/decisions/SCHEMA.md`](../../context/decisions/SCHEMA.md) que construímos nesta
sessão, sem conhecer o artigo, atende **quatro**:

| Recomendação                                      | Nosso `SCHEMA.md`        |
| ------------------------------------------------- | ------------------------ |
| `applies_to` com globs de arquivo                 | ✅ `applies_to: [glob]`  |
| MUST / MUST NOT imperativo                        | ✅ `rule.text`           |
| IDs estáveis para citar em review/commit          | ✅ `ADR-NNNN-Cn`         |
| comandos de verificação (grep/lint)               | ✅ `reality.verify`      |
| **≤ ~200 linhas por registro** (token-efficiency) | ❌ os nossos têm 300–500 |

O único gap é tamanho — e é material: 55 registros × 300–500 linhas é contexto que não cabe barato.

**Nota de tensão não resolvida:** o mesmo artigo mantém a imutabilidade clássica (_"You do not edit an
accepted decision, you supersede it with a new one"_) **e** propõe um agente de arquitetura que atualiza
os ADRs _"as the codebase changes underneath them"_. As duas coisas não fecham. Se o ADR carrega
`applies_to` + MUST + comando de verificação, ele **é** a instrução viva — e instrução viva precisa ser
editada. É o mesmo colapso que a nossa opção 2 (abaixo) representa.

---

## A camada que não temos: governança

[Codex/Vaughan](https://codex.danielvaughan.com/2026/04/28/codex-cli-architecture-decision-records-adr-automated-governance/)
nomeia o problema como _agent-architecture gap_ — _"Agents scaffold systems in minutes; teams need hours
or days to audit them"_ — e propõe três camadas:

1. **`AGENTS.md`** listando as decisões que o agente deve honrar;
2. **hook `PostToolUse`** verificando o código gerado contra os ADRs aceitos, **antes** da implementação;
3. **fitness function em CI** revisando PR contra os registros e sinalizando violação.

Temos (1) mal-formado e **não temos (2) nem (3)**. Nossa auditoria produziu os achados; nada impede que
voltem. Vale registrar que a diretriz do dono do repo já apontava para cá:
_"enforcement mecânico > regra em .md — regra que não bloqueia não vale."_

---

## Teoria canônica

Uncle Bob, _Código Limpo_, p. 280, §C2 (citação literal via MCP `acdg-skills`, grounding 6/6 termos):

> **C2: Comentário obsoleto**
>
> Um comentário que ficou velho, irrelevante e incorreto é obsoleto. Comentários ficam velhos muito
> rápido, logo é melhor não escrever um que se tornará obsoleto. Caso você encontre um, é melhor
> atualizá-lo ou se livrar dele o quanto antes. Comentários obsoletos tendem a se desviar do código que
> descreviam. **Eles se tornam ilhas flutuantes de irrelevância no código e passam informações erradas.**

A escala é o que muda o peso: uma `.claude/rules/` falsa não é uma ilha de irrelevância — é uma
**instrução que um agente obedece**. E a auditoria achou o mesmo defeito em duas ocorrências
independentes de comentário no `src/` (o "fica para F-Plus" do `ADR-0041-C4`, e o gate LGPD em
`reports/adapters/http/plugin.ts:193` que promete proteção que a rota não aplica), o que faz disso padrão
do repositório, não acidente.

---

## Opções derivadas (para a Decisão 1 do hardening — NÃO escolhidas)

Registradas em [`context/HARNESS-AUDIT-2026-07-31.md`](../../context/HARNESS-AUDIT-2026-07-31.md)
§"Decisões pendentes". Resumo:

1. **Separar por papel** — ADR imutável = memória; rules derivadas do **código** verificado, ADR como
   restrição. Divergência = ADR corretivo faltando. _É o padrão que este inquiry documenta._
2. **Colapsar** — matar `.claude/rules/` e pôr tudo no ADR com `applies_to`. Uma fonte só, mas quebra a
   imutabilidade (ver §"tensão não resolvida" acima).
3. **Manter derivação do ADR + gate de CI** que falhe em claim `absent`/`contradicted`.
4. **Mecanismo primeiro** — o mecanizável sai do texto; rules só carregam o inauditável.

---

## Referências

- [ASDLC — The ADR](https://asdlc.io/patterns/the-adr/) — a tabela spec (living) × ADR (immutable); ADR
  como _constraint context_, não instrução operacional.
- [Rick Pollick — The ADR Comeback: Anchoring Agentic Engineering Teams](https://rickpollick.com/blog/adr-comeback-anchoring-agentic-engineering-teams)
  — _agentic drift_; ADR como deliverable do trabalho do agente; _"An ADR is never deleted."_
- [Actual AI — ADRs for Coding Agents: Architectural Context, Optimized](https://www.actual.ai/blog/agent-optimized-adrs)
  — as 5 recomendações de formato (`applies_to`, MUST, IDs estáveis, comandos de verificação, ≤200 linhas).
- [Codex Knowledge Base — ADRs with Codex CLI: the Agent-Architecture Gap](https://codex.danielvaughan.com/2026/04/28/codex-cli-architecture-decision-records-adr-automated-governance/)
  — as 3 camadas de governança (AGENTS.md · PostToolUse hook · CI fitness function).
- [AI Advances — AGENTS.md vs Architecture Decision Records](https://ai.gopubby.com/agents-md-is-the-ew-architecture-decision-record-adr-3cfb6bdd6f2c)
  — não lido integralmente (paywall de redirect); citado pelos resultados de busca.
- Robert C. Martin, _Código Limpo_, p. 280 §C2 — `shared-references/clean-code/codigo-limpo--uncle-bob.md:10000`.
