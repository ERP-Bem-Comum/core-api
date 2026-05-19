---
entrevista: 0001
bloco: C
pergunta: C2
título: "`signedDocumentRef: DocumentId | null` é optional-as-state — eliminar?"
skill: ts-domain-modeler
status: superseded
superseded_por: C1+C2+C3+C4
---

# Pergunta_C2_tec_lider_using_skill_ts-domain-modeler

> ⚠️ **SUPERSEDED** — unificada com C1, C3 e C4.
>
> **Veja a versão canônica:**
> - [`Pergunta_C1_C2_C3_C4_tec_lider_using_skill_ts-domain-modeler.md`](./Pergunta_C1_C2_C3_C4_tec_lider_using_skill_ts-domain-modeler.md)
>
> Resolução: **`null` eliminado**. `PendingWithDocument` carrega `signedDocumentRef: DocumentId` como propriedade obrigatória do tipo refinado. `homologate` aceita apenas `PendingWithDocument` — impede em tipo homologar sem documento.

---

## Q original (mantida para histórico)

> **Status:** pendente
> **Origem:** entrevista 0001
> **Skill canônica:** `ts-domain-modeler`

---

## Q (host)

```ts
if (amendment.signedDocumentRef === null) {
  return err('amendment-without-signed-document');
}
```

A regra "só homologa se tem documento" virou runtime check. **Mas o tipo já sabia disso** — porque `Pending` sem documento e `Pending` com documento são fenômenos distintos do negócio.

- Modelar como `PendingWithoutDocument | PendingWithDocument | Homologated` e fazer `homologate` aceitar apenas `PendingWithDocument`?
- Onde isso fura na prática (serialização vinda do DB)?
- Você teria um `Amendment.rehydrate` que recolocar o agregado no estado correto via discriminação?

## R (PhD)

_pendente_

## Rules emergentes

_aguardando fechamento_

## Cross-refs

- [C1](./Pergunta_C1_tec_lider_using_skill_ts-domain-modeler.md)
- [D2](./Pergunta_D2_tec_lider_using_skill_ts-domain-modeler.md) (state machine no Contract).
