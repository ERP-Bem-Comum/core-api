---
entrevista: 0001
bloco: B
pergunta: B1+B2+B3-followup
título: "Tensões e inconsistências do template canônico — antes de cravar no SKILL"
skill: ts-domain-modeler
status: respondida-pos-investigacao
parent: B1+B2+B3
agrupa-tensoes:
  - T1  # brand de primitivo (number & {brand}) vs wrapper ({value: number} & {brand})
  - T2  # custo de migração ~200 imports do Padrão A para o Padrão D
  - T3  # Object.freeze nas constantes de identidade — runtime guard vs paranoia
  - T4  # attemptedValue: number no tagged error — primitivo cru no domínio?
  - I1  # shared/brand.ts atual (intersection-com-phantom-string) vs unique symbol direto
---

# Pergunta_B1_B2_B3_followup_tec_lider_using_skill_ts-domain-modeler

> **Status:** respondida-pos-investigacao ✅ — PhD respondeu as 5 tensões. Host investigou `handbook/reference/typescript/` e `handbook/reference/nodejs/` por solicitação do Gabriel, confirmou o argumento do PhD em T3 com citação verbatim do handbook, e propõe a facade `immutable()` + novo `shared/brand.ts` com `unique symbol` global. Bloco B pronto para fechar — abrir tickets `CTR-SHARED-VO-CANONICAL`, `CTR-SHARED-BRAND-UNIQUE-SYMBOL`, `CTR-DOMAIN-IMPORT-CODEMOD`, `CTR-SHARED-IMMUTABLE`, `CTR-SKILL-REFRESH-B`.
> **Origem:** entrevista 0001
> **Skill canônica:** `ts-domain-modeler`

---

## Reconhecimento do host (não-negociável antes da pergunta)

O template canônico do PhD em B1+B2+B3 está sólido. **Não estou contestando** Padrão D, Zod-na-borda, identidades como constante, tagged errors. **Já estão aprovados.** Esta pergunta existe **só** para fechar 5 pontas que o template deixou em aberto e que vão me morder na implementação se eu cravar o `SKILL.md` agora.

---

## Q (host) — versão formal

### T1 — Critério: brand-de-primitivo vs brand-de-wrapper

```ts
// Template do PhD (InterestRate):
type InterestRate = number & { readonly [brand]: 'InterestRate' };

// Como Money está hoje:
type Money = { readonly cents: number } & { readonly [brand]: 'Money' };
```

Os dois shapes coexistem no mesmo template. Qual a regra heurística pra escolher?

**Risco que enxergo:** brand-de-primitivo (`number & brand`) é mais leve mas **colapsa sob extensão semântica**. Se um dia `InterestRate` precisar carregar `denominationPeriod` (anual/mensal/diária), o tipo vira `{value: number; period: Period} & brand` e **toda assinatura de consumidor quebra**. Wrapper desde o início acomoda extensão sem refactor de API.

**Pergunta:** existe critério objetivo? Algo como:
- Wrapper sempre que o VO **carrega unidade** ou pode evoluir para carregar contexto adicional.
- Primitivo apenas quando o VO é **atemporal** e **estruturalmente irredutível** (ex.: um `UUID` puro nunca vai virar outra coisa).

Ou você defende uma regra mais radical (sempre wrapper, sempre primitivo)?

### T2 — Estratégia de migração: ~200 imports do Padrão A para o Padrão D

Hoje no repo há ~200 `import { Money }`, `import { Period }`, etc. Migrar tudo pra `import * as Money` é refactor massivo.

**Três rotas que enxergo:**

- **(a) Big-bang num único ticket**, ferramenta tipo `ts-morph` ou `jscodeshift` rodando codemod sobre o repo. Risco: PR gigante, review difícil, blast radius alto.
- **(b) Dual coexistente** — Padrão A pros legados ficam congelados, Padrão D obrigatório pra VOs novos; deprecation gradual. Risco: drift permanente, dois jeitos certos.
- **(c) VO-por-VO** — refatora um VO por ticket (Money primeiro, depois Period, depois ids), atualizando todos os consumidores daquele VO num PR. Risco: prazo longo, inconsistência durante a transição.

