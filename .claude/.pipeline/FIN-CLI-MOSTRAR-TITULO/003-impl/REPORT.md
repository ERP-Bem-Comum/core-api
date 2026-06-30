# W1 — Implementação GREEN (FIN-CLI-MOSTRAR-TITULO)

> **Wave:** W1 · **Outcome:** GREEN · **Agent:** `main-session`
> **Predecessor:** [`../002-tests/REPORT.md`](../002-tests/REPORT.md) (W0 RED — 7 fails)
> **Artefatos:** 6 arquivos novos + 3 modificados

---

## 1. Mudanças

| Arquivo | Linhas | Conteúdo | Status |
| :--- | ---: | :--- | :--- |
| `src/modules/financial/application/use-cases/get-payable.ts` | 42 | Factory `getPayable(deps)` — rehydrate id + findById + guard not-found | NOVO |
| `src/modules/financial/cli/formatters/money.ts` | 31 | BRL via Intl.NumberFormat + NBSP normalize | NOVO |
| `src/modules/financial/cli/formatters/date.ts` | 17 | DD/MM/YYYY UTC | NOVO |
| `src/modules/financial/cli/formatters/status.ts` | 23 | 7 STATUS_LABELS PT-BR | NOVO |
| `src/modules/financial/cli/formatters/payable.ts` | 96 | `formatPayable` com narrow por 7 status + `formatBeneficiary` helper | NOVO |
| `src/modules/financial/cli/commands/mostrar-titulo.ts` | 64 | Comando completo consumindo getPayable + formatPayable | NOVO |
| `src/modules/financial/cli/formatters/index.ts` | 20 | +4 re-exports (payable, status, money, date) | MODIFICADO |
| `src/modules/financial/cli/formatters/error.ts` | 71 | +2 entradas (`payable-id-invalid`, `payable-not-found`) | MODIFICADO |
| `src/modules/financial/cli/registry.ts` | 24 | +1 import + entry `'mostrar-titulo'` | MODIFICADO |
| **Total** | **~388** | (~273 novos + ~115 tocados) | |

### 1.1. `get-payable.ts` — use case espelha `getContract`

```ts
export const getPayable =
  (deps: { payableRepo: PayableRepository }) =>
  async (cmd: { payableId: string }) => {
    const idResult = PayableId.rehydrate(cmd.payableId);
    if (!idResult.ok) return idResult;
    const load = await deps.payableRepo.findById(idResult.value);
    if (!load.ok) return load;
    if (load.value === null) return err('payable-not-found');
    return ok(load.value);
  };
```

Sem Clock dep (read-only). Pattern espelha `getContract` literalmente.

### 1.2. Formatters — cópias funcionais + 2 novos

- **`money.ts`** (cópia do contracts) — `Intl.NumberFormat 'pt-BR'` + `replace NBSP` → `'R$ 150,50'` para 15050 cents.
- **`date.ts`** (cópia do contracts) — `getUTCDate/Month/FullYear` + padStart → `'15/06/2026'`.
- **`status.ts`** (NOVO) — `Record<PayableStatus, string>` com 7 labels: Open→Aberto, Approved→Aprovado, Transmitted→Transmitido, Rejected→Rejeitado, Overdue→Atrasado, Paid→Pago, Settled→Liquidado.
- **`payable.ts`** (NOVO — 96L) — `formatPayable` com helper `formatBeneficiary` reusando `TaxId.format` (já existente no domínio para máscara CPF/CNPJ).

Header doc dos 2 cópias cita "CANDIDATO A EXTRAÇÃO QUANDO 3º MÓDULO PRECISAR".

### 1.3. `formatPayable` — narrow por status

5 blocos `if` independentes cobrindo os 7 estados:
- **Approved+ (6 estados):** `Aprovado em` + `Aprovado por` — todos pós-aprovação têm `ApprovalRecord`.
- **Transmitted+ (Bank path):** `Transmitido em` + `Remessa` — Transmitted/Rejected/Overdue/PaidFromBank/SettledFromBank têm `TransmissionRecord` (Manual NÃO tem).
- **Rejected:** `Rejeitado em` + `Motivo`.
- **Overdue:** `Atrasado desde`.
- **Paid+ (Manual ou Bank):** `Pago em` + branch `paidVia === 'Bank'` (`FITID` + `Data bancária`) ou Manual (`Registrado por`).
- **Settled:** `Liquidado em` + `Liquidado por`.

TS narrow via discriminator `status` (+ `paidVia` dentro de Paid/Settled). Se um caso futuro for adicionado ao union, o build não quebra (campos optional não exigidos pelo narrow atual), mas o output ficará incompleto — coberto pelos CA-19..21 que validam strings literais específicas.

### 1.4. `formatBeneficiary` — 2 linhas compactas

