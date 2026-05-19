---
entrevista: 0001
bloco: C
pergunta: C4
título: "Switch exaustivo sem `default` — confiar em tsc?"
skill: ts-domain-modeler
status: superseded
superseded_por: C1+C2+C3+C4
---

# Pergunta_C4_tec_lider_using_skill_ts-domain-modeler

> ⚠️ **SUPERSEDED** — unificada com C1, C2 e C3.
>
> **Veja a versão canônica:**
> - [`Pergunta_C1_C2_C3_C4_tec_lider_using_skill_ts-domain-modeler.md`](./Pergunta_C1_C2_C3_C4_tec_lider_using_skill_ts-domain-modeler.md)
>
> Resolução: **NUNCA `throw`** no `default`. Opção A (preferível): **omitir `default`** — `noFallthroughCasesInSwitch` + retorno explícito garantem exhaustividade. Opção B: `default: { const _exhaustiveCheck: never = x; return _exhaustiveCheck; }`. `assertNever` banido (exige throw). **Contradição admitida nesta entrevista** — PhD usou `throw` no template e o host corrigiu via autoridade do CLAUDE.md raiz + TS handbook §709.

---

## Q original (mantida para histórico)

> **Status:** pendente
> **Origem:** entrevista 0001
> **Skill canônica:** `ts-domain-modeler`

---

## Q (host)

```ts
switch (adjustment.kind) {
  case 'ValueIncrease':    { … return ok(...); }
  case 'ValueDecrease':    { … }
  case 'PeriodExtension':  { … }
  case 'Acknowledgment':   { … }
}
// sem `default` — confia em tsc.
```

- Confiar em `noImplicitReturns` + `noFallthroughCasesInSwitch` ou usar `default: { const _exhaustive: never = adjustment; return _exhaustive; }`?
- SKILL atual exige `default: { const _: never = x }` com `throw` — viola "zero throw". Como reconciliar?
- `assertNever(x: never): never` como exceção isolada — onde fica a coerência?

## R (PhD)

_pendente_

## Rules emergentes

_aguardando fechamento_

## Cross-refs

- Toca regra "zero throw" do CLAUDE.md raiz.
