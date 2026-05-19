---
entrevista: 0001
bloco: D
pergunta: D2+D3+D4+D5
título: "Invariantes em tipos — state machine, forma e localização do erro de domínio"
skill: ts-domain-modeler
status: respondida
parent: D1 (respondida — tagged records ratificados)
agrupa:
  - D2  # assertActive que não refina o tipo — state machine in types
  - D3  # forma canônica do tagged error (shape, builder, formatter, asserção em teste)
  - D4  # naming convention (kebab vs PascalCase flat vs dot vs SCREAMING)
  - D5  # invariante contextual (rota α/β/γ — VO subtype, agregado, construtor por kind)
---

# Pergunta_D2_D3_D4_D5_tec_lider_using_skill_ts-domain-modeler

> **Status:** respondida ✅ — T1/T2/T4/T6 resolvidos pelo host; T3/T5 fechados via [follow-up](./Pergunta_D2_D3_D4_D5_followup_tec_lider_using_skill_ts-domain-modeler.md) (PhD admitiu a contradição com Bloco B e endossou heurística α/γ/β + nomenclatura). Bloco D **FECHADO COMPLETO**. 5 tickets coordenados liberados.
> **Origem:** entrevista 0001
> **Skill canônica:** `ts-domain-modeler`

---

## Por que unificar?

D2, D3, D4 e D5 parecem 4 perguntas independentes, mas são **4 eixos do mesmo problema**: como codificar **invariantes de negócio em tipos TypeScript**.

| Eixo | O que decide |
| :---: | :--- |
| **D2** | **Onde a invariante VIVE no tipo** — refinement de agregado por estado (`ActiveContract`) |
| **D3** | **Qual o SHAPE do erro** quando a invariante é violada (tagged record + payload) |
| **D4** | **Qual o NOME canônico** desse erro (PascalCase flat vs dot vs kebab) |
| **D5** | **Onde a regra MORA** — VO subtype (α), agregado (β), construtor por kind (γ) |

Decidir um eixo sem decidir os outros gera dissonância:

- D2 + D3 — se `applyHomologatedAdjustment(c: ActiveContract, …)` exige refinement, o erro `ContractNotActive` **migra** do operation-level pro type-level (smart constructor de `ActiveContract`). Isso muda quem emite o tagged record.
- D2 + D5 — D2 é literalmente **a rota γ aplicada ao eixo `status`**. Se aceitarmos γ pra `Amendment.kind` (`createAddition`, `createMisc`), aceitamos D2 pro `Contract.status`? Mesma técnica, eixos diferentes.
- D3 + D4 — o naming `ContractNotActive` (PascalCase) vs `Contract.NotActive` (dot) força o shape do tagged record (1 campo `tag` vs 2 campos `aggregate` + `tag`).
- D5 + D3 — a rota α exige `NonZeroMoney`, que emite `{ tag: 'MoneyMustBeNonZero', ... }`. A forma desse erro tem que casar com o shape canônico que D3 estabelecer.

**D1 já fechou:** erros são tagged records `{ tag: 'X', …payload }`, fatiados por Use Case, expressando "tender care" das violações de invariante. Esta pergunta resolve **onde nascem** e **como o sistema de tipos previne sua emissão acidental**.

---

## Q (host) — versão formal

### Eixo 1 (D2) — State machine in types

**Caso vivido em `contract.ts:19`:**

```ts
const assertActive = (contract: Contract): Result<Contract, 'contract-not-active'> =>
  contract.status === 'Active' ? ok(contract) : err('contract-not-active');
```

A função se chama `assertActive` mas devolve `Contract` **cru** no `ok` — zero narrowing pra quem chama. Versão refinante:

```ts
// Tipo refinado por estado
type ActiveContract = Contract & { readonly status: 'Active' };

const assertActive = (c: Contract): Result<ActiveContract, ContractError.NotActive> =>
  c.status === 'Active'
    ? ok(c as ActiveContract)
    : err({ tag: 'ContractNotActive', currentStatus: c.status });

// E a operação aceita APENAS ActiveContract — invariante codificada em tipo
const applyHomologatedAdjustment = (c: ActiveContract, …): … => …;
```

**Perguntas:**

- **D2.a** — Aprovas? Custos: (i) `as ActiveContract` controlado no guard; (ii) cada operação que muda status precisa de **transição tipada** (`expire(active: ActiveContract): Result<ExpiredContract, …>`).
- **D2.b** — Generalizar para **um tipo por estado** (`ActiveContract | ExpiredContract | TerminatedContract`), unificados via `type Contract = Active | Expired | Terminated`? Drizzle ainda consegue serializar — o `status` é coluna discriminante.
- **D2.c** — Como ESLint/SKILL **força** a regra "função que muda status retorna tipo diferente do que recebe"?

