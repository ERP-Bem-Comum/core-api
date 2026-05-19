---
entrevista: 0001
bloco: A
pergunta: A1
título: "O cast `as unknown as T` é mentira ou disciplina?"
skill: ts-domain-modeler
status: respondida
---

# Pergunta_A1_tec_lider_using_skill_ts-domain-modeler

> **Status:** respondida ✅
> **Origem:** entrevista 0001 — Modernização do Domínio (DDD Funcional)
> **Skill canônica:** `ts-domain-modeler`
> **Índice:** [`../0001-functional-ddd-domain-refresh.md`](../0001-functional-ddd-domain-refresh.md)

---

## Q (host)

Em `contract/contract.ts:67, 96, 118, 152, 162, 180, 187` aparece o padrão:

```ts
const next = {
  ...contract,
  status: 'Expired',
  endedAt: at,
} as unknown as ContractEntity;
```

O `Brand<>` por construção exige um cast em algum ponto — mas aqui o cast acontece **toda vez que o agregado muda de estado**, e o objeto passa por `as unknown` (apagando o tipo) antes de virar `ContractEntity`. Isso bypassa qualquer narrowing que o TS poderia oferecer.

- Aceitável como "preço do brand" ou pegada de boilerplate que mascara erros?
- Existe padrão mais defensivo (helper `rebrand<T>(prev: T, patch: Partial<Unbrand<T>>): T`)?
- Migrar para nominal types via `unique symbol` reduziria a dor?

## R (PhD)

É **boilerplate perigoso**. O TS remove `as` em tempo de compilação sem verificação em runtime — desativa excess property checking e perde o aviso quando esquece-se de atualizar uma propriedade. Defende o helper como excelente alternativa: a função `updateContract(prev, patch)` obriga o TS a validar o `patch` contra a estrutura real (`Partial<Unbrand<T>>`), garantindo narrowing e excess-property-check antes de reaplicar o carimbo num único ponto auditado. Sobre `unique symbol`: melhora ergonomia (mensagens de erro mais limpas, sem intersecção com phantom string), mas qualquer nominalização em TS exige cast em algum ponto — a chave é **encapsular esse cast** para que o código de negócio nunca toque em `as`.

## Rules emergentes

- **DO:** Encapsular cast `as` num único ponto auditado por VO (smart constructor).
- **DO:** Em transição de estado, usar helper `updateAggregate(prev, patch)` com `Partial<Omit<Aggregate, …imutáveis>>`.
- **DON'T:** `as unknown as T` em código de negócio.

## Cross-refs

- Conecta com [A3](./Pergunta_A3_tec_lider_using_skill_ts-domain-modeler.md) (brand de agregado causa esse cast).
- Conecta com [A4](./Pergunta_A4_tec_lider_using_skill_ts-domain-modeler.md) (mappers do Drizzle: regra de fronteira).
