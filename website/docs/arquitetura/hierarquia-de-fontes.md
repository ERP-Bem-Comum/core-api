---
sidebar_position: 4
title: Hierarquia de fontes
description: Quando duas fontes do projeto discordam, quem vence — e por quê.
---

# Hierarquia de fontes

Num projeto com ADRs, handbook, regras de camada, agentes e skills, é inevitável que
duas fontes eventualmente discordem. A regra de desempate é explícita e vale para tudo:

```
1. handbook/architecture/adr/        ← ADRs aceitos, IMUTÁVEIS, vencem tudo
2. handbook/ (domínio, reference/<tech>/, inquiries)
3. CLAUDE.md + .claude/rules/*.md     (regras transversais e por camada)
4. .claude/agents/<agent>.md          (especialistas em tecnologia)
5. .claude/skills/<skill>/SKILL.md    (como aplicar as regras)
6. .claude/skills/<skill>/references/ (docs externas, citadas, não normativas)
```

Quanto mais alto, mais forte. Quando o **código** diverge do **handbook**, o handbook
vence — e o código é o que precisa mudar.

## ADRs são imutáveis

Um ADR aceito **nunca é editado**. Para mudar uma decisão, abre-se um **novo** ADR que
declara `supersedes` o anterior, e o anterior recebe um banner de "superseded". A
mudança é registrada em `handbook/CHANGELOG.md`. Assim a história das decisões
permanece auditável — você consegue ler não só o que decidimos, mas o que decidimos
_antes_ e por que mudamos.

Exemplos reais dessa cadeia:

- ADR-0003 (banco compartilhado) → **superseded** por ADR-0014 (isolamento por prefixo)
- ADR-0004 (Postgres outbox) → **superseded** por ADR-0015 (MySQL outbox)
- ADR-0018 (dual-dialect Drizzle) → **superseded** por ADR-0020 (MySQL único)
- ADR-0007 (multi-cloud) → **superseded** por ADR-0021 (AWS primária + Magalu)

## Por que tanta cerimônia

A hierarquia existe para que decisões não se percam em conversas de Slack ou no
conhecimento tácito de uma pessoa. Um novo desenvolvedor (ou agente de IA) consegue
reconstruir o _porquê_ de qualquer escolha lendo a fonte certa — e sabe, sem ambiguidade,
qual fonte mandar quando há conflito.

:::info
Veja a lista completa e navegável dos 28 ADRs no
[catálogo de decisões](/decisoes/catalogo).
:::
