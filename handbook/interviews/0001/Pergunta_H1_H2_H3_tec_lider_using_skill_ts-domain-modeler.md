---
entrevista: 0001
bloco: H
pergunta: H1+H2+H3
título: "Organização do módulo — granularidade em domain/, localização de ports, shared vs kernel"
skill: ts-domain-modeler  # com cross-skill ports-and-adapters + modular-monolith
status: respondida-com-ajustes-do-host
agrupa:
  - H1  # agregado-por-pasta vs feature slice vs arquivo único
  - H2  # ports em domain/ vs application/ — Cockburn vs Evans clássicos
  - H3  # shared/ vs kernel/ — VOs domínio puro vs VOs que apontam pra infra
---

# Pergunta_H1_H2_H3_tec_lider_using_skill_ts-domain-modeler

> **Status:** respondida-com-ajustes-do-host — PhD entregou veredito limpo nos 3 eixos (lembrete de diretrizes funcionou — sem contradições internas). Host aplicou **5 ajustes finos**: 2 de naming (manter `adapters/` em vez de `infra/`; `contracts/` plural em vez de `contract/` singular), 2 substantivos (incluir `amendment/repository.ts` faltante; manter `public-api/` por módulo em vez de `shared/events/` global), 1 omissão (`cli/` esquecido). **Bloco H FECHADO** com template definitivo do host.
> **Origem:** entrevista 0001
> **Skill canônica:** `ts-domain-modeler` (toca `ports-and-adapters` e `modular-monolith`)

---

## ⚠️ Diretrizes do projeto (lembrete para a resposta)

Os 5 blocos fechados desta entrevista (A, B, C, D, I) cravaram decisões que **a resposta desta pergunta precisa respeitar**. Antes de propor estrutura de pastas, lembrar:

### Decisões fixas do código

1. **ESM puro + NodeNext + `.ts` em todos imports relativos.** `import { Money } from '../shared/money.ts'` (com extensão).
2. **Padrão D (module-as-namespace)** — Bloco B. Consumo: `import * as Money from './money.ts'`. Cada arquivo de VO exporta **free functions**, nunca namespace-objeto (`export const Money = { … }` é PROIBIDO).
3. **Result homemade** — Bloco I. `shared/result.ts` único arquivo, ~50 LOC, exporta `ok`, `err`, `mapErr`, `combine`, `isOk`, `isErr`. Nenhuma dep externa (sem neverthrow, sem Effect).
4. **Tagged errors** — Bloco D + D-followup. Cada agregado tem `errors.ts` com **free functions** de case constructor. Consumo: `import * as ContractError from './errors.ts'`.
5. **State machine in types** — Bloco D2 + C. Agregados são union de estados refinados (`Amendment = PendingWithoutDocument | PendingWithDocument | Homologated`). Transições são funções totais.
6. **`shared/brand.ts` com `unique symbol` global** — Bloco B-followup. Brand helper centralizado, sem `declare const brand` espalhado.
7. **`shared/immutable.ts`** — Bloco B-followup. Facade que encapsula `Object.freeze` para constantes (`ZERO`, `EMPTY`).
8. **Mappers retornam `Result<Aggregate, RehydrationError>`** — Bloco A4. Moram em `adapters/persistence/mappers/`.
9. **Domínio 100% sync** — Bloco I. Application Layer (Imperative Shell, Mark Seemann) faz `await`.
10. **Dupla taxonomia mantida** — Bloco C3. `Amendment` (administrativo) ≠ `ContractAdjustment` (matemático). `Amendment.toAdjustments(homologated): readonly ContractAdjustment[]`.
11. **Exhaustive switch sem `throw`** — Bloco C4. Omitir `default` (preferível) ou `default: { const _ = x; return _; }`.

### Decisões fixas do projeto (CLAUDE.md raiz + ADRs)

12. **Modular monolith** (ADR-0006). Cada `src/modules/<bc>/` é um módulo isolado. Comunicação cross-módulo só via eventos (futuro outbox MySQL).
13. **Zero `throw`, zero `class`, zero `this`, zero `any`** — CLAUDE.md raiz.
14. **MySQL único** (ADR-0020) com Drizzle. S3/MinIO via `@aws-sdk/client-s3` (ADR-0019).
15. **Node 24 LTS + TS 6.0** (ADR-0009). `--experimental-strip-types`.
16. **CLI primária** — não há HTTP server ainda. Comandos da P.O. via `pnpm run cli:contracts -- <subcomando>`.

### Estrutura atual do código (ponto de partida)

```
src/modules/contracts/
├── domain/
│   ├── shared/{money, period, ids, bucket-name, storage-key, storage-ref}.ts
│   ├── contract/{types, events, errors, contract, repository, index}.ts
│   └── amendment/{types, events, errors, amendment, repository, index}.ts
├── application/
│   ├── ports/                 ← TODOS os ports aqui hoje
│   └── use-cases/
├── adapters/
│   ├── *.in-memory.ts
│   └── persistence/{schema, mappers, repositories, migrations}/
├── cli/
└── public-api/                ← (futuro) eventos cross-módulo
```

**Use estas diretrizes como restrições da resposta.** Se sua proposta colidir com alguma, sinalize e justifique o trade-off.

---

## Por que unificar H1+H2+H3?

Os 3 eixos decidem **a estrutura física do módulo `contracts`**:

