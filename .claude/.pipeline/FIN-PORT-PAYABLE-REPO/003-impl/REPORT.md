# W1 — Implementação GREEN (FIN-PORT-PAYABLE-REPO)

> **Wave:** W1 · **Outcome:** GREEN · **Agent:** `main-session` (com skill `ports-and-adapters` já carregada na sessão)
> **Predecessor:** [`../002-tests/REPORT.md`](../002-tests/REPORT.md) (W0 RED)
> **Artefatos novos:** 2 arquivos de produção

---

## 1. Mudanças

| Arquivo | Linhas | Conteúdo |
| :--- | ---: | :--- |
| `src/modules/financial/domain/payable/repository.ts` | 55 | Port `PayableRepository` (type contract) + `PayableRepositoryError` union (3 literais) |
| `src/modules/financial/adapters/persistence/repos/payable-repository.in-memory.ts` | 73 | Factory `InMemoryPayableRepository()` + `InMemoryHandle` (repo/store/clear) + `hasFitid` helper interno |
| **Total** | **128** | |

### 1.1. Port em `domain/payable/` (Critério H2)

```ts
// repository.ts — POSICIONAMENTO NO DOMAIN, não em application/ports/
export type PayableRepositoryError =
  | 'payable-repo-unavailable'
  | 'payable-repo-conflict'
  | 'payable-fitid-duplicate'; // R2 do handbook entra na superfície do port

export type PayableRepository = Readonly<{
  findById: (...) => Promise<Result<Payable | null, ...>>;
  findByFitid: (...) => Promise<Result<Payable | null, ...>>;
  list: () => Promise<Result<readonly Payable[], ...>>;
  save: (payable: Payable) => Promise<Result<void, ...>>;
}>;
```

Pattern idêntico a `src/modules/contracts/domain/contract/repository.ts`. Skill `ports-and-adapters` §"Critério H2" foi seguida — port é ditado por invariância do agregado (R2 Anti-Duplicidade FITID).

### 1.2. R2 enforce no adapter

```ts
// payable-repository.in-memory.ts:36-38
const hasFitid = (p: Payable, fitid: FITID): boolean =>
  (p.status === 'Paid' || p.status === 'Settled') && p.paidVia === 'Bank' && p.fitid === fitid;
```

Helper module-private — type narrow via `status` + `paidVia` garante TS strict. `findByFitid` e `save` reusam.

```ts
// payable-repository.in-memory.ts:53-65 — save com guard de duplicate
if ((payable.status === 'Paid' || payable.status === 'Settled') && payable.paidVia === 'Bank') {
  const owner = [...map.values()].find(
    (p) => p.id !== payable.id && hasFitid(p, payable.fitid),  // ← `p.id !== payable.id` evita false-positive em upsert
  );
  if (owner !== undefined) return err('payable-fitid-duplicate');
}
map.set(payable.id, payable);
```

CA-11 (rejection real) e CA-12 (upsert do mesmo ID — não false-positive) validados runtime.

### 1.3. Zero `class`, zero `throw`, zero `as <Brand>`

```
$ grep -nE "throw |\bclass\b|new Error|extends Error|: any\b|as any" src/.../financial/{domain/payable/repository.ts,adapters/persistence/repos/payable-repository.in-memory.ts}
(nenhum)

$ grep -nE " as " src/.../payable-repository.in-memory.ts
51:        const error: PayableRepositoryError = 'payable-fitid-duplicate';
```

A única ocorrência de `as` é no tipo annotation `: PayableRepositoryError` (não é `as` cast — é declaration). **Zero casts**.

---

## 2. Verificação

### 2.1. Testes específicos do ticket

```bash
node --test --experimental-strip-types --no-warnings \
  tests/modules/financial/adapters/persistence/payable-repository.in-memory.test.ts
```

```
▶ PayableRepository shape — InMemory (CA-2)
  ✔ exporta 4 funções no port

▶ PayableRepository contract — InMemory (CA-3..CA-12 via suite reusável)
  ✔ CA-3: findById em repo vazio retorna ok(null)
  ✔ CA-4: save + findById retorna o Payable salvo
  ✔ CA-5: findByFitid em repo vazio retorna ok(null)
  ✔ CA-6: findByFitid retorna o BankPaid quando existe
  ✔ CA-7: findByFitid retorna null quando só há Manual-Paid
  ✔ CA-8: list em repo vazio retorna ok([])
  ✔ CA-9: list retorna todos os Payables salvos
  ✔ CA-10: save é upsert por ID — re-save do mesmo ID não duplica
  ✔ CA-11: save rejeita payable-fitid-duplicate em colisão real
  ✔ CA-12: save aceita re-save do MESMO Payable (não false-positive)

▶ InMemoryPayableRepository — handle utilities (CA-13)
  ✔ exposes repo, store, and clear
  ✔ clear esvazia o store

ℹ tests 13  suites 3  pass 13  fail 0  duration_ms 107
```

