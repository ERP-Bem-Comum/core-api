# W0 — Testes RED (FIN-PORT-PAYABLE-REPO)

> **Wave:** W0 · **Outcome:** RED · **Agent:** `tdd-strategist` (via main-session com skill `ports-and-adapters` carregada anteriormente)
> **Artefatos criados (3):**
>
> - `tests/modules/financial/application/ports/payable-repository.contract.ts` — shape test (suite-as-function)
> - `tests/modules/financial/adapters/persistence/payable-repository.suite.ts` — suite comportamental reusável
> - `tests/modules/financial/adapters/persistence/payable-repository.in-memory.test.ts` — test runner (consome ambas)

---

## 1. Estratégia de teste

Espelha pattern de `tests/modules/contracts/adapters/persistence/contract-repository.suite.ts`:

- **`.contract.ts` (shape)** — verifica forma do port via type-level check.
- **`.suite.ts` (comportamental)** — função `runPayableRepositoryContract(label, factory)` que **qualquer adapter** consome.
- **`.test.ts` (runner)** — único arquivo descoberto pelo runner `**/*.test.ts`; invoca as duas suites + 2 testes específicos do `InMemoryHandle`.

Convenção `.claude/rules/testing.md` validada: arquivos `.contract.ts` e `.suite.ts` exportam função (não executam sozinhos). Quando o **adapter Drizzle/MySQL** real existir, outro arquivo `.test.ts` consumirá a MESMA suite com factory diferente.

## 2. Cobertura de CAs (12 testes na suite + 2 handle utility + 1 shape)

| Arquivo | Testes | CAs |
| :--- | ---: | :--- |
| `payable-repository.contract.ts` | 1 | CA-2 (port shape — 4 funções) |
| `payable-repository.suite.ts` (função reusável) | 10 | CA-3..CA-12 |
| `payable-repository.in-memory.test.ts` (handle-specific) | 2 | CA-13 (handle utilities) |
| **Total via runner** | **13** | CA-2..CA-13 (CA-1 validado por type) |

### 2.1. Detalhes da suite comportamental

| CA | Cenário |
| :--- | :--- |
| CA-3 | `findById` em repo vazio retorna `ok(null)` |
| CA-4 | save + findById retorna o Payable salvo (status 'Open' preservado) |
| CA-5 | `findByFitid` em repo vazio retorna `ok(null)` |
| CA-6 | `findByFitid` retorna BankPaid quando existe (full chain Open→Approved→Transmitted→PaidFromBank) |
| CA-7 | `findByFitid` retorna `null` quando só há Manual-Paid (Manual NÃO tem FITID) |
| CA-8 | `list` em repo vazio retorna `ok([])` |
| CA-9 | `list` retorna todos os Payables salvos |
| CA-10 | save é upsert por ID (re-save do mesmo ID não duplica) |
| CA-11 | **R2 Anti-Duplicidade**: save rejeita `payable-fitid-duplicate` quando OUTRO Payable já tem mesmo FITID |
| CA-12 | save aceita re-save do MESMO Payable com mesmo FITID (não false-positive — upsert por ID) |

### 2.2. Fixtures encadeadas

Para CA-6/CA-11/CA-12, a suite constrói `PaidFromBankPayable` via cadeia completa:

```ts
Open → approve → Approved → transmit → Transmitted → processBankOutflow → PaidFromBank
```

Usa o agregado Payable real (`Payable.open`, `Payable.approve`, etc.) — exercita o domínio inteiro a cada fixture.

## 3. Lições preventivas aplicadas

| Lição | Status |
| :--- | :--- |
| Sem indexed access | ✅ |
| Sem shadowing de built-ins | ✅ |
| Sem async sem await | ✅ — todas `await`am repo operations |
| Imports `#src/*` | ✅ |
| Convenção `.suite.ts`/`.contract.ts` (suite reusável) | ✅ |

## 4. Saída RED

```bash
node --test --experimental-strip-types --no-warnings \
  tests/modules/financial/adapters/persistence/payable-repository.in-memory.test.ts
```

```
Error [ERR_MODULE_NOT_FOUND]:
  Cannot find module '.../src/modules/financial/adapters/persistence/repos/payable-repository.in-memory.ts'
```

Top-level import falha — adapter (e port) ainda não existem. Contagem: `tests 1 pass 0 fail 1` (falha sintética antes do runner descobrir os 13 it's).

## 5. Diagnóstico RED — checklist

| Aspecto | OK? | Nota |
| :--- | :--- | :--- |
| Causa única | ✅ | ERR_MODULE_NOT_FOUND no adapter |
| Suite reusável independente de adapter | ✅ | `runPayableRepositoryContract(label, factory)` aceita qualquer factory |
| R2 enforce explícito em testes (CA-11, CA-12) | ✅ | duplicate + false-positive guard |
| Fixtures exercitam agregado real | ✅ | full Open→Paid chain |
| `.contract.ts` apenas type-level (não invoca runtime) | ✅ | verifica shape com extends conditional type |

## 6. Lista pronta para W1

Implementer (main-session) deve criar **2 arquivos** em `src/modules/financial/`:

### 6.1. `domain/payable/repository.ts`

```ts
import type { Result } from '#src/shared/primitives/result.ts';
import type { FITID } from '../shared/fitid.ts';
import type { PayableId } from '../shared/payable-id.ts';
import type { Payable } from './types.ts';

export type PayableRepositoryError =
  | 'payable-repo-unavailable'
  | 'payable-repo-conflict'
  | 'payable-fitid-duplicate';

export type PayableRepository = Readonly<{
  findById: (id: PayableId) => Promise<Result<Payable | null, PayableRepositoryError>>;
  findByFitid: (fitid: FITID) => Promise<Result<Payable | null, PayableRepositoryError>>;
  list: () => Promise<Result<readonly Payable[], PayableRepositoryError>>;
  save: (payable: Payable) => Promise<Result<void, PayableRepositoryError>>;
}>;
```

### 6.2. `adapters/persistence/repos/payable-repository.in-memory.ts`

```ts
export type InMemoryPayableRepositoryHandle = Readonly<{
  repo: PayableRepository;
  store: () => readonly Payable[];
  clear: () => void;
}>;

export const InMemoryPayableRepository = (): InMemoryPayableRepositoryHandle => {
  const map = new Map<PayableId, Payable>();

  const hasFitid = (p: Payable, fitid: FITID): boolean =>
    (p.status === 'Paid' || p.status === 'Settled') && p.paidVia === 'Bank' && p.fitid === fitid;

  const repo: PayableRepository = {
    findById: async (id) => ok(map.get(id) ?? null),
    findByFitid: async (fitid) => ok([...map.values()].find((p) => hasFitid(p, fitid)) ?? null),
    list: async () => ok([...map.values()]),
    save: async (payable) => {
      if ((payable.status === 'Paid' || payable.status === 'Settled') && payable.paidVia === 'Bank') {
        const owner = [...map.values()].find(
          (p) => p.id !== payable.id && hasFitid(p, payable.fitid),
        );
        if (owner) return err('payable-fitid-duplicate');
      }
      map.set(payable.id, payable);
      return ok(undefined);
    },
  };

  return { repo, store: () => [...map.values()], clear: () => map.clear() };
};
```

Esperar **`tests N pass N fail 0`** após W1 (N=15 esperado: 13 da suite via runner + 2 do handle utility).
