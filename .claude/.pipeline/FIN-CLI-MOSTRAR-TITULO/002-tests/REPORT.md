# W0 — Testes RED (FIN-CLI-MOSTRAR-TITULO)

> **Wave:** W0 · **Outcome:** RED · **Agent:** `tdd-strategist` (skill)
> **Predecessor:** [`../000-request.md`](../000-request.md) — 29 CAs + decisões §2 + riscos §7
> **Artefatos:** 1 arquivo novo

| # | Arquivo | Linhas | Status |
| :--- | :--- | ---: | :--- |
| 1 | `tests/modules/financial/cli/commands/mostrar-titulo.test.ts` | 230 | NOVO |

---

## 1. Estratégia de teste

### 1.1. E2E puro via subprocess + state file tmp

Cada `it` chama `runFinancialCli(args)` — spawn `node --experimental-strip-types src/modules/financial/cli/main.ts ...`. Para CA-19/20/21 (happy paths), `seedState(statePath, payable)` cria handle in-memory, salva 1 Payable, serializa via `saveState`. CA-22/23/24/25 usam `--no-state` (sem seed necessário).

### 1.2. Fixtures reusadas + 1 nova (`buildPaidFromBankPayable`)

`buildOpenPayable`, `buildApprovedPayable`, `buildBeneficiary`, `buildMoney`, `seedState`, `makeTmpDir` — copiados literalmente de `aprovar-titulo.test.ts`. **NOVO** helper `buildPaidFromBankPayable(fitidStr)` faz chain real:
1. `buildOpenPayable()` → Open
2. `Payable.approve(open, approver, 2026-05-25)` → Approved
3. `Payable.transmit(approved, RemittanceId.generate(), 2026-05-26)` → Transmitted
4. `Payable.processBankOutflow(transmitted, fitid, 2026-05-27 bankPaymentDate, 2026-05-27T12:00 occurredAt)` → PaidFromBank

Datas em ordem cronológica estrita validam invariantes temporais do agregado.

### 1.3. Asserts específicos por estado

| CA | Status seedado | Asserts próprios |
| :--- | :--- | :--- |
| CA-19 | Open | "Aberto", `15/06/2026` (dueDate BR), `R$ 150,50` (BRL), "Fornecedor X Ltda" |
| CA-20 | Approved | "Aprovado", `Aprovado em: 25/05/2026`, `Aprovado por: <APPROVER_UUID>` |
| CA-21 | PaidFromBank | "Pago", `FITID: FITID-MOSTRAR-123`, `Data bancária: 27/05/2026` |

Os asserts validam **diretamente o output formatado** — força W1 a implementar `formatPayable` + `formatStatus` (PT-BR) + `formatMoney` (BRL Intl) + `formatDate` (DD/MM/YYYY UTC) corretamente.

### 1.4. Tratamento de erros sem state (--no-state)

CA-22/23/24/25 não precisam de seed — usam `--no-state` para evitar I/O desnecessário e isolamento total entre runs.

---

## 2. Cobertura de CAs

| CA | Cenário | `it` |
| :--- | :--- | :--- |
| CA-19 | Happy Open | "stdout cita ID, Aberto, data BR, BRL, beneficiário" |
| CA-20 | Happy Approved | "stdout cita Aprovado + Aprovado em + Aprovado por" |
| CA-21 | Happy PaidFromBank | "stdout cita Pago + FITID + Data bancária" |
| CA-22 | --help | "--help imprime ajuda em stdout exit 0" |
| CA-23 | Flag ausente | "sem --payable-id → exit 64 stderr 'Flag obrigatória ausente: --payable-id'" |
| CA-24 | Invalid id | "--payable-id não-UUID → exit 1 'ID do título inválido'" |
| CA-25 | Not found | "--payable-id válido sem persistência → exit 1 'Título não encontrado'" |

CAs não cobertos por runtime W0:

| CA | Onde valida |
| :--- | :--- |
| CA-1..4 (use case `getPayable`) | type-level via typecheck; review W2 |
| CA-5..10 (formatters payable/status/money/date + index) | runtime indireto via CA-19..21 (asserts validam output); review W2 |
| CA-11..16 (comando estrutura) | runtime CA-22..25 + review W2 |
| CA-17..18 (registry + error.ts) | runtime indireto (registry vazio dispararia "Subcomando desconhecido" sempre) |
| CA-26..29 (typecheck/format/lint/test) | W3 |

---

## 3. Fixtures (inline, ~95 linhas)

- `D(iso)` — `new Date(iso)` helper
- `APPROVER_UUID` — constante (mesmo UUID v4 dos tests anteriores)
- `buildBeneficiary()` — `BeneficiaryBankData.fromRaw` com CPF DV-válido `11144477735` ("Fornecedor X Ltda" como `holderName`)
- `buildMoney(cents = 15050)` — `Money.fromCents`
- `buildOpenPayable()` — `Payable.open` real (dueDate 2026-06-15, openedAt 2026-05-20)
- `buildApprovedPayable()` — chain Open → `Payable.approve(... 2026-05-25T10:00Z)`
- **NOVO `buildPaidFromBankPayable(fitidStr)`** — chain Open → Approved → Transmitted → PaidFromBank com 5 datas cronológicas (`openedAt 2026-05-20 < approvedAt 2026-05-25 < transmittedAt 2026-05-26 < bankPaymentDate 2026-05-27T00:00 < occurredAt 2026-05-27T12:00`)
- `makeTmpDir()` — `mkdtempSync(join(tmpdir(), 'fin-cli-mostrar-test-'))`
- `seedState(statePath, payable)` — handle InMemory + `void repo.save(payable, [])` + `saveState`

---

## 4. Saída RED

### 4.1. TypeScript (`pnpm run typecheck`)

```
$ pnpm run typecheck
(exit 0, zero output)
```

Zero erros TS — todos os tipos importados já existem (helpers do scaffold + agregado Payable + repos/state + `FITID`/`RemittanceId` do domain). O test é **type-safe contra a API esperada** porque depende apenas de tipos já implementados — os 4 formatters e o use case `getPayable` ainda não existem mas o test não os importa diretamente (valida output via regex no stdout).

### 4.2. Runtime (`pnpm test`)

| Métrica | Baseline (W3 FIN-CLI-APROVAR-TITULO) | W0 deste ticket | Delta |
| :--- | ---: | ---: | ---: |
| tests | 1117 | 1124 | **+7** |
| pass | 1101 | 1101 | 0 |
| fail | 0 | **7** | **+7** |
| skipped | 16 | 16 | 0 |
| suites | 367 | 374 | +7 |

**7 falhas, todas pelo MESMO motivo:** `mostrar-titulo` não está no REGISTRY → pipeline cai em "Subcomando desconhecido: mostrar-titulo" exit 64.

Cada it falha de forma distinta no assert do exit code esperado:
| `it` | Esperado | Recebido (RED) |
| :--- | :--- | :--- |
| CA-19 (Open) | exit 0 stdout "Aberto" | exit 64 stderr "Subcomando desconhecido" |
| CA-20 (Approved) | exit 0 stdout "Aprovado em: 25/05/2026" | exit 64 stderr "Subcomando desconhecido" |
| CA-21 (PaidFromBank) | exit 0 stdout "FITID: ..." | exit 64 stderr "Subcomando desconhecido" |
| CA-22 (--help) | exit 0 stdout "Uso: mostrar-titulo" | exit 64 (--help do subcomando inacessível) |
| CA-23 (flag ausente) | exit 64 stderr "Flag obrigatória ausente: --payable-id" | exit 64 stderr "Subcomando desconhecido" — regex não casa |
| CA-24 (invalid id) | exit 1 stderr "ID do título inválido" | exit 64 stderr "Subcomando desconhecido" |
| CA-25 (not found) | exit 1 stderr "Título não encontrado" | exit 64 stderr "Subcomando desconhecido" |

