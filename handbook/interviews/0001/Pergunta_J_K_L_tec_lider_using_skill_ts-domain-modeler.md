---
entrevista: 0001
bloco: J + K + L (fechamento)
pergunta: J+K+L
título: "Refinamentos finais e síntese — imports, tipos avançados, classificação canônica"
skill: ts-domain-modeler
status: respondida-com-correcoes-do-host
agrupa:
  - J1   # imports relativos profundos vs subpath imports vs barrels
  - J2   # import type vs import { type X } — uniformizar?
  - K1   # HKT approximations — vale o complexity budget?
  - K2   # template literal types para forçar prefixação de erros
  - K3   # const type parameters (TS 5.0+) em smart constructors
  - K5   # satisfies em vez de as no shape literal antes do brand
  - L1   # top-5 cheiros do domínio atual, ordenado por gravidade
  - L2   # top-3 mudanças com maior leverage
  - L3   # classificação DO / CONSIDER / AVOID / DON'T canônica
notas:
  - K4 (unique symbol vs intersection) já foi resolvido em B1+B2+B3-followup
---

# Pergunta_J_K_L_tec_lider_using_skill_ts-domain-modeler

> **Status:** respondida-com-correcoes-do-host ✅ — última pergunta da entrevista 0001. PhD entregou vereditos sólidos em J (Opção C + uniformizar `import type`) e K1-K3-K5, top-5 cheiros refinados, top-3 com leverage justificado. **Mas** 4 problemas: (1) argumento dos transpilers fraco pro nosso setup Node 24 `--experimental-strip-types`; (2) K2 inverteu naming pra kebab quando D4 cravou PascalCase; (3) **tabela L3 entregue com 16 entradas quando pedi a síntese das 50+ decisões da entrevista**; (4) J1.b/J1.c/J2.b sem resposta. Host expandiu L3 pra versão completa. **Entrevista 0001 FECHADA** com tabela canônica completa.
> **Origem:** entrevista 0001
> **Skill canônica:** `ts-domain-modeler`

---

## ⚠️ Diretrizes do projeto (lembrete para a resposta)

Os 7 blocos fechados (A, B, C, D, G [pendente confirmação], H, I) cravaram decisões que esta pergunta de fechamento precisa **respeitar e resumir**:

### Decisões fixas do código

1. **ESM puro + NodeNext + `.ts`** em imports relativos.
2. **Padrão D (module-as-namespace)** — free functions, `import * as Money from './money.ts'`. Sem `export const Money = { … }`.
3. **Result homemade** — `shared/result.ts`, ~50 LOC, exporta `ok`, `err`, `mapErr`, `combine`, `isOk`, `isErr`. Zero deps.
4. **Tagged errors** — `errors.ts` por agregado com free functions de case constructor.
5. **State machine in types** — agregados como union refinada (`Amendment = PendingWithoutDocument | PendingWithDocument | Homologated`).
6. **Brand via `unique symbol` global** em `shared/brand.ts` — helper `Brand<T, K>` centralizado.
7. **`shared/immutable.ts`** — facade que esconde `Object.freeze` para constantes (`ZERO`, `EMPTY`).
8. **Mappers retornam `Result<Aggregate, RehydrationError>`** (Bloco A4).
9. **Domínio 100% sync**. Application Layer faz `await` (Imperative Shell, Mark Seemann).
10. **Dupla taxonomia mantida** — `Amendment` ≠ `ContractAdjustment`. `Amendment.toAdjustments(homologated): readonly ContractAdjustment[]`.
11. **Exhaustive switch sem `throw`** — omitir `default` (preferível) ou `default: { const _: never = x; return _; }`.
12. **Refinement via `parseActive`, `parsePendingWithDocument`** — alinhado com "Parse, don't validate".
13. **Wrapper-brand** para VOs com grandeza/unidade/contexto; **primitivo-brand** para IDs opacos.
14. **`Instant = Brand<number, 'Instant'>`** (Bloco G β) — sem `Date` cru no domínio.
15. **Layout canônico de pastas** (Bloco H) — `src/shared/kernel/` cross-BC, `src/modules/<bc>/domain/shared/` específico, ports genéricos em `application/ports/`, Repository em `domain/<aggregate>/repository.ts`.

### Decisões fixas do projeto

16. **Modular monolith** (ADR-0006).
17. **Zero `throw`, zero `class`, zero `this`, zero `any`**.
18. **Node 24 LTS + TS 6.0** (ADR-0009) — `--experimental-strip-types`. Sem transpiler externo.
19. **CLI primária** (UX da P.O.).
20. **Drizzle + mysql2 + MySQL único** (ADR-0020).

**Use estas 20 diretrizes como ÂNCORA da resposta.** A síntese final (L3) deve classificar **cada uma delas** + as decisões que sobrarão de J/K em DO / CONSIDER / AVOID / DON'T.

---

## Por que unificar J + K + L?

Estes 3 blocos são naturalmente **fechamento**:

| Bloco | Natureza |
| :---: | :--- |
| **J** | Refinamentos de ergonomia de módulo (imports, type imports) — decisões pequenas mas atravessam todo o repo. |
| **K** | Tipos avançados do TS que **não** estamos usando — decidir se valem o complexity budget. |
| **L** | **Síntese final** da entrevista inteira: top-5 cheiros, top-3 mudanças, classificação canônica completa. |

L só faz sentido **depois** de J e K — porque a classificação final precisa absorver o que sair daqui. E J + K são pequenos o suficiente pra resolver juntos.

---

## Q (host) — versão formal

### Eixo 1 (J) — Imports e ergonomia de módulo

#### J1 — Imports relativos profundos vs subpath imports vs barrels

**Hoje:**

```ts
// Em src/ — imports relativos profundos
import { type Result, ok, err } from '../../../../shared/result.ts';

// Em tests/ — subpath imports via package.json#imports
import { Money } from '#src/modules/contracts/domain/shared/money.ts';
```

**Tensão:** o Bloco H cravou Padrão D + layout com `src/shared/kernel/` + `src/modules/<bc>/...`. Imports atravessam camadas. Em `application/use-cases/homologate-amendment.ts`:

