# Code Review — Ticket CTR-USECASE-HOMOLOGATE-AMENDMENT — Round 1

**Veredito:** ✅ **APPROVED**

**Reviewer:** code-reviewer
**Data:** 2026-05-14
**Escopo revisado:** 10 arquivos novos (4 ports + 5 adapters + 1 use case) + teste

---

## Resumo executivo

**Primeiro use case** do projeto, **primeiros Ports**, **primeiros Adapters**. Fluxo de 8 passos cumprindo orquestração entre 2 agregados + 3 ports externos (2 repos + EventBus + Clock). **Zero `throw`/`class`/`this`/`any` em application/adapters.** Padrão limpo, replicável para próximos use cases. **Aprovado para W3**.

---

## Checklist aplicado

### A. Regras absolutas (application + adapters)

| Item | Status | Evidência |
| :--- | :---: | :--- |
| Zero `throw` em application/adapters | ✅ | `grep` → 0 ocorrências |
| Zero `class`/`this`/`any` | ✅ | confirmado |
| `Readonly<>` em `Deps`, `Command`, `Output` | ✅ | `homologate-amendment.ts:36, 56, 59` |
| Toda função exportada com return type | ✅ | confirmado |

### B. Ports

| Item | Status | Evidência |
| :--- | :---: | :--- |
| Ports são `type Readonly<{...}>`, não `interface` | ✅ | `Clock`, `ContractRepository`, `AmendmentRepository`, `EventBus` |
| Sem `class` em ports | ✅ | confirmado |
| Funções, não métodos OO | ✅ | `findById`, `save`, `publish`, `now` — todas function types |
| Erros como string literal union | ✅ | `ContractRepositoryError`, `AmendmentRepositoryError`, `EventBusError` |

### C. Adapters

| Item | Status | Evidência |
| :--- | :---: | :--- |
| Implementam o port estritamente | ✅ | InMemory factories retornam handles cujo `repo`/`bus` satisfaz o port |
| `throw` zero, conversão para `Result` | ✅ | InMemory não tem operações que falham — sempre `ok(...)` |
| Handle expõe helpers de inspeção sem violar port | ✅ | `store()`, `published()`, `clear()` ficam **fora** do port — só no handle |
| `Map<XId, Y>` para storage in-memory | ✅ | padrão consistente em ambos repos |
| `ClockFixed(at)` determinístico | ✅ | retorna sempre o mesmo `at` |

### D. Use case

| Item | Status | Evidência |
| :--- | :---: | :--- |
| Factory function `(deps) => (input) => Promise<Result>` | ✅ | `homologate-amendment.ts:66` |
| Sequência validate→fetch→domain→persist→emit | ✅ | linhas 70-105 — exatamente nessa ordem |
| Eventos publicados depois de saves | ✅ | linhas 99-105 |
| `Clock.now()` em vez de `new Date()` | ✅ | `at = deps.clock.now()` (linha 84) |
| Error union completa | ✅ | `HomologateAmendmentError` lista todos os erros possíveis |
| `throw` zero em use case | ✅ | toda falha via `return err(...)` ou propagação de Result |

### E. Modular Monolith

| Item | Status | Evidência |
| :--- | :---: | :--- |
| `application/` importa domain + ports próprios + `shared/ports/clock.ts` | ✅ | nenhum import cross-módulo |
| `adapters/` implementa ports do próprio módulo + lib externa (nenhuma usada) | ✅ | só imports internos |
| Sem leakage de tipos infra para domain | ✅ | domain não tem Promise, nem Repository |

### F. ESM / NodeNext

| Item | Status | Evidência |
| :--- | :---: | :--- |
| Imports `.ts` | ✅ | todos |
| `import type` em type-only | ✅ | confirmado |
| Sem `enum`/`namespace`/`require` | ✅ | confirmado |
| `tsc --noEmit` zero erros | ✅ | rodado em W1 |

### G. Naming, EN/PT

| Item | Status | Evidência |
| :--- | :---: | :--- |
| Identificadores EN | ✅ | `homologateAmendment`, `ContractRepository`, `InMemoryEventBus`, `ClockFixed`, `Deps` |
| Erros EN kebab-case | ✅ | confirmado |

### H. Tests (coerência)

| Item | Status | Evidência |
| :--- | :---: | :--- |
| Test harness consistente (`setupWorld`) | ✅ | fixture builder único, overrides controlados |
| Cobertura proporcional | ✅ | 18 testes cobrindo happy path + 3 categorias de erro + side-effect isolation |
| Async/await correto | ✅ | `await` em cada chamada de port |
| Sem matchers vagos | ✅ | `assert.equal` com valor exato |

---

## Pontos positivos (explícitos)

1. **`as unknown as string` em teste é defensável** — `world.amendment.id` é branded `AmendmentId`, mas o use case aceita `string` raw. Cast forçado simula a realidade (CLI/HTTP recebe string). Re-validação no use case garante segurança.

2. **`Clock` cross-cutting em `src/shared/ports/`** — decisão correta. Quando outro módulo (Financeiro, futuro) precisar, importa daqui. Sem fragmentação.

3. **Handles dos adapters InMemory** — `{ repo, store(), clear() }` separa o port (consumido pelo use case) dos helpers (consumidos por testes/CLI). Pattern excelente.

