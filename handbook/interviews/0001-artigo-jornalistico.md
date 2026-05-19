---
título: "Artigo — Como o domínio do core-api foi para o divã: a entrevista que reescreveu 105 regras em 36 horas"
gênero: "long-form jornalístico / making-of técnico"
data_publicação: 2026-05-19
entrevista_origem: 0001-functional-ddd-domain-refresh.md
status: PUBLICADO
autoria: "Redação interna — Engenharia do ERP Bem Comum"
público_alvo: "Quem entrar no repositório daqui a 6 meses e quiser saber por que as coisas estão como estão sem ler 7 mil linhas de Q&A"
---

# Como o domínio do core-api foi para o divã

> **Subtítulo:** Num intervalo de 36 horas (18 a 19 de maio de 2026), o time submeteu o módulo *Contracts* a um interrogatório linha-a-linha — branded types, máquinas de estado, ergonomia funcional, layout de pastas. Saíram 105 regras canônicas, 21 tickets coordenados, 3 diagramas e uma admissão pública: o PhD convidado contradisse o CLAUDE.md raiz num `default: throw`. Reconstituição dos bastidores.

---

## I. O lide

Numa terça-feira fria de maio, o tech lead do **core-api** abriu o arquivo `src/modules/contracts/domain/contract/contract.ts` e fez uma coisa que poucos engenheiros se permitem em horário comercial: passou o dedo nas linhas 67, 96, 118, 152, 162, 180 e 187. Todas tinham o mesmo padrão — `as unknown as ContractEntity`. Sete vezes. Sempre que o agregado mudava de estado. Sempre apagando o tipo antes de recarimbá-lo.

"Aceitável como preço do brand", anotou no caderno, "ou pegada de boilerplate que mascara erros?"

A pergunta sozinha já bastaria para uma reunião de 40 minutos. O que aconteceu nas 36 horas seguintes foi diferente: 12 blocos temáticos abertos, 50+ perguntas formais numeradas (`A1`, `A2`, `B1+B2+B3`, `D5.x/y/z/w`), um PhD em modelagem funcional encarnado como interlocutor, três voltas de follow-up, uma tabela canônica de 105 entradas, 21 tickets na pipeline e uma decisão administrativa rara: **fechar a entrevista com status imutável** e abrir a 0002 só quando o outbox MySQL voltar à mesa.

Esta é a história desse interrogatório.

---

## II. Os personagens

**O host.** Senior TS, praticante da SKILL `ts-domain-modeler` há ~18 meses, dono do CLAUDE.md raiz do core-api. Levou para a sala um desenho que **funcionava** — branded types em `shared/brand.ts`, smart constructors no padrão namespace-objeto (`export const Money = { fromCents, … }`), discriminated unions com switch exaustivo sem `default`, erros como string literals kebab-case, ports em `application/ports/`. Funcionava. Mas relendo linha a linha, "aparecem suspeitas de cheiro que serão submetidas a auditoria".

**O convidado.** Um PhD em modelagem funcional, referências carregadas: Scott Wlaschin (*Domain Modeling Made Functional*), Alexis King ("Parse, don't validate"), LangSec (shotgun parsing), Eric Evans (DDD), Alistair Cockburn (Ports & Adapters). Função: dizer **não** quando precisasse. E disse. Mas também sub-entregou em momentos críticos — e o host chamou, na cara, as cinco vezes em que isso aconteceu.

