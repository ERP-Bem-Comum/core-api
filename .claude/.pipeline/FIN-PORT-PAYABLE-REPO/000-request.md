# FIN-PORT-PAYABLE-REPO — Port `PayableRepository` + adapter InMemory + contract test suite

> **Size:** S · **Status:** open · **Criado por:** main-session (Opus 4.7) via skill `ports-and-adapters`
> **Predecessor:** `FIN-AGG-PAYABLE-PAYMENT` (closed-green — agregado 100% implementado)
> **Sucessor previsto:** `FIN-USECASE-APPROVE-PAYABLE` (S) — primeiro use case real
>
> **Primeiro ticket da camada Application do módulo Financial.** Sai do domínio puro.

---

## 1. Contexto

Após 10 tickets `FIN-*` no domínio puro entregarem o agregado `Payable` completo (7 estados, 9 transições, 9 eventos, 30 erros tagged, 1.058 linhas de produção), este ticket inicia a **camada Application** definindo o **port de persistência** + adapter InMemory.

**Princípios aplicáveis (skill `ports-and-adapters` carregada):**
- Ports são `type Readonly<{...}>`, **não interface, não class**.
- Domínio declara o que precisa; adapter implementa.
- `throw` permitido em adapter → converter para `Result` antes de cruzar a borda.
- **Dois adapters sempre:** real (Drizzle/MySQL — vem em ticket futuro) + InMemory (este ticket — para teste/CLI).
- Critério H2: port fica em `domain/<aggregate>/repository.ts` porque é ditado por invariâncias do agregado (pattern do `contracts/domain/contract/repository.ts`).

**Citações do handbook (`04-titulos-liquidacao-context.md`):**
- `:57` — **R2 (Anti-Duplicidade FITID):** "O sistema deve recusar a importação de qualquer transação de extrato cujo `FITID` já tenha sido processado anteriormente." Enforce via `findByFitid` + erro `payable-fitid-duplicate` no `save`.
- `:54` — **R1 (Soberania da Aprovação):** invariante de domínio (não do port). Já enforce no agregado.

### 1.1. Decisão de escopo — outbox NÃO neste ticket

O `contracts/domain/contract/repository.ts` tem `save(agg, events)` com OutboxAppendError integrado. Para Financial, o padrão será replicado **em ticket dedicado** (`FIN-PORT-OUTBOX`) antes do primeiro use case que publica evento cross-módulo. Razões:

1. **Foco do S:** este ticket entrega 1 port + 1 InMemory + 1 contract suite — escopo já completo.
2. **Outbox precisa de FinancialModuleEvent** (decoder versionado v1, isContractsModuleEvent-like). Implica criar `public-api/events.ts` do financial — outro ticket S.
3. **YAGNI:** Payable ainda não tem use case publicando evento. Outbox sem consumer é over-engineering.

Versão MVP: `save(payable: Payable)` simples. Eventos do Payable serão consumidos pelo use case respectivo via `EventBus` injetado quando o ticket de use case existir.

### 1.2. Decisão de escopo — refactor de errors threshold (30 variants) NÃO neste ticket

Tech-debt sinalizada em `FIN-AGG-PAYABLE-PAYMENT` (errors.ts threshold comment). Avaliação rápida:

- Refactor envolve criar 3 sub-unions tipadas (`PayableValidationError`, `PayableInvariantError`, `PayableTransitionError`) e atualizar 30 constructors + 1 exhaustive switch teste + qualquer consumer.
- Sem use case consumer ainda, refactor é **especulativo** — não sabemos qual agrupamento serve melhor à camada Application.
- **Recomendação:** **adiar para ticket dedicado** (`FIN-DOMAIN-ERROR-GROUPING-REFACTOR`, XS-S) **após** o primeiro use case real, quando os padrões de consumo aparecerem.

Este ticket: foco em port + adapter + suite reusável.

---

## 2. Escopo

### 2.1. Arquivos novos (5)

```
src/modules/financial/
├── domain/
│   └── payable/
│       └── repository.ts                              ← NOVO (port type contract)
└── adapters/
    └── persistence/
        └── repos/
            └── payable-repository.in-memory.ts        ← NOVO (adapter para teste/CLI)

tests/modules/financial/
├── adapters/
│   └── persistence/
│       ├── payable-repository.suite.ts                ← NOVO (suite reusável .suite.ts)
│       └── payable-repository.in-memory.test.ts       ← NOVO (consome suite)
└── application/
    └── ports/
        └── payable-repository.contract.ts             ← NOVO (apenas shape do port)
```

