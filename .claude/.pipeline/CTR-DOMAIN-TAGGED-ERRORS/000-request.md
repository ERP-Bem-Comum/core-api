# 000 — Request CTR-DOMAIN-TAGGED-ERRORS

> **Frente A — Refactor radical do domínio (entrevista 0001).**
> Bloco D — Tagged Errors. Depende de `CTR-DOMAIN-DEBRAND-AGG` ✅.
> **Próxima etapa do top-3 leverage #1** (State Machine em Tipos) — habilita `CTR-DOMAIN-STATE-MACHINE-CONTRACT` + `CTR-DOMAIN-STATE-MACHINE-AMENDMENT`.
> Continuação do teste do protocolo **Opção B** — 5º ticket consecutivo.

---

## Origem

- **Entrevista canônica:** [`handbook/interviews/0001-functional-ddd-domain-refresh.md`](../../../handbook/interviews/0001-functional-ddd-domain-refresh.md), **Bloco D** (Tagged Errors & Invariantes).
- **Decisões aplicáveis** (master doc):
  - **DO D§22** (L874): "Tagged error shape **flat** (`{ tag, …payload }`). Case constructors como **free functions** em `errors.ts` por agregado (Padrão D consistente com B). Consumo via `import * as ContractError from './errors.ts'`."
  - **DO D§23** (L875): "Payload de erro de invariante carrega **as duas peças de evidência que colidiram** (estado atual + tentativa)."
  - **DO D§24** (L876): "Erros: **PascalCase adjetival/factual** (`ContractNotActive`). Eventos: PascalCase passado (`ContractCreated`)."
  - **DON'T D§21** (L914): "`export const ContractError = { … } as const` ao lado de `export type ContractError` — declaration merging informal, viola Padrão D do Bloco B."
  - **DON'T D§22** (L915): "Erro de invariante carregando primitivo cru sem ser evidência da colisão."
- **Tabela canônica de tickets** (L965):
  > `CTR-DOMAIN-TAGGED-ERRORS` — Bloco D — Migra todos string-literal pra tagged records `{ tag, …payload }` em `errors.ts` por agregado (free functions, Padrão D). Subtipos declarados nos returns. **Deps: DEBRAND-AGG.**

---

## Estado atual (snapshot 2026-05-20)

### `src/modules/contracts/domain/contract/errors.ts` (14 string literals)
```ts
export type ContractError =
  | 'contract-sequential-number-required'
  | 'contract-sequential-number-invalid-format'
  | 'contract-title-required'
  | 'contract-objective-required'
  | 'contract-invalid-signed-at'
  | 'contract-original-value-zero'
  | 'contract-invalid-event-date'
  | 'contract-not-active'
  | 'contract-cannot-expire-yet'
  | 'contract-cannot-expire-indefinite-period'
  | 'contract-cannot-extend-indefinite-period'
  | 'contract-value-would-go-negative'
  | 'contract-period-extension-not-after-current-end'
  | 'contract-amendment-already-applied';
```

### `src/modules/contracts/domain/amendment/errors.ts` (9 string literals)
```ts
export type AmendmentError =
  | 'amendment-number-required'
  | 'amendment-description-required'
  | 'amendment-invalid-created-at'
  | 'amendment-invalid-new-end-date'
  | 'amendment-impact-value-zero'
  | 'amendment-invalid-event-date'
  | 'amendment-not-pending'
  | 'amendment-document-already-attached'
  | 'amendment-without-signed-document';
```

### Consumidores
- **35 referências** a `ContractError`/`AmendmentError` em src/ + tests/.
- Sites de `return err('contract-*')` em `contract.ts` (~14 sítios) e `amendment.ts` (~6 sítios).
- ~20 asserts em tests usando `r.error === 'contract-...'`.

---

## Estado-alvo

### `contract/errors.ts` (Padrão D)

Cada erro vira:
1. Um **tagged variant type** `Readonly<{ tag: 'PascalCase'; ...payload? }>`.
2. Um **case constructor** free function de mesmo nome em camelCase (`contractNotActive(...)`).

Union exportada e cada variant individual (DO D24 — "Case constructor declarar o subtipo exato que produz").