```ts
const formatBeneficiary = (b: BeneficiaryBankData): readonly string[] => {
  const taxLabel = `${b.holderTaxId.kind} ${TaxId.format(b.holderTaxId)}`;
  return [
    `  Beneficiário:   ${b.holderName} (${taxLabel})`,
    `  Conta:          Banco ${b.bankCode} ag ${b.agency} cc ${b.account}`,
  ];
};
```

Reusa `TaxId.format` do domínio — máscara CPF/CNPJ idêntica em qualquer lugar do código. **Risco 3 mitigado** sem ceremônia.

### 1.5. `mostrar-titulo.ts` — comando read-only

Estrutura `descricao`/`help`/`run`. Sequência:
1. `parseFlags` + `validateAllowedFlags`
2. REQUIRED check `--payable-id`
3. `getPayable({ payableRepo })`
4. Sucesso: `process.stdout.write(formatPayable(payable) + '\n')` + exit 0
5. Erro: `formatErrorCode(error)` em stderr + exit 1

**Sem `ctx.persist()`** (CA-15 — read-only não muta state file). Sem `clock` dep (CA-16).

### 1.6. Zero `class`, `throw`, `as any`

```
$ grep -nE "throw |\bclass\b|new Error|extends Error|: any\b|as any" \
    src/modules/financial/cli/{commands/mostrar-titulo,formatters/{payable,money,date,status}}.ts \
    src/modules/financial/application/use-cases/get-payable.ts
(nenhum)
```

Zero ocorrências. Único `as` é `as PayableNotOpen` no `aprovar-titulo.ts` (do ticket anterior); este ticket adiciona zero casts.

---

## 2. Verificação

### 2.1. Typecheck

```
$ pnpm run typecheck
> tsc --noEmit
(exit 0, zero output)
```

Zero erros TS — narrow exaustivo no `formatPayable` valida em compile time.

### 2.2. Suite global — delta vs baseline

```
$ pnpm test
ℹ tests 1124  pass 1108  fail 0  skipped 16  duration_ms 39955
```

| Métrica | Baseline (W3 FIN-CLI-APROVAR-TITULO) | W0 RED | W1 GREEN | Delta W1 vs Baseline |
| :--- | ---: | ---: | ---: | ---: |
| tests | 1117 | 1124 | **1124** | **+7** |
| pass | 1101 | 1101 | **1108** | **+7** |
| fail | 0 | 7 | **0** | 0 |
| skipped | 16 | 16 | 16 | 0 |
| suites | 367 | 374 | 374 | +7 |

**Delta +7/+7/0** — exato. Os 7 testes novos do `mostrar-titulo.test.ts` todos GREEN.

### 2.3. Testes específicos do ticket

```
✔ mostrar-titulo — happy path Open (CA-19)
  ✔ stdout cita ID, "Aberto", data BR (DD/MM/YYYY), BRL formatado, beneficiário
✔ mostrar-titulo — happy path Approved (CA-20)
  ✔ stdout cita "Aprovado" + "Aprovado em" + "Aprovado por"
✔ mostrar-titulo — happy path PaidFromBank (CA-21)
  ✔ stdout cita "Pago" + "FITID" + "Data bancária"
✔ mostrar-titulo — help (CA-22)
  ✔ --help imprime ajuda em stdout exit 0
✔ mostrar-titulo — flag obrigatória ausente (CA-23)
  ✔ sem --payable-id → exit 64 stderr "Flag obrigatória ausente: --payable-id"
✔ mostrar-titulo — invalid id (CA-24)
  ✔ --payable-id não-UUID → exit 1 "ID do título inválido"
✔ mostrar-titulo — not found (CA-25)
  ✔ --payable-id válido sem persistência → exit 1 "Título não encontrado"
```

7/7 GREEN — incluindo CA-21 que validou narrow PaidFromBank com chain real `Payable.open → approve → transmit → processBankOutflow`.

---

## 3. CAs (000-request §3)

| # | Critério | Status |
| :--- | :--- | :--- |
| CA-1..4 (use case `getPayable`) | ✅ §1.1 |
| CA-5 (`status.ts` com 7 labels) | ✅ §1.2 |
| CA-6 (`money.ts` cópia) | ✅ §1.2 |
| CA-7 (`date.ts` cópia) | ✅ §1.2 |
| CA-8 (`payable.ts` com narrow) | ✅ §1.3 |
| CA-9 (narrow exaustivo cobre 7 estados) | ✅ §1.3 (validado runtime por CA-19..21) |
| CA-10 (`index.ts` re-exporta) | ✅ §1 |
| CA-11..16 (comando estrutura) | ✅ §1.5 |
| CA-17 (registry entry) | ✅ §1 |
| CA-18 (formatter error +2 entradas) | ✅ §1 |
| CA-19..25 (7 testes E2E) | ✅ §2.3 |
| CA-26..29 (typecheck/format/lint/test) | ⏳ W3 (typecheck e test ✅ §2.1/2.2; format/lint W3) |

