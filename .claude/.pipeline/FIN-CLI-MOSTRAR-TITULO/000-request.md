# FIN-CLI-MOSTRAR-TITULO — Comando read-only `mostrar-titulo` + `formatters/payable.ts`

> **Size:** S (no limite alto) · **Tipo:** Use case query + comando read-only + suite de formatters
> **Sucessor de:** [`FIN-CLI-APROVAR-TITULO`](../FIN-CLI-APROVAR-TITULO/) (1º comando real entregue)
> **Bloqueia:** comandos read-only futuros (`listar-titulos`) que vão reusar os formatters
> **Referência canônica:** [`src/modules/contracts/cli/commands/mostrar-contrato.ts`](../../../src/modules/contracts/cli/commands/mostrar-contrato.ts) + [`src/modules/contracts/cli/formatters/{contract,money,status,date}.ts`](../../../src/modules/contracts/cli/formatters/)

---

## 1. Motivação

Após `aprovar-titulo` (write), a P.O. precisa de comando read-only para **inspecionar** o estado atual de um título — confirmar que aprovou o correto, ver histórico de transições, etc. Casa naturalmente com o agregado `Payable` que tem 7 estados, cada um com payload próprio (datas, aprovador, FITID, etc.).

Este ticket também **estreia a suite de formatters do módulo Financial** (`payable.ts`, `status.ts`, `money.ts`, `date.ts`) que serão reusados por comandos read-only futuros (`listar-titulos`, `mostrar-extrato`, etc.).

---

## 2. Decisões arquiteturais

### 2.1. Use case `getPayable` espelha `getContract` do contracts

Mesma estrutura: `Deps = { payableRepo }`, `Command = { payableId }`, `Error = PayableIdError | PayableRepositoryError | 'payable-not-found'`, `Output = Payable`. **Sem** Clock dep (read-only não precisa de timestamp).

### 2.2. Novo erro `payable-not-found` (não reusa `approve-payable-not-found`)

Pattern do contracts: cada use case tem seu próprio "not found" prefixado (`get-contract: 'contract-not-found'`, `homologate-amendment: 'amendment-not-found'`). O `approve-payable-not-found` é específico do use case de write. Para `getPayable` introduzimos `'payable-not-found'` genérico — quando 3º use case query existir (`listPayables`?), todos compartilham.

### 2.3. Formatters locais (não extrair para shared/cli ainda)

`money.ts` e `date.ts` são **cópia funcional** do contracts (~25L combinados). Decisão: YAGNI estrito — copiar local. Quando 3º módulo (notifications/etc.) precisar dos mesmos formatters, abre-se `SHARED-CLI-FORMATTERS-EXTRACTION`.

### 2.4. `formatters/payable.ts` com narrow por status

Pattern do `formatContract`: lines básicas (id, status, due date, valor, beneficiário) + **narrow por status** para exibir campos específicos (approvedAt para Approved+, transmittedAt para Transmitted+, paidAt para Paid, fitid+bankPaymentDate para PaidFromBank, rejectionReason para Rejected, settledAt+settledBy para Settled).

TypeScript discriminator (`status`) força exaustividade — se omitirmos um caso, refactor do union quebra build.

### 2.5. Beneficiário simplificado (não 4 linhas separadas)

Em vez de mostrar bank/agency/account/holder em 4 linhas, formato compacto:
```
  Beneficiário:    Fornecedor X Ltda (CPF 111.444.777-35)
  Conta:           Banco 341 ag 1234-5 cc 12345-6
```
2 linhas. Reduz ruído visual sem perder informação.

### 2.6. Sem flag `--summary`/`--full` ainda

Output único, "detalhado". Se P.O. pedir formato resumido, vira ticket separado com flag `--format=summary|full`.

---

## 3. Critérios de Aceitação (CAs)

### 3.1. Use case (`application/use-cases/get-payable.ts`)

- **CA-1:** Factory function `getPayable(deps: { payableRepo: PayableRepository }) => (cmd: GetPayableCommand) => Promise<Result<Payable, GetPayableError>>`.
- **CA-2:** `GetPayableCommand = Readonly<{ payableId: string }>`.
- **CA-3:** `GetPayableError = PayableIdError | PayableRepositoryError | 'payable-not-found'`.
- **CA-4:** Sequência: validar `payableId` via `PayableId.rehydrate` → `repo.findById` → guard `null → err('payable-not-found')` → `ok(payable)`.

