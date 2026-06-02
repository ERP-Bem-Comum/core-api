---
name: ts-domain-modeler
description: >
  Especialista em modelagem de domínio em TypeScript 6.0 puro (zero framework, zero infra).
  Aplica DDD tático com branded types, discriminated unions, Result<T, E>, smart constructors,
  Readonly imutável e exhaustive switch. SKILL CANÔNICA para src/modules/*/domain/.
---

# TS Domain Modeler

## Persona

Você é o **especialista de modelagem de domínio em TypeScript moderno** do `core-api`. Sua responsabilidade é traduzir o handbook de domínio (`handbook/domain/`) em código TS **puro**, sem qualquer dependência de framework (NestJS, Express, Drizzle, MySQL, etc.).

> **Fronteira:** você só edita `src/modules/<modulo>/domain/`. Application, adapters e CLI são responsabilidade de outras skills.

---

## Source of Truth

Antes de modelar QUALQUER tipo avançado, consultar **OBRIGATORIAMENTE**:

> [`/Users/gabriel_aderaldo/Desktop/Projetos/dev/envolve/bem_comum/handbook/reference/typescript/`](../../../../handbook/reference/typescript/)

É o TypeScript Handbook oficial mais moderno. As referências em [`./references/`](./references/) destilam os pontos mais relevantes desse handbook **e citam o trecho original**.

Tabela de orientação rápida:

| Padrão                                      | Reference local (ler primeiro)                                            | Trecho do handbook canônico                                              |
| :------------------------------------------ | :------------------------------------------------------------------------ | :----------------------------------------------------------------------- |
| Branded types para IDs e VOs                | [`ts-branded-types.md`](./references/ts-branded-types.md)                 | `Object Types.md` §index signatures, `Type Manipulation/Mapped Types.md` |
| Discriminated unions + exhaustiveness       | [`ts-discriminated-unions.md`](./references/ts-discriminated-unions.md)   | `Narrowing.md` §control flow + `never`                                   |
| `Readonly<>`, `readonly T[]`, imutabilidade | [`ts-readonly-immutability.md`](./references/ts-readonly-immutability.md) | `Object Types.md` §readonly Properties                                   |
| Result<T, E> em vez de throw                | [`ts-result-pattern.md`](./references/ts-result-pattern.md)               | `More on Functions.md`, `Type Manipulation/Generics.md`                  |
| Exhaustive switch com `never`               | [`ts-exhaustive-switch.md`](./references/ts-exhaustive-switch.md)         | `Narrowing.md` §exhaustiveness checking                                  |
| Smart constructors retornando Result        | [`ts-smart-constructors.md`](./references/ts-smart-constructors.md)       | `More on Functions.md` + `Type Manipulation/Conditional Types.md`        |
| ESM, NodeNext, `import type`, `.ts` ext     | [`ts-esm-nodenext.md`](./references/ts-esm-nodenext.md)                   | `Modules.md` §ES Module Syntax                                           |

> ⚠️ Se ler `references/` for insuficiente, **abra o arquivo correspondente do `handbook/reference/typescript/`**. Citar o trecho no PR/REPORT.

---

## 📚 Referências específicas deste projeto

| Tópico                                                                                                                                      | Onde olhar                                                                                                                                                                             |
| :------------------------------------------------------------------------------------------------------------------------------------------ | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Regras transversais do código (zero `throw`, zero `class`, `Result`, branded, ESLint flat config + typescript-eslint strict + type-checked) | [`../../../CLAUDE.md`](../../../CLAUDE.md)                                                                                                                                             |
| Stack (Node 24 LTS, TS 6.0, ESM/NodeNext, pnpm)                                                                                             | [`handbook/reference/nodejs/`](../../../handbook/reference/nodejs/), [`handbook/reference/pnpm/`](../../../handbook/reference/pnpm/)                                                   |
| Roadmap TS 7 (tsgo / Go-based compiler)                                                                                                     | [`ADR-0009`](../../../handbook/architecture/adr/0009-node-24-typescript-6-with-7-roadmap.md), [`Inquiry-0004`](../../../handbook/inquiries/0004-node-version-and-typescript-future.md) |
| Modular monolith + ports/adapters (fronteira de quem você é)                                                                                | [`ADR-0006`](../../../handbook/architecture/adr/0006-modular-monolith-core-api.md)                                                                                                     |
| Domínio formal do módulo Contratos (RNs, RNFs, BCs)                                                                                         | [`handbook/domain_questions/contratos/`](../../../handbook/domain_questions/contratos/)                                                                                                |
| Exemplos vivos do padrão (tickets já entregues)                                                                                             | `.claude/.pipeline/CTR-VO-MONEY/`, `CTR-VO-PERIOD/`, `CTR-VO-IDS/`, `CTR-AGG-CONTRACT/`, `CTR-AGG-AMENDMENT/`, `CTR-STORAGE-PORT/`                                                     |
| Código de produção que materializa este padrão (ler antes de modelar algo novo)                                                             | `src/modules/contracts/domain/shared/{money,period,ids,bucket-name,storage-key,storage-ref}.ts`, `src/modules/contracts/domain/contract/`, `src/modules/contracts/domain/amendment/`   |

---

## Regras Não-Negociáveis

Herdadas do `CLAUDE.md` raiz e reforçadas aqui no contexto de domínio:

### Proibições absolutas

- ❌ **`throw`** — nenhum lançamento de exceção. Operações retornam `Result<T, E>`.
- ❌ **`class`** — nenhuma classe. Tudo `Readonly<>` + funções standalone.
- ❌ **`this`** — não existe contexto. Dependências passadas como argumentos.
- ❌ **`any`** — use `unknown` com narrowing. Se `as` for inevitável, documente o motivo em comentário.
- ❌ **`let` reatribuído em entidade de domínio** — mudança via spread `{ ...prev, status: 'X' }`.
- ❌ **`.push()`, `.splice()`, `.sort()`** em arrays do domínio — use `[...prev, novo]` ou `prev.toSorted(...)`.
- ❌ **`extends Error`** — erros são string literal unions, nunca classes.
- ❌ **Acesso direto a repositório/HTTP/I/O** — domínio é puro.

### Obrigações

- ✅ **Branded types** para todos os IDs e valores validados:
  ```ts
  type ContractId = Brand<string, 'ContractId'>;
  type CNPJ = Brand<string, 'CNPJ'>;
  type Money = Brand<{ readonly cents: number }, 'Money'>;
  ```
- ✅ **Smart constructors** que validam e retornam `Result<T, E>`:
  ```ts
  const CNPJ = (raw: string): Result<CNPJ, 'cnpj-invalid' | 'cnpj-empty'> => {
    /* ... */
  };
  ```
- ✅ **Discriminated unions** com discriminador em **EN**: `type` para events/commands, `kind` para variantes de entidade:
  ```ts
  type Amendment =
    | { readonly kind: 'Addition'; readonly impactValue: Money /* ... */ }
    | { readonly kind: 'Suppression'; readonly impactValue: Money /* ... */ }
    | { readonly kind: 'TermChange'; readonly newEndDate: Date /* ... */ }
    | { readonly kind: 'Misc'; readonly description: string /* ... */ };
  ```
- ✅ **Exhaustive switch** com `never` no `default`:
  ```ts
  switch (amendment.kind) {
    case 'Addition':
      return /* ... */;
    case 'Suppression':
      return /* ... */;
    case 'TermChange':
      return /* ... */;
    case 'Misc':
      return /* ... */;
    // Veja §3.C.4 (Padrão B) — exhaustive sem throw.
    default: {
      const _exhaustive: never = amendment;
      return _exhaustive;
    }
  }
  ```
- ✅ **`Readonly<>` em toda entity** e `readonly T[]` em todo array de domínio.
- ✅ **Erros como string literal unions** em **EN kebab-case**:
  ```ts
  type ContractError =
    | 'contract-terminated'
    | 'amendment-without-signed-document'
    | 'impact-value-zero'
    | 'retroactive-date';
  ```
- ✅ **Explicit return types** em **toda função exportada**.
- ✅ **`import type` para imports puramente de tipo** (`verbatimModuleSyntax` exigirá).
- ✅ **`.ts` nos imports** (NodeNext + `allowImportingTsExtensions`).

### 🌐 Idioma (REGRA INVARIANTE)

> **Código em inglês, documentação em português.** Sem exceções.
>
> - Identificadores TS (tipos, funções, variáveis), nomes de pasta em `src/` e `tests/`, nomes de arquivo `.ts`, string literal unions de erro, eventos: **EN**.
> - Strings literais voltadas ao humano (CLI, mensagens formatadas para usuário): **PT** via dicionário no `format.ts`.
> - Comentários explicativos em TS, READMEs, skills, ADRs, inquiries, handbook: **PT**, com identificadores de código entre backticks.
> - Commits: **PT** (descritivo). IDs de ticket: **EN**.

---

## Estrutura de pasta — código E testes separados

> **Regra de organização:** testes **NÃO** ficam ao lado do código. Existe uma pasta `tests/` na raiz do projeto que **espelha** a estrutura de `src/`. Toda referência cruzada usa **Node subpath imports** (`#src/*`) declarados em `package.json` → `"imports"`.

### Código de produção (nomes em EN)

```
src/modules/<module>/domain/
├── shared/                   VOs compartilhados entre agregados do módulo
│   ├── money.ts             VO + smart constructor
│   ├── period.ts
│   ├── user-ref.ts
│   ├── ids.ts               ContractId, AmendmentId, DocumentId (branded)
│   └── index.ts             barrel export
├── <aggregate>/              um agregado por pasta
│   ├── types.ts             Readonly types + sub-types
│   ├── events.ts            Discriminated union de eventos
│   ├── errors.ts            String literal union de erros
│   ├── <aggregate>.ts       Funções de domínio (create, terminate, ...)
│   ├── repository.ts        Port (type) — sem implementação
│   └── index.ts             barrel export
└── index.ts                 API pública do módulo `domain`
```

### Testes (espelho)

```
tests/modules/<module>/domain/
├── shared/
│   ├── money.test.ts
│   ├── period.test.ts
│   └── ids.test.ts
└── <aggregate>/
    └── <aggregate>.test.ts
```

### Convenção de imports

```ts
// ✅ De dentro de tests/ — sempre via #src/*
import { Money } from '#src/modules/contracts/domain/shared/money.ts';
import { isOk, isErr } from '#src/shared/index.ts';

// ✅ De dentro de src/ — caminhos relativos (curtos)
import type { Result } from '../../../../shared/result.ts';
```

`package.json` declara:

```json
"imports": {
  "#src/*": "./src/*"
}
```

Esse padrão é nativo Node 18+, funciona com `--experimental-strip-types`, e dispensa qualquer transpiler/mapper externo.

### Exemplo concreto do módulo `contracts`

```
src/modules/contracts/domain/
├── shared/{money,period,ids,user-ref,index}.ts
├── contract/{types,events,errors,contract,repository,index}.ts
├── amendment/{types,events,errors,amendment,repository,index}.ts
└── index.ts

tests/modules/contracts/domain/
├── shared/{money,period,ids}.test.ts
├── contract/contract.test.ts
└── amendment/amendment.test.ts
```

---

## Ordem de implementação obrigatória (inside-out)

```
1. VOs do shared/        (Money, Period, ids)
   ↓
2. types.ts do agregado  (shape do dado)
   ↓
3. errors.ts             (string literal union)
   ↓
4. events.ts             (discriminated union de eventos)
   ↓
5. <aggregate>.ts        (funções: create, changeState, etc.)
   ↓
6. repository.ts         (port — type)
   ↓
7. <aggregate>.test.ts   (caso a wave seja W1; se W0, este vem antes do passo 1)
```

W0 inverte: testes primeiro (que falham), depois implementação.

---

## Templates rápidos

### VO com branded type + smart constructor

> Veja §3.B — Smart Constructor Canônico.

```ts
// src/modules/contracts/domain/shared/money.ts
import { type Result, ok, err } from '../../../../shared/result.ts';
import { immutable } from '../../../../shared/immutable.ts';
import type { Brand } from '../../../../shared/brand.ts';

// Wrapper-brand: Money carrega grandeza (`cents`) com potencial de extensão futura.
export type Money = Brand<{ readonly cents: number }, 'Money'>;

export type MoneyError =
  | 'money-negative-value'
  | 'money-non-integer-value'
  | 'money-exceeds-safe-integer'
  | 'money-negative-result';

// Identidade fixa (DO §10) — `immutable()` é a facade canônica (não `Object.freeze` direto).
export const ZERO: Money = immutable({ cents: 0 }) as Money;

// Smart constructor `from<Source>` (DO §9). Cast `as Money` único e auditado (DO §2 promovido).
export const fromCents = (cents: number): Result<Money, MoneyError> => {
  if (!Number.isInteger(cents)) return err('money-non-integer-value');
  if (cents < 0) return err('money-negative-value');
  if (cents > Number.MAX_SAFE_INTEGER) return err('money-exceeds-safe-integer');
  return ok(immutable({ cents }) as Money);
};

export const add = (a: Money, b: Money): Money => immutable({ cents: a.cents + b.cents }) as Money;

export const subtract = (a: Money, b: Money): Result<Money, 'money-negative-result'> => {
  const diff = a.cents - b.cents;
  if (diff < 0) return err('money-negative-result');
  return ok(immutable({ cents: diff }) as Money);
};

export const equals = (a: Money, b: Money): boolean => a.cents === b.cents;
export const greaterThan = (a: Money, b: Money): boolean => a.cents > b.cents;
```

Consumo (Padrão D — module-as-namespace):

```ts
import * as Money from './money.ts';

const amount = Money.fromCents(10_000); // Result<Money, MoneyError>
if (!amount.ok) return amount;
const doubled = Money.add(amount.value, amount.value);
```

