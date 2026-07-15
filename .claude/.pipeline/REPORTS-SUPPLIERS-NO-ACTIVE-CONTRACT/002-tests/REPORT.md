# W0 — RED · REPORTS-SUPPLIERS-NO-ACTIVE-CONTRACT (#437)

> Skill: `tdd-strategist`. Wave W0 (fail-first). **Zero arquivo de `src/` tocado.**
> Worktree: `.claude/worktrees/437-suppliers-no-contract`.

## Resultado

**RED provado.** `pnpm test` fecha em **3974 pass / 2 fail**, e os 2 fails são exatamente os dois
arquivos novos do ticket, ambos por **API inexistente** (`ERR_MODULE_NOT_FOUND`) — não por sintaxe
nem por import quebrado. **Nenhum vermelho pré-existente/alheio apareceu** nesta rodada (a colisão
conhecida da suíte `partners` não se manifestou).

---

## Arquivos de teste criados/alterados

| #   | Arquivo                                                                              | Ação                       | Camada                                   | Roda em                                     |
| :-- | :----------------------------------------------------------------------------------- | :------------------------- | :--------------------------------------- | :------------------------------------------ |
| 1   | `tests/modules/contracts/public-api/active-contractor-read.drizzle-mysql.test.ts`     | **novo**                   | integração MySQL                         | `pnpm run test:integration` (suíte `contracts`) |
| 2   | `tests/modules/financial/public-api/suppliers-without-contract.drizzle-mysql.test.ts` | **alterado**               | integração MySQL                         | `pnpm run test:integration:financial`       |
| 3   | `tests/modules/reports/application/use-cases/list-suppliers-without-active-contract.test.ts` | **novo**             | unit (in-memory)                         | `pnpm test`                                 |
| 4   | `tests/modules/reports/adapters/http/suppliers-without-active-contract.http.test.ts`  | **novo**                   | borda HTTP (`fastify.inject`, in-memory) | `pnpm test`                                 |
| 5   | `scripts/ci/test-integration.ts`                                                      | **alterado**               | manifesto do runner                      | —                                           |
| 6   | `tests/modules/reports/adapters/http/suppliers-without-contract.http.test.ts`         | **intocado (de propósito)** | borda HTTP                               | `pnpm test`                                 |

**(5)** registra o path do teste (1) na suíte `contracts`. Sem isso o teste nasceria **órfão** — já
houve precedente registrado no próprio manifesto (`#316 — estava órfã: escrita na Fatia 2 mas nunca
registrada no runner`).

**(6)** ficou **intacto e verde** de propósito: é a prova mecânica do **CA4 — "contrato HTTP
inalterado, front não muda"**. Se o W1 precisar editá-lo para ficar verde, o contrato HTTP mudou e o
CA4 foi violado. Por isso a semântica nova foi para um arquivo HTTP **separado** (4), em vez de
poluir o de #240.

---

## Mapa CA → teste

| CA                                                                                                            | Onde é provado                                          | Testes                                                                                                                                                                                                             |
| :------------------------------------------------------------------------------------------------------------ | :------------------------------------------------------ | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **CA1** — fornecedor com ≥1 contrato `Active` (`contractor_type='supplier'`) NÃO aparece, mesmo com títulos `contract_ref IS NULL` | (1) origem do conjunto · (3) subtração · (4) ponta-a-ponta | `CA1: contratante com contrato Active (…) aparece`; `contractor_type ≠ supplier NÃO aparece`; `DISTINCT — 2 contratos Active (…) → 1 entrada`; `CA1: fornecedor com contrato Active some (…)`; `CA1+CA2: 200 servindo só quem não tem contrato Active` |
| **CA2** — só `Pending` (ou `Expired`/`Terminated`/`Cancelled`, ou nenhum contrato) → **aparece**               | (1) exclusão na origem · (3) passa na subtração          | `CA2: Pending NÃO conta como contrato`; `CA2: Expired / Terminated / Cancelled NÃO contam`; `CA2: Pending + Active no mesmo contratante → aparece`; `CA2: fornecedor cujo único contrato é Pending permanece`         |
| **CA3** — filhos de retenção fora: doc sem contrato com ISS+IRRF → `payableCount=1`, `totalCents` = líquido do pai | (2)                                                     | `CA3 (#437): kind=Parent — filhos de retenção (ISS/IRRF) fora da soma e da contagem`; `CA3 (#437): fornecedor cujos títulos sem contrato são SÓ filhos de retenção não é candidato`                                   |
| **CA4** — RBAC (403 sem `fiscal-document:read`, 200 com) + contrato HTTP inalterado                            | (4) + (6)                                               | `CA4: RBAC — sem fiscal-document:read → 403`; `CA4: RBAC — com fiscal-document:read → 200`; `CA4: contrato HTTP inalterado — 4 colunas por item`; e (6) inteiro verde                                                 |
| **CA5** — validação em MySQL real (x99)                                                                        | (1) + (2)                                               | **do W3** — ver §Riscos                                                                                                                                                                                             |