| Eixo | O que decide |
| :---: | :--- |
| **H1** | Granularidade DENTRO de `domain/<aggregate>/` — quantos arquivos por agregado? |
| **H2** | Localização do `Repository` (port) — `domain/` ou `application/`? |
| **H3** | Composição de `domain/shared/` — VOs domínio puro coexistem com VOs que apontam pra infra (S3)? |

Decidir um sem decidir os outros gera dissonância:
- H1 + H2 — se Repository fica em `domain/contract/`, o número de arquivos por agregado aumenta. Afeta granularidade.
- H1 + H3 — se `shared/` for fragmentado em `kernel/` (puro) + `refs/` (infra), a estrutura de pastas muda em duas dimensões.
- H2 + H3 — `BucketName`/`StorageKey` (em `shared/` hoje) só fazem sentido **se o Storage port existir** — onde mora o port define onde moram seus VOs.

---

## Q (host) — versão formal

### Eixo 1 (H1) — Granularidade dentro de `domain/<aggregate>/`

Hoje há 4-6 arquivos por agregado:

```
domain/contract/
├── types.ts          # types refinados (após Bloco D2 + C)
├── events.ts         # ContractEvent union
├── errors.ts         # ContractError + free functions (Bloco D-followup)
├── contract.ts       # operações (parseActive, expire, terminate, applyHomologatedAdjustment)
├── repository.ts     # port (questão H2)
└── index.ts          # barrel
```

**Três opções:**

- **A — Manter (1 pasta por agregado, 4-6 arquivos canônicos).** Pra ler `homologate`, abro `amendment.ts` + `errors.ts` + `types.ts`.
- **B — Colapsar em arquivo único** (`contract.ts` com tudo: types + events + errors + operações). 600-800 linhas por agregado.
- **C — Feature slice por operação** (`homologate-amendment/{types, errors, operation}.ts`). Atomiza além do agregado.

**Perguntas:**

- **H1.a** — Qual opção defende, considerando que após Bloco C o `Amendment` virou union de 3 estados refinados, e cada operação é uma transição tipada (`attachSignedDocument: PendingWithoutDocument → PendingWithDocument`)? Aumentou ou diminuiu a coesão por arquivo?
- **H1.b** — Se for **A**, qual é o número-limite de linhas por arquivo antes de fragmentar? `amendment.ts` hoje tem ~150 linhas; pós-refactor (state machine + transições tipadas) tende a 300-400.
- **H1.c** — Se for **C** (feature slice), como casa com a regra D do Bloco B (free functions importadas como namespace)? `import * as homologateAmendment from './homologate-amendment.ts'` lê estranho.
- **H1.d** — Como sua resposta lida com o `index.ts` barrel? Hoje todo agregado tem um. Manter, eliminar (cada consumidor importa o arquivo específico via Padrão D), ou usar só pra o público externo do agregado?

### Eixo 2 (H2) — Onde moram os ports?

Hoje **TODOS** os ports moram em `application/ports/`:

```
application/ports/
├── contract-repository.ts
├── amendment-repository.ts
├── event-bus.ts
├── document-storage.ts
└── clock.ts
```

**Tensão entre escolas:**

| Autor | Posição |
| :--- | :--- |
| **Cockburn** (Ports & Adapters clássico, 2005) | Ports são definidos **pelo lado de dentro** — pelo domínio. `domain/contract/repository.ts`. |
| **Evans** (DDD, 2003) | Repository é parte do domínio. Service e Factory também. |
| **Modular monolith atual** (ADR-0006 + SKILL) | Ports em `application/`. Domínio não sabe que é persistido. |

**Proposta híbrida (host):** **Repository fica em `domain/<aggregate>/repository.ts`** (port por agregado — invariante de persistência do agregado), **outros ports** (EventBus, Storage, Clock — genéricos cross-agregado) **ficam em `application/ports/`**.

**Perguntas:**

- **H2.a** — Aprovas a regra híbrida ou defende a posição atual (todos em `application/`)? Argumento de cada lado.
- **H2.b** — Se aprovas híbrida, **como definir o critério objetivo** "port de agregado" vs "port genérico"? Heurística que sirva pra escolher onde colocar um novo port (ex.: `NumberSequencer` pra gerar `amendmentNumber`)?
- **H2.c** — Como isso casa com a regra do Bloco H (modular monolith, ADR-0006)? O domínio do módulo `contracts` pode declarar um `ContractRepository` em `domain/`, mas o adapter (Drizzle) implementa em `adapters/persistence/`. Imports atravessam camadas — risco?
- **H2.d** — `Clock` port (`getNow(): Date`) — Bloco G ainda não decidiu se vive em `domain/` ou `application/`. Sua proposta?

### Eixo 3 (H3) — `shared/` vs `kernel/`

Hoje em `domain/shared/`:

```
domain/shared/
├── money.ts            # VO domínio puro
├── period.ts           # VO domínio puro
├── ids.ts              # ContractId, AmendmentId, DocumentId, UserRef (puros)
├── bucket-name.ts      # VO que aponta pra S3/MinIO ← INFRA
├── storage-key.ts      # VO que aponta pra S3/MinIO ← INFRA
└── storage-ref.ts      # { bucket: BucketName; key: StorageKey } ← INFRA
```

**Cheiro:** VOs de domínio puro (`Money`, `Period`) coexistem com VOs que **apontam para recursos de infraestrutura** (S3). Os 3 últimos só existem porque o `Document Storage` port precisa de tipos pra falar.

