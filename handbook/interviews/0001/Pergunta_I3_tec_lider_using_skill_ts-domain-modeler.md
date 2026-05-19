---
entrevista: 0001
bloco: I
pergunta: I3
título: "combine para inputs múltiplos — fail-fast ou coletar erros?"
skill: ts-domain-modeler
status: superseded
superseded_por: E3+I1+I3+A4
---

# Pergunta_I3_tec_lider_using_skill_ts-domain-modeler

> ⚠️ **SUPERSEDED** — esta pergunta foi unificada com E3, I1 e A4 na pergunta semântica de composição de Results.
>
> **Veja a versão canônica:**
> - [`Pergunta_E3_I1_I3_A4_tec_lider_using_skill_ts-domain-modeler.md`](./Pergunta_E3_I1_I3_A4_tec_lider_using_skill_ts-domain-modeler.md)
>
> Resolução: **fail-fast em sequência dependente (α)**, **`combine` (collect) em sequência independente (β, γ)**. Regra de ouro Monads vs Applicatives.

---

## Q original (mantida para histórico)

> **Status:** pendente
> **Origem:** entrevista 0001
> **Skill canônica:** `ts-domain-modeler`

---

## Q (host)

`create` em `contract.ts:41` faz 4 checks sequenciais, retorna no **primeiro** erro. Se eu mando título vazio + signedAt inválido, o usuário descobre um por vez.

- Adicionar `combineAll` que coleta erros em paralelo? `Result<T, NonEmptyArray<E>>`?
- Ou aceitar "fail fast" porque erros do domínio são bugs, não input validation, e input validation é responsabilidade da borda?

## R (PhD)

_pendente_

## Rules emergentes

_aguardando fechamento_

## Cross-refs

- [I1](./Pergunta_I1_tec_lider_using_skill_ts-domain-modeler.md), [B2](./Pergunta_B2_tec_lider_using_skill_ts-domain-modeler.md) (Zod já coleta erros agregados)