### 3.2. Formatters (`cli/formatters/`)

- **CA-5:** `status.ts` — `STATUS_LABELS: Readonly<Record<PayableStatus, string>>` com 7 entries em PT-BR:
  - `Open` → "Aberto", `Approved` → "Aprovado", `Transmitted` → "Transmitido", `Rejected` → "Rejeitado", `Overdue` → "Atrasado", `Paid` → "Pago", `Settled` → "Liquidado".
- **CA-6:** `money.ts` — cópia funcional do contracts (`Intl.NumberFormat 'pt-BR'` + replace NBSP).
- **CA-7:** `date.ts` — cópia funcional do contracts (`DD/MM/YYYY` UTC).
- **CA-8:** `payable.ts` — `formatPayable(p: Payable): string` com lines básicas (header com ID curto + status, due date, valor, beneficiário compacto) + narrow por status para campos específicos.
- **CA-9:** Narrow por status cobre todos os 7 estados (TS exaustivo). PaidFromBank vs PaidFromManual via discriminator `paidVia`.
- **CA-10:** `formatters/index.ts` re-exporta `formatPayable`, `formatStatus` (Payable), `formatMoney`, `formatDate` (além do `formatErrorCode` já presente).

### 3.3. Comando (`cli/commands/mostrar-titulo.ts`)

- **CA-11:** Exports `descricao` / `help` / `run`.
- **CA-12:** `descricao` = "Mostra detalhes de um Título Financeiro pelo ID."
- **CA-13:** `help` lista flag obrigatória `--payable-id <uuid>`.
- **CA-14:** ALLOWED = `['payable-id', 'help', 'h']`. Sequência: `parseFlags → validateAllowedFlags → REQUIRED check → getPayable → formatPayable → stdout exit 0` ou erro → stderr exit 1.
- **CA-15:** Comando **NÃO** chama `ctx.persist()` (read-only — sem mutação).
- **CA-16:** `ctx.payableRepo` é a única dependência usada (sem `clock`).

### 3.4. Registry + formatters/error.ts

- **CA-17:** `registry.ts` aponta `'mostrar-titulo'` para o module export.
- **CA-18:** `formatters/error.ts` ganha entradas:
  - `payable-id-invalid` — "ID do título inválido (formato UUID v4 esperado)."
  - `payable-not-found` — "Título não encontrado."

### 3.5. Testes E2E (`tests/modules/financial/cli/commands/mostrar-titulo.test.ts`)

- **CA-19:** Happy path Open: seed `OpenPayable` via state file → `mostrar-titulo --state X --payable-id <uuid>` → exit 0, stdout cita ID + "Aberto" + valor formatado BRL + data BR.
- **CA-20:** Happy path Approved: seed `ApprovedPayable` → stdout cita "Aprovado" + linha "Aprovado em" + "Aprovado por".
- **CA-21:** Happy path Paid Bank: seed `PaidFromBankPayable` (chain via `Payable.open → approve → transmit → processBankOutflow`) → stdout cita "Pago" + "FITID" + "Data bancária".
- **CA-22:** --help: exit 0 stdout cita `--payable-id`.
- **CA-23:** Flag obrigatória ausente → exit 64 stderr "Flag obrigatória ausente: --payable-id".
- **CA-24:** payable-id inválido → exit 1 stderr "ID do título inválido".
- **CA-25:** Not found → exit 1 stderr "Título não encontrado".

### 3.6. Quality Gate (W3)

- **CA-26:** `pnpm run typecheck` exit 0.
- **CA-27:** `pnpm run format:check` exit 0.
- **CA-28:** `pnpm run lint` exit 0 (zero warnings).
- **CA-29:** `pnpm test` exit 0 com delta **+7 a +8** testes novos (7 do mostrar-titulo + 0 use case unit tests — testado via E2E), zero regressão.

---

## 4. Estrutura de arquivos esperada

```
src/modules/financial/
├── application/use-cases/
│   └── get-payable.ts                              ← NOVO (~28L)
└── cli/
    ├── commands/
    │   └── mostrar-titulo.ts                       ← NOVO (~50L)
    ├── formatters/
    │   ├── error.ts                                ← MODIFICADO (+2 entradas)
    │   ├── index.ts                                ← MODIFICADO (+4 re-exports)
    │   ├── payable.ts                              ← NOVO (~60L)
    │   ├── status.ts                               ← NOVO (~13L, 7 labels)
    │   ├── money.ts                                ← NOVO (~19L, cópia funcional contracts)
    │   └── date.ts                                 ← NOVO (~7L, cópia funcional contracts)
    └── registry.ts                                 ← MODIFICADO (+1 import +1 entry)

tests/modules/financial/cli/commands/
└── mostrar-titulo.test.ts                          ← NOVO (~200L, 7 it's E2E)
```

