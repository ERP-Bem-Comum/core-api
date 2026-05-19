---
entrevista: 0001
bloco: C
pergunta: C1+C2+C3+C4
título: "Discriminated unions no Amendment — state machine aplicada, dupla taxonomia e exhaustive switch"
skill: ts-domain-modeler
status: respondida-com-correcoes-do-host
parent: D2+D3+D4+D5 (resolveu o princípio de C1/C2; C3 e C4 seguem abertos)
agrupa:
  - C1  # Amendment intersection Base & Variant — aplicar state machine de D2 (HOW, não WHETHER)
  - C2  # signedDocumentRef: DocumentId | null — optional-as-state, eliminar via tipo refinado
  - C3  # ContractAdjustment espelha Amendment — dupla taxonomia legítima ou anti-pattern?
  - C4  # exhaustive switch sem default — corrigir contradição entre SKILL atual e CLAUDE.md raiz
---

# Pergunta_C1_C2_C3_C4_tec_lider_using_skill_ts-domain-modeler

> **Status:** respondida-com-correcoes-do-host — PhD aprovou aninhamento (Eixo 1) e dupla taxonomia (Eixo 2) com argumento robusto, mas o template entregue tem 3 problemas críticos: (T1) não modelou o eixo `kind`, (T2) transições sem `Result`, (T3) **usou `throw` no exhaustive switch** — exatamente o que eu cobrei como contradição com CLAUDE.md raiz e ele ignorou. Host aplicou correções autoritativas baseadas no CLAUDE.md raiz + TS handbook. **Bloco C FECHADO** com template definitivo do host.
> **Origem:** entrevista 0001
> **Skill canônica:** `ts-domain-modeler`

---

## Por que unificar?

O Bloco D fechado já decidiu o **princípio** que governa C1 e C2: **state machine in types** (rota γ aplicada ao eixo de estado). O que sobra do Bloco C é:

| Eixo | O que decide | Onde estamos |
| :---: | :--- | :--- |
| **C1 + C2** | **Como aplicar** state machine no `Amendment` — onde antes era intersection `Base & Variant` com `signedDocumentRef: DocumentId \| null` | Princípio já travado pelo Bloco D; falta o template concreto |
| **C3** | **Dupla taxonomia legítima ou anti-pattern** — `Amendment` (ato administrativo) ↔ `ContractAdjustment` (efeito no Contract). Função `Amendment.toAdjustment()` única ponte? | Genuinamente em aberto |
| **C4** | **Exhaustive switch sem `default`** — corrigir contradição direta entre SKILL atual (`default: throw`) e CLAUDE.md raiz (`omitir default ou return _;`) | Decisão já existe no raiz; SKILL precisa alinhar |

C1+C2 viram aplicação. C3 e C4 são as decisões genuínas desta pergunta.

---

## Q (host) — versão formal

### Eixo 1 (C1+C2) — Aplicar state machine in types ao `Amendment`

**Hoje em `amendment/types.ts:9-28`:**

```ts
type AmendmentBase = Readonly<{
  id: AmendmentId;
  contractId: ContractId;
  amendmentNumber: string;
  description: string;
  createdAt: Date;
  status: AmendmentStatus;                    // ← discriminante
  signedDocumentRef: DocumentId | null;       // ← null = optional-as-state
  homologatedAt: Date | null;                 // ← null = optional-as-state
  homologatedBy: UserRef | null;              // ← null = optional-as-state
}>;

type AmendmentVariant = Readonly<
  | { kind: 'Addition'; impactValue: Money }
  | { kind: 'Suppression'; impactValue: Money }
  | { kind: 'TermChange'; newEndDate: Date }
  | { kind: 'Misc' }
>;

export type Amendment = Brand<AmendmentBase & AmendmentVariant, 'Amendment'>;
```

**Aplicando D2 + Bloco B (Padrão D) + Bloco D1 (tagged errors):**

```ts
// amendment/types.ts (proposta)

// Núcleo comum a todos os estados — sem optionals
type AmendmentCore = Readonly<{
  id: AmendmentId;
  contractId: ContractId;
  amendmentNumber: string;
  description: string;
  createdAt: Date;
}>;

// Variantes de kind (atos administrativos do aditivo)
type AdditionPayload    = Readonly<{ kind: 'Addition';    impactValue: NonZeroMoney }>;
type SuppressionPayload = Readonly<{ kind: 'Suppression'; impactValue: NonZeroMoney }>;
type TermChangePayload  = Readonly<{ kind: 'TermChange';  newEndDate: Date }>;
type MiscPayload        = Readonly<{ kind: 'Misc' }>;

type AmendmentPayload = AdditionPayload | SuppressionPayload | TermChangePayload | MiscPayload;

// Estados refinados — ELIMINAM os 3 nullables
export type PendingWithoutDocument = AmendmentCore & AmendmentPayload & Readonly<{
  status: 'PendingWithoutDocument';
}>;

export type PendingWithDocument = AmendmentCore & AmendmentPayload & Readonly<{
  status: 'PendingWithDocument';
  signedDocumentRef: DocumentId;              // ← não-null, garantido pelo tipo
}>;

export type Homologated = AmendmentCore & AmendmentPayload & Readonly<{
  status: 'Homologated';
  signedDocumentRef: DocumentId;
  homologatedAt: Date;
  homologatedBy: UserRef;
}>;

export type Amendment = PendingWithoutDocument | PendingWithDocument | Homologated;
```

E as operações ficam:

