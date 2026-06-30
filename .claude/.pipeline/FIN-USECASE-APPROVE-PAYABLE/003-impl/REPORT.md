# W1 — Implementação GREEN (FIN-USECASE-APPROVE-PAYABLE)

> **Wave:** W1 · **Outcome:** GREEN · **Agent:** `main-session`
> **Predecessor:** [`../002-tests/REPORT.md`](../002-tests/REPORT.md) (W0 RED — 20 TS errors + 2 runtime fails)
> **Artefatos:** 1 arquivo novo + 2 modificados

---

## 1. Mudanças

| Arquivo | Linhas | Conteúdo | Status |
| :--- | ---: | :--- | :--- |
| `src/modules/financial/application/use-cases/approve-payable.ts` | 80 | Use case factory: `(deps) => (cmd) => Promise<Result<Output, Error>>` | NOVO |
| `src/modules/financial/domain/payable/repository.ts` | 84 | Assinatura `save(payable, events)`; union ganhou `OutboxAppendError`; JSDoc atualizada | MODIFICADO (+30 linhas) |
| `src/modules/financial/adapters/persistence/repos/payable-repository.in-memory.ts` | 95 | Factory aceita `outbox?: OutboxPort`; `save` propaga events via `outbox.append` | MODIFICADO (+16 linhas) |
| **Total** | **~260** | (80 novas + 180 tocadas) | |

### 1.1. Port refactor (`domain/payable/repository.ts`)

```ts
import type { OutboxAppendError } from '../../application/ports/outbox.ts';
import type { FinancialModuleEvent } from '../../public-api/events.ts';

export type PayableRepositoryError =
  | 'payable-repo-unavailable'
  | 'payable-repo-conflict'
  | 'payable-fitid-duplicate'
  | OutboxAppendError;                                  // ADR-0015 D2

export type PayableRepository = Readonly<{
  // findById, findByFitid, list — inalterados
  save: (
    payable: Payable,
    events: readonly FinancialModuleEvent[],            // ← 2º arg
  ) => Promise<Result<void, PayableRepositoryError>>;
}>;
```

**Decisão:** import do `OutboxAppendError` em `domain/` segue o pattern do `contracts/domain/contract/repository.ts:4` (precedente aceito). Domain pode importar tipo de application quando o tipo é técnico (não invariante de domínio) e o consumer trata o erro genericamente.

### 1.2. Adapter refactor (`adapters/persistence/repos/payable-repository.in-memory.ts`)

```ts
export const InMemoryPayableRepository = (
  outbox: OutboxPort = InMemoryOutbox().port,           // ← default isolado
): InMemoryPayableRepositoryHandle => {
  // ...
  save: async (payable, events) => {
    // R2 guard ANTES do outbox — duplicate impede tudo (state + events)
    if (...) {
      const owner = [...].find(...);
      if (owner !== undefined) return err('payable-fitid-duplicate');
    }

    map.set(payable.id, payable);
    if (events.length > 0) {
      const appended = await outbox.append(events);
      if (!appended.ok) return err(appended.error);
    }
    return ok(undefined);
  },
};
```

Pattern idêntico ao `InMemoryContractRepository`: factory aceita `outbox?` opcional; default = `InMemoryOutbox().port` isolado por instância (suites que passam `[]` não precisam inspecionar). Lista vazia (`events.length === 0`) é no-op.

### 1.3. Use case (`application/use-cases/approve-payable.ts`)

```ts
export const approvePayable =
  (deps: Deps) =>
  async (cmd: ApprovePayableCommand): Promise<Result<...>> => {
    const idResult = PayableId.rehydrate(cmd.payableId);
    if (!idResult.ok) return err('approve-payable-invalid-id');

    const approverResult = UserRef.rehydrate(cmd.approvedByRaw);
    if (!approverResult.ok) return approverResult;

    const fetched = await deps.payableRepo.findById(idResult.value);
    if (!fetched.ok) return fetched;
    if (fetched.value === null) return err('approve-payable-not-found');

    const approvedAt = deps.clock.now();
    const transition = Payable.approve(fetched.value, approverResult.value, approvedAt);
    if (!transition.ok) return transition;

    const saveResult = await deps.payableRepo.save(
      transition.value.payable,
      [transition.value.event],                          // ← evento via repo.save
    );
    if (!saveResult.ok) return saveResult;

    return ok({ payable: transition.value.payable, event: transition.value.event });
  };
```

**Sequência canônica** validar→rehydrate→fetch→domain→persist (com evento). Use case **NÃO** conhece `OutboxPort` — apenas `PayableRepository` + `Clock`.

### 1.4. Zero `class`, zero `throw`, zero `as any`