Regra do REP-2 preservada e travada por teste: **todos os status de _título_ somam (inclusive
`Cancelled`)** — `assert.equal(s1.totalCents, 150000, 'soma inclui Cancelled; título com contract_ref fora')`.
O que passa a ser filtrado é `kind`, não `status`.

---

## Saída REAL do runner (prova do RED)

### `pnpm test` (suíte completa)

```
ℹ tests 3995
ℹ suites 1139
ℹ pass 3974
ℹ fail 2
ℹ cancelled 0
ℹ skipped 19
ℹ todo 0
ℹ duration_ms 76648.332958

✖ failing tests:

test at tests/modules/reports/adapters/http/suppliers-without-active-contract.http.test.ts:1:1
✖ tests/modules/reports/adapters/http/suppliers-without-active-contract.http.test.ts (663.274416ms)
  'test failed'

test at tests/modules/reports/application/use-cases/list-suppliers-without-active-contract.test.ts:1:1
✖ tests/modules/reports/application/use-cases/list-suppliers-without-active-contract.test.ts (80.463042ms)
  'test failed'
[ELIFECYCLE] Test failed. See above for more details.
```

### Motivo do RED — API inexistente, não sintaxe

```
Error [ERR_MODULE_NOT_FOUND]: Cannot find module
  '…/src/modules/reports/application/use-cases/list-suppliers-without-active-contract.ts'
  imported from '…/tests/modules/reports/application/use-cases/list-suppliers-without-active-contract.test.ts'
  code: 'ERR_MODULE_NOT_FOUND'
```

```
Error [ERR_MODULE_NOT_FOUND]: Cannot find module
  '…/src/modules/reports/application/use-cases/list-suppliers-without-active-contract.ts'
  imported from '…/tests/modules/reports/adapters/http/suppliers-without-active-contract.http.test.ts'
  code: 'ERR_MODULE_NOT_FOUND'
```

### Gate dos testes de integração — skip limpo sem `MYSQL_INTEGRATION`

```
[contracts:active-contractor-read] MYSQL_INTEGRATION não definido — pulando integração.
[financial:suppliers-without-contract] MYSQL_INTEGRATION não definido — pulando integração.
ℹ tests 2
ℹ pass 2
ℹ fail 0
```

### CA4 — o teste de contrato REP-2 (#240) segue VERDE, intocado

```
  ✔ CA1: 200 com lista agregada por fornecedor (23.033ms)
  ✔ CA2: RBAC — sem fiscal-document:read → 403 (0.514583ms)
  ✔ CA3: contrato de saída fechado (4 colunas por item) (0.972666ms)
✔ reports/http — GET /reports/suppliers-without-contract (REP-2 · #240) (64.560417ms)
ℹ tests 3
ℹ pass 3
ℹ fail 0
```

### `format:check` dos arquivos tocados

```
Checking formatting...
All matched files use Prettier code style!
```

---

## Decisões de design que o W1 precisa saber

