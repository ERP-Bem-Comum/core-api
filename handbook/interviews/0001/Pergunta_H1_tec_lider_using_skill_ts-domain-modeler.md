---
entrevista: 0001
bloco: H
pergunta: H1
título: "Agregado-por-pasta vs feature slice"
skill: ts-domain-modeler
status: superseded
superseded_por: H1+H2+H3
---

# Pergunta_H1_tec_lider_using_skill_ts-domain-modeler

> ⚠️ **SUPERSEDED** — unificada com H2 e H3.
>
> **Veja a versão canônica:**
> - [`Pergunta_H1_H2_H3_tec_lider_using_skill_ts-domain-modeler.md`](./Pergunta_H1_H2_H3_tec_lider_using_skill_ts-domain-modeler.md)
>
> Resolução: **agregado-por-pasta** (4-6 arquivos: `types.ts`, `errors.ts`, `events.ts`, `<aggregate>.ts`, `repository.ts`, `index.ts`). `index.ts` barrel para `import * as Contract`. Sem feature slice (fragmenta state machine). Sem arquivo único (fere legibilidade).

---

## Q original (mantida para histórico)

> **Status:** pendente
> **Origem:** entrevista 0001
> **Skill canônica:** `ts-domain-modeler`

---

## Q (host)

```
domain/
├── shared/{money, period, ids, ...}.ts
├── contract/{types, events, errors, contract.ts}
└── amendment/{types, events, errors, amendment.ts}
```

Cada agregado tem 4 arquivos canônicos. Pra ler "o que `homologate` faz" abro 3 arquivos.

- Manter granularidade, colapsar em **um arquivo por agregado** (`contract.ts` único), ou inverter para **feature slice** (`homologate-amendment/`)?
- Como isso casa com "agregado é fronteira de invariante"? Pasta-por-agregado reforça visualmente; feature-slice atomiza.

## R (PhD)

_pendente_

## Rules emergentes

_aguardando fechamento_

## Cross-refs

- [H2](./Pergunta_H2_tec_lider_using_skill_ts-domain-modeler.md), [H3](./Pergunta_H3_tec_lider_using_skill_ts-domain-modeler.md)
