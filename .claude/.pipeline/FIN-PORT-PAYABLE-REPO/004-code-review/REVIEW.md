# Code Review — Ticket FIN-PORT-PAYABLE-REPO — Round 1

**Veredito:** **APPROVED**

**Reviewer:** `code-reviewer` (skill canônica W2)
**Data:** 2026-05-23T10:43Z
**Round:** 1 / 3
**Escopo revisado:** 5 arquivos (2 prod + 3 test)

| # | Arquivo | Linhas |
| :--- | :--- | ---: |
| 1 | `src/modules/financial/domain/payable/repository.ts` | 55 |
| 2 | `src/modules/financial/adapters/persistence/repos/payable-repository.in-memory.ts` | 73 |
| 3 | `tests/.../application/ports/payable-repository.contract.ts` | 32 |
| 4 | `tests/.../adapters/persistence/payable-repository.suite.ts` | ~270 |
| 5 | `tests/.../adapters/persistence/payable-repository.in-memory.test.ts` | ~45 |

---

## Issues encontradas

### 🔴 Crítica (bloqueia approval)

Nenhuma.

### 🟡 Importante (não-bloqueia, mas registrar)

Nenhuma.

### 🔵 Sugestão (estilo / clareza)

#### Sugestão 1 — Adapter usa paths relativos longos em vez de `#src/*`

**Categoria:** F (TS moderno — imports modernos)
**Localização:** `payable-repository.in-memory.ts:14-19`

```ts
import type { FITID } from '../../../domain/shared/fitid.ts';
import type { PayableId } from '../../../domain/shared/payable-id.ts';
import type { PayableRepository, ... } from '../../../domain/payable/repository.ts';
import type { Payable } from '../../../domain/payable/types.ts';
```

Tickets recentes (FIN-VO-FITID, FIN-VO-TAX-ID, etc.) usaram `#src/modules/financial/...` no `src/`. Aqui o adapter usa paths relativos (`../../../domain/...`).

**Não bloqueia** porque:
- Pattern idêntico ao `src/modules/contracts/adapters/persistence/repos/contract-repository.in-memory.ts` (referência viva consultada na W1).
- Consistência cross-módulo (contracts vs financial) vale mais que consistência intra-módulo.

Recomendação: **manter convenção do contracts** para uniformidade entre módulos. Se quiser modernizar globalmente, ticket transversal `CTR-FIN-IMPORTS-SUBPATH-MIGRATION` futuro.

#### Sugestão 2 — `tests/modules/financial/application/ports/` existe sem `src/modules/financial/application/ports/`

**Categoria:** E (estrutura)
**Localização:** `tests/modules/financial/application/ports/payable-repository.contract.ts`

O arquivo de shape test foi posicionado em `tests/.../application/ports/`, espelhando estrutura típica de Port em camada Application. Porém, **o port real está em `domain/payable/` (Critério H2)** — não em `application/ports/`.

A pasta `src/modules/financial/application/ports/` não existe ainda. Quando primeiros ports da camada Application (Clock, EventBus) forem criados, a pasta nascerá lá.

**Não bloqueia** — o test path é independente do src path, e a contract test apenas valida shape do tipo importado. Conceito do "contrato de port" cabe semanticamente em `application/ports/` mesmo quando o port físico é ditado pelo agregado (H2).

#### Sugestão 3 — `findById` usa `?? null` em vez de explicit branch

**Categoria:** G (clareza)
**Localização:** `payable-repository.in-memory.ts:46`

```ts
findById: async (id) => ok(map.get(id) ?? null),
```

`map.get(id)` retorna `T | undefined`. `?? null` força `T | null`. Funcionalmente correto e idiomático em TS. Alternativa explícita:

```ts
findById: async (id) => {
  const found = map.get(id);
  return ok(found === undefined ? null : found);
},
```

Versão atual é mais concisa e idiomática — mantido.

**Não bloqueia** — preferência pessoal, padrão do projeto aceita ambos.

---

## O que está bom

### Auditoria automática — todas verdes

```
$ grep -nE "throw |\bclass\b|new Error|extends Error|: any\b|as any" src/.../financial/{domain/payable/repository.ts,adapters/persistence/repos/payable-repository.in-memory.ts}
(nenhum)

$ grep -nE " as " payable-repository.in-memory.ts
(nenhum — ZERO casts no adapter)

$ grep -nE "p.id !== payable.id" payable-repository.in-memory.ts
58:          (p) => p.id !== payable.id && hasFitid(p, payable.fitid),
```

**Adapter sem nenhum `as` cast!** TS infere todos os tipos via narrowing (`status === 'Paid'` + `paidVia === 'Bank'`). Bom hardening type-safety.

### Critério H2 confirmado — port em `domain/`

```
src/modules/financial/domain/payable/repository.ts  ← port
src/modules/financial/application/ports/             ← NÃO EXISTE (correto)
```

Skill `ports-and-adapters` §"Critério H2 §3.H.2 DO H§34" seguido — port é ditado pelas invariâncias do agregado (R2 Anti-Duplicidade FITID entra na superfície do port via `payable-fitid-duplicate`). Pattern idêntico a `contracts/domain/contract/repository.ts`.

### `type Readonly<{...}>` — não interface, não class

```ts
export type PayableRepository = Readonly<{
  findById: (...) => Promise<Result<...>>;
  findByFitid: (...) => Promise<Result<...>>;
  list: () => Promise<Result<...>>;
  save: (...) => Promise<Result<void, ...>>;
}>;
```

Skill `ports-and-adapters` §"Anti-padrões" respeitada — ❌ `interface PayableRepository` → ✅ `type ... = Readonly<{...}>`.

### R2 enforce com guard de upsert (D6 do REPORT W1)