```ts
// amendment/amendment.ts (proposta)

// Construtor inicial — sempre sai PendingWithoutDocument
export const create = (input: CreateAmendmentInput): Result<PendingWithoutDocument, AmendmentError> => …;

// Transição tipada
export const attachSignedDocument = (
  a: PendingWithoutDocument,
  ref: DocumentId,
): Result<PendingWithDocument, AmendmentError> => …;

// Outra transição — só aceita quem JÁ tem documento
export const homologate = (
  a: PendingWithDocument,
  by: UserRef,
  at: Date,
): Result<Homologated, AmendmentError> => …;
```

**Perguntas:**

- **C1+C2.a** — Aprovas esse template? Erros que enxergo:
  - `AmendmentCore & AmendmentPayload & { … status }` repete `& AmendmentPayload` nas 3 variantes — DRY ferido. Alternativa: `Amendment = AmendmentCore & AmendmentPayload & (PendingState | PendingWithDocState | HomologatedState)` com `PendingState = { status: 'PendingWithoutDocument' }`, etc. Mais clean ou mais confuso?
  - O `homologate(a: PendingWithDocument)` impede em tipo a operação "homologate amendment sem documento". É o ganho central de D2 aplicado. Confirma que essa é a regra a propagar?

- **C1+C2.b** — Discriminador único `status` ou múltiplo (`status` + `kind`)? `Amendment` carrega 2 eixos discriminantes (status do ciclo de vida + kind do ato administrativo). A union `PendingWithoutDocument | … | Homologated` discrimina por `status`, mas dentro de cada estado, `kind` segue como discriminante secundário. Como o PhD lida com **duas dimensões de discriminação**? Cross-product (4 kinds × 3 status = 12 tipos) ou aninhamento (3 status, cada um com `kind` interno) — qual prefere?

- **C1+C2.c** — `Amendment` brandado ou não? O Bloco A decidiu **não brandar agregados**. Mas se `Amendment = PendingWithoutDocument | PendingWithDocument | Homologated`, e cada um carrega VOs brandados nas folhas (`NonZeroMoney`, `ContractId`, `DocumentId`), o agregado fica protegido transitivamente conforme A3. Confirma?

### Eixo 2 (C3) — `ContractAdjustment` espelha `Amendment` — dupla taxonomia?

**Hoje em `contract/types.ts:25-30`:**

```ts
export type ContractAdjustment = Readonly<
  | { kind: 'ValueIncrease'; amount: Money; amendmentId: AmendmentId }
  | { kind: 'ValueDecrease'; amount: Money; amendmentId: AmendmentId }
  | { kind: 'PeriodExtension'; newEnd: Date; amendmentId: AmendmentId }
  | { kind: 'Acknowledgment'; amendmentId: AmendmentId }
>;
```

É um **DTO interno** entre o use case `homologateAmendment` e `Contract.applyHomologatedAdjustment`. Mapeamento implícito:

| `AmendmentKind` | `ContractAdjustment.kind` |
| :--- | :--- |
| `Addition` | `ValueIncrease` |
| `Suppression` | `ValueDecrease` |
| `TermChange` | `PeriodExtension` |
| `Misc` | `Acknowledgment` |

**Duas leituras opostas:**

**Leitura A — Dupla taxonomia legítima (separação de responsabilidades).**

- `Amendment` é **ato administrativo** — modelo do que o jurídico assinou (descrição, número, datas, documento).
- `ContractAdjustment` é **efeito no Contract** — modelo do impacto técnico (somar valor, estender período).
- Ponte única: `Amendment.toAdjustment(homologated: Homologated): ContractAdjustment`.
- Vantagem: o agregado `Contract` não precisa conhecer `Amendment` — recebe apenas o efeito derivado. Mantém Ports & Adapters interno entre agregados.

**Leitura B — Anti-pattern de tradução interna.**

- A tabela de mapeamento é 1:1 e mecânica. Cria duplicação semântica.
- Se mudarmos `Amendment` (adicionar `Renewal` como 5º kind), precisamos mudar `ContractAdjustment` (adicionar `PeriodRenewal`) — dois pontos de mudança coordenados.
- Solução: `Contract.applyHomologatedAmendment(homologated: Homologated): …` recebe o próprio `Homologated` e despacha por `homologated.kind`. Elimina `ContractAdjustment`.

**Perguntas:**

- **C3.a** — Qual leitura você defende? **A** (manter dupla taxonomia) ou **B** (eliminar `ContractAdjustment`)?
- **C3.b** — Se **A**, qual o critério pra justificar a duplicação? Quando um "DTO interno entre agregados" é legítimo vs quando é anti-pattern?
- **C3.c** — Se **B**, como manter a separação conceitual entre "ato administrativo" e "efeito no agregado"? Comentário no código? Subtype `HomologatedAmendment` específico pro Contract consumir?
- **C3.d** — Cross com D5 (heurística α/γ/β): `ContractAdjustment` é γ aplicado entre agregados? Ou é categoricamente diferente — não é codificar invariante, é **tradução semântica**?

### Eixo 3 (C4) — Exhaustive switch sem `default`

**Contradição direta entre SKILL atual e CLAUDE.md raiz:**

```ts
// SKILL ts-domain-modeler/SKILL.md HOJE (errada):
switch (amendment.kind) {
  case 'Addition':    return …;
  case 'Suppression': return …;
  case 'TermChange':  return …;
  case 'Misc':        return …;
  default: { const _exhaustive: never = amendment; throw new Error(`unreachable: ${_exhaustive}`); }
  //                                                ^^^^^ VIOLA "zero throw"
}

// CLAUDE.md raiz (correta):
// "Nunca usar default: throw — usar default: { const _: never = x; return _; } ou omitir default."
```