### Eixo 2 (D3) — Forma canônica do tagged error

**D1 fixou:** `{ tag: 'X', …payload }`. Mas o **shape exato** ficou em aberto. Candidatos:

```ts
// Candidato A — flat
{ tag: 'ContractNotActive'; currentStatus: ContractStatus }

// Candidato B — agregado em campo separado
{ aggregate: 'Contract'; reason: 'NotActive'; currentStatus: ContractStatus }

// Candidato C — namespaced helper (estilo F# case constructors)
const ContractError = {
  notActive: (currentStatus: ContractStatus): ContractError =>
    ({ tag: 'ContractNotActive', currentStatus }),
  cannotExpireYet: (currentEnd: Date, attemptedAt: Date): ContractError =>
    ({ tag: 'ContractCannotExpireYet', currentEnd, attemptedAt }),
};
return err(ContractError.notActive(contract.status));
```

**Perguntas:**

- **D3.a** — `tag` como discriminador (em vez de `type`, que reservamos pra eventos) — confirma?
- **D3.b** — Quem traduz pra PT-BR — `cli/formatters/error.ts` com `switch (e.tag)` exaustivo? Anotação no próprio tipo (Effect Schema-style)?
- **D3.c** — Builder helper (Candidato C) vale como vocabulário do domínio ou cheira a OO disfarçado? Wlaschin usa case constructors em F# o tempo todo — mas em F# eles são gratuitos pela linguagem; em TS são código manual.
- **D3.d** — O B fechou que **erros de smart constructor de VO** carregam `attemptedValue: <tipo da assinatura>`. Erros de invariante (`ContractCannotExpireYet`) carregam **o que** — o `attemptedAt`? O `currentEnd` (estado do agregado)? Ambos?

### Eixo 3 (D4) — Naming convention

Cinco candidatos no campo de batalha:

```
'contract-not-active'       // kebab           — hoje
'ContractNotActive'          // PascalCase flat — paralelo com eventos
'Contract.NotActive'         // dot-notation   — namespace explícito
'CTR_NOT_ACTIVE'             // SCREAMING       — código C/Java tradicional
'contract.not-active'        // dot + kebab     — Sentry/Datadog-friendly
```

**Contexto: o Bloco D1 já entregou `{ tag: 'ContractCannotExpireYet', currentEnd, attemptedAt }` — PascalCase flat. Esse precedente trava parcialmente D4.** Mas falta consolidar o critério.

**Perguntas:**

- **D4.a** — Existe critério funcional, ou é "consistência interna e ponto"?
- **D4.b** — Eventos hoje são `ContractCreated`, `AmendmentHomologated` (PascalCase, **passado**). Erros viram `ContractNotActive`, `AmendmentAlreadyApplied` (PascalCase, **adjetival**). Vantagem (uniformidade lexical) ou risco (confusão visual entre "isto aconteceu" e "isto não pode acontecer")?
- **D4.c** — Se D2 for aceito, o "erro" migra do agregado pro smart constructor de `ActiveContract`. O **nome do ASSERT** é `Contract.asActive(c)`? `Contract.assertActive(c)`? `Contract.refineActive(c)`? Qual a convenção?

### Eixo 4 (D5) — Invariante contextual α/β/γ

**Caso vivido em `amendment.ts:35`** — `Addition` e `Suppression` exigem `impactValue.cents !== 0`:

```ts
case 'Addition':
case 'Suppression':
  if (input.impactValue.cents === 0) return err('amendment-impact-value-zero');
```

Não dá pra empurrar pra Zod (Money zero é legítimo universalmente; ilegítimo só nesse contexto). **Três rotas:**

| Rota | Localização | Exemplo |
| :--- | :--- | :--- |
| **α** | VO subtype brandado | `type NonZeroMoney = Brand<Money, 'NonZeroMoney'>` em `Addition.impactValue` |
| **β** | Invariante no agregado, runtime check | `if (input.impactValue.cents === 0) return err({tag: 'AmendmentImpactValueZero'})` |
| **γ** | Construtor por kind | `Amendment.createAddition(input: AdditionInput)` onde `AdditionInput.impactValue: NonZeroMoney` |

**Perguntas:**

