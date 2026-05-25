# 000 — Request CTR-DOMAIN-INVARIANT-CONTEXTUAL

> **Frente A — Refactor radical do domínio (entrevista 0001).**
> **Bloco D — Invariantes em Tipos.** Combinação **rota α** (VO como Prova) + **rota γ** (Caso de Uso como Orquestrador).
> Depende de `CTR-SHARED-VO-CANONICAL` ✅ + `CTR-DOMAIN-STATE-MACHINE-AMENDMENT` ✅.
> 8º ticket consecutivo do protocolo **Opção B**.

---

## Origem

- **Entrevista canônica:** [`handbook/interviews/0001-functional-ddd-domain-refresh.md`](../../../handbook/interviews/0001-functional-ddd-domain-refresh.md), **Bloco D D5** (Invariantes contextuais).
- **Decisões aplicáveis** (master doc):
  - **DO D§25** (L877): "**Rota α** (VO como Prova) — invariante atemporal e reusável."
  - **DO D§26** (L878): "**Rota γ** (Caso de Uso como Orquestrador) — invariante de contexto específico, exigindo VO brandado no construtor."
  - **DO D§27** (L879): "**Rota β** (Agregado como Guardião) — invariante contextual e mutável (não aplicada neste ticket; reservada para invariantes de estado interno do agregado)."
  - **DON'T D§24** (L917): "Codificar invariante reusável como `if` no agregado — promove para VO subtype (α)."
  - **DON'T D§25** (L918): "Espalhar o **mesmo** `if` em múltiplos pontos — declarar **uma vez** como tipo e propagar via construtor γ."
  - **DO H§37** (L889): "VOs específicos do BC ficam em `src/modules/<bc>/domain/shared/` — `ContractId`, `NonZeroMoney`, etc."
- **Tabela canônica** (L968):
  > `CTR-DOMAIN-INVARIANT-CONTEXTUAL` — Bloco D — Cria `NonZeroMoney` brandado em `shared/` (rota α). `Amendment.createAddition` e `createSuppression` exigem (rota γ). **Dep: SHARED-VO-CANONICAL.**
- **Diagnóstico canônico** (L382-435): "Um Aditivo Addition/Suppression com impacto zero não existe" — invariante **contextual** (não vale para Money em geral; vale só nas variantes Addition/Suppression). Hoje codificada como runtime check em `validateVariantInput`. Estado-alvo: codificar como tipo (`NonZeroMoney` brand) e exigir via input — eliminando o `if`.

---

## Estado atual (snapshot 2026-05-20)

### Runtime check em `src/modules/contracts/domain/amendment/amendment.ts`

```ts
const validateVariantInput = (
  input: CreateAmendmentInput,
): Result<true, AmendmentError.AmendmentError> => {
  switch (input.kind) {
    case 'Addition':
    case 'Suppression':
      if (input.impactValue.cents === 0) return err(AmendmentError.amendmentImpactValueZero());
      return ok(true);
    // ...
  }
};
```

→ **DON'T D§24/§25 violados**: invariante reusável codificada como `if` no agregado.

### Tipo do input em `src/modules/contracts/domain/amendment/types.ts`

```ts
export type CreateAmendmentInput = CreateAmendmentInputBase &
  Readonly<
    | { kind: 'Addition'; impactValue: Money }      // ← Money "cru", aceita cents=0
    | { kind: 'Suppression'; impactValue: Money }    // ← idem
    | { kind: 'TermChange'; newEndDate: Date }
    | { kind: 'Misc' }
  >;
```

### Use case em `src/modules/contracts/application/use-cases/create-amendment.ts:75-81`

```ts
case 'Addition':
case 'Suppression': {
  const money = Money.fromCents(cmd.impactValueCents);
  if (!money.ok) return money;
  return ok({ ...baseFields, kind: cmd.kind, impactValue: money.value });
  // ↑ passa Money cru — runtime check é quem rejeita cents=0
}
```