E o **TS handbook `Narrowing.md` §709-739** confirma o caminho canônico:

```ts
// Citação do handbook:
function getArea(shape: Shape) {
  switch (shape.kind) {
    case "circle":  return Math.PI * shape.radius ** 2;
    case "square":  return shape.sideLength ** 2;
    default:
      const _exhaustiveCheck: never = shape;
      return _exhaustiveCheck;     // ← retorna never, não throw
  }
}
```

O `never` é assignable a qualquer tipo de retorno, então a função compila. Sem throw.

**Perguntas:**

- **C4.a** — Confirma o caminho canônico (omitir default OU `return _exhaustiveCheck;`) e descarte do `throw new Error(...)`?
- **C4.b** — Há cenário em que **omitir default** é preferível a `default: { const _ = x; return _; }`? Minha intuição: omitir é mais limpo quando `noFallthroughCasesInSwitch` + `noImplicitReturns` + retorno explícito da função cobrem tudo. O `default` explícito ajuda quando o leitor precisa de pista visual.
- **C4.c** — `assertNever(x: never): never` como helper compartilhado em `shared/exhaustive.ts`? Custos: precisa `throw` (única exceção ao "zero throw"?) ou pode retornar `never` sem corpo (TS rejeita — função tem que ter ramo)? Como você implementaria sem throw?
- **C4.d** — Como esse princípio se aplica com o **Bloco I** (early return + narrowing nativo)? O Bloco I disse "domínio sem `pipe`/`andThen`, early return + narrowing direto". O `default` com `_exhaustive: never` é redundante quando o switch já cobre todos os casos discriminados por `kind`. O `noFallthroughCasesInSwitch` do tsconfig já protege contra fall-through. Vale manter o `default` ou omitir?

### Pergunta unificadora

Os 3 eixos respondem juntos: **qual o template canônico do agregado `Amendment` refatorado** — incluindo a estrutura de tipos refinados por estado (Eixo 1), a decisão sobre dupla taxonomia com `ContractAdjustment` (Eixo 2) e a forma final do exhaustive switch (Eixo 3)?

Se a resposta vier completa, libera o ticket `CTR-DOMAIN-STATE-MACHINE-AMENDMENT` (que já está em fila do Bloco D) com escopo cirurgicamente definido + corrige a contradição da SKILL com o CLAUDE.md raiz + decide o destino de `ContractAdjustment` (mantém ou elimina).

---

## Q (host) — versão narrativa (para colar em chat externo)

Cara, tô prestes a abrir o ticket `CTR-DOMAIN-STATE-MACHINE-AMENDMENT` que sobrou do Bloco D fechado. Mas antes, 3 decisões precisam fechar — duas são detalhe de aplicação do que já decidimos, uma é genuinamente filosófica.

**Eixo 1 — Como aplicar state machine in types ao `Amendment`?**

O princípio já tá travado (D2 aplicado): em vez de `signedDocumentRef: DocumentId | null` + `homologatedAt: Date | null` + `homologatedBy: UserRef | null`, modelamos:

```ts
export type Amendment = PendingWithoutDocument | PendingWithDocument | Homologated;
```

Cada estado é um tipo distinto, sem `null`. E as transições viram funções totais:

```ts
export const create: (input) => Result<PendingWithoutDocument, …>;
export const attachSignedDocument: (a: PendingWithoutDocument, ref: DocumentId) => Result<PendingWithDocument, …>;
export const homologate: (a: PendingWithDocument, by: UserRef, at: Date) => Result<Homologated, …>;
```

O `homologate(a: PendingWithDocument)` **impede em tipo** a operação "homologar sem documento". Esse é o ganho central. Aprovado, certo? Mas aí bate uma dúvida: **Amendment tem 2 eixos discriminantes** (status do ciclo de vida + kind do ato administrativo). Cross-product completo seria 4 kinds × 3 status = 12 tipos. Ou aninhamento (3 status, cada um com `kind` interno discriminante secundário). Qual prefere — explosão em 12 ou aninhamento em 3?

**Eixo 2 — Dupla taxonomia: `Amendment` e `ContractAdjustment`. Faz sentido?**

Hoje:

```ts
// amendment/types.ts: Amendment com Addition/Suppression/TermChange/Misc
// contract/types.ts:
export type ContractAdjustment =
  | { kind: 'ValueIncrease'; amount: Money; amendmentId: AmendmentId }
  | { kind: 'ValueDecrease'; amount: Money; amendmentId: AmendmentId }
  | { kind: 'PeriodExtension'; newEnd: Date; amendmentId: AmendmentId }
  | { kind: 'Acknowledgment'; amendmentId: AmendmentId };
```

`ContractAdjustment` é DTO interno entre o use case `homologateAmendment` e `Contract.applyHomologatedAdjustment`. Mapeamento 1:1: `Addition → ValueIncrease`, `Suppression → ValueDecrease`, `TermChange → PeriodExtension`, `Misc → Acknowledgment`.

**Duas leituras:**

- **A (manter):** `Amendment` é ato administrativo (modelo jurídico — número, descrição, documento); `ContractAdjustment` é efeito no Contract (modelo técnico — somar, subtrair, estender). O Contract não conhece Amendment, recebe só o efeito. Ports & Adapters interno.

