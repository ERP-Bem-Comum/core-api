---
entrevista: 0001
bloco: D
pergunta: D3+D4
título: "Forma canônica de Domain Error — discriminator, naming, builder, formatter, asserção"
skill: ts-domain-modeler
status: pendente
---

# Pergunta_D3_D4_tec_lider_using_skill_ts-domain-modeler

> **Status:** pendente — pergunta unificada (D3 = forma; D4 = naming) já formulada e aguardando resposta
> **Origem:** entrevista 0001 (follow-up de D1)
> **Skill canônica:** `ts-domain-modeler`

---

## Q (host) — versão narrativa (para colar em chat externo)

Cara, fui aplicar o que a gente fechou no D1 e bati em decisão na **primeira linha** que tentei escrever. Mostro o conflito com código real:

```ts
// events.ts — JÁ existe assim
type ContractEvent =
  | { type: 'ContractCreated';      contractId; occurredAt }
  | { type: 'ContractEnded';        contractId; occurredAt; kind: 'Expired' | 'Terminated' }
  | { type: 'ContractStateUpdated'; contractId; occurredAt; amendmentId; newCurrentValue; newCurrentPeriod };

// errors.ts — versão que eu tava prestes a escrever
type ContractError =
  | { tag:  'ContractCannotExpireYet'; currentEnd: Date; attemptedAt: Date }
  | { tag:  'ContractNotActive';       currentStatus: ContractStatus }
  | { tag:  'AmendmentAlreadyApplied'; amendmentId: AmendmentId };
```

Parei de digitar. Olhei pros dois lado a lado e percebi que **visualmente eles são quase indistinguíveis** — PascalCase pra evento, PascalCase pra erro, payload nos dois, discriminados nos dois. A única diferença textual é `type` vs `tag`. Cinco dúvidas práticas surgem juntas:

**1. `type` vs `tag` discrimina o quê de verdade?** Reservei `type` pra eventos. Mas se ambos são Choice Types, devia uniformizar (`type` em todo lugar), ou a diferença lexical ajuda o leitor humano? Tem precedente forte (Wlaschin, Effect, redux, Elm) que você copiaria?

**2. Como nomear o "código" do erro?**

```
'contract-not-active'      // kebab           — hoje, fácil pro log antigo
'ContractNotActive'         // PascalCase     — paralelo com eventos, casa com tipo
'Contract.NotActive'        // dot-notation   — namespace explícito
'CTR_NOT_ACTIVE'            // SCREAMING      — código C/Java
'contract.not-active'       // dot + kebab    — Sentry/Datadog-friendly
```

Existe critério funcional pra decidir?

**3. Builder helper — açúcar útil ou clutter OO disfarçado?**

```ts
// A — literal direto
return err({ tag: 'ContractCannotExpireYet', currentEnd, attemptedAt });

// B — builder
const ContractError = {
  cannotExpireYet: (currentEnd, attemptedAt): ContractError =>
    ({ tag: 'ContractCannotExpireYet', currentEnd, attemptedAt }),
};
```

Wlaschin usa construtores de caso em F# o tempo todo — B é equivalente, ou tem diferença categorial?

**4. Onde mora a tradução PT-BR?** Formatter externo com `switch (e.tag)` exaustivo, ou anotação no próprio tipo (estilo Effect Schema `annotations({ message })`)? Pro nosso porte (ERP médio, 1 idioma), qual o ponto-ótimo?

**5. Teste — como assertar?**

```ts
// A — só tag
expect(result.error.tag).toBe('ContractCannotExpireYet');
// B — payload inteiro
expect(result.error).toEqual({ tag: 'ContractCannotExpireYet', currentEnd: …, attemptedAt: … });
// C — match parcial
expect(result.error).toMatchObject({ tag: 'ContractCannotExpireYet', currentEnd: expectedDate });
```

Você extrairia uma **regra de teste**?

---

Confesso: essas cinco perguntas são uma só. Existe **forma canônica de Domain Error em DDD funcional** que você defenderia como template universal — ou cada time decide, e o que importa é só consistência interna? Se tem forma canônica, manda completo. Se não, me ajuda a desenhar o **nosso** — vou cravar no SKILL.md e novos devs vão copiar pelos próximos 5 anos.

## R (PhD)

_pendente_

## Rules emergentes

_aguardando fechamento_

## Cross-refs

- [D1](./Pergunta_D1_tec_lider_using_skill_ts-domain-modeler.md) (tagged records ratificados)
- [F1](./Pergunta_F1_tec_lider_using_skill_ts-domain-modeler.md) (eventos usam `type` hoje — eventual unificação)
