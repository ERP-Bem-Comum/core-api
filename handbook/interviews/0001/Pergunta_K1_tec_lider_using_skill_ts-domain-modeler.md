---
entrevista: 0001
bloco: K
pergunta: K1
título: "Higher-kinded approximations — vale o complexity budget?"
skill: ts-domain-modeler
status: superseded
superseded_por: J+K+L
---

# Pergunta_K1_tec_lider_using_skill_ts-domain-modeler

> ⚠️ **SUPERSEDED** — unificada com J/K/L na pergunta de fechamento.
>
> **Veja a versão canônica:**
> - [`Pergunta_J_K_L_tec_lider_using_skill_ts-domain-modeler.md`](./Pergunta_J_K_L_tec_lider_using_skill_ts-domain-modeler.md)
>
> Resolução: **DON'T**. HKT approximations em TS exigem **defuncionalização hacky**, custam muito e entregam pouco. Fere a restrição "sem jargão FP no domínio" do Bloco I. Aceitar a repetição de `Result<Foo, FooError>` em ~200 lugares — é mais legível que abstração ilegível.

---

## Q original (mantida para histórico)

> **Status:** pendente
> **Origem:** entrevista 0001
> **Skill canônica:** `ts-domain-modeler`

---

## Q (host)

Repetimos `Result<Foo, FooError>` em 200 lugares. Existe pattern (`hkt-toolbelt`, ou rolar à mão com type lambdas) pra abstrair "operação que retorna Result com erro do agregado".

- Vale o complexity budget?
- Onde compensaria — em utilitários como `Result.pipe`, ou no domínio mesmo?

## R (PhD)

_pendente_

## Rules emergentes

_aguardando fechamento_

## Cross-refs

- [I1](./Pergunta_I1_tec_lider_using_skill_ts-domain-modeler.md)