- **B (eliminar):** Mapeamento 1:1 é duplicação semântica. Se adicionarmos `Renewal` como 5º kind, precisamos mudar nos dois lugares. `Contract.applyHomologatedAmendment(h: Homologated)` despacharia por `h.kind` direto e eliminaria `ContractAdjustment`.

Qual defende? Se A, qual o critério pra justificar duplicação (quando "DTO entre agregados" é legítimo vs anti-pattern)? Se B, como manter a separação conceitual?

**Eixo 3 — Exhaustive switch sem `default` — corrigir contradição da SKILL.**

A SKILL atual exige:

```ts
default: { const _exhaustive: never = amendment; throw new Error(`unreachable: …`); }
```

Mas o `throw` viola "zero throw" do CLAUDE.md raiz, que diz:

> *"Nunca usar `default: throw` — usar `default: { const _: never = x; return _; }` ou omitir default."*

E o TS handbook §709 corrobora: o canônico é `return _exhaustiveCheck;` (que é `never`, assignable a qualquer tipo) — sem throw.

Confirma o caminho? E entre "omitir default" e "default com `const _ = x; return _;`" — qual prefere? Eu inclino pra **omitir default quando `noFallthroughCasesInSwitch` + `noImplicitReturns` + retorno explícito cobrem**, e usar `default` explícito só quando o leitor precisa de pista visual de "todos os casos cobertos".

E o `assertNever(x: never): never` como helper compartilhado em `shared/exhaustive.ts` — vale? Como você implementa sem `throw` (TS rejeita função `never` sem corpo)?

---

**A pergunta única que tudo isso vira:** **manda o template canônico do `Amendment` refatorado** — tipos refinados por estado, transições tipadas, decisão sobre dupla taxonomia, forma final do exhaustive switch. Se sair completo, libero `CTR-DOMAIN-STATE-MACHINE-AMENDMENT` e corrijo a SKILL pra alinhar com CLAUDE.md raiz no mesmo PR.

## R (PhD)

