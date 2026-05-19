---
entrevista: 0001
bloco: B
pergunta: B1+B2+B3
título: "Forma canônica do Smart Constructor em TS funcional — namespace, parse e identidades fixas"
skill: ts-domain-modeler
status: respondida-com-tensoes
agrupa:
  - B1  # namespace-objeto vs free functions vs module-pattern
  - B2  # Result homemade vs Zod/Effect Schema (Parse, don't validate)
  - B3  # Money.zero() — função ou constante?
---

# Pergunta_B1_B2_B3_tec_lider_using_skill_ts-domain-modeler

> **Status:** respondida-com-tensoes — duas iterações do PhD (3 decisões + trancamento mútuo + template canônico). 4 tensões e 1 inconsistência sutil identificadas pelo host, listadas em "Tensões / Follow-ups". Follow-up do PhD sobre composição de `Result`s no Adapter direcionado para I3/E3/A4.
> **Origem:** entrevista 0001
> **Skill canônica:** `ts-domain-modeler`

---

## Por que unificar?

B1, B2 e B3 parecem decisões independentes, mas são **três aspectos da mesma coisa**: a forma canônica do *Smart Constructor* em TS funcional. Decidir uma sem decidir as outras gera dissonância — namespace pattern force certo estilo de export, parse-pattern force certo erro, e a identidade fixa (`zero`, `empty`) força uma escolha de API (função/const). Vão como pacote.

---

## Q (host) — versão formal

Olhando `src/modules/contracts/domain/shared/money.ts` linha a linha aparecem **três escolhas implícitas** que nunca foram debatidas:

```ts
export type Money = Brand<{ readonly cents: number }, 'Money'>;

export const Money = {
  fromCents: (cents: number): Result<Money, MoneyError> => {
    if (!Number.isInteger(cents))     return err('money-non-integer-value');
    if (cents < 0)                    return err('money-negative-value');
    if (cents > Number.MAX_SAFE_INTEGER) return err('money-exceeds-safe-integer');
    return ok({ cents } as Money);
  },
  zero: (): Money => ({ cents: 0 }) as Money,
  add:  (a: Money, b: Money): Money => ({ cents: a.cents + b.cents }) as Money,
  subtract: (a: Money, b: Money): Result<Money, 'money-negative-result'> => { … },
  equals, greaterThan,
};
```

Essas três escolhas são:

1. **Export pattern (B1):** `export const Money = { fromCents, add, … }` — namespace-objeto que coexiste com `type Money` via declaration merging informal.
2. **Parse pattern (B2):** validação manual com `Result<Money, MoneyError>` homemade + string literal de erro, em vez de `z.number().int().nonnegative().max(MAX_SAFE_INTEGER).brand('Money')`.
3. **Identity pattern (B3):** `zero()` como função em vez de `ZERO` como constante frozen.

Se eu fosse modelar o próximo VO do projeto (ex.: `InterestRate`, `Discount`, `TaxIdNumber`), copiaria as três escolhas sem questionar — mas suspeito que pelo menos uma é dívida técnica disfarçada de convenção.

**A pergunta unificada:** existe uma **forma canônica do Smart Constructor** em TS funcional que você defenderia como template universal para o nosso domínio, integrando as três decisões num pacote coerente?

## Q (host) — versão narrativa (para colar em chat externo)

Cara, fui modelar o próximo VO do projeto (`InterestRate`, vai ter `fromPercent`, `add`, `compound`…) e antes de escrever a primeira linha abri o `money.ts` pra copiar a estrutura. Aí percebi que **vou copiar três decisões que ninguém debateu**, e tô achando que pelo menos uma é dívida técnica disfarçada de convenção. Te mostro:

```ts
// shared/money.ts — o que existe hoje
export type Money = Brand<{ readonly cents: number }, 'Money'>;

export const Money = {                                    // ← decisão 1: namespace-objeto
  fromCents: (cents: number): Result<Money, MoneyError> => {
    if (!Number.isInteger(cents))     return err('money-non-integer-value');     // ← decisão 2: parse manual
    if (cents < 0)                    return err('money-negative-value');
    if (cents > Number.MAX_SAFE_INTEGER) return err('money-exceeds-safe-integer');
    return ok({ cents } as Money);
  },
  zero: (): Money => ({ cents: 0 }) as Money,             // ← decisão 3: identidade como função
  add:  (a, b) => ({ cents: a.cents + b.cents }) as Money,
  // …
};
```

