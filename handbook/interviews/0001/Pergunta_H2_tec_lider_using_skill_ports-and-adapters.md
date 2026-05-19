---
entrevista: 0001
bloco: H
pergunta: H2
título: "Ports moram em application/ports — Evans/Cockburn estariam de acordo?"
skill: ports-and-adapters
status: superseded
superseded_por: H1+H2+H3
---

# Pergunta_H2_tec_lider_using_skill_ports-and-adapters

> ⚠️ **SUPERSEDED** — unificada com H1 e H3.
>
> **Veja a versão canônica:**
> - [`Pergunta_H1_H2_H3_tec_lider_using_skill_ts-domain-modeler.md`](./Pergunta_H1_H2_H3_tec_lider_using_skill_ts-domain-modeler.md)
>
> Resolução: **híbrida**. Critério objetivo: *"port ditado por invariância/ciclo-de-vida de Agregado?"*. Sim → `domain/<aggregate>/repository.ts`. Não → `application/ports/`. `Repository` vai pro `domain/`; `EventBus`, `DocumentStorage`, `Clock`, `NumberSequencer` (genérico) ficam em `application/ports/`.

---

## Q original (mantida para histórico)

> **Status:** pendente
> **Origem:** entrevista 0001
> **Skill canônica:** `ports-and-adapters` (cross com `ts-domain-modeler`)

---

## Q (host)

A SKILL/CLAUDE.md põe ports em `application/ports/`. Em ports & adapters clássico (Cockburn), ports são definidos **pelo lado de dentro** — pelo domínio.

- `ContractRepository` é "interesse do domínio" (vive em `domain/contract/repository.ts`) ou "interesse do use case" (vive em `application/ports/`)?
- Argumento pro domain: agregado é dono da invariante de persistência. Argumento pra application: domínio não sabe que é persistido.
- Adotar regra "**Repository fica em `domain/`, todo o resto (EventBus, Storage, Clock) em `application/ports/`**" — porque Repository é por agregado e outros são genéricos? Faz sentido ou é arbitrário?

## R (PhD)

_pendente_

## Rules emergentes

_aguardando fechamento_

## Cross-refs

- [H1](./Pergunta_H1_tec_lider_using_skill_ts-domain-modeler.md), [G1](./Pergunta_G1_tec_lider_using_skill_ts-domain-modeler.md) (Clock port localização)
- ADR-0006 (modular monolith + P&A)