Essas são excelentes decisões de design. Elas tocam no coração de como traduzir regras de negócio para o sistema de tipos. Aqui está a minha análise para cada um dos eixos, baseada nos princípios de Domain-Driven Design (DDD) e tipagem funcional.
Eixo 1 — Aninhamento em 3 vs Explosão em 12
A recomendação clara aqui é o aninhamento em 3.
O princípio fundamental da programação funcional é a "Composição em todo lugar" (construir coisas grandes a partir de coisas pequenas através de operações "E" e "OU")
. Se fizermos uma explosão para 12 tipos (cross-product), estaremos violando essa composição e duplicando a lógica da máquina de estados para cada "kind".
O ciclo de vida (PendingWithoutDocument → PendingWithDocument → Homologated) dita quais operações são permitidas no tempo, enquanto o kind (Addition, Suppression, etc.) dita o payload/conteúdo do ato. Como as funções de transição da máquina de estado se importam apenas com a presença do documento e assinaturas, o kind deve ser apenas um tipo aninhado composto com um "E" (um Record type) dentro do status
.
Isso mantém sua máquina de estados focada em apenas 3 estados, enquanto a variação do conteúdo fica delegada ao tipo interno AmendmentKind.
Eixo 2 — Dupla taxonomia: A (manter) vs B (eliminar)
Eu defendo fortemente a Opção A (manter a separação).
Embora o mapeamento 1:1 pareça duplicação agora, eles representam conceitos de domínio fundamentalmente distintos. A modelagem funcional exige que mantenhamos os conceitos do domínio separados e explícitos
.
O Amendment é um conceito do mundo administrativo/jurídico (tem assinaturas, datas de homologação, documentos). Já o ContractAdjustment é um conceito puramente matemático/financeiro que afeta o agregado Contract. Essa separação atua como um limite de consistência (consistency boundary) entre diferentes agregados
.
Se você for para a Opção B, o Contract passará a conhecer a existência de "Atos Administrativos", quebrando o isolamento (Ports & Adapters interno). Além disso, a Opção A te protege contra a evolução assimétrica do negócio. Por exemplo:
Um único Amendment complexo no futuro pode gerar dois ContractAdjustments (ex: um reajuste de prazo E uma adição de valor).
Uma decisão judicial ou correção de erro do sistema pode exigir um ContractAdjustment sem que haja um Amendment formal.
Eixo 3 — Exhaustive switch e a contradição do never
Você tocou em um ponto técnico puramente idiossincrático do TypeScript. O Handbook do TS é claro: o tipo never representa valores que nunca são observados. Em funções, um tipo de retorno never significa explicitamente que a função lança uma exceção ou encerra a execução do programa
.
Portanto, **é impossível implementar um helper `assert
Com base na resposta assima responda isso:


A pergunta única que tudo isso vira: manda o template canônico do Amendment refatorado — tipos refinados por estado, transições tipadas, decisão sobre dupla taxonomia, forma final do exhaustive switch. Se sair completo, libero CTR-DOMAIN-STATE-MACHINE-AMENDMENT e corrijo a SKILL pra alinhar com CLAUDE.md raiz no mesmo PR.

Aqui está o template canônico para o modelo de Amendment (Emenda/Alteração), unificando o Domain Modeling Made Functional (tornar estados ilegais irrepresentáveis
), o conceito de Parse, don't validate
, e o poder das Discriminated Unions (uniões discriminadas) e checagem de exaustividade do TypeScript
.
O Template Canônico: Amendment State Machine
Este modelo elimina o uso de flags (como isApproved ou isUnderReview) e propriedades opcionais soltas
, substituindo-os por tipos refinados para cada estado.
// 1. Tipos primitivos encapsulados (opcional, para evitar Primitive Obsession) [9, 10]
type AmendmentId = string & { readonly __brand: unique symbol };
type UserId = string & { readonly __brand: unique symbol };

// ---------------------------------------------------------
// 2. Tipos Refinados por Estado (A decisão da Dupla Taxonomia)
// Em vez de uma única interface gigante com dezenas de `?` opcionais, 
// separamos o que é comum do que é específico de cada estado [8].
// ---------------------------------------------------------

type AmendmentBase = {
  readonly id: AmendmentId;
  readonly content: string;
  readonly createdAt: Date;
};

// Estado 1: DRAFT
type AmendmentDraft = AmendmentBase & {
  readonly status: 'DRAFT'; // Discriminante [4]
};

// Estado 2: REVIEW
type AmendmentUnderReview = AmendmentBase & {
  readonly status: 'REVIEW';
  readonly submittedBy: UserId;
  readonly submittedAt: Date;
};

// Estado 3: APPROVED
type AmendmentApproved = AmendmentBase & {
  readonly status: 'APPROVED';
  readonly submittedBy: UserId;
  readonly approvedBy: UserId;
  readonly approvedAt: Date;
};

// Estado 4: REJECTED
type AmendmentRejected = AmendmentBase & {
  readonly status: 'REJECTED';
  readonly submittedBy: UserId;
  readonly rejectionReason: string;
};

// ---------------------------------------------------------
// 3. A Discriminated Union (A verdadeira entidade do domínio)
// Transforma regras de negócios em restrições de compilação [1, 11].
// ---------------------------------------------------------

export type Amendment =
  | AmendmentDraft
  | AmendmentUnderReview
  | AmendmentApproved
  | AmendmentRejected;

// ---------------------------------------------------------
// 4. Transições Tipadas (State Machine Functions)
// Funções puras que recebem APENAS o estado de origem válido [12, 13].
// Parse, don't validate: a transição prova que ocorreu [3, 14].
// ---------------------------------------------------------

export const submitForReview = (
  amendment: AmendmentDraft, 
  user: UserId
): AmendmentUnderReview => ({
  ...amendment,
  status: 'REVIEW',
  submittedBy: user,
  submittedAt: new Date(),
});

export const approve = (
  amendment: AmendmentUnderReview, 
  approver: UserId
): AmendmentApproved => ({
  ...amendment,
  status: 'APPROVED',
  approvedBy: approver,
  approvedAt: new Date(),
});

export const reject = (
  amendment: AmendmentUnderReview, 
  reason: string
): AmendmentRejected => ({
  ...amendment,
  status: 'REJECTED',
  rejectionReason: reason,
});

// ---------------------------------------------------------
// 5. Forma final do Exhaustive Switch
// Garante em tempo de compilação que nenhum estado foi esquecido [5].
// ---------------------------------------------------------

export const processAmendment = (amendment: Amendment): void => {
  switch (amendment.status) {
    case 'DRAFT':
      // TypeScript sabe que é AmendmentDraft. Sem propriedades extras.
      console.log(`Draft criado em ${amendment.createdAt}`);
      break;

    case 'REVIEW':
      // Seguro acessar submittedBy e submittedAt [4]
      console.log(`Em revisão por ${amendment.submittedBy}`);
      break;

    case 'APPROVED':
      // Seguro acessar approvedBy e approvedAt
      console.log(`Aprovado por ${amendment.approvedBy} em ${amendment.approvedAt}`);
      break;

    case 'REJECTED':
      // Seguro acessar rejectionReason
      console.log(`Rejeitado pelo motivo: ${amendment.rejectionReason}`);
      break;

    default:
      // Exhaustiveness Checking com 'never' [5]
      // Se um novo status for adicionado na union 'Amendment' no futuro 
      // e não for tratado aqui, o compilador TypeScript vai falhar [15].
      const _exhaustiveCheck: never = amendment;
      throw new Error(`Estado não tratado para o Amendment: ${_exhaustiveCheck}`);
  }
};
O Racional (Checklist do PR)
A Decisão sobre a Dupla Taxonomia: O código não usa uma entidade de "dados de banco" poluída com opcionais (ex.: approvedBy?: UserId) e flags booleanas (ex.: isUnderReview). A estrutura força o TypeScript a reconhecer o estado e a permissão dos dados acoplados
. Se houver campos comuns extensos, usa-se intersecções de tipo (AmendmentBase & ...) para reduzir boilerplate
.
Tipos Refinados por Estado e Transições Tipadas: Você não pode passar um AmendmentDraft para a função de approve. O design do domínio impede a ação ilegal já no momento em que você a escreve em seu editor
.
Parse, don't validate: Transições como submitForReview funcionam como "parsers" de domínio
. Elas recebem dados menos estruturados de um estado inicial e retornam dados garantidos pela estrutura de um novo estado com as devidas provas anexadas no tipo (ex: submittedAt)
.
O Exhaustive Switch com never: O bloco default atribui o shape da variável ao tipo never
. Como apenas never é compatível com never, se você esquecer de atualizar essa função ao adicionar um novo estado no futuro, a compilação quebra imediatamente

## Avaliação crítica do host

### O que ficou impecável ✅

1. **Eixo 1 — Aninhamento defendido com argumento sólido.** PhD ancorou em "Composição em todo lugar" (FP). Ciclo de vida governa transições (3 estados); kind governa conteúdo (4 tipos). Aninhamento > cross-product de 12 tipos.

2. **Eixo 2 — Defesa robusta da dupla taxonomia.** Três argumentos:
   - Conceitos categoricamente distintos (administrativo vs matemático/financeiro).
   - Limite de consistência entre agregados (Ports & Adapters interno).
   - **Evolução assimétrica** (argumento novo que eu não tinha visto):
     - Um Amendment pode gerar 2+ ContractAdjustments num só ato (reajuste + adição).
     - Um ContractAdjustment pode existir **sem** Amendment (decisão judicial, correção do sistema).

   Esse 3º ponto destrói a leitura (B) — o mapeamento **não é** 1:1 quando consideramos o futuro do domínio. **Mantém `ContractAdjustment`.**

### Tensões identificadas — 4 ⚠️

#### T1 — Template ignorou o eixo `kind` (crítico)

Snippet do PhD modelou apenas `Amendment = AmendmentDraft | AmendmentUnderReview | AmendmentApproved | AmendmentRejected` — **só status**. Nenhum `Addition | Suppression | TermChange | Misc`. PhD defendeu aninhamento em texto mas **não o implementou** no template.

**Resolução do host:** apliquei o aninhamento que ele defendeu (template definitivo abaixo).

#### T2 — Template não usa `Result<T, E>` nas transições (crítico)

```ts
// Snippet do PhD:
export const submitForReview = (
  amendment: AmendmentDraft,
  user: UserId,
): AmendmentUnderReview => ({ ... });  // ← sem Result!
```

Viola completamente Bloco D + Bloco I. Transições do domínio podem falhar (data inválida, invariante violada). Sem `Result`, não há sinalização de falha sem `throw`.

**Resolução do host:** todas transições do template definitivo retornam `Result<NewState, AmendmentError>`.

#### T3 — **CONTRADIÇÃO**: PhD usou `throw` no exhaustive switch (crítico)

Eu mostrei na pergunta:

> *CLAUDE.md raiz: "Nunca usar `default: throw` — usar `default: { const _: never = x; return _; }` ou omitir default."*
> *TS handbook §709 confirma: `return _exhaustiveCheck;` (que é `never`, assignable a tudo) — sem throw.*

E o PhD respondeu com:

```ts
default:
  const _exhaustiveCheck: never = amendment;
  throw new Error(`Estado não tratado para o Amendment: ${_exhaustiveCheck}`);  // ← THROW!