Mais templates em [`references/`](./references/) (Amendment discriminated, Contract com state machine, evento de domínio).

---

## §3.A — Agregados Não-Brandados & Helper `updateAggregate`

> Consolidação do **Bloco A** da entrevista canônica [`handbook/interviews/0001-functional-ddd-domain-refresh.md`](../../../handbook/interviews/0001-functional-ddd-domain-refresh.md) — itens remanescentes após promoções para §3.B (ticket `CTR-SKILL-REFRESH-B`).
> Tickets vivos que aplicam estes padrões: `CTR-DOMAIN-DEBRAND-AGG`, `CTR-DOMAIN-MAPPER-RESULT`.

---

### §3.A.1 — Brand em VOs Folha, Não em Agregados

**Por quê:** VOs folha (`Money`, `ContractId`, `Period`) são opacos e requerem prova de validação — o `Brand` comunica que o valor passou por um smart constructor. Agregados, porém, têm identidade estrutural: seu `id: ContractId` já é branded, e o próprio shape da union discriminada (`{ status: 'Active'; … }`) os distingue univocamente. Brandar o agregado inteiro força `as unknown as Contract` em cada transição de estado — spread simples deixa de funcionar.

```ts
// DO §1 — Brand somente no VO folha
type ContractId = Brand<string, 'ContractId'>; // ✅ VO folha: opaco, requer validação
type Money = Brand<{ readonly cents: number }, 'Money'>; // ✅ VO folha

// O agregado NÃO precisa de Brand:
type ActiveContract = Readonly<{
  id: ContractId; // ✅ identidade vem do VO brandado
  status: 'Active';
  // …
}>;

// DON'T §1 — Brand no agregado cria problema de transição
type ActiveContract = Brand<
  Readonly<{
    id: ContractId;
    status: 'Active';
  }>,
  'ActiveContract'
>; // ❌ obriga `as unknown as ActiveContract` em cada spread
```

**Regra:** aplique `Brand<T, K>` apenas em VOs folha. Agregados se identificam pelo shape + `id` branded.

---

### §3.A.2 — `as unknown as T` Proibido em Código de Negócio

**Por quê:** `as unknown as T` desativa o type-checker completamente — qualquer bug de tipo passa silencioso. No domínio, onde `Result<T, E>` é a única forma de sinalizar falha, casts desse tipo são sintoma de que o modelo de tipos está errado, não de que o cast é inevitável.

```ts
// DON'T §2 — cast duplo em lógica de negócio
const expire = (contract: ActiveContract): ExpiredContract =>
  ({ ...contract, status: 'Expired', endedAt: new Date() }) as unknown as ExpiredContract; // ❌

// DO — transição tipada, sem cast
const expire = (contract: ActiveContract, at: Date): ExpiredContract =>
  immutable({ ...contract, status: 'Expired' as const, endedAt: at }); // ✅ tipos resolvem
```

**Exceção auditada:** `as unknown as T` é permitido **uma única vez** no smart constructor de um VO (ver §3.B — cast único auditado). Em toda transição de agregado, spread preserva o tipo sem cast.

> Cross-ref: §3.B documenta o padrão de cast único auditado dentro do smart constructor.

---

### §3.A.3 — Helper `updateAggregate(prev, patch)`

**Por quê:** transições intra-variante (alterar `currentValue` num `ActiveContract` sem mudar de estado) são idiomáticas com spread. Sem helper, cada chamador replica `immutable({ ...prev, ...patch })`, e o patch não é validado pelo compilador. O helper centraliza o `immutable()` e restringe o patch ao conjunto mutável.

```ts
// types.ts do agregado
type ContractImmutableField =
  | 'id'
  | 'sequentialNumber'
  | 'title'
  | 'objective'
  | 'signedAt'
  | 'originalValue'
  | 'originalPeriod';

export type ContractUpdate = Partial<Omit<ContractCore, ContractImmutableField>>;

// Helper genérico — preserva o subtipo refinado de `prev`
export const updateContract = <T extends Contract>(prev: T, patch: ContractUpdate): T =>
  immutable({ ...prev, ...patch });
```

O parâmetro genérico `<T extends Contract>` é a chave: `updateContract(activeContract, { currentValue: newMoney })` continua tipado como `ActiveContract`, não como a union `Contract`. O chamador não perde o narrowing.

O mesmo padrão em `Amendment`:

```ts
export type AmendmentUpdate = Readonly<Record<never, never>>;

export const updateAmendment = <T extends Amendment>(prev: T, patch: AmendmentUpdate): T =>
  immutable({ ...prev, ...patch }) as T;
// Cast estreito (não `as unknown as`): spread sobre discriminated union perde narrowing
// por limitação de inferência do TS; variante preservada em runtime pelos campos imutáveis.
```

**Nota sobre `AmendmentUpdate = Record<never, never>`:** hoje todos os campos do `Amendment` são imutáveis ou controlados por transições refinadas. O helper existe como facade canônica — se surgir um campo editável por patch, basta adicioná-lo ao `AmendmentUpdate` sem alterar a assinatura.

> Cross-ref: §3.D (State Machine + `updateAggregate`) detalha como transições de estado (`expire`, `terminate`, `homologate`) são funções separadas que preservam o subtipo refinado. `updateAggregate` cobre apenas mudanças intra-variante.

---

### §3.A.4 — Mappers via Smart Constructors (Sem Shotgun Parsing)

**Por quê:** quando um adapter de persistência monta o agregado lendo campos de um `row` de banco direto em um literal de objeto, qualquer falha de validação (valor negativo, data inválida, ID com formato errado) é ignorada silenciosamente. Isto é "shotgun parsing" — validação dispersa em múltiplos pontos sem garantia de integridade.

```ts
// DON'T §4 — mapper monta literal direto (shotgun parsing)
const toContract = (row: ContractRow): Contract => ({
  id: row.id as ContractId, // ❌ cast sem validação
  currentValue: { cents: row.cents } as Money, // ❌ sem smart constructor
  // …
});

// DO — reidratação via smart constructors, retornando Result
const rehydrateContract = (row: ContractRow): Result<Contract, RehydrationError> => {
  const id = ContractId.fromString(row.id); // Result<ContractId, …>
  const value = Money.fromCents(row.cents); // Result<Money, …>
  const period = Period.fromDates(row.start, row.end); // Result<Period, …>
  const r = combine([id, value, period]);
  if (!r.ok) return err('rehydration-failed');
  const [contractId, money, p] = r.value;
  return ok(immutable({ id: contractId, currentValue: money, currentPeriod: p /* … */ }));
};
```

> Cross-ref: §3.B.4 — o smart constructor é o único ponto onde `as` é permitido (cast estreito auditado).
> Ticket vivo: `CTR-DOMAIN-MAPPER-RESULT` — refatora os mappers de persistência para seguir este padrão.

---

### §3.A.5 — Zod na Borda, Não no Domínio

**Por quê:** Zod (e qualquer biblioteca de parsing externo) carrega peso de runtime e integra conceitos de schema que não pertencem ao domínio puro. O domínio já possui seu próprio mecanismo de validação via smart constructors que retornam `Result<T, E>`. Duplicar essa lógica com Zod dentro de `domain/` cria dois pontos de verdade para as mesmas regras.

```ts
// CONSIDER §1 — Zod vive em application/ ou adapters/, não em domain/

// ❌ Zod DENTRO do domínio
// src/modules/contracts/domain/shared/money.ts
import { z } from 'zod';
const MoneySchema = z.object({ cents: z.number().int().nonneg() }); // ❌ dep externa no domínio

// ✅ Zod na borda (adapter HTTP / application command handler)
// src/modules/contracts/adapters/http/create-contract.schema.ts
import { z } from 'zod';
export const CreateContractBodySchema = z.object({
  valorCentavos: z.number().int().min(1),
  // …
});
// O adapter valida com Zod, extrai primitivos, passa para smart constructors do domínio
```

**Regra:** Zod/Effect Schema são ferramentas de parsing de entrada externa. Vivem em `application/` (command handlers) ou `adapters/` (HTTP, CLI, persistência). O domínio recebe primitivos validados e os processa com seus smart constructors.

---

### §3.A.6 — Tabela Canônica

**DO (3)**

| Situação                                                    | Padrão correto                                                                       |
| :---------------------------------------------------------- | :----------------------------------------------------------------------------------- |
| Valor que precisa ser validado antes de usar                | Smart constructor com `Brand<T, K>` no VO folha                                      |
| Transição intra-variante (mesmo estado, novo valor mutável) | `updateContract<T extends Contract>(prev, patch): T`                                 |
| Mapper de persistência reidratando agregado                 | Cada campo via smart constructor → `combine` → `Result<Aggregate, RehydrationError>` |

**DON'T (3)**

| Anti-padrão                                              | Problema                                    | Alternativa                                                                                 |
| :------------------------------------------------------- | :------------------------------------------ | :------------------------------------------------------------------------------------------ |
| `Brand` na casca do agregado                             | Força `as unknown as T` em toda transição   | Shape + `id` branded identificam o agregado                                                 |
| `as unknown as T` em transição de estado                 | Silencia erros de tipo em código de negócio | Spread preserva tipo; `as T` estreito apenas em `updateAmendment` (limitação de inferência) |
| Mapper com literal direto `{ id: row.id as ContractId }` | Shotgun parsing: validação ausente          | `ContractId.fromString(row.id)` → `Result`                                                  |

**CONSIDER (1)**

| Situação                                                 | Consideração                                                                                                                                                    |
| :------------------------------------------------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Parsing de input externo (HTTP body, CSV, JSON de banco) | Zod/Effect Schema como fonte única de parse + tipo + erro **na borda** (application/ ou adapters/). Resultado do Zod alimenta os smart constructors do domínio. |

---

### §3.A.7 — Tickets Vivos

| Ticket                     | Descrição                                                                                                                                   | Status |
| :------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------ | :----- |
| `CTR-DOMAIN-DEBRAND-AGG`   | Remover Brand da casca dos agregados (`Contract`, `Amendment`) caso existam; garantir que transições usem spread puro                       | Aberto |
| `CTR-DOMAIN-MAPPER-RESULT` | Refatorar mappers de persistência (`contract.mapper.ts`, `amendment.mapper.ts`) para reidratação via smart constructors retornando `Result` | Aberto |

---

## §3.B — Smart Constructor Canônico

> Consolidação do **Bloco B** da entrevista canônica [`handbook/interviews/0001-functional-ddd-domain-refresh.md`](../../../handbook/interviews/0001-functional-ddd-domain-refresh.md).
> Tickets vivos que aplicaram estes padrões: `CTR-SHARED-BRAND-UNIQUE-SYMBOL`, `CTR-SHARED-IMMUTABLE`, `CTR-SHARED-VO-CANONICAL`, `CTR-DOMAIN-IMPORT-CODEMOD`.
>
> **Cross-ref §3.D:** §3.D aborda Tagged Errors e State Machine — ambos dependem do smart constructor como ponto de entrada. §3.B cobre o _como_ — o idioma do brand modernizado, Padrão D e a facade `immutable()`.

---

### §3.B.1 — Brand Modernizado (`unique symbol` global)

`src/shared/brand.ts` centraliza `Brand<T, K>` + `BrandOf<T>`. O símbolo `__brand` é declarado **uma única vez** como `declare const __brand: unique symbol` — impossibilitando colisão estrutural acidental entre dois brands de `K` igual.

```ts
// src/shared/brand.ts
declare const __brand: unique symbol;

export type Brand<T, K extends string> = T & { readonly [__brand]: K };

export type BrandOf<B> = B extends { readonly [__brand]: infer K } ? K : never;
```

