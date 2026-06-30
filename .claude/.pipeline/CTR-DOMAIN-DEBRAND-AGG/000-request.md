# 000 — Request CTR-DOMAIN-DEBRAND-AGG

> **Frente A — Refactor radical do domínio (entrevista 0001).**
> **Destrava top-3 leverage #1** ("State Machine em Tipos") — habilita `CTR-DOMAIN-TAGGED-ERRORS` → `CTR-DOMAIN-STATE-MACHINE-CONTRACT/AMENDMENT`.
> Folha sem dependências (Bloco A).
> Continuação do teste do protocolo **Opção B**.

---

## Origem

- **Entrevista canônica:** [`handbook/interviews/0001-functional-ddd-domain-refresh.md`](../../../handbook/interviews/0001-functional-ddd-domain-refresh.md), **Bloco A** (Brand & Identity).
- **Decisões aplicáveis** (master doc):
  - **DO A§1** (L853): "Brand apenas em VOs folha."
  - **DO A§4** (L856): "Em transição de estado, usar helper `updateAggregate(prev, patch)` com `Partial<Omit<Aggregate, …imutáveis>>`."
  - **DON'T A§1** (L894): "**Brandar agregados.**" ← violação atual a corrigir.
  - **DON'T A§2** (L895): "`as unknown as T` em código de negócio." ← 10 ocorrências a eliminar.
- **Tabela canônica de tickets** (L954):
  > `CTR-DOMAIN-DEBRAND-AGG` — Bloco A — Remove brand de `Contract`/`Amendment`. Introduz `updateContract`/`updateAmendment` com `Partial<Omit<…, imutáveis>>`. **— (folha)**

---

## Estado atual (snapshot 2026-05-20)

### `src/modules/contracts/domain/contract/types.ts:23`
```ts
export type Contract = Brand<ContractShape, 'Contract'>;  // ← viola DON'T A§1
```

### `src/modules/contracts/domain/amendment/types.ts:28`
```ts
export type Amendment = Brand<AmendmentBase & AmendmentVariant, 'Amendment'>;  // ← viola DON'T A§1
```

### Casts `as unknown as Entity` (10 ocorrências em domain — violam DON'T A§2)

**`src/modules/contracts/domain/contract/contract.ts`:** 7 casts (linhas 67, 96, 118, 152, 162, 180, 187).
- L67 — `Contract.create` (cria entidade)
- L96 — transição (provavelmente `expire`)
- L118 — transição (`terminate`)
- L152, L162, L180, L187 — branches de `applyHomologatedAdjustment` (ValueIncrease/ValueDecrease/PeriodExtension/Acknowledgment)

**`src/modules/contracts/domain/amendment/amendment.ts`:** 3 casts (linhas 72, 98, 129).
- L72 — `Amendment.create`
- L98 — `attachSignedDocument`
- L129 — `homologate`

### Casts em adapters (não-domínio, mas ficam mais limpos)
- `adapters/persistence/mappers/contract.mapper.ts:104` — `as unknown as Contract` (rehydrate)
- `adapters/persistence/mappers/amendment.mapper.ts:102, 110, 113` — 3× `as unknown as Amendment` (rehydrate por variant)
- `adapters/persistence/repos/amendment-repository.drizzle.ts:45` — `as Amendment | null`

---

## Estado-alvo

### `src/modules/contracts/domain/contract/types.ts`
```ts
import type { AmendmentId, ContractId } from '../shared/ids.ts';
import type { Money } from '../shared/money.ts';
import type { Period } from '../shared/period.ts';

export type ContractStatus = 'Active' | 'Expired' | 'Terminated';

export type Contract = Readonly<{
  id: ContractId;
  sequentialNumber: string;
  title: string;
  objective: string;
  signedAt: Date;
  originalValue: Money;
  originalPeriod: Period;
  currentValue: Money;
  currentPeriod: Period;
  status: ContractStatus;
  homologatedAmendmentIds: readonly AmendmentId[];
  endedAt: Date | null;
}>;

// Campos imutáveis após criação (não entram em updateContract patch).
type ContractImmutableField =
  | 'id'
  | 'sequentialNumber'
  | 'title'
  | 'objective'
  | 'signedAt'
  | 'originalValue'
  | 'originalPeriod';

export type ContractUpdate = Partial<Omit<Contract, ContractImmutableField>>;

// Helper canônico de transição (DO A§4). Retorna nova instância imutável.
export const updateContract = (prev: Contract, patch: ContractUpdate): Contract =>
  Object.freeze({ ...prev, ...patch });

// (Mantém ContractAdjustment e CreateContractInput como estão.)
```

### `src/modules/contracts/domain/amendment/types.ts`
Análogo — mas Amendment é discriminated union (`kind: Addition | Suppression | TermChange | Misc`). O `kind` e seu variant (`impactValue`/`newEndDate`) são imutáveis após criação.

```ts
export type Amendment = AmendmentBase & AmendmentVariant;  // sem Brand

type AmendmentImmutableField =
  | 'id'
  | 'contractId'
  | 'amendmentNumber'
  | 'description'
  | 'createdAt'
  | 'kind'
  | 'impactValue'      // parte do variant — fixo
  | 'newEndDate';      // parte do variant — fixo

export type AmendmentUpdate = Partial<Omit<Amendment, AmendmentImmutableField>>;
// Mutáveis: status, signedDocumentRef, homologatedAt, homologatedBy

export const updateAmendment = (prev: Amendment, patch: AmendmentUpdate): Amendment =>
  Object.freeze({ ...prev, ...patch }) as Amendment;
```

