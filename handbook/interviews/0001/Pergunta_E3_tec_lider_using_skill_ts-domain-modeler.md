---
entrevista: 0001
bloco: E
pergunta: E3
título: "applyHomologatedAdjustment carrega responsabilidade demais?"
skill: ts-domain-modeler
status: superseded
superseded_por: E3+I1+I3+A4
---

# Pergunta_E3_tec_lider_using_skill_ts-domain-modeler

> ⚠️ **SUPERSEDED** — esta pergunta foi unificada com I1, I3 e A4 na pergunta semântica de composição de Results.
>
> **Veja a versão canônica:**
> - [`Pergunta_E3_I1_I3_A4_tec_lider_using_skill_ts-domain-modeler.md`](./Pergunta_E3_I1_I3_A4_tec_lider_using_skill_ts-domain-modeler.md)
>
> Resolução: **early return + narrowing nativo do TS** para sequências dependentes (α). Sem `andThen`, sem `pipe`. Wlaschin + TS handbook §Narrowing convergem.

---

## Q original (mantida para histórico)

> **Status:** pendente
> **Origem:** entrevista 0001
> **Skill canônica:** `ts-domain-modeler`

---

## Q (host)

A função em `contract.ts:130-194`:
1. Valida invariantes (`assertActive`, `assertValidEventDate`).
2. Checa idempotência (`amendmentId` já aplicado).
3. Switch entre 4 kinds de ajuste, cada um com suas regras.
4. Produz evento.

60 linhas, 4 returns por branch.

- Fragmentar em 4 funções (`applyValueIncrease`, `applyValueDecrease`, …) com `applyHomologatedAdjustment` virando dispatcher? Ou monolito é correto porque **a unidade de validação é o agregado, não o branch**?
- "Guard-clause-result-pattern" (`if (!check.ok) return check;`) repetido — em FP idiomático vira `pipe(contract, assertActive, andThen(assertValidEventDate), andThen(applyAdjustment))`. Compensa pipeline ad-hoc mesmo sem fp-ts/Effect?
- Escrever `Result.pipe` ad-hoc ou aceitar guard clauses como "TypeScript honesto"?

## R (PhD)

_pendente_

## Rules emergentes

_aguardando fechamento_

## Cross-refs

- [C3](./Pergunta_C3_tec_lider_using_skill_ts-domain-modeler.md) (ContractAdjustment como ponte)
- [D5](./Pergunta_D5_tec_lider_using_skill_ts-domain-modeler.md) (rota γ — construtor por kind, sinérgico)
- [I1](./Pergunta_I1_tec_lider_using_skill_ts-domain-modeler.md), [I3](./Pergunta_I3_tec_lider_using_skill_ts-domain-modeler.md) (Result.pipe e combinators)
