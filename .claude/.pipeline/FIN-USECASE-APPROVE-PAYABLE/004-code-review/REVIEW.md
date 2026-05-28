# Code Review — Ticket FIN-USECASE-APPROVE-PAYABLE — Round 1

**Veredito:** **APPROVED**

**Reviewer:** `code-reviewer` (skill canônica W2)
**Data:** 2026-05-23T13:12Z
**Round:** 1 / 3
**Escopo revisado:** 6 arquivos (1 src novo + 2 src modificados + 3 tests modificados/novos) + 1 leitura cruzada (`contracts/domain/contract/repository.ts` — precedente)

| # | Arquivo | Linhas | Status |
| :--- | :--- | ---: | :--- |
| 1 | `src/modules/financial/application/use-cases/approve-payable.ts` | 86 | NOVO |
| 2 | `src/modules/financial/domain/payable/repository.ts` | 94 | MODIFICADO (+30) |
| 3 | `src/modules/financial/adapters/persistence/repos/payable-repository.in-memory.ts` | 98 | MODIFICADO (+16) |
| 4 | `tests/modules/financial/adapters/persistence/payable-repository.suite.ts` | 328 | MODIFICADO (+50) |
| 5 | `tests/modules/financial/adapters/persistence/payable-repository.in-memory.test.ts` | 61 | MODIFICADO (+18) |
| 6 | `tests/modules/financial/application/use-cases/approve-payable.test.ts` | 239 | NOVO |

---

## Issues encontradas

### 🔴 Crítica (bloqueia approval)

Nenhuma.

### 🟡 Importante (não-bloqueia, mas registrar)

Nenhuma.

### 🔵 Sugestão (estilo / clareza)

#### Sugestão 1 — `as unknown as string` pode ser `as string` direto

**Categoria:** F (TS moderno — branded types)
**Localização:** `tests/modules/financial/application/use-cases/approve-payable.test.ts:111, 132, 168, 187, 205, 228` (6 ocorrências)

```ts
const result = await useCase({
  payableId: open.id as unknown as string,   // ← duplo cast
  approvedByRaw: APPROVER_UUID,
});
```

`PayableId = Brand<string, 'PayableId'>` é definido como `string & { readonly __brand: 'PayableId' }` em `src/shared/primitives/brand.ts`. Branded types são **assignable em uma direção** (string base → branded é unidirecional; o inverso pode usar `as string` direto sem precisar do trampolim `as unknown`).

**Sugestão (não-bloqueia):**

```ts
payableId: open.id as string,           // mais limpo
// ou ainda
payableId: String(open.id),             // mais explícito (idiomático JS)
```

Padrão atual funciona e não bloqueia — apenas verboso.

#### Sugestão 2 — `eslint-disable-next-line @typescript-eslint/require-await` pode ser órfão

**Categoria:** F (TS moderno — lições do projeto)
**Localização:** `tests/modules/financial/adapters/persistence/payable-repository.in-memory.test.ts:27, 37`

```ts
runPayableRepositoryContract('InMemory', {
  // eslint-disable-next-line @typescript-eslint/require-await
  make: async () => {
    ...
    // eslint-disable-next-line @typescript-eslint/require-await
    teardown: async () => { ... }
  },
});
```

Lição registrada no FIN-PORT-OUTBOX W3: `require-await` é **desligada em `tests/**`** (convenção `.claude/rules/testing.md`), então o `eslint-disable` em test files **pode** ser redundante. O `reportUnusedDisableDirectives` não dispara em tests/ por enquanto, mas a lição preventiva é "remover quando o warning aparecer".

**Sugestão (não-bloqueia):** verificar no W3 se o `pnpm run lint` reporta `Unused eslint-disable directive` em alguma dessas duas linhas. Se sim, remover; se não, deixar como está (defesa preventiva no caso da config mudar).

#### Sugestão 3 — Cast `result.error as { tag?: string; ... }` em CA-24 e CA-25

**Categoria:** G (clareza dos testes)
**Localização:** `tests/.../approve-payable.test.ts:211-213` (CA-24) e `:234-235` (CA-25)

```ts
if (!result.ok) {
  const e = result.error as { tag?: string; currentStatus?: string };
  assert.equal(e.tag, 'PayableNotOpen');
  assert.equal(e.currentStatus, 'Approved');
}
```

O union `ApprovePayableError` contém variantes string literal (e.g., `'approve-payable-invalid-id'`) E tagged objects (de `PayableError` e `OutboxAppendError`). Acessar `.tag` exige cast porque TS não sabe que o caminho ali é o tagged variant.

**Alternativas (não-bloqueia):**