**Nota:** o `as Amendment` final em `updateAmendment` é necessário porque o spread sobre discriminated union infere o tipo mais largo (perde o narrowing). Comentar in-line.

### `src/modules/contracts/domain/contract/contract.ts`
7 ocorrências de `as unknown as ContractEntity` viram:
- **Em `Contract.create`:** retorno direto do objeto literal (TS infere `Contract` sem brand).
- **Nas 6 transições:** usar `updateContract(prev, { ... patch })` — ganha tipo automaticamente.

### `src/modules/contracts/domain/amendment/amendment.ts`
3 ocorrências:
- **`Amendment.create`:** ou retorno direto (se TS consegue inferir discriminated union sem ajuda) ou cast `as Amendment` simples (não `as unknown as`).
- **`attachSignedDocument` / `homologate`:** usar `updateAmendment(prev, { ... patch })`.

---

## Escopo

### Em escopo

- `src/modules/contracts/domain/contract/types.ts` — remover Brand + adicionar `ContractUpdate` type + `updateContract` helper.
- `src/modules/contracts/domain/amendment/types.ts` — remover Brand + adicionar `AmendmentUpdate` type + `updateAmendment` helper.
- `src/modules/contracts/domain/contract/contract.ts` — remover 7 casts; usar `updateContract` nas 6 transições.
- `src/modules/contracts/domain/amendment/amendment.ts` — remover 3 casts; usar `updateAmendment` em 2 transições.
- Tests atualizados onde necessário (esperado: poucos — `Contract`/`Amendment` continuam type-compatible).

### Fora de escopo

- Casts em adapters (`mappers/`, `repos/`) — ficam **opcionalmente** mais limpos, mas o foco é domain. Pode-se simplificar `as unknown as X` → `as X` se TS aceitar (depende de discriminated union). Não é blocker.
- `Object.freeze` direto em `updateContract`/`updateAmendment` — vou usar `immutable()` do `shared/immutable.ts` (consistência com `CTR-SHARED-IMMUTABLE`). Importar em ambos.
- Sub-modules como `state-machine-contract.ts` (top-3 #1 — `CTR-DOMAIN-STATE-MACHINE-CONTRACT`, posterior).

---

## Critérios de aceitação

| # | Critério | Wave |
| :--- | :--- | :--- |
| CA-1 | Test files atualizados/criados existem e **falham** antes do W1 | W0 |
| CA-2 | `Contract` e `Amendment` não usam `Brand<>` (greps em `types.ts` retornam 0) | W1 |
| CA-3 | `updateContract` / `updateAmendment` exportados; retornam objetos frozen | W1 |
| CA-4 | Zero `as unknown as ContractEntity` em `contract.ts` | W1 |
| CA-5 | Zero `as unknown as AmendmentEntity` em `amendment.ts` | W1 |
| CA-6 | Tests de Contract / Amendment passam | W1 |
| CA-7 | Suite completa ≥ 552 (baseline pós-VO-CANONICAL) | W1 |
| CA-8 | Zero `throw`, `class`, `any` novo no diff | W2 |
| CA-9 | `Object.isFrozen(updateContract(c, {}))` é `true` | W1 (testado) |
| CA-10 | `Object.isFrozen(updateAmendment(a, {}))` é `true` | W1 (testado) |
| CA-11 | `pnpm run typecheck` verde | W3 |
| CA-12 | `pnpm run format:check` verde nos arquivos do ticket | W3 |
| CA-13 | `pnpm test` verde | W3 |
| CA-14 | `pnpm run lint` verde nos arquivos do ticket | W3 |

---

## Skills obrigatórias

| Wave | Skill | Razão |
| :--- | :--- | :--- |
| W0 — RED | [`tdd-strategist`](../../skills/tdd-strategist/SKILL.md) | Tests sobre desbrandamento + helper |
| W1 — GREEN | [`ts-domain-modeler`](../../skills/ts-domain-modeler/SKILL.md) | Aplicação Padrão A§4 + remover casts |
| W2 — REVIEW | [`code-reviewer`](../../skills/code-reviewer/SKILL.md) | **Executar gates do diff** + auditar tests com rigor (lições acumuladas) |
| W3 — QUALITY | [`ts-quality-checker`](../../skills/ts-quality-checker/SKILL.md) | 4 gates |

---

## Riscos

| Risco | Probabilidade | Mitigação |
| :--- | :--- | :--- |
| Spread sobre discriminated union perder narrowing em `updateAmendment` | Alta | Aceitar cast `as Amendment` no retorno (comentado) — não é `as unknown as` |
| Algum consumidor depender de `Contract` ser nominalmente distinto de `ContractShape` | Baixa | Grep `Brand<.*Contract\|Brand<.*Amendment` retorna 0 fora dos `types.ts` |
| Mappers de persistência precisarem de ajuste | Baixa | Cast `as Contract` em mapper pode simplificar de `as unknown as` para `as` se aceitarem |

---

## Próximos tickets habilitados

- `CTR-DOMAIN-TAGGED-ERRORS` — D24 da entrevista. Depende deste.
- `CTR-DOMAIN-STATE-MACHINE-CONTRACT` — depende deste + TAGGED-ERRORS.
- `CTR-DOMAIN-STATE-MACHINE-AMENDMENT` — idem.

**Top-3 leverage #1 destravado.**

---

## Autor / data

- **Autor:** Claude (via `contratos-orchestrator`, protocolo Opção B continuado).
- **Aberto em:** 2026-05-20.
