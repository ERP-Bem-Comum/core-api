# Code Review — Ticket REPORTS-SUPPLIERS-NO-ACTIVE-CONTRACT (#437) — Round 1

**Veredito:** APPROVED

**Reviewer:** `code-reviewer` (W2, read-only) + `security-backend-expert` (auditoria paralela)
**Data:** 2026-07-14
**Branch:** `feat/437-suppliers-without-contract` (working tree, sem commits vs `origin/dev`)

## Escopo revisado

Diff integral: 8 arquivos modificados + 9 untracked.

**Produção (criados):**

- `src/modules/contracts/application/ports/active-contractor-read.ts`
- `src/modules/contracts/adapters/persistence/repos/active-contractor-read.drizzle.ts`
- `src/modules/reports/application/ports/active-contractor-read.ts`
- `src/modules/reports/adapters/persistence/active-contractor-read.in-memory.ts`
- `src/modules/reports/adapters/persistence/active-contractor-read.contracts.ts`
- `src/modules/reports/application/use-cases/list-suppliers-without-active-contract.ts`

**Produção (alterados):** `contracts/public-api/read.ts`, `contracts/public-api/index.ts`,
`financial/public-api/suppliers-without-contract-projection.ts`, `reports/adapters/http/composition.ts`,
`reports/adapters/http/plugin.ts`, `src/server.ts`, `scripts/ci/test-integration.ts`

**Testes:** os 3 novos + o de integração do `financial` alterado.

**Verificação independente:** `pnpm run typecheck` e `pnpm run lint` — ambos verdes nesta worktree.

---

## Issues encontradas

### 🔴 Blocker

**Nenhuma.**

### 🟠 Major

**Nenhuma.**

### 🔵 Minor (não bloqueiam — notas)

#### Minor 1 — `composition.ts:151-156`: `shutdown()` sequencial vaza pool se um `close()` rejeitar

Os 4 `close()` são `await` sequenciais. Se `teamReader.close()` rejeitar, os 3 seguintes — incluindo
`contractorsReader` — nunca fecham. **Padrão pré-existente** na `dev` (o ticket apenas acrescentou a
4ª linha). Não é regressão do #437.
**Sugestão (follow-up):** `await Promise.allSettled([...])`.

#### Minor 2 — `composition.ts:92-135`: 4 pools boot-scoped sem dedup por URL idêntica

`openSuppliersWithoutContractReader` e `openPaymentPositionReader` já abrem 2 pools para o **mesmo**
`financialUrl`; o #437 acrescenta um 4º para `contractsUrl` — que costuma apontar para o mesmo
database `core`. É o cenário da lição #407 (_URLs idênticas → 1 pool/processo_) e do Incident-0001
(RDS 56/60). **O requisito do ticket está cumprido** — CA5 pede "1 pool por reader, fechado no
shutdown". O `PoolRegistry` (`mysql-driver.ts:124-135`) hoje é escopado ao worker-runner, não à
borda HTTP. Lacuna arquitetural pré-existente (afeta REP-1/2/4 já mergeados).
**Sugestão:** issue para estender o `PoolRegistry` à composition do HTTP.

#### Minor 3 — Citação de ticket em comentário de código

