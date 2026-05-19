---
entrevista: 0001
bloco: E
pergunta: E2
título: "Acknowledgment muda o agregado? Evento reflete causa ou consequência?"
skill: ts-domain-modeler
status: pendente
---

# Pergunta_E2_tec_lider_using_skill_ts-domain-modeler

> **Status:** pendente
> **Origem:** entrevista 0001
> **Skill canônica:** `ts-domain-modeler`

---

## Q (host)

```ts
case 'Acknowledgment': {
  const next = { ...contract, homologatedAmendmentIds: nextIds } as unknown as ContractEntity;
  return ok({ contract: next, event: stateUpdatedEvent(next, at, adjustment.amendmentId) });
}
```

`Acknowledgment` (aditivo `Misc`) só anexa o ID no array — `currentValue` e `currentPeriod` não mudam. Mas o evento se chama `ContractStateUpdated`. Para um listener, parece que algo aconteceu, mas nada mudou em termos de invariante visível.

- Emitir evento diferente (`ContractAmendmentAcknowledged`) ou aceitar `ContractStateUpdated` "noisy"?
- Generalizando: até onde o evento deve refletir a **causa** (operação chamada) vs a **consequência** (o que mudou)?

## R (PhD)

_pendente_

## Rules emergentes

_aguardando fechamento_

## Cross-refs

- [E1](./Pergunta_E1_tec_lider_using_skill_ts-domain-modeler.md), [F1](./Pergunta_F1_tec_lider_using_skill_ts-domain-modeler.md)
