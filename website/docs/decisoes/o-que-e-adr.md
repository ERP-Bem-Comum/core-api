---
sidebar_position: 1
title: O que é um ADR
description: Como o projeto registra decisões arquiteturais — e por que elas são imutáveis.
---

# O que é um ADR

Um **ADR** (Architecture Decision Record) é um registro curto e datado de uma decisão
arquitetural: o contexto que a motivou, a decisão tomada e as consequências aceitas.
No `core-api`, os ADRs vivem em `handbook/architecture/adr/` e são o **topo da
hierarquia de fontes** — vencem o CLAUDE.md, as skills, os agentes e o próprio código.

## As três regras dos ADRs

1. **São imutáveis.** Um ADR aceito nunca é editado. Para mudar uma decisão, abre-se um
   **novo** ADR que declara `supersedes` o anterior.
2. **A história é preservada.** O ADR antigo recebe um banner de "superseded" e
   continua legível. Você consegue reconstruir não só o que decidimos, mas o que
   decidimos antes e por que mudamos.
3. **Toda mudança é registrada** em `handbook/CHANGELOG.md`.

## Por que tanta cerimônia

Decisões arquiteturais são caras de reverter e fáceis de esquecer. Sem um registro,
o _porquê_ de uma escolha vira conhecimento tácito — mora na cabeça de uma pessoa e se
perde quando ela sai. Os ADRs tornam o raciocínio auditável: um novo dev (ou um agente
de IA) consegue entender qualquer escolha lendo a fonte, e sabe exatamente qual fonte
manda quando há conflito.

## A cadeia de supersedes

Quatro decisões já evoluíram por substituição — um bom retrato de como o projeto
amadureceu:

| Decisão antiga                  | Substituída por                      |
| :------------------------------ | :----------------------------------- |
| ADR-0003 — banco compartilhado  | ADR-0014 — isolamento por prefixo    |
| ADR-0004 — Postgres outbox      | ADR-0015 — MySQL outbox              |
| ADR-0007 — multi-cloud AWS+GCP  | ADR-0021 — AWS primária + Magalu PBE |
| ADR-0018 — dual-dialect Drizzle | ADR-0020 — MySQL como único dialeto  |

Veja todos os 28 no [catálogo](/decisoes/catalogo).