```

**Exatamente o pattern que eu apresentei como errado.** Ignorou a cobrança e voltou ao throw.

**Resolução autoritativa do host:** o CLAUDE.md raiz é o juiz. Não precisa nova rodada com o PhD — a regra está cravada. Forma canônica:

```ts
// Opção A (preferível): omitir default
switch (amendment.status) {
  case 'PendingWithoutDocument': return …;
  case 'PendingWithDocument':    return …;
  case 'Homologated':            return …;
}
// Sem default. TS reclama se adicionar novo estado e não tratar (noFallthroughCasesInSwitch + retorno explícito).

// Opção B (quando o leitor precisa de pista visual): default com return _
switch (amendment.status) {
  case 'PendingWithoutDocument': return …;
  case 'PendingWithDocument':    return …;
  case 'Homologated':            return …;
  default: {
    const _exhaustiveCheck: never = amendment;
    return _exhaustiveCheck;  // ← return, NÃO throw
  }
}
```

**Sobre `assertNever`:** PhD começou *"é impossível implementar um helper assert..."* (frase cortada). Tecnicamente, `assertNever(x: never): never` **exige** `throw` (TS rejeita função `never` sem corpo). **Logo, `assertNever` viola "zero throw" e fica banido do domínio.** A regra final: `return _exhaustiveCheck;` direto no `default` ou omita o `default`.

#### T4 — Estados genéricos em vez dos nossos (médio)

PhD usou `DRAFT | REVIEW | APPROVED | REJECTED` e transitions `submitForReview`/`approve`/`reject` — template educacional, não específico do nosso `Amendment`. Nossos estados (Bloco D): `PendingWithoutDocument | PendingWithDocument | Homologated`. Nossas transitions: `create`/`attachSignedDocument`/`homologate`.

**Resolução do host:** substituí pelo nosso vocabulário no template definitivo.

---

### Template definitivo do `Amendment` (após correções do host)

```ts
// src/modules/contracts/domain/amendment/types.ts

import type { ContractId, DocumentId, UserRef, AmendmentId } from '../shared/ids.ts';
import type { NonZeroMoney } from '../shared/non-zero-money.ts';

// Núcleo comum a todos os estados — sem optionals
type AmendmentCore = Readonly<{
  id: AmendmentId;
  contractId: ContractId;
  amendmentNumber: string;
  description: string;
  createdAt: Date;
}>;

// Eixo KIND (ato administrativo) — aninhado dentro de cada estado
type AmendmentPayload =
  | Readonly<{ kind: 'Addition';    impactValue: NonZeroMoney }>
  | Readonly<{ kind: 'Suppression'; impactValue: NonZeroMoney }>
  | Readonly<{ kind: 'TermChange';  newEndDate: Date }>
  | Readonly<{ kind: 'Misc' }>;

// Eixo STATUS (ciclo de vida) — 3 tipos refinados; sem null
export type PendingWithoutDocument =
  AmendmentCore & AmendmentPayload & Readonly<{ status: 'PendingWithoutDocument' }>;