**NUNCA** declarar `declare const brand: unique symbol` espalhado em cada arquivo de VO (DON'T B§12) — centraliza em `shared/brand.ts`.

**Lição nested brand** — quando uma invariante exige refinamento de um brand existente, use propriedade nomeada extra (não `Brand<Brand<...>>`):

```ts
// Rota α (cross-ref §3.D.3): NonZeroMoney como subtipo de Money
export type NonZeroMoney = Money & { readonly __nonZeroMoney: true };
```

`Brand<T, K>` é estrutural: a chave (`K`) é string literal e colide naturalmente em "brand de brand". A propriedade nomeada extra (`__nonZeroMoney`) evita essa colisão e é legível no sistema de tipos.

---

### §3.B.2 — Wrapper-Brand vs Primitivo-Brand

| Tipo                | Quando usar                                                                                                      | Exemplo vivo                                                                         |
| :------------------ | :--------------------------------------------------------------------------------------------------------------- | :----------------------------------------------------------------------------------- |
| **Wrapper-brand**   | VOs que carregam **grandeza, unidade ou contexto evolutivo** (refinamento futuro vai acontecer).                 | `Money` (`Brand<{ readonly cents: number }, 'Money'>`), `Period`                     |
| **Primitivo-brand** | Identificadores **opacos e estruturalmente irredutíveis** (não há propriedade interna semanticamente relevante). | `ContractId`, `AmendmentId`, `DocumentId`, `UserRef` — `Brand<string, 'ContractId'>` |

**Por que evitar Primitivo-brand para grandezas?** (DON'T B§6)

Se hoje `Money = Brand<number, 'Money'>` e amanhã precisamos `Money & { currency: 'BRL' }`, o Primitivo-brand não acomoda. O Wrapper-brand (`Brand<Readonly<{ cents: number }>, 'Money'>`) acomoda sem breaking change.

A escolha é guiada pelo **potencial de extensão**, não pela complexidade atual.

---

### §3.B.3 — Module-as-Namespace (Padrão D)

**DO B§8:** exportar free functions; consumir com `import * as Money from './money.ts'`.

```ts
// ✅ Padrão D — free functions no módulo
export const fromCents = (cents: number): Result<Money, MoneyError> => {
  /* ... */
};
export const add = (a: Money, b: Money): Money => {
  /* ... */
};

// Consumo
import * as Money from './money.ts';
Money.fromCents(100); // Result<Money, MoneyError>
Money.add(a, b); // Money
```

**DON'T B§7 — Namespace-objeto:**

```ts
// ❌ export const Money = { fromCents: ..., add: ..., ... }
// Perde tree-shaking (bundler não descarta funções não-usadas) + jargão OO
```

**DON'T B§8 — Function-as-constructor:**

```ts
// ❌ export const Money = (cents: number): Result<Money, MoneyError> => ...
// X(...) parece construtor mas retorna Result — quebra semântica JS
```

---

### §3.B.4 — Smart Constructor `from<Source>`

**DO B§9 + promoção DO §2:**

- Cada smart constructor é `from<Source>(raw: Source): Result<T, TaggedError>` (ou nome descritivo como `fromCents`).
- O **único lugar** onde o cast `as Brand<T, K>` mora — auditado e comentado.
- Tagged error carrega `attemptedValue: <tipo da assinatura>` quando há evidência de colisão (cross-ref §3.D.1 — payload de invariante).

**DON'T §3 (promoção temática) — Parse vs Validate (Wlaschin):**

```ts
// ❌ Validação booleana — diz sim/não, não devolve o valor refinado
const isValidCents = (n: number): boolean => Number.isInteger(n) && n >= 0;

// ✅ Parse — retorna o valor refinado OU o erro estruturado
const fromCents = (cents: number): Result<Money, MoneyError> => {
  if (!Number.isInteger(cents)) return err('money-non-integer-value');
  if (cents < 0) return err('money-negative-value');
  return ok(immutable({ cents }) as Money); // cast único e auditado
};
```

"Parse, don't validate" (Wlaschin): o smart constructor é a borda do sistema de tipos — tudo que passa por ele já é `Money`, não `number` suspeito.

**Promoção DO §5 — Adapter de persistência:**

O adapter de persistência reidrata o agregado **apenas via smart constructors de VOs internos**, retornando `Result<Aggregate, RehydrationError>`. Nunca montar literal de agregado diretamente (shotgun parsing):

```ts
// ✅ Adapter reidrata via smart constructors
const money = Money.fromCents(row.valueCents);
if (!money.ok) return err({ tag: 'RehydrationError', field: 'valueCents', raw: row.valueCents });
```

---

### §3.B.5 — Identidade Fixa via `immutable()` / `deepImmutable()`

**DO B§10:** `src/shared/immutable.ts` esconde `Object.freeze` atrás de vocabulário do domínio.

```ts
// src/shared/immutable.ts
export const immutable = <T extends object>(value: T): Readonly<T> => Object.freeze(value);
export const deepImmutable = <T>(value: T): T => {
  /* recursivo */
};
```

**DON'T B§5 — `Object.freeze` direto no código de domínio:**

```ts
// ❌ Object.freeze({ cents: 0 }) — mecanismo exposto, não vocabulário
// ✅ immutable({ cents: 0 })     — facade canônica
```

**Identidade fixa é constante, não função:**

- `export const ZERO: Money = immutable({ cents: 0 }) as Money` — constante. (DO B§10)
- `export const zero = (): Money => ...` — função. Implica construção repetida. (DON'T B§10)

**CONSIDER B§2:** use `deepImmutable` para VOs compostos com sub-VOs aninhados onde o freeze shallow não é suficiente.

---

### §3.B.6 — Migração Big-Bang

**DO B§12:** quando reformar template de VO em massa, fazer **codemod `ts-morph` big-bang** num único ticket (`CTR-DOMAIN-IMPORT-CODEMOD` migrou ~200 imports de `Money.fromCents` para `import * as Money from './money.ts'`).

**DON'T B§11:** manter migração dual coexistente (Padrão A legado + Padrão D novo) gera drift permanente. Em bases com Padrão A (`export const Money = { ... }`), o codemod deve cobrir **todos os callers** de uma vez.

---

### §3.B.7 — Template Canônico do Smart Constructor

> Veja §3.B — Smart Constructor Canônico. Fiel a `src/modules/contracts/domain/shared/money.ts`.

```ts
// src/modules/contracts/domain/shared/money.ts
import { type Result, ok, err } from '../../../../shared/result.ts';
import { immutable } from '../../../../shared/immutable.ts';
import type { Brand } from '../../../../shared/brand.ts';

// Wrapper-brand: Money carrega grandeza (`cents`) com potencial de extensão futura.
export type Money = Brand<{ readonly cents: number }, 'Money'>;

export type MoneyError =
  | 'money-negative-value'
  | 'money-non-integer-value'
  | 'money-exceeds-safe-integer'
  | 'money-negative-result';

// Identidade fixa (DO §10) — `immutable()` é a facade canônica (não `Object.freeze` direto).
export const ZERO: Money = immutable({ cents: 0 }) as Money;

// Smart constructor `from<Source>` (DO §9). Cast `as Money` único e auditado (DO §2 promovido).
export const fromCents = (cents: number): Result<Money, MoneyError> => {
  if (!Number.isInteger(cents)) return err('money-non-integer-value');
  if (cents < 0) return err('money-negative-value');
  if (cents > Number.MAX_SAFE_INTEGER) return err('money-exceeds-safe-integer');
  return ok(immutable({ cents }) as Money);
};

export const add = (a: Money, b: Money): Money => immutable({ cents: a.cents + b.cents }) as Money;

export const subtract = (a: Money, b: Money): Result<Money, 'money-negative-result'> => {
  const diff = a.cents - b.cents;
  if (diff < 0) return err('money-negative-result');
  return ok(immutable({ cents: diff }) as Money);
};

export const equals = (a: Money, b: Money): boolean => a.cents === b.cents;
export const greaterThan = (a: Money, b: Money): boolean => a.cents > b.cents;
```

**Consumo (Padrão D):**

```ts
import * as Money from './money.ts';

const amount = Money.fromCents(10_000); // Result<Money, MoneyError>
if (!amount.ok) return amount;
const doubled = Money.add(amount.value, amount.value);
const total = Money.add(doubled, Money.ZERO);
```

---

### §3.B.8 — Tabela Canônica: 9 DO + 9 DON'T + 4 CONSIDER

> Contagem promoções temáticas documentadas em `000-request.md §Origem`: DO §2 e DO §5 (marcados (A) na entrevista, tematicamente B); DON'T §3 (marcado (A), tematicamente B).

**DO (9)**

- §2 _(promoção temática de (A))_ — Encapsular cast `as` num único ponto auditado por VO — o smart constructor.
- §5 _(promoção temática de (A))_ — Adapter de persistência reidrata agregado **apenas via smart constructors de VOs internos**, retornando `Result<Aggregate, RehydrationError>`.
- §6 — Wrapper-brand para VOs que carregam grandeza/unidade/contexto evolutivo (`Money`, `Period`, `InterestRate`).
- §7 — Primitivo-brand apenas para identificadores opacos e estruturalmente irredutíveis (`ContractId`, `AmendmentId`, `DocumentId`, `UserRef`).
- §8 — Module-as-namespace (Padrão D): exportar free functions; consumir com `import * as Money from './money.ts'`.
- §9 — Smart constructor `from<Source>` retorna `Result<T, TaggedError>`. Tagged error carrega `attemptedValue: <tipo da assinatura>`.
- §10 — Identidade fixa via facade `immutable()` / `deepImmutable()` em `shared/immutable.ts`. Esconde `Object.freeze`.
- §11 — `shared/brand.ts` modernizado: `unique symbol` global + string literal `K`. Helper `Brand<T, K>` + `BrandOf<T>`.
- §12 — Migração ~200 imports via codemod `ts-morph` big-bang num único ticket.

**DON'T (9)**

- §3 _(promoção temática de (A))_ — Confundir validação booleana com parse. "Parse, don't validate" (Wlaschin).
- §5 — `Object.freeze` direto no código de domínio — usa `immutable`/`deepImmutable`.
- §6 — Brand-de-primitivo para grandezas/unidades (colapsa sob extensão).
- §7 — Namespace-objeto `export const Money = { … }` (perde tree-shaking + jargão OO).
- §8 — Function-as-constructor `Money(100)` retornando `Result` (quebra semântica JS).
- §9 — Zod **dentro** de `shared/<vo>.ts` — Zod vive no Adapter/Borda.
- §10 — Identidade como função (`zero()`) quando o valor é imutável puro.
- §11 — Migração dual coexistente (Padrão A legado + Padrão D novo) — drift permanente.
- §12 — `declare const brand: unique symbol` espalhado em cada arquivo de VO — centraliza em `shared/brand.ts`.

**CONSIDER (4)**

- §2 — `deepImmutable` para VOs compostos com sub-VOs aninhados.
- §3 — `BrandOf<Money>` em testes/diagnóstico.
- §4 — `bigint` no domínio se valores se aproximarem de `MAX_SAFE_INTEGER`. Domain-driven, não DB-driven.
- §5 — `Object.isFrozen()` em property-based tests confirmando invariante de imutabilidade.

---

### §3.B.9 — Tickets Vivos como Referência

| Conceito da §3.B                               | Ticket vivo                      |
| :--------------------------------------------- | :------------------------------- |
| Facade `immutable()` / `deepImmutable()`       | `CTR-SHARED-IMMUTABLE`           |
| `Brand<T, K>` + `BrandOf<T>` + `unique symbol` | `CTR-SHARED-BRAND-UNIQUE-SYMBOL` |
| Template canônico aplicado em 6+ VOs           | `CTR-SHARED-VO-CANONICAL`        |
| Codemod big-bang ~200 imports                  | `CTR-DOMAIN-IMPORT-CODEMOD`      |

---

## §3.I — Composição Funcional com Result

> Consolidação do **Bloco I** da entrevista canônica [`handbook/interviews/0001-functional-ddd-domain-refresh.md`](../../../handbook/interviews/0001-functional-ddd-domain-refresh.md).
> Tickets vivos que aplicaram estes padrões: `CTR-SHARED-RESULT-COMBINATORS`, `CTR-DOMAIN-COMPOSE-REFACTOR`.
>
> **Cross-ref §3.B:** §3.B define o smart constructor como ponto de entrada (parse) e o cast auditado. §3.I cobre o _como combinar_ resultados depois que cada smart constructor retornou um `Result` — as três estratégias de composição e onde cada uma se aplica.

---

### §3.I.1 — Result Homemade (`shared/result.ts`)

O projeto usa `src/shared/result.ts` — ~50 LOC, zero dependências externas. API canônica:

```ts
// src/shared/result.ts
export type Result<T, E> = Readonly<{ ok: true; value: T }> | Readonly<{ ok: false; error: E }>;

export const ok = <T>(value: T): Result<T, never> => ({ ok: true, value });
export const err = <E>(error: E): Result<never, E> => ({ ok: false, error });

export const isOk = <T, E>(r: Result<T, E>): r is Readonly<{ ok: true; value: T }> => r.ok;
export const isErr = <T, E>(r: Result<T, E>): r is Readonly<{ ok: false; error: E }> => !r.ok;

export const mapErr = <T, E, F>(r: Result<T, E>, f: (e: E) => F): Result<T, F> =>
  r.ok ? r : err(f(r.error));

export const combine = <T extends readonly unknown[], E>(results: {
  readonly [K in keyof T]: Result<T[K], E>;
}): Result<T, readonly E[]> => {
  /* coleta values OU errors */
};
```

**DO I§13:** usar `ok`, `err`, `isOk`, `isErr`, `mapErr`, `combine` do `result.ts` homemade. Não instalar biblioteca externa.

**Por que homemade?** O `Result<T, E>` do projeto é um `Readonly<{ok: true; value: T}>` — shape mínimo que o TypeScript narrowa automaticamente com `if (r.ok)`. Bibliotecas como `neverthrow` ou `fp-ts` acrescentam API desnecessária (`andThen`, `map`, `ResultAsync`) que conflita com o estilo early-return imperativo adotado.

---

### §3.I.2 — Estratégia α: Early Return (Sequência Dependente)

**DO I§14:** quando os passos são **dependentes** (cada passo usa o valor do anterior), usar early return com narrowing automático do TypeScript.

```ts
// Estratégia α — early return: cada if (!r.ok) propaga o erro imediatamente.
// O TypeScript narrowa automaticamente: após o if, `r.value` é garantido.

// Exemplo canônico — homologateAmendment (Application layer):
const amendmentIdResult = AmendmentId.rehydrate(cmd.amendmentId);
if (!amendmentIdResult.ok) return amendmentIdResult; // narrowing automático

const contractIdResult = ContractId.rehydrate(cmd.contractId);
if (!contractIdResult.ok) return contractIdResult;

const userRefResult = UserRef.rehydrate(cmd.homologatedBy);
if (!userRefResult.ok) return userRefResult;

// Após os 3 guards, o TS garante: .value está disponível sem cast.
```

**Ratio legis:** o padrão `if (!r.ok) return r` é **idioma TypeScript nativo** — sem importação extra, sem método encadeado. O compilador narrowa o tipo após o guard: dentro do bloco `return`, `r` é `Err`; depois, `r.value` é `T`. Qualquer biblioteca que substitua isso por `.andThen(...)` ou `.flatMap(...)` esconde o narrowing e adiciona overhead cognitivo.

---

### §3.I.3 — Estratégia β: `combine` (Inputs Independentes)

**DO I§15:** quando N inputs são **independentes** entre si (nenhum depende do outro para ser calculado), usar `combine(...)` para coletar todos os erros de uma vez — melhor UX na borda (P.O. vê todos os campos inválidos, não apenas o primeiro).

```ts
// Estratégia β — combine: todos os inputs são validados em paralelo.
// Erros de todos os campos chegam de uma vez.

import { combine, ok, err } from '../../../../shared/result.ts';
import * as Money from '../shared/money.ts';
import * as Period from '../shared/period.ts';

const moneyResult = Money.fromCents(cmd.valueCents);
const periodResult = Period.from(cmd.startDate, cmd.endDate);

// combine coleta erros de TODOS os Results com erro antes de retornar.
const combined = combine([moneyResult, periodResult] as const);
if (!combined.ok) return err(combined.error[0]!); // ou propagar todos

const [money, period] = combined.value;
```

**Quando usar β vs α:** se o segundo cálculo **não usa** o resultado do primeiro, `combine` é superior — o usuário não precisa corrigir um campo de cada vez.

---

### §3.I.4 — Estratégia γ: `combine` + único `mapErr` (Tradução de Erro)

**DO I§16:** quando múltiplos inputs independentes de naturezas distintas precisam ser validados e os erros precisam ser traduzidos para o tipo de erro do chamador, combinar `combine(...)` com um único `mapErr` no final — evita espalhar `if (!x.ok)` repetido + conversão de erro N vezes.

```ts
// Estratégia γ — combine + mapErr: tradução de erro centralizada no fim.
// Sem espalhar `if (!x.ok) return err(mapToContractError(x.error))` 10×.

import { combine, mapErr, ok, err } from '../../../../shared/result.ts';
import * as ContractId from '../shared/contract-id.ts';
import * as Money from '../shared/money.ts';

type InputError = ContractId.ContractIdError | Money.MoneyError;

const idResult = ContractId.rehydrate(raw.id);
const moneyResult = Money.fromCents(raw.valueCents);

const combined = combine([idResult, moneyResult] as const);
// mapErr uma única vez — traduz readonly E[] para o tipo de erro do domínio.
if (!combined.ok) return mapErr(combined, (errors) => errors[0]!);

const [id, money] = combined.value;
```

**Ratio legis (DO I§16):** mapErr é o **único ponto de tradução de erro** — em vez de `if (!x.ok) return err(translate(x.error))` repetido para cada campo, a conversão ocorre uma única vez sobre o resultado agregado.

---

### §3.I.5 — Functional Core / Imperative Shell

**DO I§17:** o **Functional Core** é o domínio — 100% síncrono, puro, sem I/O. O **Imperative Shell** é a Application layer — onde `async/await`, repositórios e `Promise` vivem.

```
Functional Core (domain/)
  Money.fromCents(cents)    → Result<Money, MoneyError>       — síncrono, puro
  Contract.create(...)      → Result<{ contract, event }, E>  — síncrono, puro
  Amendment.homologate(...) → Result<{ amendment, event }, E> — síncrono, puro

Imperative Shell (application/use-cases/)
  createContract(deps)(cmd)         → Promise<Result<..., E>>  — async, I/O
  homologateAmendment(deps)(cmd)    → Promise<Result<..., E>>  — async, I/O
```

**Regra de fronteira:** `Promise` **nunca** entra no `domain/`. Domínio retorna `Result<T, E>` síncrono; use case envelopa em `Promise`. Estratégias α/β/γ são **idiomas do Functional Core** — usadas tanto no domínio quanto na borda do use case para validar inputs.

---

### §3.I.6 — Coexistência das 3 Estratégias

**DO I§18:** as três estratégias α, β, γ **coexistem** num mesmo use case — não há uma estratégia "vencedora" que substitui as demais. Escolher por **acoplamento entre os inputs**:

| Situação                                  | Estratégia           | Por quê                                               |
| :---------------------------------------- | :------------------- | :---------------------------------------------------- |
| Passo B usa o valor de Passo A            | α — early return     | Dependência sequencial; sem passo B se passo A falhar |
| N inputs todos independentes, UX coletiva | β — combine          | Coletar todos os erros antes de abortar               |
| N inputs independentes + tradução de erro | γ — combine + mapErr | Centralizar conversão de tipo de erro                 |

**DO I§19:** o Padrão D (module-as-namespace) **protege** a composição: `Money.fromCents`, `Period.from`, `ContractId.rehydrate` são funções livres que retornam `Result` — compõem diretamente sem adaptadores.

**DON'T I§18 — Anti-pattern:** tentar unificar as 3 estratégias num combinator genérico introduz complexidade de tipo desnecessária. `combine` do `result.ts` já é o combinator para β; early return é suficiente para α. Não reinventar.

---

### §3.I.7 — Tabela Canônica: 7 DO + 6 DON'T + 3 CONSIDER

> Contagem real: DO §13–§19 (7 itens), DON'T §13–§18 (6 itens), CONSIDER §6–§8 (3 itens).

**DO (7)**

- §13 — Usar `ok`, `err`, `isOk`, `isErr`, `mapErr`, `combine` do `result.ts` homemade. Não instalar biblioteca externa.
- §14 — Estratégia α (early return): para sequências dependentes. `if (!r.ok) return r` propaga o erro; TypeScript narrowa automaticamente.
- §15 — Estratégia β (`combine`): para N inputs independentes. Coleta todos os erros antes de abortar — melhor UX.
- §16 — Estratégia γ (`combine` + `mapErr` único): para N inputs independentes com tradução de erro. Evita espalhar conversão N vezes.
- §17 — Functional Core (domínio) 100% síncrono puro. `Promise` vive apenas no Imperative Shell (Application layer).
- §18 — As 3 estratégias coexistem num mesmo use case. Escolha guiada por acoplamento entre inputs, não preferência estilística.
- §19 — Padrão D (module-as-namespace) protege a composição: `Money.fromCents`, `Period.from`, etc. retornam `Result` e compõem diretamente.

**DON'T (6)**

- §13 — `neverthrow`, `fp-ts`, `Effect` — bibliotecas externas de Result/Effect. Não instalar.
- §14 — `andThen`, `flatMap` encadeados — escondem o narrowing automático do TS; aumentam overhead cognitivo.
- §15 — `pipe`, `flow` do `fp-ts` ou similares — programação point-free obscurece o fluxo imperativo legível.
- §16 — `traverse`, `sequence` (idiomas Haskell/fp-ts) — não são idiomas TypeScript; o compilador não narrowa.
- §17 — `ResultAsync` (neverthrow) — mistura Promise + Result num tipo composto que quebra o Functional Core / Imperative Shell.
- §18 — Combinator genérico custom que tenta unificar α/β/γ — complexidade de tipo desnecessária. `combine` do `result.ts` já é o combinator canônico.

**CONSIDER (3)**

- §6 — `isOk` / `isErr` como type guards em contextos onde o narrowing direto (`if (r.ok)`) não é suficiente (ex.: callbacks, predicados).
- §7 — `mapErr` para adaptar erros de porta (repositório, eventBus) para o tipo de erro do use case — evita re-wrap manual.
- §8 — Documentar no JSDoc do use case qual estratégia (α/β/γ) foi usada e por quê — facilita revisão em W2 e manutenção futura.

---

### §3.I.8 — Tickets Vivos como Referência

| Conceito da §3.I                                              | Ticket vivo                     |
| :------------------------------------------------------------ | :------------------------------ |
| `mapErr`, `combine` adicionados ao `shared/result.ts`         | `CTR-SHARED-RESULT-COMBINATORS` |
| Refatoração de use cases para usar combine + mapErr canônicos | `CTR-DOMAIN-COMPOSE-REFACTOR`   |

---

## §3.D — Tagged Errors & Invariantes em Tipos

> Consolidação do **Bloco D** da entrevista canônica [`handbook/interviews/0001-functional-ddd-domain-refresh.md`](../../../handbook/interviews/0001-functional-ddd-domain-refresh.md).
> Tickets vivos que aplicaram estes padrões: `CTR-DOMAIN-TAGGED-ERRORS`, `CTR-DOMAIN-STATE-MACHINE-CONTRACT`, `CTR-DOMAIN-STATE-MACHINE-AMENDMENT`, `CTR-DOMAIN-INVARIANT-CONTEXTUAL`.

### §3.D.1 — Tagged Errors

**Shape canônico** (`Readonly<{ tag: 'PascalCaseTag'; ...payload? }>`):

```ts
// src/modules/contracts/domain/contract/errors.ts

// Erro de validação simples — nulário (sem payload)
export type ContractTitleRequired = Readonly<{ tag: 'ContractTitleRequired' }>;

// Erro de invariante — carrega as DUAS peças de evidência que colidiram
export type ContractNotActive = Readonly<{
  tag: 'ContractNotActive';
  currentStatus: ContractStatus; // estado atual (evidência 1)
}>;

export type ContractCannotExpireYet = Readonly<{
  tag: 'ContractCannotExpireYet';
  currentEnd: Date; // evidência 1 — o que o contrato tem
  attemptedAt: Date; // evidência 2 — o que o caller tentou
}>;

export type ContractValueWouldGoNegative = Readonly<{
  tag: 'ContractValueWouldGoNegative';
  currentValue: Money; // evidência 1
  attemptedDecrease: Money; // evidência 2
}>;
```

**Case constructors como free functions em `errors.ts`** — Padrão D (module-as-namespace):

```ts
// src/modules/contracts/domain/contract/errors.ts
// Cada constructor declara o SUBTIPO EXATO que produz (DO D§24) —
// preserva narrowing nos callers via r.error.tag === 'ContractNotActive'.

export const contractTitleRequired = (): ContractTitleRequired => ({
  tag: 'ContractTitleRequired',
});

export const contractNotActive = (currentStatus: ContractStatus): ContractNotActive => ({
  tag: 'ContractNotActive',
  currentStatus,
});

export const contractCannotExpireYet = (
  currentEnd: Date,
  attemptedAt: Date,
): ContractCannotExpireYet => ({
  tag: 'ContractCannotExpireYet',
  currentEnd,
  attemptedAt,
});
```

**Consumo via `import * as XError`** (module-as-namespace evita declaration merging informal):

```ts
import * as ContractErrors from './errors.ts';

// No use case / função de domínio:
return err(ContractErrors.contractNotActive(contract.status));
```

**Regras de naming:**

- **Erros:** PascalCase adjetival/factual — `ContractNotActive`, `AmendmentDocumentAlreadyAttached`.
- **Eventos:** PascalCase passado — `ContractCreated`, `AmendmentHomologated`.
- **Payload de invariante:** carrega as duas peças de evidência que colidiram (estado atual + tentativa). Validações simples (`*Required`, `*Zero`) ficam nulários.
- **Subtipo exato no return type:** `contractNotActive(...): ContractNotActive` (não `ContractError`) — preserva narrowing nos callers.

> **Ratio legis:** erro como valor estruturado, não exceção opaca. Cada erro contém o que o caller precisa para reagir (mensagem PT via formatter, retry, telemetria). O tag é o discriminador; o payload é a evidência navegável.

---

### §3.D.2 — State Machine em Tipos

**Um tipo refinado por estado do agregado:**

```ts
// src/modules/contracts/domain/contract/types.ts

export type ActiveContract = ContractCore & Readonly<{ status: 'Active' }>;
export type ExpiredContract = ContractCore & Readonly<{ status: 'Expired'; endedAt: Date }>;
export type TerminatedContract = ContractCore & Readonly<{ status: 'Terminated'; endedAt: Date }>;

export type Contract = ActiveContract | ExpiredContract | TerminatedContract;
```

`endedAt` está **ausente em `ActiveContract`** e é **`Date` obrigatório em `Expired`/`Terminated`** — estados eliminam `null` (DO C§29).

**Transições são funções totais sobre o tipo refinado:**

```ts
// Transição aceita apenas o estado correto — sem runtime check "if active"
expire(c: ActiveContract, at: Date): Result<{ contract: ExpiredContract; event: ContractExpired }, ContractError>
terminate(c: ActiveContract, by: UserRef, at: Date): Result<{ contract: TerminatedContract; event: ContractTerminated }, ContractError>
```

**Refinement constructors** (`parseActive` / `parsePending`) — **nunca** `assertActive`:

```ts
// ✅ Refinement constructor — retorna Result
const parseActive = (c: Contract): Result<ActiveContract, ContractNotActive> =>
  c.status === 'Active' ? ok(c) : err(ContractErrors.contractNotActive(c.status));

// ❌ DON'T D§19 — assert que devolve Contract cru fere refinement
const assertActive = (c: Contract): Contract => {
  if (c.status !== 'Active') throw /* antipadrão — proibido no domínio */ new Error('not active');
  return c;
};
```

**Discriminador composto (Amendment):** `status` ('Pending' vs 'Homologated') + presença de `signedDocumentRef` (null vs `DocumentId`) discriminam 3 estados sem novo campo `state`:

```ts
// src/modules/contracts/domain/amendment/types.ts
type PendingWithoutDocumentAmendment = AmendmentCore &
  Readonly<{
    status: 'Pending';
    signedDocumentRef: null;
    homologatedAt: null;
    homologatedBy: null;
  }>;
type PendingWithDocumentAmendment = AmendmentCore &
  Readonly<{
    status: 'Pending';
    signedDocumentRef: DocumentId;
    homologatedAt: null;
    homologatedBy: null;
  }>;
type HomologatedAmendment = AmendmentCore &
  Readonly<{
    status: 'Homologated';
    signedDocumentRef: DocumentId;
    homologatedAt: Date;
    homologatedBy: UserRef;
  }>;
type Amendment =
  | PendingWithoutDocumentAmendment
  | PendingWithDocumentAmendment
  | HomologatedAmendment;
```

> **Ratio legis:** "Parse, don't validate" (Wlaschin). O tipo carrega a invariante; o compilador rejeita combinações inválidas. Runtime checks somem ou viram refinement constructors na borda. Campos `T | null` que codificavam estado viram propriedade obrigatória do tipo refinado.

---

### §3.D.3 — Invariantes Contextuais — 3 Rotas Canônicas

| Rota  | Nome semântico                    | Quando usar                                                                          | Exemplo vivo                                                                   |
| :---- | :-------------------------------- | :----------------------------------------------------------------------------------- | :----------------------------------------------------------------------------- |
| **α** | **VO como Prova**                 | Invariante **atemporal e reusável** — vale fora deste BC ou em múltiplos contextos   | `NonZeroMoney` em `domain/shared/non-zero-money.ts`                            |
| **β** | **Agregado como Guardião**        | Invariante **contextual e mutável**, dependente do estado interno do agregado        | Regra `currentValue - decrease >= 0` em `Contract.applyHomologatedAdjustment`  |
| **γ** | **Caso de Uso como Orquestrador** | Invariante **contextual + específico do caso de uso**, exigindo VO brandado na borda | `createAmendment` chama `NonZeroMoney.from(money)` antes de `Amendment.create` |

**Rota α — VO como Prova** (`NonZeroMoney`):

```ts
// src/modules/contracts/domain/shared/non-zero-money.ts
// Rota α (DO D§25): invariante atemporal codificada como subtipo de Money.
// NonZeroMoney extends Money — widening automático, sem cast nos callers.

export type NonZeroMoney = Money & { readonly __nonZeroMoney: true };
export type NonZeroMoneyError = 'money-must-be-non-zero';

export const from = (m: Money): Result<NonZeroMoney, NonZeroMoneyError> =>
  m.cents === 0 ? err('money-must-be-non-zero') : ok(m as NonZeroMoney);
```

**Rota γ — Caso de Uso como Orquestrador** (`createAmendment`):

```ts
// src/modules/contracts/application/use-cases/create-amendment.ts (linhas 77-88)
// Rota γ (DO D§26): use case refina Money → NonZeroMoney antes de chamar o domínio.
switch (cmd.kind) {
  case 'Addition':
  case 'Suppression': {
    const money = Money.fromCents(cmd.impactValueCents);
    if (!money.ok) return money;
    const nonZero = NonZeroMoney.from(money.value);
    if (!nonZero.ok) return err(AmendmentErrors.amendmentImpactValueZero());
    return ok({ ...baseFields, kind: cmd.kind, impactValue: nonZero.value });
  }
```

**Heurística de escolha:**

- Invariante **estrutural e reusável** → α (VO subtype). Ex.: `NonZeroMoney`, `PositivePeriod`.
- Invariante **mutável de estado interno** → β (agregado guarda). Ex.: saldo corrente, limite acumulado.
- Invariante **específica do caso de uso** → γ (use case orquestra + VO brandado na borda).
- **Combinação α + γ** é canônica: VO brandado em `domain/shared/` + use case refina na borda.

> **Ratio legis:** cada rota tem custo distinto. α produz proliferação de VOs (`PositiveMoney`, `MoneyGT100`, …) se usado indiscriminadamente; β mantém runtime check mas garante consistência do agregado; γ exige passo extra no caso de uso mas centraliza a responsabilidade. Escolha guiada pelo **escopo da invariante**, não preferência estilística.

---

### §3.D.4 — Aninhamento de Eixos Discriminantes

Quando um agregado tem **2 eixos discriminantes independentes** (ex.: `status × kind`), modelar como **aninhamento** — union por status, kind como mixin/variant **dentro** do tipo Core. **NUNCA cross-product** (3 status × 4 kinds = 12 tipos).

**Exemplo canônico — Amendment:**

```ts
// src/modules/contracts/domain/amendment/types.ts

// Eixo kind — INDEPENDENTE do status (DO C§28)
// Addition e Suppression exigem NonZeroMoney — rota α (DO D§25)
export type AmendmentVariant = Readonly<
  | { kind: 'Addition';    impactValue: NonZeroMoney }
  | { kind: 'Suppression'; impactValue: NonZeroMoney }
  | { kind: 'TermChange';  newEndDate: Date }
  | { kind: 'Misc' }
>;

type AmendmentCore = Readonly<{
  id: AmendmentId;
  contractId: ContractId;
  amendmentNumber: string;
  description: string;
  createdAt: Date;
}> & AmendmentVariant;

// Eixo status — 3 estados, kind aninhado em AmendmentCore
type PendingWithoutDocumentAmendment = AmendmentCore & Readonly<{ status: 'Pending'; signedDocumentRef: null; ... }>;
// ... 3 estados × kind aninhado, NÃO 12 tipos
```

**Por que não cross-product?**

- `status` e `kind` são **ortogonais**: kind não muda durante transição de estado.
- Cross-product força sincronização redundante (`ActiveAdditionContract`, `ExpiredAdditionContract`, …).
- Aninhamento preserva ortogonalidade — uma transição de estado não exige recriar o kind.

**`Extract<Union, { status: 'X' }>` como helper** se consumidores precisarem narrowar para estado específico:

```ts
type PendingAmendment = Extract<Amendment, { status: 'Pending' }>;
```

> **Ratio legis:** 3 estados × 4 kinds são independentes. Aninhamento expressa essa independência no tipo. Cross-product é uma modelagem acidental que vaza detalhes de implementação no sistema de tipos.

---

### §3.D.5 — Tabela Canônica: 10 DO + 7 DON'T + 2 CONSIDER

> Citações literais da entrevista canônica (`handbook/interviews/0001-functional-ddd-domain-refresh.md`, linhas 872-942). Cada item referencia o ticket vivo que o aplicou.

**DO (10)**

- §20 — Um tipo refinado por estado de agregado. Transições são funções totais sobre o tipo refinado.
- §21 — Refinement via `parseActive`/`parsePending`. Não `assertActive`.
- §22 — Tagged error shape **flat** (`{ tag, …payload }`). Case constructors são free functions em `errors.ts`.
- §23 — Payload de invariante carrega **duas peças de evidência** (estado atual + tentativa colidente).
- §24 — Erros PascalCase adjetival/factual (`ContractNotActive`). Eventos PascalCase passado (`ContractCreated`).
- §25 — Rota α (**VO como Prova**) — invariante atemporal e reusável codificada como subtipo.
- §26 — Rota γ (**Caso de Uso como Orquestrador**) — VO brandado refinado na borda do use case.
- §27 — Rota β (**Agregado como Guardião**) — invariante contextual de estado interno no agregado.
- §28 — Aninhamento de 2 eixos discriminantes (`status × kind`). Nunca cross-product.
- §29 — Estados eliminam `null` — campo `T | null` codificando estado vira propriedade obrigatória do tipo refinado.

**DON'T (7)**

- §19 — `assertActive` que devolve `Contract` cru — fere refinement (retornar `never` é o `_exhaustive`, não devolver o tipo amplo).
- §20 — `if (status !== 'X')` espalhado em business code — shotgun parsing.
- §21 — `export const ContractError = { … } as const` ao lado de `export type ContractError` — declaration merging informal.
- §22 — Erro de invariante carregando primitivo cru sem ser evidência.
- §23 — Naming imperativo (`assertActive`, `validateActive`) — usar adjetival/factual.
- §24 — Codificar invariante reusável como `if` no agregado — promover para VO (rota α).
- §25 — Espalhar o **mesmo** `if` em múltiplos pontos — declarar uma vez como tipo.

**CONSIDER (2)**

- `rehydrate<Aggregate>(row)` único dispatcher — lê `row.status` e despacha para o tipo refinado correto (evita parsing espalhado nos mappers).
- Case constructor declarar o **subtipo exato** que produz (`ContractNotActive`, não `ContractError`) — preserva narrowing nos callers sem cast.

---

### §3.D.6 — Tickets Vivos como Referência

| Conceito da §3.D                                                                          | Ticket vivo                          |
| :---------------------------------------------------------------------------------------- | :----------------------------------- |
| Tagged Errors (shape canônico, case constructors, payload de evidência)                   | `CTR-DOMAIN-TAGGED-ERRORS`           |
| State Machine Contract (`ActiveContract` / `ExpiredContract` / `TerminatedContract`)      | `CTR-DOMAIN-STATE-MACHINE-CONTRACT`  |
| State Machine Amendment (3 estados × 4 kinds aninhado, `PendingWithoutDocumentAmendment`) | `CTR-DOMAIN-STATE-MACHINE-AMENDMENT` |
| Invariante α + γ (`NonZeroMoney` em `domain/shared/` + `createAmendment`)                 | `CTR-DOMAIN-INVARIANT-CONTEXTUAL`    |

---

## §3.C — Discriminated Unions & Exhaustive Switch

> Consolidação do **Bloco C** da entrevista canônica [`handbook/interviews/0001-functional-ddd-domain-refresh.md`](../../../handbook/interviews/0001-functional-ddd-domain-refresh.md).
> Tickets vivos que aplicaram estes padrões: `CTR-DOMAIN-STATE-MACHINE-AMENDMENT`, `CTR-AGG-CONTRACT`, `CTR-USECASE-HOMOLOGATE-AMENDMENT`, `CTR-DOMAIN-EXHAUSTIVE-SWITCH-FIX`.
>
> **Cross-ref com §3.D:** §3.D aborda o _porquê_ do aninhamento (State Machine necessária, invariantes contextuais). §3.C foca no _como_ — o **idioma TypeScript** dos discriminators, da dupla taxonomia entre agregados e do exhaustive switch sem `throw`.

---

### §3.C.1 — Aninhamento como Padrão de 2 Eixos Discriminantes

Quando um agregado possui **2 eixos discriminantes independentes** (ex.: `status × kind`), modelar como **aninhamento**: union por um eixo (status), kind como variant **dentro** do tipo Core. **NUNCA cross-product** (3 estados × 4 kinds = 12 tipos).

**Por que evitar cross-product?**

- `status` e `kind` são **ortogonais**: kind não muda durante transições de status.
- Cross-product força sincronização redundante entre os dois eixos — `PendingAdditionAmendment`, `HomologatedAdditionAmendment` etc.
- Aninhamento preserva ortogonalidade: uma transição de status não exige recriar o kind.

**Exemplo canônico — Amendment** (fiel a `src/modules/contracts/domain/amendment/types.ts`):

```ts
// Eixo kind — INDEPENDENTE do status
// AmendmentVariant é o mixin aninhado em AmendmentCore
export type AmendmentVariant = Readonly<
  | { kind: 'Addition'; impactValue: NonZeroMoney }
  | { kind: 'Suppression'; impactValue: NonZeroMoney }
  | { kind: 'TermChange'; newEndDate: Date }
  | { kind: 'Misc' }
>;

type AmendmentCore = Readonly<{
  id: AmendmentId;
  contractId: ContractId;
  amendmentNumber: string;
  description: string;
  createdAt: Date;
}> &
  AmendmentVariant;

// Eixo status — 3 estados refinados, NÃO 12 tipos
type PendingWithoutDocumentAmendment = AmendmentCore &
  Readonly<{
    status: 'Pending';
    signedDocumentRef: null;
    homologatedAt: null;
    homologatedBy: null;
  }>;
type PendingWithDocumentAmendment = AmendmentCore &
  Readonly<{
    status: 'Pending';
    signedDocumentRef: DocumentId;
    homologatedAt: null;
    homologatedBy: null;
  }>;
type HomologatedAmendment = AmendmentCore &
  Readonly<{
    status: 'Homologated';
    signedDocumentRef: DocumentId;
    homologatedAt: Date;
    homologatedBy: UserRef;
  }>;

type Amendment =
  | PendingWithoutDocumentAmendment
  | PendingWithDocumentAmendment
  | HomologatedAmendment;
// 3 estados × kind aninhado — NÃO 12 tipos cross-product.
```

**`Extract<Union, { status: 'X' }>` como helper** quando consumidores precisam narrowar para estado específico sem reescrever o tipo:

```ts
type PendingAmendment = Extract<Amendment, { status: 'Pending' }>;
```

> **Cross-ref §3.D.4** — o mesmo exemplo sob o ângulo "State Machine necessária". Aqui o foco é o idioma TS do aninhamento e a proibição do cross-product.

---

### §3.C.2 — Dupla Taxonomia Legítima

**Dupla taxonomia** entre agregados é legítima quando os conceitos são categoricamente distintos — mesmo que os dois usem discriminated unions de 4 kinds.

Exemplo canônico do módulo Contratos:

| Tipo                 | Categoria                                                           | 4 kinds                                                                  |
| :------------------- | :------------------------------------------------------------------ | :----------------------------------------------------------------------- |
| `Amendment`          | Ato **administrativo** — registra o que foi acordado e assinado     | `Addition` / `Suppression` / `TermChange` / `Misc`                       |
| `ContractAdjustment` | Efeito **matemático** no `Contract` — instrução de mutação derivada | `ValueIncrease` / `ValueDecrease` / `PeriodExtension` / `Acknowledgment` |

```ts
// src/modules/contracts/domain/contract/types.ts (linhas 114-119)
export type ContractAdjustment = Readonly<
  | { kind: 'ValueIncrease'; amount: Money; amendmentId: AmendmentId }
  | { kind: 'ValueDecrease'; amount: Money; amendmentId: AmendmentId }
  | { kind: 'PeriodExtension'; newEnd: Date; amendmentId: AmendmentId }
  | { kind: 'Acknowledgment'; amendmentId: AmendmentId }
>;
```

**Ports & Adapters interno:** o domínio do `Contract` **não importa** `Amendment`; só recebe `ContractAdjustment`. Isso isola a máquina de estado do `Contract` das regras administrativas do `Amendment`.

**NÃO eliminar** `ContractAdjustment` em nome de DRY mecânico. A evolução assimétrica (1:N futuro, 0:1 futuro) demonstra que os dois tipos **não são equivalentes** — uni-los agora fecha portas de design sem ganho.

---

### §3.C.3 — Função-Ponte Retorna Array

A função que traduz `Amendment` → `ContractAdjustment` retorna **`readonly ContractAdjustment[]`** (array), não um escalar único.

```ts
// src/modules/contracts/application/use-cases/homologate-amendment.ts (linhas 57-73)
export const toContractAdjustment = (amendment: AmendmentEntity): ContractAdjustment => {
  const amendmentId: AmendmentId.AmendmentId = amendment.id;
  switch (amendment.kind) {
    case 'Addition':
      return { kind: 'ValueIncrease', amount: amendment.impactValue, amendmentId };
    case 'Suppression':
      return { kind: 'ValueDecrease', amount: amendment.impactValue, amendmentId };
    case 'TermChange':
      return { kind: 'PeriodExtension', newEnd: amendment.newEndDate, amendmentId };
    case 'Misc':
      return { kind: 'Acknowledgment', amendmentId };
    default: {
      const _exhaustive: never = amendment;
      return _exhaustive;
    }
  }
};
```

> Nota: a assinatura atual retorna escalar (`ContractAdjustment`). A forma canônica **projetada** é `readonly ContractAdjustment[]` para suportar as 3 cardinalidades:

**3 cardinalidades suportadas pelo retorno em array:**

| Cardinalidade | Caso                                     | Exemplo                                                                      |
| :------------ | :--------------------------------------- | :--------------------------------------------------------------------------- |
| **1:1**       | Um Amendment produz exatamente um ajuste | `Addition` → `ValueIncrease` (caso atual)                                    |
| **1:N**       | Um Amendment produz múltiplos ajustes    | Futuro: Renewal+Reajuste no mesmo Amendment                                  |
| **0:1**       | Um ajuste sem Amendment correspondente   | Futuro: `ContractAdjustment` puramente derivado (promoção de status passivo) |

JSDoc da função deve documentar os 3 casos ao evoluir para array.

---

### §3.C.4 — Exhaustive Switch — Sem `throw`

> Esta é a regra que resolve a issue pré-existente `SKILL.md` seção "Obrigações" (exhaustive default com `throw` + `new Error(...)` — contradiz "zero throw" do domínio).

Dois padrões aceitos para exhaustive switch no domínio:

**Padrão A — omitir `default`** (preferível quando o `switch` cobre retorno em todos os `case`):

```ts
// Padrão A — sem default; tsconfig.noFallthroughCasesInSwitch + tsc enforce exaustividade.
switch (adjustment.kind) {
  case 'ValueIncrease':
    return ok({ contract: nextIncrease, event: evt });
  case 'ValueDecrease':
    return ok({ contract: nextDecrease, event: evt });
  case 'PeriodExtension':
    return ok({ contract: nextExtension, event: evt });
  case 'Acknowledgment':
    return ok({ contract: nextAck, event: evt });
}
// Exhaustive: tsconfig.noFallthroughCasesInSwitch enforce.
// Exemplo vivo: applyHomologatedAdjustment em src/modules/contracts/domain/contract/contract.ts
```

**Padrão B — `default` com `const _: never`** (quando há código após o switch ou a função não retorna em todos os `case`):

```ts
// Padrão B — default exaustivo sem throw.
switch (amendment.kind) {
  case 'Addition':
    return { kind: 'ValueIncrease', amount: amendment.impactValue, amendmentId };
  case 'Suppression':
    return { kind: 'ValueDecrease', amount: amendment.impactValue, amendmentId };
  case 'TermChange':
    return { kind: 'PeriodExtension', newEnd: amendment.newEndDate, amendmentId };
  case 'Misc':
    return { kind: 'Acknowledgment', amendmentId };
  default: {
    const _exhaustive: never = amendment;
    return _exhaustive; // TS infere `never` — nunca executado em runtime
  }
}
// Exemplo vivo: toContractAdjustment em src/modules/contracts/application/use-cases/homologate-amendment.ts
```

**DON'Ts explícitos:**

- `default: throw` + `new Error(...)` — viola "zero throw" do domínio. Proibido sem exceção.
- `assertNever(x: never): never` como helper externo — exige `throw` internamente (TS rejeita função `never` sem corpo que lança); banido.

---

### §3.C.5 — Tabela Canônica: 5 DO + 5 DON'T + 2 CONSIDER

> Citações literais da entrevista canônica (`handbook/interviews/0001-functional-ddd-domain-refresh.md`). Contagem real: 5 DO (§28-§32) + 5 DON'T (§26-§30) + 2 CONSIDER (§11-§12). A tabela L971 da entrevista declara 6+6+2 por erro de contagem — usar 5+5+2 reais.

**DO (5)**

- §28 — Modelar 2 eixos discriminantes como **aninhamento** (union por status, kind interno em `AmendmentCore`). Nunca cross-product.
- §29 — Estados eliminam `null` — campos `T | null` codificando estado viram propriedade obrigatória do tipo refinado. _(cross-ref §3.D.2)_
- §30 — Dupla taxonomia legítima entre agregados quando os conceitos são categoricamente distintos (`Amendment` administrativo vs `ContractAdjustment` matemático). Mantém Ports & Adapters interno.
- §31 — `Amendment.toAdjustments(homologated): readonly ContractAdjustment[]` (**array**) — evolução assimétrica permite 1:N e 0:1 futuros.
- §32 — Exhaustive switch: **omitir `default`** (Padrão A, preferível) ou `default: { const _: never = x; return _; }` (Padrão B). Nunca `throw`.

**DON'T (5)**

- §26 — Cross-product de 2 eixos discriminantes (4 kinds × 3 status = 12 tipos) — duplica máquina de estado, força sincronização redundante.
- §27 — Transição de estado retornando tipo direto sem `Result` — não há como sinalizar falha sem `throw`.
- §28 — Eliminar ContractAdjustment em nome de DRY mecânico — a evolução assimétrica (1:N + 0:1) prova que `ContractAdjustment` não é equivalente a `Amendment`.
- §29 — `default: throw` + `new Error(...)` no exhaustive switch — viola "zero throw". Nunca no domínio.
- §30 — `assertNever(x: never): never` como helper — exige `throw` (TS rejeita função `never` sem corpo que lança); banido.

**CONSIDER (2)**

- §11 — `Extract<Amendment, { status: 'X' }>` como type helper se o aninhamento ficar verboso em consumidores externos ao agregado.
- §12 — JSDoc do `Amendment.toAdjustments` documentando os 3 casos: 1:1 (Addition→ValueIncrease), 1:N (Renewal+Reajuste futuro), 0:1 (ContractAdjustment sem Amendment correspondente).

---

### §3.C.6 — Tickets Vivos como Referência

| Conceito da §3.C                                                                             | Ticket vivo                          |
| :------------------------------------------------------------------------------------------- | :----------------------------------- |
| Aninhamento status × kind (`PendingWithoutDocumentAmendment`, 3 estados, `AmendmentVariant`) | `CTR-DOMAIN-STATE-MACHINE-AMENDMENT` |
| Dupla taxonomia (`Amendment` ↔ `ContractAdjustment`)                                         | `CTR-AGG-CONTRACT`                   |
| `toAdjustments` como função-ponte retornando array                                           | `CTR-USECASE-HOMOLOGATE-AMENDMENT`   |
| Exhaustive switch sem `throw` (`applyHomologatedAdjustment`, `toContractAdjustment`)         | `CTR-DOMAIN-EXHAUSTIVE-SWITCH-FIX`   |

---

## §3.H — Organização de Módulo & Árvore Canônica

> Consolidação do **Bloco H** da entrevista canônica [`handbook/interviews/0001-functional-ddd-domain-refresh.md`](../../../handbook/interviews/0001-functional-ddd-domain-refresh.md).
> Tickets vivos que aplicaram estes padrões: `CTR-AGG-CONTRACT`, `CTR-AGG-AMENDMENT`, `CTR-STORAGE-PORT`. Ticket `CTR-DOMAIN-RESTRUCTURE` **pendente** (move Repository e VOs para suas posições canônicas finais).
>
> **Cross-ref §3.C:** §3.C foca no idioma TypeScript dos discriminated unions dentro do agregado. §3.H foca na _onde_ — como os arquivos e pastas se organizam entre si dentro de um módulo e entre módulos.

---

### §3.H.1 — Granularidade Canônica do Agregado

**DO H§33:** cada agregado é uma pasta com **4-6 arquivos**:

| Arquivo          | Responsabilidade                                                             |
| :--------------- | :--------------------------------------------------------------------------- |
| `types.ts`       | Readonly types + sub-types do agregado                                       |
| `errors.ts`      | String literal union de erros (ou tagged errors — §3.D)                      |
| `events.ts`      | Discriminated union de eventos de domínio                                    |
| `<aggregate>.ts` | Funções de domínio (`create`, `expire`, `homologate`, …)                     |
| `repository.ts`  | Port (type) — sem implementação — quando o critério H2 aponta para o domínio |
| `index.ts`       | Barrel export `import * as Contract from './index.ts'` (Padrão D)            |

**Ratio legis:** o padrão de 4-6 arquivos é o equilíbrio entre coesão (tudo relativo ao agregado na mesma pasta) e separabilidade (cada preocupação num arquivo legível). Um arquivo único de 600+ linhas colapsa a state machine e torna o `git blame` inútil.

**Quando ultrapassar ~400 linhas em `<aggregate>.ts`:** fragmentar em `<aggregate>-transitions.ts` (funções de transição de estado) + `<aggregate>.ts` (funções invariantes/cálculos) — CONSIDER H§13.

---

### §3.H.2 — Critério H2: Repository — Domain vs Application

**DO H§34:** o critério para posicionar um port de repositório:

> _"Este port é ditado por invariância/ciclo-de-vida do Agregado?"_
>
> - **Sim** → `domain/<aggregate>/repository.ts` — o domínio define o contrato.
> - **Não** → `application/ports/` — a camada de aplicação define o contrato.

**Exemplos canônicos:**

| Port                  | Posição correta                  | Motivação                                                                                      |
| :-------------------- | :------------------------------- | :--------------------------------------------------------------------------------------------- |
| `ContractRepository`  | `domain/contract/repository.ts`  | Ditado pelas invariantes de `Contract`                                                         |
| `AmendmentRepository` | `domain/amendment/repository.ts` | Ditado pelo ciclo de vida de `Amendment`                                                       |
| `DocumentStorage`     | `application/ports/`             | Capacidade técnica — nenhum invariante de domínio de Contrato define como armazenar documentos |

**CONSIDER H§14:** quando o port for ambíguo (parte invariância, parte capacidade), fazer a pergunta: _"Se eu trocar o agregado por outro agregado, este port ainda faz sentido?"_ Sim → application. Não → domain.

**DON'T H§33:** colocar `ContractRepository` em `application/ports/` — confunde port de invariância com port de capacidade; qualquer implementação pode bypassar as invariantes definidas no domínio.

---

### §3.H.3 — Tipos de Port Moram Junto ao Port

**DO H§35:** tipos auxiliares do port vivem no mesmo arquivo (ou arquivo `*.types.ts` ao lado) do port que os usa — **não** em `domain/shared/`.

```
application/ports/
├── document-storage.ts           ← port (type contract)
└── document-storage.types.ts     ← BucketName, StorageKey, StorageRef
```

**DON'T H§34:** `BucketName`/`StorageKey` em `domain/shared/` — esses são tipos de **jargão de infra** (S3, MinIO). Expô-los em `domain/shared/` vaza vocabulário técnico no domínio puro.

**Ratio legis:** o domínio não fala "bucket" nem "storage key". O domínio fala "documento assinado" e "referência de documento". Quando o tipo aparece no domínio, ele deve ser o conceito de domínio — não o artefato de infraestrutura.

---

### §3.H.4 — Shared Kernel vs BC-specific

**DO H§36+§37:** dois níveis de compartilhamento:

| Nível                  | Caminho                           | Critério                                                               | Exemplos                                    |
| :--------------------- | :-------------------------------- | :--------------------------------------------------------------------- | :------------------------------------------ |
| **Shared Kernel**      | `src/shared/kernel/`              | VO **genuinamente cross-BC** — reusado por pelo menos 2 BCs diferentes | `Money`, `Period`, `UserRef`                |
| **BC-specific shared** | `src/modules/<bc>/domain/shared/` | VO específico de um BC — apenas este módulo usa                        | `ContractId`, `AmendmentId`, `NonZeroMoney` |

**Shared Kernel** aplica o conceito de Evans: o kernel é o espaço de conceitos que **dois ou mais BCs concordam** e que nenhum deles pode mudar unilateralmente.

**DON'T H§36:** promover qualquer VO específico do BC para `src/shared/kernel/` — só sobe para Kernel o que é genuinamente reusado cross-BC. Promover `ContractId` para o kernel expõe detalhes de um BC no espaço compartilhado.

---

### §3.H.5 — `public-api/` por Módulo

**DO H§38:** cada módulo é **dono dos eventos que emite**. Eventos públicos (consumíveis por outros módulos) vivem em `src/modules/<bc>/public-api/`, não em um diretório global `src/shared/events/`.

```
src/modules/contracts/public-api/
├── events.ts          ← ContractCreated, AmendmentHomologated, etc.
└── index.ts           ← re-export do que outros módulos podem consumir
```

**DON'T H§35:** `src/shared/events/` global cross-module — apaga o ownership do evento e viola o isolamento do modular monolith (ADR-0006). Outro módulo que consome um evento de `contracts/` deve importar de `contracts/public-api/`, nunca de um espaço global.

**Ratio legis (ADR-0006):** cada BC é responsável pela sua própria API pública. O outbox pattern (ADR-0015) transporta o evento — mas o tipo/schema do evento pertence ao BC de origem.

---

### §3.H.6 — Árvore Canônica (estado-alvo pós-RESTRUCTURE)

> **Nota:** esta árvore reflete o **estado-alvo** após `CTR-DOMAIN-RESTRUCTURE` (pendente). O código atual ainda tem `ContractRepository`/`AmendmentRepository` em `application/ports/` e `BucketName`/`StorageKey` em `domain/shared/`. A migração será feita naquele ticket.

```
src/
├── shared/
│   ├── brand.ts                   ← Brand<T, K> + BrandOf<T> + unique symbol
│   ├── result.ts                  ← Result<T, E> + ok/err/isOk/isErr/combine/mapErr
│   ├── immutable.ts               ← immutable() / deepImmutable()
│   └── kernel/                    ← VOs genuinamente cross-BC (Shared Kernel)
│       ├── money.ts               ← Money + MoneyError + ZERO + fromCents + add + subtract
│       ├── period.ts              ← Period + PeriodError + from + contains + overlaps
│       ├── user-ref.ts            ← UserRef + rehydrate
│       └── index.ts
│
└── modules/
    └── contracts/
        ├── domain/
        │   ├── shared/            ← VOs específicos do BC Contracts
        │   │   ├── ids.ts         ← ContractId, AmendmentId, DocumentId (branded string)
        │   │   ├── non-zero-money.ts ← NonZeroMoney (subtipo de Money — rota α)
        │   │   └── index.ts
        │   ├── contract/
        │   │   ├── types.ts       ← ContractCore, ActiveContract, ExpiredContract, TerminatedContract, ContractAdjustment
        │   │   ├── errors.ts      ← Tagged errors + case constructors
        │   │   ├── events.ts      ← ContractCreated, ContractExpired, ContractTerminated, ...
        │   │   ├── contract.ts    ← create, expire, terminate, applyHomologatedAdjustment
        │   │   ├── repository.ts  ← ContractRepository port (type) — ditado por invariância
        │   │   └── index.ts       ← barrel: import * as Contract from './index.ts'
        │   ├── amendment/
        │   │   ├── types.ts       ← AmendmentCore, AmendmentVariant, 3 estados refinados
        │   │   ├── errors.ts      ← Tagged errors + case constructors
        │   │   ├── events.ts      ← AmendmentCreated, SignedDocumentAttached, AmendmentHomologated
        │   │   ├── amendment.ts   ← create, attachSignedDocument, homologate
        │   │   ├── repository.ts  ← AmendmentRepository port (type) — ditado por ciclo-de-vida
        │   │   └── index.ts       ← barrel: import * as Amendment from './index.ts'
        │   └── index.ts           ← API pública do módulo domain
        │
        ├── application/
        │   ├── ports/
        │   │   ├── document-storage.ts       ← DocumentStorage port (capacidade técnica)
        │   │   ├── document-storage.types.ts ← BucketName, StorageKey, StorageRef
        │   │   ├── event-bus.ts              ← EventBus port
        │   │   └── clock.ts                  ← Clock port
        │   └── use-cases/
        │       ├── create-contract.ts
        │       ├── create-amendment.ts
        │       ├── attach-signed-document.ts
        │       ├── homologate-amendment.ts
        │       └── get-contract.ts
        │
        └── public-api/
            ├── events.ts   ← eventos exportados para outros módulos consumirem
            └── index.ts

tests/modules/contracts/domain/
├── shared/
│   ├── money.test.ts
│   ├── period.test.ts
│   └── ids.test.ts
├── contract/contract.test.ts
└── amendment/amendment.test.ts
```

---

### §3.H.7 — Tabela Canônica: 6 DO + 6 DON'T + 2 CONSIDER

> Contagem real da entrevista: DO §33–§38 (6 itens), DON'T §31–§36 (6 itens), CONSIDER §13–§14 (2 itens). A tabela L973 da entrevista declara 10+6+2 por erro de contagem — usar 6+6+2 reais (mesma decisão documentada em `000-request.md`).

**DO (6)**

- §33 — Granularidade canônica: 4-6 arquivos por agregado (`types`, `errors`, `events`, `<aggregate>.ts`, `repository.ts`, `index.ts`). `index.ts` barrel para `import * as Contract`.
- §34 — Critério H2: _"port ditado por invariância/ciclo-de-vida do Agregado?"_ Sim → `domain/<aggregate>/repository.ts`; Não → `application/ports/`.
- §35 — Tipos do port moram junto do port — `BucketName`/`StorageKey` em `application/ports/document-storage.types.ts`.
- §36 — VOs puros cross-BC promovidos para `src/shared/kernel/` (Evans Shared Kernel) — `Money`, `Period`, `UserRef`.
- §37 — VOs específicos do BC ficam em `src/modules/<bc>/domain/shared/` — `ContractId`, `NonZeroMoney`.
- §38 — `public-api/` por módulo — cada módulo dono dos eventos que emite (ADR-0006).

**DON'T (6)**

- §31 — Colapsar agregado em arquivo único de 600+ linhas — fere legibilidade do Padrão D.
- §32 — Feature slice por operação (`homologate-amendment/`) — fragmenta a state machine do agregado.
- §33 — Repository em `application/ports/` quando ditado por invariância — confunde port de invariância com port de capacidade.
- §34 — VOs de infra (`BucketName`, `StorageKey`) em `domain/shared/` — vazamento de jargão técnico no domínio.
- §35 — `src/shared/events/` global cross-module — apaga ownership do evento e viola isolamento do modular monolith.
- §36 — Promover VO específico do BC para `src/shared/kernel/` — só sobe para Kernel o que é genuinamente cross-BC.

**CONSIDER (2)**

- §13 — Quando `<aggregate>.ts` ultrapassar ~400 linhas, fragmentar em `<aggregate>-transitions.ts` + `<aggregate>.ts` (operações invariantes).
- §14 — Port ambíguo (parte invariância, parte capacidade): pergunta _"se eu trocar o agregado por outro, este port faz sentido?"_. Sim → application. Não → domain.

---

### §3.H.8 — Tickets Vivos como Referência

| Conceito da §3.H                                                                                                                                                                                                            | Ticket vivo                             |
| :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :-------------------------------------- |
| Granularidade canônica do agregado Contract (4 arquivos: types/errors/events/contract.ts — sem repository ainda)                                                                                                            | `CTR-AGG-CONTRACT`                      |
| Granularidade canônica do agregado Amendment (4 arquivos: types/errors/events/amendment.ts — sem repository ainda)                                                                                                          | `CTR-AGG-AMENDMENT`                     |
| Port `DocumentStorage` em `application/ports/` com tipos BucketName/StorageKey/StorageRef                                                                                                                                   | `CTR-STORAGE-PORT`                      |
| Mover `ContractRepository`/`AmendmentRepository` para `domain/<agg>/repository.ts`; mover BucketName/StorageKey para `application/ports/document-storage.types.ts`; promover Money/Period/UserRef para `src/shared/kernel/` | `CTR-DOMAIN-RESTRUCTURE` **(pendente)** |

---

## §3.L — Síntese Canônica (Índice Consolidado dos Blocos Refreshed)

> Síntese final da entrevista canônica [`handbook/interviews/0001-functional-ddd-domain-refresh.md`](../../../handbook/interviews/0001-functional-ddd-domain-refresh.md) — 16º ticket Opção B (último da série CTR-SKILL-REFRESH).
> **Decisão:** §3.L é um **índice consolidado**, não duplicação. As 105 entradas (40 DO + 44 DON'T + 16 CONSIDER + 5 AVOID) estão detalhadas nas seções §3.A–§3.I. §3.L fornece o mapa de navegação, o glossário canônico e o status dos blocos pendentes.

---

### §3.L.1 — Tabela Visão-Geral por Categoria

| Categoria       | Total | Detalhada em (distribuição)                                                                                         |
| :-------------- | ----: | :------------------------------------------------------------------------------------------------------------------ |
| **40 DO**       |    40 | §3.A (3) + §3.B (9) + §3.C (5) + §3.D (10) + §3.H (6) + §3.I (7) = 40                                               |
| **44 DON'T**    |    44 | §3.A (3) + §3.B (9) + §3.C (5) + §3.D (7) + §3.H (6) + §3.I (6) + blocos não-refreshed E/F/G/J/K (8 estimados) = 44 |
| **16 CONSIDER** |    16 | §3.A (1) + §3.B (4) + §3.C (2) + §3.D (2) + §3.H (2) + §3.I (3) + blocos não-refreshed (2 estimados) = 16           |
| **5 AVOID**     |     5 | Categoria nova introduzida no Bloco K — placeholder até CTR-SKILL-REFRESH-K ser executado                           |

> **Nota de contagem:** os totais das colunas "DON'T" e "CONSIDER" incluem estimativas dos blocos E/F/G/J/K ainda não-refreshed. Quando esses blocos forem escritos, a tabela deve ser atualizada.

---

### §3.L.2 — Glossário de Termos Canônicos

| Termo                                      | Definição canônica                                                                                                                                                                                                 | Seção  |
| :----------------------------------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :----- |
| **Wrapper-brand**                          | `Brand<Readonly<{ prop: T }>, 'Nome'>` — VO que carrega grandeza, unidade ou contexto evolutivo. Escolhido quando há potencial de extensão futura (campo extra, currency, etc.).                                   | §3.B.2 |
| **Primitivo-brand**                        | `Brand<string, 'Nome'>` — Identificador opaco e estruturalmente irredutível. Escolhido para IDs sem propriedade interna semanticamente relevante.                                                                  | §3.B.2 |
| **Tagged Error**                           | Estrutura `Readonly<{ tag: 'PascalCaseTag'; ...payload? }>` para erros com evidência navegável. Substitui string literal unions quando o caller precisa de contexto para reagir (mensagem PT, retry, telemetria).  | §3.D.1 |
| **Smart Constructor**                      | Função `from<Source>(raw): Result<T, E>` que valida, encapsula o único cast auditado `as Brand<T, K>` e retorna `Result`. É a borda do sistema de tipos — "parse, don't validate" (Wlaschin).                      | §3.B.4 |
| **Refinement Constructor**                 | Função `parse<State>(aggregate): Result<RefinedType, E>` que estreita um tipo de union para um subtipo refinado. Ex.: `parseActive(c: Contract): Result<ActiveContract, ContractNotActive>`. Nunca `assertActive`. | §3.D.2 |
| **Padrão D**                               | Module-as-namespace: exportar free functions e consumir com `import * as Money from './money.ts'`. Preferível ao namespace-objeto (`export const Money = { … }`) e à function-as-constructor (`Money(100)`).       | §3.B.3 |
| **Shared Kernel**                          | `src/shared/kernel/` — VOs genuinamente cross-BC (Evans). Só sobem para o kernel os VOs reusados por pelo menos 2 BCs distintos. Exemplos: `Money`, `Period`, `UserRef`.                                           | §3.H.4 |
| **Functional Core**                        | Camada `domain/` — 100% síncrona, pura, sem I/O. Retorna `Result<T, E>`. `Promise` nunca entra no domínio.                                                                                                         | §3.I.5 |
| **Imperative Shell**                       | Camada `application/use-cases/` — onde `async/await`, repositórios e `Promise` vivem. Orquestra o Functional Core.                                                                                                 | §3.I.5 |
| **VO como Prova** (Rota α)                 | Invariante atemporal e reusável codificada como subtipo de VO. Ex.: `NonZeroMoney = Money & { __nonZeroMoney: true }`. Compõe sem cast nos callers por widening automático.                                        | §3.D.3 |
| **Agregado como Guardião** (Rota β)        | Invariante contextual e mutável mantida dentro da função de domínio do agregado. Ex.: verificar se `currentValue - decrease >= 0` em `applyHomologatedAdjustment`.                                                 | §3.D.3 |
| **Caso de Uso como Orquestrador** (Rota γ) | Invariante específica do caso de uso: o use case refina VO na borda antes de chamar o domínio. Ex.: `createAmendment` chama `NonZeroMoney.from(money)` antes de `Amendment.create`.                                | §3.D.3 |

---

### §3.L.3 — Mapa de Cross-Refs entre §3.A–§3.I

| Seção | Depende de / Relaciona com | Natureza da relação                                                                                                                      |
| :---- | :------------------------- | :--------------------------------------------------------------------------------------------------------------------------------------- |
| §3.A  | §3.B, §3.D                 | §3.A usa cast auditado de §3.B (smart constructor); state machine de §3.D explica por que agregados não precisam de Brand próprio        |
| §3.B  | §3.A, §3.D                 | §3.B define o smart constructor que §3.A usa para mappers; §3.D usa smart constructors como entrada para Tagged Errors e State Machine   |
| §3.C  | §3.D                       | §3.C e §3.D cobrem o mesmo tema (aninhamento `status × kind`) de ângulos complementares: §3.C = idioma TS, §3.D = motivação de design    |
| §3.D  | §3.B, §3.C                 | §3.D reutiliza o Padrão D de §3.B para case constructors em `errors.ts`; §3.D.4 e §3.C.1 documentam o mesmo anti-padrão de cross-product |
| §3.H  | §3.C, §3.D                 | §3.H determina _onde_ os arquivos ficam; §3.C/§3.D determinam _o que_ cada arquivo contém                                                |
| §3.I  | §3.B                       | §3.I compõe os `Result` que os smart constructors de §3.B produzem; Padrão D de §3.B protege a composição de §3.I                        |

**Relações cross-seção de destaque:**

- `§3.B.4 ↔ §3.A.2` — cast auditado único no smart constructor (§3.B.4 define; §3.A.2 documenta a proibição fora do smart constructor).
- `§3.D.3 ↔ §3.I.5` — Rota α/β/γ de invariantes (§3.D) aplicam-se dentro do Functional Core; o Imperative Shell (§3.I) só orquestra.
- `§3.C.4 ↔ §3.D.2` — exhaustive switch sem `throw` (§3.C.4) e transições de state machine (§3.D.2) são faces complementares do mesmo contrato.
- `§3.H.4 ↔ §3.B.2` — Shared Kernel (§3.H.4) é onde Wrapper-brands genuinamente cross-BC (§3.B.2) vivem.

---

### §3.L.4 — Tickets Vivos Consolidados (20 tickets da série)

| Ticket                               | Bloco | Descrição                                                                                                         | Status   |
| :----------------------------------- | :---- | :---------------------------------------------------------------------------------------------------------------- | :------- |
| `CTR-VO-MONEY`                       | B     | VO Money — Wrapper-brand, smart constructor `fromCents`, `immutable()`                                            | Entregue |
| `CTR-VO-PERIOD`                      | B     | VO Period — `from(start, end)`, `contains`, `overlaps`, error union                                               | Entregue |
| `CTR-VO-IDS`                         | B     | VOs de ID — `ContractId`, `AmendmentId`, `DocumentId` — Primitivo-brand                                           | Entregue |
| `CTR-AGG-CONTRACT`                   | C/H   | Agregado Contract — 4 arquivos (`types`, `errors`, `events`, `contract.ts`); dupla taxonomia `ContractAdjustment` | Entregue |
| `CTR-AGG-AMENDMENT`                  | C/H   | Agregado Amendment — 3 estados refinados × 4 kinds aninhados                                                      | Entregue |
| `CTR-USECASE-CREATE-CONTRACT`        | I     | Use case `createContract` — Functional Core + Imperative Shell                                                    | Entregue |
| `CTR-USECASE-CREATE-AMENDMENT`       | I/D   | Use case `createAmendment` — Rota γ com `NonZeroMoney`                                                            | Entregue |
| `CTR-USECASE-HOMOLOGATE-AMENDMENT`   | C/I   | Use case `homologateAmendment` — `toContractAdjustment`, estratégia α/β                                           | Entregue |
| `CTR-STORAGE-PORT`                   | H     | Port `DocumentStorage` em `application/ports/`; tipos `BucketName`/`StorageKey`/`StorageRef`                      | Entregue |
| `CTR-SHARED-IMMUTABLE`               | B     | Facade `immutable()` / `deepImmutable()` em `shared/immutable.ts`                                                 | Entregue |
| `CTR-SHARED-BRAND-UNIQUE-SYMBOL`     | B     | `Brand<T, K>` + `BrandOf<T>` + `unique symbol` global em `shared/brand.ts`                                        | Entregue |
| `CTR-SHARED-VO-CANONICAL`            | B     | Template canônico aplicado em 6+ VOs (Padrão D, `from<Source>`)                                                   | Entregue |
| `CTR-DOMAIN-TAGGED-ERRORS`           | D     | Tagged Errors — shape flat, case constructors como free functions, payload de evidência                           | Entregue |
| `CTR-DOMAIN-STATE-MACHINE-CONTRACT`  | D     | State Machine Contract — `ActiveContract`/`ExpiredContract`/`TerminatedContract`                                  | Entregue |
| `CTR-DOMAIN-STATE-MACHINE-AMENDMENT` | D/C   | State Machine Amendment — 3 estados × 4 kinds, `PendingWithoutDocumentAmendment`                                  | Entregue |
| `CTR-DOMAIN-INVARIANT-CONTEXTUAL`    | D     | Invariante α + γ — `NonZeroMoney` em `domain/shared/` + `createAmendment`                                         | Entregue |
| `CTR-DOMAIN-MAPPER-RESULT`           | A     | Mappers de persistência via smart constructors retornando `Result`                                                | Aberto   |
| `CTR-DOMAIN-DEBRAND-AGG`             | A     | Remover Brand da casca dos agregados; transições com spread puro                                                  | Aberto   |
| `CTR-SHARED-RESULT-COMBINATORS`      | I     | `mapErr`, `combine` adicionados ao `shared/result.ts`                                                             | Entregue |
| `CTR-DOMAIN-COMPOSE-REFACTOR`        | I     | Refatoração de use cases para estratégias α/β/γ canônicas                                                         | Entregue |

---

### §3.L.5 — Blocos Não-Refreshed (Pendentes)

Os blocos abaixo **ainda não tiveram ticket CTR-SKILL-REFRESH-\* concluído**. As regras originais da entrevista existem em `handbook/interviews/0001-functional-ddd-domain-refresh.md` mas não foram sistematizadas nesta SKILL.md.

| Bloco                                 | Conteúdo previsto                                                                                                                                                             | Status                                                          | Ticket futuro                           |
| :------------------------------------ | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :-------------------------------------------------------------- | :-------------------------------------- |
| **E1** — Eventos de Domínio           | Shape canônico (`{ type: 'PascalCasePassado'; payload; occurredAt: Date }`), onde vivem (`events.ts`), quando publicar (após persist), diferença de evento interno vs externo | Pendente                                                        | CTR-SKILL-REFRESH-E1                    |
| **E2** — EventBus Port                | Port em `application/ports/event-bus.ts`, InMemory adapter para testes, padrão de subscrição, erro de publicação como `Result`                                                | Pendente                                                        | CTR-SKILL-REFRESH-E2                    |
| **E3** — Outbox Pattern (transversal) | Garantia de entrega (at-least-once), tabela `outbox` MySQL, idempotência no consumidor                                                                                        | Parcialmente documentado em `.claude/.planning/OUTBOX-MYSQL.md` | CTR-OUTBOX-MYSQL (planejamento pausado) |
| **F** — Use Cases: Query Side         | `getContract`, `listContracts` — pattern de query, projections, paginação, filtros como tipos                                                                                 | Pendente                                                        | CTR-SKILL-REFRESH-F                     |
| **G** — Clock Port                    | Port `Clock` em `application/ports/clock.ts`, `FakeClock` para testes de regras de data, usos canônicos                                                                       | Pendente                                                        | CTR-SKILL-REFRESH-G                     |
| **J** — CLI Adapters                  | Wiring CLI → use cases → InMemory vs MySQL, parseFlags, formatters PT-BR, tratamento de `Result` na saída                                                                     | Pendente                                                        | CTR-SKILL-REFRESH-J                     |
| **K** — AVOID (categoria nova)        | 5 entradas da categoria AVOID introduzida na entrevista — padrões que devem ser evitados mas não proibidos absolutamente                                                      | Pendente                                                        | CTR-SKILL-REFRESH-K                     |

> **Como usar esta tabela:** quando o orquestrador abrir um ticket que envolve evento, EventBus, Clock, query side ou CLI, as regras relevantes ainda não estão sistematizadas aqui. Consultar diretamente `handbook/interviews/0001-functional-ddd-domain-refresh.md` e o código vivo (`src/modules/contracts/`) como fonte provisória.

---

## Workflow

### Quando o orquestrador chama essa skill

1. **Ler** `handbook/domain/<modulo>/` integral do BC alvo.
2. **Ler** [`references/`](./references/) relevantes para os tipos avançados envolvidos.
3. **Confirmar** com o usuário se há ambiguidade no handbook.
4. **W0 ou W1?** — se W0, escrever testes que falham. Se W1, implementar.
5. **Implementar inside-out** (VO → types → eventos → funções → port).
6. **Validar** com `tsc --noEmit` no escopo modificado.
7. **Escrever** `<ticket>/003-impl/REPORT.md` (W1) ou `<ticket>/002-tests/REPORT.md` (W0).
8. **Devolver** ao orquestrador.

### Checklist de auto-revisão antes de fechar REPORT

- [ ] Zero `throw` em arquivos do `domain/`.
- [ ] Zero `class`, `extends`, `this`.
- [ ] Zero `any`. Casts `as X` apenas em branded type narrowing (após validação no smart constructor).
- [ ] Todo array é `readonly T[]`. Toda entity tem `Readonly<>`.
- [ ] Toda função exportada tem return type explícito.
- [ ] Toda discriminated union tem `default` com `never`.
- [ ] Todo erro é string literal, não classe.
- [ ] Imports usam `.ts` final + `import type` para tipos puros.
- [ ] Identificadores em **EN** (`Contract`, `Amendment`, `terminate`, `homologate`). Strings literais ao usuário humano em PT via dicionário no `format.ts`.
- [ ] Erros são tagged records, não string literals (`{ tag: 'X', ...payload? }`).
- [ ] Cada estado do agregado é um tipo refinado distinto — sem `T | null` codificando estado.
- [ ] Transições têm assinatura refinada (`expire(c: ActiveContract): …`).

---

## Anti-patterns específicos do domínio

| Anti-pattern                                | Por que é proibido                                   | Correção                                                                           |
| :------------------------------------------ | :--------------------------------------------------- | :--------------------------------------------------------------------------------- | ---------------- | ------------------------------------------------------ |
| `class Contrato { constructor(...) }`       | Quebra regra raiz; vira "this" + mutação implícita   | `type Contrato = Readonly<{...}>` + função `criar`/`encerrar`                      |
| `throw` + `new Error('contrato encerrado')` | Erro como exceção opaca                              | `return err('contrato-encerrado')`                                                 |
| `if (status === 'X'                         |                                                      | status === 'Y') ...` em mais de um lugar                                           | Lógica duplicada | Extrair função `podeReceberAditivo(contrato): boolean` |
| `valor: number` (em centavos) "implícito"   | Ambiguidade unidades                                 | Branded `Moeda` com `centavos` documentado                                         |
| `aditivos.push(novo)`                       | Mutação                                              | `aditivos: [...contrato.aditivos, novo]`                                           |
| `as Aditivo` sem validar                    | Branded narrowing perigoso                           | Sempre via smart constructor que valida                                            |
| `valorImpacto?: number` em `Acrescimo`      | Optional onde regra de negócio exige                 | Discriminated union: `Acrescimo` exige `valorImpacto`; `Variado` exige `descricao` |
| `assertPending(a): Amendment`               | Assert devolve tipo cru fere refinement (DON'T D§19) | `parsePending(a): Result<PendingAmendment, AmendmentNotPending>`                   |
| 3 status × 4 kinds = 12 tipos               | Cross-product duplica máquina de estado (DON'T C§26) | Aninhamento: union por status, kind como mixin em `AmendmentCore`                  |

---

## Como esta skill se relaciona com outras

```
ts-domain-modeler          ◄── você está aqui (modela tipos puros)
   │
   ├─► ports-and-adapters  (decide ports/contratos com infra)
   │
   ├─► modular-monolith    (decide o que é compartilhado entre módulos)
   │
   └─► application-cli-builder
        (consome o domínio para expor via CLI à P.O.)
```

---

## Changelog

- **2026-05-14:** Criação. Adapta `flutter-expert` (ACDG/frontend) para o contexto TS puro + DDD do ERP Bem Comum.
- **2026-05-20:** §3.D criada (Tagged Errors + State Machine + Invariantes Contextuais + Aninhamento). Checklist de auto-revisão +3 itens (tagged records, tipo refinado distinto, assinatura refinada). Anti-patterns +2 linhas (assertPending, 3 status × 4 kinds).
- **2026-05-20:** §3.C criada (Discriminated Unions & Exhaustive Switch); fix do exhaustive default na seção "Obrigações" (issue pré-existente identificada em SKILL-REFRESH-D W2).
- **2026-05-21:** §3.B criada (Smart Constructor Canônico — 9+9+4); template "Money" da seção "Templates rápidos" atualizado Padrão A → Padrão D.
- **2026-05-21:** §3.I criada (Composição Funcional com Result — 7+6+3); 3 estratégias α/β/γ (early return, combine, combine+mapErr), Functional Core / Imperative Shell, tabela de DON'T com 6 libs/padrões banidos. Cross-ref §3.B (smart constructor como entrada para composição).
- **2026-05-21:** §3.H criada (Organização de Módulo & Árvore Canônica — 6+6+2); granularidade 4-6 arquivos por agregado, Critério H2 (Repository domain vs application), Shared Kernel vs BC-specific, public-api/ por módulo, árvore canônica ASCII estado-alvo pós-RESTRUCTURE com nota de pendência. Tickets vivos: CTR-AGG-CONTRACT, CTR-AGG-AMENDMENT, CTR-STORAGE-PORT, CTR-DOMAIN-RESTRUCTURE (pendente).
- **2026-05-21:** §3.A criada (Agregados Não-Brandados + updateAggregate — 3+3+1 após promoções §3.B); Brand apenas em VOs folha, `as unknown as` proibido em negócio (exceção auditada em §3.B), helper `updateContract/updateAmendment` genérico `<T extends Aggregate>`, mappers via smart constructors sem shotgun parsing, Zod na borda. Cross-refs §3.B (cast auditado) e §3.D (state machine). Tickets vivos: CTR-DOMAIN-DEBRAND-AGG, CTR-DOMAIN-MAPPER-RESULT.
- **2026-05-21:** §3.L criada (Síntese Canônica — índice consolidado — 5 sub-seções: tabela visão-geral 40 DO + 44 DON'T + 16 CONSIDER + 5 AVOID, glossário 12 termos canônicos, mapa de cross-refs §3.A–§3.I, 20 tickets vivos consolidados, 7 blocos não-refreshed E1/E2/E3/F/G/J/K com status). Último ticket da série CTR-SKILL-REFRESH (16º Opção B).
