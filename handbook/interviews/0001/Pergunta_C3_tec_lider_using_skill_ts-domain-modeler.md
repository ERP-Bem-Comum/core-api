---
entrevista: 0001
bloco: C
pergunta: C3
título: "ContractAdjustment espelha Amendment — anti-pattern ou duas taxonomias legítimas?"
skill: ts-domain-modeler
status: superseded
superseded_por: C1+C2+C3+C4
---

# Pergunta_C3_tec_lider_using_skill_ts-domain-modeler

> ⚠️ **SUPERSEDED** — unificada com C1, C2 e C4.
>
> **Veja a versão canônica:**
> - [`Pergunta_C1_C2_C3_C4_tec_lider_using_skill_ts-domain-modeler.md`](./Pergunta_C1_C2_C3_C4_tec_lider_using_skill_ts-domain-modeler.md)
>
> Resolução: **manter dupla taxonomia (Leitura A).** Argumento da **evolução assimétrica** trazido pelo PhD provou que mapeamento Amendment↔Adjustment não é 1:1 no futuro: (1) um Amendment pode gerar 2+ adjustments num só ato; (2) um Adjustment pode existir SEM Amendment (decisão judicial). Ponte canônica: `Amendment.toAdjustments(homologated): readonly ContractAdjustment[]`.

---

## Q original (mantida para histórico)

> **Status:** pendente
> **Origem:** entrevista 0001
> **Skill canônica:** `ts-domain-modeler`

---

## Q (host)

```ts
export type ContractAdjustment =
  | { kind: 'ValueIncrease'; amount: Money; amendmentId: AmendmentId }
  | { kind: 'ValueDecrease'; amount: Money; amendmentId: AmendmentId }
  | { kind: 'PeriodExtension'; newEnd: Date; amendmentId: AmendmentId }
  | { kind: 'Acknowledgment'; amendmentId: AmendmentId };
```

É "DTO interno" entre o use case `homologateAmendment` e `Contract.applyHomologatedAdjustment`. Cria segunda taxonomia (`AmendmentKind` → `ContractAdjustment.kind`) com mapeamento implícito (`Addition` → `ValueIncrease`, `Suppression` → `ValueDecrease`, `TermChange` → `PeriodExtension`, `Misc` → `Acknowledgment`).

- Tipo-ponte denota **dupla taxonomia legítima** (o Amendment olha pra ato administrativo; o Adjustment olha pro efeito no Contract), ou é anti-pattern de tradução interna?
- Como modelaria sem essa duplicação? Função `Amendment.toAdjustment(amendment): ContractAdjustment` como única ponte, e tudo bem?

## R (PhD)

_pendente_

## Rules emergentes

_aguardando fechamento_

## Cross-refs

- [E3](./Pergunta_E3_tec_lider_using_skill_ts-domain-modeler.md) (`applyHomologatedAdjustment` carrega muita responsabilidade).
