---
entrevista: 0001
bloco: H
pergunta: H3
título: "shared/ vs kernel/ — separar VOs de domínio puro de VOs que apontam pra fora"
skill: ts-domain-modeler
status: superseded
superseded_por: H1+H2+H3
---

# Pergunta_H3_tec_lider_using_skill_ts-domain-modeler

> ⚠️ **SUPERSEDED** — unificada com H1 e H2.
>
> **Veja a versão canônica:**
> - [`Pergunta_H1_H2_H3_tec_lider_using_skill_ts-domain-modeler.md`](./Pergunta_H1_H2_H3_tec_lider_using_skill_ts-domain-modeler.md)
>
> Resolução: **dupla mudança**. (a) VOs de infra (`BucketName`, `StorageKey`, `StorageRef`) movem para `application/ports/document-storage.types.ts` — tipos do port moram junto do port. (b) VOs puros cross-BC (`Money`, `Period`, `UserRef`) promovidos para `src/shared/kernel/` (Evans Shared Kernel). VOs específicos do BC (`ContractId`, `NonZeroMoney`, etc) ficam em `src/modules/<bc>/domain/shared/`.

---

## Q original (mantida para histórico)

> **Status:** pendente
> **Origem:** entrevista 0001
> **Skill canônica:** `ts-domain-modeler`

---

## Q (host)

`shared/` tem `money, period, ids, bucket-name, storage-key, storage-ref`. Mistura VOs de domínio (`Money`, `Period`) com VOs de infra (`BucketName`, `StorageKey`).

- Separar? `domain/kernel/` para VOs de domínio puro e `domain/refs/` para VOs que apontam pra fora?
- Onde vivem `BucketName` e `StorageKey` — domínio mesmo, ou são pollution do storage port que vazou pra dentro?

## R (PhD)

_pendente_

## Rules emergentes

_aguardando fechamento_

## Cross-refs

- [H2](./Pergunta_H2_tec_lider_using_skill_ports-and-adapters.md)
