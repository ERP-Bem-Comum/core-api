---
título: "Entrevista 0001 — Modernização do Domínio (DDD Funcional aplicado a TS 6 puro)"
data_início: 2026-05-18
status: FECHADO
escopo: src/modules/contracts/domain/**
participantes:
  - host: "Senior TS — praticante da SKILL `ts-domain-modeler` há ~18 meses"
  - convidado: "PhD em modelagem funcional — referências: Scott Wlaschin (DDD Made Functional), Alexis King (Parse, don't validate), LangSec (shotgun parsing), Evans (DDD), Cockburn (Ports & Adapters)"
referências_canônicas:
  - "[ts-domain-modeler SKILL](../../.claude/skills/ts-domain-modeler/SKILL.md)"
  - "[CLAUDE.md raiz](../../CLAUDE.md)"
  - "[handbook/reference/typescript/](../reference/typescript/)"
tickets_gerados:
  - CTR-DOMAIN-DEBRAND-AGG          # [A] remove brand de Contract/Amendment, introduz updateContract/updateAmendment
  - CTR-DOMAIN-MAPPER-RESULT        # [A] mappers do Drizzle retornam Result<Aggregate, RehydrationError>
  - CTR-SKILL-REFRESH-A             # [A] atualiza SKILL §3.A com rules do Bloco A
  - CTR-SHARED-IMMUTABLE            # [B] facade immutable()/deepImmutable() encapsulando Object.freeze
  - CTR-SHARED-BRAND-UNIQUE-SYMBOL  # [B] migra shared/brand.ts para unique symbol global + BrandOf<T>
  - CTR-SHARED-VO-CANONICAL         # [B] refatora money/period/ids/bucket-name/storage-* no novo template
  - CTR-DOMAIN-IMPORT-CODEMOD       # [B] codemod ts-morph: import { X } → import * as X (~200 imports)
  - CTR-SKILL-REFRESH-B             # [B] atualiza SKILL §3.B com 9 DO + 9 DON'T + 4 CONSIDER do Bloco B
  - CTR-SHARED-RESULT-COMBINATORS   # [I/E3/A4] shared/result.ts ganha mapErr + combine (zero deps, ~50 LOC)
  - CTR-DOMAIN-COMPOSE-REFACTOR     # [I/E3/A4] refactor α (early return), β (combine), γ (combine + único mapErr)
  - CTR-SKILL-REFRESH-I             # [I/E3/A4] atualiza SKILL §3.I — Composição Funcional (7 DO + 6 DON'T + 3 CONSIDER)
  - CTR-DOMAIN-TAGGED-ERRORS        # [D] migra string-literal pra tagged records; free functions em errors.ts (Padrão D)
  - CTR-DOMAIN-STATE-MACHINE-CONTRACT  # [D] Contract vira union Active | Expired | Terminated com transições tipadas
  - CTR-DOMAIN-STATE-MACHINE-AMENDMENT # [D] Amendment vira union PendingWithoutDocument | PendingWithDocument | Homologated
  - CTR-DOMAIN-INVARIANT-CONTEXTUAL # [D] NonZeroMoney em shared/; Addition/Suppression exigem via construtor γ
  - CTR-SKILL-REFRESH-D             # [D] SKILL §3.D — Tagged Errors & Invariantes em Tipos (10 DO + 7 DON'T + 2 CONSIDER)
  - CTR-DOMAIN-EXHAUSTIVE-SWITCH-FIX # [C] remove throw new Error de todo default exhaustive (correção do PhD)
  - CTR-SKILL-REFRESH-C             # [C] SKILL §3.C — Discriminated Unions & Exhaustive Switch (corrige throw)
  - CTR-DOMAIN-RESTRUCTURE          # [H] cria src/shared/kernel/, move Repository pra domain/<agg>/, refs de storage pra application/ports/
  - CTR-SKILL-REFRESH-H             # [H] SKILL §3.H — Organização de Módulo (layout canônico)
  - CTR-DOMAIN-IMPORTS-STRATEGY     # [J] Opção C + config package.json#imports (#kernel/*, #shared/*)
  - CTR-DOMAIN-IMPORT-TYPE-UNIFORM  # [J] codemod ts-morph uniformizando `import type` em todo o repo
  - CTR-DOMAIN-K-OPTIONAL           # [K] K2 template literal types (PascalCase) + K5 satisfies sistematizado
  - CTR-SKILL-REFRESH-L             # [L] SKILL §3.L — Síntese Canônica (40 DO + 16 CONSIDER + 5 AVOID + 44 DON'T)
---

# Entrevista 0001 — Modernização do Domínio (DDD Funcional)

## Objetivo

Submeter o desenho atual de `src/modules/contracts/domain/**` ao crivo de modelagem funcional moderna. Identificar cheiros, destilar rules (DO/DON'T/CONSIDER) e gerar tickets de refactor para a pipeline W0→W3.

## Mapa dos blocos

| Bloco | Tema | Status |
| :---: | :--- | :---: |
| **A** | Branded types e o cast `as unknown as T` | **FECHADO ✅** |
| **B** | Smart constructors, parse, identidades fixas (unificado em B1+B2+B3 + followup) | **FECHADO ✅** |
| **C** | Discriminated unions e variantes (aninhamento status × kind, dupla taxonomia mantida, exhaustive sem throw) | **FECHADO ✅** |
| **D** | Erros tagged + invariantes em tipos (Minsky + King — state machine, shape, naming, localização) | **FECHADO ✅** |
| **E** | Operações que devolvem `{ entity, event }` | EM ANDAMENTO (E3 ✅ ; E1/E2 abertos) |
| **F** | Eventos de domínio (encoding, evolução de schema) | PENDENTE |
| **G** | Modelagem temporal (branded `Instant`, Clock port, fim do `isValidDate` espalhado) | **FECHADO ✅** |
| **H** | Organização do módulo (granularidade, ports no domain vs application, Shared Kernel) | **FECHADO ✅** |
| **I** | `Result<T, E>` e ergonomia FP (resolução: homemade + `mapErr` + `combine`) | **FECHADO ✅** |
| **J** | Imports (Opção C: relativos intra-BC + subpath cross-BC) + `import type` uniforme | **FECHADO ✅** |
| **K** | K1 DON'T, K2 CONSIDER, K3 AVOID, K4 ✅ em B-followup, K5 DO | **FECHADO ✅** |
| **L** | Síntese canônica: 40 DO + 16 CONSIDER + 5 AVOID + 44 DON'T (host expandiu de 16 → 105 entradas) | **FECHADO ✅** |

---

## Set the stage (host)

Resumo do desenho vigente, do qual o host parte:

1. `Brand<Shape, 'Tag'>` em `shared/brand.ts` para nominalizar.
2. Smart constructor namespace pattern: `export const Money = { fromCents, add, subtract, … }`.
3. Discriminated unions para variantes (`Amendment.kind`, `Period.kind`, `ContractAdjustment.kind`).
4. Erros como string literal unions kebab-case (`'contract-not-active' | …`).
5. Switch exaustivo **sem `default`** confiando em `noFallthroughCasesInSwitch` + comentário.
6. Mutação por spread + `as unknown as ContractEntity` para "carimbar" o brand.
7. Operações retornam `{ entity, event }` — entity nova + evento.
8. Ports vivem em `application/ports/` (não em `domain/`).

Funciona. Mas relendo `contract/contract.ts` linha a linha aparecem suspeitas de cheiro que serão submetidas a auditoria.

---

## Bloco A — Branded types e o cast `as unknown as T`

### Status: FECHADO ✅

### A1 — O cast é mentira ou disciplina?

**Q (host):**

Em `contract/contract.ts:67, 96, 118, 152, 162, 180, 187` aparece o padrão:

```ts
const next = {
  ...contract,
  status: 'Expired',
  endedAt: at,
} as unknown as ContractEntity;
```

O `Brand<>` por construção exige um cast em algum ponto — mas aqui o cast acontece **toda vez que o agregado muda de estado**, e o objeto passa por `as unknown` (apagando o tipo) antes de virar `ContractEntity`. Isso bypassa qualquer narrowing que o TS poderia oferecer.

- Aceitável como "preço do brand" ou pegada de boilerplate que mascara erros?
- Existe padrão mais defensivo (helper `rebrand<T>(prev: T, patch: Partial<Unbrand<T>>): T`)?
- Migrar para nominal types via `unique symbol` reduziria a dor?

**R (PhD):**

É **boilerplate perigoso**. O TS remove `as` em tempo de compilação sem verificação em runtime — desativa excess property checking e perde o aviso quando esquece-se de atualizar uma propriedade. Defende o helper como excelente alternativa: a função `updateContract(prev, patch)` obriga o TS a validar o `patch` contra a estrutura real (`Partial<Unbrand<T>>`), garantindo narrowing e excess-property-check antes de reaplicar o carimbo num único ponto auditado. Sobre `unique symbol`: melhora ergonomia (mensagens de erro mais limpas, sem intersecção com phantom string), mas qualquer nominalização em TS exige cast em algum ponto — a chave é **encapsular esse cast** para que o código de negócio nunca toque em `as`.

### A2 — Brand é a melhor abstração ou estamos forjando objetos com identidade nominal quando o que queremos é "parse-once-trust-forever"?

**Q (host):**

`Money = Brand<{ readonly cents: number }, 'Money'>` é, na prática, um proof-carrying value: "este número de centavos passou por `fromCents()` então é seguro".

- Brand-via-intersection, brand-via-`unique symbol`, ou opaque type via module-private?
- Zod / Effect Schema como single source of truth de parse + tipo + erro?
- Phantom field via `unique symbol` muda algo além de estética?

**R (PhD):**

Capturou exatamente a essência da máxima de Alexis King: "consumir entrada menos estruturada e produzir saída mais estruturada, preservando na tipagem o fato de que a validação ocorreu". Wlaschin idem: usar wrappers para evitar primitive obsession e separar conceitos do domínio das representações (`EmailAddress of string`).

- **Preferido:** tipo opaco protegido por módulo (`export type Money` sem exportar estrutura interna, exportando apenas o construtor) — é o mais puro e seguro.
- **Zod/Effect Schema casam perfeitamente** com "Parse, don't validate". Operam nas fronteiras (Ports/Adapters), transformando dados brutos em tipos de domínio. Eliminam boilerplate manual de erro + tipo + parser.
- **Phantom field via `unique symbol`** afeta principalmente ergonomia (mensagens de erro mais limpas).

### A3 — Brand de agregado (Contract, Amendment) faz sentido?

**Q (host):**

`Contract = Brand<ContractShape, 'Contract'>` e `Amendment = Brand<AmendmentBase & AmendmentVariant, 'Amendment'>` — agregado inteiro brandado.

- Brand do agregado serve para algo além de impedir literais?
- Se removido, como impedir "structural typing acidental"?

**R (PhD):**

**Faz muito pouco sentido brandar agregado.** Agregado tem ciclo de vida e mutações de estado constantes — VO brandado prova validação atômica e imutável; agregado, não. Brand de agregado causa o excesso de casts perigosos.

- **Remover** o brand de `Contract` e `Amendment`.
- **Structural typing acidental fica impedido pela presença de VOs brandados nas folhas** (`id: ContractId`, `originalValue: Money`, `originalPeriod: Period`). A estrutura do `Contract` torna-se matematicamente quase impossível de forjar sem passar pelos smart constructors dos VOs.

### A4 (follow-up do host) — Como impor a regra de fronteira?

**Q (host):**

Sem brand no agregado, o adapter Drizzle (`mappers/contract.ts`) pode literalmente retornar um objeto estruturalmente compatível mesmo que algum VO interno não tenha passado por `rehydrate`. Você impõe — pela SKILL — que **todo mapper devolve `Result<Aggregate, RehydrationError>`** usando **só** os smart constructors dos VOs internos?

**R (PhD):**

**Sim, ratificado 100%.** Justificativas:

1. **Compilador vira guardião (Parse, don't validate na prática):** o TS não compila se o mapper tentar forjar `{ id: '123', originalValue: 500 }` — para casar com `ContractShape`, é forçado a invocar os smart constructors de cada VO.
2. **Banco de dados é fronteira externa (I/O) — não confiar cegamente.** Em Ports & Adapters funcional, o BD vive no Imperative Shell; o domínio é o Functional Core puro. O mapper consome dados menos estruturados e os parseia para a estrutura forte do agregado.
3. **Tratamento explícito de falhas na borda:** como os smart constructors retornam `Result`, o mapper herda a falibilidade. `Result<Aggregate, RehydrationError>` obriga o chamador a tratar BD corrompido ou inconsistente com versão atual do código. Elimina shotgun parsing.

### A5 — Esqueleto do mapper (host propôs, PhD ratificou)

```ts
// src/modules/contracts/adapters/persistence/mappers/contract.ts
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

  // … currentValue, originalPeriod, currentPeriod, amendmentIds, status …

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

**PhD ratificou a cara final:** captura a essência de "Parse, don't validate". Fim do shotgun parsing, aproveitamento real do compilador (excess property checking) sem `as`, tratamento exaustivo de erros via união discriminada.

### A.final — Rules consolidadas do Bloco A

#### DO

1. Brand **apenas em VOs folha** (`Money`, `Period`, `ContractId`, `AmendmentId`, `DocumentId`, `UserRef`, `BucketName`, `StorageKey`).
2. Encapsular o cast `as` num **único ponto auditado** por VO — o smart constructor.
3. Considerar `unique symbol` quando ergonomia de erro do TS importar.
4. Em transição de estado de agregado, usar helper `updateAggregate(prev, patch)` com `Partial<Omit<Aggregate, …imutáveis>>` codificando as chaves imutáveis no tipo.
5. **Adapter de persistência reidrata agregado apenas via smart constructors de VOs internos, retornando `Result<Aggregate, RehydrationError>`. Nunca monta literal direto.** ← regra de fronteira.

#### DON'T

1. Brandar agregados (`Contract`, `Amendment`). Brand de agregado causa `as unknown as` em cascata.
2. `as unknown as T` em código de negócio. Aparição = falta de helper tipado.
3. Confundir validação booleana com parse (`Result<T, E>`).
4. Mapper de Drizzle/HTTP montando literal de agregado — é **shotgun parsing**, condenado por LangSec.

#### CONSIDER

1. Zod / Effect Schema como fonte única de parse + tipo + erro **na borda** (CLI, mappers, HTTP futuro).

### Tickets derivados do Bloco A

- **CTR-DOMAIN-DEBRAND-AGG** — remove brand de `Contract` e `Amendment`, introduz `updateContract` e `updateAmendment` com `Partial<Omit<…, imutáveis>>`.
- **CTR-DOMAIN-MAPPER-RESULT** — mappers do Drizzle retornam `Result<Aggregate, RehydrationError>` com tagged errors. W0 escreve testes para linha corrompida.
- **CTR-SKILL-REFRESH-A** — atualiza `.claude/skills/ts-domain-modeler/SKILL.md §3.A` com as rules acima.

---

## Bloco D — Erros como string literal unions vs tagged errors

### Status: EM ANDAMENTO

- **D1** ✅ respondido (tagged records ratificados, Wlaschin + Alexis King citados)
- **D2** aberto (state refinement — `ActiveContract` etc.)
- **D3** aberto (forma do tagged record sem virar classe)
- **D4** aberto (naming — PascalCase vs kebab vs dot-notation)
- **D5** aberto (rota α/β/γ + heurística + shotgun + localização de invariante)

### Premissa renovada (vinda do Bloco A)

A borda (Zod) entrega valores válidos. O que sobra para o domínio rejeitar é **violação de invariante de negócio** — não input malformado.

### D1 — Strings literais vs tagged errors

**Q (host):**

```ts
export type ContractError =
  | 'contract-not-active'
  | 'contract-cannot-expire-yet'
  | 'contract-amendment-already-applied'
  | …;
```

Vantagens: barato, serializável, comparável por `===`, narrowing automático.
Custo: erro sem payload (`currentEnd` do contrato quando rejeitei `expire`?), não compõe entre agregados.

- Manter string literal ou migrar para **tagged errors** com payload?
- Se tagged, como evitar reinventar `extends Error` com classe?
- Separar erros de invariante (mensagem humana) de erros de validação (campo) com tipos distintos?

**Caso vivido (host, contexto adicional):** P.O. tentou encerrar o contrato 042/2026 pela CLI, levou `'contract-cannot-expire-yet'`. Pergunta natural: "então quando ele pode encerrar?". A string não carrega `currentPeriod.end` nem o `at` tentado. CLI precisou de `if` extra com refetch do contrato para formatar a data. Três sintomas: (i) refetch fede — a informação **estava na mão** quando a regra rejeitou; (ii) se o predicado mudar (buffer de N dias após o fim), a CLI mente sem ninguém perceber; (iii) não escala — toda nova regra com contexto vai querer caso especial.

**R (PhD):**

Migração para **tagged records** está correta e 100% aderente à modelagem funcional. Dissecação das três hesitações:

#### (i) Tagged records ≠ classes disfarçadas

Diferença categorial fundamental. A aversão de Uncle Bob/Wlaschin a classes está ligada a encapsulamento de comportamento com estado + herança implícita. Tagged record é a representação de um **Choice Type** construído pelo operador "OR" — pacote de dados imutável, sem métodos, sem estado escondido, sem hierarquia. Apenas conta um "fato" que ocorreu no domínio para que o shell imperativo (CLI) possa agir.

Regra de ouro do Wlaschin: **"Use the power of a composable type system: Choices rather than inheritance."**

O record `{ tag: 'ContractCannotExpireYet', currentEnd: Date, attemptedAt: Date }` mantém o código puramente funcional. Migrar para isso é sem pecado.

#### (ii) "Sopa" de 40 records vs 40 strings — falsa dicotomia

A simplicidade visual das strings era **falsa economia**: menos código escrito, mas contexto crítico perdido (vide refetch na CLI).

Em TS, transformar a sopa em **Discriminated Union** é o padrão-ouro:
- TS usa `tag` como discriminador.
- Benefício não é só narrowing no `switch (e.tag)` — é **Exhaustiveness Checking** via `never`: o formatter é forçado a tratar todas as variantes ou levar erro de compilação. Toda regra nova obriga manutenção da exibição.

**Ponto-ótimo (resposta direta à dúvida do host):** não existe `DomainError` único com 40 variantes. Cada Use Case retorna apenas os erros que **ele** pode disparar. `ExpireContractUseCase` devolve `ContractCannotExpireYet | ContractNotActive | ContractNotFound` — três, não quarenta. A "sopa" vira fatias precisas, fáceis de manter, dedicadas por caso de uso.

#### (iii) Existe terceira categoria — e é a única que sobra no domínio

Diretamente ligada a "Parse, don't validate" (Alexis King). Após Zod na borda:

| Categoria | Onde vive | Exemplo |
| :--- | :--- | :--- |
| **Erro de input / forma** | Borda (Zod) — morre antes de chegar ao domínio | "campo obrigatório", "CPF inválido", "data malformada" |
| **Erro semântico / violação de regra de negócio** | Domínio — Choice Type rico | "contrato encerrado", "tentativa de encerramento antes da data permitida" |

Alexis King:
> "The set of remaining failure modes during execution is minimal by comparison, and they can be handled with the tender care they require."

Esse "tender care" é exatamente a categoria que o host pressentiu. **Não são bugs do sistema — são resultados de negócio válidos e esperados.** A operação faz sentido lexicalmente (tipos batem, dados não são nulos), mas o estado da máquina de negócios proíbe a ação. Modelá-los como Choice Types ricos é a maneira de o domínio documentar suas regras e conversar com o exterior.

#### Veredito

Abraçar tagged records com payload sem medo. Tradução direta do Wlaschin. Remove o acoplamento bizarro de lógica na CLI. Torna o domínio autossuficiente para explicar **o porquê** de uma rejeição — sem refetch, sem mentira silenciosa, sem caso especial por regra.

#### Follow-up do PhD ao host

Como nomear e formatar a convenção (DO/DON'T) dessas regras? — puxa naturalmente **D3 (forma)** e **D4 (naming)** para frente.

### D2 — `assertActive` que **não refina** o tipo

**Q (host):**

```ts
const assertActive = (contract: Contract): Result<Contract, 'contract-not-active'> =>
  contract.status === 'Active' ? ok(contract) : err('contract-not-active');
```

A função se chama `assertActive` mas retorna o próprio contract no `ok` — não há refinamento. Versão refinante:

```ts
type ActiveContract = Contract & { readonly status: 'Active' };

const assertActive = (c: Contract): Result<ActiveContract, 'contract-not-active'> =>
  c.status === 'Active' ? ok(c as ActiveContract) : err('contract-not-active');
```

E `applyHomologatedAdjustment(c: ActiveContract, …)` em vez de `(c: Contract, …)`.

- Aprovas? Custos: (i) `as ActiveContract` controlado no guard; (ii) cada operação que muda status precisa de uma transição tipada.
- Generalizar para **um tipo por estado** (`ActiveContract`, `ExpiredContract`, `TerminatedContract`)?
- Como ESLint/SKILL força "função que muda status retorna tipo diferente"?

**R (PhD):** _pendente_

### D3 — Erros estruturados sem virar classe e sem trazer Effect

**Q (host):**

```ts
export type ContractError =
  | { readonly tag: 'ContractNotActive'; readonly currentStatus: ContractStatus }
  | { readonly tag: 'ContractCannotExpireYet'; readonly currentEnd: Date; readonly attemptedAt: Date }
  | { readonly tag: 'AmendmentAlreadyApplied'; readonly amendmentId: AmendmentId }
  | { readonly tag: 'ContractValueWouldGoNegative'; readonly currentValue: Money; readonly subtrahend: Money };

const ContractError = {
  notActive: (currentStatus: ContractStatus): ContractError =>
    ({ tag: 'ContractNotActive', currentStatus }),
  cannotExpireYet: (currentEnd: Date, attemptedAt: Date): ContractError =>
    ({ tag: 'ContractCannotExpireYet', currentEnd, attemptedAt }),
};
```

- `tag` como discriminador (PascalCase) em vez de `type` (reservado para eventos) e em vez de string kebab — alinha?
- Quem traduz para PT-BR — `cli/formatters/error.ts` com `switch (e.tag)` exaustivo?
- Idempotência semântica: comparar por `e.tag === 'AmendmentAlreadyApplied'` em vez de string literal — muda algo em testes?

**R (PhD):** _pendente_

### D4 — Convenção de naming

**Q (host):**

- Hoje: `'contract-not-active'`, kebab, prefixado por agregado.
- Proposta: `tag: 'ContractNotActive'`, PascalCase.
- Alternativa: `tag: 'Contract.NotActive'` com dot-notation explícita.
- Eventos hoje são `ContractCreated`, `AmendmentHomologated` — erros paralelos lexicalmente: vantagem ou confusão visual?

**R (PhD):** _pendente_

### D5 — A "fronteira da Zod" ainda precisa de ContractError? — **caso `Addition.impactValue.cents === 0`**

**Q (host):**

Hoje em `amendment.ts:35`:

```ts
case 'Addition':
case 'Suppression':
  if (input.impactValue.cents === 0) return err('amendment-impact-value-zero');
  return ok(true);
```

Esta regra tem **dois ramos**:
- "Money não pode ser zero" — falso: `Money.zero()` existe legitimamente como saldo, total, etc.
- "Um Aditivo Addition/Suppression com impacto zero não existe" — **invariante contextual**.

Não dá para empurrar para Zod sem perder contexto. Três rotas:

#### Rota α — `NonZeroMoney` brandado, polimórfico

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

Pró: invariante codificada em tipo. Contra: explosão de VOs (`PositiveMoney`, `NonZeroMoney`, `MoneyGT100`, …).

#### Rota β — Invariante mora no agregado, sem subtype

```ts
case 'Addition':
case 'Suppression':
  if (input.impactValue.cents === 0)
    return err({ tag: 'AmendmentImpactValueZero', kind: input.kind });
```

Pró: zero VO novo. Contra: mantém runtime check.

#### Rota γ — Construtor por kind

```ts
const createAddition    = (input: AdditionInput):    Result<CommandOutput, AmendmentError> => …;
const createSuppression = (input: SuppressionInput): Result<CommandOutput, AmendmentError> => …;
const createTermChange  = (input: TermChangeInput):  Result<CommandOutput, AmendmentError> => …;
const createMisc        = (input: MiscInput):        Result<CommandOutput, AmendmentError> => …;
```

Pró: cada construtor declara seu input exato. Casa com **E3** (fragmentar `applyHomologatedAdjustment`). Contra: 4 funções públicas onde tinha 1.

#### Perguntas-foco

- **D5.x** — Qual rota defendes? Host intuição: γ (sinergia com E3).
- **D5.y** — Heurística: quando codificar invariante como subtype (α/γ) vs no agregado (β)?
  - Proposta do host: subtype quando invariante for **atemporal e composta** (`PositiveMoney` reusado em Faturamento, Orçamento); no agregado quando **contextual e mutável**.
- **D5.z** — Shotgun parsing: como garantir que "Addition exige NonZeroMoney" seja declarada **uma vez** e propagada (Zod schema, tipo agregado, UI form, mensagem PT-BR)?
- **D5.w** — Localização de invariante (nomeação host): α = "VO como prova", β = "agregado como guardião", γ = "caso de uso como contrato". Esse enquadramento se sustenta no Wlaschin/Evans?
- **Cross-bloc com C2:** combinar γ no eixo `kind` com state machine no eixo `status` (`PendingAmendment` vs `HomologatedAmendment`)?

**R (PhD):** _pendente_

---

## Bloco B — Smart constructors, parse e identidades fixas

### Status: FECHADO ✅

> **Resolução:** as perguntas B1, B2 e B3 foram unificadas numa **pergunta semântica** `Pergunta_B1_B2_B3` porque as três decisões se trancam mutuamente (export pattern + parse pattern + identity pattern). PhD respondeu o pacote em duas iterações; host levantou 4 tensões + 1 inconsistência em `Pergunta_B1_B2_B3_followup`; investigação dos handbooks confirmou TS handbook §199/§223 sobre aliasing rompendo `Readonly<T>`; terceira voz (consultor) ajudou a calibrar o naming (`immutable` venceu `realConst`/`makeConst`/`strictConst`). Bloco fechou com 9 DO + 9 DON'T + 4 CONSIDER, 5 tickets coordenados, e o **template canônico do Smart Constructor** pronto para virar §3.B do `SKILL.md`.
>
> **Arquivos canônicos:**
> - [`0001/Pergunta_B1_B2_B3_tec_lider_using_skill_ts-domain-modeler.md`](./0001/Pergunta_B1_B2_B3_tec_lider_using_skill_ts-domain-modeler.md) — pergunta unificada + R do PhD (template `interest-rate.ts`)
> - [`0001/Pergunta_B1_B2_B3_followup_tec_lider_using_skill_ts-domain-modeler.md`](./0001/Pergunta_B1_B2_B3_followup_tec_lider_using_skill_ts-domain-modeler.md) — 5 tensões fechadas + investigação dos handbooks + decisão de naming `immutable` + helper `Brand<T,K>` codificado
>
> As perguntas individuais `Pergunta_B1`, `Pergunta_B2`, `Pergunta_B3` ficam marcadas como `superseded` apontando para a unificada.

### B1 — Namespace-objeto vs free functions vs module-pattern

**Q (host):**

```ts
export const Money = {
  fromCents: (cents: number): Result<Money, MoneyError> => { … },
  zero:      (): Money => …,
  add:       (a: Money, b: Money): Money => …,
  subtract:  (a: Money, b: Money): Result<Money, 'money-negative-result'> => …,
  equals, greaterThan,
};
```

Pró: agrupa, autocomplete limpo. Contra: perde tree-shaking, declaration merging informal entre tipo e const.

- Manter ou migrar para free functions (`moneyFromCents`, `moneyAdd`)?
- Submódulo separado para tipo (`money.types.ts`)?
- Function-as-constructor: `function Money(cents): Result<Money, MoneyError>` + `Money.add` no const homônimo via declaration merging?

### B2 — Parse, don't validate vs Zod no smart constructor

**Q (host):**

- Result homemade ou Effect Schema / Zod no domínio?
- `cents > MAX_SAFE_INTEGER` gateado ou migrar para `bigint`?

### B3 — `Money.zero()` é função ou constante?

**Q (host):**

- Por que função se constante frozen serve? Quando função se justifica (Date.now-like)?

---

## Bloco C — Discriminated unions e variantes

### Status: PENDENTE

### C1 — `Amendment` é intersection (`Base & Variant`) — endossa?

**Q (host):**

```ts
type AmendmentBase = Readonly<{ id, contractId, …, signedDocumentRef: DocumentId | null, … }>;
type AmendmentVariant =
  | { kind: 'Addition'; impactValue: Money }
  | { kind: 'Suppression'; impactValue: Money }
  | { kind: 'TermChange'; newEndDate: Date }
  | { kind: 'Misc' };
export type Amendment = Brand<AmendmentBase & AmendmentVariant, 'Amendment'>;
```

Base carrega `signedDocumentRef: DocumentId | null` — campo dependente de **status**, não de **kind**.

- Modelar dois eixos `(kind, status)` como 4×2 = 8 shapes?
- State machine encoded as types: `PendingAmendment` vs `HomologatedAmendment` como tipos distintos?
- Como lidar com explosão combinatória em agregados com >2 eixos?

### C2 — `signedDocumentRef: DocumentId | null` é optional-as-state

**Q (host):**

```ts
if (amendment.signedDocumentRef === null) {
  return err('amendment-without-signed-document');
}
```

Regra "só homologa se tem documento" virou runtime check, mas o tipo já sabia.

- `PendingWithoutDocument | PendingWithDocument | Homologated` — eliminar o `null` e empurrar regra para o compilador?
- Onde isso fura na serialização vinda do DB?

### C3 — `ContractAdjustment` espelha `Amendment` — anti-pattern ou duas taxonomias legítimas?

**Q (host):**

```ts
export type ContractAdjustment =
  | { kind: 'ValueIncrease'; amount: Money; amendmentId: AmendmentId }
  | { kind: 'ValueDecrease'; amount: Money; amendmentId: AmendmentId }
  | { kind: 'PeriodExtension'; newEnd: Date; amendmentId: AmendmentId }
  | { kind: 'Acknowledgment'; amendmentId: AmendmentId };
```

Cria segunda taxonomia (Amendment olha ato administrativo; Adjustment olha efeito no Contract).

- Tipo-ponte legítimo ou anti-pattern?
- `Amendment.toAdjustment(amendment): ContractAdjustment` única ponte?

### C4 — Switch exaustivo sem `default`

**Q (host):**

```ts
switch (adjustment.kind) {
  case 'ValueIncrease': { … }
  case 'ValueDecrease': { … }
  case 'PeriodExtension': { … }
  case 'Acknowledgment': { … }
}
// sem default — confia em tsc.
```

- Confiar em `noImplicitReturns` ou usar `const _exhaustive: never = adjustment; return _exhaustive`?
- SKILL atual exige `default: { const _: never = x }` com `throw` — viola "zero throw". Como reconciliar?
- `assertNever(x: never): never` como exceção isolada?

---

## Bloco E — Operações que devolvem `{ entity, event }`

### Status: PENDENTE

### E1 — É domínio ou mini event-sourcing-by-hand?

**Q (host):**

```ts
type CommandOutput = Readonly<{
  contract: ContractEntity;
  event: ContractEvent;
}>;
```

Calcula novo estado E emite evento — duas descrições da mesma transição.

- Event sourcing puro (função só retorna evento; estado é projeção via `apply(state, event)`)?
- Manter `CommandOutput` ou separar derivação do evento (`Contract.eventOf(prev, next)`)?
- Risco de dois objetos correlacionados que precisam ficar em sync.

### E2 — `Acknowledgment` muda o agregado?

**Q (host):**

```ts
case 'Acknowledgment': {
  const next = { ...contract, homologatedAmendmentIds: nextIds } as unknown as ContractEntity;
  return ok({ contract: next, event: stateUpdatedEvent(next, at, adjustment.amendmentId) });
}
```

`currentValue` e `currentPeriod` não mudam, mas evento se chama `ContractStateUpdated`.

- Evento diferente (`ContractAmendmentAcknowledged`) ou aceitar "noisy"?
- Evento reflete **causa** ou **consequência**?

### E3 — `applyHomologatedAdjustment` carrega responsabilidade demais?

**Q (host):**

60 linhas, 4 returns por branch — `assertActive`, `assertValidEventDate`, idempotência, switch entre 4 kinds, produção de evento.

- Fragmentar em 4 funções (`applyValueIncrease`, …) com dispatcher?
- Guard clauses repetidas — adotar `Result.pipe` ad-hoc?

---

## Bloco F — Eventos de domínio

### Status: PENDENTE

### F1 — Discriminated union em `events.ts`

**Q (host):**

```ts
type ContractEvent =
  | { type: 'ContractCreated'; contractId; occurredAt }
  | { type: 'ContractEnded'; contractId; occurredAt; kind: 'Expired' | 'Terminated' }
  | { type: 'ContractStateUpdated'; contractId; occurredAt; amendmentId; newCurrentValue; newCurrentPeriod };
```

`ContractEnded.kind` é segundo nível de discriminação dentro de um caso da primeira união.

- Nivelar (`ContractExpired`, `ContractTerminated`) ou manter aninhamento?
- Evento carrega estado pós-mudança ou só a mudança (`valueDelta`)?
- Quando faz sentido payload redundante com o agregado?

### F2 — Schema evolution

**Q (host):**

Sem versionamento hoje. Se adicionar `currency` em `Money`, eventos antigos viram inválidos.

- Field-level optionals com defaults? Migrations de evento? `version` no envelope?
- Omissão grave na SKILL ou decisão consciente "lidamos quando aparecer"?

---

## Bloco G — `Date` no domínio

### Status: PENDENTE

### G1 — `Date` é mutável, timezone-aware, IEEE-irregular

**Q (host):**

`Period.start: Date`, `Contract.signedAt: Date`, `Amendment.createdAt: Date`.

- Trocar por **Temporal** (TC39 Stage 3) — `Temporal.Instant`, `Temporal.PlainDate`?
- Branded `Instant = Brand<number, 'Instant'>` (epoch ms)?
- Clock port no domínio ou na application?

### G2 — `isValidDate` no domínio

**Q (host):**

```ts
const assertValidEventDate = (at: Date): Result<Date, 'contract-invalid-event-date'> =>
  isValidDate(at) ? ok(at) : err('contract-invalid-event-date');
```

- Defesa em profundidade útil ou paranoia que polui o tipo?
- Branded `ValidDate = Brand<Date, 'ValidDate'>` resolveria?
- Onde está a fronteira depois da qual o domínio confia?

---

## Bloco H — Organização de pastas / "DDD funcional"

### Status: PENDENTE

### H1 — Agregado-por-pasta vs feature slice

**Q (host):**

```
domain/
├── shared/{money, period, ids, ...}.ts
├── contract/{types, events, errors, contract.ts}
└── amendment/{types, events, errors, amendment.ts}
```

- Manter granularidade ou colapsar em **um arquivo por agregado**?
- Inverter para **feature slice** (`homologate-amendment/`)?

### H2 — Ports moram em `application/ports/` — Evans estaria de acordo?

**Q (host):**

A SKILL/CLAUDE.md põe ports em `application/`. Cockburn clássico: ports definidos pelo lado de dentro, i.e., pelo domínio.

- `ContractRepository` em `domain/contract/repository.ts` ou `application/ports/`?
- Regra "Repository em `domain/`, EventBus/Storage/Clock em `application/ports/`" — faz sentido?

### H3 — `shared/` vs `kernel/`

**Q (host):**

Mistura VOs de domínio puro (`Money`, `Period`) com VOs de infra (`BucketName`, `StorageKey`).

- `domain/kernel/` para domínio puro e `domain/refs/` para VOs que apontam para fora?
- `BucketName`/`StorageKey` são domínio ou pollution?

---

## Bloco I — `Result<T, E>` e ergonomia FP

### Status: PENDENTE

### I1 — Result homemade vs neverthrow vs Effect

**Q (host):**

`shared/result.ts` é nosso. Não tem `.map`, `.flatMap`, `.match`, nem combinators. Resultado: cascata de `if (!x.ok) return x`.

- Adotar **neverthrow** (5kb, zero peer deps)? Effect (mais poderoso, mais peso)?
- Custo de legibilidade pra equipe não-FP-fluente.

### I2 — Async no domínio

**Q (host):**

Domínio sync hoje. Borda cruza Promise → `Promise<Result<T, E>>` requer ferramentas (`ResultAsync`, `TaskEither`, Effect).

- Manter domínio rigorosamente sync?
- "Validação requer fetch" vira use case — como sinalizar fronteira?

### I3 — `combine` para inputs múltiplos

**Q (host):**

`create` em `contract.ts:41` faz 4 checks sequenciais — primeiro erro vence.

- Adicionar `combineAll` que coleta erros em paralelo (`Result<T, NonEmptyArray<E>>`)?
- Aceitar fail-fast porque erros são bugs, não input validation?

---

## Bloco J — Imports e ergonomia de módulo

### Status: PENDENTE

### J1 — Imports relativos profundos

**Q (host):**

```ts
import { type Result, ok, err } from '../../../../shared/result.ts';
```

- Subpath imports (`#shared/result.ts`) em todo lugar, não só testes?
- Relativos curtos forçam coesão?
- Barrel exports (`domain/shared/index.ts`) ou mascaram dependências?

### J2 — `import type` vs `import { type X }`

**Q (host):**

- Uniformizar para `import type` quando puro?
- Vantagem de `import { type X, valueY }` sobre split?

---

## Bloco K — Tipos avançados que **não** estamos usando

### Status: PENDENTE

### K1 — Higher-kinded approximations

**Q (host):**

Repetimos `Result<Foo, FooError>` em 200 lugares. `hkt-toolbelt` ou type lambdas rolados à mão.

- Vale o complexity budget? Onde compensa?

### K2 — Template literal types para erros

**Q (host):**

```ts
type ContractError = `contract-${'not-active' | 'cannot-expire-yet' | …}`;
```

- Útil ou over-engineering?

### K3 — Const type parameters (TS 5.0+)

**Q (host):**

`Money.fromCents(100)` com `const T` infere `cents: 100` literal preservado.

- Smart constructor + literal = fonte de provas em compile time?

### K4 — Branded via `unique symbol` vs intersection

**Q (host):**

```ts
declare const ContractIdBrand: unique symbol;
type ContractId = string & { readonly [ContractIdBrand]: 'ContractId' };
```

vs hoje:

```ts
type ContractId = Brand<string, 'ContractId'>;
```

- Diferença prática justifica o churn? (PhD já tocou nisso no Bloco A.)

### K5 — `satisfies` vs `as`

**Q (host):**

```ts
const contract = {
  id: input.id,
  ...
} satisfies Omit<ContractShape, '__brand'>;
return ok(contract as Contract);
```

- `satisfies` pega chaves faltando que `as unknown as` engole.
- Adoção sistemática corta bugs reais?

---

## Bloco L — Síntese final

### Status: PENDENTE (só faz sentido fechar depois de A-K)

### L1 — Top-5 cheiros do domínio atual, ordenado por gravidade

Host chuta: `as unknown as`, optional-as-state, ports em application, Date cru, namespace pattern.

### L2 — Top-3 mudanças com maior leverage

### L3 — Classificação final de cada decisão: DO / CONSIDER / AVOID / DON'T

---

## Compilado final de rules (running)

Atualizado a cada bloco fechado. **Hoje: Blocos A, B, C, D, H, I fechados (+ E3 e A4 transversalmente).** Restam: E1/E2, F, G, J, K, L.

### DO

1. (A) Brand apenas em VOs folha.
2. (A) Encapsular cast `as` num único ponto auditado por VO — o smart constructor.
3. (A) Considerar `unique symbol` quando ergonomia de erro do TS importar.
4. (A) Em transição de estado, usar helper `updateAggregate(prev, patch)` com `Partial<Omit<Aggregate, …imutáveis>>`.
5. (A) Adapter de persistência reidrata agregado **apenas via smart constructors de VOs internos**, retornando `Result<Aggregate, RehydrationError>`.
6. (B) Wrapper-brand para VOs que carregam grandeza/unidade/contexto evolutivo (`Money`, `InterestRate`, `Period`).
7. (B) Primitivo-brand apenas para identificadores opacos e estruturalmente irredutíveis (`ContractId`, `AmendmentId`, `DocumentId`, `UserRef`).
8. (B) Module-as-namespace (Padrão D): exportar free functions; consumir com `import * as Money from './money.ts'`.
9. (B) Smart constructor `from<Source>` retorna `Result<T, TaggedError>`. Tagged error carrega `attemptedValue: <tipo da assinatura>`.
10. (B) Identidade fixa via facade `immutable()` / `deepImmutable()` em `shared/immutable.ts`. Esconde `Object.freeze`.
11. (B) `shared/brand.ts` modernizado: `unique symbol` global + string literal `K`. Helper `Brand<T, K>` + `BrandOf<T>` para diagnóstico.
12. (B) Migração ~200 imports via codemod `ts-morph` big-bang num único ticket.
13. (I) `shared/result.ts` mantém zero deps. ~50 LOC: `ok`, `err`, `mapErr`, `combine`, `isOk`, `isErr`.
14. (I) Sequência dependente (α) usa **early return** com narrowing automático do TS (`Result<T, E>` é discriminated union).
15. (I) Inputs independentes (β) usam **`combine`** — coleta erros, melhora UX da borda.
16. (I) Tradução de erro na fronteira (γ) usa **`combine` + 1 `mapErr` no fim** — sem espalhar `if (!x.ok) return err(traduzir(x.error))` 10×.
17. (I) Domínio 100% **sync puro**. Application Layer (Imperative Shell) lida com `Promise`. Mark Seemann: "funções puras não se misturam com I/O".
18. (I) Aceitar **3 estratégias coexistentes** (α: early return; β: combine; γ: combine+mapErr). Não buscar técnica unificadora — é anti-pattern.
19. (I) Padrão D (module-as-namespace) protege contra proliferação de helpers. `shared/result.ts` é única fonte de verdade.
20. (D) **Um tipo refinado por estado de agregado** (`ActiveContract`, `ExpiredContract`, `TerminatedContract`). Transições são funções totais: `expire(c: ActiveContract): Result<ExpiredContract, …>`.
21. (D) Refinement via `parseActive`, `parsePending`, etc — alinhado com "Parse, don't validate". Não `assertActive` (imperativo).
22. (D) Tagged error shape **flat** (`{ tag, …payload }`). Case constructors como **free functions** em `errors.ts` por agregado (Padrão D consistente com B). Consumo via `import * as ContractError from './errors.ts'`.
23. (D) Payload de erro de invariante carrega **as duas peças de evidência que colidiram** (estado atual + tentativa).
24. (D) Erros: **PascalCase adjetival/factual** (`ContractNotActive`). Eventos: **PascalCase passado** (`ContractCreated`).
25. (D) **Rota α** (VO como Prova) — invariante atemporal e reusável.
26. (D) **Rota γ** (Caso de Uso como Orquestrador) — invariante de contexto específico, exigindo VO brandado no construtor.
27. (D) **Rota β** (Agregado como Guardião) — invariante contextual e mutável, dependente do estado interno.
28. (C) Modelar 2 eixos discriminantes como **aninhamento** (union por status, com kind interno) — não cross-product.
29. (C) Estados ELIMINAM `null` — campos optional-as-state viram propriedade obrigatória do tipo refinado.
30. (C) **Dupla taxonomia legítima** entre agregados quando os conceitos são categoricamente distintos (`Amendment` administrativo ↔ `ContractAdjustment` matemático). Mantém Ports & Adapters interno.
31. (C) `Amendment.toAdjustments(homologated): readonly ContractAdjustment[]` (**array**) — evolução assimétrica permite 1:N e 0:1.
32. (C) Exhaustive switch: **omitir `default`** (preferível) ou `default: { const _: never = x; return _; }`. Nunca `throw`.
33. (H) Granularidade canônica: 4-6 arquivos por agregado (`types`, `errors`, `events`, `<aggregate>.ts`, `repository.ts`, `index.ts`). `index.ts` barrel para `import * as Contract`.
34. (H) Critério H2: *"port ditado por invariância/ciclo-de-vida de Agregado?"* Sim → `domain/<aggregate>/repository.ts`; Não → `application/ports/`.
35. (H) Tipos do port moram junto do port — `BucketName`/`StorageKey` em `application/ports/document-storage.types.ts`.
36. (H) VOs puros cross-BC promovidos para `src/shared/kernel/` (Evans Shared Kernel) — `Money`, `Period`, `UserRef`.
37. (H) VOs específicos do BC ficam em `src/modules/<bc>/domain/shared/` — `ContractId`, `NonZeroMoney`, etc.
38. (H) `public-api/` por módulo — cada módulo dono dos eventos que emite (ADR-0006).

### DON'T

1. (A) Brandar agregados.
2. (A) `as unknown as T` em código de negócio.
3. (A) Confundir validação booleana com parse.
4. (A) Mapper montando literal de agregado direto (shotgun parsing).
5. (B) `Object.freeze` direto no código de domínio — usa `immutable`/`deepImmutable`.
6. (B) Brand-de-primitivo para grandezas/unidades (colapsa sob extensão).
7. (B) Namespace-objeto `export const Money = { … }` (perde tree-shaking + jargão OO).
8. (B) Function-as-constructor `Money(100)` retornando `Result` (quebra semântica JS).
9. (B) Zod **dentro** de `shared/<vo>.ts` — Zod vive no Adapter/Borda.
10. (B) Identidade como função (`zero()`) quando o valor é imutável puro.
11. (B) Migração dual coexistente (Padrão A legado + Padrão D novo) — drift permanente.
12. (B) `declare const brand: unique symbol` espalhado em cada arquivo de VO — centraliza em `shared/brand.ts`.
13. (I) Adotar `Effect`, `fp-ts`, `neverthrow` no domínio — peso conceitual / API com classe / jargão FP.
14. (I) Implementar `andThen`/`flatMap`/`chain` — redundante com early return + narrowing nativo do TS.
15. (I) Implementar `pipe`, `flow`, `compose` no domínio — vira jargão FP. Wlaschin: "domínio não fala jargão de programador".
16. (I) Implementar `traverse`, `sequence`. Casos reais cabem em `combine` ou loop nativo.
17. (I) `ResultAsync` no domínio. Mistura sync com async; viola Functional Core / Imperative Shell.
18. (I) Usar `combine` em sequência dependente (α). `combine` é APPLICATIVE — pra independente. Em sequência, é desperdício de cálculo e exposição de erros sem sentido.
19. (D) `assertActive` que devolve `Contract` cru — fere refinement.
20. (D) `if (contract.status !== 'Active')` espalhado em código de negócio — shotgun parsing.
21. (D) `export const ContractError = { … } as const` ao lado de `export type ContractError` — declaration merging informal, viola Padrão D do Bloco B (contradição admitida pelo PhD no follow-up de D2+D3+D4+D5).
22. (D) Erro de invariante carregando primitivo cru sem ser evidência da colisão.
23. (D) Naming imperativo (`assertActive`, `validateActive`) — remete a exceções.
24. (D) Codificar invariante reusável como `if` no agregado — promove para VO subtype (α).
25. (D) Espalhar o **mesmo** `if` em múltiplos pontos — declarar **uma vez** como tipo e propagar via construtor γ.
26. (C) Cross-product de 2 eixos discriminantes (`4 kinds × 3 status = 12 tipos`) — duplica máquina de estado.
27. (C) Transição de estado retornando tipo direto sem `Result` — não há como sinalizar falha sem `throw`.
28. (C) Eliminar `ContractAdjustment` em nome de DRY mecânico — argumento da evolução assimétrica (1:N + 0:1) prova que não é 1:1.
29. (C) `default: throw new Error(...)` no exhaustive switch — viola "zero throw" do CLAUDE.md raiz. **Contradição admitida do PhD** (usou no template após cobrança).
30. (C) `assertNever(x: never): never` como helper — exige `throw` (TS rejeita função `never` sem corpo). Banido.
31. (H) Colapsar agregado em arquivo único de 600+ linhas — fere legibilidade do Padrão D.
32. (H) Feature slice por operação (`homologate-amendment/`) — fragmenta a state machine do agregado.
33. (H) Repository em `application/ports/` — confunde port de invariância (domínio) com port de capacidade (aplicação).
34. (H) VOs de infra (`BucketName`, `StorageKey`) em `domain/shared/` — vazamento de jargão técnico no domínio.
35. (H) `src/shared/events/` global cross-module — apaga ownership do evento e viola isolamento do modular monolith. Eventos vivem em `src/modules/<bc>/public-api/`.
36. (H) Promover qualquer VO específico do BC para `src/shared/kernel/` — só sobe pra Kernel o que é genuinamente reusado cross-BC.

### CONSIDER

1. (A) Zod / Effect Schema como fonte única de parse + tipo + erro **na borda**.
2. (B) `deepImmutable` para VOs compostos com sub-VOs aninhados.
3. (B) `BrandOf<Money>` em testes/diagnóstico.
4. (B) `bigint` no domínio se valores se aproximarem de `MAX_SAFE_INTEGER`. Domain-driven, não DB-driven.
5. (B) `Object.isFrozen()` em property-based tests confirmando invariante de imutabilidade.
6. (I) `isOk` / `isErr` type predicates pra filtros e testes.
7. (I) Helper na Application Layer se padrão `await → extract → repassar` ficar repetitivo. Mora fora do domínio.
8. (I) JSDoc nas funções que usam `combine` documentando a ordem dos erros no array.
9. (D) `rehydrateContract(row)` único dispatcher lendo `row.status` e despachando para o tipo refinado correto.
10. (D) Case constructor declarar o **subtipo exato** que produz (`ContractNotActive`, não `ContractError`) — preserva D1 ("cada Use Case devolve apenas o subconjunto que emite") em cascata.
11. (C) `Extract<Amendment, { status: 'X' }>` como type helper se o aninhamento ficar verboso em consumidores.
12. (C) JSDoc do `Amendment.toAdjustments` documentando os 3 casos: 1:1 (Addition→ValueIncrease), 1:N (Renewal+Reajuste futuro), 0:1 (ContractAdjustment sem Amendment).
13. (H) Quando `<aggregate>.ts` ultrapassar ~400 linhas, fragmentar em `<aggregate>-transitions.ts` + `<aggregate>.ts` (operações invariantes).
14. (H) Port ambíguo (parte invariância, parte capacidade): pergunta "se eu trocar o agregado por outro, este port faz sentido?". Sim → application. Não → domain.

---

## Tickets gerados (running)

| Ticket | Origem | Escopo | Dependências |
| :--- | :--- | :--- | :--- |
| **CTR-DOMAIN-DEBRAND-AGG** | Bloco A | Remove brand de `Contract`/`Amendment`. Introduz `updateContract`/`updateAmendment` com `Partial<Omit<…, imutáveis>>`. | — |
| **CTR-DOMAIN-MAPPER-RESULT** | Bloco A | Mappers do Drizzle retornam `Result<Aggregate, RehydrationError>` com tagged errors. W0 testa BD corrompido. | — |
| **CTR-SKILL-REFRESH-A** | Bloco A | Atualiza `.claude/skills/ts-domain-modeler/SKILL.md §3.A`. | — |
| **CTR-SHARED-IMMUTABLE** | Bloco B | Cria `shared/immutable.ts` (`immutable`, `deepImmutable`) + testes. Esconde `Object.freeze` atrás de vocabulário do domínio. | — |
| **CTR-SHARED-BRAND-UNIQUE-SYMBOL** | Bloco B | Migra `shared/brand.ts` para `unique symbol` global + `Brand<T, K>` + `BrandOf<T>`. | — |
| **CTR-SHARED-VO-CANONICAL** | Bloco B | Refatora `money.ts`, `period.ts`, `ids.ts`, `bucket-name.ts`, `storage-key.ts`, `storage-ref.ts` no novo template (module-as-namespace + free functions + `immutable` + tagged errors + Brand novo). | IMMUTABLE, BRAND-US |
| **CTR-DOMAIN-IMPORT-CODEMOD** | Bloco B | Codemod `ts-morph`: `import { X }` → `import * as X` (~200 imports). | VO-CANONICAL |
| **CTR-SKILL-REFRESH-B** | Bloco B | `.claude/skills/ts-domain-modeler/SKILL.md §3.B — Smart Constructor Canônico` (9 DO + 9 DON'T + 4 CONSIDER). | todos os anteriores |
| **CTR-SHARED-RESULT-COMBINATORS** | Bloco I + E3 + A4 | `shared/result.ts` ganha `mapErr` + `combine` + (opcional) `isOk`/`isErr`. ~50 LOC. Testes cobrindo fail-fast vs collect. | — |
| **CTR-DOMAIN-COMPOSE-REFACTOR** | Bloco I + E3 + A4 | Refatora `applyHomologatedAdjustment` (α — early return), use cases (β — `combine`), `rehydrateContract` mapper (γ — `combine` + único `mapErr`). | RESULT-COMBINATORS, DEBRAND-AGG, MAPPER-RESULT |
| **CTR-SKILL-REFRESH-I** | Bloco I + E3 + A4 | `.claude/skills/ts-domain-modeler/SKILL.md §3.I — Composição Funcional` com 7 DO + 6 DON'T + 3 CONSIDER + snippets canônicos α/β/γ. | RESULT-COMBINATORS, COMPOSE-REFACTOR |
| **CTR-DOMAIN-TAGGED-ERRORS** | Bloco D | Migra todos string-literal pra tagged records `{ tag, …payload }` em `errors.ts` por agregado (free functions, Padrão D). Subtipos declarados nos returns. | DEBRAND-AGG |
| **CTR-DOMAIN-STATE-MACHINE-CONTRACT** | Bloco D | Refactor `Contract` em union `Active \| Expired \| Terminated`. `parseActive`, `expire(active)`, `terminate(active)` viram transições tipadas. | DEBRAND-AGG, TAGGED-ERRORS |
| **CTR-DOMAIN-STATE-MACHINE-AMENDMENT** | Bloco D | Refactor `Amendment` em union `PendingWithoutDocument \| PendingWithDocument \| Homologated`. Resolve D2 + C1 + C2 no Amendment. | TAGGED-ERRORS |
| **CTR-DOMAIN-INVARIANT-CONTEXTUAL** | Bloco D | Cria `NonZeroMoney` brandado em `shared/` (rota α). `Amendment.createAddition` e `createSuppression` exigem (rota γ). | SHARED-VO-CANONICAL |
| **CTR-SKILL-REFRESH-D** | Bloco D | `.claude/skills/ts-domain-modeler/SKILL.md §3.D — Tagged Errors & Invariantes em Tipos` (10 DO + 7 DON'T + 2 CONSIDER + nomenclatura semântica VO/Agregado/Caso de Uso). | todos os anteriores de D |
| **CTR-DOMAIN-EXHAUSTIVE-SWITCH-FIX** | Bloco C | Remove `throw new Error(...)` de todo `default` exhaustive no domínio (correção da SKILL contra CLAUDE.md raiz — contradição admitida do PhD nesta entrevista). | — (folha) |
| **CTR-SKILL-REFRESH-C** | Bloco C | `.claude/skills/ts-domain-modeler/SKILL.md §3.C — Discriminated Unions & Exhaustive Switch` (6 DO + 6 DON'T + 2 CONSIDER + template `Amendment` em aninhamento `status × kind`). | EXHAUSTIVE-SWITCH-FIX |
| **CTR-DOMAIN-RESTRUCTURE** | Bloco H | Cria `src/shared/kernel/` (promove `Money`, `Period`, `UserRef` cross-BC); move `Repository` de `application/ports/` pra `domain/<aggregate>/repository.ts`; move `bucket-name`/`storage-key`/`storage-ref` pra `application/ports/document-storage.types.ts`. Mantém `adapters/`, `contracts/` (plural), `public-api/` por módulo. | Idealmente último (depende dos demais para minimizar conflitos de import) |
| **CTR-SKILL-REFRESH-H** | Bloco H | `.claude/skills/ts-domain-modeler/SKILL.md §3.H — Organização de Módulo` (10 DO + 6 DON'T + 2 CONSIDER + árvore canônica). | RESTRUCTURE |

---

## Diagramas canônicos da arquitetura

Após troca meta com o PhD ([`Pergunta_diagramas_meta`](./0001/Pergunta_diagramas_meta_tec_lider_using_skill_ts-domain-modeler.md)), 3 diagramas Mermaid+ASCII consolidam visualmente as decisões dos 6 blocos fechados. Todos **corrigidos pelo host** (PhD continuou errando detalhes factuais: eixo `kind` ausente, `infra/` vs `adapters/`, omissões de `cli/`/`public-api/`).

| Diagrama | Mora em | Tema |
| :--- | :--- | :--- |
| **State Machine do `Amendment`** | [`Pergunta_C1_C2_C3_C4`](./0001/Pergunta_C1_C2_C3_C4_tec_lider_using_skill_ts-domain-modeler.md) | 3 estados refinados × 4 kinds aninhados, transições tipadas |
| **Fluxo de Homologação Cross-Agregado** | [`Pergunta_E3_I1_I3_A4`](./0001/Pergunta_E3_I1_I3_A4_tec_lider_using_skill_ts-domain-modeler.md) | CLI → Use Case → Domain → Repo → Bus, dupla taxonomia, fold com early return |
| **Layout Canônico de Módulo** | [`Pergunta_H1_H2_H3`](./0001/Pergunta_H1_H2_H3_tec_lider_using_skill_ts-domain-modeler.md) | árvore de pastas com anotações por bloco |

Cada diagrama citado nos arquivos das `SKILL.md §3.C`, `§3.I`, `§3.H` respectivos.

---

## Entrevista 0001 — ENCERRADA ✅

**Blocos fechados:** A, B, C, D, G, H, I, J, K, L + transversais E3 e A4 = **10 dos 12 blocos**.

**Blocos remanescentes (refinamentos pequenos, não bloqueiam refactor):**
- **E1, E2** — `{ entity, event }` é event-sourcing-by-hand? `Acknowledgment` muda agregado? Sem urgência — Bloco I já cravou o tratamento via early return.
- **F1, F2** — encoding e schema evolution de eventos. Importante quando o **outbox MySQL** voltar à mesa (próxima entrevista).

**Output canônico da entrevista 0001:**

- **25 arquivos `.md`** em `handbook/interviews/0001/` (perguntas semânticas + individuais + meta de diagramas + master).
- **3 diagramas Mermaid canônicos** (state machine Amendment, sequence homologação cross-agregado, layout ASCII anotado).
- **Tabela L3 canônica:** 40 DO + 16 CONSIDER + 5 AVOID + 44 DON'T = **105 entradas classificadas** (host expandiu de 16 → 105 após PhD sub-entregar).
- **21 tickets coordenados** entrando na pipeline W0→W3.

**Próxima entrevista (sugerida — `0002`):** Outbox MySQL + Event sourcing + Observability tagged + Property-based testing. Abre depois que os 21 tickets desta entrevista (ou pelo menos os top-3 leverage) estiverem aplicados no código.

---

## Execução — próximo passo operacional

1. **Abrir os 21 tickets** na pipeline `.claude/.pipeline/<TICKET-ID>/` seguindo o template W0→W3 (CLAUDE.md raiz).
2. **Top-3 leverage (do PhD em L2):**
   1. **State Machine em Tipos** — `CTR-DOMAIN-STATE-MACHINE-CONTRACT` + `CTR-DOMAIN-STATE-MACHINE-AMENDMENT`.
   2. **Parse, don't validate** — `CTR-SHARED-VO-CANONICAL` + `CTR-SHARED-BRAND-UNIQUE-SYMBOL` + `CTR-SHARED-IMMUTABLE`.
   3. **Zero throw / Result Homemade** — `CTR-SHARED-RESULT-COMBINATORS` + `CTR-DOMAIN-COMPOSE-REFACTOR`.
3. Após top-3, os 12+ tickets restantes em paralelo onde dependências permitirem.
4. **Última fase:** `CTR-SKILL-REFRESH-*` (refresh das seções A-L do `SKILL.md` ts-domain-modeler). Vai depois de todos os refactors aplicados.
