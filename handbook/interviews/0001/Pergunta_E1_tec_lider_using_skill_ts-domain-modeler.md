---
entrevista: 0001
bloco: E
pergunta: E1
título: "{ entity, event } é domínio ou mini event-sourcing-by-hand?"
skill: ts-domain-modeler
status: pendente
---

# Pergunta_E1_tec_lider_using_skill_ts-domain-modeler

> **Status:** pendente
> **Origem:** entrevista 0001
> **Skill canônica:** `ts-domain-modeler`

---

## Q (host)

```ts
type CommandOutput = Readonly<{
  contract: ContractEntity;
  event: ContractEvent;
}>;
```

Toda função canônica do agregado retorna isso — calcula novo estado E emite evento, como se fossem dois fatos diferentes, mas descrevem a mesma transição.

- Defender **event sourcing puro** (a função só retorna o evento, e o estado é projeção via `apply(state, event)`)? Vale o custo no porte do Contracts?
- Se não-ES, defende `CommandOutput` ou separa derivação do evento (`Contract.eventOf(prev, next)`)?
- Quando estado e evento divergem — risco de retornar dois objetos correlacionados que precisam ficar em sync?

## R (PhD)

_pendente_

## Rules emergentes

_aguardando fechamento_

## Cross-refs

- [E2](./Pergunta_E2_tec_lider_using_skill_ts-domain-modeler.md), [F1](./Pergunta_F1_tec_lider_using_skill_ts-domain-modeler.md)
