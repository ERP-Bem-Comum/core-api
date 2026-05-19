---
entrevista: 0001
bloco: I
pergunta: I2
título: "Async no domínio — manter sync ou abraçar ResultAsync/TaskEither?"
skill: ts-domain-modeler
status: superseded
superseded_por: E3+I1+I3+A4
---

# Pergunta_I2_tec_lider_using_skill_ts-domain-modeler

> ⚠️ **SUPERSEDED** — esta pergunta foi respondida como Q.4 da pergunta semântica E3+I1+I3+A4.
>
> **Veja a versão canônica:**
> - [`Pergunta_E3_I1_I3_A4_tec_lider_using_skill_ts-domain-modeler.md`](./Pergunta_E3_I1_I3_A4_tec_lider_using_skill_ts-domain-modeler.md)
>
> Resolução: **domínio 100% sync puro**. Application Layer (Imperative Shell, Mark Seemann) lida com `Promise`. Nenhum `ResultAsync` no domínio.

---

## Q original (mantida para histórico)

> **Status:** pendente
> **Origem:** entrevista 0001
> **Skill canônica:** `ts-domain-modeler`

---

## Q (host)

Domínio hoje é **sync** (todas ops puras). Adapters cruzam Promise. `Result<T, E>` sync vira `Promise<Result<T, E>>` na borda, e o pipeline disso requer ferramentas (ResultAsync, TaskEither, Effect).

- Defender manter domínio rigorosamente sync (sem `async` nem em assinatura) e empurrar todo IO pra borda?
- Como lidar com casos onde "validação requer fetch" (ex.: `validateUniqueSequentialNumber` precisa consultar repo)? Isso vira use case, não domínio, certo? Como sinalizar essa fronteira pra junior não tropeçar?

## R (PhD)

_pendente_

## Rules emergentes

_aguardando fechamento_

## Cross-refs

- [I1](./Pergunta_I1_tec_lider_using_skill_ts-domain-modeler.md), [H2](./Pergunta_H2_tec_lider_using_skill_ports-and-adapters.md)