```ts
// Opção A — relativos
import * as Contract from '../../domain/contract/index.ts';
import * as Amendment from '../../domain/amendment/index.ts';
import { type Result } from '../../../../shared/result.ts';

// Opção B — subpath imports em todo lugar (não só tests/)
import * as Contract from '#contracts/domain/contract/index.ts';
import * as Amendment from '#contracts/domain/amendment/index.ts';
import { type Result } from '#shared/result.ts';

// Opção C — combinação: relativos curtos dentro do BC, subpath cross-BC
import * as Contract from '../../domain/contract/index.ts';     // relativo dentro do BC
import { type Money } from '#kernel/money.ts';                  // subpath para shared kernel
```

**Perguntas:**

- **J1.a** — Qual opção?
- **J1.b** — Se for B (subpath em todo lugar), como configurar `package.json#imports` pra cobrir `#contracts/*`, `#kernel/*`, `#shared/*`? Mantém `#src/*` legado de tests?
- **J1.c** — `index.ts` barrel — manter (1 por agregado) ou eliminar (Padrão D já dispensa)?

#### J2 — `import type` vs `import { type X }`

**Hoje misturamos:**

```ts
// Quando puro tipo:
import type { Result } from '...';

// Quando misto:
import { type Result, ok, err } from '...';
```

Com `verbatimModuleSyntax: true` no `tsconfig`, ambos compilam.

**Perguntas:**

- **J2.a** — Uniformizar para **sempre** `import type` quando puro, mesmo sabendo que `import { type X }` também funciona?
- **J2.b** — Há vantagem em `import { type X, valueY } from '...'` (1 linha) vs split em 2 (`import { valueY } ... ; import type { X } ...`)?

### Eixo 2 (K) — Tipos avançados do TS que não estamos usando

> Nota: K4 (`unique symbol` vs intersection) já foi resolvido em [`B1+B2+B3-followup`](./Pergunta_B1_B2_B3_followup_tec_lider_using_skill_ts-domain-modeler.md) — vence `unique symbol` global. Não revisita aqui.

#### K1 — Higher-Kinded approximations

Repetimos `Result<Foo, FooError>` em ~200 lugares. Existe pattern (`hkt-toolbelt`, ou type lambdas à mão) pra abstrair "operação que retorna Result com erro do agregado":

```ts
// Sem HKT (hoje):
type ContractOp<T> = (c: Contract) => Result<T, ContractError>;
type AmendmentOp<T> = (a: Amendment) => Result<T, AmendmentError>;

// Com HKT approximation:
type Op<Aggregate, T> = (a: Aggregate) => Result<T, ErrorOf<Aggregate>>;
type ErrorOf<A> = A extends Contract ? ContractError : A extends Amendment ? AmendmentError : never;
```

**Perguntas:**

- **K1.a** — Vale o complexity budget no nosso porte (1 BC hoje, 5+ futuros)? Considerar Bloco I que defendeu "sem jargão FP no domínio".
- **K1.b** — Onde compensaria — em utilitários (tipo `Result.pipe`) ou no próprio domínio?
- **K1.c** — Risco de "Gabriel-de-amanhã" não ler? (sua preocupação do Bloco B).

#### K2 — Template literal types para forçar prefixação de erros

Os erros migraram pra tagged records (Bloco D), mas o **tag string** continua livre:

```ts
// Hoje (após Bloco D):
type ContractError =
  | { readonly tag: 'ContractNotActive'; ... }
  | { readonly tag: 'ContractCannotExpireYet'; ... };

// Com template literal type — força prefixo automaticamente:
type ContractError =
  | { readonly tag: `Contract${'NotActive' | 'CannotExpireYet' | 'AmendmentAlreadyApplied'}`; ... };
```

**Perguntas:**

- **K2.a** — Útil ou over-engineering? Considerar que o naming já está em PascalCase adjetival e ESLint pode ter rule custom.
- **K2.b** — Risco em refactor (renomear `Contract` → `Contrato` ou agregar prefixo de subdomínio) — template literal vira frágil?

#### K3 — Const type parameters (TS 5.0+)

`Money.fromCents(100)` poderia, com `const T`, inferir `Money` com `cents: 100` literal preservado:

```ts
// Sem const T:
export const fromCents = <T extends number>(cents: T): Result<Money, MoneyError> => ...;
// Money perde a info de "100"

// Com const T:
export const fromCents = <const T extends number>(cents: T): Result<Money & { __literal: T }, MoneyError> => ...;
// Money preserva "100" em compile time — habilita provas
```

**Perguntas:**

- **K3.a** — Vale em algum lugar do domínio? Smart constructor + literal preservado seria fonte de **provas** em compile time (ex.: constantes de tarifa fixas, dias úteis fixos).
- **K3.b** — Onde aplicar concretamente? Algum caso real no Contracts (ex.: `SequentialNumber.fromFormat('001/2026' as const)`)?

#### K5 — `satisfies` em vez de `as` no smart constructor

No Bloco A travamos: cast `as` único e auditado no smart constructor. Hoje:

```ts
export const fromCents = (cents: number): Result<Money, MoneyError> => {
  // …validações…
  return ok({ cents } as Money);    // ← cast único
};
```

Com `satisfies`:

```ts
export const fromCents = (cents: number): Result<Money, MoneyError> => {
  // …validações…
  const shape = { cents } satisfies Omit<Money, '__brand'>;
  return ok(shape as Money);
};
```

**Pró:** `satisfies` força que o shape literal `{ cents }` casa exatamente com `Omit<Money, '__brand'>` — pega chave faltando antes do `as`.
**Contra:** mais código pra mesma garantia, principalmente porque o tipo `Money` é minimalista (1 campo).

**Perguntas:**

- **K5.a** — Vale adoção sistemática em todo smart constructor?
- **K5.b** — Vale só para VOs com >3 campos (onde excess property check tem ganho real)?
- **K5.c** — Como casa com o helper `updateAggregate(prev, patch)` do Bloco A1 que já dá excess property check via `Partial<Omit<…>>`?

### Eixo 3 (L) — Síntese final

#### L1 — Top-5 cheiros do domínio atual, ordenado por gravidade

Olhando todos os blocos fechados, qual seu top-5 de cheiros (já corrigidos pelos tickets, mas ordenados por **gravidade pré-correção**)?