**Três opções:**

- **A — Manter `shared/`** (tudo junto, sem distinção). Argumento: brand opaco torna `BucketName` e `Money` estruturalmente equivalentes no domínio.
- **B — Separar `domain/kernel/` (puro) + `domain/refs/` (apontam pra infra).** Argumento: clareza arquitetural — leitor vê imediatamente o que é conceito de negócio vs ref técnica.
- **C — Mover `bucket-name`/`storage-key`/`storage-ref` pra `application/ports/document-storage.types.ts`.** Argumento: se são tipos só do `DocumentStorage` port, mora junto do port.

**Perguntas:**

- **H3.a** — Qual opção? Cada uma tem trade-off entre coesão (B) e proximidade ao consumidor (C).
- **H3.b** — Se **C**, e Eixo 2 (H2) decidir que Storage port fica em `application/ports/`, então `BucketName` migra pra lá também. Coerente — port e seus tipos andam juntos. Concorda?
- **H3.c** — Eric Evans definiu "Shared Kernel" como **VOs compartilhados entre Bounded Contexts**. No nosso modular monolith, `Money` será reusado em Faturamento, Pagamento, Orçamento. Vale promover `Money`, `Period`, `Date-related` pra **`src/shared/kernel/`** (cross-module) — não só `src/modules/contracts/domain/shared/`?

### Pergunta unificadora

Existe um **layout arquitetural canônico para um módulo de DDD funcional em TS** — articulando granularidade (H1), localização de ports (H2) e composição de shared (H3) num conjunto coerente que sustente o template de Smart Constructor (Bloco B), tagged errors (Bloco D) e state machine in types (Bloco C)?

Se há, manda o template completo de árvore de pastas + critério pra cada decisão. Se é case-by-case, manda a **heurística** que governe as 3 dimensões juntas.

---

## Q (host) — versão narrativa (para colar em chat externo)

Cara, antes da pergunta, deixa eu te lembrar **das decisões já travadas** nesta entrevista pra você responder com as restrições em mente (sem reabrir contradições — aconteceu no Bloco C e quero evitar):

1. **Padrão D (module-as-namespace)** — free functions, `import * as Money from './money.ts'`. Sem `export const Money = { … }`.
2. **Result homemade** (`shared/result.ts`, ~50 LOC, sem deps).
3. **Tagged errors** em `errors.ts` por agregado, free functions de case constructor.
4. **State machine in types** — `Amendment = PendingWithoutDocument | PendingWithDocument | Homologated`.
5. **Dupla taxonomia mantida** — `Amendment` ≠ `ContractAdjustment`.
6. **Exhaustive switch sem `throw`** — `return _exhaustiveCheck;` ou omitir `default`.
7. **Domínio sync puro**, Application Layer faz `await`.
8. **Modular monolith** (ADR-0006) — comunicação cross-módulo via eventos.
9. **Zero `throw`, zero `class`, zero `this`, zero `any`** — CLAUDE.md raiz.

Agora a pergunta: **última decisão arquitetural macro** desta entrevista. 3 eixos de organização física:

**Eixo 1 — Granularidade dentro de `domain/<aggregate>/`.** Hoje:

```
domain/contract/
├── types.ts          # types refinados
├── events.ts         # ContractEvent union
├── errors.ts         # ContractError + free functions
├── contract.ts       # operações (parseActive, expire, …)
├── repository.ts     # port (questão do Eixo 2)
└── index.ts          # barrel
```

3 opções:
- **A — Manter** 4-6 arquivos por agregado (atual).
- **B — Colapsar** em arquivo único `contract.ts` com tudo (600-800 linhas).
- **C — Feature slice** por operação (`homologate-amendment/`).

Qual prefere, dado que após Bloco C as transições tipadas aumentaram a coesão (cada função aceita só um estado refinado)?

**Eixo 2 — Onde moram os ports?** Hoje **todos** em `application/ports/`. Mas Cockburn clássico diz "ports são definidos pelo lado de dentro = domínio". Minha proposta híbrida: **Repository fica em `domain/<aggregate>/`** (port de invariante do agregado), **outros ports** (EventBus, Storage, Clock — genéricos) **em `application/ports/`**.

Aprova ou defende a posição atual (tudo em `application/`)? Se aprova híbrida, qual o critério objetivo pra escolher entre os dois lados quando um port novo aparecer (ex.: `NumberSequencer`)?

**Eixo 3 — `shared/` vs `kernel/`.** Em `domain/shared/` hoje convivem:

```
money.ts, period.ts, ids.ts   ← VOs domínio PURO
bucket-name.ts, storage-key.ts, storage-ref.ts   ← VOs que apontam pra S3 (INFRA)
```

Os 3 últimos só existem porque o `DocumentStorage` port precisa deles. 3 opções:
- **A — Manter junto** (tudo `shared/`).
- **B — Separar** `domain/kernel/` (puro) + `domain/refs/` (apontam pra infra).
- **C — Mover refs pra `application/ports/document-storage.types.ts`** (vivem junto do port).

E cross com Bounded Contexts futuros (Faturamento, Pagamento, Orçamento vão reusar `Money`, `Period`): vale promover esses VOs cross-module pra `src/shared/kernel/`? Eric Evans definiu "Shared Kernel" exatamente assim.