### Mapper em `src/modules/contracts/adapters/persistence/mappers/amendment.mapper.ts`

`variantFromRow` (após W1 do ticket anterior) reconstrói `impactValue: Money.fromCents(row.impactValueCents)`. Após este ticket precisa rehidratar como `NonZeroMoney` para Addition/Suppression.

---

## Estado-alvo (Padrão D — α + γ)

### Novo VO em `src/modules/contracts/domain/shared/non-zero-money.ts`

```ts
import { type Result, ok, err } from '#src/shared/result.ts';
import type { Brand } from '#src/shared/brand.ts';
import type { Money } from './money.ts';

/**
 * Refinamento brandado de `Money` que garante estática e atemporal:
 *   `m.cents !== 0`.
 *
 * Rota α (DO D§25): codifica invariante reusável (qualquer contexto que
 * exija "valor monetário não-zero" — Faturamento, Orçamento, etc.).
 *
 * Polimorfismo: `NonZeroMoney` é compatível com `Money` em widening
 * (NonZeroMoney → Money é automático). Logo, operações de Money
 * (`add`, `subtract`, `equals`) aceitam NonZeroMoney sem casts.
 */
export type NonZeroMoney = Brand<Money, 'NonZeroMoney'>;

export type NonZeroMoneyError = 'money-must-be-non-zero';

/** Smart constructor — refina um Money pré-validado. */
export const from = (m: Money): Result<NonZeroMoney, NonZeroMoneyError> =>
  m.cents === 0 ? err('money-must-be-non-zero') : ok(m as NonZeroMoney);
```

### `domain/amendment/types.ts` exige `NonZeroMoney` em Addition/Suppression

```ts
import type { NonZeroMoney } from '../shared/non-zero-money.ts';

export type AmendmentVariant = Readonly<
  | { kind: 'Addition'; impactValue: NonZeroMoney }       // ← brand novo
  | { kind: 'Suppression'; impactValue: NonZeroMoney }    // ← idem
  | { kind: 'TermChange'; newEndDate: Date }
  | { kind: 'Misc' }
>;

export type CreateAmendmentInput = CreateAmendmentInputBase &
  Readonly<
    | { kind: 'Addition'; impactValue: NonZeroMoney }
    | { kind: 'Suppression'; impactValue: NonZeroMoney }
    | { kind: 'TermChange'; newEndDate: Date }
    | { kind: 'Misc' }
  >;
```

→ TS rejeita `Amendment.create({ kind: 'Addition', impactValue: someMoney })` se `someMoney` é `Money` (não `NonZeroMoney`) em **compile time**.

### `domain/amendment/amendment.ts` perde o runtime check

```ts
const validateVariantInput = (
  input: CreateAmendmentInput,
): Result<true, AmendmentError.AmendmentError> => {
  switch (input.kind) {
    case 'Addition':
    case 'Suppression':
      // Sem check — NonZeroMoney é garantia estática (DO D§25 + DON'T D§24).
      return ok(true);
    case 'TermChange':
      if (!isValidDate(input.newEndDate)) {
        return err(AmendmentError.amendmentInvalidNewEndDate());
      }
      return ok(true);
    case 'Misc':
      return ok(true);
  }
};
```

→ A função fica quase trivial; pode ser inlined em `create` ou mantida por simetria. **Decisão:** manter (clareza vale o boilerplate mínimo).

### `application/use-cases/create-amendment.ts` refina via NonZeroMoney na borda (γ)

```ts
import * as NonZeroMoney from '../../domain/shared/non-zero-money.ts';

switch (cmd.kind) {
  case 'Addition':
  case 'Suppression': {
    const money = Money.fromCents(cmd.impactValueCents);
    if (!money.ok) return money;
    // DO D§26 (rota γ): caso de uso é o orquestrador que refina Money → NonZeroMoney.
    const nonZero = NonZeroMoney.from(money.value);
    if (!nonZero.ok) return err(AmendmentError.amendmentImpactValueZero()); // mapeia para erro existente
    return ok({ ...baseFields, kind: cmd.kind, impactValue: nonZero.value });
  }
  // TermChange / Misc unchanged
}
```