**Pergunta:** qual rota? Algum critério que dispara codemod (big-bang) vs migração incremental? E como evitar drift durante a transição?

### T3 — `Object.freeze` nas constantes: runtime guard ou paranoia?

```ts
export const ZERO: Money = Object.freeze({ cents: 0 }) as Money;
```

O tipo `Money` é `Readonly<{ cents: number }> & brand` — o TS **já garante imutabilidade em compile time**. `Object.freeze` é check **runtime** invisível ao compilador.

Argumentos a favor:
- Defesa em profundidade: se alguém burlar via `as` (que o template do PhD diz ser proibido fora de smart constructor), o freeze impede mutação real.
- Custo zero efetivo na vida útil do objeto (chamado uma vez na inicialização).

Argumentos contra:
- Vira ritual: cada constante tem que ter `Object.freeze(...) as T` ao redor — ruído visual.
- Sinaliza desconfiança do próprio sistema de tipos — se o brand vale, a imutabilidade vale.

**Pergunta:** vale o cinto-e-suspensório, ou é over-defensive? Há cenário concreto onde o freeze pegou algo que o `readonly` deixou passar?

### T4 — `attemptedValue: number` no tagged error: viola "domínio não fala primitivo"?

```ts
export type InterestRateError =
  | { readonly tag: 'InterestRateNegative'; readonly attemptedValue: number }
  | { readonly tag: 'InterestRateExceedsMaximum'; readonly attemptedValue: number; readonly max: number };
```

`attemptedValue: number` é o **primitivo cru** vindo da borda. O `InterestRate` ainda não existe (porque o parse falhou). Mas o seu próprio princípio diz: *"the domain code should not use programmer jargon"*. Carregar `number` num tipo de domínio é jargão de programador, não vocabulário de negócio.

**Três alternativas que enxergo:**

- **(a) Manter `number`** porque é o que efetivamente chegou e o usuário precisa ver no erro formatado ("você enviou 150, máximo é 100").
- **(b) Trocar por `unknown`** — sinaliza "entrada cru não-confiável" mas perde a info pra mensagem.
- **(c) Remover `attemptedValue` do erro** — o erro só carrega `tag` + contexto **de negócio** (`max`), e o formatter recebe ambos (erro + input original) pra montar a mensagem.

**Pergunta:** qual rota é consistente com seus princípios? Ou aceita `number` como exceção pragmática?

### I1 — Inconsistência sutil: `shared/brand.ts` atual vs template

O template usa **`unique symbol`** direto:

```ts
declare const brand: unique symbol;
export type InterestRate = number & { readonly [brand]: 'InterestRate' };
```

Mas hoje temos em `shared/brand.ts`:

```ts
export type Brand<T, K extends string> = T & { readonly __brand: K };
```

Que é **intersection-com-phantom-string** — o estilo que você implicitamente abandonou no template.

**Implicação:** adotar o template não é só refactor de 6 VOs. É **refactor de `shared/brand.ts` também**. E aí vira um terceiro ticket (`CTR-SHARED-BRAND-UNIQUE-SYMBOL`) — pré-requisito de `CTR-SHARED-VO-CANONICAL`.

**Pergunta:** confirma a migração de `shared/brand.ts`? Mantém o helper `Brand<T, K>` (agora usando `unique symbol` internamente) para reutilização, ou expõe cada brand-symbol no próprio arquivo do VO (como no seu template)? Qual a forma canônica?

## Q (host) — versão narrativa (para colar em chat externo)

Cara, ANTES de cravar tudo no SKILL e abrir os tickets, 5 pontas ficaram soltas no teu template e elas vão me morder na implementação. Eu **não** estou contestando o veredito — Padrão D, Zod-na-borda, constantes congeladas, tagged errors: **tudo aprovado**. Mas:

