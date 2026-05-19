# W0 — RED — Ticket CTR-USECASE-HOMOLOGATE-AMENDMENT

**Skill:** ts-domain-modeler (modo teste)
**Data:** 2026-05-14
**Status:** ✅ RED confirmado

---

## Arquivos criados

- `tests/modules/contracts/application/use-cases/homologate-amendment.test.ts` (414 linhas, 18 testes em 9 suítes)

---

## Inventário dos testes

| # | Suíte | Testes | Cobertura |
| :- | :--- | :---: | :--- |
| 1 | happy path (Addition) | 3 | retorno, persistência, eventos publicados em ordem |
| 2 | input validation | 3 | amendmentId, contractId, homologatedBy inválidos |
| 3 | not found | 2 | amendment não existe, contract não existe |
| 4 | mismatch | 1 | amendment.contractId ≠ contractId passado |
| 5 | domain rule propagation | 3 | sem-doc, contract Expired, value-would-go-negative |
| 6 | side effects on error | 2 | nada é publicado / persistido |
| 7 | InMemoryContractRepository | 2 | null para id desconhecido, persiste/busca |
| 8 | InMemoryAmendmentRepository | 1 | null para id desconhecido |
| 9 | InMemoryEventBus | 2 | published() ordenado, clear() |
| 10 | ClockFixed | 1 | retorno determinístico |

**Total: 18 testes em 10 suítes.** Acumulado pós-W1 esperado: 127 + 18 = **145**.

---

## Test harness — `setupWorld()`

```ts
const setupWorld = async (overrides) => {
  const contractRepo = InMemoryContractRepository();
  const amendmentRepo = InMemoryAmendmentRepository();
  const eventBus = InMemoryEventBus();
  const clock = ClockFixed(D('2026-04-15'));

  // Construir Contract Active + Amendment Pending com signedDocument
  // ...
  return { contract, amendment, contractRepo, amendmentRepo, eventBus, clock };
};
```

**Padrão estabelecido para testes de use case:**
- `setupWorld(overrides)` constrói mundo válido (estado consistente entre repos).
- `deps(world)` extrai os 4 ports do handle.
- Cada teste roda o use case via `homologateAmendment(deps(world))(cmd)`.

**Overrides suportados:**
- `amendmentImpactCents` — para testar Suppression excedente.
- `contractValueCents` — para combinar com Suppression.
- `contractIsExpired` — para testar propagação `contract-not-active`.

---

## Confirmação de RED

```
pnpm typecheck → 5 módulos não encontrados:
  - #src/shared/adapters/clock-fixed.ts
  - #src/modules/contracts/adapters/contract-repository.in-memory.ts
  - #src/modules/contracts/adapters/amendment-repository.in-memory.ts
  - #src/modules/contracts/adapters/event-bus.in-memory.ts
  - #src/modules/contracts/application/use-cases/homologate-amendment.ts
```

✅ **W0 RED confirmado.** Os 127 testes anteriores continuam verdes.

---

## Decisões pré-W1 (registradas)

### Estrutura dos arquivos a criar

```
src/shared/ports/
└── clock.ts                                — Clock port (cross-cutting)

src/shared/adapters/
├── clock-real.ts                           — ClockReal usando new Date()
└── clock-fixed.ts                          — ClockFixed(at) determinístico

src/modules/contracts/application/ports/
├── contract-repository.ts                  — ContractRepository
├── amendment-repository.ts                 — AmendmentRepository
└── event-bus.ts                            — EventBus para ContractEvent | AmendmentEvent

src/modules/contracts/application/use-cases/
└── homologate-amendment.ts                 — use case factory

src/modules/contracts/adapters/
├── contract-repository.in-memory.ts        — handle { repo, store, clear }
├── amendment-repository.in-memory.ts       — handle { repo, store, clear }
└── event-bus.in-memory.ts                  — handle { bus, published, clear }
```

### Handles (factories enriquecidas)

InMemory adapters retornam **handles** com `repo`/`bus` (que implementam o port) + helpers de inspeção. Não viola o port — quem consome o port só vê `repo`/`bus`.

```ts
type InMemoryContractRepositoryHandle = Readonly<{
  repo: ContractRepository;
  store: () => readonly Contract[];
  clear: () => void;
}>;

type InMemoryEventBusHandle = Readonly<{
  bus: EventBus;
  published: () => readonly AppEvent[];
  clear: () => void;
}>;
```

---

## Próximo passo

W1 — implementar todos os 9 arquivos. Esperado: ~400 linhas.