```
$ grep -nE "throw |\bclass\b|new Error|extends Error|: any\b|as any" \
    src/modules/financial/{application/use-cases/approve-payable.ts,domain/payable/repository.ts,adapters/persistence/repos/payable-repository.in-memory.ts}
(nenhum)
```

---

## 2. Verificação

### 2.1. Typecheck

```
$ pnpm run typecheck
> tsc --noEmit
(exit 0, zero output)
```

Zero erros TS. Os 20 erros do W0 (TS2554 + TS2307) eliminados.

### 2.2. Suite global — delta vs baseline

```
$ pnpm test
ℹ tests 1095  pass 1079  fail 0  skipped 16  duration_ms 45273
```

| Métrica | Baseline (W3 FIN-PORT-OUTBOX) | W0 RED | W1 GREEN | Delta W1 vs Baseline |
| :--- | ---: | ---: | ---: | ---: |
| tests | 1087 | 1089 | **1095** | **+8** |
| pass | 1071 | 1071 | **1079** | **+8** |
| fail | 0 | 2 | **0** | 0 |
| skipped | 16 | 16 | 16 | 0 |
| suites | 349 | 349 | 356 | +7 |

**Delta exato batendo com W0 §6.** Zero regressão. 8 novos testes:
- 1 CA-14 da suite (outbox propagation via `save(p, [event])`)
- 7 do `approve-payable.test.ts` (CA-19..25)

### 2.3. Testes específicos do ticket

```
▶ approvePayable — happy path (CA-19)
  ✔ CA-19: Open → Approved retorna ok com payable.status=Approved e event.type=PayableApproved
▶ approvePayable — outbox propagation (CA-20)
  ✔ CA-20: após approve, outbox.all() tem 1 row de tipo PayableApproved
▶ approvePayable — invalid id (CA-21)
  ✔ CA-21: payableId não-UUID retorna err approve-payable-invalid-id
▶ approvePayable — not found (CA-22)
  ✔ CA-22: payableId válido mas não persistido retorna err approve-payable-not-found e outbox vazio
▶ approvePayable — invalid userRef (CA-23)
  ✔ CA-23: approvedByRaw não-UUID propaga user-ref-invalid
▶ approvePayable — payable não-Open (CA-24)
  ✔ CA-24: payable já Approved propaga PayableNotOpen com currentStatus=Approved
▶ approvePayable — data anterior a openedAt (CA-25)
  ✔ CA-25: clock retorna data anterior ao openedAt → PayableApprovalDateBeforeOpenedAt

ℹ tests 7  pass 7  fail 0  duration_ms 105
```

---

## 3. CAs (000-request §3)

| # | Critério | Status |
| :--- | :--- | :--- |
| CA-1 | `save` aceita 2º param `events: readonly FinancialModuleEvent[]` | ✅ §1.1 |
| CA-2 | `PayableRepositoryError` inclui `OutboxAppendError` no union | ✅ §1.1 |
| CA-3 | JSDoc do `save` cita ADR-0015 + atomicidade state+outbox | ✅ |
| CA-4 | Import de `OutboxAppendError` em domain (precedente do contracts) | ✅ §1.1 |
| CA-5 | Factory aceita `outbox?: OutboxPort` default `InMemoryOutbox().port` | ✅ §1.2 |
| CA-6 | `save(payable, events)` chama `outbox.append(events)` quando `events.length > 0` | ✅ §1.2 |
| CA-7 | Erro do outbox propagado como `PayableRepositoryError` (cast direto) | ✅ §1.2 |
| CA-8 | R2 guard `payable-fitid-duplicate` ANTES do `outbox.append` | ✅ §1.2 |
| CA-9 | Suite migrou todas as chamadas `save(p)` → `save(p, [])` | ✅ W0 §2.1 |
| CA-10 | Novo teste suite valida `save(p, [event])` propaga ao outbox | ✅ §2.3 (CA-14 da suite) |
| CA-11 | Use case é factory function | ✅ §1.3 |
| CA-12 | `Deps = { payableRepo, clock }` — sem EventBus | ✅ §1.3 |
| CA-13 | Command com strings cruas (use case faz rehydrate) | ✅ §1.3 |
| CA-14 | Union de erro completo (5 categorias) | ✅ §1.3 |
| CA-15 | Output shape `{ payable, event }` | ✅ §1.3 |
| CA-16 | Sequência canônica validar→fetch→domain→persist | ✅ §1.3 |
| CA-17 | Use case NÃO chama `outbox.append` direto (atomicidade) | ✅ §1.3 |
| CA-18 | Header doc cita R1 + ADR-0015 | ✅ approve-payable.ts:1-22 |
| CA-19..25 | Happy + outbox + 5 unhappy paths | ✅ §2.3 (7/7 GREEN) |
| CA-26 | Fixture `buildOpenPayable` reusada (inline no test) | ✅ W0 §3.1 |
| CA-27..30 (typecheck/format/lint/test) | ✅ typecheck §2.1; test §2.2; format/lint W3 |

