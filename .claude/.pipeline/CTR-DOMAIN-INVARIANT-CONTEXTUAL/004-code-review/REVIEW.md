# W2 — REVIEW — CTR-DOMAIN-INVARIANT-CONTEXTUAL

> **Veredito:** APPROVED — round 1.

**Reviewer:** code-reviewer  
**Data:** 2026-05-20  
**Escopo revisado:**

| Arquivo | Categoria |
| :--- | :--- |
| `src/modules/contracts/domain/shared/non-zero-money.ts` | NOVO — auditoria profunda |
| `src/modules/contracts/domain/amendment/types.ts` | impactValue: NonZeroMoney |
| `src/modules/contracts/domain/amendment/amendment.ts` | validateVariantInput sem runtime check |
| `src/modules/contracts/application/use-cases/create-amendment.ts` | NonZeroMoney.from + erro mapeado |
| `src/modules/contracts/adapters/persistence/mappers/amendment.mapper.ts` | rehidratação via NonZeroMoney |
| `tests/modules/contracts/domain/shared/non-zero-money.test.ts` | sanidade CA1/CA2/CA5 |
| `tests/modules/contracts/domain/amendment/amendment.test.ts` | CA3 @ts-expect-error |
| `tests/modules/contracts/adapters/persistence/amendment.mapper.test.ts` | CA7 shape impossível |

---

## Issues encontradas

### Críticas (bloqueiam approval)

Nenhuma.

### Importantes (não bloqueiam, registrar)

Nenhuma.

### Sugestões (estilo / clareza)

#### Sugestão 1 — `amendment.mapper.ts:4-5` — sufixo `NS` no namespace de importação

**Categoria:** G (naming)  
**Contexto:** O mapper usa dual import para `NonZeroMoney`:

```ts
import type { NonZeroMoney } from '../../../domain/shared/non-zero-money.ts';
import * as NonZeroMoneyNS from '../../../domain/shared/non-zero-money.ts';
```

O sufixo `NS` é incomum no projeto. O padrão dos outros mappers é `import * as Foo` (namespace) + `import type { Foo as FooType }` (tipo com alias `Type`). Aqui a inversão é necessária porque o tipo exportado tem exatamente o mesmo nome que o módulo (`NonZeroMoney`), e `import * as NonZeroMoney` colidiria com `import type { NonZeroMoney }` no mesmo escopo sob `verbatimModuleSyntax`.

**Avaliação:** a solução adotada (`NS` suffix) é a única alternativa sem renomear o tipo ou usar `NonZeroMoneyNS.NonZeroMoney` em todos os anotações de `VariantPart` — o que seria mais verboso. **Defensável.** Documentar na próxima refatoração de imports (`CTR-DOMAIN-IMPORT-CODEMOD`).

---

## Auditoria especial — Desvio D1 do W1: `__nonZeroMoney` sem `unique symbol`

### Problema declarado

O 000-request.md especificou `type NonZeroMoney = Brand<Money, 'NonZeroMoney'>`. O W1 reportou que essa definição resolve para `never` e usou `Money & { readonly __nonZeroMoney: true }` como workaround.

### Análise técnica — é verdade que `Brand<Money, 'NonZeroMoney'>` resolve para `never`?

**Sim. A análise é correta.** Demonstração:

```ts
// De src/shared/brand.ts:
declare const __brand: unique symbol;
type Brand<T, K extends string> = T & { readonly [__brand]: K };

// Money:
type Money = Brand<{ readonly cents: number }, 'Money'>
           = { readonly cents: number } & { readonly [__brand]: 'Money' };

// Tentativa de Brand<Money, 'NonZeroMoney'>:
type Attempt = Brand<Money, 'NonZeroMoney'>
             = Money & { readonly [__brand]: 'NonZeroMoney' }
             = { readonly cents: number }
               & { readonly [__brand]: 'Money' }   // de Money
               & { readonly [__brand]: 'NonZeroMoney' }; // novo brand

// `__brand` é `unique symbol` — é uma ÚNICA chave computada.
// A propriedade teria tipo `'Money' & 'NonZeroMoney'`.
// Como `'Money'` e `'NonZeroMoney'` são literais string distintos:
//   'Money' & 'NonZeroMoney' = never
// Portanto:
//   Attempt = { readonly cents: number } & { readonly [__brand]: never }
//           = never  (toda interseção com `never` é `never`)
```

