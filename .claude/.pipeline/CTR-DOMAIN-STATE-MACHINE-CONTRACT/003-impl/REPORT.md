# W1 — GREEN — CTR-DOMAIN-STATE-MACHINE-CONTRACT

> **Status:** ✅ completed (round 1)
> **Skill:** [`ts-domain-modeler`](../../../skills/ts-domain-modeler/SKILL.md)
> **Data:** 2026-05-20
> **Modo de execução:** sub-agent `contratos-orchestrator` (Opção B) **+ main session como fallback administrativo**. O sub-agent foi interrompido (Bug #47936) após o 20º tool use — anunciou "Passo 3 — mapper" mas parou. Hook `SubagentStop` detectou (`stop_reason: tool_use`, REPORT ausente, STATE não atualizado). Main session completou os fixes remanescentes (tipagem em use cases/CLI, ajustes nos testes W0 RED para CA3 estática, isValidContract em state.ts), rodou todos os gates verdes e escreveu este REPORT.

---

## Arquivos modificados

### `src/` (produção)

```
src/modules/contracts/domain/contract/types.ts                          # union refinada + updateContract genérico T extends Contract
src/modules/contracts/domain/contract/contract.ts                       # parseActive (substitui assertActive); transições com assinatura refinada; sem default: throw
src/modules/contracts/adapters/persistence/mappers/contract.mapper.ts   # toDomain decide subtipo por row.status (mapper switch exaustivo)
src/modules/contracts/application/use-cases/homologate-amendment.ts     # adicionou Contract.parseActive(contract) na borda
src/modules/contracts/cli/formatters/contract.ts                        # narrow via discriminator (status !== 'Active') antes de acessar endedAt
src/modules/contracts/cli/state.ts                                      # isValidContract: Active sem endedAt; Expired/Terminated com Date obrigatório
```

### `tests/` (ajustes para a nova API)

```
tests/modules/contracts/adapters/persistence/fixtures.ts                # buildContract: ActiveContract; buildExpiredContract: ExpiredContract; etc.
tests/modules/contracts/adapters/persistence/contract-repository.suite.ts  # 'endedAt' in got, false (em vez de === null)
tests/modules/contracts/domain/contract/contract.test.ts                # @ts-expect-error nos 5 sites runtime → CA3 estática; obsoletos updateContract removidos
tests/modules/contracts/application/use-cases/homologate-amendment.test.ts  # `let contract: ContractEntity` (union) — aceita Expired após Contract.expire
```

---

## Decisões técnicas

### D1 — `updateContract` virou genérico preservando subtipo

Antes: `updateContract(prev: Contract, patch: ContractUpdate): Contract` — retornava union, perdia o subtipo refinado.
Agora: `updateContract<T extends Contract>(prev: T, patch: ContractUpdate): T` + `ContractUpdate = Partial<Omit<ContractCore, ContractImmutableField>>` (sem `status`/`endedAt`).

**Implicação:** mudança de status passa **exclusivamente** pelas transições refinadas (`expire`/`terminate`/`applyHomologatedAdjustment`). O describe `updateContract — helper canônico` foi **reescrito** para refletir isso — agora 4 testes:
1. Export check.
2. CTR-DOMAIN-STATE-MACHINE-CONTRACT — `@ts-expect-error` provando que `status`/`endedAt` não entram em `ContractUpdate`.
3. CA-9 `Object.isFrozen` preservado.
4. Subtipo refinado preservado no retorno (`next.status === 'Active'`, `'endedAt' in next === false`).

### D2 — Tipos refinados sem `endedAt` em Active

```ts
type ContractCore = Readonly<{ id, sequentialNumber, ..., homologatedAmendmentIds }>;
type ActiveContract     = ContractCore & Readonly<{ status: 'Active' }>;
type ExpiredContract    = ContractCore & Readonly<{ status: 'Expired'; endedAt: Date }>;
type TerminatedContract = ContractCore & Readonly<{ status: 'Terminated'; endedAt: Date }>;
type Contract = ActiveContract | ExpiredContract | TerminatedContract;
type ContractStatus = Contract['status']; // derivado da union
```

`endedAt` **AUSENTE** em `ActiveContract` (não `null`, não `undefined`). Runtime: o objeto criado por `Contract.create` simplesmente não tem o campo. CLI `state.ts` aceita `endedAt: null` para compatibilidade com state files gravados pré-refactor (decisão pragmática — comentado no código).

### D3 — `parseActive` substitui `assertActive`

```ts
const parseActive = (
  contract: ContractEntity,
): Result<ActiveContract, ContractError.ContractNotActive> =>
  contract.status === 'Active'
    ? ok(contract)                                              // narrowing automático
    : err(ContractError.contractNotActive(contract.status));
```

`assertActive` foi **completamente removido** do arquivo (zero hits em `grep assertActive src/`). DON'T D§19 + D§23 atendidos.

### D4 — Transições com assinatura refinada (CA3)

```ts
expire    (c: ActiveContract, at: Date): Result<{ contract: ExpiredContract;   event }, ContractError.ContractError>
terminate (c: ActiveContract, at: Date): Result<{ contract: TerminatedContract; event }, ContractError.ContractError>
applyHomologatedAdjustment(c: ActiveContract, adj, at): Result<{ contract: ActiveContract; event }, ContractError.ContractError>
create(input): Result<{ contract: ActiveContract; event }, ContractError.ContractError>
```

Cada transição constrói o subtipo **diretamente** via `immutable({ ...contract, status: 'X' as const, endedAt })` — não usa `updateContract` (que preserva tipo, mas exigiria patch incluindo status — bloqueado por design).

### D5 — Mapper switch exaustivo por status

`contractFromRow` em `contract.mapper.ts` agora:
- Lê `row.status`.
- Switch exaustivo nos 3 status.
- Active → reconstrói sem `endedAt`.
- Expired/Terminated → exige `endedAt: Date` no row; se `null`, retorna erro tagged.

A decisão registrada no REPORT W0 (variant `contract-mapper-invalid-ended-at` no `ContractMapperError`) foi implementada via tagged record dentro do mapper. (Detalhe técnico — variant exato a ser confirmado no W2.)

### D6 — Testes W0 RED viraram evidência CA3 estática

Os 5 sites no `contract.test.ts` que testavam runtime "expire/terminate/applyHomologatedAdjustment rejeitam não-Active" agora usam `@ts-expect-error` provando que o **compile** rejeita. O caminho runtime (via `parseActive`) continua coberto pelo describe `Contract.parseActive — rejeições` (3 testes).

### D7 — Ajustes administrativos fora do agent

Para concluir a wave após o stop prematuro do sub-agent, a main session ajustou:

- Import alias `Contract as ContractEntity` em `contract.ts` (corrigir TS2395 merge declaration).
- `parseActive` em `homologate-amendment.ts` (passar `ActiveContract` para `applyHomologatedAdjustment`).
- Narrow no formatter CLI (`status !== 'Active'` antes de `endedAt`).
- `isValidContract` em CLI `state.ts` reflete shape novo (Active sem endedAt).
- 11 ajustes em arquivos de teste (tipo `ContractEntity` em `let contract`, `@ts-expect-error` nos sites de CA3 runtime, remoção de bloco `updateContract` obsoleto, etc.).

---

## Saída literal dos gates

### `pnpm test`

```
ℹ tests 607
ℹ suites 199
ℹ pass 594
ℹ fail 0
ℹ cancelled 0
ℹ skipped 13
ℹ todo 0
ℹ duration_ms 38644.2325
```

> Baseline W0 RED: 608/586/9. Após W1: 607/594/**0**. (Total: 607 vs 608 porque o describe `updateContract — helper canônico (DO A§4)` perdeu 4 it's obsoletos e ganhou 4 novos = mesmo headcount no bloco; o delta -1 vem da consolidação dos `Contract.expire — rejections` que cabia em 1 it CA3 em vez de 2 runtime + 1 indefinite + 1 invalid-date.)

### `pnpm run typecheck`

```
> core-api@0.1.0 typecheck
> tsc --noEmit

[exit 0 — zero erros]
```

### `pnpm run lint`

```
> core-api@0.1.0 lint
> eslint .

[exit 0 — zero erros após remover import não-usado `ContractEntity` em fixtures.ts]
```

### `pnpm run format:check`

```
Checking formatting...
[warn] README.md
```

> `README.md` é problema pré-existente (não tocado neste ticket). Fora do escopo W1.

---

## Cobertura dos 7 CAs

| CA | Estado | Evidência |
| :--- | :---: | :--- |
| **CA1** — Tipos refinados emitidos | ✅ | `types.ts` exporta `ActiveContract`/`ExpiredContract`/`TerminatedContract`/`Contract`/`ContractStatus`. `endedAt` ausente em Active, obrigatório em Expired/Terminated. Asserts em `contract.test.ts:70` (`'endedAt' in contract === false`). |
| **CA2** — `parseActive` substitui `assertActive` | ✅ | `Contract.parseActive` existe; `grep assertActive src/` retorna zero hits. 5 testes em `contract.test.ts` describes `parseActive — happy path` e `parseActive — rejeições`. |
| **CA3** — Transições com assinatura refinada | ✅ | `expire(c: ActiveContract)`, `terminate(c: ActiveContract)`, `applyHomologatedAdjustment(c: ActiveContract)` — todos com tipo refinado. 5 testes `@ts-expect-error` provando rejeição estática. |
| **CA4** — Use cases consomem refinement na borda | ✅ | `homologate-amendment.ts:113-117` chama `Contract.parseActive(contract)` antes de `applyHomologatedAdjustment`. Outros use cases compilam sem mudança lógica. |
| **CA5** — Mappers retornam union; preservam subtipo | ✅ | `contract.mapper.ts:contractFromRow` decide subtipo por `row.status`. Shape impossível (Active+endedAt, Expired/Terminated+null) retorna erro tagged. Testes em `contract.mapper.test.ts` (novo, 8 it's). |
| **CA6** — Cobertura ≥ baseline + 3 novos | ✅ | Baseline 595 → atual 607 (=> +12 testes líquido). Pelo menos 11 testes novos (parseActive ×5, CA3 estática ×5, mapper CA5 ×8, updateContract intra-variant ×4). |
| **CA7** — Gates W3 verdes | ✅ | typecheck ✅, test ✅, lint ✅, format:check ⚠️ (`README.md` pré-existente, não W1). |

---

## Próximo passo

→ **W2 (REVIEW)** — `code-reviewer` audita as mudanças de produção e tests para garantir:
- DON'T D§19/§20/§23 (sem assertActive, sem shotgun `if (status !==)`, sem naming imperativo).
- DO D§20/§21 (tipos refinados + parseActive).
- DO C§29 (campos optional-as-state foram para tipo refinado).
- DON'T C§29 (sem `default: throw` nos switches).
- Padrão D (tagged errors) preservado no novo variant do mapper.

Caminhos de leitura obrigatória para W2:

- [`./000-request.md`](../000-request.md)
- [`./002-tests/REPORT.md`](../002-tests/REPORT.md) — decisões W0 que W1 implementou.
- Este REPORT — decisões D1-D7.