→ **Não introduzir** `NonZeroMoneyError` no union `CreateAmendmentError`. Mapeia para `AmendmentError.amendmentImpactValueZero` (preserva compatibilidade com testes externos que já testam esse tag).

### Mapper rehidrata como `NonZeroMoney` para Addition/Suppression

```ts
// amendment.mapper.ts - variantFromRow
case 'Addition':
case 'Suppression': {
  if (row.impactValueCents === null) return err('amendment-mapper-impossible-shape');
  const money = Money.fromCents(row.impactValueCents);
  if (!money.ok) return money;
  const nonZero = NonZeroMoney.from(money.value);
  if (!nonZero.ok) return err('amendment-mapper-impossible-shape');  // row corrupto: Addition+0 não deveria existir
  return ok({ kind: row.kind, impactValue: nonZero.value });
}
```

---

## Critérios de aceitação

### CA1 — `NonZeroMoney` emitido como VO brandado

- `src/modules/contracts/domain/shared/non-zero-money.ts` criado.
- Exporta `type NonZeroMoney = Brand<Money, 'NonZeroMoney'>`, `NonZeroMoneyError`, `from()`.
- Consumo idiomático: `import * as NonZeroMoney from './non-zero-money.ts'`.

### CA2 — `from()` retorna `Result`

- `NonZeroMoney.from(m: Money): Result<NonZeroMoney, 'money-must-be-non-zero'>`.
- Smart constructor — não há outra forma de produzir `NonZeroMoney` sem passar pelo predicate.

### CA3 — `AmendmentVariant` exige `NonZeroMoney` em Addition/Suppression

- `types.ts` — tipo de `impactValue` em Addition/Suppression é `NonZeroMoney` (não `Money`).
- TS rejeita `{ kind: 'Addition', impactValue: someMoney }` em compile time — verificado por `@ts-expect-error`.

### CA4 — Runtime check removido do domínio

- `validateVariantInput` em `amendment.ts` **não tem mais** o `if (input.impactValue.cents === 0)` para Addition/Suppression.
- `grep "impactValue.cents === 0" src/modules/contracts/domain/` retorna **zero** hits.

### CA5 — Polimorfismo Money / NonZeroMoney

- `NonZeroMoney` é compatível com `Money` em widening (chamadas como `Money.add(nonZero1, money2)` compilam sem cast).
- Test demonstra: `Money.add(nonZero, money)` retorna `Money` válido.

### CA6 — Use case refina via NonZeroMoney na borda (γ)

- `create-amendment.ts` chama `NonZeroMoney.from(money.value)` para Addition/Suppression antes de passar para `Amendment.create`.
- Erro mapeado para `AmendmentError.amendmentImpactValueZero()` (preserva compatibilidade externa).

### CA7 — Mapper rehidrata como NonZeroMoney; shape impossível = erro tagged

- `amendment.mapper.ts:variantFromRow` constrói `NonZeroMoney` para Addition/Suppression.
- Row corrupto (Addition + impactValueCents=0) → `amendment-mapper-impossible-shape` (variant já existente).

### CA8 — Cobertura preserva regressões

- `pnpm test` verde com **≥** 630 (baseline pós-Amendment SM).
- Pelo menos 5 testes novos:
  - `NonZeroMoney.from(zero) → err('money-must-be-non-zero')`.
  - `NonZeroMoney.from(positive) → ok`.
  - `NonZeroMoney.from` polimorfo: resultado é assignable a `Money` (compile + runtime).
  - `@ts-expect-error` em `Amendment.create({ kind: 'Addition', impactValue: rawMoney })` — CA3 estática.
  - `Mapper rejeita row Addition + cents=0 com amendment-mapper-impossible-shape`.

### CA9 — Gates W3 verdes

- typecheck ✅, test ✅, lint ✅, format:check ⚠️ (`README.md` pré-existente — aceitável).