**T1 — Brand: primitivo ou wrapper?** Teu template usou `type InterestRate = number & { brand }` (primitivo direto) mas o `Money` que existe hoje é `{ cents: number } & { brand }` (wrapper). Os dois shapes convivem no mesmo template e você não deu critério. Risco que vejo: brand-de-primitivo colapsa sob extensão — se um dia `InterestRate` carregar `denominationPeriod` (anual/mensal), o tipo muda e quebra todo consumidor. Wrapper acomoda. Tem regra heurística? Algo como "wrapper sempre que VO carrega unidade ou pode evoluir; primitivo só pra estruturalmente irredutíveis tipo UUID"?

**T2 — ~200 imports pra migrar do Padrão A pro Padrão D, como?** Você defendeu `import * as Money` mas o repo tem ~200 `import { Money }` espalhados. Big-bang num ticket só com codemod (`ts-morph`)? Coexistência dual (legado fica, novos VOs em Padrão D)? Migração VO-por-VO? Sem isso, "vamos adotar Padrão D" vira drift na prática.

**T3 — `Object.freeze` nas constantes: paranoia ou cinto legítimo?** Você botou `Object.freeze({ cents: 0 }) as Money` no template, mas o tipo já é `readonly` via brand — o TS já garante. O freeze é check **runtime** invisível pro compilador. Vale o ritual (cada constante carrega o `Object.freeze` ao redor) ou é over-defensive? Tem caso concreto onde o freeze pegou algo que o `readonly` deixou passar?

**T4 — `attemptedValue: number` no tagged error contradiz "domínio não fala primitivo"?** Teu template:

```ts
{ tag: 'InterestRateNegative'; attemptedValue: number }
```

`number` cru, antes de virar `InterestRate`. Mas você mesmo defendeu que o domínio não usa jargão de programador. Manter `number`, trocar por `unknown`, ou remover `attemptedValue` do erro (formatter recebe erro + input cru separadamente)?

**I1 — Inconsistência: teu template usa `unique symbol` direto, mas hoje `shared/brand.ts` é `Brand<T, K> = T & { __brand: K }` (intersection-com-phantom-string).** Adotar o template implica refactor de `shared/brand.ts` também — não é só refactor dos 6 VOs. Vira um terceiro ticket `CTR-SHARED-BRAND-UNIQUE-SYMBOL` que vc não sinalizou. Confirma? Mantém o helper `Brand<T, K>` central (agora usando `unique symbol` internamente) ou expõe cada brand-symbol no próprio arquivo do VO (como tu fez no template)?

Fecha essas 5 e a gente trava o SKILL.md e abre os 3 tickets coordenados. Aí parto pra próxima pergunta semântica, que vai ser sobre composição de Results — exatamente a dor que tu mesmo abriu no fim da última resposta.

