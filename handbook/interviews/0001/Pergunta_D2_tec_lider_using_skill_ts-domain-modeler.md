---
entrevista: 0001
bloco: D
pergunta: D2
título: "assertActive que não refina o tipo — state machine in types?"
skill: ts-domain-modeler
status: superseded
superseded_por: D2+D3+D4+D5
---

# Pergunta_D2_tec_lider_using_skill_ts-domain-modeler

> ⚠️ **SUPERSEDED** — esta pergunta foi unificada com D3, D4 e D5 na "teoria das invariantes em tipos".
>
> **Veja a versão canônica:**
> - [`Pergunta_D2_D3_D4_D5_tec_lider_using_skill_ts-domain-modeler.md`](./Pergunta_D2_D3_D4_D5_tec_lider_using_skill_ts-domain-modeler.md)
> - [`Pergunta_D2_D3_D4_D5_followup_tec_lider_using_skill_ts-domain-modeler.md`](./Pergunta_D2_D3_D4_D5_followup_tec_lider_using_skill_ts-domain-modeler.md) — fecha T3 (contradição com Bloco B) e T5 (heurística α/β/γ)
>
> Resolução: **state machine in types aprovado**. Refinement via `parseActive(c): Result<ActiveContract, ContractNotActiveError>` — nome canônico vence `assertActive` (imperativo). Generaliza para `Active | Expired | Terminated` como union do `Contract`. Transições são funções totais: `expire(c: ActiveContract): Result<ExpiredContract, …>`.

---

## Q original (mantida para histórico)

> **Status:** pendente
> **Origem:** entrevista 0001
> **Skill canônica:** `ts-domain-modeler`

---

## Q (host)

```ts
const assertActive = (contract: Contract): Result<Contract, 'contract-not-active'> =>
  contract.status === 'Active' ? ok(contract) : err('contract-not-active');
```

A função se chama `assertActive` mas retorna o próprio contract no `ok` — sem refinamento. Versão refinante:

```ts
type ActiveContract = Contract & { readonly status: 'Active' };

const assertActive = (c: Contract): Result<ActiveContract, 'contract-not-active'> =>
  c.status === 'Active' ? ok(c as ActiveContract) : err('contract-not-active');
```

E `applyHomologatedAdjustment(c: ActiveContract, …)` em vez de `(c: Contract, …)`.

- Aprovas? Custos: (i) `as ActiveContract` controlado no guard; (ii) cada operação que muda status precisa de transição tipada.
- Generalizar para **um tipo por estado** (`ActiveContract`, `ExpiredContract`, `TerminatedContract`), unificados via `type Contract = Active | Expired | Terminated`?
- Como ESLint/SKILL força "função que muda status retorna tipo diferente"?

## R (PhD)

_pendente_

## Rules emergentes

_aguardando fechamento_

## Cross-refs

- [C1](./Pergunta_C1_tec_lider_using_skill_ts-domain-modeler.md), [C2](./Pergunta_C2_tec_lider_using_skill_ts-domain-modeler.md) (state machine in types no Amendment).
