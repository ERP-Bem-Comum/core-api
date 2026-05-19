---
entrevista: 0001
bloco: G
pergunta: G1
título: "Date no domínio — Temporal, branded Instant, ou clock port?"
skill: ts-domain-modeler
status: pendente
---

# Pergunta_G1_tec_lider_using_skill_ts-domain-modeler

> **Status:** pendente
> **Origem:** entrevista 0001
> **Skill canônica:** `ts-domain-modeler`

---

## Q (host)

`Period.start: Date`, `Contract.signedAt: Date`, `Amendment.createdAt: Date`. JS `Date` é mutável, timezone-aware, IEEE-irregular.

- Trocar tudo por **Temporal** (TC39 Stage 3) — `Temporal.Instant` para timestamps, `Temporal.PlainDate` para `signedAt`?
- Branded type `Instant = Brand<number, 'Instant'>` (epoch ms) e o domínio só lida com number puro?
- Onde fica o **tempo do clock** (`new Date()`) — Clock port no domain? Na application? Como empurra `now` pra fora sem DI ceremony?

## R (PhD)

_pendente_

## Rules emergentes

_aguardando fechamento_

## Cross-refs

- [G2](./Pergunta_G2_tec_lider_using_skill_ts-domain-modeler.md), [H2](./Pergunta_H2_tec_lider_using_skill_ts-domain-modeler.md) (Clock port — domain ou application?)