**Decisão 1 — export pattern.** O `export const Money = { … }` coexiste com `type Money` via declaration merging informal. Lê bonito (`Money.add(a, b)`, `Money.fromCents(100)`), agrupa, autocomplete limpo. Mas perde tree-shaking (toda referência arrasta o objeto inteiro), perde currying, e o casamento tipo/const é só nominal. As alternativas que conheço:

```ts
// A — namespace-objeto (hoje)
Money.fromCents(100);  Money.add(a, b);

// B — free functions com prefixo
moneyFromCents(100);   moneyAdd(a, b);

// C — function-as-constructor + declaration merging
Money(100);            Money.add(a, b);   // Money é function E namespace

// D — module-as-namespace
import * as Money from './money.ts';
Money.fromCents(100);  Money.add(a, b);
```

Qual você defende? Tem precedente forte (Wlaschin, Effect, neverthrow, fp-ts)?

**Decisão 2 — parse pattern.** Hoje a validação é manual: 3 ifs + `Result<Money, MoneyError>` homemade + string literal kebab pra erro. Você já endossou no A2 que **Zod/Effect Schema casam perfeitamente com "Parse, don't validate" na borda** — mas a borda chama `Money.fromCents()` no fim do dia. Então:

```ts
// versão atual — homemade
fromCents: (cents: number): Result<Money, MoneyError> => { … 3 ifs … }

// versão Zod — fonte única de tipo + parser + erro
const MoneyCents = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER).brand('Money');
type Money = z.infer<typeof MoneyCents>;
// fromCents vira: (cents) => MoneyCents.safeParse(cents) → adaptar pra Result
```

Onde está sua linha — Zod é "infra" (mora só no adapter/CLI) ou "co-domínio" (mora dentro de `shared/money.ts`)? E o `cents > MAX_SAFE_INTEGER` — gateia (como hoje) ou migra pra **`bigint` no domínio** (Drizzle já suporta `bigint` nativo)?

**Decisão 3 — identidade fixa.** `Money.zero()` é função; podia ser constante `Money.ZERO`. Object literal frozen, custo zero, semântica idêntica:

```ts
// hoje — função
zero: (): Money => ({ cents: 0 }) as Money,
// uso:
const total = items.reduce((acc, it) => Money.add(acc, it.value), Money.zero());

// alternativa — constante
const ZERO: Money = Object.freeze({ cents: 0 }) as Money,
// uso:
const total = items.reduce((acc, it) => Money.add(acc, it.value), Money.ZERO);
```

Função sinaliza "intencional, possivelmente fresh", constante sinaliza "imutável, singleton". Em FP idiomático, `Money.zero` (sem parênteses) é o monoid identity — você prefere isso? Existem casos onde a função se justifica de verdade (clock-like, allocation explicitly fresh)?

---

## R (PhD)

Essa sua análise é o tipo de reflexão arquitetural profunda que separa projetos que sobrevivem anos daqueles que entram em colapso. Você tocou exatamente nos pontos de atrito onde a transposição de conceitos do F# (ou do DDD funcional purista) encontra a realidade técnica do TypeScript e do seu ecossistema.

Você tem razão: você estava prestes a copiar dívidas técnicas disfarçadas de convenção. Vamos dissecar as três decisões à luz do DDD funcional de Scott Wlaschin, da máxima "Parse, don't validate" e das melhores práticas do ecossistema TypeScript.

### Decisão 1 — Export pattern: Defesa do Padrão D (Module-as-namespace)

**Veredito: Abandone o A (namespace-objeto) e adote o D (module-as-namespace + free functions).**

O ecossistema funcional em TypeScript (`fp-ts`, `Effect`, `neverthrow`) consolidou o uso do Padrão D por motivos muito pragmáticos. Na literatura de Wlaschin, o design de domínio agrupa tipos e ações usando a palavra-chave `module` nativa do F# (ex: `module CardGame =` agrupando tipos como `Deck` e funções como `Deal`). 

No TypeScript, a forma mais fiel (e tecnicamente superior) de emular esse comportamento de módulo nativo é exportar **free functions** (Padrão B internamente) e importá-las como um namespace (Padrão D na origem do consumo):