## R (PhD)
Essas cinco pontas soltas são o que separa um template acadêmico de um código de produção resiliente. Você está com a intuição afiadíssima. Vamos amarrar cada uma delas para que você possa cravar o SKILL.md com confiança e abrir os tickets.
T1 — Brand: primitivo ou wrapper? Sua heurística está perfeita e é exatamente o que a modelagem funcional prescreve. Scott Wlaschin defende explicitamente o uso de "tipos empacotadores" (wrappers) para manter os conceitos do domínio distintos de suas representações, evitando a obsessão por primitivos
.
A Regra (Heurística): Use wrapper ({ rate: number } & Brand) para grandezas, medidas ou qualquer VO que carregue uma unidade de negócio e possa evoluir (como Money, InterestRate, Period). Use primitivo brandado (string & Brand) estritamente para identificadores opacos e irredutíveis (ContractId, UserId). O wrapper acomoda a evolução da grandeza estrutural sem quebrar os consumidores.
T2 — Migração dos ~200 imports (Padrão A pro Padrão D) Big-bang via codemod num único ticket. A coexistência dual (migração sob demanda) é a receita para o drift arquitetural — daqui a dois anos você terá duas convenções competindo. Como a mudança de import { Money } para import * as Money e as chamadas subsequentes são puramente sintáticas e não alteram a lógica de negócios, um script com ts-morph resolve isso de forma cirúrgica e segura em uma tarde. Abra o ticket CTR-DOMAIN-IMPORT-CODEMOD.
T3 — Object.freeze nas constantes: paranoia ou cinto legítimo? É um cinto de segurança legítimo e necessário. Como o próprio manual do TypeScript adverte, o modificador readonly existe apenas durante a verificação de tipos e não altera o comportamento do JavaScript em tempo de execução
. Todas as anotações de tipo são completamente apagadas no processo de compilação
.
O risco real: Se você passar Money.ZERO para uma biblioteca de terceiros mutável, ou para um Adapter legado sem tipagem estrita, alguém pode fazer Money.ZERO.cents = 99. Como a constante é um Singleton global da sua aplicação, esse vazamento alteraria o conceito de "zero" para todos os contratos rodando naquele processo do Node.js. O Object.freeze é a única garantia de runtime. Mantenha o ritual.
T4 — attemptedValue: number contradiz "domínio não fala primitivo"? Não contradiz, porque o erro documenta a falha na fronteira. A regra de Wlaschin ("o código de domínio não deve usar jargão de programador") aplica-se aos conceitos de negócio validados
. O input que falhou em ser parseado ainda não é um conceito do domínio.
O Veredito: Mantenha attemptedValue: number. Se a assinatura do seu smart constructor define explicitamente a entrada como fromNumber(value: number), o contrato da fronteira exige um número. O erro está simplesmente devolvendo a evidência exata daquilo que o chamador tentou injetar, permitindo que a CLI ou o Adapter de fora logue o valor cru que causou a rejeição.
I1 — Inconsistência no shared/brand.ts (unique symbol vs string intersection) Sim, você identificou perfeitamente a necessidade do terceiro ticket: CTR-SHARED-BRAND-UNIQUE-SYMBOL. Não vamos espalhar declare const brand: unique symbol em cada VO.
A Solução: Mantenha o helper Brand<T, K> centralizado em shared/brand.ts, mas modernize-o para usar um unique symbol global combinado com a string literal K. Isso elimina o overhead de repetição e garante as mensagens de erro limpas do TS.
O novo helper central:
Isso substitui o fantasma inseguro __brand estrutural, mantendo a ergonomia e centralizando a atualização.

--------------------------------------------------------------------------------
Com essas respostas, o seu esqueleto no SKILL.md está blindado contra regressões de design, os VOs têm um padrão inquebrável para os próximos anos, e o escopo dos 3 tickets está cirurgicamente delimitado.

## (NOTA DO GABRIEL, PESSOA QUE ESTÁ GERENCIANDO E ORQUESTRANDO ESSA ENTREVISTA...)
- Por questão do "PhD", não saber todo o contexto do projeto. Olhe com calma, AGORA a documentação do @/Users/gabriel_aderaldo/Desktop/Projetos/dev/envolve/bem_comum/ERP-CONTRACTS/handbook/reference/typescript e do @/Users/gabriel_aderaldo/Desktop/Projetos/dev/envolve/bem_comum/ERP-CONTRACTS/handbook/reference/nodejs só por desencargo de conciencia, para saber se existe alguma maneira moderna, ALÉM do object.freazing para resolver essa questão. E claro, se for ter que fazer isso em muitos cantos talvez seja bom criarmos uma "facade" que vai esconder a logica do object.freazing mais algumas validações para garantir a imutabilidade como uma função sei lá -> "immutable" [variavel] xxxx, Vamos pensar com calma se realmente precisa... mas mantenha isso em mente.

## Investigação do host (após nota do Gabriel sobre `Object.freeze`)

Gabriel anotou no fim da resposta do PhD pedindo investigação de `handbook/reference/typescript/` e `handbook/reference/nodejs/` para descobrir se há alternativa moderna ao `Object.freeze`, e sugeriu uma facade `immutable()` se a resposta for "não". Investigação completa:

