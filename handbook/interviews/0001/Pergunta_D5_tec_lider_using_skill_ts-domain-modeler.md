---
entrevista: 0001
bloco: D
pergunta: D5
título: "Onde codificar invariante contextual — VO subtype, agregado, ou construtor por caso?"
skill: ts-domain-modeler
status: superseded
superseded_por: D2+D3+D4+D5
---

# Pergunta_D5_tec_lider_using_skill_ts-domain-modeler

> ⚠️ **SUPERSEDED** — esta pergunta foi unificada com D2, D3 e D4 na "teoria das invariantes em tipos".
>
> **Veja a versão canônica:**
> - [`Pergunta_D2_D3_D4_D5_tec_lider_using_skill_ts-domain-modeler.md`](./Pergunta_D2_D3_D4_D5_tec_lider_using_skill_ts-domain-modeler.md)
> - [`Pergunta_D2_D3_D4_D5_followup_tec_lider_using_skill_ts-domain-modeler.md`](./Pergunta_D2_D3_D4_D5_followup_tec_lider_using_skill_ts-domain-modeler.md) — fecha T5 (heurística α/β/γ endossada integralmente)
>
> Resolução: **rota α + γ dominantes**. Heurística destilada:
> - **α** (VO como Prova) — invariante atemporal e reusável (`NonZeroMoney` serve Faturamento, Pagamento, Orçamento).
> - **γ** (Caso de Uso como Orquestrador) — invariante de contexto específico (`Amendment.createAddition` exige `NonZeroMoney`).
> - **β** (Agregado como Guardião) — invariante contextual e mutável (`Contract.expire(at)` exige `at >= currentEnd`).
>
> Citações canônicas: Wlaschin (VO empacotador), Alexis King ("empurre o ônus da prova o mais alto possível"), Evans (consistency boundary).

---

## Q original (mantida para histórico)

> **Status:** pendente
> **Origem:** entrevista 0001
> **Skill canônica:** `ts-domain-modeler`

---

## Q (host) — caso vivido

Hoje em `amendment.ts:35`:

```ts
case 'Addition':
case 'Suppression':
  if (input.impactValue.cents === 0) return err('amendment-impact-value-zero');
  return ok(true);
```

Esta regra tem **dois ramos** disfarçados:
- "Money não pode ser zero" — falso: `Money.zero()` existe legitimamente.
- "Aditivo Addition/Suppression com impacto zero não existe" — **invariante contextual**.

Não dá para empurrar isso pra Zod sem perder contexto. Três rotas:

### Rota α — `NonZeroMoney` brandado, polimórfico

```ts
type NonZeroMoney = Brand<Money, 'NonZeroMoney'>;
const NonZeroMoney = {
  from: (m: Money): Result<NonZeroMoney, 'money-must-be-non-zero'> =>
    m.cents === 0 ? err('money-must-be-non-zero') : ok(m as NonZeroMoney),
};

type AmendmentVariant =
  | { kind: 'Addition';    impactValue: NonZeroMoney }
  | { kind: 'Suppression'; impactValue: NonZeroMoney }
  | { kind: 'TermChange';  newEndDate: Date }
  | { kind: 'Misc' };
```

Pró: invariante em tipo. Contra: explosão de VOs (`PositiveMoney`, `NonZeroMoney`, …).

### Rota β — Invariante no agregado, sem subtype

```ts
case 'Addition':
case 'Suppression':
  if (input.impactValue.cents === 0)
    return err({ tag: 'AmendmentImpactValueZero', kind: input.kind });
```

Pró: zero VO novo. Contra: runtime check mantido.

### Rota γ — Construtor por kind

```ts
const createAddition    = (input: AdditionInput):    Result<CommandOutput, AmendmentError> => …;
const createSuppression = (input: SuppressionInput): Result<CommandOutput, AmendmentError> => …;
const createTermChange  = (input: TermChangeInput):  Result<CommandOutput, AmendmentError> => …;
const createMisc        = (input: MiscInput):        Result<CommandOutput, AmendmentError> => …;
```

Pró: cada construtor declara input exato. Casa com E3 (fragmentar `applyHomologatedAdjustment`).
Contra: 4 funções públicas onde tinha 1.

### Perguntas-foco

- **D5.x** — Qual rota você defende? Host intuição: γ (sinergia com E3).
- **D5.y** — Heurística: quando codificar invariante como subtype (α/γ) vs no agregado (β)?
  - Proposta host: subtype quando **atemporal e composta** (PositiveMoney reusado em Faturamento/Orçamento); agregado quando **contextual e mutável**.
- **D5.z** — Shotgun parsing: como garantir que "Addition exige NonZeroMoney" seja declarada **uma vez** e propagada (Zod schema, tipo agregado, UI form, mensagem PT-BR)?
- **D5.w** — Localização de invariante (nomeação host): α = "VO como prova", β = "agregado como guardião", γ = "caso de uso como contrato". Esse enquadramento se sustenta no Wlaschin/Evans?
- **Cross-bloc com C2:** combinar γ no eixo `kind` com state machine no eixo `status`?

## R (PhD)

_pendente_

## Rules emergentes

_aguardando fechamento_

## Cross-refs

- [C2](./Pergunta_C2_tec_lider_using_skill_ts-domain-modeler.md), [E3](./Pergunta_E3_tec_lider_using_skill_ts-domain-modeler.md)