```ts
// alternativa A — type guard semi-explicit
if (!result.ok && typeof result.error === 'object' && 'tag' in result.error) {
  assert.equal(result.error.tag, 'PayableNotOpen');
  if (result.error.tag === 'PayableNotOpen') {
    assert.equal(result.error.currentStatus, 'Approved');
  }
}

// alternativa B — comparar contra constructor do domínio
const expected = PayableError.payableNotOpen('Approved');
assert.deepEqual(result.error, expected);
```

Atual passa runtime e é compreensível em leitura. Apenas observação para futuras refatorações da estrutura de erro.

---

## O que está bom

### Precedente arquitetural confirmado (verificação cruzada)

`src/modules/contracts/domain/contract/repository.ts:4`:
```ts
import type { OutboxAppendError } from '../../application/ports/outbox.ts';
// ...
export type ContractRepositoryError =
  | 'contract-repo-unavailable'
  | 'contract-repo-conflict'
  | OutboxAppendError;
```

W1 alegou ter seguido este precedente — **confirmado linha-por-linha**. A regra de exceção do domínio importar tipo técnico de application já estava consolidada em `CTR-OUTBOX-INTEGRATION-IN-REPOS` e foi replicada corretamente aqui.

### Auditoria automática — todas verdes

```
$ grep -nE "throw |\bclass\b|new Error|extends Error|: any\b|as any" \
    src/modules/financial/{application/use-cases/approve-payable.ts,domain/payable/repository.ts,adapters/persistence/repos/payable-repository.in-memory.ts}
(nenhum)
```

Zero `throw`, zero `class`, zero `new Error`, zero `any`, zero `as any` em src/. Casts presentes (`as PayableRepositoryError = 'payable-fitid-duplicate'`) são apenas annotations type-level — sem coerção runtime.

### Sequência canônica perfeitamente respeitada no use case

```ts
// approve-payable.ts:62-79
const idResult = PayableId.rehydrate(cmd.payableId);             // 1. validar id
if (!idResult.ok) return err('approve-payable-invalid-id');

const approverResult = UserRef.rehydrate(cmd.approvedByRaw);     // 2. validar userRef
if (!approverResult.ok) return approverResult;

const fetched = await deps.payableRepo.findById(idResult.value); // 3. fetch
if (!fetched.ok) return fetched;
if (fetched.value === null) return err('approve-payable-not-found');  // 4. guard

const approvedAt = deps.clock.now();                              // 5. clock APÓS guard
const transition = Payable.approve(fetched.value, approverResult.value, approvedAt);  // 6. domínio
if (!transition.ok) return transition;

const saveResult = await deps.payableRepo.save(...);              // 7. persist com evento
if (!saveResult.ok) return saveResult;

return ok({ payable: ..., event: ... });                          // 8. output
```

**Cada `if` faz exatamente UMA coisa**: short-circuit no Result. Sem ifs aninhados, sem `try/catch`, sem `else`. Linear e auditável.

**Clock chamado APÓS o guard not-found** — pequeno detalhe correto: não há custo de chamada de clock para input inválido (e em adapter real, evita marcar timestamp pra payable que nem existe).

### Use case **NÃO** importa `OutboxPort`

```
$ grep "OutboxPort\|outbox" src/modules/financial/application/use-cases/approve-payable.ts
(nada)
```

ADR-0015 D2 respeitado literalmente: atomicidade state+outbox é responsabilidade do **adapter**, não do use case. Use case só conhece `PayableRepository` + `Clock`. Quando o adapter Drizzle vier, a tx real ficará invisível ao use case.

### R2 guard antes do outbox.append documentado explicitamente

```ts
// payable-repository.in-memory.ts:61-64
// R2 enforce: se o Payable a ser persistido é Bank-Paid/Settled, garante
// que NENHUM OUTRO Payable (id diferente) já tenha esse mesmo FITID.
// Upsert do MESMO payable (mesmo id) é livre — não disparar false-positive.
// Guard R2 ANTES do outbox.append — duplicate impede tudo (state + events).
```

Comentário explica POR QUE a ordem importa. Reviewer não precisa adivinhar.

### Headers doc carregam intenção arquitetural

| Arquivo | O que o header explica |
| :--- | :--- |
| `approve-payable.ts:1-20` | R1 Soberania da Aprovação + ADR-0015 + sequência canônica numerada (1..7) + pattern espelha `create-contract.ts` |
| `repository.ts:30-39` | POR QUE `OutboxAppendError` entra no union (atomicidade) + precedente do contracts |
| `payable-repository.in-memory.ts:13-21` | POR QUE `outbox` é opcional com default isolado + ADR-0015 D2 |

Cada decisão arquitetural está explicada **no próprio source** — não exige consultar handbook nem ADR pra entender o "porquê".

