---
entrevista: 0001
bloco: A
pergunta: A4
título: "Como impor a regra de fronteira no mapper de persistência?"
skill: ts-domain-modeler
status: respondida
---

# Pergunta_A4_tec_lider_using_skill_ts-domain-modeler

> **Status:** respondida ✅
> **Origem:** entrevista 0001 (follow-up de A3)
> **Skill canônica:** `ts-domain-modeler` (toca `ports-and-adapters`)

---

## Q (host)

Sem brand no agregado, o adapter Drizzle (`mappers/contract.ts`) pode literalmente retornar um objeto estruturalmente compatível mesmo que algum VO interno não tenha passado por `rehydrate`. Você impõe — pela SKILL — que **todo mapper devolve `Result<Aggregate, RehydrationError>`** usando **só** os smart constructors dos VOs internos?

## R (PhD)

**Sim, ratificado 100%.** Justificativas:

1. **Compilador vira guardião (Parse, don't validate na prática):** o TS não compila se o mapper tentar forjar `{ id: '123', originalValue: 500 }` — para casar com `ContractShape`, é forçado a invocar os smart constructors de cada VO.
2. **Banco de dados é fronteira externa (I/O) — não confiar cegamente.** Em Ports & Adapters funcional, o BD vive no Imperative Shell; o domínio é o Functional Core puro. O mapper consome dados menos estruturados e os parseia para a estrutura forte do agregado.
3. **Tratamento explícito de falhas na borda:** como os smart constructors retornam `Result`, o mapper herda a falibilidade. `Result<Aggregate, RehydrationError>` obriga o chamador a tratar BD corrompido ou inconsistente com versão atual do código. Elimina shotgun parsing.

## Rules emergentes

- **DO (regra de fronteira):** Adapter de persistência reidrata agregado **apenas via smart constructors de VOs internos**, retornando `Result<Aggregate, RehydrationError>`. Nunca monta literal direto.
- **DON'T:** Mapper montando literal de agregado — shotgun parsing.

## Esqueleto canônico (ratificado pelo PhD)

```ts
export type RehydrationError =
  | { readonly tag: 'InvalidContractId';      readonly raw: string }
  | { readonly tag: 'InvalidOriginalValue';   readonly cause: MoneyError }
  | { readonly tag: 'InvalidOriginalPeriod';  readonly cause: PeriodError }
  | { readonly tag: 'InvalidCurrentValue';    readonly cause: MoneyError }
  | { readonly tag: 'InvalidCurrentPeriod';   readonly cause: PeriodError }
  | { readonly tag: 'InvalidAmendmentId';     readonly raw: string; readonly position: number }
  | { readonly tag: 'UnknownStatus';          readonly raw: string };

export const rehydrateContract = (row: ContractRow): Result<Contract, RehydrationError> => {
  const id = ContractId.rehydrate(row.id);
  if (!id.ok) return err({ tag: 'InvalidContractId', raw: row.id });

  const originalValue = Money.fromCents(row.originalValueCents);
  if (!originalValue.ok) return err({ tag: 'InvalidOriginalValue', cause: originalValue.error });

  // … demais VOs …

  return ok({
    id: id.value,
    sequentialNumber: row.sequentialNumber,
    title: row.title,
    objective: row.objective,
    signedAt: row.signedAt,
    originalValue: originalValue.value,
    originalPeriod: originalPeriod.value,
    currentValue: currentValue.value,
    currentPeriod: currentPeriod.value,
    status: status.value,
    homologatedAmendmentIds,
    endedAt: row.endedAt,
  });  // sem `as`, sem `as unknown` — compilador confere chave por chave.
};
```

## Cross-refs

- [A1](./Pergunta_A1_tec_lider_using_skill_ts-domain-modeler.md), [A3](./Pergunta_A3_tec_lider_using_skill_ts-domain-modeler.md)
- Ticket gerado: **CTR-DOMAIN-MAPPER-RESULT**