O campo `[__brand]` é uma **chave computada por unique symbol** — não é uma propriedade de string. Dois tipos com a **mesma chave** (`[__brand]`) e valores incompatíveis (`'Money'` e `'NonZeroMoney'`) produzem `never` na interseção. Isso é uma **limitação estrutural do helper `Brand<T, K>`** para nested branding (brand sobre brand).

### A solução `Money & { readonly __nonZeroMoney: true }` é idiomática?

**Sim. É a solução canônica para este caso específico.**

1. **Não viola DON'T B§12** — "declare const brand: unique symbol espalhado em cada arquivo de VO" é o que é proibido. O `non-zero-money.ts` **não declara** nenhum `unique symbol`. Usa uma propriedade nomeada literal (`__nonZeroMoney`), que é um campo de objeto regular.

2. **Não viola DO B§11** — o `unique symbol` de brand continua centralizado exclusivamente em `src/shared/brand.ts`. O `non-zero-money.ts` não toca em `brand.ts`.

3. **Garante nominalidade suficiente** — `Money & { readonly __nonZeroMoney: true }` não é assignable a partir de `Money` cru (TS bloqueia atribuição direta), confirmado pelo `@ts-expect-error` no teste CA5 (linha 136-139 de `non-zero-money.test.ts`) e pelo typecheck verde (`tsc --noEmit` zero erros).

4. **Garante polimorfismo correto** — `NonZeroMoney extends Money` (widening automático) porque `NonZeroMoney` tem todos os campos de `Money` mais um adicional. Confirmado pelo teste CA5 (linhas 84-148).

5. **eslint-disable justificado** — a regra `@typescript-eslint/naming-convention` proíbe `leadingUnderscore` além de 1 (`leadingUnderscore: 'allow'` aceita apenas 1 underscore). O `__nonZeroMoney` tem 2 underscores → disable cirúrgico na linha 36 é necessário e correto (mesmo padrão de `src/shared/brand.ts:16`).

6. **Documentação interna adequada** — o JSDoc no arquivo explica o raciocínio em detalhes (linhas 17-25), citando DO B§11 e a natureza do `unique symbol`. Qualquer desenvolvedor futuro entenderá a decisão sem precisar escavar commits.

### Limitação documentada do helper `Brand`

O helper `Brand<T, K>` em `src/shared/brand.ts` **não suporta nested branding** (brand sobre tipo já brandado). Esta é uma limitação conhecida do padrão `unique symbol` no TypeScript — dois brands sobre a mesma chave colidem. A solução `Money & { readonly __nonZeroMoney: true }` é o padrão estabelecido na literatura TS para este cenário (intersection manual com campo auxiliar nomeado distinto).

**Recomendação:** documentar esta limitação em `handbook/reference/typescript/ts-branded-types.md` como nota para casos de nested branding futuros (ex: `PositiveMoney`, `MoneyGT100`).

---

## Cobertura dos 9 CAs

