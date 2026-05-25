# 000 — Request CTR-SHARED-BRAND-UNIQUE-SYMBOL

> **Frente A — Refactor radical do domínio (entrevista 0001).**
> Folha sem dependências. Pertence ao **top-3 leverage #2** ("Parse, don't validate") junto com `CTR-SHARED-IMMUTABLE` (✅ fechado) e `CTR-SHARED-VO-CANONICAL` (dependente).
> **Continuação do teste do protocolo Opção B** — 4× `Agent(contratos-orchestrator)` em série.

---

## Origem

- **Entrevista canônica:** [`handbook/interviews/0001-functional-ddd-domain-refresh.md`](../../../handbook/interviews/0001-functional-ddd-domain-refresh.md), **Bloco B** — fechado em 2026-05-19.
- **Followup canônico:** [`Pergunta_B1_B2_B3_followup`](../../../handbook/interviews/0001/Pergunta_B1_B2_B3_followup_tec_lider_using_skill_ts-domain-modeler.md) §"6. Novo `shared/brand.ts` — PhD descreveu mas não codificou" (linhas 261-294).
- **Decisões aplicáveis** (DO/DON'T/CONSIDER do Bloco B):
  - **DO B§11** (master doc L863): "`shared/brand.ts` modernizado: `unique symbol` global + string literal `K`. Helper `Brand<T, K>` + `BrandOf<T>` para diagnóstico."
  - **DON'T B§12** (L905): "`declare const brand: unique symbol` espalhado em cada arquivo de VO — centraliza em `shared/brand.ts`."
  - **CONSIDER B§3** (L935): "`BrandOf<Money>` em testes/diagnóstico."
- **Tabela canônica de tickets** (L958):
  > `CTR-SHARED-BRAND-UNIQUE-SYMBOL` — Bloco B — Migra `shared/brand.ts` para `unique symbol` global + `Brand<T, K>` + `BrandOf<T>`. **— (folha, sem dependências)**.

---

## Estado atual (snapshot 2026-05-20)

`src/shared/brand.ts` (3 linhas):

```ts
declare const brand: unique symbol;

export type Brand<T, Tag extends string> = T & { readonly [brand]: Tag };
```

**Surpresa:** já usa `unique symbol`. O CLAUDE.md raiz e o STATUS-PROJETO-2026-05-19 descreviam o brand atual como "intersection com phantom string `__brand: K`" — desatualizado.

**O que falta vs estado-alvo da entrevista (§6 followup):**

| Item | Atual | Estado-alvo |
| :--- | :--- | :--- |
| Símbolo local | `brand` | `__brand` (legibilidade em mensagens de erro do TS) |
| Type param | `Tag extends string` | `K extends string` (consistente com nomenclatura `BrandOf<B extends { ... infer K }>`) |
| Helper `BrandOf<B>` | **ausente** | **adicionar** — destrava diagnóstico em testes (CONSIDER B§3) |
| JSDoc | ausente | adicionar (origem + uso restrito a VOs folha) |

**Consumidores atuais** (10 sítios, todos `Brand<T, K>` — só consomem a API, não tocam o símbolo interno):
- `src/modules/contracts/domain/contract/types.ts:23` — `Brand<ContractShape, 'Contract'>` (agregado)
- `src/modules/contracts/domain/amendment/types.ts:28` — `Brand<AmendmentBase & AmendmentVariant, 'Amendment'>` (agregado)
- `src/modules/contracts/domain/shared/ids.ts:5-8` — 4× `Brand<string, ...>` (`ContractId`, `AmendmentId`, `DocumentId`, `UserRef`)
- `src/modules/contracts/domain/shared/storage-key.ts:9`, `bucket-name.ts:8`, `period.ts:9`, `money.ts:4`

Nota: os 2 brandamentos em agregados (`Contract`, `Amendment`) violam Bloco A DON'T §1 (linha 894) — fora de escopo deste ticket. Vão ser removidos em `CTR-DOMAIN-DEBRAND-AGG`.

---

## Estado-alvo

```ts
// src/shared/brand.ts

/**
 * Marcação nominal de tipos (Brand types / nominal typing).
 *
 * Origem: handbook/interviews/0001-functional-ddd-domain-refresh.md §Bloco B
 *   - DO B§11: shared/brand.ts modernizado: unique symbol global + literal K.
 *   - DON'T B§12: declare const brand espalhado em cada arquivo de VO — centraliza aqui.
 *   - CONSIDER B§3: BrandOf<T> útil em testes/diagnóstico.
 *
 * USO RESTRITO: apenas VOs folha (Money, Period, ContractId, etc).
 * NUNCA em agregados — vide Bloco A DON'T §1 do master doc.
 */
declare const __brand: unique symbol;

/**
 * Brand<T, K> — marca um tipo T com uma identidade nominal K.
 * O símbolo `__brand` é único globalmente (declare const com unique symbol),
 * impossibilitando colisão estrutural acidental entre dois Brand de K iguais.
 */
export type Brand<T, K extends string> = T & { readonly [__brand]: K };

/**
 * BrandOf<B> — recupera o literal K de um tipo brandado.
 * Útil em testes e mensagens de diagnóstico.
 *
 * @example
 *   type X = BrandOf<Money>;        // 'Money'
 *   type Y = BrandOf<ContractId>;   // 'ContractId'
 *   type Z = BrandOf<string>;       // never (tipo não-brandado)
 */
export type BrandOf<B> = B extends { readonly [__brand]: infer K } ? K : never;
```

`src/shared/index.ts` continua reexportando `Brand` + adiciona `BrandOf`:

```ts
export type { Brand, BrandOf } from './brand.ts';
```

---

## Escopo

### Em escopo

- Reescrever `src/shared/brand.ts` para a forma canônica do estado-alvo (incluindo `BrandOf<B>`).
- Atualizar `src/shared/index.ts` para reexportar `BrandOf`.
- Testes em `tests/shared/brand.test.ts` cobrindo:
  - **Type-level** (validação via inferência em runtime no test): `BrandOf<Brand<T, K>>` extrai `K`; `BrandOf<T não-brandado>` é `never`.
  - **Estrutural runtime**: `Brand<T, K>` é atribuível a `T` (covariância no T preservada — necessário pra mappers); `T` não é atribuível a `Brand<T, K>` sem cast (nominal típico).
  - **Compatibilidade backward** com os 10 sítios consumidores existentes (renomear `Tag → K` e `brand → __brand` é interno; API pública `Brand<T, K>` estável).

### Fora de escopo

- Desbrandar agregados (`Contract`, `Amendment`) — `CTR-DOMAIN-DEBRAND-AGG`.
- Usar `BrandOf` em algum sítio real do domínio — vai com `CTR-SHARED-VO-CANONICAL`.
- Adotar Brand novo em VOs com smart constructors revisados — também `CTR-SHARED-VO-CANONICAL`.

---

## Critérios de aceitação

| # | Critério | Wave |
| :--- | :--- | :--- |
| CA-1 | `tests/shared/brand.test.ts` existe e **falha** antes do W1 (`BrandOf` não exportado ainda) | W0 |
| CA-2 | Após W1, `brand.ts` exporta `Brand` e `BrandOf` com assinaturas exatas | W1 |
| CA-3 | Símbolo interno renomeado para `__brand` (legibilidade) | W1 |
| CA-4 | Type param renomeado `Tag → K` (consistência) | W1 |
| CA-5 | `BrandOf<Brand<number, 'Foo'>>` é `'Foo'` (verificado em test via valor inferido) | W1 (testado) |
| CA-6 | `BrandOf<string>` é `never` (tipo não-brandado) | W1 (testado) |
| CA-7 | Os 10 sítios consumidores existentes continuam compilando sem alteração | W1 (`pnpm run typecheck` cobre) |
| CA-8 | `shared/index.ts` reexporta `Brand` e `BrandOf` (ambos como `type`) | W2 |
| CA-9 | Zero `throw`, `class`, `any` no diff | W2 |
| CA-10 | `pnpm run typecheck` verde | W3 |
| CA-11 | `pnpm run format:check` verde nos arquivos do ticket | W3 |
| CA-12 | `pnpm test` verde — ≥ 509 tests | W3 |
| CA-13 | `pnpm run lint` verde nos arquivos do ticket | W3 |

---

## Skills obrigatórias

| Wave | Skill | Razão |
| :--- | :--- | :--- |
| W0 — RED | [`tdd-strategist`](../../skills/tdd-strategist/SKILL.md) + [`typescript-language-expert`](../../agents/typescript-language-expert.md) (referência) | Testes type-level + estrutural |
| W1 — GREEN | [`ts-domain-modeler`](../../skills/ts-domain-modeler/SKILL.md) | Padrão D, free types, JSDoc com citação canônica |
| W2 — REVIEW | [`code-reviewer`](../../skills/code-reviewer/SKILL.md) | **AUDITAR TEST FILE COM MESMO RIGOR DE SRC/** (lição da W2 do CTR-SHARED-IMMUTABLE) |
| W3 — QUALITY | [`ts-quality-checker`](../../skills/ts-quality-checker/SKILL.md) | typecheck + format + test + lint nos arquivos do ticket |

---

## Arquivos previstos

| Arquivo | Ação | Wave |
| :--- | :--- | :--- |
| `tests/shared/brand.test.ts` | **Criar** | W0 |
| `src/shared/brand.ts` | **Reescrever** (3 LOC → ~30 LOC com JSDoc + `BrandOf`) | W1 |
| `src/shared/index.ts` | **Editar** (1 linha — adicionar `BrandOf` ao reexport) | W1 |

---

## Riscos e mitigações

| Risco | Probabilidade | Mitigação |
| :--- | :--- | :--- |
| Renomear `Tag → K` quebrar declaration merging em algum sítio | Baixa (grep não achou ninguém usando o param name) | Type param é local — invisível pra consumidores |
| Renomear `brand → __brand` mudar mensagem de erro de testes existentes | Média | Aceitável; é exatamente o ganho que a entrevista pede (msg de erro mais limpa) |
| `BrandOf<B>` exposto via `index.ts` colidir com outro nome | Baixa (grep confirma livre) | — |
| Teste type-level via inferência runtime ser frágil | Média | Usar pattern `const _: BrandOf<X> = 'X'` que falha tsc se inferência mudar |

---

## Protocolo Opção B — lição aplicada

**Lição da W2 do CTR-SHARED-IMMUTABLE:** REVIEW deixou passar 3 issues no test file admitindo textualmente "revisado tangencialmente". W3 detectou o gap.

**Aplicada aqui:** o briefing da W2 (3ª invocação) explicitamente exige auditar o test file com o **mesmo rigor** de `src/`. Pontos críticos a verificar:
- Format Prettier-compliant (blocos `assert.throws` em forma inline).
- Lint estrutural (`@typescript-eslint/no-confusing-void-expression` se `T = void`).
- Casts documentados (`as { ... }` apenas onde inevitável).

---

## Próximos tickets habilitados

- `CTR-SHARED-VO-CANONICAL` — depende deste + `CTR-SHARED-IMMUTABLE` ✅. Top-3 #2 fecha.
- Indireto: `CTR-DOMAIN-IMPORT-CODEMOD` (depende de VO-CANONICAL).

---

## Autor / data

- **Autor:** Claude (via `contratos-orchestrator`, protocolo Opção B continuado).
- **Aberto em:** 2026-05-20.
