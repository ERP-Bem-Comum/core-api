---
entrevista: 0001
bloco: A
pergunta: A3
título: "Brand de agregado (Contract, Amendment) faz sentido?"
skill: ts-domain-modeler
status: respondida
---

# Pergunta_A3_tec_lider_using_skill_ts-domain-modeler

> **Status:** respondida ✅
> **Origem:** entrevista 0001
> **Skill canônica:** `ts-domain-modeler`

---

## Q (host)

`Contract = Brand<ContractShape, 'Contract'>` e `Amendment = Brand<AmendmentBase & AmendmentVariant, 'Amendment'>` — agregado inteiro brandado.

- Brand do agregado serve para algo além de impedir literais?
- Se removido, como impedir "structural typing acidental"?

## R (PhD)

**Faz muito pouco sentido brandar agregado.** Agregado tem ciclo de vida e mutações de estado constantes — VO brandado prova validação atômica e imutável; agregado, não. Brand de agregado causa o excesso de casts perigosos.

- **Remover** o brand de `Contract` e `Amendment`.
- **Structural typing acidental fica impedido pela presença de VOs brandados nas folhas** (`id: ContractId`, `originalValue: Money`, `originalPeriod: Period`). A estrutura do `Contract` torna-se matematicamente quase impossível de forjar sem passar pelos smart constructors dos VOs.

## Rules emergentes

- **DON'T:** Brandar agregados.
- **DO:** Brand apenas em VOs folha — a estrutura do agregado fica protegida transitivamente.

## Cross-refs

- [A1](./Pergunta_A1_tec_lider_using_skill_ts-domain-modeler.md) (sem brand de agregado, o cast `as unknown` some).
- [A4](./Pergunta_A4_tec_lider_using_skill_ts-domain-modeler.md) (precisa da regra de fronteira no mapper para fechar A3).