4. **Sequência de 8 passos linear e auditável** — cada passo é uma linha, fácil de seguir. Sem callback hell, sem nested-if. Early return preserva legibilidade.

5. **`ContractsModuleEvent` union em `event-bus.ts`** — TS força exhaustive em consumidores do EventBus. Quando o módulo Financeiro vier e definir seu próprio `FinanceModuleEvent`, vão coexistir naturalmente.

6. **`amendment-contract-mismatch` é defesa cedo** — validação acontece **antes** de chamar `Amendment.homologate`. Falha rápida.

7. **`HomologateAmendmentError` documenta todos os caminhos** — leitor da assinatura sabe os 12+ erros possíveis (5 categorias). Type union grande mas precisa.

8. **`Map<XId, Y>` em repos InMemory** — branded `XId` como chave de Map funciona porque em runtime é string. Type-safe + eficiente.

9. **`bus.published()` retorna `[...log]` (cópia defensiva)** — caller não pode mutar o log interno.

10. **`InMemoryEventBus.clear()` usa `log.length = 0`** — não realoca, mantém referência. Ínfimo detalhe mas correto.

---

## Notas (🔵 não-bloqueantes)

### Nota 1 — Saves não-atômicos (G1 do REPORT)

```ts
await deps.amendmentRepo.save(homologated.value.amendment);
await deps.contractRepo.save(contractUpdated.value.contract);
```

Se o segundo `save` falhar, Amendment ficou `Homologated` em storage mas Contract não foi atualizado. **Estado inconsistente** persiste até intervenção manual.

**Em produção MySQL:** transação envolve os 2 saves; outbox real lança eventos só após commit. **Em InMemory:** sem transação. Aceito para Fase 1.

**Documentado** no REPORT da W1 como G1. **Sem ação** neste ticket. Quando o adapter MySQL entrar, ticket terá teste de rollback.

### Nota 2 — Order: save Amendment first, then Contract

Decisão D6 do request. Justificativa: se Contract.save falha **depois** de Amendment.save, temos `Amendment{Homologated}` + `Contract{current=old}`. **Inconsistente, mas detectável** — Amendment.homologatedAmendmentIds está em Contract, então auditoria detecta divergência. Variante reversa (Contract first) deixaria Contract atualizado sem Amendment Homologated — caller poderia tentar de novo e dobrar o valor.

Padrão **menos pior** dos dois. Sem ação.

### Nota 3 — Publish entre 2 saves não-atômico (G2 do REPORT)

```ts
for (const event of events) {
  const published = await deps.eventBus.publish(event);
  if (!published.ok) return published;
}
```

Se primeiro publish OK e segundo falha, `AmendmentHomologated` foi propagado mas `ContractStateUpdated` não. Consumidor cross-módulo ouve o primeiro, age, mas não vê o segundo — estado divergente externo.

**Em outbox real (MySQL):** eventos persistem na mesma transação; worker replay garante eventual consistency. **Em InMemory:** sem outbox.

**Documentado** como G2. Sem ação.

### Nota 4 — `for await` ao invés de `Promise.all`

```ts
for (const event of events) {
  const published = await deps.eventBus.publish(event);
  if (!published.ok) return published;
}
```

**Sequencial.** Por que não `Promise.all([p1, p2])`?
- **Ordem garantida** — `AmendmentHomologated` antes de `ContractStateUpdated`. Em Promise.all, ordem de chegada ao bus depende da implementação.
- **Early return** — primeiro publish falha, segundo nem tenta.

Trade-off: 2x mais lento. Para 2 eventos, irrelevante. **Mantém.**

### Nota 5 — `as unknown as string` nos testes

```ts
amendmentId: world.amendment.id as unknown as string,
```

Em produção, IDs chegam ao use case como `string` (do JSON/CLI). No teste, temos o ID já branded — cast force-downcast. Padrão **aceitável em testes** mas **não em produção**. Sem ação.

### Nota 6 — `InMemoryEventBus` aceita teste passando event com payload artificial

No teste:
```ts
await bus.bus.publish({
  type: 'AmendmentHomologated',
  amendmentId,
  homologatedBy: AmendmentId.generate() as unknown as never, // hack
  occurredAt: D('2026-04-15'),
});
```

O tipo `UserRef` é `Brand<string, 'UserRef'>` mas o teste passa `AmendmentId` cast para `never`. **Funciona em runtime** (ambos são strings UUID branded), mas violaria intent type. **Aceitável em teste de adapter isolado** — não é teste de domínio.

**Sugestão para limpeza futura:** test helper `validUserRef()` em vez de cast — clareza > brevidade.

---

## O que ficou particularmente bom

- **Decisão consciente sobre ordem de save** documentada (Nota 2). Reviewer entende em 10 segundos por que foi escolhido X em vez de Y.
- **`HomologateAmendmentError` agrega todos os caminhos** — 12 categorias, exhaustive. Leitor sabe **tudo** que pode falhar.
- **Handle pattern dos adapters** — extension limpa do port sem violar contrato. Replicável.
- **Test harness `setupWorld()`** — padrão `{ contract, amendment, contractRepo, amendmentRepo, eventBus, clock }` retornado. Cada teste extrai `deps(world)` e roda. Boilerplate mínimo.

---

## Próximo passo

W3 — `ts-quality-checker`. Esperado: ALL GREEN com 147 testes.