**A regra do jogo.** Cada pergunta vivia num arquivo `.md` próprio em `handbook/interviews/0001/`, numerada, datada, com seções fixas: pergunta, resposta, rules destiladas (DO/DON'T/CONSIDER), tickets derivados, cross-references. **Quem fecha um bloco assume que ele vira imutável.**

---

## III. Bloco A — O cast que mentia sete vezes

A primeira pergunta foi a mais simples e a mais cara.

**Q (host, A1):** "O `Brand<>` por construção exige um cast em algum ponto — mas aqui o cast acontece **toda vez que o agregado muda de estado**, e o objeto passa por `as unknown` (apagando o tipo) antes de virar `ContractEntity`. Isso bypassa qualquer narrowing que o TS poderia oferecer."

**R (PhD, A1):** "É boilerplate perigoso." O TS remove `as` em tempo de compilação sem verificação em runtime — desativa excess property checking, perde aviso quando se esquece de atualizar uma propriedade. O convidado defendeu o helper `updateContract(prev, patch)` com `Partial<Unbrand<T>>` — o compilador volta a olhar chave por chave, e o cast vira **único e auditado**.

Depois, A3 derrubou um pilar: **brandar agregado não faz sentido.** "Agregado tem ciclo de vida e mutações de estado constantes; VO brandado prova validação atômica e imutável; agregado, não." Tradução: o brand de `Contract` e `Amendment` foi o que criou a necessidade dos sete casts em cascata.

A4, o follow-up que o host escreveu pensando no Drizzle, fechou o ciclo: **todo mapper de persistência devolve `Result<Aggregate, RehydrationError>`**, montado apenas com smart constructors dos VOs internos. Sem `as`, sem `as unknown`. Banco de dados é fronteira externa — não confiar cegamente. Bloco A fechado com 5 DO, 4 DON'T, 1 CONSIDER, três tickets: `CTR-DOMAIN-DEBRAND-AGG`, `CTR-DOMAIN-MAPPER-RESULT`, `CTR-SKILL-REFRESH-A`.

> *"Em Ports & Adapters funcional, o BD vive no Imperative Shell; o domínio é o Functional Core puro. O mapper consome dados menos estruturados e os parseia para a estrutura forte do agregado."* — PhD, fechando A4.

---

## IV. Bloco B — O namespace-objeto e a palavra que ninguém queria escrever

Bloco B começou com três perguntas individuais (B1, B2, B3) e fundiu-se numa só. O motivo, registrado no documento: "as três decisões se trancam mutuamente (export pattern + parse pattern + identity pattern)".

A questão era estética e estrutural ao mesmo tempo. **B1**: `export const Money = { fromCents, zero, add, … }` cheira a OO disfarçado, perde tree-shaking, faz declaration merging informal com o tipo. **B2**: o smart constructor parseia ou valida? **B3**: `Money.zero()` precisa ser função se a constante frozen serve?

A resposta veio em **Padrão D — module-as-namespace**: free functions exportadas no topo do arquivo (`export const fromCents = …`), consumidas com `import * as Money from './money.ts'`. Tree-shaking volta. Jargão OO some. `Money.zero` deixa de ser função e vira constante via uma facade nova — e aí entrou o debate mais peculiar da entrevista.

**Como nomear a facade que esconde `Object.freeze`?** PhD propôs `realConst`. Host vetou. Tentaram `makeConst`, `strictConst`. Uma terceira voz (consultor convocado especificamente para isso) cravou: `immutable()` / `deepImmutable()`. Venceu por unanimidade técnica — "esconde o vocabulário de runtime atrás do vocabulário do domínio". `shared/immutable.ts` virou ticket próprio (`CTR-SHARED-IMMUTABLE`).

O bloco também ratificou: **brand via `unique symbol` global** em `shared/brand.ts`, com helpers `Brand<T, K>` e `BrandOf<T>` centralizados — chega de `declare const brand: unique symbol` espalhado por cada arquivo de VO. E migração via codemod `ts-morph` big-bang, num único ticket — proibido fazer migração dual.

Bloco B fechou com 9 DO, 9 DON'T, 4 CONSIDER, cinco tickets coordenados (`CTR-SHARED-IMMUTABLE`, `CTR-SHARED-BRAND-UNIQUE-SYMBOL`, `CTR-SHARED-VO-CANONICAL`, `CTR-DOMAIN-IMPORT-CODEMOD`, `CTR-SKILL-REFRESH-B`) e o **template canônico do Smart Constructor** pronto para virar `§3.B` da SKILL.

---

## V. Bloco C — A contradição admitida do PhD

Aqui veio o momento que será citado em todas as revisões futuras desta entrevista.

A pergunta C4 — switch exaustivo sem `default` — colidiu com a SKILL atual, que exigia `default: { const _: never = x; throw new Error('exhaustive'); }`. O CLAUDE.md raiz, por outro lado, era claro: **zero `throw` no domínio**. Pediu-se ao PhD o template do switch. O PhD entregou. **No `default`, tinha `throw`.**

O host marcou: "contradição admitida do PhD". Foi a primeira de cinco vezes que o convidado seria pego sub-entregando. O documento registra o episódio sem floreio: o `throw` viola "zero throw" do CLAUDE.md raiz; `assertNever(x: never): never` como helper também é proibido (exige `throw` para satisfazer o tipo `never`).

A regra final saiu cristalina: **omitir o `default`** (o compilador trava via `noFallthroughCasesInSwitch`) ou, quando o linter exigir, `default: { const _: never = x; return _; }`. Nunca `throw`. Ticket `CTR-DOMAIN-EXHAUSTIVE-SWITCH-FIX` abriu para varrer o domínio.

Bloco C também resolveu o desenho do `Amendment`: dois eixos (`status` × `kind`) **aninhados**, não cross-product. Status vira união refinada (`PendingWithoutDocument | PendingWithDocument | Homologated`), kind interno aninhado dentro. **Estados eliminam `null`** — `signedDocumentRef: DocumentId | null` deixa de existir como optional-as-state e passa a ser propriedade obrigatória do tipo refinado correto.

A "dupla taxonomia" entre `Amendment` (ato administrativo) e `ContractAdjustment` (efeito matemático no contrato) foi **ratificada como legítima**. Não é DRY mecânico — é evolução assimétrica. Um aditivo de renovação pode gerar N ajustes futuros; um ajuste pode existir sem aditivo. Ponte única: `Amendment.toAdjustments(homologated): readonly ContractAdjustment[]` (array, não optional).

---

## VI. Bloco D — Quando a string literal não cabia mais

D nasceu de um caso concreto. A P.O. tentou encerrar o contrato 042/2026 pela CLI, levou `'contract-cannot-expire-yet'`. A pergunta natural que ela fez não tinha resposta na string: **"então quando ele pode encerrar?"**

Três sintomas, registrados pelo host: (i) refetch fede — a informação estava na mão quando a regra rejeitou; (ii) se o predicado mudar para "buffer de N dias após o fim", a CLI passa a mentir sem ninguém perceber; (iii) não escala — toda nova regra com contexto vai querer caso especial.

A migração para **tagged records** virou inevitável. O PhD trouxe a chave categorial: tagged record não é classe disfarçada — é a representação de um *Choice Type* construído pelo operador "OR". Pacote de dados imutável, sem métodos, sem herança implícita. Conta um fato que ocorreu no domínio para o Imperative Shell (CLI, HTTP) agir.

O shape ficou `{ tag, …payload }`, **flat**, com case constructors como **free functions** em `errors.ts` por agregado — coerente com o Padrão D do Bloco B. Naming: PascalCase **adjetival/factual** (`ContractNotActive`), em paralelo com eventos PascalCase **passado** (`ContractCreated`). Payload carrega **as duas peças de evidência que colidiram** — estado atual + tentativa, sempre. Para o caso do contrato 042: `{ tag: 'ContractCannotExpireYet', currentEnd: Date, attemptedAt: Date }`.

**D2 — `assertActive` que não refinava** virou state machine em tipos. `Active`, `Expired`, `Terminated` como tipos refinados distintos. Transições são funções totais: `expire(c: ActiveContract): Result<ExpiredContract, …>`. O nome muda: `parseActive` em vez de `assertActive` — "Parse, don't validate" também na nomenclatura.

**D5 — invariantes contextuais.** O caso vivo era `Addition.impactValue.cents === 0`: `Money` legitimamente pode ser zero (saldo, total), mas um aditivo *Addition* com impacto zero não existe. Três rotas foram debatidas e ratificadas como **coexistentes**, não excludentes:

- **Rota α (VO como Prova).** `NonZeroMoney` brandado, reusável onde a invariante for atemporal.
- **Rota β (Agregado como Guardião).** Invariante contextual e mutável fica dentro do agregado.
- **Rota γ (Caso de Uso como Orquestrador).** Cada *kind* tem construtor próprio (`createAddition`, `createSuppression`, …), com o tipo de input declarando o invariante.

A heurística canônica nasceu daí: subtype (α/γ) quando a invariante for atemporal e composta; agregado (β) quando for contextual e mutável.

Bloco D fechou com 10 DO, 7 DON'T, 2 CONSIDER, cinco tickets (`CTR-DOMAIN-TAGGED-ERRORS`, `STATE-MACHINE-CONTRACT`, `STATE-MACHINE-AMENDMENT`, `INVARIANT-CONTEXTUAL`, `SKILL-REFRESH-D`).

---

## VII. Bloco G — `Date` foi expulso

Trechos curtos, decisão grande. `Date` é mutável, timezone-aware, IEEE-irregular — três problemas em três palavras. O domínio passou a usar `Instant = Brand<number, 'Instant'>` (epoch ms) em `src/shared/kernel/instant.ts`. O `Clock` virou port em `application/ports/clock.ts` com assinatura `{ now: () => Instant }`. `isValidDate` espalhado no domínio sumiu — validação concentrada no smart constructor `Instant.fromEpochMs` / `fromISO`.

---

## VIII. Bloco H — Onde o `Repository` realmente mora

Cockburn versus Evans, no original. A SKILL/CLAUDE.md tinha posto **todos** os ports em `application/`. Cockburn clássico diz que o port é definido pelo lado de dentro — pelo domínio.

A pergunta H2 foi resolvida com um **critério operacional**, não dogmático: *"port ditado por invariância/ciclo-de-vida de Agregado?"* — sim, vai pra `domain/<aggregate>/repository.ts`; — não, fica em `application/ports/`. Assim, `ContractRepository` voltou pro domínio (ele protege os invariantes do agregado). `EventBus`, `DocumentStorage`, `Clock` ficaram em `application/ports/` (são capacidades genéricas).

H3 resolveu a outra confusão: `shared/` misturava VOs puros (`Money`, `Period`) com VOs de infra (`BucketName`, `StorageKey`). A resposta foi cirúrgica:

- **`src/shared/kernel/`** — Evans Shared Kernel, só o que é genuinamente reusado cross-BC (`Money`, `Period`, `UserRef`, `Instant`).
- **`src/modules/<bc>/domain/shared/`** — VOs específicos do BC (`ContractId`, `NonZeroMoney`).
- **`application/ports/document-storage.types.ts`** — tipos do port moram **junto do port**. `BucketName` e `StorageKey` saíram do domínio.

Granularidade canônica: 4-6 arquivos por agregado (`types`, `errors`, `events`, `<aggregate>.ts`, `repository.ts`, `index.ts`). `index.ts` como barrel — habilita `import * as Contract from './contract/index.ts'`. Cada módulo dono dos eventos que emite, em `src/modules/<bc>/public-api/` (ADR-0006). Nada de `src/shared/events/` global.

---

## IX. Bloco I — A tentação do `Effect` e por que ela foi recusada

O bloco I tinha um convite implícito: `shared/result.ts` é homemade, sem `.map`, sem `.flatMap`, sem combinators. O domínio acumula `if (!x.ok) return x` em cascata. **Adotar `neverthrow`? `fp-ts`? `Effect`?**

A resposta foi um não categórico, com argumentos articulados em três camadas:

1. **Wlaschin:** "domínio não fala jargão de programador". `pipe`, `flow`, `compose`, `traverse`, `sequence` — todos viram jargão FP que o domínio não precisa.
2. **Mark Seemann:** "funções puras não se misturam com I/O". Domínio é 100% sync. Application Layer (Imperative Shell) lida com `Promise`. Banido `ResultAsync` no domínio.
3. **Argumento do compilador TS:** `Result<T, E>` é discriminated union. Early return + narrowing nativo fazem o que `andThen`/`flatMap`/`chain` fariam — sem importar biblioteca, sem aprender API com classes.

O que **entrou** no `shared/result.ts` (~50 LOC, zero deps): `ok`, `err`, `mapErr`, `combine`, `isOk`, `isErr`. E a entrevista cravou **três estratégias de composição coexistentes**, com nomes próprios:

- **α — Sequência dependente.** Cada passo depende do anterior. Use early return + narrowing.
- **β — Inputs independentes.** Valida vários campos em paralelo, coleta todos os erros. Use `combine`.
- **γ — Tradução de erro na fronteira.** Use `combine` + 1 `mapErr` no fim. Sem espalhar `if (!x.ok) return err(traduzir(x.error))` 10 vezes.

E uma regra surpreendentemente forte: **anti-pattern buscar técnica unificadora**. Aceitar α + β + γ coexistindo é a feature, não o bug.

---

## X. Bloco J — Imports: a opção C ganhou

J foi pequeno em texto, grande em diff potencial. O debate: imports relativos profundos (`../../../../shared/result.ts`) versus subpath imports em todo lugar (`#shared/result.ts`) versus barrel exports.

Veredito: **Opção C — relativos curtos dentro do BC, subpath cross-BC**. Argumento: subpath cross-BC vira **barreira arquitetural visível** ("este arquivo está cruzando a fronteira"); relativos intra-BC mantêm coesão e refactor interno simples.

Config no `package.json#imports`:
```json
"imports": {
  "#kernel/*": "./src/shared/kernel/*",
  "#shared/*": "./src/shared/*",
  "#src/*":    "./src/*"
}
```

`#src/*` fica por compatibilidade com `tests/`. `index.ts` barrel **mantido** — 1 por agregado, exporta tudo do agregado.

**J2** uniformizou `import type` quando o import é puro de tipo. O argumento do PhD originalmente apelava para transpilers (esbuild, swc, Babel), mas o host corrigiu na hora: o setup do projeto é **Node 24 + `--experimental-strip-types`** (Diretriz #18, ADR-0009) — sem transpiler externo. O argumento real é `verbatimModuleSyntax: true` no tsconfig: o TS emite **exatamente o que está escrito**, então `import { X }` (sem `type`) de um tipo puro tenta emitir `require('X')` em runtime e falha. **`import type` é regra de correção, não de transpiler.**

---

## XI. Bloco K — Os tipos avançados que não passaram no corte

Cinco tipos avançados foram interrogados. Quatro respostas concisas:

- **K1 — HKT approximations** (`hkt-toolbelt`, type lambdas à mão): **AVOID**. Defuncionalização hacky, jargão FP, complexity budget não compensa em 1 BC hoje (5+ no futuro). Coerente com Bloco I.
- **K2 — Template literal types para forçar prefixo PascalCase em tags de erro:** **CONSIDER**. Útil para autocomplete + autoenforcement. Frágil em refactor — se algum dia o agregado for renomeado, o template literal vira atrito.
- **K3 — Const type parameters (`<const T>`)** em smart constructor: **AVOID**. Coerção pra Brand já cobre; ruído visual desnecessário.
- **K5 — `satisfies` antes do brand cast:** **DO**. Pattern canônico `const x = { ... } satisfies RawShape as BrandedType` — força o compilador a validar chaves exatas (faltantes ou em excesso) **antes** de aplicar o cast. Cobre o ângulo cego do `as`.

K4 (`unique symbol` vs intersection) já tinha sido resolvido no follow-up do Bloco B: **vence `unique symbol` global**.

---

## XII. Bloco L — A síntese que o convidado entregou pela metade

Aqui foi onde o host marcou pela quinta vez que o PhD sub-entregava.

A última pergunta da entrevista pedia explicitamente: **L3 — a grande tabela** com todas as decisões dos 7 blocos fechados + as 20 diretrizes do projeto + J/K, classificadas em DO / CONSIDER / AVOID / DON'T. Estimativa: 50+ entradas.

O PhD entregou **16**. Dropou silenciosamente: `shared/immutable.ts`, mappers retornando `Result<Aggregate, RehydrationError>`, sync vs async, dupla taxonomia, `Instant`, layout canônico completo, `combine`+`mapErr`, early return + narrowing, wrapper-brand vs primitivo-brand, refinement `parseActive`, granularidade 4-6 arqs, `index.ts` barrel, tipos do port junto do port, `public-api/` por módulo, critério H2, heurística α/β/γ. E nos `DON'T` faltavam: `default: throw` exhaustive (a própria contradição admitida do PhD!), `assertNever`, function-as-constructor, identidade como função, brand-de-primitivo, migração dual, `ResultAsync` no domínio, `Effect`/`fp-ts`/`neverthrow`, `andThen`/`pipe`/`flow`/`compose`/`traverse`, `combine` em sequência dependente, `<aggregate>.ts` colapsado, feature slice, Repository em application, VOs infra em domain/shared, `shared/events/` global.

O documento registra a leitura sem reverência: *"Padrão observado pela 5ª vez nesta entrevista: PhD sub-entrega em síntese (igual diagramas e templates). Toda vez que peço o 'grande output unificado', chega um MVP que precisa de expansão do host."*

Solução: o host expandiu L3 sozinho. Resultado final canônico — **40 DO + 16 CONSIDER + 5 AVOID + 44 DON'T = 105 entradas classificadas.**

O PhD ainda ofereceu, no fim, gerar um "relatório consolidado em PDF". O host declinou: *"O master `0001-functional-ddd-domain-refresh.md` + 18 arquivos por pergunta + 3 diagramas + esta tabela L3 expandida já formam o manual canônico. Relatório PDF redundante."*

---

## XIII. Os top-3 que vão primeiro

L2 cravou a ordem de aplicação dos 21 tickets. Top-3 leverage:

1. **State Machine em Tipos** — `CTR-DOMAIN-STATE-MACHINE-CONTRACT` + `CTR-DOMAIN-STATE-MACHINE-AMENDMENT`. Transforma validação imperativa ("se o status é X, então Y está preenchido") em garantia de compilação. Elimina a possibilidade de acessar dados num estado que não os possui.
2. **Parse, don't validate** — `CTR-SHARED-VO-CANONICAL` + `CTR-SHARED-BRAND-UNIQUE-SYMBOL` + `CTR-SHARED-IMMUTABLE`. Mata o shotgun parsing. Valida nas bordas, confia no tipo branded no Functional Core.
3. **Zero `throw` / Result Homemade** — `CTR-SHARED-RESULT-COMBINATORS` + `CTR-DOMAIN-COMPOSE-REFACTOR`. Força caminhos de erro a fazerem parte da assinatura. Imperative Shell deixa de esconder efeitos colaterais.

Os 12+ tickets restantes seguem em paralelo onde as dependências permitirem. Última fase: os `CTR-SKILL-REFRESH-*` — atualizam a SKILL `ts-domain-modeler` seções A-L. Vão por último, depois que o código já estiver refletindo as decisões.

---

## XIV. Os 5 top cheiros (refinados pelo PhD, ordem corrigida)

L1, a única síntese em que o PhD não sub-entregou:

1. **`as unknown as` em transição de estado** — subversão total do sistema de tipos.
2. **Optional-as-state** (`isVerified?: boolean`, `signedDocumentRef: DocumentId | null`) — torna estados ilegais representáveis.
3. **Primitive Obsession** (`Date`, `string`, `number` crus — `ContractId` e `UserId` acidentalmente intercambiáveis).
4. **Namespace-objeto pattern** — mentalidade OO disfarçada.
5. **Ports de Domínio na Aplicação** — fere Inversão de Dependência.

O host havia chutado: `as unknown as`, optional-as-state, ports em application, Date cru, namespace pattern. O PhD substituiu "Date cru" por "Tipos Primitivos Crus" (mais amplo) e bumped "Ports na Aplicação" para 5º. Boa edição, registrou o documento.

---

## XV. O que ficou em aberto

A entrevista 0001 fechou com **10 dos 12 blocos**: A, B, C, D, G, H, I, J, K, L. E + F ficaram parciais:

- **E1, E2** — operações que devolvem `{ entity, event }` são mini event-sourcing-by-hand? `Acknowledgment` muda o agregado? Sem urgência — Bloco I já cravou o tratamento via early return.
- **F1, F2** — encoding e schema evolution de eventos. Importante quando o **outbox MySQL** voltar à mesa.

Quatro temas o host registrou que faltou perguntar:

1. **Observability** — logs estruturados para erros tagged. Como `tag: 'ContractCannotExpireYet'` chega ao Datadog/Sentry sem virar string serializada?
2. **Property-based testing** — `fast-check` para provar invariantes de smart constructor (Bloco B) e state machine (Bloco C).
3. **Event sourcing puro vs `{ entity, event }`** — Bloco E1 ficou aberto. Decisão real impactaria F1 (encoding) e A4 (rehydration).
4. **Outbox MySQL** — Bloco F2 (schema evolution) ainda aberto.

Esses quatro viram a pauta da **entrevista 0002**, a abrir quando o outbox MySQL voltar.

---

## XVI. O que ficou para a história

Entrevista 0001 — `0001-functional-ddd-domain-refresh.md` — **status: FECHADO**, imutável desde 19 de maio de 2026. Eventual continuação vira `0002-…`, podendo referenciar a anterior, nunca editá-la.

Material auditável produzido:
- **25 arquivos `.md`** em `handbook/interviews/0001/` (perguntas semânticas + individuais + meta de diagramas + master).
- **3 diagramas Mermaid canônicos** (state machine `Amendment`, sequence de homologação cross-agregado, layout ASCII anotado).
- **Tabela L3 canônica:** 40 DO + 16 CONSIDER + 5 AVOID + 44 DON'T = **105 entradas**.
- **21 tickets** entrando na pipeline W0→W3 (`.claude/.pipeline/<TICKET-ID>/`).
- **Cinco SKILL refreshes** programados (`§3.A`, `§3.B`, `§3.C`, `§3.D`, `§3.H`, `§3.I`, `§3.L`).

E, no fim de tudo, a frase que talvez melhor resuma a postura editorial do host ao longo das 36 horas:

> *"Aceitar 3 estratégias coexistentes (α: early return; β: combine; γ: combine+mapErr). Não buscar técnica unificadora — é anti-pattern."* — Rule DO #18, Bloco I.

Quem entrar no repositório seis meses depois, ler `src/modules/contracts/domain/` e estranhar por que `Money.zero` é constante e não função, por que `ContractRepository` mora em `domain/` enquanto `DocumentStorage` mora em `application/ports/`, por que os erros são `{ tag, …payload }` em vez de strings, por que existem três jeitos diferentes de compor `Result<T, E>` lado a lado — saberá onde olhar.

Este artigo serve de capa para uma entrevista de 7 mil linhas. A entrevista, por sua vez, serve de ratio legis para o código. O código, por enquanto, ainda não reflete tudo — mas 21 tickets já têm número, e o top-3 leverage está enfileirado.

---

## Apêndice — Onde encontrar cada coisa

| Quero | Vou em |
| :--- | :--- |
| O documento mestre da entrevista | [`handbook/interviews/0001-functional-ddd-domain-refresh.md`](./0001-functional-ddd-domain-refresh.md) |
| As 50+ perguntas individuais | [`handbook/interviews/0001/`](./0001/) |
| Os 3 diagramas Mermaid canônicos | `Pergunta_C1_C2_C3_C4_*.md`, `Pergunta_E3_I1_I3_A4_*.md`, `Pergunta_H1_H2_H3_*.md` (todos em [`0001/`](./0001/)) |
| A tabela L3 canônica completa | Bloco L em [`Pergunta_J_K_L_*.md`](./0001/Pergunta_J_K_L_tec_lider_using_skill_ts-domain-modeler.md) |
| Os 21 tickets coordenados | `.claude/.pipeline/CTR-*/` (frontmatter do master lista todos) |
| As regras invariantes do projeto (origem das 20 diretrizes) | [`CLAUDE.md`](../../CLAUDE.md), `handbook/architecture/adr/` |
| A SKILL que vai absorver as regras | [`.claude/skills/ts-domain-modeler/SKILL.md`](../../.claude/skills/ts-domain-modeler/SKILL.md) — refresh em 7 partes (`§3.A` a `§3.L`) |

---

*Reportagem produzida pela Redação interna a partir do material auditável em `handbook/interviews/0001/`. Nenhuma fala foi inventada — todas as citações entre aspas existem nos arquivos originais e podem ser localizadas via `grep` na pasta da entrevista.*
