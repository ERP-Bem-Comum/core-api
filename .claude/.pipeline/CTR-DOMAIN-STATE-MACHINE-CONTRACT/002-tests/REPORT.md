# W0 — RED — CTR-DOMAIN-STATE-MACHINE-CONTRACT

> **Status:** ✅ completed (round 1)
> **Skill:** [`tdd-strategist`](../../../skills/tdd-strategist/SKILL.md)
> **Data:** 2026-05-20
> **Modo de execução:** sub-agent `contratos-orchestrator` (Opção B). A invocação foi **interrompida** antes da rotina administrativa de fechamento (REPORT/STATE/`pnpm test` final). A condução da wave (testes RED) ficou íntegra; o fechamento foi consolidado pela seção principal após verificação direta dos arquivos.

---

## Critérios de aceitação cobertos por testes RED

| CA | Cobertura | Onde |
| :--- | :--- | :--- |
| **CA1** — Tipos refinados emitidos | Asserts de runtime confirmam que `ActiveContract` produzido por `create` **não tem** `endedAt`; `Expired/Terminated` produzidos por `expire/terminate` **têm** `endedAt: Date`. (CA1 estática completa só em W1 com `@ts-expect-error`.) | `contract.test.ts` — describe `Contract.parseActive — shape do tipo refinado (CA1 runtime)` |
| **CA2** — `parseActive` substitui `assertActive` | `Contract.parseActive(active) → ok`; `parseActive(expired)/parseActive(terminated) → err(ContractNotActive { currentStatus })`. | `contract.test.ts` — describes `Contract.parseActive — happy path` e `Contract.parseActive — rejeições` |
| **CA3** — Transições com assinatura refinada | Asserts de runtime: `expire`/`terminate` chamados em contrato não-Active retornam `err(ContractNotActive)`. Assinatura compile-time refinada (`expire(c: ActiveContract)`) só ganha trava `@ts-expect-error` em W1. | `contract.test.ts` — describes existentes `Contract.expire — rejections` / `Contract.terminate — rejections` (atualizados para tagged) |
| **CA4** — Use cases consomem refinement na borda | Teste existente `propagates contract-not-active when contract is Expired` em `homologate-amendment.test.ts` cobre o caminho — após W1, esse caminho passará por `parseActive`. | `homologate-amendment.test.ts:332-338` |
| **CA5** — Mappers retornam union; preservam subtipo no round-trip | **Novo arquivo de teste**: round-trip por subtipo + rejeição de shapes impossíveis (Active+endedAt, Expired/Terminated+null) com novo erro tagged `contract-mapper-invalid-ended-at`. | `contract.mapper.test.ts` (179 linhas, untracked → será comitado em W1) |
| **CA6** — Cobertura ≥ baseline + 3 novos mínimos | Baseline 595 → atual **608** (=> **+13 testes novos**, supera o mínimo de 3 exigido). | `pnpm test` summary |
| **CA7** — Gates W3 verdes | Não aplicável a W0 (rodado em W3). | — |

---

## Arquivos tocados em W0

### Modificados (somente `tests/`)

```
tests/modules/contracts/domain/contract/contract.test.ts                            (+ ~120 LOC nos novos describes)
tests/modules/contracts/adapters/persistence/fixtures.ts                            (+ buildExpiredContract + buildTerminatedContract)
tests/modules/contracts/application/use-cases/homologate-amendment.test.ts          (zero teste novo neste arquivo nesta wave; ajustes vieram dos tickets anteriores)
```

### Criados

```
tests/modules/contracts/adapters/persistence/contract.mapper.test.ts                (novo — 179 LOC — CA5 round-trip por subtipo)
```

### `src/` — **NÃO TOCADO** (W0 é fail-first puro)

---

## Saída literal do `pnpm test` (estado RED esperado)

### Stats globais (Node test runner — `ℹ` summary)

```
ℹ tests 608
ℹ suites 199
ℹ pass 586
ℹ fail 9
ℹ cancelled 0
ℹ skipped 13
ℹ todo 0
ℹ duration_ms 37709.18525
```

> Baseline antes deste ticket: **595 tests / 582 pass / 0 fail / 13 skipped**. Delta: **+13 testes**, **+9 fail novos** (todos do W0).

### Failures novos (TypeError esperado — API-alvo não existe ainda)

```
test at tests/modules/contracts/domain/contract/contract.test.ts:556:3
✖ tipo de retorno é ActiveContract (narrowing via status) (0.049917ms)
  TypeError: Contract.parseActive is not a function
      at TestContext.<anonymous> (.../contract.test.ts:560:24)

test at tests/modules/contracts/domain/contract/contract.test.ts:570:3
✖ retorna err(ContractNotActive) quando contrato está Expired (0.069917ms)
  TypeError: Contract.parseActive is not a function

test at tests/modules/contracts/domain/contract/contract.test.ts:588:3
✖ retorna err(ContractNotActive) quando contrato está Terminated (0.055292ms)
  TypeError: Contract.parseActive is not a function

test at tests/modules/contracts/domain/contract/contract.test.ts:608:3
✖ ActiveContract produzido por create não tem campo endedAt (0.059292ms)
  TypeError: Contract.parseActive is not a function

test at tests/modules/contracts/adapters/persistence/contract.mapper.test.ts:108:3
✖ Active + endedAt null → ok com status Active (0.991708ms)

test at tests/modules/contracts/adapters/persistence/contract.mapper.test.ts:168:3
✖ Active + endedAt != null → err (shape impossível — DON'T C§29) (0.139959ms)

✖ Expired + endedAt null → err (shape impossível — DON'T C§29) (0.102875ms)
✖ Terminated + endedAt null → err (shape impossível — DON'T C§29) (0.077667ms)
```

> **Causa do erro:** `Contract.parseActive` não existe em `domain/contract/contract.ts`; o `contractFromRow` mapper ainda usa cast inseguro e não rejeita shapes impossíveis. Exatamente o estado esperado pelo fail-first.

---

## Decisões tomadas em W0 (registradas para W1)

1. **Novo variant de erro no mapper.** `ContractMapperError` precisa ganhar o variant `contract-mapper-invalid-ended-at` (tagged record, formato Padrão D) — combina `currentStatus` + `endedAtPresent: boolean` como evidência da colisão (DO D§23). W1 deve adicionar antes de tudo.
2. **Builders Expired/Terminated em `fixtures.ts`.** Já consumem a API atual de `Contract.expire`/`terminate`; após W1, automaticamente passarão a produzir os subtipos refinados sem mudança no builder.
3. **`endedAt` campo em `ActiveContract`.** Estado-alvo é **ausente** do tipo (não `undefined`, não `null`). Asserts de runtime usam `'endedAt' in r.value === false`. Em W1, o tipo declarará `ActiveContract = ContractCore & { status: 'Active' }` sem `endedAt`.
4. **`@ts-expect-error` traves estáticas adiadas.** A trava compile-time de `expire(expiredContract)` é melhor escrita após W1 (quando o tipo `ActiveContract` existe). Em W0, a evidência de RED vem do runtime (`TypeError`).

---

## Próximo passo

→ **W1 (GREEN)** — `ts-domain-modeler` refatora `domain/contract/types.ts` + `contract.ts` + `errors.ts` + `mappers/contract.mapper.ts` para a API-alvo, garante TS strict verde e todos os 608 testes passando.

Caminhos de leitura obrigatória para W1:

- [`./000-request.md`](../000-request.md) — escopo + 7 CAs + arquivos previstos.
- [`./STATE.md`](../STATE.md) — estado atual.
- Este REPORT (decisões 1-4 acima).