---

## Arquivos previstos

### `src/` (produção)

```
src/modules/contracts/domain/shared/non-zero-money.ts                       (NOVO)
src/modules/contracts/domain/amendment/types.ts                             (impactValue: Money → NonZeroMoney em 2 variants)
src/modules/contracts/domain/amendment/amendment.ts                         (validateVariantInput remove check; possivelmente inline)
src/modules/contracts/application/use-cases/create-amendment.ts             (NonZeroMoney.from na borda; mapeia err para amendmentImpactValueZero)
src/modules/contracts/adapters/persistence/mappers/amendment.mapper.ts      (variantFromRow rehidrata via NonZeroMoney; shape impossível tagged)
```

### `tests/` (RED → GREEN)

```
tests/modules/contracts/domain/shared/non-zero-money.test.ts                (NOVO — CA1, CA2, CA5)
tests/modules/contracts/domain/amendment/amendment.test.ts                   (+ CA3 @ts-expect-error; ajustar testes existentes de impactValueZero)
tests/modules/contracts/application/use-cases/create-amendment.test.ts       (caminho NonZeroMoney.from falha → amendmentImpactValueZero)
tests/modules/contracts/adapters/persistence/amendment.mapper.test.ts        (CA7 — row Addition+0 → impossible-shape)
tests/modules/contracts/adapters/persistence/fixtures.ts                     (someNonZeroMoney helper; builders usam)
```

---

## Não-objetivos (fora do escopo)

- **Split `Amendment.create` em 4 construtores** (`createAddition`, `createSuppression`, etc.) — opcional na entrevista (L426), não necessário para a invariante. Mantém `Amendment.create` único.
- **`PositiveMoney`, `MoneyGT100`** — não criar — abrir tickets sob demanda quando outra invariante surgir.
- **Rota β (agregado como guardião)** — não aplica aqui; está reservada para invariantes de estado interno mutável.
- **Codemod de imports** — `CTR-DOMAIN-IMPORT-CODEMOD`.
- **Promover `Money`/`NonZeroMoney` para `src/shared/kernel/`** — DO H§36 diz "VOs cross-BC promovem"; faz parte de `CTR-DOMAIN-RESTRUCTURE`.

---

## Risco / pontos de atenção

1. **Polimorfismo Money ↔ NonZeroMoney.** Brand é `unique symbol` — TS faz NonZeroMoney → Money implicitamente (widening), Money → NonZeroMoney exige cast deliberado via smart constructor. Verificar com `@ts-expect-error` que o widening reverso é bloqueado.
2. **Mapper rehidratação.** Row com `impactValueCents=0` em variant Addition/Suppression representa **estado impossível** (não deveria persistir após este ticket). Mas pode existir em state files antigos — mapper deve emitir `amendment-mapper-impossible-shape` (não silenciar). Validação adicional em `cli/state.ts:isValidAmendment`.
3. **Compatibilidade de erro.** `amendmentImpactValueZero` continua emitido — agora apenas do use case (não do domínio). Testes externos que verificam o tag continuam passando.
4. **`zero` constant em `Money.ts`.** Continua existindo (`Money.ZERO`) — usado como saldo/identidade. NonZeroMoney não interfere.
5. **Fixtures.** `someMoney(500_000)` continua válido — só onde Addition/Suppression usa precisa de wrapping em `NonZeroMoney.from(...)` no builder.
6. **Mitigação Bug #47936.** Continuar com Opus + checklist + hook + fallback admin.

---

## Próximos tickets (cadeia)

```
[FECHADO] STATE-MACHINE-AMENDMENT → [ESTE] INVARIANT-CONTEXTUAL
                                          ↘ [LATER] SKILL-REFRESH-D (D§25-27 + Padrão D consolidado)
                                          ↘ [LATER] MAPPER-RESULT (Bloco A)
                                          ↘ [LATER] RESTRUCTURE (promove Money/NonZeroMoney para src/shared/kernel/)
```
