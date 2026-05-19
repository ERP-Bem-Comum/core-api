---
entrevista: 0001
bloco: G
pergunta: G2
título: "isValidDate no domínio — defesa em profundidade ou paranoia?"
skill: ts-domain-modeler
status: pendente
---

# Pergunta_G2_tec_lider_using_skill_ts-domain-modeler

> **Status:** pendente
> **Origem:** entrevista 0001
> **Skill canônica:** `ts-domain-modeler`

---

## Q (host)

```ts
const assertValidEventDate = (at: Date): Result<Date, 'contract-invalid-event-date'> =>
  isValidDate(at) ? ok(at) : err('contract-invalid-event-date');
```

`isValidDate` é `!Number.isNaN(d.getTime())`. Defesa contra `new Date('foo')`. Mas se o input vem **validado da borda** (CLI parser, drizzle mapper), por que o domínio ainda valida?

- Considera defesa em profundidade útil ou paranoia que polui o tipo (`Date` virou "Date talvez inválido")?
- Branded `ValidDate = Brand<Date, 'ValidDate'>` resolveria, eliminando o assert do domínio?
- Princípio geral: **onde está a fronteira** depois da qual o domínio confia?

## R (PhD)

_pendente_

## Rules emergentes

_aguardando fechamento_

## Cross-refs

- [A4](./Pergunta_A4_tec_lider_using_skill_ts-domain-modeler.md) (fronteira do mapper), [G1](./Pergunta_G1_tec_lider_using_skill_ts-domain-modeler.md)