```ts
// payable-repository.in-memory.ts:55-65
if ((payable.status === 'Paid' || payable.status === 'Settled') && payable.paidVia === 'Bank') {
  const owner = [...map.values()].find(
    (p) => p.id !== payable.id && hasFitid(p, payable.fitid),
  );
  if (owner !== undefined) return err('payable-fitid-duplicate');
}
```

**Defesa em profundidade contra race** entre `findByFitid` (check pelo use case) e `save` (commit). Guard `p.id !== payable.id` **crucial** para evitar false-positive em upsert do mesmo Payable. CA-11 (rejeição) e CA-12 (no false-positive) validam ambos os cenários runtime.

### Helper `hasFitid` module-private

```ts
const hasFitid = (p: Payable, fitid: FITID): boolean =>
  (p.status === 'Paid' || p.status === 'Settled') && p.paidVia === 'Bank' && p.fitid === fitid;
```

DRY excelente — usado em `findByFitid` (linha 48) e `save` (linha 58). Narrowing centralizado: TS strict garante `p.fitid` só acessível após verificar `status` + `paidVia === 'Bank'`.

### Factory function — não class

```ts
export const InMemoryPayableRepository = (): InMemoryPayableRepositoryHandle => {
  const map = new Map<PayableId, Payable>();
  // ...
  return { repo, store: () => [...map.values()], clear: () => { map.clear(); } };
};
```

Skill `ports-and-adapters` §"Anti-padrões" respeitada — ❌ `class InMemoryRepoImpl` → ✅ factory function.

### Imports apenas `import type` no port + runtime values só onde necessário no adapter

```ts
// repository.ts — 100% type imports
import type { Result } from '#src/shared/primitives/result.ts';
import type { FITID, PayableId, Payable } from '...';

// in-memory.ts — runtime + types separados
import { ok, err } from '#src/shared/primitives/result.ts';     // runtime
import type { FITID, PayableId, ..., Payable } from '...';     // types
```

`verbatimModuleSyntax` honrado.

### Test file `.suite.ts` reusável

```ts
// payable-repository.suite.ts
export const runPayableRepositoryContract = (label: string, factory: PayableRepoFactory): void => {
  describe(`PayableRepository contract — ${label}`, () => { ... });
};
```

**Function export** — não executa standalone. Quando adapter Drizzle real existir, novo `.test.ts` consumirá a MESMA suite com factory diferente. DRY arquitetural.

Convenção `.claude/rules/testing.md` respeitada — discovery `**/*.test.ts` ignora `.suite.ts` e `.contract.ts`.

### Fixtures encadeadas usando agregado real

```ts
const buildBankPaidPayable = (fitid: FITID.FITID): PaidFromBankPayable => {
  const open = buildOpenPayable();
  const approver = buildUserRef();
  const approved = Payable.approve(open, approver, D('2026-05-25T00:00:00Z'));
  // ... transmit → processBankOutflow
};
```

Exercita a cadeia completa Open→Approved→Transmitted→Paid via `Payable` namespace — NÃO mocka. Bugs em qualquer transição quebram fixture cedo.

---

## Checklist explícita aplicada

| Categoria | Resultado |
| :--- | :--- |
| A. Regras absolutas de domínio | ✅ zero throw/class/this/any/extends Error no repository.ts (que está em domain) |
| B. Smart constructors / Branded | N/A — port é type contract |
| C. Discriminated unions | N/A neste ticket |
| D. Ports & Adapters | ✅ Port é `type Readonly<{...}>`; adapter é factory function; conversão `throw → Result` desnecessária (zero `throw`); par InMemory presente |
| E. Modular Monolith | ✅ port em `domain/`; adapter em `adapters/persistence/repos/`; nenhum cross-módulo |
| F. ESM / NodeNext / TS moderno | ✅ extensão `.ts`; `import type` apenas no port; `type` inline onde necessário; sem require/namespace/enum |
| G. Naming, PT/EN, clareza | ✅ identifiers EN; erros kebab-case EN; `InMemoryPayableRepository` (sem `Impl` suffix); `Handle` suffix idiomático |
| H. Tests | ✅ AAA implícito + cleanup teardown; fixtures encadeadas reais (não mocks); UUIDs gerados via Generator; sem `expect.any` |

---

## Marco — primeiro ticket da camada Application do módulo Financial

**Saída do domínio puro consolidada.** Skill `ports-and-adapters` (carregada na sessão antes deste ticket) guiou:

- **Critério H2** — port no `domain/<aggregate>/`.
- **Driven Port** modelado como `type Readonly<{...}>` com funções.
- **Factory function** para o adapter (não class).
- **Par InMemory** obrigatório como adapter inicial.
- **Suite reusável** `.suite.ts` para que adapter MySQL real (futuro) consuma a MESMA suite.

Padrão consolidado consistente com `contracts/` — futuros ports do financial replicam.

---

## Próximo passo

- **APPROVED** → pipeline-maestro avança para **W3**.
- Expectativa W3: **ALL-GREEN round 1** — 6 tickets seguidos sem BLOCK seriam recorde (Beneficiary, Core, Transmission, Payment, Port-Repo).
- Após W3 ALL-GREEN, `pnpm run pipeline:state close FIN-PORT-PAYABLE-REPO` (11º ticket FIN-*).
- **Próximo ticket sugerido:** `FIN-PORT-OUTBOX` (S) ou `FIN-USECASE-APPROVE-PAYABLE` (S). Outbox precisa ser definido antes do primeiro use case que publica evento — recomendo **`FIN-PORT-OUTBOX` primeiro** (define `FinancialModuleEvent` + decoder v1 + OutboxPort + InMemory adapter).