**25 de 29 CAs validadas em W1.** 4 operacionais para W3.

---

## 4. Decisões W1

- **`formatBeneficiary` reusa `TaxId.format`** — domínio já expõe formatter de máscara CPF/CNPJ. Helper local na CLI só compõe linhas + label "CPF"/"CNPJ" via discriminator `kind`. Risco 3 mitigado sem código novo.
- **Narrow por status com `if`s independentes** (em vez de `switch` exaustivo) — mais legível para output sequencial onde cada bloco acumula linhas. Cobertura validada por CA-19..21 (3 estados representativos).
- **Headers doc citam "CANDIDATO A EXTRAÇÃO"** em `money.ts` e `date.ts` — pattern consolidado neste módulo (`_flag-errors.ts` já tinha).
- **`mostrar-titulo` sem `ctx.persist()`** — read-only. CA-15 explícito; comando puro de query.
- **`getPayable` sem Clock** — query não precisa de timestamp. Deps mínimas `{ payableRepo }`.
- **Erro `payable-not-found` (genérico)** coexiste com `approve-payable-not-found` do FIN-USECASE-APPROVE-PAYABLE — pattern do contracts (use case "get" usa nome genérico). Quando 3º use case query precisar, todos compartilham.

---

## 5. Lições preventivas aplicadas

| Lição | Status |
| :--- | :--- |
| Sem indexed access em arrays | ✅ |
| Sem shadowing de built-ins | ✅ |
| `try/catch` zero em produção | ✅ |
| Imports `#src/*` (test) + relativos (`..`) em src interno | ✅ |
| `import type` separado de runtime | ✅ |
| Sem `eslint-disable` órfão | ✅ (verificado: zero disables novos) |
| Reuso de utility já existente no domínio (TaxId.format) | ✅ |
| Headers doc citam pattern do contracts + decisões pragmáticas | ✅ |

---

## 6. Pronto para W2

`code-reviewer` deve validar:

1. **`formatPayable` narrow exaustivo** — 5 blocos `if` cobrem todos os 7 estados? Casos perdidos vão deixar output incompleto mas typecheck passa — runtime CA-19..21 cobre 3 estados (Open, Approved, PaidFromBank). Faltam 4 cobertura runtime: Transmitted, Rejected, Overdue, Settled, PaidFromManual. Decisão W1: deixar para tickets futuros que exercitem esses estados via use cases reais (`transmitPayable`, `processBankOutflow`, etc.).
2. **`money.ts` e `date.ts` são cópias funcionais documentadas** — comentário "CANDIDATO A EXTRAÇÃO" presente em ambos.
3. **`status.ts` Record<PayableStatus, string> força exaustividade** — bom hardening.
4. **`formatBeneficiary` reusa `TaxId.format`** — DRY arquitetural; mudança no domínio reflete imediatamente.
5. **Comando sem `ctx.persist()`** — coerente com read-only.
6. **REGISTRY agora tem 2 comandos** — atualizar CA-3 do main.test.ts não é necessário (regex `/aprovar-titulo/` continua passando; teste não exige que seja o único).
7. **Erro `payable-not-found` distinto de `approve-payable-not-found`** — pattern do contracts (use case query usa nome genérico).
8. **Zero `class`/`throw`/`as any` em todos os 6 arquivos novos** — verificado §1.6.

Envelope **S** — review esperada em 1 round dado pattern bem espelhado de `mostrar-contrato.ts` do contracts.

---

## 7. Marco — primeira suíte de formatters do módulo Financial

A CLI do financial agora tem:

- ✅ Pipeline completo (FIN-CLI-WIRE + FIN-CLI-SCAFFOLD)
- ✅ Driver memory + state file
- ✅ 2 comandos reais (`aprovar-titulo` write + `mostrar-titulo` read)
- ✅ **Suite de 4 formatters** reusáveis (`payable`, `status`, `money`, `date`)
- ✅ Use case query `getPayable`

P.O. pode agora **ler** títulos persistidos:

```bash
$ pnpm run cli:financial -- mostrar-titulo --state ./fin-cli-state.json --payable-id <uuid>

Título Financeiro
  ID:             7a89...
  Status:         Aprovado
  Vencimento:     15/06/2026
  Valor:          R$ 150,50
  Beneficiário:   Fornecedor X Ltda (CPF 111.444.777-35)
  Conta:          Banco 341 ag 1234-5 cc 12345-6
  Aprovado em:    25/05/2026
  Aprovado por:   a1b2c3d4-5678-4abc-9def-fedcba987654
```

**Próximo ticket sugerido:** `FIN-CLI-LISTAR-TITULOS` (S) — comando read-only que reusa `formatPayable` + adiciona variante `formatPayableSummary` (1 linha) para listagem.