O critério "nunca citar ticket no código" **não é regra documentada** deste repo — não consta em
`AGENTS.md` nem em `.claude/rules/*.md` (grep executado). O precedente na `origin/dev` é o inverso e
é pervasivo (`reports/adapters/http/composition.ts` 5 ocorrências, `plugin.ts` 3, etc. — mergeados
no mesmo épico dias atrás, PR #435). O W1 seguiu a convenção vigente. Quanto ao **volume**: os
comentários do diff são majoritariamente "porquê não-óbvio" (fundamento de ADR, razão do
fail-closed, razão de **não** unificar com `ContractCountReadPort`) — categoria legítima.
**Sugestão:** se a norma desejada é "zero ticket no código", é decisão repo-wide (regra em
`.claude/rules/` + limpeza), não fix deste ticket.

---

## Auditoria dos pontos pedidos

### 1. Aderência a ADR (ADR-0006 `:80`/`:150`/`:154`; ADR-0014 `:130`) — ✅ CONFORME

Citações verificadas literalmente:

- ADR-0006 `:150` — _"Sem cross-import entre BCs | ESLint rule + estrutura de pastas"_
- ADR-0006 `:154` — _"Schema namespaceado | Prefixo de tabela por BC | Joins acidentais cross-BC"_
- ADR-0006 `:80` — _"Ports/adapters explícitos | Cada BC expõe interface de leitura/comando"_
- ADR-0014 `:130` — _"Joins cross-database em queries de aplicação | Acopla serviços invisivelmente"_

Provas mecânicas:

- `grep -rn "schemas/mysql|finPayableView|ctrContracts|drizzle-orm" src/modules/reports/` → **nenhum hit**.
- `grep -rn "modules/(contracts|financial|partners)/(domain|application|adapters)" src/modules/reports/` → **nenhum hit**. Só `public-api` (anti-padrão #13 respeitado).
- Anti-join é `Set` + `filter` em memória (`list-suppliers-without-active-contract.ts:45-46`).
- O adapter Drizzle novo vive **dentro** do `contracts`, lendo só `ctr_contracts`. Travessia por `public-api`.

Julgado pelo ADR lido literalmente — não pelo precedente do código.

### 2. Fail-closed — ✅ SÓLIDO, com defesa em profundidade

- `:38` — falha do `financial` → propaga `err`.
- `:43` — falha do `contracts` → `return withActiveContract` **antes** de qualquer `ok(...)`. Não há ramo que devolva `candidates.value` sem subtrair.
- `plugin.ts:68-72` — `'active-contractor-read-unavailable': 503`.
- **Defesa em profundidade** (`src/shared/http/reply.ts`): `const status = opts.errors?.[errorCode] ?? 500`. Mesmo sem o mapeamento, a rota devolveria 500 — jamais 200 com lista não-subtraída.
- Travado por 2 testes (use-case + borda).

### 3. Pool boot-scoped — ✅ CORRETO

- `buildContractsActiveContractorReadPort` (`read.ts:105-124`) abre **1** pool via `openMysql({ applyMigrations: false })`.
- `composition.ts:124-135` — aberto **uma vez no boot**. O ACL recebe a **função já ligada**, nunca uma connection-string — impossível abrir pool por request por construção.
- `composition.ts:155` — `close()` no `shutdown()`.
- **Cascata de cleanup:** se o 4º reader falha ao abrir, fecha os 3 anteriores antes do `throw`.
- Coberto por teste de integração: após `close()`, a 2ª chamada devolve `Result.err`.

### 4. Semântica — ✅ CORRETA (premissas verificadas na fonte, não presumidas)

- `status = 'Active'` — confirmado no CHECK `mysql.ts:112-113`: `status IN ('Pending','Active','Expired','Terminated','Cancelled')`.
- `contractor_type = 'supplier'` — confirmado no CHECK `mysql.ts:104-105`.
- `SELECT DISTINCT` usa o índice existente `ctr_contracts_contractor_idx` (`mysql.ts:154`). Sem migration nova.
- **`kind='Parent'`** (`suppliers-without-contract-projection.ts:70`): só `kind` entrou no `and(...)`. `status` de título **não** foi tocado — regra do REP-2 intacta, travada por asserção literal (`'soma inclui Cancelled; título com contract_ref fora'`).
- **Premissa do CA3 validada na fonte:** `financial/domain/document/document.ts:79` — _"Gera os títulos em `Open`: 1 pai (valor líquido) + 1 filho por retenção"_ — e `:94` (`value: params.netValue`). Confirma que o Parent carrega o **líquido**. A afirmação do 000-request não era suposição.

### 5. `ContractCountReadPort` intacto — ✅ PROVADO MECANICAMENTE

`git status --porcelain -- '*contract-count-read*'` → **vazio**. `LIVE_STATUSES = ['Pending','Active']`
preservado — paridade backfill×worker mantida. A distinção está documentada no próprio código
(`ports/active-contractor-read.ts:11-12`: _"São perguntas diferentes; não unificar"_).

### 6. CA4 — contrato HTTP inalterado — ✅ PROVADO MECANICAMENTE

- `git status --porcelain -- tests/.../suppliers-without-contract.http.test.ts` (#240) → **vazio**.
- `typecheck` verde confirma que o alargamento de `ReportsHttpDeps.listSuppliersWithoutContract` para a união é retrocompatível.
- `plugin.ts`: única mudança é o mapa de erros. DTO e corpo 200 inalterados.

### 7. Qualidade — ✅ CONFORME

Sintaxe TS (extensão `.ts`, `import type`, `#src/*`), zero `throw`/`class`/`any`, use-case factory
`(deps) => () => Promise<Result>`, ports `type Readonly<{...}>`, erro EN kebab-case, `Result` na
borda do adapter, idioma código EN / docs PT-BR, fakes injetáveis (nunca mocks), teste de integração
dono das próprias precondições e escopado aos próprios refs. YAGNI: nenhum símbolo além do exigido
pelos testes.

---

## 8. Julgamento do desvio deliberado do W1 — **APROVADO**

**O desvio:** não foi criado adapter in-memory para o port novo do `contracts`
(`ActiveContractorReadPort`), alegando zero consumidores + YAGNI.

**A norma:** `.claude/rules/adapters.md` — _"Cada port tem ao menos: adapter `InMemory` (testes) +
adapter real"_; `ports-and-adapters/SKILL.md`, checklist D. Hierarquia: rank 3 (regras) e rank 5
(skill) — **não é ADR**, portanto admite julgamento de propósito.

**Fundamentos da aprovação:**

1. **A _ratio legis_ está integralmente servida.** A regra existe para testar sem infra. O `reports`
   — único consumidor concebível — tem seu in-memory, usado por todo teste unit e pela borda
   `driver: 'memory'`. Nenhum cenário de teste seria destravado por um in-memory no `contracts`.
2. **O contrafactual é código morto.** Teria zero importadores em `src/` e `tests/`. Código morto
   não é conformidade — é passivo: não exercitado, sujeito a divergir do real sem ninguém notar.
3. **O precedente confirma a leitura por propósito.** `ContractCountReadPort` **tem** in-memory
   porque o job de backfill do `partners` o consome — consumidor real. Aqui não há análogo.
4. **O port real não fica descoberto.** É exercitado por teste de integração dedicado (7 casos,
   incluindo pool boot-scoped), registrado na suíte `contracts` do runner — cuidado explícito contra
   o precedente de teste órfão da #316.

**Condição de revisitação:** se surgir um consumidor in-process do port do `contracts`, o in-memory
deve ser criado **junto com esse consumidor**. Custo de adiar = zero.

---

## O que está bom

- **Fundamentação de ADR exemplar** — cada decisão cita ADR + linha, e as citações conferem com o
  texto literal (anti-padrão #12 respeitado).
- **Fail-closed como requisito de primeira classe**, travado por 2 testes, com o _porquê_
  documentado no ponto da decisão e ainda protegido pelo default 500 do `sendResult`.
- **CA4 provado por construção**: a semântica nova foi para arquivo HTTP separado, deixando o teste
  do #240 intocado como oráculo mecânico do contrato.
- **A distinção `ActiveContractorReadPort` × `ContractCountReadPort` documentada no código** —
  impede que um futuro "refactor DRY" funda os dois e quebre a paridade backfill×worker.
- **Reenquadramento honesto da projeção do `financial`** — a docstring diz o que ela **é**
  (candidatos) e o que **não é** (a resposta). O teste que codificava o bug foi reinterpretado com
  intenção explícita, não apagado.
- **Achados fora de escopo registrados, não consertados** (`payee_kind`/#436, vigência de
  calendário, regra ESLint ausente) — anti-padrão #15 respeitado.

---

## Parecer de segurança (`security-backend-expert`, paralelo) — APPROVED

Sem Blocker/Major. Pool boot-scoped correto via `buildPoolOptions` compartilhado (garante
`maxIdle < connectionLimit` por construção — a lição do Incident-0001); fail-closed OK; RBAC
`fiscal-document:read` intacto (403/200); queries 100% parametrizadas via query builder (sem
injeção); `reply.ts:38-44` não vaza `errorCode` interno em 5xx; logs escrevem `String(cause)` do
driver, não connection string. **Minor:** `listContractorsWithActiveContract()` sem paginação
(CWE-770) — consumo 100% interno (vira `Set`, nunca serializado para HTTP), mesmo padrão dos 3
readers pré-existentes; não é regressão deste diff.

---

## Próximo passo

**APPROVED** → avança para **W3** (`ts-quality-checker`).

Pendências que o W3 herda (não são bloqueios do W2):

1. **CA5 — validação em MySQL real (x99).** Os 2 arquivos de integração não rodaram contra MySQL
   real. Confirmar: anti-join, `Pending`/`Expired`/`Terminated`/`Cancelled` fora,
   `contractor_type≠supplier` fora, `DISTINCT`, `kind='Parent'`, `Cancelled` de **título** ainda
   somado, e `close()` encerra o pool. **É o único gate real da premissa de que
   `ctr_contracts.contractor_id` e `fin_payable_view.supplier_ref` compartilham espaço de
   identidade** — se divergirem, a subtração fica silenciosamente vazia e o defeito da #437
   persiste sem erro.
2. **Gate W3 completo:** `typecheck` + `format:check` + `lint` + `test`.
3. **Issues de follow-up sugeridas** (Minor 1 e Minor 2): `Promise.allSettled` no `shutdown()`;
   `PoolRegistry` na composition HTTP (lição #407). Ambas pré-existentes e fora do escopo do #437.
