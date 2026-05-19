---
entrevista: 0001
bloco: I
pergunta: I1
título: "Result homemade vs neverthrow vs Effect"
skill: ts-domain-modeler
status: superseded
superseded_por: E3+I1+I3+A4
---

# Pergunta_I1_tec_lider_using_skill_ts-domain-modeler

> ⚠️ **SUPERSEDED** — esta pergunta foi unificada com E3, I3 e A4 na pergunta semântica de composição de Results.
>
> **Veja a versão canônica:**
> - [`Pergunta_E3_I1_I3_A4_tec_lider_using_skill_ts-domain-modeler.md`](./Pergunta_E3_I1_I3_A4_tec_lider_using_skill_ts-domain-modeler.md)
>
> Resolução: **homemade** com 2 combinators (`mapErr`, `combine`) — descarta neverthrow (API com classe), fp-ts (curva alta) e Effect (peso conceitual). Total ~50 LOC em `shared/result.ts`.

---

## Q original (mantida para histórico)

> **Status:** pendente
> **Origem:** entrevista 0001
> **Skill canônica:** `ts-domain-modeler`

---

## Q (host)

`shared/result.ts` é nosso. Funciona, mas:
- Sem `.map`, `.flatMap`, `.match` (só `.ok` boolean check).
- Sem combinators (`combine`, `traverse`, `sequence`).
- Não compõe com Promise sem ceremony.

Resultado: funções viram cascata de `if (!x.ok) return x;`.

- Adotar **neverthrow** (5kb, zero peer deps, mesmo pattern)? Effect (mais poderoso, mais peso conceitual)? Ou expandir o nosso?
- Custo em **legibilidade pra quem não é FP-fluente** — equipe da P.O., seniors backend talvez não leiam pipelines naturalmente.
- Onde está a linha entre "ergonomia que economiza bug" e "framework que afasta gente"?

## R (PhD)

_pendente_

## Rules emergentes

_aguardando fechamento_

## Cross-refs

- [I2](./Pergunta_I2_tec_lider_using_skill_ts-domain-modeler.md), [I3](./Pergunta_I3_tec_lider_using_skill_ts-domain-modeler.md), [E3](./Pergunta_E3_tec_lider_using_skill_ts-domain-modeler.md)