**Pergunta unificadora:** existe um **layout canônico de módulo DDD funcional em TS** — articulando os 3 eixos num conjunto coerente — ou é case-by-case com heurística? Se há canônico, manda template de árvore de pastas completa. Se case-by-case, manda a heurística.

Fecha esses 3 e a gente trava `SKILL.md §3.H — Organização de Módulo` + abre o ticket `CTR-DOMAIN-RESTRUCTURE` (se houver mudança de pasta). Faltarão E1/E2, F, G, J/K/L como blocos abertos — quase tudo do macro arquitetural resolvido.

## R (PhD)

**Decisão do Eixo 1: Opção A — Manter (4-6 arquivos por agregado)**

A abordagem de colapsar tudo em um único arquivo de 800 linhas (Opção B) vai contra a legibilidade, especialmente porque o TypeScript exige mais *boilerplate* do que linguagens como F# (onde o domínio inteiro costuma caber em poucas linhas). A separação por operações (Opção C) fragmenta excessivamente o agregado, quebrando a visão holística da sua State Machine e dificultando o reaproveitamento de tipos base. 

A Opção A é a que melhor se alinha com o **Padrão D (module-as-namespace)**. O arquivo `index.ts` atua como um *barrel*, permitindo que você consuma o agregado de forma limpa (`import * as Contract from './domain/contract'`). O arquivo `contract.ts` fica focado exclusivamente nas *free functions* de transição de estado, separando o comportamento da definição dos tipos refinados (`types.ts`) e dos erros (`errors.ts`).

**Decisão do Eixo 2: Abordagem Híbrida (Repository no Domínio, genéricos em Application)**

Aprovo fortemente a sua proposta híbrida. A arquitetura funcional é, em sua essência, Ports & Adapters (Hexagonal), onde o domínio puro é isolado do I/O impuro.

O **critério objetivo** para decidir onde um *port* mora é: **"O contrato deste port é ditado pelas regras de invariância e ciclo de vida de um Agregado específico?"**
*   **Sim → `domain/<aggregate>/`**. O `ContractRepository` só existe porque o agregado `Contract` precisa ser reidratado e persistido para garantir suas próprias regras de negócio. Ele é o *port* de estado do agregado.
*   **Não → `application/ports/`**. O `DocumentStorage`, `Clock`, e `EventBus` oferecem capacidades genéricas de I/O que a camada de Aplicação orquestra (*Imperative Shell*) para alimentar o domínio puro (*Functional Core*).

No caso do `NumberSequencer`: se for um gerador de IDs sequenciais genérico do sistema, vai para `application/ports/`. Se for um gerador com regras de negócio intrínsecas ao domínio (ex.: "A sequência de Contrato reinicia todo ano fiscal e tem um prefixo departamental"), ele se torna um serviço de domínio/port em `domain/contract/sequencer.ts`.

**Decisão do Eixo 3: Opção C (Mover refs para Application) + Promoção para `src/shared/kernel/`**

Vou cravar a **Opção C** para os VOs de infraestrutura e promover os VOs puros para o *Shared Kernel*.

Tipos como `bucket-name.ts` ou `storage-ref.ts` não são conceitos do negócio ("linguagem ubíqua"); são detalhes da tecnologia. Se apenas o port de `DocumentStorage` precisa deles, eles devem viver junto a esse port em `application/ports/document-storage.types.ts`. O domínio não deveria saber o que é um "bucket".

Para os VOs puros (`Money`, `Period`, `UserId`), **promova-os para `src/shared/kernel/`**. Em um *Modular Monolith* (ADR-0006), Bounded Contexts diferentes (Contratos, Faturamento) precisam compartilhar conceitos universais sem acoplar os módulos entre si. Eric Evans define o *Shared Kernel* exatamente como esse subconjunto de código e modelo de domínio que é rigidamente compartilhado e não pode ser alterado sem consulta a todas as equipes.

---

### O Layout Canônico de Módulo DDD Funcional em TS

Unindo as restrições (module-as-namespace, homemade Result, tagged errors, state machine in types, etc.) e as 3 decisões acima, **existe sim um layout canônico**. Ele cristaliza o *Functional Core, Imperative Shell*:

```text
src/
├── shared/                             # EIXO 3: O verdadeiro Shared Kernel puro
│   ├── kernel/                         
│   │   ├── money.ts                    # VOs puros reaproveitados cross-module
│   │   ├── period.ts
│   │   └── ids.ts
│   ├── result.ts                       # Homemade Result (~50 LOC)
│   └── events/                         # Contratos de eventos cross-module (ADR-0006)
│
└── modules/
    └── contract/                       # Bounded Context / Modular Monolith
        ├── domain/                     # FUNCTIONAL CORE (Sync, Puro, Zero Throw)
        │   ├── contract/               # EIXO 1: Opção A (Granularidade ideal)
        │   │   ├── types.ts            # State Machine e Tipos Refinados
        │   │   ├── errors.ts           # Tagged errors (free functions)
        │   │   ├── events.ts           # ContractEvent union
        │   │   ├── repository.ts       # EIXO 2: Port de invariante do agregado
        │   │   ├── contract.ts         # Free functions puras (parse, transições)
        │   │   └── index.ts            # Padrão D: export * as Contract
        │   │
        │   └── amendment/              # Dupla taxonomia mantida
        │       ├── types.ts            # PendingWithoutDocument | Homologated...
        │       ├── errors.ts
        │       ├── amendment.ts        # Transições tipadas de Amendment
        │       └── index.ts            # Padrão D: export * as Amendment
        │
        ├── application/                # IMPERATIVE SHELL (Async/Await, I/O)
        │   ├── ports/                  # EIXO 2: Ports genéricos da aplicação
        │   │   ├── document-storage.ts # Interface do Port
        │   │   ├── document-storage.types.ts # EIXO 3: Opção C (bucket-name vive aqui!)
        │   │   └── event-bus.ts
        │   │
        │   └── use-cases/              # Orquestra Ports -> Chama Domínio Puro -> Salva
        │       └── homologate-amendment.ts
        │
        └── infra/                      # Adapters impuros
            ├── repositories/           # Implementa domain/contract/repository.ts
            └── storage/                # Implementa application/ports/document-storage.ts
```