```ts
import type { ContractStatus } from './types.ts';
import type { Period } from '../shared/period.ts';
import type { Money } from '../shared/money.ts';
import type { AmendmentId } from '../shared/ids.ts';

// ─── Variants (tagged records, PascalCase adjetival/factual) ───

export type ContractSequentialNumberRequired = Readonly<{ tag: 'ContractSequentialNumberRequired' }>;
export type ContractSequentialNumberInvalidFormat = Readonly<{ tag: 'ContractSequentialNumberInvalidFormat'; attempted: string }>;
export type ContractTitleRequired = Readonly<{ tag: 'ContractTitleRequired' }>;
export type ContractObjectiveRequired = Readonly<{ tag: 'ContractObjectiveRequired' }>;
export type ContractInvalidSignedAt = Readonly<{ tag: 'ContractInvalidSignedAt' }>;
export type ContractOriginalValueZero = Readonly<{ tag: 'ContractOriginalValueZero' }>;
export type ContractInvalidEventDate = Readonly<{ tag: 'ContractInvalidEventDate' }>;
export type ContractNotActive = Readonly<{ tag: 'ContractNotActive'; currentStatus: ContractStatus }>;  // D23 — evidência
export type ContractCannotExpireYet = Readonly<{ tag: 'ContractCannotExpireYet'; currentEnd: Date; attemptedAt: Date }>;  // D23
export type ContractCannotExpireIndefinitePeriod = Readonly<{ tag: 'ContractCannotExpireIndefinitePeriod' }>;
export type ContractCannotExtendIndefinitePeriod = Readonly<{ tag: 'ContractCannotExtendIndefinitePeriod' }>;
export type ContractValueWouldGoNegative = Readonly<{ tag: 'ContractValueWouldGoNegative'; currentValue: Money; attemptedDecrease: Money }>;  // D23
export type ContractPeriodExtensionNotAfterCurrentEnd = Readonly<{ tag: 'ContractPeriodExtensionNotAfterCurrentEnd'; currentEnd: Date; attemptedEnd: Date }>;  // D23
export type ContractAmendmentAlreadyApplied = Readonly<{ tag: 'ContractAmendmentAlreadyApplied'; amendmentId: AmendmentId }>;  // D23

// ─── Union ───
export type ContractError =
  | ContractSequentialNumberRequired
  | ContractSequentialNumberInvalidFormat
  | ContractTitleRequired
  | ContractObjectiveRequired
  | ContractInvalidSignedAt
  | ContractOriginalValueZero
  | ContractInvalidEventDate
  | ContractNotActive
  | ContractCannotExpireYet
  | ContractCannotExpireIndefinitePeriod
  | ContractCannotExtendIndefinitePeriod
  | ContractValueWouldGoNegative
  | ContractPeriodExtensionNotAfterCurrentEnd
  | ContractAmendmentAlreadyApplied;

// ─── Case constructors (Padrão D — free functions) ───
export const contractSequentialNumberRequired = (): ContractSequentialNumberRequired =>
  ({ tag: 'ContractSequentialNumberRequired' });
export const contractSequentialNumberInvalidFormat = (attempted: string): ContractSequentialNumberInvalidFormat =>
  ({ tag: 'ContractSequentialNumberInvalidFormat', attempted });
// ... 12 outros ...
```

### `amendment/errors.ts` análogo (9 tagged variants)

### Consumidores

`contract.ts` e `amendment.ts`:
```ts
import * as ContractError from './errors.ts';
// ...
return err(ContractError.contractNotActive(contract.status));
// ou onde haja evidência:
return err(ContractError.contractCannotExpireYet(currentEnd, attemptedAt));
```

Tests:
```ts
// Antes:
assert.equal(r.error, 'contract-not-active');
// Depois:
assert.equal(r.error.tag, 'ContractNotActive');
assert.equal(r.error.currentStatus, 'Expired');  // se houver payload
```

---

## Escopo

### Em escopo

- `src/modules/contracts/domain/contract/errors.ts` — reescrever (14 tagged variants + case constructors).
- `src/modules/contracts/domain/amendment/errors.ts` — análogo (9 tagged variants + case constructors).
- `src/modules/contracts/domain/contract/contract.ts` — migrar ~14 chamadas `err('contract-*')` para `err(ContractError.xxx(...))`.
- `src/modules/contracts/domain/amendment/amendment.ts` — migrar ~6 chamadas análogo.
- Tests:
  - `tests/modules/contracts/domain/contract/contract.test.ts` — atualizar ~10+ asserts.
  - `tests/modules/contracts/domain/amendment/amendment.test.ts` — atualizar ~6+ asserts.
- Use cases que propagam errors (5 use cases) — sem alteração de assinatura, só de tipo (que já flui automaticamente).
- Mappers/adapters: se algum loga error string, ajustar (provavelmente nenhum, mas grep confirma).

### Fora de escopo

- `CTR-DOMAIN-STATE-MACHINE-CONTRACT/AMENDMENT` — tickets posteriores.
- `CTR-DOMAIN-INVARIANT-CONTEXTUAL` (D26/D27 — NonZeroMoney brandado).

### Decisão de granularidade do payload (D23)

