---
entrevista: 0001
bloco: F
pergunta: F1
título: "Discriminated union em events.ts — nivelar ou aninhar?"
skill: ts-domain-modeler
status: pendente
---

# Pergunta_F1_tec_lider_using_skill_ts-domain-modeler

> **Status:** pendente
> **Origem:** entrevista 0001
> **Skill canônica:** `ts-domain-modeler`

---

## Q (host)

```ts
type ContractEvent =
  | { type: 'ContractCreated'; contractId; occurredAt }
  | { type: 'ContractEnded'; contractId; occurredAt; kind: 'Expired' | 'Terminated' }
  | { type: 'ContractStateUpdated'; contractId; occurredAt; amendmentId; newCurrentValue; newCurrentPeriod };
```

`ContractEnded.kind: 'Expired' | 'Terminated'` é **segundo nível** de discriminação dentro de um caso da primeira união.

- Nivelar (`ContractExpired`, `ContractTerminated`) ou manter aninhamento? Pró-nivelar: cada handler subscreve a um único evento. Pró-aninhamento: agrupa conceito.
- Eventos carregam **estado pós-mudança** (`newCurrentValue`) ou só **a mudança** (`valueDelta`)? Idempotência do consumidor vs verbosidade.
- Quando faz sentido payload "redundante" com o agregado (ex.: `contractId` que o consumidor já obtém via outro lugar)? Princípio de design?

## R (PhD)

_pendente_

## Rules emergentes

_aguardando fechamento_

## Cross-refs

- [E1](./Pergunta_E1_tec_lider_using_skill_ts-domain-modeler.md), [E2](./Pergunta_E2_tec_lider_using_skill_ts-domain-modeler.md), [D3+D4](./Pergunta_D3_D4_tec_lider_using_skill_ts-domain-modeler.md) (`type` vs `tag`)