### 1. TS handbook (`Object Types.md` §§ 198–249) — confirma e reforça o argumento do PhD em T3

Citações verbatim (linha + texto):

> **Linha 199-200:** *"Using the `readonly` modifier doesn't necessarily imply that a value is totally immutable — or in other words, that its internal contents can't be changed. It just means the property itself can't be re-written to."*

> **Linha 223-225:** *"TypeScript doesn't factor in whether properties on two types are `readonly` when checking whether those types are compatible, so `readonly` properties can also change via aliasing."*

Exemplo canônico do próprio handbook mostrando aliasing-mutation rompendo `Readonly<T>`:

```ts
interface Person          { name: string; age: number }
interface ReadonlyPerson  { readonly name: string; readonly age: number }

let writablePerson: Person = { name: 'X', age: 42 };
let readonlyPerson: ReadonlyPerson = writablePerson;   // ← assignable, TS aceita

writablePerson.age++;                                   // ← mutação válida no alias
console.log(readonlyPerson.age);                        // → 43 — vazou pelo alias
```

**Conclusão:** o argumento do PhD em T3 está **blindado pela própria especificação canônica**. `Object.freeze` é o único mecanismo que fecha o vetor de aliasing — mesmo em código 100% próprio, sem libs terceiras.

### 2. Node 24 (`Utilities.md`) — `Object.freeze` é pattern canônico do próprio core

Linha 3246: APIs core do Node descrevem constantes como "frozen objects with a `null` prototype". `Buffer` constants idem. **O Node usa `Object.freeze` em runtime para singletons globais.** É exatamente o caso de `Money.ZERO`, `Period.UNBOUNDED`.

### 3. Records & Tuples (TC39) — não disponível

A proposta `Record & Tuple` (`#{}` e `#[]` nativos imutáveis com `===` semântico) está **Stage 2** desde 2022, sem implementação V8. Node 24 não tem. Não é alternativa para 2026.

### 4. Outras alternativas modernas — descartadas

| Mecanismo | Veredito | Por quê |
| :--- | :---: | :--- |
| `as const` | ❌ não resolve | só compile-time, mesma limitação do `readonly` |
| `Proxy` com handler que joga `TypeError` | ❌ overhead | ergonomia ruim, custo runtime real |
| `Object.defineProperty` granular | ❌ verboso | é o que `Object.freeze` faz por baixo |
| WeakMap-based private | ❌ exige `class` | viola "no class" do CLAUDE.md raiz |
| `structuredClone` | ❌ clona, não congela | não é mecanismo de imutabilidade |

`Object.freeze` permanece como **única ferramenta nativa** que combina: shallow imutabilidade em runtime + custo zero pós-inicialização + sem dependência externa + sem `class`.

### 5. Proposta do Gabriel — facade `immutable()`: **endossada**

A nota do Gabriel está certa: espalhar `Object.freeze(...) as Money` em cada constante de cada VO vira ritual visual e expõe jargão de implementação no domínio (pelo princípio do próprio PhD em T4: "domínio não fala jargão de programador"). Encapsular numa função semântica resolve ambos:

```ts
// shared/immutable.ts
/**
 * Constante "de verdade" — imutável em compile time E runtime.
 * Esconde o mecanismo (Object.freeze hoje, Records & Tuples no futuro)
 * e documenta intenção semântica no vocabulário do projeto.
 */
export const immutable = <T extends object>(value: T): Readonly<T> =>
  Object.freeze(value);

/**
 * Variante para VOs compostos com sub-objetos aninhados.
 * O Object.freeze é shallow; deepImmutable congela recursivamente.
 */
export const deepImmutable = <T>(value: T): T => {
  if (value === null || typeof value !== 'object') return value;
  for (const key of Object.keys(value)) {
    deepImmutable((value as Record<string, unknown>)[key]);
  }
  return Object.freeze(value);
};
```