### 2.2. Port `PayableRepository`

```ts
// src/modules/financial/domain/payable/repository.ts
import type { Result } from '#src/shared/primitives/result.ts';
import type { FITID } from '../shared/fitid.ts';
import type { PayableId } from '../shared/payable-id.ts';
import type { Payable } from './types.ts';

export type PayableRepositoryError =
  | 'payable-repo-unavailable'
  | 'payable-repo-conflict' // optimistic lock / unique violation transient
  | 'payable-fitid-duplicate'; // R2 (Anti-Duplicidade FITID) — enforce em save

export type PayableRepository = Readonly<{
  /**
   * Busca um Payable pelo ID. `null` se não encontrado (não-erro — é o canônico "not found").
   */
  findById: (id: PayableId) => Promise<Result<Payable | null, PayableRepositoryError>>;

  /**
   * Busca um Payable cujo sub-estado `PaidFromBank` (ou seu derivado `Settled` Bank)
   * tenha o `fitid` informado. Critical para R2 (Anti-Duplicidade): antes de aceitar
   * uma nova transação bancária, application checa via este método.
   *
   * Retorna `null` quando nenhum Payable consumiu esse FITID ainda.
   * Retorna Payable quando alguém já consumiu (na maioria dos casos, o adapter de
   * Integração Bancária descartará silenciosamente).
   */
  findByFitid: (fitid: FITID) => Promise<Result<Payable | null, PayableRepositoryError>>;

  /**
   * Lista todos os Payables. MVP — paginação/filtro vem com use cases reais.
   */
  list: () => Promise<Result<readonly Payable[], PayableRepositoryError>>;

  /**
   * Persiste (upsert por `id`). Se o Payable é Bank-Paid/Settled e o `fitid` já existe
   * em outro Payable, retorna `payable-fitid-duplicate` (enforce R2 no save — defesa em
   * profundidade contra race entre check via findByFitid e save).
   *
   * Adapter MySQL (futuro) implementa via UNIQUE INDEX em `fin_payables.fitid` + SELECT-then-UPDATE-or-INSERT (ADR-0020).
   */
  save: (payable: Payable) => Promise<Result<void, PayableRepositoryError>>;
}>;
```

### 2.3. Adapter `InMemoryPayableRepository`

Espelha `contract-repository.in-memory.ts`:

```ts
// src/modules/financial/adapters/persistence/repos/payable-repository.in-memory.ts
export type InMemoryPayableRepositoryHandle = Readonly<{
  repo: PayableRepository;
  store: () => readonly Payable[];
  clear: () => void;
}>;

export const InMemoryPayableRepository = (): InMemoryPayableRepositoryHandle => {
  const map = new Map<PayableId, Payable>();

  const hasFitid = (p: Payable, fitid: FITID): boolean =>
    (p.status === 'Paid' || p.status === 'Settled') &&
    p.paidVia === 'Bank' &&
    p.fitid === fitid;

  const repo: PayableRepository = {
    findById: async (id) => ok(map.get(id) ?? null),
    findByFitid: async (fitid) =>
      ok([...map.values()].find((p) => hasFitid(p, fitid)) ?? null),
    list: async () => ok([...map.values()]),
    save: async (payable) => {
      // R2 enforce: se save introduz FITID que JÁ EXISTE em outro Payable, rejeita.
      if (
        (payable.status === 'Paid' || payable.status === 'Settled') &&
        payable.paidVia === 'Bank'
      ) {
        const owner = [...map.values()].find(
          (p) => p.id !== payable.id && hasFitid(p, payable.fitid),
        );
        if (owner) return err('payable-fitid-duplicate');
      }
      map.set(payable.id, payable);
      return ok(undefined);
    },
  };

  return {
    repo,
    store: () => [...map.values()],
    clear: () => map.clear(),
  };
};
```

### 2.4. Suite reusável `payable-repository.suite.ts`

Pattern do `contract-repository.suite.ts` — função `(makeImpl) => void` que adapters InMemory/Drizzle consomem dentro do próprio `describe()`. Convenção de `.claude/rules/testing.md` (suítes reusáveis com sufixo `.contract.ts` ou `.suite.ts` NÃO são executadas diretas — apenas exportam função).

