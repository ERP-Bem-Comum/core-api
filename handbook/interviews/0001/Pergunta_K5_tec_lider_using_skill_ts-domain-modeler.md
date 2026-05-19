---
entrevista: 0001
bloco: K
pergunta: K5
título: "satisfies vs as — pega chaves faltando que as engole"
skill: ts-domain-modeler
status: superseded
superseded_por: J+K+L
---

# Pergunta_K5_tec_lider_using_skill_ts-domain-modeler

> ⚠️ **SUPERSEDED** — unificada com J/K/L na pergunta de fechamento.
>
> **Veja a versão canônica:**
> - [`Pergunta_J_K_L_tec_lider_using_skill_ts-domain-modeler.md`](./Pergunta_J_K_L_tec_lider_using_skill_ts-domain-modeler.md)
>
> Resolução: **DO**. Pattern canônico em todo smart constructor: `const shape = { … } satisfies Omit<BrandedVO, '__brand'>; return ok(shape as BrandedVO);`. O `satisfies` pega chave faltando que `as` engole — validação **antes** do cast nominal. Complementa `updateAggregate` do Bloco A1 (que cobre o caso de atualização parcial via `Partial<Omit<…>>`).

---

## Q original (mantida para histórico)

> **Status:** pendente
> **Origem:** entrevista 0001
> **Skill canônica:** `ts-domain-modeler`

---

## Q (host)

Em `contract.ts:54-67`, podia ser:

```ts
const contract = {
  id: input.id,
  ...
} satisfies Omit<ContractShape, '__brand'>;
return ok(contract as Contract);
```

- `satisfies` pega erros de chave faltando que o `as unknown as` engole.
- Adoção sistemática vai cortar bugs reais?
- Como casa com `updateAggregate(prev, patch)` do A1 (que já resolve isso via tipo)?

## R (PhD)

_pendente_

## Rules emergentes

_aguardando fechamento_

## Cross-refs

- [A1](./Pergunta_A1_tec_lider_using_skill_ts-domain-modeler.md) (helper updateAggregate já dá excess property check)