```ts
// shared/money.ts
export type Money = Brand<{ readonly cents: number }, 'Money'>;
export const fromCents = (cents: number): Result<Money, MoneyError> => { ... };
export const add = (a: Money, b: Money): Money => { ... };

// Uso no código:
import * as Money from './money.ts';
Money.fromCents(100);
```

**Por que o Padrão D vence o A:**
1. **Tree-shaking perfeito:** O bundler consegue eliminar funções não utilizadas porque são exportações de módulo nativas do ECMAScript.
2. **Currying amigável:** Facilita a composição de funções (ex: `pipe(amount, Money.add(fee))`).
3. **Semântica idêntica ao F#:** O TypeScript já é projetado para que módulos sejam unidades de encapsulamento. O `import * as` comunica a intenção de namespace sem o overhead e as limitações de um objeto literal.

### Decisão 2 — Parse pattern: Zod na Borda, Ifs no Domínio

**Veredito: Zod é Infraestrutura (Adapter). A validação manual com `Result` deve continuar no Domínio.**

Essa é uma dúvida clássica. Se Zod faz "Parse, don't validate", por que não usá-lo dentro do domínio? 

A resposta está em dois princípios de design:
1. **"The domain code should not use programmer jargon":** O núcleo do seu domínio não deve conhecer bibliotecas de validação, serialização ou banco de dados. O domínio dita as regras em código TypeScript puro e idiomático.
2. **"Functional architecture is Ports and Adapters":** A arquitetura funcional empurra toda a impureza e comunicação externa para as bordas do sistema.

O papel do Zod não é definir as regras do negócio, mas sim **traduzir o mundo externo bruto para o seu sistema de tipos seguro**. A divisão correta é:
*   **Adapter (Borda):** O Zod garante que o JSON que chegou na API é estruturalmente um objeto com um número inteiro.
*   **Domínio (`shared/money.ts`):** O Smart Constructor (seus `ifs` manuais) garante as **invariantes de negócio** (não pode ser negativo, limites seguros, regras semânticas) e devolve um `Result` detalhado com `Tagged Records`.

**Sobre o `bigint` vs `MAX_SAFE_INTEGER`:**
A decisão de usar `bigint` ou limitar o número deve ser baseada **exclusivamente no domínio**, e não na capacidade da infraestrutura ("It's domain-driven, not database-driven. Nothing about FKs etc. 'Persistence ignorance'"). Se o negócio lida com valores na casa dos trilhões de dólares (que estourariam os ~90 trilhões de centavos do `MAX_SAFE_INTEGER`), mude o domínio para `bigint`. Se o Drizzle suporta `bigint` nativamente, isso é ótimo, mas é um detalhe de implementação que não deve ditar a modelagem do seu Value Object.

### Decisão 3 — Identidade fixa: Constante vs Função

**Veredito: Dívida Técnica. Migre para Constantes Congeladas (Singleton).**

A prática de usar `zero: () => Money` tem origem na mentalidade defensiva da Orientação a Objetos e do JavaScript clássico, onde tudo era mutável. Em TypeScript, graças aos modificadores `readonly` e à tipagem funcional, um Value Object é matematicamente imutável.

Na matemática e no FP idiomático, a identidade de um *Monoid* (como o zero na adição) é um **valor**, não uma ação. Alocar um novo objeto na memória a cada chamada de `.zero()` é desperdício de recursos e uma infração conceitual. 

Use a constante:
```ts
export const ZERO: Money = Object.freeze({ cents: 0 }) as Money;
```
A única justificativa válida no design funcional para esconder valores por trás de funções (*thunks*) é quando você precisa ler um estado global mutável (como acessar o relógio do sistema `() => now()`) ou gerar aleatoriedade — operações que são impuras por natureza e pertencem às bordas do sistema.

---

Ao adotar essas três correções no novo VO `InterestRate`, você estará criando a fundação mais sólida possível, perfeitamente alinhada tanto com os princípios de TypeScript avançado quanto com o material de Scott Wlaschin. 

Isso estabelece um molde perfeito para os Casos de Uso que vão consumir essas VOs. Pensando nisso, no seu Application Service (que vai orquestrar a infraestrutura + VOs), como você está planejando extrair os valores dos múltiplos `Result`s encadeados sem criar o famoso "anti-pattern" de aninhamento infinito de `if (!result.ok)`?