Suite cobre:
- `findById` happy + null
- `findByFitid` (apenas em Bank-Paid/Settled)
- `list` empty + populated
- `save` upsert (não duplica)
- `save` rejeita `payable-fitid-duplicate` em colisão real

### 2.5. Shape contract `payable-repository.contract.ts`

Apenas verifica a SHAPE do port (typeof functions, sem business logic). Pattern do `document-storage.contract.ts`.

---

## 3. Critérios de aceitação

| # | Critério | Verificação |
| :--- | :--- | :--- |
| CA-1 | `PayableRepositoryError` union com 3 literais (`unavailable`, `conflict`, `fitid-duplicate`) | exhaustive switch test |
| CA-2 | `PayableRepository` exporta 4 funções (`findById`, `findByFitid`, `list`, `save`) | shape contract test |
| CA-3 | InMemory `findById` retorna `null` para ID inexistente (não erro) | suite test |
| CA-4 | InMemory `findById` retorna Payable após save | suite test |
| CA-5 | InMemory `findByFitid` retorna `null` quando nenhum Payable tem FITID | suite test |
| CA-6 | InMemory `findByFitid` retorna o Payable correto quando há Bank-Paid com FITID | suite test |
| CA-7 | InMemory `findByFitid` retorna `null` para Manual-Paid (Manual não tem FITID) | suite test |
| CA-8 | InMemory `list` retorna array vazio inicial | suite test |
| CA-9 | InMemory `list` retorna todos os Payables salvos | suite test |
| CA-10 | InMemory `save` é upsert por ID (não duplica) | suite test |
| CA-11 | InMemory `save` rejeita com `payable-fitid-duplicate` quando OUTRO Payable já tem mesmo FITID | suite test (R2) |
| CA-12 | InMemory `save` ACEITA mesmo FITID se for o MESMO Payable (upsert de Bank-Paid) | suite test (não false positive) |
| CA-13 | `InMemoryPayableRepositoryHandle` expõe `repo`, `store`, `clear` | shape test |
| CA-14 | `payable-repository.suite.ts` é função exportada `(makeImpl) => void` — NÃO executa standalone | confirmação via discovery (`pnpm test` não descobre) |
| CA-15 | Header doc cita R2 do handbook | code-reviewer W2 |
| CA-16 | `pnpm run typecheck` verde | comando |
| CA-17 | `pnpm run format:check` verde | comando |
| CA-18 | `pnpm test` verde — 1065 anteriores + novos | comando |
| CA-19 | `pnpm run lint` verde | comando |

---

## 4. Decisões de modelagem (D1-D7)

| # | Decisão | Justificativa |
| :--- | :--- | :--- |
| **D1** | Port em `domain/payable/repository.ts` (não `application/ports/`) | Critério H2 §3.H.2 DO H§34 — port é ditado pelas invariâncias do agregado. Pattern idêntico ao `contracts/domain/contract/repository.ts`. |
| **D2** | `save(payable)` SEM `events` argument no MVP | D1 do §1.1 — outbox em ticket dedicado. Quando vier, atualização compatível (events default vazio). |
| **D3** | `findByFitid` aceita qualquer Payable; helper `hasFitid` no InMemory filtra Bank-Paid/Settled | Centraliza lógica de "qual Payable tem FITID" no adapter. Port é genérico — adapter MySQL real terá `WHERE fitid = ? AND fitid IS NOT NULL`. |
| **D4** | `payable-fitid-duplicate` como erro do **port** (não do agregado) | É invariante de persistência cross-aggregate (não cabe ao agregado individual saber de outros). Análogo a `contract-repo-conflict`. |
| **D5** | Tipo `PayableRepositoryError` é **string literal union** (não tagged como o agregado) | Padrão do `ContractRepositoryError`. Errors do port são simples — sem payload de evidência. |
| **D6** | `InMemoryPayableRepositoryHandle` retorna `{ repo, store, clear }` — não apenas `repo` | Tests precisam inspecionar/limpar store. Pattern de `InMemoryContractRepositoryHandle`. |
| **D7** | Suite `.suite.ts` é função `(makeImpl) => void` reusável; adapter Drizzle (futuro) consome a mesma suite | DRY — contract suite valida que QUALQUER impl atende ao port. Convenção `.claude/rules/testing.md`. |

---

## 5. Estratégia de teste (W0)

