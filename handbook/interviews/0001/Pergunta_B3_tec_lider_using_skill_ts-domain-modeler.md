---
entrevista: 0001
bloco: B
pergunta: B3
título: "`Money.zero()` é função ou constante?"
skill: ts-domain-modeler
status: superseded
superseded_por: B1+B2+B3
---

# Pergunta_B3_tec_lider_using_skill_ts-domain-modeler

> ⚠️ **SUPERSEDED** — esta pergunta foi unificada com B1 e B2 porque as três decisões se trancam mutuamente.
>
> **Veja a versão canônica:**
> - [`Pergunta_B1_B2_B3_tec_lider_using_skill_ts-domain-modeler.md`](./Pergunta_B1_B2_B3_tec_lider_using_skill_ts-domain-modeler.md)
> - [`Pergunta_B1_B2_B3_followup_tec_lider_using_skill_ts-domain-modeler.md`](./Pergunta_B1_B2_B3_followup_tec_lider_using_skill_ts-domain-modeler.md)
>
> Bloco B fechado: **identidade como constante** (`ZERO`, `EMPTY`, `INFINITY`) via facade `immutable()` em `shared/immutable.ts` — esconde `Object.freeze`. Monoid identity é valor, não ação.

---

## Q original (mantida para histórico)

> **Status:** pendente
> **Origem:** entrevista 0001
> **Skill canônica:** `ts-domain-modeler`

---

## Q (host)

```ts
zero: (): Money => ({ cents: 0 }) as Money,
```

Por que função em vez de `Money.ZERO`? Object literal frozen, custo zero, semântica idêntica.

- Função para sinalizar "intencional" ou prefere constante?
- Há algum caso onde a função se justifica (Date.now-like, fresh allocation, freezable singletons)?

## R (PhD)

_pendente_

## Rules emergentes

_aguardando fechamento_

## Cross-refs

- [B1](./Pergunta_B1_tec_lider_using_skill_ts-domain-modeler.md)