**Chute do host:**
1. `as unknown as` em transição de estado (resolvido pelo Bloco A1).
2. Optional-as-state (`signedDocumentRef: DocumentId | null`) — resolvido em Bloco C1/C2.
3. Ports todos em `application/` — resolvido em Bloco H2.
4. `Date` cru no domínio com `isValidDate` espalhado — resolvido em Bloco G.
5. Namespace-objeto pattern `export const Money = {...}` — resolvido em Bloco B.

Concorda com a ordem? Refaria?

#### L2 — Top-3 mudanças com maior leverage

Se você pudesse executar **apenas 3 tickets** dos 17 em fila, quais teriam maior impacto na qualidade do código? Argumente o leverage.

#### L3 — Classificação canônica DO / CONSIDER / AVOID / DON'T

**O grande output:** pegar **todas as decisões** dos 7 blocos fechados (A, B, C, D, G, H, I) + decisões de J/K acima + as 20 diretrizes do projeto, e classificar **cada uma** em:

- **DO** — regra invariante. Violação = bug.
- **CONSIDER** — recomendação. Aplicar quando o contexto pede.
- **AVOID** — desencorajado. Tem espaço pra exceção justificada.
- **DON'T** — proibido. Violação = rejeição em code review.

A tabela final vira **a base de `SKILL.md §3.L — Síntese Canônica`** + a regra de auditoria de code review.

### Pergunta unificadora

A entrevista 0001 começou com 12 blocos pendentes. Após esta resposta, fica fechada **completa** (faltam apenas E1/E2 e F1/F2 — refinamentos pequenos que não bloqueiam refactor).

**Há ALGO** — princípio, decisão, cheiro, regra — **que faltou nesta entrevista** e que você gostaria de ter visto questionado? Se sim, mande como **adendo** depois da síntese L3 — vai virar uma `Pergunta_adendo_final` se merecer.

---

## Q (host) — versão narrativa (para colar em chat externo)

Cara, esta é a **última pergunta semântica** da entrevista 0001. Lembrete das 20 diretrizes que viraram lei do projeto (resumido — ver versão formal pra completo):

1. **Padrão D** (module-as-namespace, free functions).
2. **Result homemade** (~50 LOC, sem deps).
3. **Tagged errors** em `errors.ts` por agregado via free functions.
4. **State machine in types** — `Amendment = PendingWithoutDocument | PendingWithDocument | Homologated`.
5. **Brand via `unique symbol` global**.
6. **`shared/immutable.ts`** facade.
7. **Mappers retornam `Result<Aggregate, RehydrationError>`**.
8. **Domínio 100% sync**, Application Layer faz `await`.
9. **Dupla taxonomia** Amendment ≠ ContractAdjustment.
10. **Exhaustive switch sem `throw`**.
11. **`Instant = Brand<number, 'Instant'>`**.
12. **Layout cravado** (kernel cross-BC, ports genéricos em application, repository em domain).
13. **Zero `throw` / `class` / `this` / `any`**.

Agora 3 eixos de fechamento:

**Eixo 1 (J) — Imports.**

```ts
// Hoje no src/:
import { type Result } from '../../../../shared/result.ts';

// Hoje nos tests/:
import { Money } from '#src/modules/contracts/domain/shared/money.ts';
```