**Pragmatismo:** apenas erros de invariante runtime que comparam estado atual vs tentativa carregam payload de evidência. Erros de validação simples (`*-required`, `*-zero`, `*-invalid-event-date`) ficam **sem payload** — não há "duas peças que colidiram", apenas falha de validação binária.

**Com payload (5 tagged):**
- `ContractSequentialNumberInvalidFormat` — `attempted: string`
- `ContractNotActive` — `currentStatus: ContractStatus`
- `ContractCannotExpireYet` — `currentEnd: Date; attemptedAt: Date`
- `ContractValueWouldGoNegative` — `currentValue: Money; attemptedDecrease: Money`
- `ContractPeriodExtensionNotAfterCurrentEnd` — `currentEnd: Date; attemptedEnd: Date`
- `ContractAmendmentAlreadyApplied` — `amendmentId: AmendmentId`

**Sem payload (8 tagged Contract + 9 Amendment baseline):** os demais.

---

## Critérios de aceitação

| # | Critério | Wave |
| :--- | :--- | :--- |
| CA-1 | Test files atualizados existem e **falham** antes do W1 | W0 |
| CA-2 | `errors.ts` exporta tagged variants + case constructors em PascalCase/camelCase | W1 |
| CA-3 | Zero string literal `'contract-*'`/`'amendment-*'` em `errors.ts` (apenas em `tag:` values) | W1 |
| CA-4 | Case constructors são free functions (Padrão D — DON'T D§21) | W1 |
| CA-5 | Erros de invariante (5 contract + outros amendment) carregam payload de evidência | W1 |
| CA-6 | `contract.ts` consome `import * as ContractError` + chama case constructors | W1 |
| CA-7 | `amendment.ts` consome `import * as AmendmentError` + chama case constructors | W1 |
| CA-8 | Tests atualizados para `r.error.tag === 'PascalCase'` em vez de string literal | W1 |
| CA-9 | Suite completa verde — ≥ 564 baseline | W1 |
| CA-10 | Zero `throw`/`class`/`any` novo no diff | W2 |
| CA-11 | `pnpm run typecheck` verde | W3 |
| CA-12 | `pnpm run format:check` verde nos arquivos do ticket | W3 |
| CA-13 | `pnpm test` verde | W3 |
| CA-14 | `pnpm run lint` verde nos arquivos do ticket | W3 |

---

## Skills obrigatórias

| Wave | Skill | Razão |
| :--- | :--- | :--- |
| W0 — RED | [`tdd-strategist`](../../skills/tdd-strategist/SKILL.md) | Tests sobre tagged errors + case constructors |
| W1 — GREEN | [`ts-domain-modeler`](../../skills/ts-domain-modeler/SKILL.md) | Aplicação Bloco D + codemod call sites |
| W2 — REVIEW | [`code-reviewer`](../../skills/code-reviewer/SKILL.md) | Audit + gates executados (lições acumuladas) |
| W3 — QUALITY | [`ts-quality-checker`](../../skills/ts-quality-checker/SKILL.md) | 4 gates |

---

## Arquivos previstos

- `src/modules/contracts/domain/contract/errors.ts` — **reescrever** (14 variants + 14 case ctors).
- `src/modules/contracts/domain/amendment/errors.ts` — **reescrever** (9 variants + 9 case ctors).
- `src/modules/contracts/domain/contract/contract.ts` — ~14 sites de `err('contract-*')`.
- `src/modules/contracts/domain/amendment/amendment.ts` — ~6 sites.
- `tests/modules/contracts/domain/contract/contract.test.ts` — ~10+ asserts.
- `tests/modules/contracts/domain/amendment/amendment.test.ts` — ~6+ asserts.

---

## Riscos

| Risco | Probabilidade | Mitigação |
| :--- | :--- | :--- |
| Use cases que propagam errors precisarem de update | Baixa (errors fluem como type via Result<T,E>) | Typecheck pega; é só refactor sintático |
| Mappers ou CLI formatters quebrarem | Baixa (formatters usam type Period/Money, não Error) | Grep cobre |
| Migração big-bang ser grande demais | Média | Se Agent W1 estourar, particionar em sub-tickets (Contract + Amendment separados) |

---

## Próximos tickets habilitados

- `CTR-DOMAIN-STATE-MACHINE-CONTRACT` — depende deste + DEBRAND-AGG ✅. Top-3 #1 fecha.
- `CTR-DOMAIN-STATE-MACHINE-AMENDMENT` — idem.

---

## Autor / data

- **Autor:** Claude (via `contratos-orchestrator`, protocolo Opção B — 5º ticket).
- **Aberto em:** 2026-05-20.