Esta árvore trava todos os eixos e atende à heurística de "Parse, don't validate". O I/O fica nas bordas (Infra e Use Cases), enquanto o Domínio é 100% puro e focado em modelar o negócio matematicamente e sem exceções.

Pode travar a `SKILL.md §3.H — Organização de Módulo` e abrir o ticket `CTR-DOMAIN-RESTRUCTURE` para realocar os diretórios com base neste template exato.

## Avaliação crítica do host

### O que ficou impecável ✅

1. **Eixo 1 — Opção A defendida com bom critério.** TS exige mais boilerplate que F#; arquivo único de 800 linhas fere legibilidade; feature slice fragmenta a state machine. Manter 4-6 arquivos por agregado.
2. **Eixo 2 — Critério objetivo cristalino:** *"O contrato deste port é ditado pelas regras de invariância e ciclo de vida de um Agregado específico?"* Sim → `domain/<aggregate>/`; Não → `application/ports/`. Aplicável a qualquer port futuro.
3. **NumberSequencer como exemplo:** genérico (no Application) vs com regras de negócio (no Domain) — heurística concreta.
4. **Eixo 3 — Opção C + promoção para `src/shared/kernel/`.** Coerente com Eric Evans (Shared Kernel cross-BC) e ADR-0006 (modular monolith). `BucketName`/`StorageKey` viram tipos do Storage port (não do domínio).
5. **Lembrete de diretrizes funcionou.** Diferente do Bloco C (onde PhD usou `throw` contra cobrança explícita), aqui não há contradições internas.

### Ajustes do host — 5 ⚠️

#### T1 — Naming: `infra/` → `adapters/` (cosmético mas crítico)

Template do PhD usou `src/modules/contract/infra/`. Mas o CLAUDE.md raiz e ADR-0006 cravam `adapters/` como nome canônico. Manter consistência com convenção do projeto.

**Resolução:** `adapters/` (não `infra/`).

#### T2 — Naming: `contract/` → `contracts/` (cosmético)

PhD usou `src/modules/contract/` (singular). Projeto usa `src/modules/contracts/` (plural — vide CLAUDE.md raiz "módulo Contratos / Contracts"). Mantém plural.

**Resolução:** `contracts/`.

#### T3 — `amendment/repository.ts` ausente do template (substantivo)

Template mostra `contract/repository.ts` mas `amendment/` não tem `repository.ts`. Pelo próprio critério H2 do PhD ("contrato ditado por invariância de agregado"), `Amendment` tem state machine própria com 3 estados refinados → tem invariância → tem port próprio.

**Resolução:** incluir `domain/amendment/repository.ts` no template. (Note: `AmendmentRepository` já existe no código atual.)

#### T4 — `shared/events/` global vs `public-api/` por módulo (substantivo)

PhD propôs `src/shared/events/` para contratos de eventos cross-module. Mas o ADR-0006 + CLAUDE.md raiz prescrevem que **cada módulo é dono dos eventos que emite**, expostos via `public-api/` do próprio módulo. Outros módulos **consomem** os eventos via subscribe ao port do outro módulo (futuro outbox MySQL).

Argumento estrutural: `shared/events/` global apaga ownership do evento. No modular monolith, isolamento exige que o módulo dono do conceito seja dono do evento. Quando o módulo Faturamento ouvir `ContractCreated`, ele lê de `src/modules/contracts/public-api/events.ts` — não de `src/shared/events/`.

**Resolução:** manter `src/modules/<bc>/public-api/` por módulo. Eliminar `src/shared/events/` global do template.

#### T5 — `cli/` omitido (omissão)