### Suite reusável mantém interface compatível com Drizzle

```ts
export interface PayableRepoFactory {
  make: () => Promise<{
    repo: PayableRepository;
    outboxHelpers: OutboxHelpers;        // ← novo, mas compatível
    teardown?: () => Promise<void>;
  }>;
}
```

`outboxHelpers` é uma interface abstrata `{ all, pending }` — o adapter Drizzle futuro implementa essas funções com query na tabela `fin_outbox` (e.g., `all = () => db.select().from(finOutbox)`). Zero acoplamento ao InMemory.

### Test CA-22 valida outbox vazio em not-found

```ts
// approve-payable.test.ts:176
assert.equal(outbox.all().length, 0, 'nenhum evento enfileirado em not-found');
```

Garantia explícita de que erros precoces (validação, fetch null) **não** enfileiram eventos espúrios. Importante para auditoria do outbox em produção (DLQ futura).

### Test CA-19 e CA-20 separados — pattern de filtragem

```
$ pnpm test --test-name-pattern="CA-20"
# roda só o outbox propagation
```

Cada CA em seu próprio `describe` facilita filtragem via `--test-name-pattern`. Verbosidade aceita pra ganhar granularidade.

### Cast escopado `const error: PayableRepositoryError = 'payable-fitid-duplicate'`

```ts
// payable-repository.in-memory.ts:73-74
const error: PayableRepositoryError = 'payable-fitid-duplicate';
return err(error);
```

Annotation type-level (não cast runtime). Necessário porque o literal string sozinho não infere o union ampliado com `OutboxAppendError`. Pattern já estava no source antes do W1 — preservado.

### Imports limpos — `import type` separado de runtime

```ts
// approve-payable.ts
import { type Result, ok, err } from '#src/shared/index.ts';         // runtime
import type { Clock } from '#src/shared/ports/clock.ts';             // type
import * as UserRef from '#src/shared/kernel/user-ref.ts';           // runtime (namespace)
import * as PayableId from '#src/modules/financial/domain/shared/payable-id.ts';  // runtime
import { Payable } from '#src/modules/financial/domain/payable/payable.ts';       // runtime
import type { ApprovedPayable } from '...';                          // type
import type { PayableEvent } from '...';                             // type
import type * as PayableError from '...';                            // type namespace
import type { PayableRepository, PayableRepositoryError } from '...';
```

100% explícito. `verbatimModuleSyntax` honrado. Subpath `#src/*` em todos os imports de produção.

---

## Checklist explícita aplicada

| Categoria | Resultado |
| :--- | :--- |
| A. Regras absolutas de domínio | ✅ `repository.ts` é só type + import — zero throw/class/this/any |
| B. Smart constructors / Branded | N/A neste ticket (use case e repo, não VO) |
| C. Discriminated unions | ✅ `ApprovePayableError` union de 5 categorias; `PayableError` herda de tagged union do domínio; switch exaustivo no use case por short-circuit Result |
| D. Ports & Adapters | ✅ Port é `type Readonly<{...}>`; use case é factory function `(deps) => (cmd) => Promise<Result>`; adapter retorna Result sem throw; Clock = port abstrato |
| E. Modular Monolith | ✅ Clock vem de `#src/shared/ports/`; use case NÃO importa de outro módulo; public-api intocada (só ports/repo) |
| F. ESM / NodeNext / TS moderno | ✅ extensão `.ts` em todos; `import type` separado; sem require/namespace runtime/enum |
| G. Naming, EN/PT, clareza | ✅ identifiers EN; sufixos consistentes (`Command`/`Error`/`Output`); tagged errors PascalCase. Sugestões 1 e 3 são cosméticas. |
| H. Tests | ✅ AAA implícito via setup/act/assert sequencial; `Payable.open` real (não mock); UUIDs reais via `PayableId.generate`; outbox inspecionado via helper real, não `expect.any` |

---

## Verificações específicas do prompt da review