Uso nos VOs (substitui o `Object.freeze` direto do template do PhD):

```ts
// shared/money.ts (novo template)
import { immutable } from '../immutable.ts';

export const ZERO: Money = immutable({ cents: 0 }) as Money;
```

**Vantagens da facade:**

1. **Documenta intenção:** `immutable` lê como "constante imutável de verdade" — vocabulário do projeto. `Object.freeze` é jargão de implementação.
2. **Ponto auditado único:** se um dia precisar trocar (Records & Tuples chegou em Stage 4? `Object.deepFreeze` virou nativo?), muda **1 arquivo**.
3. **Custos:** zero. Função inline trivial, V8 otimiza pra inline-call.
4. **Compatível com Brand:** `immutable({cents: 0})` devolve `Readonly<{cents: number}>`, e o `as Money` final é o único cast permitido (preservando A1).
5. **Resolve a ironia interna do PhD:** ele defendeu "domínio não fala jargão" em T4, mas usou `Object.freeze` direto no template (jargão). `immutable` corrige a inconsistência sem comprometer T3.

**Ticket novo derivado:** `CTR-SHARED-IMMUTABLE` — cria `shared/immutable.ts` + `shared/immutable.test.ts` (testa shallow vs deep + tentativa de mutação em modo strict joga `TypeError`).

### 6. Novo `shared/brand.ts` — PhD descreveu mas não codificou

O PhD em I1 disse: *"mantenha o helper `Brand<T, K>` centralizado em `shared/brand.ts`, mas modernize-o para usar um `unique symbol` global combinado com a string literal K"* — e parou. Não mostrou código. Proponho:

```ts
// shared/brand.ts (NOVO — substitui o atual com phantom string)

/** Símbolo global único — colisão estrutural acidental virou impossível. */
declare const __brand: unique symbol;

/**
 * Brand<T, K> — marca um tipo T com uma identidade nominal K.
 * Usado APENAS em VOs folha (Money, Period, ContractId, ...).
 * NUNCA em agregados — vide Pergunta_A3.
 */
export type Brand<T, K extends string> = T & { readonly [__brand]: K };

/**
 * Recupera o literal de brand de um tipo brandado.
 * Útil em testes e mensagens de diagnóstico.
 * Ex.: BrandOf<Money> = 'Money'
 */
export type BrandOf<B> = B extends { readonly [__brand]: infer K } ? K : never;
```

**Vantagens vs versão atual (`{ __brand: K }` com phantom string):**

| Critério | Versão atual | Versão proposta |
| :--- | :---: | :---: |
| Colisão estrutural acidental | possível (`{ __brand: 'Money' }`) | impossível (symbol global) |
| Mensagem de erro do TS | mostra `__brand: 'Money'` poluindo | mostra symbol limpo |
| Acessar `K` em tipo | não disponível | `BrandOf<T>` recupera |
| Compatibilidade com VOs existentes | n/a | preserva — só muda `shared/brand.ts`, helper continua `Brand<T, K>` |

---

## Nota de naming — decisão pós-terceira-voz (2026-05-18)

A facade foi originalmente proposta como `realConst()` no rascunho inicial. Gabriel trouxe uma terceira voz (consultor externo) que opinou sobre naming idiomático:

- **Padrão Node.js:** `makeConst()`, `strictConst()`
- **Padrão Swift / descritivo:** `immutable()`, `asImmutable()`
- **Variantes deep:** `deepImmutable()`, `makeDeepConst()`

**Análise do host:**

| Candidato | Pró | Contra | Veredito |
| :--- | :--- | :--- | :---: |
| `realConst` | curto | "real" tem conotação valorativa infantil (sugere `const` da linguagem é "fake") | ❌ |
| `makeConst` | familiar pra dev Node | "make" é genérico — não comunica imutabilidade | ❌ |
| `strictConst` | sinaliza regras rigorosas | colide visualmente com `"strict": true` do `tsconfig` | ❌ |
| **`immutable`** | foca na **propriedade adquirida**, lê como prosa, alinha com FP idiomático | risco mínimo de confusão com `immutable.js` (lib em manutenção desde 2019) | ✅ |
| `asImmutable` | clareza de "conversão" | 11 chars vs 9; `immutable({...})` já lê como conversão | ❌ |