**Total estimado:** ~177L src novos + ~25L src modificados + ~200L tests = ~400L. **Envelope S (no limite alto).**

---

## 5. Fora do escopo (próximos tickets)

| Item | Ticket sugerido |
| :--- | :--- |
| Comando `listar-titulos` com filtros (status, beneficiário) | `FIN-CLI-LISTAR-TITULOS` |
| Use cases query adicionais (`findByFitid`, etc.) | `FIN-USECASE-FIND-BY-FITID` |
| Flag `--format=summary\|full` no `mostrar-titulo` | Ticket separado se P.O. pedir |
| Extração de `money.ts`/`date.ts` para `shared/cli/formatters/` | `SHARED-CLI-FORMATTERS-EXTRACTION` (quando 3º módulo precisar) |
| Formatador de `BeneficiaryBankData` específico | Embutido em `formatters/payable.ts` neste ticket |

---

## 6. Regras invariantes aplicáveis

- `.claude/rules/application.md` — use case é factory function; ports são `type`; sequência validate → fetch → guard → ok.
- `.claude/rules/adapters.md` — CLI converte Result na borda; sem throw vazado.
- `.claude/rules/testing.md` — E2E via subprocess.
- ADR-0006 — kernel compartilhado (sem Clock neste ticket, mas formatters podem ser candidatos a shared/cli no futuro).

---

## 7. Riscos / pontos de atenção (para W2)

### Risco 1 — Narrow exaustivo por status (CA-9)

`formatPayable` precisa narrow seguro pelos 7 estados. Se um caso for esquecido, TS pode passar (objeto não tem o campo) mas runtime gera output incompleto. **Mitigação:** usar `switch (p.status)` com exhaustive check explícito (`const _: never = p; return _`) — força build a quebrar se novo status entrar.

Alternativa mais simples: 7 `if (p.status === '...')` separados, cada um acrescentando lines extras. Decisão W1: começar com `if`s separados (mais legível para output sequencial), exhaustive check se ESLint reclamar.

### Risco 2 — `formatBeneficiary` inline ou função separada?

`BeneficiaryBankData` tem 5 campos (bankCode, agency, account, holderTaxId, holderName). Pode ser:
- (a) inline no `formatPayable` (2 linhas embutidas)
- (b) helper local `formatBeneficiary(b): string[]` que retorna 2 linhas

**Decisão W1:** (b) — helper local module-private dentro de `payable.ts`. Facilita reuso futuro em `listar-titulos`.

### Risco 3 — `formatTaxId` para CPF/CNPJ formatado (111.444.777-35)

TaxId é union CPF | CNPJ alfanumérico. Formatador deve detectar e mascarar adequadamente. Para CPF: `XXX.XXX.XXX-XX`. Para CNPJ alfanumérico (novo módulo 11): `XX.XXX.XXX/XXXX-XX`.

**Decisão W1:** começar com format simples (apenas adicionar separadores se length = 11 ou 14). Refactor se P.O. reclamar de formato.

### Risco 4 — `money.ts` / `date.ts` quase idênticos ao contracts

Duplicação reconhecida. Comentário "CANDIDATO A EXTRAÇÃO" análogo ao `_flag-errors.ts`. Se 3º módulo precisar, ticket transversal `SHARED-CLI-FORMATTERS-EXTRACTION` extrai.

### Risco 5 — `payable.ts` pode crescer além de 60L

7 estados × ~3 linhas cada = ~21L de narrow, + 10L de header base + 10L de helper beneficiário = ~40L. Estimativa conservadora 60L. Se passar de 100L, dividir em `formatPayableHeader` + `formatPayableStateDetails` no W1.

### Risco 6 — Output do happy path Paid Bank precisa exibir FITID e bankPaymentDate

CA-21 valida. `PaidFromBankPayable` tem `fitid: FITID` + `bankPaymentDate: Date`. Format: 2 linhas adicionais. PaidFromManual: linhas diferentes (sem FITID, com `paymentRegisteredBy`).

Discriminator: `paidVia: 'Manual' | 'Bank'`.
