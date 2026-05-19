---
entrevista: 0001
bloco: B
pergunta: B1
título: "Namespace-objeto vs free functions vs module-pattern"
skill: ts-domain-modeler
status: superseded
superseded_por: B1+B2+B3
---

# Pergunta_B1_tec_lider_using_skill_ts-domain-modeler

> ⚠️ **SUPERSEDED** — esta pergunta foi unificada com B2 e B3 porque as três decisões se trancam mutuamente (export pattern + parse pattern + identity pattern).
>
> **Veja a versão canônica:**
> - [`Pergunta_B1_B2_B3_tec_lider_using_skill_ts-domain-modeler.md`](./Pergunta_B1_B2_B3_tec_lider_using_skill_ts-domain-modeler.md) — pergunta unificada + R do PhD
> - [`Pergunta_B1_B2_B3_followup_tec_lider_using_skill_ts-domain-modeler.md`](./Pergunta_B1_B2_B3_followup_tec_lider_using_skill_ts-domain-modeler.md) — 5 tensões fechadas + naming `immutable`
>
> Bloco B fechado: **Padrão D (module-as-namespace) vence**. Migração via codemod `ts-morph` em ticket `CTR-DOMAIN-IMPORT-CODEMOD`.

---

## Q original (mantida para histórico)

> **Status:** pendente — aguardando resposta do PhD
> **Origem:** entrevista 0001
> **Skill canônica:** `ts-domain-modeler`

---

## Q (host)

```ts
export const Money = {
  fromCents: (cents: number): Result<Money, MoneyError> => { … },
  zero:      (): Money => …,
  add:       (a: Money, b: Money): Money => …,
  subtract:  (a: Money, b: Money): Result<Money, 'money-negative-result'> => …,
  equals, greaterThan,
};
```

**Pró:** agrupa, autocomplete limpo, leitura natural (`Money.add(a, b)`).
**Contra:** perde tree-shaking (toda referência arrasta o objeto inteiro), declaration merging informal entre tipo `Money` e const `Money`, perde currying.

- Manter ou migrar para free functions (`moneyFromCents`, `moneyAdd`)?
- Submódulo separado para tipo (`money.types.ts`)?
- Function-as-constructor: `function Money(cents): Result<Money, MoneyError>` + `Money.add` no const homônimo via declaration merging?

## R (PhD)

_pendente_

## Rules emergentes

_aguardando fechamento_

## Cross-refs

- Conecta com [B2](./Pergunta_B2_tec_lider_using_skill_ts-domain-modeler.md) (Parse-don't-validate vs Zod no construtor).