**26 de 30 CAs validadas em W1.** 4 operacionais para W3.

---

## 4. Decisões W1

- **Import `OutboxAppendError` em domain** — replica precedente do `contracts/domain/contract/repository.ts:4`. Domain pode importar tipo de application para erros técnicos não-invariantes (regra de exceção do ADR-0006).
- **`if (events.length > 0)` guard antes do `outbox.append`** — preserva semântica do `[]` no-op da suite (testes de persistência puros não disparam outbox).
- **R2 guard antes do outbox.append** — se duplicate, nada é persistido (nem state nem event). Alinha com transação atômica do adapter Drizzle futuro: o `INSERT INTO fin_payables` falha por UNIQUE INDEX antes do `INSERT INTO fin_outbox`.
- **Cast `as PayableRepositoryError = 'payable-fitid-duplicate'`** preservado (já estava no source). Necessário porque o literal string sozinho não infere o union ampliado — o cast é apenas annotation type-level.
- **Default `outbox = InMemoryOutbox().port`** sem cleanup explícito — outbox isolado garbage-collected junto com o handle. Pattern idêntico ao `InMemoryContractRepository`.
- **Helper `makeWorld(clockAt)` no test** — centraliza setup do mundo de teste; cada `it` cria um mundo isolado. Mantém testes independentes (zero ordem-dependência).

---

## 5. Lições preventivas aplicadas

| Lição | Status |
| :--- | :--- |
| Sem indexed access em arrays | ✅ — `.find()`, `.filter()` |
| Sem shadowing de built-ins | ✅ |
| Sem async sem await (conflito `require-await` × `promise-function-async`) | ✅ — `await outbox.append(events)` real; sem `eslint-disable` órfão |
| Imports `#src/*` subpath | ✅ — todos imports de produção |
| `import type` separado de runtime | ✅ |
| Cast `as <Brand>` único no smart constructor | ✅ — N/A (sem branding novo) |
| Atomicidade ADR-0015 D2 desde o primeiro use case | ✅ — `repo.save(payable, [event])` (use case não chama outbox direto) |
| Eslint-disable órfão de FIN-PORT-OUTBOX W3 — NÃO repetir | ✅ — adapter usa `await outbox.append` real |

Expectativa W3: **ALL-GREEN round 1**.

---

## 6. Pronto para W2

`code-reviewer` deve validar:

1. **Import `OutboxAppendError` em domain** — precedente aceito mas vale conferir se o reviewer entende a justificativa (technical error, não invariante).
2. **Compatibilidade com adapter Drizzle futuro** — assinatura `save(payable, events)` casa com o pattern de `contractRepo.save`; quando o Drizzle entrar, basta replicar a tx atômica.
3. **R2 guard antes do outbox.append** — duplicate impede tudo. Documentar no JSDoc se for relevante.
4. **Use case puro** — sem chamadas a `outbox.append` direto; sem `EventBus`; sequência canônica respeitada (validate → fetch → domain → persist).
5. **Header doc do use case** cita R1 + ADR-0015 explicitamente.
6. **`PayableRepositoryError` é union mista** (string literal + tagged from `OutboxAppendError`) — switch exaustivo no use case ou caller precisa lidar com ambos. Validar que o test CA-22 (not-found) e CA-23 (user-ref) cobrem propagação correta.
7. **Tests usam `as unknown as string`** em `payableId: open.id as unknown as string` — porque `PayableId` é branded mas a command aceita string crua. Verificar se há alternativa mais limpa (e.g., expor `PayableId.toString()` ou aceitar string direto no command).
8. **Fixture `buildApprovedPayable`** no test do use case — não duplica a da suite (diferente API). OK.

Envelope **M** — review esperada em 1 round dado o pattern bem espelhado.

---

## 7. Marco — primeiro use case real do módulo Financial

Saímos da camada de Port para a camada Application real. O módulo Financial agora tem:

- ✅ Domínio puro (agregado Payable 100% — 9 events, 7 estados).
- ✅ Ports completos (PayableRepository + OutboxPort + Clock compartilhado).
- ✅ Adapters InMemory de todos os ports + integração outbox-in-repo.
- ✅ **Primeiro use case real** consumindo os 3 ports.

Padrão consolidado consistente com `contracts/` — use case sem EventBus, atomicidade via `repo.save(state, events)`, fixtures reutilizando agregado real.

**Próximo ticket sugerido:** `FIN-CLI-APROVAR-TITULO` (S) — primeiro comando real em `pnpm run cli:financial`, consumindo `approvePayable` use case via driver InMemory (pattern idêntico aos comandos do contracts).