**Decisão final:** **`immutable`** + **`deepImmutable`**.

**Razão:** o consultor acertou o critério — "remover jargão técnico, focar no conceito do domínio". Casa perfeitamente com o princípio T4 do PhD ("domínio não fala jargão de programador"). `Object.freeze` continua existindo, mas confinado dentro de `shared/immutable.ts` — invisível ao código de domínio.

## Avaliação final das 5 tensões (após investigação)

| Tensão | Resposta PhD | Resolução final (host) |
| :--- | :--- | :--- |
| **T1** Brand wrapper vs primitivo | Endossou minha heurística: wrapper para grandeza/unidade/extensão; primitivo só para identificador opaco e irredutível. | ✅ aceito sem mudança. |
| **T2** Migração ~200 imports | Big-bang via codemod com `ts-morph` — ticket `CTR-DOMAIN-IMPORT-CODEMOD`. | ✅ aceito. Codemod precisa: (a) rewrite de imports nomeados → namespace; (b) rewrite de uso `Money.fromCents` mantém igual; (c) update de `tsconfig` se houver path mapping; (d) `pnpm run typecheck` + `pnpm test` verde no fim. |
| **T3** `Object.freeze` | Defendeu com argumento de aliasing/singleton + risco de lib mutável. | ✅ aceito + **upgrade**: encapsular em facade `immutable()` em vez de espalhar. Razão: confirma o PhD (TS handbook §199 e §223) **e** corrige a inconsistência com o princípio T4. |
| **T4** `attemptedValue: number` | Manteve. Argumento: erro documenta falha **na fronteira**; se a assinatura do smart constructor declara `value: number`, o erro devolve a evidência exata. | ✅ aceito com nuance: o tipo do `attemptedValue` deve **espelhar exatamente** a assinatura do `from<X>` (se for `fromCents(cents: number)`, o erro carrega `number`; se for `fromBigint(value: bigint)`, carrega `bigint`). Vira sub-regra do DO #2 da pergunta-pai. |
| **I1** `shared/brand.ts` | Confirmou migração + sugeriu helper central com `unique symbol` global, mas **não mostrou código**. | ✅ aceito. Snippet codificado acima na §6. |

## Rules emergentes (Bloco B FECHADO — destiladas após PhD + investigação)

### DO

1. **Wrapper-brand** para VOs que carregam grandeza, unidade ou podem evoluir (`Money`, `InterestRate`, `Period`).
2. **Primitivo-brand** apenas para identificadores opacos e estruturalmente irredutíveis (`ContractId`, `AmendmentId`, `DocumentId`, `UserRef`).
3. **Migração big-bang via `ts-morph` codemod** num único ticket (`CTR-DOMAIN-IMPORT-CODEMOD`).
4. **Constantes de identidade via facade `immutable()` / `deepImmutable()`** — vocabulário do projeto, não jargão de implementação.
5. **`shared/brand.ts` modernizado**: `unique symbol` global + string literal K. Helper `Brand<T, K>` continua público + novo `BrandOf<T>` para diagnóstico.
6. **Tagged error com `attemptedValue: <tipo da assinatura>`** — espelha exatamente o input que o smart constructor declarou aceitar.
7. **Cast `as T` único e auditado** no smart constructor (preserva A1).
8. **Module-as-namespace** (Padrão D — `import * as Money`) em todo consumo.
9. **Free functions** no arquivo do VO (não namespace-objeto).

### DON'T