- **D5.x** — Qual rota defende? Intuição do host: **γ** (sinergia com a regra do Bloco I "early return + tipos refinados").
- **D5.y** — Heurística: **subtype** (α/γ) quando invariante for **atemporal e composta** (reusável em outros agregados); **agregado** (β) quando **contextual e mutável**. Concorda?
- **D5.z** — Como evitar shotgun parsing — declarar a regra "Addition exige NonZeroMoney" **uma vez** e propagar (Zod schema, tipo do agregado, UI form, mensagem PT-BR)?
- **D5.w** — Nomenclatura proposta: α = "VO como prova", β = "agregado como guardião", γ = "caso de uso como contrato". Sustenta semanticamente?
- **D5.v** — **Cross com D2:** D2 é literalmente **a rota γ aplicada ao eixo `status` do Contract** (em vez de `kind` do Amendment). Mesma técnica, eixo diferente. Se γ é a resposta pra Amendment.kind, é também pra Contract.status — combina?

### Pergunta unificadora

Existe uma **teoria coerente de "invariantes em tipos"** para o domínio — articulando os 4 eixos (state machine + shape do erro + naming + localização da regra) num conjunto único de princípios? Ou é decisão **case-by-case** e "consistência interna do agregado" é o melhor que dá?

Se há teoria, manda como template (DO/DON'T por eixo + snippets de aplicação). Se não há, ajude-me a desenhar a **NOSSA** — porque vou cravar no `SKILL.md §3.D — Tagged Errors & Invariantes em Tipos` e isso vai modelar todos os próximos agregados do ERP (Contratos, Aditivos, futuro Faturamento, Orçamento, Pagamento, Contas a Receber).

---

## Q (host) — versão narrativa (para colar em chat externo)

Cara, fechamos Bloco A, Bloco B e Bloco I — tô empolgado. Mas no momento em que sentei pra escrever o refactor de `Contract.applyHomologatedAdjustment` (aplicando early return do Bloco I + tagged errors do D1 + `updateContract` do A + helper `immutable` do B), bati num poço de **4 decisões coladas** que vão modelar não só esse agregado, mas **todos os próximos** (Aditivos refactor, futuro Faturamento, Orçamento, Pagamento). Vou te mostrar os 4 eixos porque eles se trancam e eu não sei resolver um sem resolver os outros.

**Eixo 1 — State machine in types.** Hoje:

```ts
const assertActive = (contract: Contract): Result<Contract, 'contract-not-active'> =>
  contract.status === 'Active' ? ok(contract) : err('contract-not-active');
```

A função se chama `assertActive` mas devolve `Contract` cru no sucesso — zero refinement. Versão idiomática:

```ts
type ActiveContract = Contract & { readonly status: 'Active' };
const assertActive = (c: Contract): Result<ActiveContract, ContractError> =>
  c.status === 'Active' ? ok(c as ActiveContract) : err({ tag: 'ContractNotActive', currentStatus: c.status });

const applyHomologatedAdjustment = (c: ActiveContract, …): … => …;  // só aceita ActiveContract!
```

Aprova? E se aprovar, **generaliza pra um tipo por estado** (`ActiveContract | ExpiredContract | TerminatedContract`)? Drizzle ainda serializa via coluna `status` discriminante. Mas aí cada operação que muda status (`expire`, `terminate`) precisa de **transição tipada** (`expire(active: ActiveContract): Result<ExpiredContract, …>`).

**Eixo 2 — Shape do tagged error.** D1 fixou `{ tag: 'X', …payload }`. Mas o shape exato ficou aberto. Três candidatos:

```ts
// A — flat
{ tag: 'ContractNotActive'; currentStatus: ContractStatus }

// B — agregado em campo separado
{ aggregate: 'Contract'; reason: 'NotActive'; currentStatus: ContractStatus }

// C — case constructor estilo F#
const ContractError = {
  notActive: (status: ContractStatus): ContractError => ({ tag: 'ContractNotActive', currentStatus: status }),
};
return err(ContractError.notActive(contract.status));
```

E o B fechou que erros de VO carregam `attemptedValue: <tipo>`. Mas e erros de **invariante** (não de parse) — carregam o `attemptedAt`? O `currentEnd` do agregado? Ambos? Qual a regra?

**Eixo 3 — Naming.** Cinco candidatos, cada um com filosofia. Eventos já são PascalCase passado (`ContractCreated`). Erros viram PascalCase adjetival (`ContractNotActive`). Lexicalmente paralelos — vantagem ou risco de confusão? E se aceitar D2 (eixo 1), o `assertActive` muda de papel — vira o **smart constructor de `ActiveContract`**. Qual o nome canônico? `Contract.asActive(c)`? `Contract.assertActive(c)`? `Contract.refineActive(c)`?

**Eixo 4 — Invariante contextual.** `Addition.impactValue` não pode ser zero — mas zero é legítimo pra Money universalmente. Três rotas:

- **α** — `NonZeroMoney` brandado. Cada VO carrega prova.
- **β** — Invariante no agregado, runtime check.
- **γ** — Construtor por kind (`Amendment.createAddition` exige `NonZeroMoney`).

E aqui vem a sacada que me atravessou: **o Eixo 1 (D2 = state machine de Contract por status) é literalmente a rota γ aplicada ao eixo `status` do Contract**, em vez do eixo `kind` do Amendment. Mesma técnica, eixos diferentes. Se você aprovar γ pro Amendment, aprova D2 pro Contract automaticamente — combina?

---

**A pergunta única que tudo isso vira:** **existe uma teoria coerente de "invariantes em tipos" no domínio funcional** — articulando state machine + shape de erro + naming + localização da regra num conjunto único de princípios? Ou é case-by-case?

Se tem teoria, manda completa (DO/DON'T por eixo + snippets). Se não tem, me ajuda a desenhar a NOSSA — vai virar `SKILL.md §3.D — Tagged Errors & Invariantes em Tipos` e modelar **todos** os próximos agregados do ERP. Última coisa: minha intuição é que existe uma **só** decisão filosófica subjacente — algo como "encode every invariant as a type refinement until refinement becomes more expensive than runtime check" — e que essa decisão determina os 4 eixos em cascata. Você concorda, ou tem uma framing melhor?

## R (PhD)

A sua sacada final foi brilhante. Sim, existe uma teoria coerente e unificada que amarra tudo isso, e você acabou de deduzi-la.
Na modelagem de domínio funcional, essa teoria unificada nasce da intersecção de dois grandes princípios que já discutimos: "Make illegal states unrepresentable" (Torne estados ilegais irrepresentáveis) de Yaron Minsky
 e "Parse, don't validate" de Alexis King
.
A teoria coerente dita que se uma regra de negócio só se aplica a um contexto específico, esse contexto deve ser um tipo distinto
.
Vamos destrancar o seu poço de decisões aplicando essa teoria aos 4 eixos, mostrando como eles são, na verdade, facetas da mesma joia geométrica.
Eixo 1 e Eixo 4 — A Máquina de Estados e o Contexto (A grande sacada)
A sua intuição de que o Eixo 1 e o Eixo 4 usam a mesma técnica está cirurgicamente correta. Você está descobrindo na prática o que Scott Wlaschin demonstra com o tipo EmailAddress vs VerifiedEmail
.
No Eixo 1 (Agregado): Um contrato recém-criado não tem as mesmas capacidades de um contrato ativo. Logo, eles não são o mesmo tipo. Em vez de espalhar if (contract.status !== 'Active') (Shotgun Parsing)
, você consome a entrada e parseia para um ActiveContract. A partir daí, funções como applyHomologatedAdjustment exigem um ActiveContract
. O TypeScript garante o fluxo via Tipos de União Discriminada
. Operações de transição viram funções totais que provam a mudança de estado: expire(c: ActiveContract): ExpiredContract.
No Eixo 4 (Contexto do VO): Um Money geral pode ser zero. Mas um Aditivo de Acréscimo não pode ter impacto zero. A rota γ (Construtor por kind) aliada à criação de um tipo refinado NonZeroMoney é a aplicação perfeita da teoria. O domínio diz: "Para criar uma Adição, preciso de um dinheiro que eu saiba ser maior que zero". O smart constructor do NonZeroMoney faz o parse e entrega a prova
.
Veredito: O domínio não tem "regras soltas no ar" (runtime checks no agregado). O domínio tem tipos restritos que provam invariantes. Aprovamos a State Machine em tipos (Eixo 1) e o construtor por kind exigindo tipos restritos (Eixo 4).
Eixo 2 — O Shape e o Payload do Erro de Invariante
Para manter a harmonia do domínio funcional em TypeScript sem poluição visual, nós separamos a definição do tipo da construção do valor.
O Shape (Tipagem vs Ergonomia): A melhor abordagem é fundir as opções A e C. Você declara o tipo de forma estritamente flat (Opção A) para aproveitar o narrowing de uniões discriminadas nativo do TypeScript
. Mas para a ergonomia de criação (para não repetir { tag: '...', ... } o tempo todo), você exporta um módulo com Case Constructors (Opção C) que retornam as strings tipadas.
O Payload (A Regra): Em erros de parse, a falha é na fronteira, então devolvemos o input bruto (attemptedValue). Em erros de invariante (regras de negócio), a falha ocorre porque há um conflito de realidade. A regra é: o payload deve conter as duas peças de evidência que colidiram. Se não posso encerrar o contrato ainda, o erro deve carregar o fato impeditivo (currentEnd: Date) e a tentativa (attemptedAt: Date). Isso dá à CLI (e ao usuário) contexto imediato sem precisar de refetch.
Eixo 3 — Naming e o Papel do "Assert"
Se estamos abraçando "Parse, don't validate", a linguagem que usamos deve refletir transformação e refinamento, não exceções imperativas.
Nomeando Erros: O padrão Adjetival/Factual (ContractNotActive) é excelente porque erros funcionais não são "exceções a serem capturadas", mas fatos do domínio que explicam por que uma transição não pôde ocorrer. Eles narram o estado que bloqueou a ação.
Nomeando o "Smart Constructor de Estado": assertActive soa imperativo e remete a exceções (throw). Já que a função consome o tipo base e retorna um subtipo provado em um Result, os nomes canônicos mais aderentes seriam parseActive ou refineToActive. Eles comunicam que estamos "espremendo" um tipo mais genérico para revelar um tipo mais restrito, preservando essa nova informação no sistema de tipos
.

--------------------------------------------------------------------------------
O Template Integrado da "Teoria das Invariantes"
Aqui está como essas decisões se consolidam em um design puramente funcional e tipado no seu código:
// 1. O Estado é um Tipo Refinado (Eixo 1)
export type ActiveContract = Contract & { readonly status: 'Active' };
export type ExpiredContract = Contract & { readonly status: 'Expired' };

// 2. Os Erros são Fatos com Evidências de Colisão (Eixo 2 e 3)
export type ContractError =
  | { tag: 'ContractNotActive'; currentStatus: ContractStatus }
  | { tag: 'ContractCannotExpireYet'; currentEnd: Date; attemptedAt: Date };

// 3. Ergonomia via Case Constructors no Módulo do Erro (Eixo 2)
export const ContractError = {
  notActive: (status: ContractStatus): ContractError => ({ tag: 'ContractNotActive', currentStatus: status }),
  cannotExpire: (end: Date, at: Date): ContractError => ({ tag: 'ContractCannotExpireYet', currentEnd: end, attemptedAt: at })
} as const;

// 4. A transição: Parser de estado (Eixo 3) e Mudança de estado (Eixo 1)
export const refineToActive = (c: Contract): Result<ActiveContract, ContractError> =>
  c.status === 'Active' ? ok(c as ActiveContract) : err(ContractError.notActive(c.status));

// O Caso de Uso (que prova que a invariante está no tipo)
export const applyHomologatedAdjustment = (
  c: ActiveContract, // Só compila se passar pela porta do refineToActive
  adjustment: NonZeroMoney // Exigido pelo Eixo 4
): Result<ActiveContract, ContractError> => {
  // Toda a lógica flui sem `if` de validação extra. Os tipos provam a segurança.
}
Essa é a beleza de tornar o código a sua documentação
. Você transformou verificações condicionais e inseguras em uma malha de tipos onde os estados ilegais simplesmente não compilam.

## Avaliação crítica do host

### O que ficou impecável ✅

1. **Teoria unificada confirmada.** Existe — interseção de **"Make illegal states unrepresentable"** (Yaron Minsky) + **"Parse, don't validate"** (Alexis King). Frase canônica do PhD: *"se uma regra de negócio só se aplica a um contexto específico, esse contexto deve ser um tipo distinto"*. Resolve a pergunta unificadora.
2. **Eixo 1 + Eixo 4 unificados.** Confirma a sacada do host: D2 (state machine de Contract) é literalmente γ aplicada ao eixo `status`. Mesmo princípio que `EmailAddress` vs `VerifiedEmail` do Wlaschin.
3. **Shape do erro: fusão de A + C** — tipo declarado **flat** (para narrowing nativo) + **case constructors** para ergonomia.
4. **Regra de payload do erro de invariante:** *"as duas peças de evidência que colidiram"* — `currentEnd` + `attemptedAt`. Princípio claro, auditável, testável.
5. **Naming dos erros: padrão Adjetival/Factual** (`ContractNotActive`) — "fatos do domínio que explicam por que uma transição não pôde ocorrer". Resolve D4 com critério semântico, não convenção arbitrária.

### Tensões identificadas — 6 ⚠️

#### T1 — Rehydrate em union de estados (médio)

PhD aceitou D2.b (union `Active | Expired | Terminated`) e disse "Drizzle ainda serializa via coluna status discriminante". Mas o `rehydrateContract` que travamos em A4 retorna `Result<Contract, RehydrationError>`. Agora vira `Result<ActiveContract | ExpiredContract | TerminatedContract, RehydrationError>` — quem despacha? Função única que lê `row.status` e despacha, ou `rehydrateActive`/`rehydrateExpired` separados?

**Resolução do host:** **função única dispatcher.** `rehydrateContract(row)` lê `row.status`, valida via `ContractStatus.parse`, e retorna o tipo apropriado. Ranqueia bem com Padrão D (1 arquivo, free functions).

#### T2 — `refineToActive` declarando `ContractError` inteiro fere D1 (forte)

Snippet do PhD:
```ts
export const refineToActive = (c: Contract): Result<ActiveContract, ContractError> =>
  c.status === 'Active' ? ok(c as ActiveContract) : err(ContractError.notActive(c.status));
```

`ContractError` é union de N tagged errors (`ContractNotActive | ContractCannotExpireYet | …`). Mas `refineToActive` só pode emitir `ContractNotActive`. Declarar `ContractError` inteiro **fere o princípio de D1** que o PhD defendeu: *"cada Use Case devolve apenas o subconjunto de erros que ele pode emitir"*.

**Resolução do host:** **cada smart constructor de estado declara o tipo de erro que produz.** O `ContractError` union completo fica reservado pra agregação em Use Cases.

```ts
export type ContractNotActiveError = { tag: 'ContractNotActive'; currentStatus: ContractStatus };

export const parseActive = (c: Contract): Result<ActiveContract, ContractNotActiveError> =>
  c.status === 'Active'
    ? ok(c as ActiveContract)
    : err({ tag: 'ContractNotActive', currentStatus: c.status });
```

#### T3 — **CONTRADIÇÃO DIRETA com Bloco B** (crítico)

Snippet do PhD:
```ts
export type ContractError = | { tag: 'ContractNotActive'; … } | …;
export const ContractError = { notActive: …, cannotExpire: … } as const;  // ← declaration merging
```

Isso é **exatamente** o padrão que o **próprio PhD condenou no Bloco B** como anti-pattern. Citação dele, verbatim, no veredito de B1:

> *"O `export const Money = { … }` carrega métodos amarrados à instância, o que dificulta o tree-shaking e foge da nossa decisão do Bloco B (usar objetos puros e funções livres)."*

Agora propõe **a mesma coisa pros erros**. Declaration merging informal entre `type ContractError` e `const ContractError = { … } as const` reintroduz o Padrão A condenado.

**Resolução do host: aplicar Padrão D aos erros também.** Coerência com Bloco B vence:

```ts
// contract-errors.ts — arquivo único por agregado, free functions, module-as-namespace
export type ContractNotActive = { readonly tag: 'ContractNotActive'; readonly currentStatus: ContractStatus };
export type ContractCannotExpireYet = { readonly tag: 'ContractCannotExpireYet'; readonly currentEnd: Date; readonly attemptedAt: Date };
export type ContractError = ContractNotActive | ContractCannotExpireYet | /* … */;

// Case constructors como FREE FUNCTIONS — não objeto namespace
export const notActive = (currentStatus: ContractStatus): ContractNotActive =>
  ({ tag: 'ContractNotActive', currentStatus });

export const cannotExpireYet = (currentEnd: Date, attemptedAt: Date): ContractCannotExpireYet =>
  ({ tag: 'ContractCannotExpireYet', currentEnd, attemptedAt });
```

Uso:
```ts
import * as ContractError from './contract-errors.ts';
return err(ContractError.notActive(c.status));
```

Note: `ContractError` aqui é **namespace** (do `import * as`), não const. Coerente com B.

**Este ponto precisa de ratificação do PhD** — é onde ele se contradiz e eu quero garantia de que ele endossa a coerência (Padrão D em tudo, inclusive erros).

#### T4 — `parseActive` vs `refineToActive` (baixo)

PhD ofereceu duas opções e não escolheu. Diferença semântica:
- `parseActive(c: Contract)` — alinha com Alexis King ("Parse, don't validate"). Curto.
- `refineToActive(c: Contract)` — alinha com TS narrowing. Mais explícito mas verboso.

**Resolução do host: `parseActive`.** Curto, alinha com o princípio dominante do projeto ("Parse, don't validate" foi citado em A2, B2, D5).

#### T5 — Heurística α/β/γ não consolidada (médio)

PhD aprovou γ na prática (snippet) mas **não respondeu explicitamente** D5.y (heurística pra escolher) e D5.z (shotgun parsing — como propagar uma vez).

Heurística do host (proposta original): **subtype quando invariante for atemporal/composta; agregado quando contextual/mutável.** Falta o PhD ratificar ou refinar.

**Este ponto precisa de ratificação do PhD.**

#### T6 — `adjustment: NonZeroMoney` no snippet é simplificação didática (baixo)

Snippet final do PhD:
```ts
export const applyHomologatedAdjustment = (
  c: ActiveContract,
  adjustment: NonZeroMoney  // ← simplificado
): Result<ActiveContract, ContractError> => { … }
```

Mas `adjustment` real é union `ValueIncrease | ValueDecrease | PeriodExtension | Acknowledgment` (do C3). PhD simplificou pra clareza didática.

**Resolução do host:** aceito como simplificação didática. O `adjustment` real continua sendo a discriminated union do C3 — só com a constraint adicional de que `ValueIncrease.amount` e `ValueDecrease.amount` são `NonZeroMoney` (rota γ aplicada à variante do `ContractAdjustment`).

---

## Rules emergentes (Bloco D — pendente confirmação de T3/T5 antes de cravar SKILL)

### DO (provisório — aguardando ratificação)

1. **(D2)** Modelar **um tipo refinado por estado de agregado** (`ActiveContract`, `ExpiredContract`, `TerminatedContract`). Operações declaram explicitamente o estado que aceitam.
2. **(D2)** Transições de estado são **funções totais que provam a mudança**: `expire(c: ActiveContract): Result<ExpiredContract, …>`.
3. **(D3)** Tagged error tem shape **flat** (`{ tag, …payload }`) para aproveitar narrowing nativo do TS — Eixo 2 da §3.D.
4. **(D3)** Case constructors expostos como **free functions** no arquivo de erros (Padrão D, coerente com B).
5. **(D3)** Payload de **erro de invariante** carrega as **duas peças de evidência que colidiram** (estado atual + tentativa). Payload de **erro de parse de VO** carrega `attemptedValue` (B fechou).
6. **(D4)** Erros: **PascalCase adjetival/factual** (`ContractNotActive`, `AmendmentAlreadyApplied`). Não confundir com PascalCase passado dos eventos (`ContractCreated`).
7. **(D4)** Smart constructor de estado refinado: **`parseActive`**, **`parsePending`**, **`parseHomologated`** — alinha com "Parse, don't validate".
8. **(D5)** **Rota γ** é dominante para invariantes contextuais (construtor por kind exigindo tipos restritos).
9. **(D5)** **Rota α** complementa γ — VOs subtype (`NonZeroMoney`, `PositiveAmount`) viram pré-requisitos do construtor γ.
10. **(D5)** **Rota β** (runtime check no agregado) só quando invariante for verdadeiramente contextual e mutável (depende do estado do agregado, da idade, do dia da semana).

### DON'T

1. **(D2)** Função se chamando `assertActive` que devolve `Contract` cru — viola refinement.
2. **(D2)** `if (contract.status !== 'Active')` espalhado em código de negócio — shotgun parsing condenado por Langsec.
3. **(D3)** Builder helper como `export const ContractError = { … } as const` ao lado de `export type ContractError` — declaration merging informal, condenado pelo Bloco B.
4. **(D3)** Erro de invariante carregando primitivo cru (`number`, `string`) — exceto quando documenta exatamente a entrada da função. Erros de invariante carregam **VOs do domínio**.
5. **(D4)** Naming `assertActive` (imperativo, remete a `throw`).
6. **(D5)** Codificar invariante reusável como `if` no agregado — promove pra VO subtype (α).
7. **(D5)** Espalhar o **mesmo if** (`impactValue.cents === 0`) em múltiplos pontos — declarar **uma vez** como tipo (`NonZeroMoney`) e propagar.

### CONSIDER

1. **(D2)** Function dispatcher `rehydrateContract(row)` lendo `row.status` e despachando para o tipo refinado correto. Mantém Padrão D.
2. **(D5)** Quando uma invariante aparece em mais de um lugar (`Addition.impactValue ≠ 0` e `Suppression.impactValue ≠ 0`), promova pra subtype (α). Quando aparece só uma vez, mantém β.

## Pendências antes de cravar SKILL §3.D (follow-up curto pro PhD)

- **T3** — Confirmar coerência com Bloco B: erros aplicam Padrão D (free functions, sem `as const` object).
- **T5** — Ratificar heurística α/β/γ + responder D5.z (shotgun parsing — como propagar "Addition exige NonZeroMoney" uma vez).

Follow-up gerado em arquivo separado: `Pergunta_D2_D3_D4_D5_followup_tec_lider_using_skill_ts-domain-modeler.md` (próximo).

## Cross-refs

| Pergunta | Como se conecta |
| :--- | :--- |
| [D1](./Pergunta_D1_tec_lider_using_skill_ts-domain-modeler.md) | Tagged records já ratificados — esta pergunta resolve **shape** e **localização**. |
| [B1+B2+B3](./Pergunta_B1_B2_B3_tec_lider_using_skill_ts-domain-modeler.md) | Smart constructor canônico + Brand novo. Eixo 4 (α) reusa `Brand<NonZeroMoney, 'NonZeroMoney'>` direto. |
| [E3+I1+I3+A4](./Pergunta_E3_I1_I3_A4_tec_lider_using_skill_ts-domain-modeler.md) | Early return + narrowing nativo do TS. D2 (refinement) potencializa esse pattern — `assertActive` retornando `ActiveContract` dá narrowing **em tipo**, não só em fluxo. |
| [C1](./Pergunta_C1_tec_lider_using_skill_ts-domain-modeler.md) | `Amendment` é intersection (`Base & Variant`) — D2 generaliza pra agregado inteiro como union de estados. |
| [C2](./Pergunta_C2_tec_lider_using_skill_ts-domain-modeler.md) | `signedDocumentRef: DocumentId \| null` é optional-as-state — D2 elimina isso modelando `PendingWithoutDocument \| PendingWithDocument \| Homologated`. |
| [C3](./Pergunta_C3_tec_lider_using_skill_ts-domain-modeler.md) | `ContractAdjustment` espelha `Amendment` — D5.v conecta com a "dupla taxonomia". |
| [A1](./Pergunta_A1_tec_lider_using_skill_ts-domain-modeler.md) | `updateAggregate(prev, patch)` — se D2 vira state machine, `updateAggregate` precisa preservar `status` ou exigir transição tipada. |

## Tickets candidatos (provisório, dependendo da R do PhD)

- **CTR-DOMAIN-STATE-MACHINE-CONTRACT** — refactor `Contract` em union `Active | Expired | Terminated`; `expire`/`terminate` viram transições tipadas. Depende de `CTR-DOMAIN-DEBRAND-AGG`.
- **CTR-DOMAIN-STATE-MACHINE-AMENDMENT** — idem para `Amendment` (`PendingWithoutDocument | PendingWithDocument | Homologated`); resolve **D2 + C1 + C2** no Amendment.
- **CTR-DOMAIN-TAGGED-ERRORS** — migra todos os erros string-literal pra tagged records `{ tag: 'X', …payload }` com builder helper (se D3 endossar Candidato C).
- **CTR-DOMAIN-INVARIANT-CONTEXTUAL** — implementa rota dominante (α/β/γ) pra `Addition`/`Suppression` exigirem `NonZeroMoney`.
- **CTR-SKILL-REFRESH-D** — atualiza `SKILL.md §3.D — Tagged Errors & Invariantes em Tipos` com a teoria que sair (ou com a lista de heurísticas case-by-case).

## O que esperar da resposta

Idealmente o PhD devolve:

1. Veredito sobre D2 (state machine in types) + critério de generalização.
2. Shape final do tagged error (com snippet) + regra de payload pra erro de invariante.
3. Critério de naming consolidado.
4. Rota dominante de D5 + heurística + cross-aplicação ao Eixo 1.
5. **Resposta direta à pergunta unificadora:** existe teoria geral ou é case-by-case?
6. (Bônus) Snippet do `Contract` modernizado em union de estados, com `expire` e `applyHomologatedAdjustment` mostrando transições tipadas + tagged errors aplicados.

Se a resposta vier completa, fecha **Bloco D inteiro** + parcialmente fecha **C1, C2, C3** (que dependem do mesmo princípio). Restante do C (C4 — exhaustive switch sem default) já estava resolvido implicitamente pelos Blocos A/I.
