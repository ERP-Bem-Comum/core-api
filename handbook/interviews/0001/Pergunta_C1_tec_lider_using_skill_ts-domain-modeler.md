---
entrevista: 0001
bloco: C
pergunta: C1
título: "Amendment é intersection (Base & Variant) — endossa?"
skill: ts-domain-modeler
status: superseded
superseded_por: C1+C2+C3+C4
---

# Pergunta_C1_tec_lider_using_skill_ts-domain-modeler

> ⚠️ **SUPERSEDED** — unificada com C2, C3 e C4.
>
> **Veja a versão canônica:**
> - [`Pergunta_C1_C2_C3_C4_tec_lider_using_skill_ts-domain-modeler.md`](./Pergunta_C1_C2_C3_C4_tec_lider_using_skill_ts-domain-modeler.md)
>
> Resolução: **aninhamento (status × kind)**, não cross-product. `Amendment = PendingWithoutDocument | PendingWithDocument | Homologated`, cada um com `kind` interno.

---

## Q original (mantida para histórico)

> **Status:** pendente
> **Origem:** entrevista 0001
> **Skill canônica:** `ts-domain-modeler`

---

## Q (host)

```ts
type AmendmentBase = Readonly<{ id, contractId, …, signedDocumentRef: DocumentId | null, … }>;
type AmendmentVariant =
  | { kind: 'Addition'; impactValue: Money }
  | { kind: 'Suppression'; impactValue: Money }
  | { kind: 'TermChange'; newEndDate: Date }
  | { kind: 'Misc' };
export type Amendment = Brand<AmendmentBase & AmendmentVariant, 'Amendment'>;
```

Base carrega `signedDocumentRef: DocumentId | null` — campo dependente do **status**, não do **kind**. Dois eixos de discriminação convivendo num agregado só.

- Modelar dois eixos `(kind, status)` como 4×2 = 8 shapes explícitos?
- State machine encoded as types: `PendingAmendment` vs `HomologatedAmendment` como tipos distintos?
- Como o PhD lida com a explosão combinatória em agregados com >2 eixos de estado?

## R (PhD)

_pendente_

## Rules emergentes

_aguardando fechamento_

## Cross-refs

- [C2](./Pergunta_C2_tec_lider_using_skill_ts-domain-modeler.md) (optional-as-state — `signedDocumentRef: DocumentId | null`).
- [D2](./Pergunta_D2_tec_lider_using_skill_ts-domain-modeler.md) (`ActiveContract` refinado por status).