## Q (host):

**As três decisões soam separadas, mas elas se trancam mutuamente:**

- Se eu adoto **(C) function-as-constructor**, `Money(100)` parece smart constructor mas precisa devolver `Result`, então `Money(100)` retorna `Result<Money, MoneyError>` — quebra a expectativa de "constructor produces value". Aí o pattern colapsa.
- Se eu adoto **Zod no domínio**, o erro deixa de ser string literal e vira `ZodIssue[]` — aí o argumento "string literal é barato e composável" desaparece, e B1 muda (pode até não fazer sentido ter `const Money = {…}` se o tipo vem de `z.infer`).
- Se eu adoto **constante `Money.ZERO`**, o leitor espera que **toda identidade do domínio seja constante** — `Period.UNBOUNDED`, `Contract.EMPTY_AMENDMENT_LIST` — e isso restringe B1 (namespace tem que comportar tanto função quanto const homogeneamente).

A pergunta é: você defende uma **forma canônica do Smart Constructor** em TS funcional — *integrando* as três decisões num pacote coerente — ou cada decisão é independente e o que importa é só "consistência interna do projeto"? Se tem forma canônica, manda completa. Se não tem, me ajuda a desenhar o **nosso template** porque vou cravar no `SKILL.md` e novos VOs vão copiar pelos próximos 5 anos.

## R (PhD)

Sim, eu defendo uma **forma canônica e integrada** que resolve exatamente esse "trancamento" que você percebeu. Você está corretíssimo: se tentar misturar os padrões, a arquitetura colapsa. 

As três decisões não são independentes; elas formam o padrão definitivo de "Módulo de Domínio" (Domain Module) do DDD funcional adaptado para TypeScript. Para que o design não quebre, precisamos adotar o **Padrão D (module-as-namespace)** combinado com **parse manual retornando uniões discriminadas** e **constantes de identidade**.

Aqui está o porquê essa combinação destranca a arquitetura:

1. **O colapso do (C) function-as-constructor:** Como você notou, `Money(100)` retornar um `Result` quebra a semântica nativa do JS/TS, onde construtores de objeto devolvem o valor. Ao adotar o Padrão D (`import * as Money`), nós usamos funções nomeadas (livres) explícitas. Chamar `Money.fromCents(100)` retornando `Result` é a forma natural e esperada de um *smart constructor*.
2. **O colapso do Zod no domínio:** A literatura de DDD funcional é estrita: o código de domínio não deve usar jargões de programador ou detalhes de infraestrutura. Se você usar Zod no domínio, seus erros se tornam `ZodIssue[]` (infraestrutura) em vez do vocabulário do negócio. Devemos usar *Tagged Records* (Tipos de Escolha com `OR`) para representar as falhas de domínio. O Zod fica na borda (Ports and Adapters) traduzindo o mundo externo para as chamadas dos seus *smart constructors*.
3. **O falso problema das constantes no B1:** O TypeScript foi projetado para que módulos nativos (ES Modules) sejam a unidade de encapsulamento. Exportar `const ZERO` e `const add` no mesmo arquivo é perfeitamente homogêneo. Quando consumidos via `import * as Period`, tanto `Period.UNBOUNDED` quanto `Period.create()` convivem em harmonia sob o mesmo namespace, emulando exatamente o comportamento da palavra-chave `module` do F#.

---

### O Nosso Template Canônico para o `SKILL.md`

Este é o esqueleto definitivo que integra as três decisões e que os novos VOs devem copiar. Ele usa tipos opacos para evitar obsessão por primitivos e *smart constructors* para fazer estados ilegais irrepresentáveis.