| CA | Descrição | Status | Evidência |
| :--- | :--- | :--- | :--- |
| CA1 | `NonZeroMoney` VO brandado em `domain/shared/` | PASS | `non-zero-money.ts` existe; exporta tipo + erro + `from()` |
| CA2 | `from()` retorna `Result<NonZeroMoney, 'money-must-be-non-zero'>` | PASS | linha 42-43 de `non-zero-money.ts`; cobertura em `non-zero-money.test.ts` |
| CA3 | `AmendmentVariant` exige `NonZeroMoney`; `@ts-expect-error` verde | PASS | `types.ts:28-29`, `amendment.test.ts:667` |
| CA4 | Runtime check `cents === 0` removido do domínio | PASS | `grep "impactValue.cents === 0" domain/` → zero hits |
| CA5 | Polimorfismo Money ↔ NonZeroMoney (widening automático, reverso bloqueado) | PASS | `non-zero-money.test.ts:84-148`; `@ts-expect-error` linha 136 |
| CA6 | Use case refina via `NonZeroMoney.from` na borda (rota γ) | PASS | `create-amendment.ts:86-88`; erro mapeado para `amendmentImpactValueZero` |
| CA7 | Mapper rehidrata + shape impossível `Addition+0 → amendment-mapper-impossible-shape` | PASS | `amendment.mapper.ts:114-115`; `amendment.mapper.test.ts:276-307` |
| CA8 | Cobertura ≥ 630; ≥ 5 novos testes | PASS | STATE.md reporta 639 (+5 novos desde baseline 634) |
| CA9 | typecheck ✅ lint ✅ test ✅ format ⚠ README.md pré-existente (aceitável) | PASS | `pnpm run typecheck` e `pnpm run lint` zero erros (verificados nesta review) |

---

## Verificações canônicas adicionais

| Regra | Resultado |
| :--- | :--- |
| Zero `throw`, `class`, `this`, `any` no domínio | PASS — greps negativos |
| `import type` em todos os imports puramente de tipo | PASS — `verbatimModuleSyntax` respeitado em todos os 5 arquivos |
| Extensões `.ts` em todos os imports relativos | PASS |
| DON'T B§12 — sem `declare const unique symbol` fora de `brand.ts` | PASS — grep negativo |
| DON'T D§24 — invariante não codificada como `if` no agregado | PASS |
| DON'T D§25 — mesmo `if` não espalhado | PASS — declarado uma vez em `from()` |
| Erro mapeado preserva compatibilidade externa (`amendmentImpactValueZero`) | PASS — `create-amendment.ts:87` |
| Sequência canônica use case (validar → fetch → domain → persist → publish) | PASS — `create-amendment.ts:108-149` |
| Cast `as NonZeroMoney` controlado — só no smart constructor | PASS — `non-zero-money.ts:43` |
| Mapper `as unknown as SubType` com comentário explicando | PASS — `amendment.mapper.ts:160-163` |
| `validateVariantInput` switch exaustivo sem `default: throw` | PASS — switch sem default, coberto por `noImplicitReturns` + typecheck |

---

## O que está bom

- **JSDoc exemplar em `non-zero-money.ts`** — a seção "Por que não `Brand<Money, 'NonZeroMoney'>`?" demonstra que o desenvolvedor entendeu a limitação do helper e documenta a decisão com precisão técnica. Qualquer revisor futuro não precisará de análise externa.
- **eslint-disable cirúrgico** — o `// eslint-disable-next-line @typescript-eslint/naming-convention` está exatamente na linha que precisa (l.36), não desabilita o arquivo inteiro, e segue o mesmo padrão de `brand.ts`.
- **CA3 via `@ts-expect-error`** — a trave estática de compilação é verificada via `@ts-expect-error` no teste, que só fica verde quando o tipo realmente bloqueia. Essa abordagem é superior a um teste puramente de runtime para invariantes de tipo.
- **Mapper separa eixos `kind` e `status`** — a função `variantFromRow` resolve o eixo `kind` antes do switch de `status`, evitando o cross-product de 4×3=12 branches (DON'T C§26). Estrutura limpa.
- **Sequência canônica preservada no use case** — `buildDomainInput` valida e refina na borda; `Amendment.create` recebe input já tipado; `save` antes de `publish`. Nenhum evento publicado em falha.
- **Compatibilidade de erro preservada** — `NonZeroMoneyError` ('money-must-be-non-zero') nunca vaza para o union `CreateAmendmentError`. O use case mapeia para `amendmentImpactValueZero`, mantendo contratos com callers externos.

---

## Próximo passo

W3 QUALITY — `ts-quality-checker`:

```bash
pnpm run typecheck    # zero erros esperado (verificado nesta review)
pnpm run format:check # format:check pré-existente em README.md — aceitável (CA9)
pnpm test             # 639 testes esperados
```