O W0 teve de **fixar nomes** para escrever o RED. Todos são negociáveis pelo W1 — mas cada renome
implica ajustar o teste correspondente.

### 1. Superfície nova pinada pelos testes

**`contracts`** (fonte do conjunto ativo):

```ts
// src/modules/contracts/application/ports/active-contractor-read.ts
export type ActiveContractorReadError = 'active-contractor-read-unavailable';
export type ActiveContractorReadPort = Readonly<{
  listContractorsWithActiveContract: () => Promise<Result<readonly string[], ActiveContractorReadError>>;
}>;

// src/modules/contracts/public-api/read.ts  (+ reexport no barrel index.ts)
buildContractsActiveContractorReadPort({ connectionString })
  → Promise<Result<ActiveContractorReadPort & { close: () => Promise<void> }, MysqlDriverError>>
```

Adapter Drizzle esperado em `contracts/adapters/persistence/repos/active-contractor-read.drizzle.ts`
(molde: `contract-count-read.drizzle.ts`). **`ContractCountReadPort` não se toca** — seu
`LIVE_STATUSES = ['Pending','Active']` é paridade backfill×worker (000-request §Estado atual).

**`reports`** (anti-join):

```ts
// src/modules/reports/application/ports/active-contractor-read.ts  → mesmo shape do port do contracts
// src/modules/reports/adapters/persistence/active-contractor-read.in-memory.ts
InMemoryActiveContractorRead(seed: readonly string[] = []): ActiveContractorReadPort
// src/modules/reports/adapters/persistence/active-contractor-read.contracts.ts   (ACL — molde: suppliers-without-contract-read.financial.ts)
// src/modules/reports/application/use-cases/list-suppliers-without-active-contract.ts
listSuppliersWithoutActiveContract(deps: Readonly<{
  suppliersRead: SuppliersWithoutContractReadPort;
  activeContractorsRead: ActiveContractorReadPort;
}>) => () => Promise<Result<readonly SupplierWithoutContract[], ListSuppliersWithoutActiveContractError>>
```

`ListSuppliersWithoutActiveContractError = SuppliersWithoutContractReadError | ActiveContractorReadError`.
Factory function `(deps) => (input) => …` conforme `.claude/rules/application.md`; sem `input` aqui.

### 2. **Fail-closed** é requisito, não detalhe (2 testes travam isso)

Se o reader do `contracts` falhar, o use-case **NÃO** pode devolver a lista não-subtraída — isso
republicaria exatamente o bug do #437 (fornecedor com contrato aparecendo). Deve devolver
`err('active-contractor-read-unavailable')`, e a rota deve responder **503**.

→ **Ação do W1 no plugin:** estender o mapa de erros da rota
(`reports/adapters/http/plugin.ts:67-69`) com `'active-contractor-read-unavailable': 503`. É a
**única** mudança esperada no plugin — o corpo 200 e o DTO não mudam (CA4).

### 3. Onde o anti-join **não** pode ir

Nada de `JOIN ctr_contracts × fin_payable_view`. Subtração em memória via `Set`, no `reports`
(ADR-0006 `:150`/`:154`, ADR-0014 `:130`; ADR-0006 `:80` autoriza o mecanismo de read-ports). O
`financial` mantém `contract_ref IS NULL` como filtro de **linha/candidatos** — ele não sabe (nem
pode saber) de `ctr_contracts`.

### 4. Reenquadramento do teste (2) — mudança de contrato semântico deliberada

O arquivo do `financial` **não afirma mais** a semântica do relatório; ele agora afirma a semântica
de **candidatos**. Concretamente:

- O título com `contract_ref` preenchido (antigas linhas ~95-101) **continua** no fixture, mas o
  comentário e a asserção mudaram de sentido: ele prova que aquele **título** fica fora da **soma**
  (filtro de linha) — e o teste explicita que `S1` **segue candidato**, porque a pergunta "S1 tem
  contrato Active?" é do `reports`, não desta projeção.