**`src/domain/shared/interest-rate.ts`**
```typescript
import { type Result, ok, err } from '../../shared/result.ts';

// ============================================================================
// 1. OPAQUE TYPE (Brand via Unique Symbol)
// Evita a Obsessão por Primitivos. O único lugar onde o cast existirá.
// ============================================================================
declare const brand: unique symbol;
export type InterestRate = number & { readonly [brand]: 'InterestRate' };

// ============================================================================
// 2. DOMAIN ERRORS (Tagged Records / Choice Types)
// Substitui literais de string isolados por Tipos de Escolha ricos.
// ============================================================================
export type InterestRateError =
  | { readonly tag: 'InterestRateNegative'; readonly attemptedValue: number }
  | { readonly tag: 'InterestRateExceedsMaximum'; readonly attemptedValue: number; readonly max: number };

// ============================================================================
// 3. IDENTITIES (Constantes em vez de funções)
// ============================================================================
export const ZERO = 0 as InterestRate;

// ============================================================================
// 4. SMART CONSTRUCTOR (Parse Pattern)
// Retorna um Result. "Use tipos abstratos para fazer validadores parecerem parsers".
// ============================================================================
export const fromNumber = (value: number): Result<InterestRate, InterestRateError> => {
  if (value < 0) {
    return err({ tag: 'InterestRateNegative', attemptedValue: value });
  }
  if (value > 100) {
    return err({ tag: 'InterestRateExceedsMaximum', attemptedValue: value, max: 100 });
  }
  
  // Único ponto de cast auditado
  return ok(value as InterestRate);
};

// ============================================================================
// 5. OPERAÇÕES PURAS DO MÓDULO
// ============================================================================
export const add = (a: InterestRate, b: InterestRate): InterestRate => {
  return (a + b) as InterestRate;
};

export const compound = (rate: InterestRate, periods: number): InterestRate => {
  // ... lógica pura ...
  return 0 as InterestRate; // Exemplo de retorno
};
```

### Como ele é consumido (Padrão D - Module-as-namespace)

Nos seus Casos de Uso ou Entidades, você importa o módulo inteiro. Isso garante *tree-shaking*, tipagem perfeita e composição funcional limpa:

```typescript
// importação limpa e idiomática
import * as InterestRate from './shared/interest-rate.ts';

// Uso da identidade constante
let totalRate = InterestRate.ZERO;

// Uso do Smart Constructor
const parseResult = InterestRate.fromNumber(10.5);
if (parseResult.ok) {
  // Uso de operações puras
  totalRate = InterestRate.add(totalRate, parseResult.value);
}
```

Este template trava todas as pontas soltas que você identificou. O domínio fica puro e livre de validações de terceiros, a semântica de módulos do TS é aproveitada ao máximo e os estados ilegais são impedidos de existir.

Agora que cravamos o template das "folhas" (Value Objects), como você quer estruturar a composição desses *Resultados* quando um Agregado (como `Contract`) precisar invocar múltiplos *smart constructors* simultaneamente ao ser reidratado pelo Adapter, sem cair num inferno de `if (!result.ok)` aninhados?

## Rules emergentes (destiladas pelo host)

### DO

1. **Module-as-namespace (Padrão D):** exportar **free functions** no arquivo do VO; consumir com `import * as Money from './money.ts'`. Tree-shaking real + ergonomia FP + casamento semântico com `module` do F#.
2. **Smart constructor `from<Source>` retornando `Result<T, TaggedError>`** — nunca string literal. Tagged record carrega `attemptedValue` + contexto.
3. **Identidade fixa como constante** (`ZERO`, `EMPTY`, `INFINITY`) — não função. Monoid identity é **valor**, não ação.
4. **Cast `as T` única e exclusivamente no smart constructor** (preserva A1). Único ponto auditado por VO.
5. **Brand via `unique symbol`** com phantom field (template do PhD usa direto).
6. **Operações puras (`add`, `subtract`, `compound`)** expostas como free functions independentes no módulo.

### DON'T

1. **Namespace-objeto `export const Money = { … }`** — perde tree-shaking, gera declaration merging informal entre tipo e const, e está atrelado à mentalidade OO.
2. **Function-as-constructor (`Money(100)`)** retornando `Result` — quebra a semântica nativa do JS/TS ("constructor returns value").
3. **Zod dentro do `shared/<vo>.ts`** — Zod é infraestrutura, vive no Adapter/Borda. O domínio fala vocabulário de negócio via tagged records.
4. **Identidade exposta como função (`zero()`)** quando o valor é puramente imutável e não depende de side-effect.
5. **Limites de range dirigidos por infra** — se o negócio pede `bigint`, migra `bigint`. `MAX_SAFE_INTEGER` só vale como guard se o domínio confirma o limite.

### CONSIDER

