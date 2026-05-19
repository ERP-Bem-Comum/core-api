---
entrevista: 0001
bloco: K
pergunta: K2
título: "Template literal types para erros — força prefixação automaticamente?"
skill: ts-domain-modeler
status: superseded
superseded_por: J+K+L
---

# Pergunta_K2_tec_lider_using_skill_ts-domain-modeler

> ⚠️ **SUPERSEDED** — unificada com J/K/L na pergunta de fechamento.
>
> **Veja a versão canônica:**
> - [`Pergunta_J_K_L_tec_lider_using_skill_ts-domain-modeler.md`](./Pergunta_J_K_L_tec_lider_using_skill_ts-domain-modeler.md)
>
> Resolução: **CONSIDER** (não DO). Template literal type usando **PascalCase** (`tag: \`Contract${'NotActive' | 'CannotExpireYet' | …}\``) — alinhado com naming de D4. PhD propôs kebab (`contract-${string}`) — host corrigiu pra PascalCase. Útil pro autocomplete + poka-yoke, mas frágil em refactor (renomear `Contract` quebra todas as tags). Aplicar caso-a-caso.

---

## Q original (mantida para histórico)

> **Status:** pendente
> **Origem:** entrevista 0001
> **Skill canônica:** `ts-domain-modeler`

---

## Q (host)

```ts
type ContractError = `contract-${string}`;                                       // catch-all
type ContractError = `contract-${'not-active' | 'cannot-expire-yet' | …}`;       // estrita
```

- Segunda forma força prefixo automaticamente. Útil ou over-engineering?
- Como casa com a decisão D3+D4 de migrar pra tagged records (PascalCase)? Template literal continua relevante?

## R (PhD)

_pendente_

## Rules emergentes

_aguardando fechamento_

## Cross-refs

- [D3+D4](./Pergunta_D3_D4_tec_lider_using_skill_ts-domain-modeler.md)
