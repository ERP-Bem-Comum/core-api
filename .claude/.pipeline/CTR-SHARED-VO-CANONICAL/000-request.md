# 000 — Request CTR-SHARED-VO-CANONICAL

> **Frente A — Refactor radical do domínio (entrevista 0001).**
> **Top-3 leverage #2 fecha aqui** ("Parse, don't validate"). Dependências `CTR-SHARED-IMMUTABLE` ✅ + `CTR-SHARED-BRAND-UNIQUE-SYMBOL` ✅ ambas verdes.
> **Ticket grande** — refator dos 7 VOs do módulo Contracts + codemod nos ~80-150 call sites. Big-bang num único ticket conforme entrevista DO B§12.
> Continuação do teste do protocolo **Opção B** — 4× `Agent(contratos-orchestrator)`.

---

## Origem

- **Entrevista canônica:** [`handbook/interviews/0001-functional-ddd-domain-refresh.md`](../../../handbook/interviews/0001-functional-ddd-domain-refresh.md), **Bloco B**.
- **Decisões aplicáveis** (DO/DON'T do Bloco B no master doc):
  - **DO B§8** (linha 860): "Module-as-namespace (Padrão D): exportar free functions; consumir com `import * as Money from './money.ts'`."
  - **DO B§9** (linha 861): "Smart constructor `from<Source>` retorna `Result<T, TaggedError>`. Tagged error carrega `attemptedValue: <tipo da assinatura>`."
  - **DO B§10** (linha 862): "Identidade fixa via facade `immutable()` / `deepImmutable()` em `shared/immutable.ts`."
  - **DO B§12** (linha 864): "Migração ~200 imports via codemod `ts-morph` **big-bang num único ticket**." ← **chave deste ticket**
  - **DON'T B§7** (linha 900): "Namespace-objeto `export const Money = { … }` (perde tree-shaking + jargão OO)."
  - **DON'T B§8** (linha 901): "Function-as-constructor `Money(100)` retornando `Result` (quebra semântica JS)."
  - **DON'T B§9** (linha 902): "Zod **dentro** de `shared/<vo>.ts` — Zod vive no Adapter/Borda."
  - **DON'T B§10** (linha 903): "Identidade como função (`zero()`) quando o valor é imutável puro."
  - **DON'T B§11** (linha 904): "Migração dual coexistente (Padrão A legado + Padrão D novo) — drift permanente." ← justifica big-bang
- **Decisão D24** (linha 876): "Erros: **PascalCase adjetival/factual** (`ContractNotActive`). Eventos: **PascalCase passado** (`ContractCreated`)." — mas erros **string literal kebab-case** continuam permitidos no Bloco I para use cases / domínio operacional (este ticket mantém string literals existentes; tagged records via `errors.ts` é alvo do ticket separado `CTR-DOMAIN-TAGGED-ERRORS`).
- **Tabela canônica de tickets** (linhas 959-960):
  > `CTR-SHARED-VO-CANONICAL` — Bloco B — Refatora os 7 VOs no novo template (module-as-namespace + free functions + `immutable` + tagged errors + Brand novo). **Deps: IMMUTABLE, BRAND-US.**
  > `CTR-DOMAIN-IMPORT-CODEMOD` — Codemod `ts-morph`: `import { X }` → `import * as X` (~200 imports). **Deps: VO-CANONICAL.**

**Decisão de escopo deste ticket:** **incorporar o codemod aqui mesmo** (big-bang da entrevista DO B§12). O ticket `CTR-DOMAIN-IMPORT-CODEMOD` ficaria sem propósito se VO-CANONICAL deixar drift Padrão A/D coexistente (proibido por DON'T B§11). Reabsorver os 2 tickets em 1 alinha com a intenção original do PhD.

---

## Estado atual (snapshot 2026-05-20)

7 VOs em `src/modules/contracts/domain/shared/` usando o antipattern proibido:

```ts
// Padrão atual (DON'T B§7 + DON'T D§21 — namespace-objeto + declaration merging):
export type Money = Brand<{ readonly cents: number }, 'Money'>;
export const Money = {
  fromCents: (...) => ...,
  zero: (): Money => ({ cents: 0 }) as Money,    // ← DON'T B§10 (identidade como função)
  add: (...) => ...,
  // ...
};
```

| Arquivo | Linhas | Funções | Defeitos pontuais |
| :--- | ---: | ---: | :--- |
| `money.ts` | 35 | 6 (`fromCents`, `zero`, `add`, `subtract`, `equals`, `greaterThan`) | `zero()` função → constante `ZERO`; 4 casts `as Money` |
| `period.ts` | 66 | 4 (`create`, `createIndefinite`, `contains`, `equals`, `isIndefinite`) | 3 casts `as Period`; `MIN_YEAR` constante interna mantida |
| `ids.ts` | 37 | 4 × 2 (= 8 — generate/rehydrate em ContractId/AmendmentId/DocumentId; só rehydrate em UserRef) | 8 casts `as XId`; duplicação de 4 namespace-objects |
| `bucket-name.ts` | 59 | 1 (`create`) | 1 cast `as BucketName` |
| `storage-key.ts` | (não lido — estimar similar) | — | — |
| `storage-ref.ts` | 49 | 1 (`create`) | composto, não brandado — segue regra; só remove namespace-objeto |

**Total estimado:** ~250 LOC em VOs + ~80-150 call sites para atualizar.

---

## Estado-alvo (Padrão D — module-as-namespace)

Template canônico extraído da entrevista 0001 (followup §5 endossado L215-259 + master doc Bloco B):

```ts
// src/modules/contracts/domain/shared/money.ts (NOVO)
import { type Result, ok, err } from '../../../../shared/result.ts';
import type { Brand } from '../../../../shared/brand.ts';
import { immutable } from '../../../../shared/immutable.ts';

export type Money = Brand<{ readonly cents: number }, 'Money'>;

export type MoneyError =
  | 'money-negative-value'
  | 'money-non-integer-value'
  | 'money-exceeds-safe-integer'
  | 'money-negative-result';

// ↓ Constante via `immutable` (DO B§10). Substitui o `zero()` função (DON'T B§10).
export const ZERO: Money = immutable({ cents: 0 }) as Money;

// ↓ Smart constructor — free function (DO B§8 Padrão D + DO B§9).
export const fromCents = (cents: number): Result<Money, MoneyError> => {
  if (!Number.isInteger(cents)) return err('money-non-integer-value');
  if (cents < 0) return err('money-negative-value');
  if (cents > Number.MAX_SAFE_INTEGER) return err('money-exceeds-safe-integer');
  return ok(immutable({ cents }) as Money);  // ← objeto novo também via immutable
};

export const add = (a: Money, b: Money): Money =>
  immutable({ cents: a.cents + b.cents }) as Money;

export const subtract = (a: Money, b: Money): Result<Money, 'money-negative-result'> => {
  const diff = a.cents - b.cents;
  if (diff < 0) return err('money-negative-result');
  return ok(immutable({ cents: diff }) as Money);
};

export const equals = (a: Money, b: Money): boolean => a.cents === b.cents;

export const greaterThan = (a: Money, b: Money): boolean => a.cents > b.cents;
```

Consumidores passam de:
```ts
import { Money } from '.../money.ts';
const r = Money.fromCents(100);
```

para:
```ts
import * as Money from '.../money.ts';
const r = Money.fromCents(100);
```

**Mudança invisível na superfície de chamada** — só o import muda. `Money.fromCents` continua sendo o caminho. Mas agora:
- Tree-shakable (DO B§7 implicit).
- Não há declaration merging informal (DON'T D§21 corrigido).
- Tree de tipos vs valores fica explícita (`Money` type via `import { type Money }`; runtime via `import * as Money`).

---

## Escopo

### Em escopo (big-bang)

**Em `src/modules/contracts/domain/shared/`:**

- `money.ts` — refator template canônico + `ZERO` constante + `fromCents` retorna objeto via `immutable()`.
- `period.ts` — refator + `MIN_YEAR` mantido (constante interna não exportada — ok); `create`/`createIndefinite` retornam objetos via `immutable()`.
- `ids.ts` — refator 4 IDs (ContractId, AmendmentId, DocumentId, UserRef) — cada um vira módulo separado? **Decisão:** manter `ids.ts` único (não fragmentar), exportando `generate`/`rehydrate` prefixados (`contractIdGenerate`, `contractIdRehydrate`...) ou cada ID em seu próprio módulo. **Escolha canônica:** **fragmentar em 4 arquivos** (`contract-id.ts`, `amendment-id.ts`, `document-id.ts`, `user-ref.ts`) para preservar Padrão D (cada módulo é o nome do VO). Conservar `ids.ts` como barrel reexportando os 4 (compat com algumas callsites).
- `bucket-name.ts` — refator + `create` retorna objeto via `immutable()`. **Mas** `BucketName` é `Brand<string, ...>` — string não precisa de `immutable` (primitivo); `immutable` só aplica em objetos. Manter `as BucketName` direto.
- `storage-key.ts` — análogo a bucket-name.
- `storage-ref.ts` — composto não-brandado; `create` retorna objeto via `immutable()` (DO B§10 para imutabilidade real do registro).

**Em call sites (~80-150 imports):**

- Trocar `import { Money }` por `import * as Money` em todos os sítios. Mesmo para `import { ContractId }`, `Period`, etc.
- **Manter `import type { Money }`** onde só o tipo é usado (verbatimModuleSyntax + tree-shaking otimizado).

**Tests (`tests/modules/contracts/domain/shared/`):**

- Atualizar import dos test files dos 7 VOs (Padrão D).
- Adicionar novos `it`'s validando uso de `immutable` (`Object.isFrozen(Money.fromCents(100).value)` deve ser `true`).

### Fora de escopo

- Desbrandar agregados (`Contract`, `Amendment`) — `CTR-DOMAIN-DEBRAND-AGG`.
- Tagged errors via `errors.ts` por agregado — `CTR-DOMAIN-TAGGED-ERRORS` (string literal kebab-case persiste neste ticket).
- `CTR-DOMAIN-IMPORT-CODEMOD` — **reabsorvido neste ticket** (justificativa: DON'T B§11 proíbe drift Padrão A/D).

---

## Critérios de aceitação

| # | Critério | Wave |
| :--- | :--- | :--- |
| CA-1 | Test files refatorados existem e **falham** antes do W1 (`import * as Money from ...` resolve a um módulo com `export const Money = {...}` namespace-objeto — não é importável dessa forma) | W0 |
| CA-2 | 7 VOs reescritos: zero `export const X = {...}`; só free functions exportadas | W1 |
| CA-3 | Constantes via `immutable()` — não funções (`Money.ZERO`, não `Money.zero()`) | W1 |
| CA-4 | Smart constructors retornam objetos via `immutable()` (CA-3 do CTR-SHARED-IMMUTABLE garante via teste) | W1 |
| CA-5 | `ids.ts` fragmentado em `contract-id.ts`, `amendment-id.ts`, `document-id.ts`, `user-ref.ts` + barrel | W1 |
| CA-6 | Call sites refatorados — zero `import { Money }` runtime; `import type` permitido | W1 |
| CA-7 | Tests dos VOs refatorados — todos verdes | W1 |
| CA-8 | Suite completa verde — ≥ 521 tests (baseline) | W1 |
| CA-9 | Zero `throw`, `class`, `any` novo no diff | W2 |
| CA-10 | Zero declaration merging (`export const X` ao lado de `export type X`) | W2 |
| CA-11 | `pnpm run typecheck` verde | W3 |
| CA-12 | `pnpm run format:check` verde nos arquivos do ticket | W3 |
| CA-13 | `pnpm test` verde | W3 |
| CA-14 | `pnpm run lint` verde nos arquivos do ticket | W3 |

---

## Skills obrigatórias

| Wave | Skill | Razão |
| :--- | :--- | :--- |
| W0 — RED | [`tdd-strategist`](../../skills/tdd-strategist/SKILL.md) + [`ts-domain-modeler`](../../skills/ts-domain-modeler/SKILL.md) | Testes do novo template para 7 VOs |
| W1 — GREEN | [`ts-domain-modeler`](../../skills/ts-domain-modeler/SKILL.md) | Refator dos VOs + codemod manual dos call sites |
| W2 — REVIEW | [`code-reviewer`](../../skills/code-reviewer/SKILL.md) | **Auditar src/ + tests/ + call sites com rigor anti-tangencial** |
| W3 — QUALITY | [`ts-quality-checker`](../../skills/ts-quality-checker/SKILL.md) | 4 gates |
| Todas | [`pipeline-maestro`](../../skills/pipeline-maestro/SKILL.md) | Orquestrar |

---

## Arquivos previstos

### Criar / reescrever em `src/`

- `src/modules/contracts/domain/shared/money.ts` — reescrever (Padrão D)
- `src/modules/contracts/domain/shared/period.ts` — reescrever (Padrão D)
- `src/modules/contracts/domain/shared/contract-id.ts` — **criar** (fragmento de `ids.ts`)
- `src/modules/contracts/domain/shared/amendment-id.ts` — **criar**
- `src/modules/contracts/domain/shared/document-id.ts` — **criar**
- `src/modules/contracts/domain/shared/user-ref.ts` — **criar**
- `src/modules/contracts/domain/shared/ids.ts` — converter em barrel reexportando os 4 ID arquivos
- `src/modules/contracts/domain/shared/bucket-name.ts` — reescrever
- `src/modules/contracts/domain/shared/storage-key.ts` — reescrever
- `src/modules/contracts/domain/shared/storage-ref.ts` — reescrever

### Editar call sites

- `src/modules/contracts/domain/contract/contract.ts` — atualizar imports
- `src/modules/contracts/domain/contract/types.ts` — idem
- `src/modules/contracts/domain/amendment/amendment.ts` — idem
- `src/modules/contracts/domain/amendment/types.ts` — idem
- `src/modules/contracts/application/use-cases/*.ts` — 6 use cases
- `src/modules/contracts/adapters/persistence/mappers/*.ts` — 4 mappers
- `src/modules/contracts/adapters/persistence/repos/*.drizzle.ts` — 2 repos
- `src/modules/contracts/cli/commands/*.ts` — 6 commands
- `src/modules/contracts/cli/formatters/*.ts` — 8 formatters
- Outros conforme grep encontrar.

### Editar tests

- `tests/modules/contracts/domain/shared/money.test.ts` + 6 outros
- `tests/modules/contracts/application/use-cases/*.test.ts` (6)
- `tests/modules/contracts/adapters/persistence/*.test.ts` (vários)

---

## Riscos e mitigações

| Risco | Probabilidade | Mitigação |
| :--- | :--- | :--- |
| Escopo grande → Agent W1 estoura turno | Alta | Se W1 falhar por escopo, particionar retroativamente em 4 sub-tickets (Money/Period/IDs/Storage) |
| Codemod manual perder algum import | Média | Grep final `grep -rn "import.*{ Money\|import.*{ Period\|..." src/ tests/` deve retornar zero hits (ou só `import type`) |
| Renomear `ZERO` quebrar callers | Baixa | Money.zero() callers raros; codemod equivalente |
| Fragmentação `ids.ts` quebrar callers via tipo | Baixa | Barrel `ids.ts` reexporta os 4 — `import type { ContractId } from '.../ids.ts'` continua funcionando |
| Drift Padrão A/D em algum sítio escondido | Média | W2 grep `export const \w+ = {` em `src/modules/contracts/domain/shared/` deve retornar zero |

---

## Protocolo Opção B — adaptação para ticket grande

Este é o ticket mais escopo até agora. As 4 invocações Agent serão:

| # | Wave | Briefing principal |
| :--- | :--- | :--- |
| 1 | W0 — RED | Atualizar 7 test files dos VOs + adicionar guards de `Object.isFrozen`; RED esperado |
| 2 | W1 — GREEN | Refator dos 7 VOs (template canônico) + codemod manual dos imports em call sites; GREEN esperado |
| 3 | W2 — REVIEW | Audit do diff massivo. **Lição CTR-SHARED-IMMUTABLE + BRAND aplicada:** auditar tests + src + call sites EXECUTANDO typecheck + lint específicos do diff |
| 4 | W3 — QUALITY | 4 gates. Espera-se verde — se BLOCKED, prováveis causas: imports faltando ou cast oblíquo |

**Se W1 falhar por escopo:** particiono retroativamente em sub-tickets. Documento decisão.

---

## Próximos tickets habilitados

- `CTR-DOMAIN-DEBRAND-AGG` (folha paralela, já habilitada — destrava top-3 #1).
- `CTR-DOMAIN-COMPOSE-REFACTOR` (depende de `CTR-SHARED-RESULT-COMBINATORS` ✅ — já habilitado).
- **Top-3 #2 (Parse, don't validate) FECHA COM ESTE TICKET.**

---

## Autor / data

- **Autor:** Claude (via `contratos-orchestrator`, protocolo Opção B em escala).
- **Aberto em:** 2026-05-20.
