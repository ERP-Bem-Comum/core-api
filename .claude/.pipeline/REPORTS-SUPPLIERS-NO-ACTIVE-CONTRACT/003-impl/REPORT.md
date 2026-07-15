# W1 — GREEN · REPORTS-SUPPLIERS-NO-ACTIVE-CONTRACT (#437)

> Skill: `ports-and-adapters`. Wave W1 (implementação mínima até GREEN).
> Worktree: `.claude/worktrees/437-suppliers-no-contract`.

## Resultado

**GREEN.** `pnpm test` fecha em **4008 tests / 3989 pass / 0 fail / 19 skipped**. Os 2 fails do W0
viraram 15 testes verdes. `typecheck`, `format:check` e `lint` todos limpos. **Zero vermelho** —
nenhum alheio apareceu (a colisão conhecida da suíte `partners` não se manifestou, como no W0).

A superfície pinada pelo W0 (§"Decisões de design") foi seguida **à risca** — zero renome, zero
símbolo além do que os testes exigem.

---

## Arquivos criados

| Arquivo                                                                        | Camada               |
| :----------------------------------------------------------------------------- | :------------------- |
| `src/modules/contracts/application/ports/active-contractor-read.ts`             | port (contracts)     |
| `src/modules/contracts/adapters/persistence/repos/active-contractor-read.drizzle.ts` | adapter Drizzle |
| `src/modules/reports/application/ports/active-contractor-read.ts`               | port (reports)       |
| `src/modules/reports/adapters/persistence/active-contractor-read.in-memory.ts`  | adapter fake         |
| `src/modules/reports/adapters/persistence/active-contractor-read.contracts.ts`  | adapter ACL          |
| `src/modules/reports/application/use-cases/list-suppliers-without-active-contract.ts` | use-case (anti-join) |

## Arquivos alterados

| Arquivo                                                                | Mudança                                                                                          |
| :--------------------------------------------------------------------- | :----------------------------------------------------------------------------------------------- |
| `src/modules/contracts/public-api/read.ts`                              | `buildContractsActiveContractorReadPort` (boot-scoped `{ list…, close }`) + reexport dos tipos     |
| `src/modules/contracts/public-api/index.ts`                             | barrel: exporta o builder + tipos                                                                 |
| `src/modules/financial/public-api/suppliers-without-contract-projection.ts` | `eq(kind,'Parent')` no WHERE + docstring reenquadrada (projeção = **candidatos**, não a resposta) |
| `src/modules/reports/adapters/http/composition.ts`                      | reader do contracts aberto no boot / fechado no shutdown; `contractsUrl`; deps servem o use-case  |
| `src/modules/reports/adapters/http/plugin.ts`                           | **única** mudança: `'active-contractor-read-unavailable': 503` no mapa de erros                    |
| `src/server.ts`                                                         | `REPORTS_CONTRACTS_DATABASE_URL ?? contractsWriterUrl` → `contractsUrl`                            |
| `tests/modules/contracts/public-api/active-contractor-read.drizzle-mysql.test.ts` | import dinâmico → **estático** (sugestão do W0 §5; módulo agora existe)                 |

**NÃO tocados (invariantes verificados):**