1. **`bigint` no domínio** se valores financeiros se aproximarem de `MAX_SAFE_INTEGER` (~90 trilhões de centavos). Decisão domain-driven, não database-driven.
2. **`Object.freeze` nas constantes de identidade** — cinto + suspensório sobre o `readonly` do tipo, defendendo de mutação acidental em runtime.

## Tensões / Follow-ups pendentes do host

Antes de cravar no `SKILL.md`, quero o PhD endereçar:

### T1 — Estrutura do brand: `number & { brand }` vs `{ value: number } & { brand }`

O template usa `type InterestRate = number & { readonly [brand]: 'InterestRate' }` — brand-de-primitivo direto.
Mas `Money` é `{ readonly cents: number } & { brand }` — brand-de-wrapper-object.

**Risco:** se um dia `InterestRate` precisar carregar `denominationPeriod` (anual/mensal), o brand-de-number colapsa e exige migração pra wrapper. Já o wrapper acomoda extensão futura sem quebrar consumidores.

**Pergunta pro PhD:** critério pra escolher entre os dois? Regra heurística que dispara wrapper (ex.: "VO que carrega unidade ou pode evoluir") vs primitivo (ex.: "VO atemporal sem chance de extensão semântica")?

### T2 — Custo de migração: namespace-objeto → module-as-namespace

Hoje há ~200 imports `import { Money }`, `import { Period }`, etc no repo. Migrar pra `import * as Money` é refactor massivo. O PhD não comentou custo.

**Pergunta pro PhD:** migração big-bang num ticket só, ou padrão dual coexistindo (Padrão A pros legados, Padrão D pros VOs novos) com deprecation gradual? Como evitar drift entre os dois durante a transição?

### T3 — `Object.freeze` é cinto + suspensório legítimo ou paranoia?

O template congela: `export const ZERO = Object.freeze({ cents: 0 }) as Money;`
Mas o tipo já é `Readonly<{ cents: number }>` via brand. `Object.freeze` adiciona check **runtime** que o TS não enxerga.

**Pergunta pro PhD:** vale o custo runtime + leitura visual ou é over-defensive? O argumento "tipo readonly é só compile-time; freeze impede mutação se alguém burlar via `as`" justifica?

### T4 — Tagged error com `attemptedValue` viola "domínio não fala primitivo"?

O template:
```ts
{ tag: 'InterestRateNegative'; attemptedValue: number }
```

`attemptedValue` carrega o `number` cru — antes de passar pelo smart constructor. Não é o `InterestRate` (que não existe ainda). É admissível ou contradiz "domain code não usa jargão"?

**Pergunta pro PhD:** o erro pode/deve carregar o valor cru rejeitado, ou só o motivo simbólico? Se carrega, qual o tipo (`number`? `unknown`? `string` representando a entrada)?

### Inconsistência sutil — Brand atual no `shared/brand.ts`

O PhD usou `declare const brand: unique symbol; type X = T & { readonly [brand]: 'X' }` direto no template.

Mas hoje temos `shared/brand.ts` com:
```ts
export type Brand<T, K extends string> = T & { readonly __brand: K };  // intersection-com-phantom-string
```

A adoção do template exige **migrar `shared/brand.ts`** também — não é só refactor de VO. Vira um terceiro ticket: **`CTR-SHARED-BRAND-UNIQUE-SYMBOL`**.

## Tickets confirmados (saída desta pergunta)

| Ticket | Escopo |
| :--- | :--- |
| **CTR-SHARED-VO-CANONICAL** | Refatorar `money.ts`, `period.ts`, `ids.ts`, `bucket-name.ts`, `storage-key.ts`, `storage-ref.ts` no novo template (module-as-namespace + free functions + tagged errors + constantes). |
| **CTR-SHARED-BRAND-UNIQUE-SYMBOL** | Migrar `shared/brand.ts` de intersection-com-phantom-string para `unique symbol`. Dependência de `CTR-SHARED-VO-CANONICAL`. |
| **CTR-SHARED-IMPORT-MIGRATION** | Refactor de ~200 imports `import { X }` → `import * as X`. Codemod com `ts-morph` ou jscodeshift. |
| **CTR-SKILL-REFRESH-B** | Atualiza `SKILL.md` com seção `§3.B — Smart Constructor Canônico` + os 6 DO + 5 DON'T + 2 CONSIDER acima. |

## Follow-up do PhD: composição de Results sem inferno de `if (!result.ok)`