3 opções:
- **A — Manter relativos no src/** (status quo). Refactor de pasta vira caos.
- **B — Subpath imports em todo lugar** (`#contracts/*`, `#kernel/*`, `#shared/*`). Configurar `package.json#imports`.
- **C — Combinação:** relativos dentro do mesmo BC; subpath cross-BC (`#kernel/money.ts`).

Qual? E sobre `import type` vs `import { type X }` — uniformizar pra sempre `import type` quando puro tipo?

**Eixo 2 (K) — Tipos avançados que NÃO usamos.**

K4 (`unique symbol` brand) já fechado no Bloco B-followup. Sobram 4:

- **K1 — HKT approximations** (`type Op<A, T> = (a: A) => Result<T, ErrorOf<A>>`): vale o complexity budget? Considerando que Bloco I defendeu "sem jargão FP no domínio".
- **K2 — Template literal types pra forçar prefixação de erro**: `tag: \`Contract${string}\``. Útil ou over-engineering?
- **K3 — Const type parameters (TS 5.0+)**: `<const T>` em smart constructor preserva literal. Útil pra constantes de domínio (tarifas fixas, dias úteis), ou over?
- **K5 — `satisfies` antes do brand**: pega chave faltando que `as` engole. Vale sistematicamente, só para VOs com 3+ campos, ou nunca (porque `updateAggregate` do A1 já cobre)?

**Eixo 3 (L) — Síntese final.**

O grande output da entrevista. Quero 3 coisas:

1. **Top-5 cheiros do domínio**, ordenados por gravidade. Meu chute: (1) `as unknown as`, (2) optional-as-state, (3) ports em application, (4) `Date` cru, (5) namespace-objeto pattern. Concorda?

2. **Top-3 mudanças com maior leverage** dos 17 tickets em fila. Argumenta o leverage.

3. **Classificação canônica DO / CONSIDER / AVOID / DON'T** de TUDO — todas as decisões dos 7 blocos + J/K acima + as 20 diretrizes — em 4 categorias:
   - **DO** — invariante, violação = bug.
   - **CONSIDER** — recomendação contextual.
   - **AVOID** — desencorajado, exceção justificada possível.
   - **DON'T** — proibido, rejeição em PR review.

Essa tabela final vira a base de `SKILL.md §3.L — Síntese Canônica` + regra de auditoria. É o output mais importante.

---

**Pergunta unificadora final:** algo faltou nesta entrevista que você gostaria de ter visto questionado? Se sim, manda como adendo depois de L3.

Fecha esses 3 eixos e a entrevista 0001 vai pra histórico — `status: FECHADO`, 17+ tickets em fila, 38 DO + 36 DON'T + 14 CONSIDER no master, 3 diagramas canônicos, e a SKILL `ts-domain-modeler` refresh integral. Será a entrevista mais densa de toda a história do projeto.

## R (PhD)
**Decisão do Eixo 1 (J) — Imports: Opção C + Uniformização de `import type`**

A **Opção C** é o padrão-ouro para Monolitos Modulares. Usar imports relativos dentro do mesmo Bounded Context (BC) garante que o módulo seja autossuficiente e fácil de refatorar internamente. Para fronteiras externas (cross-BC ou acessando o Kernel), o uso de *subpath imports* (`#kernel/*`) age como uma barreira arquitetural que deixa o acoplamento explícito e evita o caos de caminhos relativos longos (`../../../../`).

Sobre a tipagem: **uniformize sempre o uso de `import type`** (ou `import type { X }` para imports inline) ao importar puramente tipos. Como o TypeScript apaga tipos na compilação, ser explícito garante que *transpilers* (como esbuild, swc ou Babel) saibam exatamente o que remover com segurança, sem medo de causar efeitos colaterais por avaliar código impuro.

---

**Decisão do Eixo 2 (K) — Tipos Avançados (Complexity Budget)**

*   **K1 — HKT approximations:** **DON'T**. Como cravado na restrição de "zero jargão FP", simular *Higher-Kinded Types* em TypeScript exige abstrações ilegíveis e hacky (como a técnica de defuncionalização). Custa muito e entrega pouco no dia a dia do domínio.
*   **K2 — Template literal types para erros:** **CONSIDER/DO**. É uma excelente forma de *poka-yoke* (prevenção de erros). Usar `type ContractErrorTag = \`contract-${string}\`` restringe o autocompletar e impede via compilador que um desenvolvedor crie uma tag genérica ou fora do padrão do agregado.
*   **K3 — Const type parameters (`<const T>`):** **AVOID**. Adicionar `<const T>` em *smart constructors* pode ajudar a inferir literais exatos, mas no nosso domínio funcional a maioria dos VOs processa primitivos (strings/numbers) que já sofrem coerção para os tipos com *Brand* (ex: `Instant`, `Money`). O ruído visual na assinatura não compensa.
*   **K5 — `satisfies` antes do brand:** **DO**. O operador `satisfies` força o compilador a validar se o formato exato da interface foi atendido (pegando chaves faltantes ou em excesso) **antes** de você usar o `as BrandType`. Usar `const x = { ... } satisfies RawVO as BrandVO` é a forma mais segura de contornar a cegueira do `as`.

---

**Eixo 3 (L) — A Síntese Final Canônica**

**1. Top-5 Cheiros do Domínio (Refinados)**
Concordo com a sua lista, mas ajustaria a ordem para focar puramente no dano à modelagem e legibilidade:
1. **`as unknown as` (Gravidade Crítica):** Subversão total do sistema de tipos, ignorando a checagem do compilador e a premissa de *Parse, don't validate*.
2. **Optional-as-state (`isVerified?: boolean`):** Disfarçar transições de estado com opcionais e booleanos que tornam "estados ilegais representáveis". Fere o conceito central de máquinas de estado no domínio.
3. **Tipos Primitivos Crus (`Date`, `string` crua):** A *Primitive Obsession* que permite misturar um `ContractId` com um `UserId` acidentalmente.
4. **Namespace-objeto pattern:** Envelopar funções em `export const Aggregate = { ... }` ao invés de usar *free functions* (Padrão D), limitando o *tree-shaking* e importando mentalidade OOP.
5. **Ports de Domínio na Aplicação:** Ferir a Inversão de Dependência movendo a definição do Repositório (que protege os invariantes do agregado) para fora da pasta `domain/`.

**2. Top-3 Mudanças com Maior Leverage**
1. **State Machine em Tipos (Discriminated Unions):** Transforma validações imperativas ("se o status é X, então Y está preenchido") em garantias em tempo de compilação. Elimina a possibilidade de acessar dados num estado que não os possui.
2. **Parse, don't validate (Marcas e Construtores Inteligentes):** Elimina o *shotgun parsing*. Ao invés de espalhar `if (isValid)` pela aplicação, você valida nas bordas e confia no tipo com *Brand* no núcleo funcional. 
3. **Zero `throw` / `Result` Homemade:** Força que caminhos de erro façam parte da assinatura das funções. O código se torna honesto, guiando o fluxo pelo *Imperative Shell* e evitando efeitos colaterais escondidos.

**3. Classificação Canônica TS-DOMAIN-MODELER (Tabela de Diretrizes)**

| Categoria | Diretriz / Prática | Regra / Motivo |
| :--- | :--- | :--- |
| **DO** | **Padrão D (module-as-namespace)** | Exportar funções puras na raiz do arquivo. `import * as Module`. |
| **DO** | **Máquina de Estados em Tipos** | Usar Uniões Discriminadas para modelar ciclo de vida e tornar estados inválidos irrepresentáveis. |
| **DO** | **Exhaustive Switch via `never`** | Garantir o tratamento de todos os casos de uma união atribuindo o `default` a `never`. |
| **DO** | **Parse, don't validate** | Validar na criação (Smart Constructors) e propagar um tipo *Branded* seguro pelo domínio. |
| **DO** | **`Result<Success, TaggedError>`** | Retornar falhas de domínio e reidratação de mappers de forma síncrona. Sem exceções. |
| **DO** | **`import type`** | Usar sintaxe explícita para tipos, auxiliando transpilers a limpar o output final. |
| **DO** | **Portos de Invariância no Domínio** | Assinaturas de Repositories vivem em `domain/`. I/O de infra implementa e injeta depois. |
| **DO** | **`satisfies` antes de Brand Cast** | Garantir chaves exatas do Value Object antes de castar para o tipo nominal. |
| **CONSIDER** | **Imports Mistos (Opção C)** | Relativos intra-módulo para coesão, *subpaths* (`#kernel`) cross-módulo para limites fortes. |
| **CONSIDER** | **Template Literal Types para erros** | Usar para forçar prefixos em tags de erro garantindo alinhamento de nomenclatura no agregado. |
| **AVOID** | **Reuso de VOs fora do Kernel** | Evite compartilhar VOs entre Agregados. Dupla taxonomia e isolamento são preferíveis a acoplamento. |
| **DON'T** | **`throw` no domínio** | O *Functional Core* deve ser determinístico. Falhas são controladas via valor. |
| **DON'T** | **`class` e `this`** | Destroem a transparência referencial e o controle puro sobre o comportamento. |
| **DON'T** | **O tipo `any`** | Desativa toda a segurança do compilador que justifica a arquitetura. Use `unknown` e *type narrowing*. |
| **DON'T** | **Primitive Obsession** | IDs, Datas e Dinheiro não são apenas strings/numbers. Devem possuir *Brands* (`Instant` via `unique symbol`). |
| **DON'T** | **Optional-as-state** | Usar flags/properties opcionais para mascarar um ciclo de vida incompleto. Use tipos separados. |

Com isso, todos os 3 eixos estão fechados e a estrutura base do seu documento está concretizada. 

Esta é uma síntese densa e crucial para o padrão do projeto. Quer que eu crie um relatório consolidado com esse manual canônico de arquitetura (usando a ferramenta de relatórios) para que sirva de guia para integração e revisão de PRs da equipe?

## Avaliação crítica do host

### O que ficou impecável ✅

1. **J — Opção C ratificada** (relativos intra-BC + subpath cross-BC) com argumento de "barreira arquitetural" e refactor interno simples.
2. **K1 = DON'T** com argumento sólido (HKT em TS exige defuncionalização hacky).
3. **K3 = AVOID** com argumento "coerção pra Brand já cobre".
4. **K5 = DO** com pattern `{ ... } satisfies RawVO as BrandVO` (validação antes do cast).
5. **L1 — Top-5 refinado.** PhD substituiu meu "Date cru" por "Tipos Primitivos Crus" (mais amplo) e bumped "Ports na Aplicação" pra 5º. Boa edição.
6. **L2 — Top-3 cravado:** state machine in types, parse-don't-validate, zero throw/Result. Trio fundacional correto.

### Tensões — 4 ⚠️

#### T1 — Argumento dos transpilers em J2 é fraco pro nosso setup

PhD: *"transpilers (esbuild, swc, Babel) saibam exatamente o que remover com segurança"*. Mas nossa **Diretriz #18** crava **Node 24 + `--experimental-strip-types`** — sem transpiler externo. O argumento real pra `import type` no nosso projeto é diferente:

**Argumento real:** com `verbatimModuleSyntax: true` (já no nosso `tsconfig`), o TS emite **exatamente o que está escrito** — `import { X }` (sem `type`) tenta emitir `require('X')` em runtime, falha se for puro tipo. `import type { X }` é apaga totalmente. **`import type` é regra de correção, não de transpiler.**

**Resolução:** mantém DO sobre `import type`, mas a razão na SKILL é `verbatimModuleSyntax`, não transpiler genérico.

#### T2 — K2 inverteu o naming (kebab vs PascalCase do D4)

PhD: *"`type ContractErrorTag = \`contract-${string}\`"`* — kebab-case minúsculo.

Mas **Bloco D4 cravou PascalCase adjetival** (`ContractNotActive`). Se aceitamos K2, a template literal deveria ser `\`Contract${string}\``, alinhada com D4.

**Resolução:** K2 como **CONSIDER** (não DO), com naming PascalCase corrigido — `\`Contract${'NotActive' | 'CannotExpireYet' | …}\``. Útil pro autocomplete + autoenforcement, mas frágil pra refactor (T2.b que o PhD não respondeu).

#### T3 — **Tabela L3 entregue com 16 entradas. Pedi a síntese das 50+ decisões.**

O grande output prometido — uma tabela cobrindo as **20 diretrizes do projeto + decisões dos 7 blocos fechados + J/K acima** = 50+ entradas. PhD entregou **16**, dropping silenciosamente:

| Categoria | Itens omitidos pelo PhD |
| :--- | :--- |
| **DO ausentes** | `shared/immutable.ts` facade; Mappers retornam `Result<Aggregate, RehydrationError>`; Domínio sync vs Application async; Dupla taxonomia; `Instant = Brand<number>`; Layout canônico completo; `combine` + `mapErr` no Result; Early return + narrowing; Wrapper-brand vs primitivo-brand; Refinement `parseActive`; Granularidade 4-6 arqs; `index.ts` barrel; Tipos do port junto do port; `public-api/` por módulo; Critério H2; α/β/γ heurística. |
| **CONSIDER ausentes** | `deepImmutable`; `BrandOf<T>`; `bigint`; `Object.isFrozen()`; `isOk`/`isErr`; JSDoc do `toAdjustments`; `Extract<…>`. |
| **DON'T ausentes** | `default: throw` no exhaustive (CONTRADIÇÃO admitida do PhD!); `assertNever`; Function-as-constructor; Identidade como função; Brand-de-primitivo; Migração dual; `ResultAsync` no domínio; Effect/fp-ts/neverthrow; `andThen`/`pipe`/`flow`/`compose`/`traverse`; `combine` em sequência dependente; `<aggregate>.ts` colapsado; Feature slice; Repository em application; VOs infra em domain/shared; `shared/events/` global. |

**Padrão observado pela 5ª vez** nesta entrevista: PhD sub-entrega em síntese (igual diagramas e templates). Toda vez que peço o "grande output unificado", chega um MVP que precisa de expansão do host.

**Resolução:** host expande L3 abaixo na versão completa.

#### T4 — Faltou J1.b, J1.c, J2.b

PhD não respondeu:
- **J1.b** — config do `package.json#imports` (`#contracts/*`, `#kernel/*`, `#shared/*`).
- **J1.c** — destino do `index.ts` barrel (manter ou eliminar).
- **J2.b** — `import { type X, valueY }` (1 linha) vs split em 2.

**Resolução do host:**
- **J1.b** — `package.json#imports`:
  ```json
  "imports": {
    "#kernel/*": "./src/shared/kernel/*",
    "#shared/*": "./src/shared/*",
    "#src/*":    "./src/*"
  }
  ```
  Mantém `#src/*` por compat com tests/.
- **J1.c** — **manter `index.ts` barrel por agregado** (1 por agregado, exporta tudo do agregado). Habilita `import * as Contract from './contract/index.ts'`. Não criar barrel além disso.
- **J2.b** — **split em 2** quando há ≥2 tipos misturados com ≥1 valor; **inline 1 linha** quando há **só 1 tipo + valores**. Critério: legibilidade.

---

## L3 expandida — Tabela canônica completa (host, após correção)

Cobre: 7 blocos fechados (A, B, C, D, G, H, I) + decisões transversais (E3, A4) + 20 diretrizes do projeto + J/K acima. **Esta é a fonte canônica** do `SKILL.md §3.L`.

### DO (regras invariantes — violação = bug)

| # | Regra | Origem |
| :---: | :--- | :--- |
| 1 | ESM puro + NodeNext + `.ts` em imports relativos | Diretriz #1 |
| 2 | Padrão D (module-as-namespace): free functions + `import * as X from './x.ts'` | Bloco B |
| 3 | `verbatimModuleSyntax: true` no `tsconfig` + `import type` quando puro tipo | Bloco J |
| 4 | Imports relativos intra-BC; subpath (`#kernel/*`, `#shared/*`) cross-BC (Opção C) | Bloco J |
| 5 | Result homemade ~50 LOC: `ok`/`err`/`mapErr`/`combine`/`isOk`/`isErr`. Zero deps | Bloco I |
| 6 | Brand via `unique symbol` global em `shared/brand.ts` (`Brand<T,K>` + `BrandOf<T>`) | Bloco B-followup |
| 7 | `shared/immutable.ts` facade para constantes (`ZERO`, `EMPTY`, `INFINITY`) | Bloco B-followup |
| 8 | Wrapper-brand para VOs com grandeza/unidade/contexto evolutivo; primitivo-brand para IDs opacos irredutíveis | Bloco B-followup T1 |
| 9 | Smart constructor `from<Source>` retorna `Result<T, TaggedError>` com `attemptedValue: <tipo>` | Bloco B |
| 10 | `{ ... } satisfies RawShape as BrandedType` no smart constructor (excess property check antes do cast) | Bloco K5 |
| 11 | `updateAggregate(prev, patch)` com `Partial<Omit<T, …imutáveis>>` para transição de estado | Bloco A1 |
| 12 | Tagged errors `{ tag, …payload }` em `errors.ts` por agregado, via **free functions** (Padrão D coerente com B) | Bloco D + D-followup |
| 13 | Case constructor declara **subtipo exato** (`ContractNotActive`, não `ContractError` union completo) | Bloco D-followup T2 |
| 14 | Payload de erro de invariante carrega "duas peças de evidência que colidiram" (estado atual + tentativa) | Bloco D-followup |
| 15 | Erros: PascalCase **adjetival** (`ContractNotActive`); Eventos: PascalCase **passado** (`ContractCreated`) | Bloco D-followup |
| 16 | State machine in types — agregado é union de estados refinados (`Active \| Expired \| Terminated`) | Bloco D2 + C |
| 17 | Transições são funções totais com tipo de saída diferente (`expire(c: ActiveContract): Result<ExpiredContract, …>`) | Bloco D2 |
| 18 | Refinement via `parseActive`, `parsePendingWithDocument` (Parse, don't validate) — não `assertActive` | Bloco D-followup |
| 19 | Aninhamento (status × kind) — 1 union por status, kind interno aninhado. Não cross-product | Bloco C |
| 20 | Estados ELIMINAM `null` — `signedDocumentRef: DocumentId \| null` vira propriedade obrigatória do tipo refinado | Bloco C |
| 21 | Dupla taxonomia legítima: `Amendment` ≠ `ContractAdjustment`. Ponte única `toAdjustments(homologated): readonly ContractAdjustment[]` (array) | Bloco C3 |
| 22 | Exhaustive switch: **omitir `default`** (preferível) ou `default: { const _: never = x; return _; }` | Bloco C4 |
| 23 | Rota α (VO como Prova) — invariante atemporal e reusável | Bloco D5 |
| 24 | Rota γ (Caso de Uso como Orquestrador) — invariante de contexto específico exigindo VO brandado | Bloco D5 |
| 25 | Rota β (Agregado como Guardião) — invariante contextual e mutável (depende do estado interno) | Bloco D5 |
| 26 | Sequência dependente (α) usa **early return** com narrowing automático do TS | Bloco I |
| 27 | Inputs independentes (β) usam **`combine`** — coleta erros, melhora UX da borda | Bloco I |
| 28 | Tradução de erro na fronteira (γ) usa **`combine` + 1 `mapErr` no fim** | Bloco I |
| 29 | Domínio 100% sync. Application Layer (Imperative Shell, Seemann) lida com `Promise` | Bloco I |
| 30 | Aceitar 3 estratégias coexistentes (α: early return; β: combine; γ: combine+mapErr). Anti-pattern buscar técnica unificadora | Bloco I |
| 31 | `Instant = Brand<number, 'Instant'>` em `src/shared/kernel/instant.ts` | Bloco G |
| 32 | `Clock` em `application/ports/clock.ts` com assinatura `{ now: () => Instant }` | Bloco G |
| 33 | Mappers reidratam agregado **apenas via smart constructors de VOs internos**, retornando `Result<Aggregate, RehydrationError>` | Bloco A4 |
| 34 | Layout: `src/shared/kernel/` cross-BC (Evans); `src/modules/<bc>/domain/shared/` específico do BC | Bloco H3 |
| 35 | Granularidade 4-6 arquivos por agregado: `types`, `errors`, `events`, `<aggregate>`, `repository`, `index` | Bloco H1 |
| 36 | `index.ts` barrel por agregado — habilita `import * as Contract from './contract/index.ts'` | Bloco H1 |
| 37 | Critério H2: port ditado por invariância de agregado → `domain/<aggregate>/repository.ts`. Genérico → `application/ports/` | Bloco H2 |
| 38 | Tipos do port moram **junto do port** (`BucketName` em `application/ports/document-storage.types.ts`) | Bloco H3 |
| 39 | `public-api/` por módulo — cada módulo dono dos eventos que emite (ADR-0006) | Bloco H |
| 40 | Naming canônico: `adapters/` (não `infra/`), `contracts/` plural, `cli/` como pasta de primeira classe | Bloco H |

### CONSIDER (recomendação contextual)

| # | Recomendação | Origem |
| :---: | :--- | :--- |
| 1 | Zod / Effect Schema como fonte única de parse + tipo + erro **na borda** (CLI, mappers, HTTP) | Bloco A2 |
| 2 | `deepImmutable` para VOs compostos com sub-VOs aninhados | Bloco B-followup |
| 3 | `BrandOf<T>` em testes e diagnósticos (`expect(BrandOf<typeof x>).toBe('Money')`) | Bloco B-followup |
| 4 | `bigint` no domínio se valores se aproximarem de `MAX_SAFE_INTEGER` (decisão domain-driven) | Bloco B-followup |
| 5 | `Object.isFrozen()` em property-based tests confirmando invariante de imutabilidade | Bloco B-followup |
| 6 | `isOk` / `isErr` type predicates para filtros e testes | Bloco I |
| 7 | Helper na Application Layer se `await → extract → repassar` ficar repetitivo (fora do domínio) | Bloco I |
| 8 | JSDoc nas funções que usam `combine` documentando a ordem dos erros no array | Bloco I |
| 9 | `Extract<Amendment, { status: 'X' }>` como type helper se aninhamento ficar verboso | Bloco C |
| 10 | JSDoc do `Amendment.toAdjustments` documentando 1:1 (Addition→ValueIncrease), 1:N (Renewal futuro), 0:1 (Adjustment sem Amendment) | Bloco C |
| 11 | Quando `<aggregate>.ts` ultrapassar ~400 linhas, fragmentar em `<aggregate>-transitions.ts` + `<aggregate>.ts` | Bloco H1 |
| 12 | Port ambíguo: "se trocar o agregado por outro, este port faz sentido?" Sim → application. Não → domain | Bloco H2 |
| 13 | `rehydrateContract(row)` único dispatcher lendo `row.status` e despachando para o tipo refinado | Bloco D |
| 14 | Template literal type para forçar prefixo PascalCase em tags de erro: `tag: \`Contract${string}\`` | Bloco K2 |
| 15 | `split` em 2 imports quando há ≥2 tipos com ≥1 valor; `import { type X, valueY }` inline quando há só 1 tipo | Bloco J2 |
| 16 | `Object.isFrozen()` em property-based tests de constantes | Bloco G |

### AVOID (desencorajado, exceção justificada possível)

| # | Prática | Razão |
| :---: | :--- | :--- |
| 1 | HKT approximations no domínio | Defuncionalização hacky, jargão FP. Vale só em utilitários raros | Bloco K1 |
| 2 | Const type parameters (`<const T>`) em smart constructor | Coerção pra Brand já cobre. Ruído visual desnecessário | Bloco K3 |
| 3 | Reuso de VOs entre agregados além do Shared Kernel | Dupla taxonomia é preferível a acoplamento. Promover só o que é genuinamente cross-BC | Bloco C3 + H3 |
| 4 | Barrel adicional além do `index.ts` por agregado | Padrão D dispensa barrels intermediários | Bloco H1 |
| 5 | Mudança de naming convention em meio-projeto | Codemod via `ts-morph` big-bang num único ticket é melhor que migração dual | Bloco B-followup |

### DON'T (proibido — rejeição em code review)

| # | Anti-pattern | Origem |
| :---: | :--- | :--- |
| 1 | `throw` no domínio (zero throw) | CLAUDE.md raiz + Bloco D |
| 2 | `class` e `this` no domínio | CLAUDE.md raiz |
| 3 | `any` em qualquer lugar | CLAUDE.md raiz |
| 4 | `as unknown as T` em código de negócio | Bloco A1 |
| 5 | Brandar agregados (`Contract`/`Amendment`) — só VOs folha | Bloco A3 |
| 6 | Mapper montando literal de agregado direto (shotgun parsing) | Bloco A4 |
| 7 | Namespace-objeto `export const Money = { … }` (Padrão A condenado) | Bloco B |
| 8 | Function-as-constructor `Money(100)` retornando `Result` (quebra semântica JS) | Bloco B |
| 9 | Zod **dentro** de `shared/<vo>.ts` (Zod vive na borda) | Bloco B |
| 10 | Identidade como função (`zero()`) quando o valor é imutável puro — usa constante via `immutable()` | Bloco B |
| 11 | `Object.freeze` direto no código de domínio — usa facade `immutable`/`deepImmutable` | Bloco B-followup |
| 12 | Brand-de-primitivo para grandezas/unidades (colapsa sob extensão) | Bloco B-followup |
| 13 | Migração dual coexistente (Padrão A legado + Padrão D novo) — gera drift permanente | Bloco B-followup |
| 14 | `declare const brand: unique symbol` espalhado em cada arquivo de VO — centraliza em `shared/brand.ts` | Bloco B-followup |
| 15 | `export const ContractError = { … } as const` ao lado de `export type ContractError` (declaration merging) | Bloco D-followup |
| 16 | Erro de invariante carregando primitivo cru sem ser evidência da colisão | Bloco D-followup |
| 17 | Naming imperativo (`assertActive`, `validateActive`) — remete a exceções | Bloco D-followup |
| 18 | `assertActive` que devolve `Contract` cru — fere refinement | Bloco D2 |
| 19 | `if (contract.status !== 'Active')` espalhado em código de negócio (shotgun parsing) | Bloco D2 |
| 20 | Codificar invariante reusável como `if` no agregado — promover para VO subtype (rota α) | Bloco D5 |
| 21 | Espalhar o **mesmo `if`** em múltiplos pontos — declarar **uma vez** como tipo e propagar via construtor γ | Bloco D5 |
| 22 | Cross-product de 2 eixos discriminantes (12 tipos pra Amendment) — duplica máquina de estado | Bloco C |
| 23 | `signedDocumentRef: DocumentId \| null` (optional-as-state) | Bloco C2 |
| 24 | Transição retornando tipo direto sem `Result` (viola Bloco D + Bloco I) | Bloco C |
| 25 | Eliminar `ContractAdjustment` em nome de DRY mecânico (evolução assimétrica permite 1:N e 0:1) | Bloco C3 |
| 26 | `default: throw new Error(...)` no exhaustive switch — **contradição admitida do PhD** nesta entrevista | Bloco C4 |
| 27 | `assertNever(x: never): never` como helper — exige `throw` (TS rejeita função `never` sem corpo) | Bloco C4 |
| 28 | Adotar `Effect`, `fp-ts`, `neverthrow` no domínio (peso conceitual + jargão) | Bloco I |
| 29 | Implementar `andThen`/`flatMap`/`chain` — redundante com early return + narrowing nativo | Bloco I |
| 30 | Implementar `pipe`, `flow`, `compose` no domínio — vira jargão FP | Bloco I |
| 31 | Implementar `traverse`, `sequence` — casos reais cabem em `combine` ou loop nativo | Bloco I |
| 32 | `ResultAsync` no domínio (mistura sync com async; viola Functional Core / Imperative Shell) | Bloco I |
| 33 | Usar `combine` em sequência dependente (α) — APPLICATIVE só faz sentido em independente | Bloco I |
| 34 | `Date` cru no domínio (mutável, timezone-aware, comparação irregular) | Bloco G |
| 35 | `isValidDate` espalhado no domínio — validação concentrada em `Instant.fromEpochMs`/`fromISO` | Bloco G |
| 36 | Colapsar agregado em arquivo único de 600+ linhas | Bloco H1 |
| 37 | Feature slice por operação (`homologate-amendment/`) — fragmenta state machine | Bloco H1 |
| 38 | Repository em `application/ports/` — confunde port de invariância (domínio) com port de capacidade (aplicação) | Bloco H2 |
| 39 | VOs de infra (`BucketName`, `StorageKey`) em `domain/shared/` — vazamento de jargão técnico | Bloco H3 |
| 40 | `src/shared/events/` global cross-module — apaga ownership e viola isolamento | Bloco H |
| 41 | Promover VO específico do BC para `src/shared/kernel/` — só sobe pra Kernel o genuinamente cross-BC | Bloco H3 |
| 42 | `infra/` no naming — convenção do projeto é `adapters/` (CLAUDE.md raiz) | Bloco H |
| 43 | `contract/` singular — convenção do projeto é `contracts/` plural | Bloco H |
| 44 | `kind` ausente em diagramas de state machine — aninhamento status × kind é obrigatório | Diagrama meta |

---

**Total: 40 DO + 16 CONSIDER + 5 AVOID + 44 DON'T = 105 entradas canônicas.**

Versus a tabela do PhD: 8 DO + 2 CONSIDER + 1 AVOID + 5 DON'T = 16 entradas.

## Adendo (host)

PhD **não ofereceu adendo** — em vez disso, propôs criar um "relatório consolidado" via ferramenta. Não é o tipo de adendo que eu pedia (algo que faltou questionar). Sobre a oferta de relatório: **declino**. O master `0001-functional-ddd-domain-refresh.md` + 18 arquivos por pergunta + 3 diagramas + esta tabela L3 expandida já formam o manual canônico. Relatório PDF redundante.

**Temas que sinto que faltou questionar** (registro pra entrevista futura):
1. **Observability** — logs estruturados pra erros tagged. Como o `tag: 'ContractCannotExpireYet'` chega ao Datadog/Sentry sem virar string serializada?
2. **Property-based testing** — fast-check pra provar invariantes de smart constructor (Bloco B) e state machine (Bloco C).
3. **Event sourcing puro vs `{ entity, event }`** — Bloco E1 ficou aberto. Decisão real impactaria F1 (encoding) e A4 (rehydration).
4. **Outbox MySQL** — Bloco F2 (schema evolution) ainda aberto. Importante quando comunicação cross-módulo entrar.

Estes 4 ficam pra **entrevista 0002** (a ser aberta quando outbox MySQL voltar à mesa).

## Rules emergentes (sumário)

Todas as decisões classificadas estão na **tabela canônica L3 expandida** acima. Ela substitui qualquer "rules emergentes" parcial.

## Cross-refs

| Pergunta | Conexão |
| :--- | :--- |
| Todas as anteriores | L3 absorve TUDO. Esta pergunta é a destilação final. |
| [B1+B2+B3-followup](./Pergunta_B1_B2_B3_followup_tec_lider_using_skill_ts-domain-modeler.md) | K4 já resolvido lá (unique symbol). |
| [A1](./Pergunta_A1_tec_lider_using_skill_ts-domain-modeler.md) | K5 (`satisfies`) é alternativa ao cast `as`. `updateAggregate` já dá excess property check. |
| [D1](./Pergunta_D1_tec_lider_using_skill_ts-domain-modeler.md) e [D-followup](./Pergunta_D2_D3_D4_D5_followup_tec_lider_using_skill_ts-domain-modeler.md) | K2 (template literal) toca o naming dos tagged errors. |
| [H1+H2+H3](./Pergunta_H1_H2_H3_tec_lider_using_skill_ts-domain-modeler.md) | J1 (subpath imports) interage com o layout de pastas. |
| [I (E3+I1+I3+A4)](./Pergunta_E3_I1_I3_A4_tec_lider_using_skill_ts-domain-modeler.md) | K1 (HKT) — Bloco I defendeu sem jargão FP. |

## Tickets que vão sair (provisório)

- **CTR-DOMAIN-IMPORTS-STRATEGY** — implementa decisão de J1 (subpath imports + config).
- **CTR-DOMAIN-IMPORT-TYPE-UNIFORM** — uniformiza `import type` em todo o repo via codemod.
- **CTR-SKILL-REFRESH-L** — `.claude/skills/ts-domain-modeler/SKILL.md §3.L — Síntese Canônica` com a tabela DO/CONSIDER/AVOID/DON'T completa. Vira o **índice mestre da SKILL**.
- **CTR-DOMAIN-K-OPTIONAL** — features avançadas K1/K2/K3/K5 (quais aprovadas) viram regra opcional na SKILL.

## O que esperar da resposta

1. **Veredito sobre J** — estratégia de imports + uniformização de `import type`.
2. **Veredito sobre K1, K2, K3, K5** — cada um com sim/não justificado.
3. **L1** — top-5 cheiros (chute do host ou refazer).
4. **L2** — top-3 tickets com maior leverage, com argumento.
5. **L3 — A GRANDE TABELA** — todas as decisões da entrevista classificadas em DO / CONSIDER / AVOID / DON'T. Cobre os 7 blocos fechados + 20 diretrizes do projeto + J/K acima.
6. **Adendo (opcional)** — algo que faltou questionar.

Se a resposta vier completa, **entrevista 0001 FECHA**. Status final: 17+ tickets ordenados, 3 SKILLs refresh, 3 diagramas canônicos, e uma tabela mestra que vira **a referência ÚNICA do projeto** pra DDD funcional em TS.
