---
entrevista: 0001
bloco: K
pergunta: K4
título: "Branded via unique symbol vs intersection — diferença prática"
skill: ts-domain-modeler
status: parcialmente-respondida
---

# Pergunta_K4_tec_lider_using_skill_ts-domain-modeler

> **Status:** parcialmente respondida (PhD já abordou no Bloco A — manter aqui para registro formal)
> **Origem:** entrevista 0001
> **Skill canônica:** `ts-domain-modeler`

---

## Q (host)

```ts
declare const ContractIdBrand: unique symbol;
type ContractId = string & { readonly [ContractIdBrand]: 'ContractId' };
```

vs hoje:

```ts
type ContractId = Brand<string, 'ContractId'>;  // Brand<T, K> = T & { __brand: K }
```

- Diferença prática que justifica o churn?

## R (PhD) — extraída do Bloco A

> "Migrar para `unique symbol` melhora a ergonomia e é a forma idiomática mais próxima de tipos nominais no TypeScript, pois evita colisões de chaves de string no fantasma. Contudo, qualquer técnica de nominalização no TypeScript exigirá um cast em algum momento. A chave é encapsular esse cast de forma que o código de negócio nunca precise usar a palavra `as`."

> "Usar um phantom field com um `unique symbol` afeta principalmente a ergonomia. O TypeScript emitirá mensagens de erro mais limpas baseadas no `unique symbol` em vez de mostrar interseções complexas com literais de string."

## Rules emergentes

- **CONSIDER:** `unique symbol` quando ergonomia de erro do TS importar.

## Cross-refs

- [A1](./Pergunta_A1_tec_lider_using_skill_ts-domain-modeler.md), [A2](./Pergunta_A2_tec_lider_using_skill_ts-domain-modeler.md)