| Arquivo | Testes | Descrição |
| :--- | ---: | :--- |
| `application/ports/payable-repository.contract.ts` | 1 | Shape do port (4 funções tipadas) |
| `adapters/persistence/payable-repository.suite.ts` | função exportada (~13 testes via factory) | Cobre CA-3..CA-12 |
| `adapters/persistence/payable-repository.in-memory.test.ts` | 1 describe que invoca a suite | Consome o `.suite.ts` com `InMemoryPayableRepository` factory |

Total: ~13-15 testes novos, executados via `payable-repository.in-memory.test.ts` (suite é function-call dentro do test file).

### Fixtures novas

```ts
const FITID_A = FITID.fromString('FITID-A')...;
const FITID_B = FITID.fromString('FITID-B')...;

// Construir Payables nos vários estados via Payable namespace
const makeBankPaid = (id: PayableId, fitid: FITID): PaidFromBankPayable => ...;
```

---

## 6. Padronizações invariantes

### 6.1. Lições preventivas consolidadas

| Lição | Status |
| :--- | :--- |
| Sem indexed access | ✅ N/A |
| Sem shadowing | ✅ |
| Sem async sem await | ✅ — todas async resolvem `Result` |
| Sem template `T \| undefined` | ✅ |
| `as <Brand>` único | ✅ — N/A (sem brand novo) |
| Imports `#src/*` | ✅ |
| Suite reusável padrão | ✅ — convenção `.suite.ts` aplicada |

### 6.2. Anti-padrões `ports-and-adapters`

- ❌ `interface PayableRepository` → ✅ `type PayableRepository = Readonly<{...}>`
- ❌ `class InMemoryPayableRepository implements PayableRepository` → ✅ factory function
- ❌ `throw` no adapter para application → ✅ converter para `Result`
- ❌ Apenas 1 adapter sem InMemory → ✅ par real + InMemory (Drizzle vem em ticket seguinte)
- ❌ Port no `application/ports/` quando é ditado por invariância do agregado → ✅ `domain/<aggregate>/repository.ts` (Critério H2)

---

## 7. Pipeline previsto

| Wave | Skill | Outcome |
| :--- | :--- | :--- |
| **W0** | `tdd-strategist` | RED — ~14 testes falham por `ERR_MODULE_NOT_FOUND` em port/adapter |
| **W1** | `main-session` (consulta `ports-and-adapters` ✅) | GREEN — 5 arquivos novos (port, adapter, suite, in-memory test, contract test) |
| **W2** | `code-reviewer` | APPROVED — port é `type`, adapter factory function, R2 enforce, sem class/throw em application |
| **W3** | `ts-quality-checker` | ALL-GREEN round 1 (esperado — 5 tickets seguidos sem BLOCK) |

---

## 8. Riscos e mitigações

| Risco | Mitigação |
| :--- | :--- |
| `findByFitid` no InMemory é O(n) — busca linear | Aceitável para InMemory (testes têm poucos Payables). MySQL real usa UNIQUE INDEX → O(1). |
| `hasFitid` helper precisa type narrow Bank vs Manual | Switch sobre `status` + `paidVia` no InMemory. TS strict garante. |
| `save` R2-check pode false-positive em upsert (mesmo Payable) | D6 — checa `p.id !== payable.id`. CA-12 testa explicitamente. |
| Suite `.suite.ts` ser descoberta como test direto | Convenção `.claude/rules/testing.md` — `**/*.test.ts` discovery; `.suite.ts` é function export sem execução. |
| Drizzle adapter ainda não existe | Por design — vem em ticket dedicado (`FIN-ADAPTER-DRIZZLE-PAYABLE` futuro). Suite reusável já prepara o terreno. |

---

## 9. Próximos tickets

```
FIN-PORT-PAYABLE-REPO        (S) ← este — Port + InMemory + suite
  ├─ FIN-PORT-OUTBOX           (S) — OutboxPort + InMemory; FinancialModuleEvent decoder v1
  │
  └─ FIN-USECASE-APPROVE-PAYABLE (S) — primeiro use case (depende de PayableRepository + Clock + EventBus)
      └─ FIN-CLI-APROVAR-TITULO (S) — primeiro comando real em pnpm run cli:financial

Paralelo (independente):
FIN-DOMAIN-ERROR-GROUPING-REFACTOR (XS-S) — refactor da union 30→sub-unions tipadas (tech-debt)
FIN-ADAPTER-DRIZZLE-PAYABLE  (M) — adapter real MySQL via Drizzle + schemas fin_payables
```

Este ticket habilita os 3 tickets subsequentes (Outbox, primeiro use case, primeira CLI).