**Zero regressão** nos 1101 testes pré-existentes (matemática confirma).

---

## 5. Diagnóstico RED — checklist

| Aspecto | OK? | Nota |
| :--- | :--- | :--- |
| Causa primária por inexistência (não por assert errado) | ✅ | `mostrar-titulo` ausente do REGISTRY |
| Type-safe — typecheck passa em RED | ✅ | imports só de módulos já existentes |
| 3 happy paths cobrem narrow por status (Open + Approved + PaidFromBank) | ✅ | força W1 a implementar narrow exaustivo no `formatPayable` |
| Fixtures via agregado real (sem objeto literal) | ✅ | chain `Payable.open → approve → transmit → processBankOutflow` |
| Datas cronológicas estritas | ✅ | 5 datas ordenadas validam invariantes temporais do agregado |
| State file tmp isolado | ✅ | mkdtempSync + finally rmSync |
| Sem `class`, `throw` em prod, `as any` | ✅ | (throws em fixture helpers OK) |
| Imports `#src/*` subpath | ✅ | 100% nos imports de produção |
| `import type` separado de runtime | ✅ | |
| `void handle.repo.save(...)` sem `eslint-disable` órfão | ✅ | lição registrada — `void` já desativa `no-floating-promises` |
| Reuso de helper `runFinancialCli` | ✅ | sem re-spawn manual |

---

## 6. Lista pronta para W1

Implementer deve criar **6 arquivos novos + 3 modificados**:

### 6.1. Ordem sugerida (dependências)

1. **`application/use-cases/get-payable.ts`** — sem dependências externas; espelha `getContract` do contracts.
2. **`cli/formatters/money.ts`** — cópia funcional de `contracts/cli/formatters/money.ts`.
3. **`cli/formatters/date.ts`** — cópia funcional de `contracts/cli/formatters/date.ts`.
4. **`cli/formatters/status.ts`** — `STATUS_LABELS` PT-BR para 7 estados PayableStatus.
5. **`cli/formatters/payable.ts`** — `formatPayable(p): string` com narrow por status + helper `formatBeneficiary` interno.
6. **`cli/formatters/index.ts`** — modificar: `export * from './error.ts'` + 4 novos re-exports.
7. **`cli/formatters/error.ts`** — modificar: +2 entradas (`payable-id-invalid`, `payable-not-found`).
8. **`cli/commands/mostrar-titulo.ts`** — comando consumindo `getPayable` + `formatPayable`.
9. **`cli/registry.ts`** — modificar: +1 import + entry `'mostrar-titulo'`.

### 6.2. `payable.ts` — narrow por status (esqueleto)

