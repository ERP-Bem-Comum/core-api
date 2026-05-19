---
entrevista: 0001
bloco: B
pergunta: B2
título: "Parse, don't validate no smart constructor — Result homemade vs Zod/Effect Schema"
skill: ts-domain-modeler
status: superseded
superseded_por: B1+B2+B3
---

# Pergunta_B2_tec_lider_using_skill_ts-domain-modeler

> ⚠️ **SUPERSEDED** — esta pergunta foi unificada com B1 e B3 porque as três decisões se trancam mutuamente.
>
> **Veja a versão canônica:**
> - [`Pergunta_B1_B2_B3_tec_lider_using_skill_ts-domain-modeler.md`](./Pergunta_B1_B2_B3_tec_lider_using_skill_ts-domain-modeler.md)
> - [`Pergunta_B1_B2_B3_followup_tec_lider_using_skill_ts-domain-modeler.md`](./Pergunta_B1_B2_B3_followup_tec_lider_using_skill_ts-domain-modeler.md)
>
> Bloco B fechado: **Zod vive no Adapter/Borda. Smart constructor do domínio mantém ifs manuais + tagged errors com payload**. `bigint` é decisão domain-driven, não DB-driven.

---

## Q original (mantida para histórico)

> **Status:** pendente
> **Origem:** entrevista 0001
> **Skill canônica:** `ts-domain-modeler`

---

## Q (host)

```ts
fromCents: (cents: number): Result<Money, MoneyError> => {
  if (!Number.isInteger(cents)) return err('money-non-integer-value');
  if (cents < 0) return err('money-negative-value');
  if (cents > Number.MAX_SAFE_INTEGER) return err('money-exceeds-safe-integer');
  return ok({ cents } as Money);
},
```

- Manter `Result<T, E>` homemade ou migrar para **Effect Schema / Zod**, onde o erro é uma árvore tipada e a definição vira *fonte única* (tipo + parser + json schema + form validators tudo derivado)?
- Tradeoff: zero deps vs aceitar Effect/Zod no domínio. Linha do PhD: Zod é "infra" ou "co-domínio"?
- `cents > MAX_SAFE_INTEGER` gateado ou migrar para `bigint` no domínio (Drizzle suporta hoje)?

## R (PhD)

_pendente_

## Rules emergentes

_aguardando fechamento_

## Cross-refs

- [B1](./Pergunta_B1_tec_lider_using_skill_ts-domain-modeler.md) (shape do smart constructor).
- [A2](./Pergunta_A2_tec_lider_using_skill_ts-domain-modeler.md) (PhD já endossou Zod na borda).