1. `Object.freeze` direto no código de domínio — usa `immutable`/`deepImmutable`.
2. Brand-de-primitivo para grandezas/unidades — risco de colapso sob extensão.
3. Migração dual coexistente (Padrão A legado + Padrão D novo) — gera drift permanente.
4. `declare const brand: unique symbol` espalhado em cada arquivo de VO — centraliza em `shared/brand.ts`.
5. Namespace-objeto `export const Money = { … }`.
6. Function-as-constructor `Money(100)` retornando `Result`.
7. Zod dentro de `shared/<vo>.ts` — vive no Adapter.
8. Identidade fixa como função (`zero()`) — vira constante via `immutable`.
9. Tagged error carregando estrutura **interna do domínio já parseada** como `attemptedValue` — `attemptedValue` é só o que veio cru da borda.

### CONSIDER

1. **`deepImmutable`** para VOs compostos com sub-VOs aninhados (Período com `start` + `end`, agregado com `homologatedAmendmentIds`).
2. **`BrandOf<Money>`** em testes (`expect(BrandOf<typeof result>).toBe('Money')`).
3. **`bigint` no domínio** se valores se aproximarem de `MAX_SAFE_INTEGER` (~90 trilhões de centavos). Domain-driven, não DB-driven.
4. **`Object.isFrozen()`** em testes de propriedade — afirmar que `Money.ZERO` continua frozen após operações.

## Tickets confirmados (saída final do Bloco B)

| Ticket | Escopo | Dependências |
| :--- | :--- | :--- |
| **CTR-SHARED-IMMUTABLE** | Cria `shared/immutable.ts` (`immutable`, `deepImmutable`) + testes. | — |
| **CTR-SHARED-BRAND-UNIQUE-SYMBOL** | Migra `shared/brand.ts` para `unique symbol` global + `BrandOf<T>`. | — |
| **CTR-SHARED-VO-CANONICAL** | Refatora `money.ts`, `period.ts`, `ids.ts`, `bucket-name.ts`, `storage-key.ts`, `storage-ref.ts` no novo template (module-as-namespace + free functions + `immutable` + tagged errors + `Brand` novo). | CTR-SHARED-IMMUTABLE, CTR-SHARED-BRAND-UNIQUE-SYMBOL |
| **CTR-DOMAIN-IMPORT-CODEMOD** | Codemod `ts-morph` rewriteando ~200 imports `import { X }` → `import * as X`. | CTR-SHARED-VO-CANONICAL |
| **CTR-SKILL-REFRESH-B** | Atualiza `.claude/skills/ts-domain-modeler/SKILL.md` com seção `§3.B — Smart Constructor Canônico` (9 DO + 9 DON'T + 4 CONSIDER). | todos os anteriores |

## Cross-refs

| Pergunta | Como se conecta |
| :--- | :--- |
| [B1+B2+B3 (pai)](./Pergunta_B1_B2_B3_tec_lider_using_skill_ts-domain-modeler.md) | Este follow-up fecha as 5 pontas que aquela resposta deixou abertas. |
| [A1](./Pergunta_A1_tec_lider_using_skill_ts-domain-modeler.md) | T3 (`Object.freeze`) é desdobramento direto da regra "cast `as` só no smart constructor". |
| [A2](./Pergunta_A2_tec_lider_using_skill_ts-domain-modeler.md) | T4 conecta com o princípio "domínio fala vocabulário de negócio". |
| [K4](./Pergunta_K4_tec_lider_using_skill_ts-domain-modeler.md) | I1 é o desdobramento operacional de K4 (unique symbol vs intersection). |
| [D1](./Pergunta_D1_tec_lider_using_skill_ts-domain-modeler.md) | T4 toca em tagged error payload — D1 ratificou tagged, mas não falou shape do payload. |

## Tickets que dependem da resolução

- `CTR-SHARED-VO-CANONICAL` — depende de T1 (shape) e T3 (`Object.freeze`).
- `CTR-SHARED-BRAND-UNIQUE-SYMBOL` — depende de I1 (confirmar migração e shape do helper).
- `CTR-SHARED-IMPORT-MIGRATION` — depende de T2 (estratégia).
- `CTR-SKILL-REFRESH-B` — depende de **todas** as 5.