- `ContractCountReadPort` e seu adapter/in-memory — paridade backfill×worker preservada.
- `tests/modules/reports/adapters/http/suppliers-without-contract.http.test.ts` (#240) — **intocado
  e verde** (`git status` vazio nele). **CA4 provado mecanicamente.**

---

## Decisões de implementação

1. **Anti-join em memória, no `reports`** (ADR-0006 `:150`/`:154`, ADR-0014 `:130`): `Set` dos refs
   ativos + `filter` sobre os candidatos. `filter` **preserva a ordem** do financial — atende o
   risco 3 do W0 (`assert.deepEqual(refs, [S_NO_CONTRACT])`); nada foi reordenado. Verificado: nenhum
   arquivo de `contracts/` ou `reports/` importa tabela `fin_*` — sem JOIN cross-BC.
2. **Fail-closed**: o use-case só subtrai com o conjunto ativo em mãos; se o reader falha, retorna
   `err('active-contractor-read-unavailable')` → 503. Travado por 2 testes (use-case + borda).
3. **Pool boot-scoped**: `buildContractsActiveContractorReadPort` espelha
   `buildContractsContractCountReadPort` (1 pool por reader, `applyMigrations: false`, `close()` no
   `shutdown()`). A composition fecha os 4 readers; se o 4º falha ao abrir, fecha os 3 anteriores
   antes de lançar (mesmo padrão em cascata já existente).
4. **`SELECT DISTINCT`** via `.selectDistinct({ contractorId })` — `handbook/reference/drizzle/select.mdx`
   §"Distinct select" (`:179`: _"You can use `.selectDistinct()` instead of `.select()` to retrieve
   only unique rows from a dataset"_). Precedente no repo: `auth/…/user-query.drizzle.ts:124`,
   `budget-plans/…/budget-plan-repository.drizzle.ts:174`. Usa o índice existente
   `ctr_contracts_contractor_idx (contractor_id, status)`.
5. **`ReportsHttpDeps.listSuppliersWithoutContract`** alargou o erro para
   `ListSuppliersWithoutActiveContractError` (união). O REP-2 (#240) injeta um `ok(...)`
   (`Result<_, never>`), assinalável à união — por isso segue verde sem edição.

### Desvio deliberado da skill (para o W2 julgar)

A `ports-and-adapters` pede "2 adapters por port: real + InMemory". **Não criei in-memory para o
port novo do `contracts`** — teria **zero consumidores** (todo teste unit usa o in-memory do
`reports`, que é o fake do lado consumidor), e o W0 §1 pinou só port + Drizzle + builder. YAGNI
estrito, conforme a missão. O `ContractCountReadPort` tem in-memory porque o job de backfill do
partners o consome; aqui não há análogo.

---

## Saída REAL dos gates

### `pnpm test`

```
ℹ tests 4008
ℹ suites 1142
ℹ pass 3989
ℹ fail 0
ℹ cancelled 0
ℹ skipped 19
ℹ todo 0
ℹ duration_ms 80914.9735
```

### Testes do ticket (detalhe) — 18/18

```
▶ listSuppliersWithoutActiveContract — anti-join em memória (#437)
  ✔ CA1: fornecedor com contrato Active some, mesmo tendo títulos sem contract_ref (1.419459ms)
  ✔ CA2: fornecedor cujo único contrato é Pending permanece (rascunho não é contrato) (0.10125ms)
  ✔ preserva a agregação do financial intacta (name/totalCents/payableCount) (0.089917ms)
  ✔ conjunto ativo vazio → todos os candidatos passam (0.072834ms)
  ✔ contratante ativo que não é candidato não afeta o resultado (0.075041ms)
  ✔ fail-closed: reader de contratos indisponível → erro (NUNCA lista sem subtrair) (0.087125ms)
  ✔ propaga falha do reader do financial (0.065375ms)
  ✔ sem candidatos → lista vazia (ok, não erro) (0.060958ms)
▶ InMemoryActiveContractorRead — fake do port de contratantes ativos (#437)
  ✔ sem seed → conjunto vazio (0.106834ms)
  ✔ devolve o conjunto semeado (0.087125ms)
▶ reports/http — GET /reports/suppliers-without-contract com anti-join (#437)
  ✔ CA1+CA2: 200 servindo só quem não tem contrato Active
  ✔ CA4: contrato HTTP inalterado — 4 colunas por item
  ✔ CA4: RBAC — sem fiscal-document:read → 403
  ✔ CA4: RBAC — com fiscal-document:read → 200
  ✔ fail-closed: contracts indisponível → 503 (não 200 com lista não-subtraída) (16.539958ms)
✔ reports/http — GET /reports/suppliers-without-contract com anti-join (#437) (118.266917ms)
```

### CA4 — o teste de contrato REP-2 (#240) segue VERDE, intocado

```
▶ reports/http — GET /reports/suppliers-without-contract (REP-2 · #240)
  ✔ CA1: 200 com lista agregada por fornecedor (26.464708ms)
  ✔ CA2: RBAC — sem fiscal-document:read → 403 (0.534042ms)
  ✔ CA3: contrato de saída fechado (4 colunas por item) (0.73575ms)
✔ reports/http — GET /reports/suppliers-without-contract (REP-2 · #240) (81.9235ms)
```

### Gate dos testes de integração — skip limpo com import estático (exit 0)

```
[contracts:active-contractor-read] MYSQL_INTEGRATION não definido — pulando integração.
✔ tests/modules/contracts/public-api/active-contractor-read.drizzle-mysql.test.ts (456.495625ms)
[financial:suppliers-without-contract] MYSQL_INTEGRATION não definido — pulando integração.
✔ tests/modules/financial/public-api/suppliers-without-contract.drizzle-mysql.test.ts (393.839125ms)
ℹ tests 2
ℹ pass 2
ℹ fail 0
--- exit: 0 ---
```

### `pnpm run typecheck`

```
$ tsc --noEmit
```

(sem saída = verde; o vermelho esperado do W0 §Riscos 2 está resolvido)

### `pnpm run format:check`

```
$ prettier --check .
Checking formatting...
All matched files use Prettier code style!
```

### `pnpm run lint`

```
$ eslint .
```

(sem saída = verde)

---

## O que o W2 deve auditar com atenção

1. **Fail-closed de ponta a ponta** — que nenhum caminho devolva a lista não-subtraída. Conferir o
   `if (!withActiveContract.ok) return withActiveContract;` no use-case e o 503 no plugin.
2. **Pool boot-scoped** — que a composition não abra pool por requisição e que `shutdown()` feche os
   **4** readers (incluindo o novo). Conferir também a cascata de cleanup quando o 4º falha ao abrir
   (os 3 anteriores são fechados antes do `throw`).
3. **O desvio da skill** (sem in-memory no `contracts`) — aprovar ou pedir o par.
4. **`kind='Parent'` no `financial`** — que `contract_ref IS NULL` continue como filtro de candidatos
   e que a regra do REP-2 (somar **todos os status de título**, inclusive `Cancelled`) siga intacta.
   Só `kind` foi filtrado, nunca `status`.
5. **ADR-0006/0014** — confirmar que `reports` só importa `public-api` dos módulos-fonte (nunca
   `domain/`/`adapters/`) e que não existe JOIN `ctr_*` × `fin_*`.
6. **`ContractCountReadPort` intacto** — `git diff` não deve tocar `contract-count-read.*`.

## Pendências herdadas (do W0, não regressões)

- **CA5 é do W3**: os 2 arquivos de integração **não rodaram contra MySQL real** (x99 indisponível
  nesta sessão, por instrução do caller). O que está provado aqui é o **gate** (skip limpo, exit 0)
  e o link estático. O RED/GREEN reais deles são do W3 no x99 — inclusive o teste
  `pool boot-scoped: close() encerra o pool`.
- **Fora de escopo, já registrado** (anti-padrão #15 — não consertado aqui): `payee_kind` não
  projetado em `fin_payable_view` (mesma raiz da **#436**); vigência de calendário vs `status='Active'`
  com sweeper atrasado; regra ESLint `no-cross-context-import` do ADR-0006 `:150` ausente.
