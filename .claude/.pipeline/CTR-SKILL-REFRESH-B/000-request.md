# 000 — Request CTR-SKILL-REFRESH-B

> **Frente A — Refactor radical do domínio (entrevista 0001).**
> **Bloco B — Documental.** Consolida Smart Constructor Canônico em nova seção `§3.B` da skill `ts-domain-modeler/SKILL.md`. **Ticket documental** — não toca `src/` nem `tests/`.
> Depende de **todos os tickets do Bloco B fechados** ✅: `CTR-SHARED-IMMUTABLE`, `CTR-SHARED-BRAND-UNIQUE-SYMBOL`, `CTR-SHARED-VO-CANONICAL`, `CTR-DOMAIN-IMPORT-CODEMOD` + `CTR-SKILL-REFRESH-C` ✅, `CTR-SKILL-REFRESH-D` ✅.
> **Resolve template Money obsoleto** (SKILL.md ~244-254 — Padrão A `export const Money = { ... }` viola DON'T B§7).
> 11º ticket consecutivo do protocolo **Opção B** (pipeline adaptada para doc).

---

## Origem

- **Entrevista canônica:** [`handbook/interviews/0001-functional-ddd-domain-refresh.md`](../../../handbook/interviews/0001-functional-ddd-domain-refresh.md), **Bloco B** (FECHADO).
- **Tabela de tickets** (L961):
  > `CTR-SKILL-REFRESH-B` — Bloco B — `.claude/skills/ts-domain-modeler/SKILL.md §3.B — Smart Constructor Canônico` (**9 DO + 9 DON'T + 4 CONSIDER**). **Dep: todos os anteriores.**
- **Resolução do bloco** (L445):
  > Bloco fechou com **9 DO + 9 DON'T + 4 CONSIDER**, 5 tickets coordenados, e o **template canônico do Smart Constructor** pronto para virar §3.B do `SKILL.md`.

### 📌 Contagem — promoção temática documentada

Contagem real na entrevista (marcadores `(B)` literais):

| Tipo | `(B)` literal | Como chegar a 9+9+4 |
| :--- | :---: | :--- |
| DO | 7 (§6-§12) | + 2 promoções de (A) que são tematicamente B |
| DON'T | 8 (§5-§12) | + 1 promoção de (A) que é tematicamente B |
| CONSIDER | 4 (§2-§5 do CONSIDER) | já são 4 — ✅ |

**Promoções aplicadas** (decisão editorial deste ticket):

| Item | Marcador na lista | Por que conta como B no fechamento |
| :--- | :--- | :--- |
| DO §2 — "Encapsular cast `as` num único ponto auditado por VO — o smart constructor." | (A) | Define o **único lugar** do cast — invariante central do smart constructor (B). |
| DO §5 — "Adapter de persistência reidrata agregado **apenas via smart constructors de VOs internos**, retornando `Result<Aggregate, RehydrationError>`." | (A) | Smart constructor é o **ponto de entrada** de rehydration — invariante B aplicado em adapter. |
| DON'T §3 — "Confundir validação booleana com parse." | (A) | "Parse, don't validate" é a regra-mãe do smart constructor (B). |

**Justificativa:** o L961 cita "9 DO + 9 DON'T" pensando no **bloco como capítulo do SKILL.md**, não no contador estrito da lista numerada. As promoções acima são naturais — cada item é canônico do tema B.

---

## Estado atual

### `.claude/skills/ts-domain-modeler/SKILL.md`

- Após `CTR-SKILL-REFRESH-D` ✅ e `CTR-SKILL-REFRESH-C` ✅, tem **§3.D** + **§3.C** populadas (Tagged Errors + State Machine + Invariantes Contextuais + Aninhamento + Discriminated Unions + Exhaustive Switch).
- **Não tem §3.B** ainda.
- **Template "Money" obsoleto na seção "Templates rápidos"** (linhas ~244-254):
  ```ts
  export const Money = {
    fromCents: (cents: number): Result<Money, MoneyError> => { /* ... */ },
    zero: (): Money => ({ cents: 0 } as Money),
    add: (a, b) => ({ cents: a.cents + b.cents } as Money),
    // ...
  };
  ```
  Viola **DON'T B§7** ("`export const Money = { … }` namespace-objeto perde tree-shaking + jargão OO"), **DON'T B§10** ("Identidade como função `zero()` — quando é imutável puro"), **DON'T B§5** ("`Object.freeze` direto — usar `immutable()`").

### Aprendizados do Bloco B já vivos no `src/`

| Sub-tema do Bloco B | Onde está vivo | Ticket-fonte |
| :--- | :--- | :--- |
| Brand modernizado (`unique symbol` + `Brand<T,K>` + `BrandOf<T>`) | `src/shared/brand.ts` | `CTR-SHARED-BRAND-UNIQUE-SYMBOL` ✅ |
| Facade `immutable()` / `deepImmutable()` | `src/shared/immutable.ts` | `CTR-SHARED-IMMUTABLE` ✅ |
| Smart constructors no template canônico | `src/modules/contracts/domain/shared/{money,period,bucket-name,storage-key,storage-ref}.ts` + `{contract-id,amendment-id,document-id,user-ref}.ts` | `CTR-SHARED-VO-CANONICAL` ✅ |
| Module-as-namespace (`import * as Money from './money.ts'`) | ~200 imports via codemod | `CTR-DOMAIN-IMPORT-CODEMOD` ✅ |
| Identidade fixa via `immutable()` | `Money.ZERO` em `domain/shared/money.ts:17` | `CTR-SHARED-IMMUTABLE` ✅ |

---

## Estado-alvo (Padrão D consolidado para Bloco B)

### Inserir nova seção `## §3.B — Smart Constructor Canônico`

Posicionamento: **antes de §3.D** (ordem semântica B → C → D — embora a ordem cronológica de tickets tenha sido D → C → B).

### Conteúdo mínimo da §3.B

#### 1. Brand Modernizado — `unique symbol` global

- `src/shared/brand.ts` centraliza `Brand<T, K>` + `BrandOf<T>`.
- **NUNCA** declarar `declare const brand: unique symbol` espalhado em cada VO (DON'T §12).
- Brand é estrutural; chave (`K`) é string literal — colide naturalmente em "brand de brand" → use propriedade nomeada (decisão D1 do `CTR-DOMAIN-INVARIANT-CONTEXTUAL` — `NonZeroMoney = Money & { __nonZeroMoney: true }`).

#### 2. Wrapper-Brand vs Primitivo-Brand (DO §6, §7; DON'T §6)

| Tipo | Quando usar | Exemplo vivo |
| :--- | :--- | :--- |
| **Primitivo-brand** | Identificadores **opacos e estruturalmente irredutíveis** (não há propriedade "interna" semanticamente relevante). | `ContractId`, `AmendmentId`, `DocumentId`, `UserRef` — `Brand<string, 'ContractId'>` |
| **Wrapper-brand** | VOs que carregam **grandeza, unidade ou contexto evolutivo** (refinamento futuro vai acontecer). | `Money` (`Brand<Readonly<{ cents: number }>, 'Money'>`), `Period`, `InterestRate` (futuro) |

- **Por que evitar brand-de-primitivo para grandezas?** Colapsa sob extensão. Ex.: se hoje `Money = Brand<number, 'Money'>` e amanhã precisamos `Money & { currency: 'BRL' }`, o brand-de-primitivo não acomoda. Wrapper-brand (`Brand<Readonly<{...}>, 'Money'>`) acomoda.

#### 3. Module-as-Namespace (Padrão D) — DO §8; DON'T §7, §8

- **Exportar free functions** dentro do módulo `.ts`.
- Consumir com `import * as Money from './money.ts'` — chamadas ficam `Money.fromCents(100)`.
- **Por que evitar `export const Money = { ... }`?** Namespace-objeto perde tree-shaking (bundler não consegue descartar funções não-usadas) + introduz jargão OO (`Money.method` parece classe).
- **Por que evitar function-as-constructor `Money(100)` retornando Result?** Quebra semântica JS — `X(...)` parecer construtor mas retornar Result é confuso.

#### 4. Smart Constructor `from<Source>` (DO §9, promoção DO §2 e DO §5; DON'T §3)

- Cada smart constructor é **`from<Source>(raw: Source): Result<T, TaggedError>`**.
- O **único lugar** onde o cast `as Brand<T, K>` mora — auditado, comentado.
- Tagged error carrega `attemptedValue: <tipo da assinatura>` quando há evidência de colisão (cross-ref §3.D — payload de invariante).
- **Adapter de persistência** reidrata **apenas via smart constructors** — sem montar literal de agregado direto (shotgun parsing).
- "Parse, don't validate" (Wlaschin): não confundir `isValid(raw): boolean` com `parse(raw): Result<T, E>`. Parse retorna o valor refinado; validate só diz sim/não.

#### 5. Identidade Fixa via `immutable()` / `deepImmutable()` (DO §10; DON'T §5, §10)

- `src/shared/immutable.ts` esconde `Object.freeze` atrás de vocabulário do domínio.
- **NUNCA** `Object.freeze(...)` direto no código de domínio.
- Identidade fixa (e.g., `Money.ZERO`) é **valor constante** (`export const ZERO: Money = immutable({ cents: 0 }) as Money`), não função `zero()`. Funções implicam construção repetida; constantes carregam a invariante "este é o único".

#### 6. Migração Big-Bang (DO §12; DON'T §11)

- Quando reformar template de VO em massa, fazer **codemod `ts-morph` big-bang** num único ticket.
- **NUNCA** manter migração dual coexistente (Padrão A legado + Padrão D novo) — gera drift permanente.

#### 7. Template Canônico do Smart Constructor (`src/modules/contracts/domain/shared/money.ts`)

> Substitui o template antigo da SKILL.md (linhas 244-254 — Padrão A).

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

Consumo:
```ts
import * as Money from './money.ts';

const amount = Money.fromCents(10_000); // Result<Money, MoneyError>
if (!amount.ok) return amount;
const doubled = Money.add(amount.value, amount.value);
```

#### 8. Tabela canônica — 9 DO + 9 DON'T + 4 CONSIDER

> Strings literais para verificador grep. Note: numeração reflete entrevista + promoções temáticas documentadas em §"Origem".

**DO (9)**
- §2 *(promoção temática de (A))* — Encapsular cast `as` num único ponto auditado por VO — o smart constructor.
- §5 *(promoção temática de (A))* — Adapter de persistência reidrata agregado **apenas via smart constructors de VOs internos**, retornando `Result<Aggregate, RehydrationError>`.
- §6 — Wrapper-brand para VOs que carregam grandeza/unidade/contexto evolutivo (`Money`, `Period`, `InterestRate`).
- §7 — Primitivo-brand apenas para identificadores opacos e estruturalmente irredutíveis (`ContractId`, `AmendmentId`, `DocumentId`, `UserRef`).
- §8 — Module-as-namespace (Padrão D): exportar free functions; consumir com `import * as Money from './money.ts'`.
- §9 — Smart constructor `from<Source>` retorna `Result<T, TaggedError>`. Tagged error carrega `attemptedValue: <tipo da assinatura>`.
- §10 — Identidade fixa via facade `immutable()` / `deepImmutable()` em `shared/immutable.ts`. Esconde `Object.freeze`.
- §11 — `shared/brand.ts` modernizado: `unique symbol` global + string literal `K`. Helper `Brand<T, K>` + `BrandOf<T>`.
- §12 — Migração ~200 imports via codemod `ts-morph` big-bang num único ticket.

**DON'T (9)**
- §3 *(promoção temática de (A))* — Confundir validação booleana com parse.
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

#### 9. Tickets vivos como referência

| Conceito da §3.B | Ticket vivo |
| :--- | :--- |
| Facade `immutable()` / `deepImmutable()` | `CTR-SHARED-IMMUTABLE` |
| `Brand<T, K>` + `BrandOf<T>` + `unique symbol` | `CTR-SHARED-BRAND-UNIQUE-SYMBOL` |
| Template canônico aplicado em 6+ VOs | `CTR-SHARED-VO-CANONICAL` |
| Codemod big-bang ~200 imports | `CTR-DOMAIN-IMPORT-CODEMOD` |

### Atualização secundária — substituir template Money obsoleto

Local: SKILL.md ~244-254 (seção "Templates rápidos").

**De** (Padrão A obsoleto — viola DON'T B§7, §10, §5):
```ts
export const Money = {
  fromCents: (cents: number): Result<Money, MoneyError> => { /* ... */ },
  zero: (): Money => ({ cents: 0 } as Money),
  add: (a, b) => ({ cents: a.cents + b.cents } as Money),
  /* ... */
};
```

**Para** (Padrão D canônico — fiel a `src/modules/contracts/domain/shared/money.ts`):
> Bloco completo conforme §3.B.7 acima. Adicionar comentário in-line: `// Veja §3.B — Smart Constructor Canônico.`

### Atualização secundária — Changelog

`- **2026-05-21:** §3.B criada (Smart Constructor Canônico); template "Money" da seção "Templates rápidos" atualizado Padrão A → Padrão D.`

---

## Critérios de aceitação

### CA1 — Seção §3.B existe

- `## §3.B — Smart Constructor Canônico` em SKILL.md.
- Posicionada antes de §3.D (ordem semântica B → C → D, mesmo que cronologia tenha sido D → C → B).

### CA2 — 9 sub-seções com títulos identificáveis

1. Brand Modernizado (unique symbol).
2. Wrapper-Brand vs Primitivo-Brand.
3. Module-as-Namespace.
4. Smart Constructor `from<Source>`.
5. Identidade Fixa via `immutable()`.
6. Migração Big-Bang.
7. Template Canônico (snippet Money).
8. Tabela canônica.
9. Tickets vivos.

### CA3 — Contagem exata: **9 DO + 9 DON'T + 4 CONSIDER**

- Marcadores literais: `**DO (9)**`, `**DON'T (9)**`, `**CONSIDER (4)**`.
- Documenta promoções temáticas (DO §2, §5 + DON'T §3) no 000-request.

### CA4 — Wrapper-Brand e Primitivo-Brand ambos explicitados

- Strings literais `Wrapper-brand` e `Primitivo-brand` na §3.B.
- Tabela com pelo menos 1 exemplo de cada (`Money`/`Period` para Wrapper; `ContractId`/`AmendmentId` para Primitivo).

### CA5 — `unique symbol`, `Brand<T, K>`, `BrandOf<T>` mencionados

- Strings literais `unique symbol`, `Brand<T, K>`, `BrandOf` (ou `BrandOf<T>`).

### CA6 — Facade `immutable()` / `deepImmutable()` mencionada

- Strings literais `immutable(` (open paren), `deepImmutable` na §3.B.
- DON'T `Object.freeze` direto mencionado.

### CA7 — Template Money obsoleto substituído

- `grep "export const Money = {" .claude/skills/ts-domain-modeler/SKILL.md` retorna **zero**.
- Novo template usa `export type Money = Brand<{...}, 'Money'>` + `import * as Money` no exemplo de consumo + `export const ZERO: Money = immutable(...)`.

### CA8 — 4 tickets vivos referenciados

- Strings literais: `CTR-SHARED-IMMUTABLE`, `CTR-SHARED-BRAND-UNIQUE-SYMBOL`, `CTR-SHARED-VO-CANONICAL`, `CTR-DOMAIN-IMPORT-CODEMOD`.

### CA9 — `src/` e `tests/` intocados; zero regressão

- `git diff --cached --name-only -- src/ tests/` zero linhas.
- `pnpm run typecheck` ✅, `pnpm test` `fail 0`, `pnpm run lint` ✅.

### CA10 — Doc fiel ao código vivo

- Snippets da §3.B correspondem a `src/modules/contracts/domain/shared/money.ts` (fromCents, ZERO, add, subtract, etc.) + `src/shared/brand.ts` (Brand, BrandOf) + `src/shared/immutable.ts` (immutable, deepImmutable).
- Strings literais identificáveis: `fromCents`, `Number.MAX_SAFE_INTEGER`.

---

## Arquivos previstos

```
.claude/skills/ts-domain-modeler/SKILL.md   (insert §3.B ≈ 250-400 LOC + substitui template Money ~244-254 + changelog)
```

`src/` e `tests/` — **NÃO TOCAR**.

---

## Pipeline adaptada (idêntica a SKILL-REFRESH-D/C)

| Wave | Adaptação |
| :--- | :--- |
| **W0 RED** | Shell verificador em `002-tests/verify-skill-refresh-b.sh` com 10 critérios. Inclui `; true` no `grep -c` (lição POSIX). |
| **W1 GREEN** | `ts-domain-modeler` escreve §3.B + substitui template Money. |
| **W2 REVIEW** | `code-reviewer` audita ratio legis + fidelidade Money/Brand/immutable + Wrapper vs Primitivo brand. |
| **W3 QUALITY** | Verificador W0 + typecheck/test/lint + prettier cirúrgico SKILL.md. |

---

## Não-objetivos

- **Resolver as 2 issues médias/baixas do W2 SKILL-REFRESH-D e SKILL-REFRESH-C** (SKILL.md:361-362 assinatura `terminate` divergiu; SKILL.md:629 ref linha frágil; SKILL.md:646-666 tensão §3.C.3) — fora do escopo de "Smart Constructor". Abrir ticket dedicado se necessário.
- **Refatorar a seção "Obrigações"** (linhas ~57-114) que ainda lista erros como string literal e tem outros itens stale — escopo de tickets posteriores (`CTR-SKILL-REFRESH-A` resolve agregados; `SKILL-REFRESH-L` consolida).
- **Mover Money para `src/shared/kernel/`** — escopo de `CTR-DOMAIN-RESTRUCTURE` (Bloco H).

---

## Risco / pontos de atenção

1. **Promoções temáticas (DO §2, §5 + DON'T §3 marcados (A))** — documentadas explicitamente em §"Origem". Próximo ticket `SKILL-REFRESH-A` precisa **não duplicar** essas regras: §3.A pode citar mas não re-listar como (A) original (cross-ref para §3.B).
2. **Sub-agent bloqueio de Write em REPORTs** — padrão emergente em W3 dos últimos tickets. Fallback admin documentado.
3. **Bug POSIX `grep -c` + zero matches** — usar `; true` (lição do SKILL-REFRESH-C).

---

## Próximos tickets (cadeia documental restante)

```
[FECHADO] D → [FECHADO] C → [ESTE] B
    ↘ [LATER] SKILL-REFRESH-I (Composição Funcional — 7+6+3)
    ↘ [LATER] SKILL-REFRESH-H (Organização de Módulo — 10+6+2)
    ↘ [LATER] SKILL-REFRESH-A (Bloco A simples — agregados sem brand)
    ↘ [LATER] SKILL-REFRESH-L (Síntese Canônica — 40+16+5+44)
```

Após este ticket, **5/7 sub-blocos** do SKILL.md consolidados. Faltarão I, H, A, L.