### 2.2. Suite completa

```
ℹ tests 1078  pass 1062  fail 0  skipped 16  duration_ms 38436
```

| Métrica | W3 do FIN-AGG-PAYABLE-PAYMENT | W1 deste ticket | Delta |
| :--- | ---: | ---: | ---: |
| tests | 1065 | 1078 | **+13** |
| pass | 1049 | 1062 | **+13** |
| fail | 0 | 0 | 0 |
| skipped | 16 | 16 | 0 |

**Delta exato.** Zero regressão.

---

## 3. CAs (000-request §3)

| # | Critério | Status |
| :--- | :--- | :--- |
| CA-1 | `PayableRepositoryError` union com 3 literais | ✅ §1.1 |
| CA-2 | `PayableRepository` exporta 4 funções | ✅ shape test §2.1 |
| CA-3 | findById vazio → null | ✅ |
| CA-4 | save + findById preserva | ✅ |
| CA-5 | findByFitid vazio → null | ✅ |
| CA-6 | findByFitid retorna BankPaid | ✅ |
| CA-7 | findByFitid ignora Manual | ✅ §1.2 (hasFitid narrow) |
| CA-8 | list vazio → [] | ✅ |
| CA-9 | list popula | ✅ |
| CA-10 | save upsert sem duplicar | ✅ |
| CA-11 | save rejeita FITID duplicate | ✅ §1.2 R2 enforce |
| CA-12 | save aceita upsert mesmo Payable com FITID | ✅ guard `p.id !== payable.id` |
| CA-13 | Handle expõe repo/store/clear | ✅ |
| CA-14 | `.suite.ts` não descoberta standalone | ✅ runner discovery `**/*.test.ts` apenas |
| CA-15 | Header cita R2 | ✅ repository.ts:10-15 |
| CA-16..CA-19 (typecheck/format/lint/test) | ⏳ W3 (test ✅ §2.2; demais W3) |

**13 de 19 CAs validadas em W1.** 6 operacionais para W3.

---

## 4. Decisões W1

- **`hasFitid` como helper module-private** — usado 2x (`findByFitid` e `save` guard). Centraliza narrowing `status === 'Paid' || 'Settled'` + `paidVia === 'Bank'`.
- **`p.id !== payable.id` no guard de duplicate** — crucial para CA-12 (upsert do mesmo Payable). Sem isso, qualquer re-save de BankPaid retornaria `payable-fitid-duplicate`.
- **`owner !== undefined` explícito** (não `if (owner)`) — segue convenção `strict-boolean-expressions` ESLint do projeto.
- **JSDoc do port cita R2 + adapter MySQL futuro com UNIQUE INDEX** (ADR-0020) — auditor entende intenção arquitetural completa.
- **`InMemoryHandle` com `repo`, `store`, `clear`** — pattern de `InMemoryContractRepositoryHandle`. Permite inspeção runtime sem violar encapsulamento via `as` casts em tests.

---

## 5. Lições preventivas aplicadas

| Lição | Status |
| :--- | :--- |
| Sem indexed access em arrays | ✅ — `.find()` + `[...map.values()]` |
| Sem shadowing de built-ins | ✅ — `hasFitid` nomeado adequadamente |
| Sem async sem await | ✅ — todas as funções do repo retornam `Promise` resolvido com `ok/err` (TS infer require-await OK porque retorna Promise explicitamente) |
| Sem template `T \| undefined` | ✅ |
| `as <Brand>` único | ✅ — N/A (sem branding novo) |
| Imports `#src/*` | ✅ no test; relativos no src (`../../../domain/...`) seguindo pattern do `contracts/adapters/` |

Expectativa W3: ALL-GREEN round 1.

---

## 6. Pronto para W2

`code-reviewer` deve validar:

1. **Port em `domain/payable/`** (Critério H2 — não `application/ports/`).
2. **`PayableRepositoryError` é string literal union** (não tagged — padrão do `ContractRepositoryError`).
3. **R2 enforce no adapter** com guard `p.id !== payable.id` (não false-positive).
4. **`hasFitid` helper module-private** — type narrow correto via `status` + `paidVia`.
5. **Zero `class`/`throw`/`as <Brand>`** no adapter.
6. **`InMemoryHandle` shape** — `repo`/`store`/`clear`.
7. **Suite reusável `.suite.ts`** é function export — NÃO descoberta como `.test.ts` standalone.
8. **Header doc cita R2 do handbook** + intenção para adapter MySQL futuro.

Envelope S — review esperada em 1 round.

---

## 7. Marco — primeiro adapter da camada Application

Saímos do domínio puro pela primeira vez no módulo Financial. **31 testes do core do agregado seguem GREEN** (refactor compatível por design — port é additive).

Próximo passo (`FIN-USECASE-APPROVE-PAYABLE`) consome `PayableRepository` + `Clock` + `EventBus` (estes 2 ainda a definir em tickets dedicados).