- Docstring reescrita para dizer o que a projeção **é** (candidatos) e o que **não é** (a resposta
  final), com ponteiro para o teste do anti-join.
- Helper `payable()` ganhou `kind` / `retentionType` / `documentId`; extraído `listRows()`.
- **A parte RED deste arquivo é só o `kind='Parent'`** (2 testes novos). O teste de agregação
  original continua válido e passa como está — não era bug **naquela camada**.

### 5. Import dinâmico no teste (1) — e por quê

O teste (1) importa `buildContractsActiveContractorReadPort` via `await import()` **dentro** do
ramo gated, não por `import` estático no topo. Motivo verificado empiricamente: com import estático
o link ESM ocorre **antes** do gate, e no W0 (símbolo inexistente) o `pnpm test` puro ficava
vermelho por um teste que deveria estar **skipado**:

```
SyntaxError: The requested module '#src/modules/contracts/public-api/index.ts'
does not provide an export named 'buildContractsActiveContractorReadPort'
```

Com o import dinâmico: sem `MYSQL_INTEGRATION` → skip limpo (exit 0); com o gate → RED de verdade.
**Sugestão ao W1:** depois de criar o módulo, converter para `import` estático (consistência com
`contract-count-backfill.integration.test.ts` e falha mais legível). Ambos ficam verdes; o comentário
no arquivo já registra isso.

### 6. Escopo dos asserts do teste (1)

`listContractorsWithActiveContract()` é **global** (lê o DB inteiro), e a suíte `contracts`
compartilha o MySQL. Por isso o teste é dono das próprias precondições (`delete … where contractorId
in REFS`) e **toda asserção é escopada aos seus refs** (`refs.includes(X)` /
`refs.filter(r => r === X).length`), nunca `refs.length`. Fixtures respeitam os CHECKs:
`Pending`/`Cancelled` → `draftFields` (sem `signedAt`/`current*`); `Expired`/`Terminated`/`Cancelled`
→ `endedAt` preenchido (`ctr_contracts_ended_at_consistency_chk`).

---

## Dúvidas / riscos para o W1 e o W3

1. **CA5 é do W3, não deste W0.** Os dois arquivos de integração **não foram executados contra MySQL
   real** — o x99 não estava acessível nesta sessão (instrução explícita do caller). Localmente o
   gate `MYSQL_INTEGRATION=1` faz o teste (1) falhar já no `before` por `Access denied` (há um MySQL
   alheio ocupando `127.0.0.1:3306` nesta máquina), o que **mascara** o RED por API inexistente
   nesse arquivo. O que ficou provado localmente para (1) é o **gate** (skip limpo / RED com env).
   O RED e o GREEN reais dele são do x99.
2. **`typecheck` está vermelho no W0 e isso é esperado** — os testes referenciam módulos que o W1
   ainda vai criar. Quem cobra `tsc --noEmit` é o gate W3.
3. **Ordem do resultado.** O teste (3) usa `assert.deepEqual(refs, [S_NO_CONTRACT])`, ou seja,
   assume que o anti-join **preserva a ordem** dos candidatos vindos do `financial` (um `filter`
   natural). Se o W1 quiser reordenar (ex.: `ORDER BY`), avise — a rota hoje não ordena, e o teste
   REP-2 (#240) também não exige ordenação.
4. **Fora de escopo, já registrado no 000-request** (anti-padrão #15 — não consertar aqui):
   `payee_kind` não projetado em `fin_payable_view` (o relatório rotula como "fornecedor" qualquer
   favorecido — mesma raiz da **#436**); vigência de calendário vs `status='Active'` com sweeper
   atrasado; regra ESLint `no-cross-context-import` do ADR-0006 `:150` ausente.
5. **Nenhum vermelho alheio nesta rodada.** A colisão conhecida da suíte `partners` não apareceu
   (3974 pass / 2 fail, ambos meus). Se ressurgir no W3, é ruído pré-existente — mas, pela política
   de regressão zero, terá de ser endereçado ou escalado, não dispensado.