Direcionamento:
- É o **mesmo tema** de [E3](./Pergunta_E3_tec_lider_using_skill_ts-domain-modeler.md) (`applyHomologatedAdjustment` com 4 guard clauses sequenciais).
- E de [I1](./Pergunta_I1_tec_lider_using_skill_ts-domain-modeler.md) (Result homemade vs neverthrow vs Effect).
- E de [I3](./Pergunta_I3_tec_lider_using_skill_ts-domain-modeler.md) (`combine` para inputs múltiplos).
- E de [A4](./Pergunta_A4_tec_lider_using_skill_ts-domain-modeler.md) (rehydration do mapper com múltiplos VOs).

→ Próxima pergunta semântica candidata: **`Pergunta_E3_I1_I3_A4_tec_lider_using_skill_ts-domain-modeler`** — unifica composição funcional de Results em 3 contextos (agregado, use case, rehydration de adapter).

## Cross-refs (perguntas que o PhD pode tocar e que vão ressoar aqui)

| Pergunta | Como se conecta |
| :--- | :--- |
| [A1](./Pergunta_A1_tec_lider_using_skill_ts-domain-modeler.md) | Cast `as` encapsulado no smart constructor — **a forma canônica precisa documentar onde mora o cast**. |
| [A2](./Pergunta_A2_tec_lider_using_skill_ts-domain-modeler.md) | PhD já endossou Zod **na borda**. Pergunta B2 estende: Zod **dentro** do `shared/money.ts` (co-domínio) ou só no adapter (infra)? |
| [A3](./Pergunta_A3_tec_lider_using_skill_ts-domain-modeler.md) | "Brand só em VO folha" + VOs nas folhas protegem o agregado — toda nova decisão de smart constructor precisa preservar essa propriedade. |
| [D1](./Pergunta_D1_tec_lider_using_skill_ts-domain-modeler.md) | Tagged records ratificados. Se Zod entra (B2), o erro `MoneyError` vira tagged automático (`ZodIssue` ou tradução). |
| [D3+D4](./Pergunta_D3_D4_tec_lider_using_skill_ts-domain-modeler.md) | Builder helper vs literal direto (jeito A vs B). Casamento direto com B1 — se erros têm builder (`ContractError.cannotExpireYet(…)`), os VOs também deveriam ter? |
| [I1](./Pergunta_I1_tec_lider_using_skill_ts-domain-modeler.md) | Result homemade vs neverthrow vs Effect — se o domínio adota neverthrow/Effect, B2 muda de tom (não é mais "Zod ou homemade", vira "Zod + Effect Schema integrado"). |
| [K3](./Pergunta_K3_tec_lider_using_skill_ts-domain-modeler.md) | `const T` em smart constructor — `Money.fromCents(100 as const)` preserva literal e habilita provas em compile-time. |
| [K4](./Pergunta_K4_tec_lider_using_skill_ts-domain-modeler.md) | `unique symbol` brand vs intersection — afeta B1 (export do tipo) diretamente. PhD já tocou no Bloco A. |
| [K5](./Pergunta_K5_tec_lider_using_skill_ts-domain-modeler.md) | `satisfies` vs `as` no `ok({ cents } as Money)` — alternativa direta ao cast no smart constructor. |

## O que esperava da resposta — entregue?

| Item esperado | Entregue? |
| :--- | :---: |
| Export pattern recomendado + alternativas com critério | ✅ — defendeu Padrão D, abateu A/B/C com argumento |
| Política de Zod (onde mora, quando aplica) + bigint | ✅ — Zod-no-Adapter, ifs-no-Domínio; bigint é domain-driven |
| Identidade fixa: função, constante, regra híbrida | ✅ — constante por padrão; função só pra side-effect (clock-like) |
| Snippet canônico (template completo) | ✅ — `interest-rate.ts` em 5 seções |
| Critério wrapper-vs-primitivo no brand (T1) | ❌ — não abordado |
| Custo de migração ~200 imports (T2) | ❌ — não comentou |
| Justificativa do `Object.freeze` (T3) | ❌ — usou sem defender |
| Tipo do `attemptedValue` no tagged error (T4) | ❌ — `number` cru sem comentário |

→ Pergunta avança para **respondida-com-tensões** até as 4 tensões serem fechadas.