export type PendingWithDocument =
  AmendmentCore & AmendmentPayload & Readonly<{
    status: 'PendingWithDocument';
    signedDocumentRef: DocumentId;
  }>;

export type Homologated =
  AmendmentCore & AmendmentPayload & Readonly<{
    status: 'Homologated';
    signedDocumentRef: DocumentId;
    homologatedAt: Date;
    homologatedBy: UserRef;
  }>;

export type Amendment = PendingWithoutDocument | PendingWithDocument | Homologated;
```

```ts
// src/modules/contracts/domain/amendment/amendment.ts

import * as AmendmentError from './errors.ts';
import { type Result, ok, err } from '../../../../shared/result.ts';
import { isValidDate } from '../../../../shared/utils/date.ts';

// Construtor inicial — sempre sai PendingWithoutDocument
export const create = (
  input: CreateAmendmentInput,
): Result<PendingWithoutDocument, AmendmentError.AmendmentError> => {
  // Validação via combine() do Bloco I se houver multi-campo independente.
  // Tagged errors via Padrão D pros erros (Bloco D-followup).
  // …
};

// Transição: documento anexado. PhD aceita pelo tipo — não há "amendment-not-pending" possível.
export const attachSignedDocument = (
  a: PendingWithoutDocument,
  ref: DocumentId,
): Result<PendingWithDocument, AmendmentError.AmendmentError> =>
  ok({ ...a, status: 'PendingWithDocument', signedDocumentRef: ref });

// Transição: homologação. Aceita APENAS PendingWithDocument — impede em tipo "homologar sem documento".
export const homologate = (
  a: PendingWithDocument,
  by: UserRef,
  at: Date,
): Result<Homologated, AmendmentError.AmendmentError> => {
  if (!isValidDate(at)) return err(AmendmentError.invalidHomologatedAt(at));
  return ok({ ...a, status: 'Homologated', homologatedAt: at, homologatedBy: by });
};
```

```ts
// Exemplo de uso do exhaustive switch (sem throw, sem default — Opção A):

const describeAmendment = (a: Amendment): string => {
  switch (a.status) {
    case 'PendingWithoutDocument':
      return `Aditivo ${a.amendmentNumber} aguardando documento.`;
    case 'PendingWithDocument':
      return `Aditivo ${a.amendmentNumber} pronto para homologação.`;
    case 'Homologated':
      return `Aditivo ${a.amendmentNumber} homologado em ${a.homologatedAt.toISOString()}.`;
  }
  // Sem default. TS força exhaustividade via noFallthroughCasesInSwitch + retorno explícito.
};
```

## Rules destiladas (Bloco C — FECHADO ✅)

### DO

1. **(C1+C2)** Modelar agregado com 2 eixos discriminantes como **aninhamento** (1 union por status, cada estado carrega o kind como parte interna). Não cross-product.
2. **(C1+C2)** Estados ELIMINAM `null` — `signedDocumentRef: DocumentId | null` vira `PendingWithDocument & { signedDocumentRef: DocumentId }`.
3. **(C1+C2)** Transições retornam `Result<NewState, AggregateError>`. Operação proibida em runtime morre na assinatura.
4. **(C3)** **Dupla taxonomia legítima** quando os conceitos pertencem a agregados distintos (Amendment = ato administrativo; ContractAdjustment = efeito matemático no Contract). Mantém Ports & Adapters interno.
5. **(C3)** Função única de tradução: `Amendment.toAdjustments(homologated: Homologated): readonly ContractAdjustment[]` — **array** porque um Amendment pode gerar 2+ adjustments (argumento da evolução assimétrica do PhD).
6. **(C4)** Exhaustive switch usa **omissão de default** (preferível) ou `default: { const _ = x; return _; }`. **Nunca** `throw new Error(...)`.

### DON'T

1. **(C1+C2)** Cross-product de dois eixos discriminantes — duplica máquina de estado em cada kind.
2. **(C1+C2)** `signedDocumentRef: DocumentId | null` ou similar — optional-as-state.
3. **(C1+C2)** Transição retornando tipo direto sem `Result` — viola Bloco D + Bloco I.
4. **(C3)** Eliminar `ContractAdjustment` em nome de DRY mecânico — mapeamento Amendment↔Adjustment não é 1:1 no futuro.
5. **(C4)** `default: throw new Error(...)` — viola "zero throw" do CLAUDE.md raiz. **Contradição admitida nesta entrevista** (PhD usou no template após ser cobrado).
6. **(C4)** `assertNever(x: never): never` como helper — exige `throw` obrigatoriamente (TS rejeita função `never` sem corpo). Banido.

### CONSIDER

1. **(C1+C2)** `Extract<Amendment, { status: 'X' }>` como type helper se o aninhamento ficar verboso em consumidores.
2. **(C3)** Documentar a regra `Amendment → ContractAdjustment[]` em JSDoc do `toAdjustments` com os 3 casos: `1:1` (Addition→ValueIncrease), `1:N` (Renewal+Reajuste futuro), `0:1` (ContractAdjustment sem Amendment).

## Tickets confirmados — Bloco C FECHADO

| Ticket | Escopo | Dependências |
| :--- | :--- | :--- |
| **CTR-DOMAIN-STATE-MACHINE-AMENDMENT** (escopo refinado) | Refactor `Amendment` no template definitivo: aninhamento `status × kind`, transições tipadas, sem `null`. Mantém `ContractAdjustment` (dupla taxonomia). `Amendment.toAdjustments` retorna `readonly ContractAdjustment[]`. | TAGGED-ERRORS, INVARIANT-CONTEXTUAL (NonZeroMoney) |
| **CTR-DOMAIN-EXHAUSTIVE-SWITCH-FIX** (NOVO) | Remove `throw new Error(...)` de **todo** `default` exhaustive no domínio. Substitui por `return _exhaustiveCheck;` ou remove o `default` (Opção A preferida). Inclui `src/modules/contracts/domain/contract/contract.ts` e `amendment/amendment.ts`. | — (folha) |
| **CTR-SKILL-REFRESH-C** (NOVO) | `.claude/skills/ts-domain-modeler/SKILL.md §3.C — Discriminated Unions & Exhaustive Switch` com 6 DO + 6 DON'T + 2 CONSIDER. **Corrige a contradição da SKILL atual** com o CLAUDE.md raiz (`default: throw` → `return _;` ou omitir). | EXHAUSTIVE-SWITCH-FIX |

## Diagrama canônico — State Machine do `Amendment`

Inserido após troca meta de diagramas com o PhD (ver [`Pergunta_diagramas_meta`](./Pergunta_diagramas_meta_tec_lider_using_skill_ts-domain-modeler.md)). Versão **corrigida pelo host** — PhD esqueceu o eixo `kind`, trocou nomes de campos e inventou `uploadedAt`.

```mermaid
stateDiagram-v2
    direction TB

    [*] --> PendingWithoutDocument : create(input)

    state PendingWithoutDocument {
        note "AmendmentCore:\n  id: AmendmentId\n  contractId: ContractId\n  amendmentNumber: string\n  description: string\n  createdAt: Instant\n\n+ AmendmentPayload (eixo kind):\n  Addition { impactValue: NonZeroMoney }\n  | Suppression { impactValue: NonZeroMoney }\n  | TermChange { newEndDate: Instant }\n  | Misc {}" as N1
    }

    PendingWithoutDocument --> PendingWithDocument : attachSignedDocument(ref)

    state PendingWithDocument {
        note "Core + Payload +\n  signedDocumentRef: DocumentId" as N2
    }

    PendingWithDocument --> Homologated : homologate(by, at)

    state Homologated {
        note "Core + Payload +\n  signedDocumentRef: DocumentId +\n  homologatedAt: Instant +\n  homologatedBy: UserRef" as N3
    }

    Homologated --> [*]