PhD não mencionou onde fica o CLI. O projeto tem CLI primária (não há HTTP server ainda — diretriz #16 que enviei). Mora em `src/modules/contracts/cli/`.

**Resolução:** incluir `cli/` no template.

---

### Layout canônico definitivo (host, após ajustes)

```text
src/
├── shared/                                  # Shared Kernel verdadeiro (cross-BC)
│   ├── kernel/                              # VOs puros reusados cross-module (Evans Shared Kernel)
│   │   ├── money.ts                         # promovido de modules/contracts/domain/shared/
│   │   ├── period.ts
│   │   └── ids.ts                           # tipos genéricos (UserRef) reusáveis
│   ├── brand.ts                             # Brand<T, K> com unique symbol global (Bloco B-followup)
│   ├── immutable.ts                         # immutable() / deepImmutable() facade (Bloco B-followup)
│   └── result.ts                            # Homemade Result (~50 LOC, Bloco I)
│
└── modules/
    └── contracts/                           # Bounded Context (PLURAL, ADR-0006)
        ├── domain/                          # FUNCTIONAL CORE (sync, puro, zero throw)
        │   ├── shared/                      # VOs específicos do BC contracts (não-cross)
        │   │   ├── contract-id.ts           # IDs específicos do módulo
        │   │   ├── amendment-id.ts
        │   │   ├── document-id.ts
        │   │   ├── non-zero-money.ts        # subtype contextual (Bloco D5 rota α)
        │   │   └── contract-status.ts       # status literal union refinado
        │   │
        │   ├── contract/                    # Agregado Contract (Bloco C — state machine)
        │   │   ├── types.ts                 # Active | Expired | Terminated (union refinada)
        │   │   ├── errors.ts                # tagged errors via free functions (Padrão D)
        │   │   ├── events.ts                # ContractEvent union (domínio interno)
        │   │   ├── repository.ts            # port — invariância do agregado (Eixo 2 H2)
        │   │   ├── contract.ts              # transições puras (parseActive, expire, ...)
        │   │   └── index.ts                 # barrel — export * as Contract (Padrão D)
        │   │
        │   └── amendment/                   # Agregado Amendment (state machine + kind aninhado)
        │       ├── types.ts                 # PendingWithoutDocument | PendingWithDocument | Homologated
        │       ├── errors.ts                # tagged errors via free functions
        │       ├── events.ts                # AmendmentEvent union
        │       ├── repository.ts            # ← INCLUÍDO (T3): port por invariância de Amendment
        │       ├── amendment.ts             # transições tipadas (create, attachSignedDocument, homologate)
        │       └── index.ts                 # barrel — export * as Amendment
        │
        ├── application/                     # IMPERATIVE SHELL (async/await, I/O orquestrado)
        │   ├── ports/                       # ports GENÉRICOS (Eixo 2 H2)
        │   │   ├── document-storage.ts      # interface do port
        │   │   ├── document-storage.types.ts # ← BucketName, StorageKey, StorageRef (Eixo 3 H3, Opção C)
        │   │   ├── event-bus.ts             # publisher local (entre agregados do mesmo módulo)
        │   │   └── clock.ts                 # Clock port (Bloco G, pendente refinamento)
        │   │
        │   └── use-cases/                   # orquestração: ports → domain → save
        │       ├── create-contract.ts
        │       ├── create-amendment.ts
        │       ├── attach-signed-document.ts
        │       ├── homologate-amendment.ts
        │       ├── get-contract.ts
        │       └── list-contracts.ts
        │
        ├── adapters/                        # ADAPTERS (CONVENÇÃO DO PROJETO — não "infra")
        │   ├── *.in-memory.ts               # adapters in-memory para testes/CLI
        │   └── persistence/
        │       ├── schema/                  # Drizzle schema MySQL
        │       ├── mappers/                 # rehydrateContract → Result<…, RehydrationError> (Bloco A4)
        │       ├── repositories/            # implementa domain/contract/repository.ts
        │       └── migrations/              # Drizzle migrations
        │
        ├── cli/                             # ← INCLUÍDO (T5): CLI da P.O. (CLI é UX primária — ADR-0019)
        │   ├── main.ts
        │   ├── registry.ts
        │   ├── parse-flags.ts
        │   ├── drivers/{memory,mysql}.ts
        │   ├── commands/                    # um arquivo por subcomando
        │   └── formatters/                  # PT-BR (date, money, error, contract, amendment)
        │
        └── public-api/                      # ← MANTIDO (T4): eventos cross-MÓDULO (não cross-BC)
            ├── events.ts                    # eventos públicos: ContractCreated, AmendmentHomologated, ...
            └── commands.ts                  # (futuro) commands aceitos de outros módulos
```

### Por que mudou em relação à proposta do PhD

| Decisão | PhD | Host (definitivo) | Justificativa |
| :--- | :--- | :--- | :--- |
| Pasta dos adapters | `infra/` | `adapters/` | Convenção do projeto (CLAUDE.md raiz). |
| Naming do módulo | `contract/` | `contracts/` | Plural — convenção do projeto. |
| `amendment/repository.ts` | Ausente | **Presente** | Critério H2 do próprio PhD aplica: Amendment tem invariância de ciclo de vida → tem port. |
| Eventos cross-module | `src/shared/events/` global | `src/modules/<bc>/public-api/` | ADR-0006 — cada módulo dono dos eventos que emite. Isolamento do modular monolith. |
| CLI | Omitido | `src/modules/contracts/cli/` | UX primária do projeto (CLI da P.O.). |
| `shared/<bc>/` interno | Ausente do template | Presente | VOs específicos do BC (não-cross) — `ContractId`, `AmendmentId`, `NonZeroMoney`, `ContractStatus` ficam aqui, não na kernel cross-BC. |

## Rules destiladas (Bloco H — FECHADO ✅)

### DO

1. **(H1)** **Granularidade canônica por agregado:** 4-6 arquivos (`types`, `errors`, `events`, `<aggregate>.ts`, `repository.ts`, `index.ts`). Pasta por agregado.
2. **(H1)** `index.ts` como barrel — exporta tudo do agregado pra consumo via `import * as Contract from './domain/contract/index.ts'` (Padrão D).
3. **(H2)** **Critério objetivo:** *"O contrato do port é ditado pelas regras de invariância e ciclo de vida de um Agregado?"* Sim → `domain/<aggregate>/repository.ts`. Não → `application/ports/`.
4. **(H2)** Repository sempre em `domain/<aggregate>/repository.ts` — não em `application/ports/`. Cada agregado é dono do seu port de persistência.
5. **(H2)** Ports genéricos (`DocumentStorage`, `EventBus`, `Clock`, `NumberSequencer` quando puramente técnico) em `application/ports/`.
6. **(H3)** **Tipos do port moram junto do port** — `BucketName`, `StorageKey` em `application/ports/document-storage.types.ts`, não em `domain/shared/`. Domínio não fala "bucket".
7. **(H3)** **VOs puros cross-BC promovidos para `src/shared/kernel/`** — `Money`, `Period`, `UserRef`. Evans Shared Kernel.
8. **(H3)** VOs específicos do BC (não-cross) ficam em `src/modules/<bc>/domain/shared/` — `ContractId`, `AmendmentId`, `NonZeroMoney`, `ContractStatus`.
9. **(H)** **`public-api/` por módulo** — cada módulo dono dos eventos que emite. Cross-módulo lê via `src/modules/<bc>/public-api/events.ts`. ADR-0006.
10. **(H)** **Naming canônico do projeto:** `adapters/` (não `infra/`), módulo no plural (`contracts/`), `cli/` como pasta de primeira classe.

### DON'T

1. **(H1)** Colapsar agregado em arquivo único de 600+ linhas — fere legibilidade.
2. **(H1)** Feature slice por operação (`homologate-amendment/`) — fragmenta a state machine do agregado.
3. **(H2)** Repository em `application/ports/` — confunde port de invariância (do domínio) com port de capacidade (da aplicação).
4. **(H3)** VOs de infra (`BucketName`, `StorageKey`) em `domain/shared/` — vazamento de jargão técnico no domínio.
5. **(H3)** `src/shared/events/` global cross-module — apaga ownership do evento; viola isolamento do modular monolith.
6. **(H)** Promover qualquer VO específico do BC para `src/shared/kernel/` — só vai pra Kernel o que é genuinamente reusado cross-BC.

### CONSIDER

1. **(H1)** Quando `<aggregate>.ts` ultrapassar ~400 linhas, fragmentar em `<aggregate>-transitions.ts` (transições tipadas) + `<aggregate>.ts` (operações invariantes). Continua coeso ao agregado, mas reduz peso por arquivo.
2. **(H2)** Quando aparecer port ambíguo (parte invariância, parte capacidade), instanciar o critério: pergunta "se eu trocar o agregado por outro, este port faz sentido?". Sim → application. Não → domain.

## Tickets confirmados

| Ticket | Escopo | Dependências |
| :--- | :--- | :--- |
| **CTR-DOMAIN-RESTRUCTURE** (NOVO) | Restruturar pastas: criar `src/shared/kernel/` (promove `Money`, `Period`, `UserRef`); mover `Repository` de `application/ports/` pra `domain/<aggregate>/repository.ts`; mover `bucket-name`/`storage-key`/`storage-ref` pra `application/ports/document-storage.types.ts`. **Mantém** `adapters/`, `contracts/` (plural), `public-api/` por módulo. | Todos os tickets de domain (não bloqueia, mas idealmente vai por último) |
| **CTR-SKILL-REFRESH-H** (NOVO) | `.claude/skills/ts-domain-modeler/SKILL.md §3.H — Organização de Módulo` com 10 DO + 6 DON'T + 2 CONSIDER + template de árvore de pastas definitivo. | CTR-DOMAIN-RESTRUCTURE |

## Diagrama canônico — Layout do módulo Contracts

Inserido após troca meta de diagramas com o PhD (ver [`Pergunta_diagramas_meta`](./Pergunta_diagramas_meta_tec_lider_using_skill_ts-domain-modeler.md)). Versão **corrigida pelo host** — PhD voltou a usar `infra/` em vez de `adapters/`, `contract/` singular, omitiu `cli/`, `public-api/`, `amendment/repository.ts`, e citou bloco errado em uma anotação.

```text
src/
├── shared/                                  ← [Bloco H3: Shared Kernel cross-BC]
│   ├── kernel/
│   │   ├── instant.ts                       ← [Bloco G β: Brand<number, 'Instant'>]
│   │   ├── money.ts                         ← VO puro reusado cross-BC
│   │   ├── period.ts                        ← VO puro reusado cross-BC
│   │   └── ids.ts                           ← genéricos: UserRef
│   ├── brand.ts                             ← [Bloco B-followup: Brand<T,K> via unique symbol global]
│   ├── immutable.ts                         ← [Bloco B-followup: immutable() facade Object.freeze]
│   └── result.ts                            ← [Bloco I: Result + mapErr + combine (~50 LOC, zero deps)]
│
└── modules/
    └── contracts/                           ← [Bounded Context (PLURAL, ADR-0006)]
        ├── domain/                          ← FUNCTIONAL CORE (sync, puro, zero throw)
        │   ├── shared/                      ← [Bloco H3: VOs específicos do BC]
        │   │   ├── contract-id.ts
        │   │   ├── amendment-id.ts
        │   │   ├── document-id.ts
        │   │   ├── non-zero-money.ts        ← [Bloco D5 rota α: subtype contextual]
        │   │   └── contract-status.ts
        │   │
        │   ├── contract/                    ← [Bloco H1 Opção A: granularidade 4-6 arqs]
        │   │   ├── types.ts                 ← [Bloco D2 + C: Active | Expired | Terminated]
        │   │   ├── errors.ts                ← [Bloco D + D-followup: tagged errors via free functions]
        │   │   ├── events.ts                ← ContractEvent union
        │   │   ├── repository.ts            ← [Bloco H2: port de invariância no domain]
        │   │   ├── contract.ts              ← [Bloco B + I: free functions, early return + narrowing]
        │   │   └── index.ts                 ← [Bloco B: export * as Contract (Padrão D)]
        │   │
        │   └── amendment/                   ← [Bloco C: state machine status × kind aninhado]
        │       ├── types.ts                 ← PendingWithoutDocument | PendingWithDocument | Homologated
        │       ├── errors.ts                ← [Bloco D-followup: tagged errors via free functions]
        │       ├── events.ts                ← AmendmentEvent union
        │       ├── repository.ts            ← [Bloco H2: Amendment tem state machine → tem port]
        │       ├── amendment.ts             ← transições: create / attachSignedDocument / homologate
        │       └── index.ts                 ← export * as Amendment
        │
        ├── application/                     ← IMPERATIVE SHELL (async/await, orquestração I/O)
        │   ├── ports/                       ← [Bloco H2 critério: não-invariância → application]
        │   │   ├── clock.ts                 ← [Bloco G G1.b: Clock { now: () => Instant }]
        │   │   ├── event-bus.ts
        │   │   ├── document-storage.ts      ← port interface
        │   │   └── document-storage.types.ts ← [Bloco H3 Opção C: BucketName, StorageKey, StorageRef]
        │   │
        │   └── use-cases/                   ← orquestra ports → domain → save
        │       ├── create-contract.ts
        │       ├── create-amendment.ts
        │       ├── attach-signed-document.ts
        │       ├── homologate-amendment.ts
        │       ├── get-contract.ts
        │       └── list-contracts.ts
        │
        ├── adapters/                        ← [convenção do projeto — NÃO "infra/"]
        │   ├── *.in-memory.ts               ← adapters in-memory para testes/CLI
        │   └── persistence/
        │       ├── schema/                  ← Drizzle MySQL
        │       ├── mappers/                 ← [Bloco A4: rehydrate*(row) → Result<Aggregate, RehydrationError>]
        │       ├── repositories/            ← implementa domain/<aggregate>/repository.ts
        │       └── migrations/
        │
        ├── cli/                             ← [UX primária do projeto — CLI da P.O.]
        │   ├── main.ts
        │   ├── registry.ts
        │   ├── parse-flags.ts
        │   ├── drivers/{memory,mysql}.ts
        │   ├── commands/
        │   └── formatters/                  ← PT-BR (date, money, error, contract, amendment)
        │
        └── public-api/                      ← [Bloco H: eventos cross-MÓDULO (ADR-0006)]
            ├── events.ts                    ← ContractCreated, AmendmentHomologated, ...
            └── commands.ts                  ← (futuro) commands aceitos de outros módulos
```

## Cross-refs

| Pergunta | Conexão |
| :--- | :--- |
| [B1+B2+B3 (followup)](./Pergunta_B1_B2_B3_followup_tec_lider_using_skill_ts-domain-modeler.md) | Padrão D em todo arquivo de VO — H1 herda essa restrição. |
| [D2+D3+D4+D5 (followup)](./Pergunta_D2_D3_D4_D5_followup_tec_lider_using_skill_ts-domain-modeler.md) | `errors.ts` por agregado — H1 herda. |
| [C1+C2+C3+C4](./Pergunta_C1_C2_C3_C4_tec_lider_using_skill_ts-domain-modeler.md) | State machine em union — afeta granularidade do `<aggregate>.ts` (transições por estado). |
| [A4](./Pergunta_A4_tec_lider_using_skill_ts-domain-modeler.md) | Mappers em `adapters/persistence/mappers/` — H1 NÃO toca em `adapters/` mas H2 sim (port que mapper implementa). |
| [E3+I1+I3+A4](./Pergunta_E3_I1_I3_A4_tec_lider_using_skill_ts-domain-modeler.md) | `shared/result.ts` único arquivo — exemplo concreto de "arquivo único bem dimensionado" pra H1. |

## Tickets que vão sair (provisório)

- **CTR-DOMAIN-RESTRUCTURE** — se houver mudança de pasta (mover Repository pra domain/, mover refs de storage, criar kernel/). Sem mudança = não tem ticket.
- **CTR-SKILL-REFRESH-H** — `.claude/skills/ts-domain-modeler/SKILL.md §3.H — Organização de Módulo` com o layout canônico.

## O que esperar da resposta

1. Veredito sobre Eixo 1 (granularidade) + critério.
2. Posição sobre Eixo 2 (Repository em domain ou application) + heurística pra ports novos.
3. Composição de `shared/` (Eixo 3) + decisão sobre Shared Kernel cross-module.
4. (Bônus) Template completo de árvore de pastas do módulo Contracts pós-refactor (com todos os 13 tickets em fila aplicados).

Se a resposta vier completa, **Bloco H fecha** e libera o último ticket arquitetural macro. Faltarão apenas refinamentos (E1/E2, F, G, J/K/L).