| Ponto | Resultado |
| :--- | :--- |
| A.1 application.md (factory function, deps Readonly) | ✅ `approve-payable.ts:52-58` |
| A.2 adapters.md (sem vazar exceção; converte Result na borda) | ✅ Zero throw no adapter; outbox.append retorna Result e é propagado |
| A.3 testing.md (`.suite.ts` exporta função) | ✅ `runPayableRepositoryContract` é export |
| A.4 ADR-0006 (Clock compartilhado) | ✅ Import de `#src/shared/ports/clock.ts` |
| A.5 ADR-0015 D2 (atomicidade) | ✅ `repo.save(state, [event])` — use case nunca chama `outbox.append` |
| B.1 Header doc explica OutboxAppendError no union | ✅ `repository.ts:30-39` |
| B.2 Header doc explica outbox opcional | ✅ `in-memory.ts:13-21` |
| B.3 Header doc do use case cita R1 + ADR-0015 | ✅ `approve-payable.ts:4-15` |
| B.4 R2 guard antes do outbox.append comentado | ✅ `in-memory.ts:61-64` |
| C.1 Sequência canônica 1..8 | ✅ Linear e auditável, §"O que está bom" |
| C.2 Clock APÓS guard not-found | ✅ Linha 72 após linha 70 |
| C.3 Use case NÃO importa OutboxPort | ✅ Verificado por grep |
| C.4 Union de erro completo (5 grupos) | ✅ `approve-payable.ts:40-45` |
| C.5 Sem cast indevido | ✅ Zero `as Brand` ou `as unknown as T` em src/ |
| D.1 Import OutboxAppendError em domain — precedente confirmado | ✅ `contracts/domain/contract/repository.ts:4` idêntico |
| D.2 JSDoc save cita ADR-0015 D2 | ✅ |
| D.3 JSDoc explica `[]` no-op | ✅ |
| D.4 JSDoc explica R2 vence outbox | ✅ |
| E.1 Default isolado (não memoizado) | ✅ `= InMemoryOutbox().port` é chamado a cada `InMemoryPayableRepository()` |
| E.2 `if (events.length > 0)` guard | ✅ Linha 82 |
| E.3 `await outbox.append(events)` | ✅ Linha 83 |
| E.4 Cast `as PayableRepositoryError` preservado | ✅ Linha 73-74 |
| E.5 Narrowing R2 limpo | ✅ `status === 'Paid' \|\| status === 'Settled'` + `paidVia === 'Bank'` |
| F.1 `makeWorld(clockAt)` helper | ✅ Linha 93-99 |
| F.2 Fixtures usam Payable.open real | ✅ `buildOpenPayable`/`buildApprovedPayable` chain agregado |
| F.3 Datas literais ISO | ✅ `D(iso)` helper em todos os lugares |
| F.4 Asserts específicos | ✅ Cada CA tem asserts próprios |
| F.5 `as unknown as string` (Sugestão 1) | 🔵 Pode simplificar para `as string` |
| F.6 CA-20 valida via repo.save | ✅ Linha 131-143 (não chama append direto) |
| F.7 CA-22 valida outbox vazio | ✅ Linha 176 |
| G.1 13 chamadas `save(p, [])` corretas | ✅ Verificado por grep |
| G.2 CA-14 shape do row | ✅ `eventType`, `processedAt`, `attempts` validados |
| G.3 `outboxHelpers` interface limpa | ✅ Drizzle futuro implementa via query SQL |
| H. Anti-padrões absolutos | ✅ Zero ocorrência (throws em fixture helpers são padrão aceito — mesma técnica de `payable-repository.suite.ts`) |

---

## Marco — primeiro use case real do módulo Financial APROVADO

Padrões consolidados neste ticket:

- **Use case puro sem EventBus** — atomicidade via `repo.save(state, [event])` (ADR-0015 D2).
- **Domain importa tipo técnico de application** — precedente do contracts replicado com justificativa documentada no header.
- **Adapter aceita port opcional com default isolado** — pattern do `InMemoryContractRepository`.
- **Suite reusável aceita `outboxHelpers`** — adapter Drizzle futuro plug-and-play.
- **Sequência canônica linear** — short-circuit por Result, zero `try/catch`, zero `else`.
- **Headers doc explicam decisões arquiteturais** — reviewer entende sem consultar handbook/ADR.

Tudo casa com o pattern de `contracts/` mas com adaptação correta (R2 guard antes do outbox.append, único do financial).

---

## Próximo passo

- **APPROVED** → main-session avança para W3.
- 3 sugestões 🔵 listadas — **não bloqueiam W3**. Recomendação: aplicar antes do W3 (pattern consolidado do projeto). Sugestão 1 (`as unknown as string` → `as string`) é a mais ergonômica e provavelmente vale aplicar; Sugestão 2 (eslint-disable) o W3 vai detectar se for órfão; Sugestão 3 (cast em CA-24/25) é a mais opcional.
- Expectativa W3: **ALL-GREEN round 1** — 7º ticket FIN-* seguido sem rejection W2 seria recorde.
- Após W3 ALL-GREEN, `pnpm run pipeline:state close FIN-USECASE-APPROVE-PAYABLE` (35º ticket fechado).
- **Próximo ticket sugerido:** `FIN-CLI-APROVAR-TITULO` (S) — primeiro comando real em `pnpm run cli:financial`, consumindo `approvePayable` via driver `memory`. Pattern idêntico aos comandos do contracts.