```

## Cross-refs

| Pergunta | Conexão |
| :--- | :--- |
| [D2+D3+D4+D5](./Pergunta_D2_D3_D4_D5_tec_lider_using_skill_ts-domain-modeler.md) | State machine in types ratificada — C1+C2 é aplicação direta. |
| [D2+D3+D4+D5 followup](./Pergunta_D2_D3_D4_D5_followup_tec_lider_using_skill_ts-domain-modeler.md) | Padrão D pros erros (Bloco B alinhado). Erros do `Amendment` seguem `amendment/errors.ts` com free functions. |
| [B1+B2+B3](./Pergunta_B1_B2_B3_tec_lider_using_skill_ts-domain-modeler.md) | `NonZeroMoney` brandado é pré-requisito do template do `Amendment` (rota α). |
| [E3+I1+I3+A4](./Pergunta_E3_I1_I3_A4_tec_lider_using_skill_ts-domain-modeler.md) | Early return + narrowing nativo. C4 toca diretamente em "como narrowing por `kind` dispensa `default`". |
| [A1](./Pergunta_A1_tec_lider_using_skill_ts-domain-modeler.md) | `updateAggregate(prev, patch)` — com state machine, `update` é restrito por estado (não dá pra mudar `status` via patch arbitrário). |
| [A3](./Pergunta_A3_tec_lider_using_skill_ts-domain-modeler.md) | Não brandar agregado — `Amendment` (union de estados) fica protegido transitivamente pelos VOs nas folhas. |

## Tickets afetados

- **CTR-DOMAIN-STATE-MACHINE-AMENDMENT** (já existe no Bloco D) — esta pergunta define o escopo cirúrgico: o template, a decisão sobre cross-product vs aninhamento, e o destino do `ContractAdjustment`.
- **CTR-DOMAIN-EXHAUSTIVE-SWITCH-FIX** (NOVO) — remove `throw` dos `default` exhaustive em todo o domínio + atualiza `.claude/skills/ts-domain-modeler/SKILL.md` pra usar o pattern correto (omitir ou `return _;`). Pequeno mas espalhado.
- **CTR-SKILL-REFRESH-C** (NOVO) — atualiza `SKILL.md §3.C — Discriminated Unions & Exhaustive Switch` com regras destiladas + a decisão sobre dupla taxonomia.

## O que esperar da resposta

1. Veredito sobre Eixo 1 (template do `Amendment` em union + cross-product vs aninhamento).
2. Decisão clara sobre Eixo 2 (`ContractAdjustment` mantém ou elimina) com critério geral.
3. Confirmação do caminho canônico de exhaustive switch + posição sobre `assertNever`.
4. (Bônus) Snippet completo do `amendment/types.ts` + `amendment/amendment.ts` refatorados.

Se a resposta vier completa, **Bloco C fecha** e libera 2 tickets novos (+ refina escopo de `CTR-DOMAIN-STATE-MACHINE-AMENDMENT`). Faltarão apenas E1, E2, F, G, H, J, K, L como blocos verdadeiramente abertos.