```ts
import type { Payable } from '#src/modules/financial/domain/payable/types.ts';
import { formatStatus } from './status.ts';
import { formatMoney } from './money.ts';
import { formatDate } from './date.ts';
import type { BeneficiaryBankData } from '#src/modules/financial/domain/shared/beneficiary-bank-data.ts';

const formatBeneficiary = (b: BeneficiaryBankData): readonly string[] => {
  // Detectar CPF (11 dígitos) vs CNPJ (14) e formatar máscara.
  // Linha 1: `Beneficiário: <holderName> (CPF XXX.XXX.XXX-XX)` ou `(CNPJ XX.XXX.XXX/XXXX-XX)`.
  // Linha 2: `Conta:        Banco <bankCode> ag <agency> cc <account>`.
  return [/* ... */];
};

export const formatPayable = (p: Payable): string => {
  const lines: string[] = [];
  lines.push(`Título Financeiro`);
  lines.push(`  ID:           ${p.id}`);
  lines.push(`  Status:       ${formatStatus(p.status)}`);
  lines.push(`  Vencimento:   ${formatDate(p.dueDate)}`);
  lines.push(`  Valor:        ${formatMoney(p.value)}`);
  lines.push(...formatBeneficiary(p.beneficiary));

  // Narrow por status — TS força narrow via discriminator.
  if (p.status === 'Approved' || p.status === 'Transmitted' ||
      p.status === 'Rejected' || p.status === 'Overdue' ||
      p.status === 'Paid' || p.status === 'Settled') {
    lines.push(`  Aprovado em:  ${formatDate(p.approvedAt)}`);
    lines.push(`  Aprovado por: ${p.approvedBy}`);
  }
  if (p.status === 'Transmitted' || p.status === 'Rejected' ||
      p.status === 'Overdue' ||
      ((p.status === 'Paid' || p.status === 'Settled') && p.paidVia === 'Bank')) {
    lines.push(`  Transmitido em: ${formatDate(p.transmittedAt)}`);
  }
  if (p.status === 'Paid' || p.status === 'Settled') {
    lines.push(`  Pago em:      ${formatDate(p.paidAt)}`);
    if (p.paidVia === 'Bank') {
      lines.push(`  FITID:        ${p.fitid}`);
      lines.push(`  Data bancária: ${formatDate(p.bankPaymentDate)}`);
    } else {
      lines.push(`  Registrado por: ${p.paymentRegisteredBy}`);
    }
  }
  if (p.status === 'Rejected') {
    lines.push(`  Rejeitado em:  ${formatDate(p.rejectedAt)}`);
    lines.push(`  Motivo:        ${p.rejectionReason}`);
  }
  if (p.status === 'Overdue') {
    lines.push(`  Atrasado desde: ${formatDate(p.markedOverdueAt)}`);
  }
  if (p.status === 'Settled') {
    lines.push(`  Liquidado em:  ${formatDate(p.settledAt)}`);
    lines.push(`  Liquidado por: ${p.settledBy}`);
  }

  return lines.join('\n');
};
```

### 6.3. Métricas esperadas após W1

| Métrica | W0 RED | W1 GREEN esperado |
| :--- | ---: | ---: |
| tests | 1124 | 1124 |
| pass | 1101 | **1108** (+7 dos novos) |
| fail | 7 | **0** |
| skipped | 16 | 16 |

---

## 7. Lições preventivas aplicadas

| Lição | Status |
| :--- | :--- |
| Sem indexed access — guards onde necessário | ✅ |
| Sem shadowing de built-ins | ✅ |
| Imports `#src/*` subpath | ✅ |
| `import type` separado de runtime | ✅ |
| Fixtures via agregado real (chain Payable.open → approve → transmit → processBankOutflow) | ✅ |
| `tmpdir()` + `mkdtempSync` + finally rmSync | ✅ |
| `void handle.repo.save(...)` SEM `eslint-disable` órfão (lição FIN-CLI-APROVAR-TITULO W3) | ✅ |
| Reuso do helper `runFinancialCli` | ✅ |
| Datas cronológicas estritas para passar invariantes temporais | ✅ |
| Asserts validam output formatado literal (força W1 a implementar formatters corretos) | ✅ |

---

## 8. Pronto para W1

Sequência sugerida no §6.1. Cuidados especiais:

1. **Narrow por status no `formatPayable`** — TS força exaustividade via discriminator. Se um caso faltar, alguns testes (CA-20/21) vão falhar por output incompleto, não por erro TS.
2. **`formatBeneficiary` deve formatar CPF como `111.444.777-35`** — máscara via slice/regex simples (decisão W1: aceitar formatação sem separador se complicar; refactor se P.O. reclamar).
3. **CA-21 asserts `FITID: FITID-MOSTRAR-123`** — formato literal sem máscara especial (FITID é opaque string).
4. **CA-20 valida `Aprovado por: <APPROVER_UUID>`** — UUID completo (sem truncamento). Pattern consistente com o `aprovar-titulo` output.
5. **Não cair em "Erro desconhecido (código interno: ...)"** para `payable-id-invalid` ou `payable-not-found` — entradas no dicionário do formatter são obrigatórias (CA-18).

Envelope **S** — implementação esperada em 1 round (escopo bem mapeado; pattern espelha mostrar-contrato do contracts).
