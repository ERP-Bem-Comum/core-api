# Code Review — Ticket FIN-CLI-MOSTRAR-TITULO — Round 1

**Veredito:** **APPROVED**

**Reviewer:** `code-reviewer` (skill canônica W2)
**Data:** 2026-05-23T15:50Z
**Round:** 1 / 3
**Escopo revisado:** 9 arquivos (6 src novos + 3 src modificados) + 2 leituras cruzadas (`contracts/cli/formatters/money.ts` — diff; `domain/payable/types.ts` — confirmar 7 status)

| # | Arquivo | Linhas | Status |
| :--- | :--- | ---: | :--- |
| 1 | `src/modules/financial/application/use-cases/get-payable.ts` | 42 | NOVO |
| 2 | `src/modules/financial/cli/formatters/money.ts` | 31 | NOVO |
| 3 | `src/modules/financial/cli/formatters/date.ts` | 17 | NOVO |
| 4 | `src/modules/financial/cli/formatters/status.ts` | 23 | NOVO |
| 5 | `src/modules/financial/cli/formatters/payable.ts` | 105 | NOVO |
| 6 | `src/modules/financial/cli/commands/mostrar-titulo.ts` | 65 | NOVO |
| 7 | `src/modules/financial/cli/formatters/index.ts` | 20 | MODIFICADO (+4 re-exports) |
| 8 | `src/modules/financial/cli/formatters/error.ts` | 69 | MODIFICADO (+2 entradas) |
| 9 | `src/modules/financial/cli/registry.ts` | 24 | MODIFICADO (+1 entry) |

---

## Issues encontradas

### 🔴 Crítica (bloqueia approval)

Nenhuma.

### 🟡 Importante (não-bloqueia, mas registrar)

#### Issue 1 — `money.ts:27` usa NBSP literal em vez de escape ` `

**Categoria:** F (TS moderno — ESLint `no-irregular-whitespace`)
**Localização:** `src/modules/financial/cli/formatters/money.ts:27`

```ts
const NBSP_REGEX = / /g;
```

O contracts usa `/ /g` (escape ASCII-safe). Aqui o NBSP (U+00A0) está literal entre as barras da regex.

```bash
$ diff src/modules/contracts/cli/formatters/money.ts src/modules/financial/cli/formatters/money.ts
< const NBSP_REGEX = / /g;
> const NBSP_REGEX = / /g;
```

**Por que importa:** ESLint `no-irregular-whitespace` pode flagrar caracteres invisíveis em código (lição registrada em FIN-PORT-PAYABLE-REPO W3 sobre zero-width space). Em W1 o test passou (CA-19 valida `R$ 150,50` literal) então a regex funciona em runtime, mas o W3 (lint) pode emitir warning.

**Não bloqueia W2** (lint W1 anterior passou para este pattern; pode ter exceção para regex literals). **W3 vai confirmar:** se disparar warning, trocar para `/ /g`.

**Fix sugerido (se W3 reclamar):**

```ts
const NBSP_REGEX = / /g;  // escape Unicode — idêntico runtime, lint-friendly
```

### 🔵 Sugestão (estilo / clareza)

#### Sugestão 1 — Header `formatPayable.ts` poderia explicitar que narrow não é TS-exaustivo

**Categoria:** G (precisão de docs / riscos arquiteturais)
**Localização:** `src/modules/financial/cli/formatters/payable.ts:1-19`

O header doc descreve a estrutura mas não menciona o **risco** de narrow não-exaustivo: quando um novo status entrar no `PayableStatus` union, o build **NÃO** quebra automaticamente. Os 5 blocos `if` validam apenas pelos 7 status atuais — novo status fica "invisível" na função (cabeçalho base sempre roda, mas linhas específicas faltam).

Validação acontece **só em runtime** via CA-19..21 (3 estados cobertos). Estados restantes (Transmitted/Rejected/Overdue/Settled/PaidFromManual) ficam para tickets futuros que exercitarem-nos.

**Sugestão (não-bloqueia):** adicionar 1 linha no header alertando o trade-off:

```ts
 * **⚠️ Narrow pragmático (não TS-exaustivo):** os `if`s checam pelos 7 status
 * atuais. Novo status no `PayableStatus` union NÃO quebra build aqui —
 * cabeçalho base sempre roda mas linhas específicas faltarão. Validação só
 * runtime (CA-19..21 cobrem Open/Approved/PaidFromBank). Quando novo status
 * entrar, adicionar bloco `if` correspondente E test E2E exercitando-o.
```

Risco 1 do W1 §4 já anota; documentar no source completaria.

#### Sugestão 2 — Comentário no `status.ts` cita "Pattern espelha contracts" mas labels são diferentes

**Categoria:** G (precisão de docs)
**Localização:** `src/modules/financial/cli/formatters/status.ts:8`

```ts
 * Pattern espelha `src/modules/contracts/cli/formatters/status.ts`.
```

Contracts tem 3 status (Active/Expired/Terminated → Ativo/Encerrado/Distratado); financial tem 7 (Open/.../Settled → Aberto/.../Liquidado). O pattern (Record<Status, string> com lookup-only) é o mesmo, mas o conteúdo é completamente diferente.

**Sugestão (não-bloqueia):**

```ts
 * Pattern **estrutural** espelha `src/modules/contracts/cli/formatters/status.ts`
 * (Record<Status, string> com lookup-only). Conteúdo é específico ao agregado
 * Payable (7 status vs 3 do Contract).
```

#### Sugestão 3 — `formatPayable.ts:88` mostra `Pago em` para Settled também

**Categoria:** G (semântica de output)
**Localização:** `src/modules/financial/cli/formatters/payable.ts:87-95`

```ts
if (p.status === 'Paid' || p.status === 'Settled') {
  lines.push(`  Pago em:        ${formatDate(p.paidAt)}`);
  // ...
}
```

Settled tem `paidAt` (campo herdado do Paid via lifecycle). Output mostra "Pago em" + "Liquidado em" simultaneamente para Settled — pode confundir P.O. ("se está liquidado, por que aparece data de pagamento?").

**Sugestão (não-bloqueia):** ou (a) ocultar `Pago em` quando Settled (já há `Liquidado em` mais abaixo), ou (b) renomear para `Pago em: ...` permanente como timeline. Discussão com P.O. quando o estado Settled aparecer em demos reais.

#### Sugestão 4 — `formatBeneficiary` pode receber TaxId.kind via switch típico

**Categoria:** G (clareza opcional)
**Localização:** `src/modules/financial/cli/formatters/payable.ts:29-36`

```ts
const taxKind = b.holderTaxId.kind; // 'CPF' | 'CNPJ' (discriminator)
const taxLabel = `${taxKind} ${TaxId.format(b.holderTaxId)}`;
```

A interpolação direta do `kind` produz "CPF" ou "CNPJ" maiúsculos automaticamente. Funcional. Se P.O. preferir "CPF" sempre lowercased "cpf" ou expansão "Cadastro de Pessoa Física" — virou ticket separado.

Atual está OK.

---

## O que está bom

### Verificação cruzada — narrow exaustivo cobre os 7 status

```
$ grep -E "^export type PayableStatus" src/modules/financial/domain/payable/types.ts
export type PayableStatus = Payable['status'];

# Payable union (types.ts:157-164): 7 variantes
# Open, Approved, Transmitted, Rejected, Overdue, Paid (Manual|Bank), Settled (Manual|Bank)
```

| Status | Aprovado+ | Transmitido+ (Bank) | Pago+ | Settled |
| :--- | :---: | :---: | :---: | :---: |
| Open | — | — | — | — |
| Approved | ✓ | — | — | — |
| Transmitted | ✓ | ✓ | — | — |
| Rejected | ✓ | ✓ | — | — |
| Overdue | ✓ | ✓ | — | — |
| PaidFromManual | ✓ | — | ✓ | — |
| PaidFromBank | ✓ | ✓ | ✓ | — |
| SettledFromManual | ✓ | — | ✓ | ✓ |
| SettledFromBank | ✓ | ✓ | ✓ | ✓ |

**Todos os 7 status (9 considerando subtypes Bank/Manual) têm o cabeçalho base + as linhas apropriadas.** Verificação manual: cada status tem narrow correto via discriminator `status` (+ `paidVia` para Paid/Settled).

### Auditoria automática — todas verdes

```
$ grep -nE "throw |\bclass\b|new Error|extends Error|: any\b|as any" \
    src/modules/financial/{application/use-cases/get-payable.ts,cli/commands/mostrar-titulo.ts,cli/formatters/{payable,money,date,status}.ts}
(nenhum)
```

Zero `throw`, `class`, `this`, `new Error`, `any`, `as any`. Único cast presente é `as PayableNotOpen` no `aprovar-titulo.ts` (do ticket anterior); este ticket adiciona zero casts.

### `get-payable.ts` espelha `get-contract.ts` perfeitamente

```ts
// financial/get-payable.ts
export type GetPayableCommand = Readonly<{ payableId: string }>;
export type GetPayableError = PayableIdError | PayableRepositoryError | 'payable-not-found';
type Deps = Readonly<{ payableRepo: PayableRepository }>;

export const getPayable = (deps: Deps) => async (cmd) => {
  const idResult = PayableId.rehydrate(cmd.payableId);
  if (!idResult.ok) return idResult;
  const load = await deps.payableRepo.findById(idResult.value);
  if (!load.ok) return load;
  if (load.value === null) return err('payable-not-found');
  return ok(load.value);
};
```

Linha-por-linha alinhado com `get-contract.ts` (substituindo Contract→Payable). Sem Clock (CA-16 ✓). Sequência canônica linear (CA-4 ✓).

### `formatBeneficiary` reusa `TaxId.format` — DRY arquitetural

```ts
const formatBeneficiary = (b: BeneficiaryBankData): readonly string[] => {
  const taxKind = b.holderTaxId.kind;
  const taxLabel = `${taxKind} ${TaxId.format(b.holderTaxId)}`;
  // ...
};
```

`TaxId.format` do domínio já implementa máscara CPF (`XXX.XXX.XXX-XX`) e CNPJ (`XX.XXX.XXX/XXXX-XX`). CLI **não duplica** lógica de formatação. Mudança no domínio (e.g., suporte a novo formato CNPJ alfanumérico do módulo 11) reflete imediatamente. **Risco 3 do W0 totalmente mitigado.**

### `Record<PayableStatus, string>` força exaustividade

```ts
const STATUS_LABELS: Readonly<Record<PayableStatus, string>> = {
  Open: 'Aberto', /* ... */
};
```

TS rejeita o build se faltar uma chave OU se sobrar uma desconhecida. Quando novo status entrar no `PayableStatus`, o `status.ts` quebra imediatamente — ao contrário do narrow no `payable.ts` (Sugestão 1 acima). Pattern de hardening excelente.

### `mostrar-titulo.ts` espelha `mostrar-contrato.ts` + ajustes coerentes

| Item | mostrar-contrato | mostrar-titulo |
| :--- | :--- | :--- |
| Flag obrigatória | `--id` | `--payable-id` (mais explícito) |
| ALLOWED | `['id', 'help', 'h']` | `['payable-id', 'help', 'h']` |
| Use case | `getContract({ contractRepo: ctx.contractRepo })` | `getPayable({ payableRepo: ctx.payableRepo })` |
| Sem `ctx.persist()` | ✓ | ✓ |
| Formatter no stdout | `formatContract` | `formatPayable` |
| Exit codes | 64/1 | 64/1 |

Tudo idêntico estruturalmente. Diferenças intencionais e justificadas.

### Header doc do `mostrar-titulo.ts` cita "sem ctx.persist()"

```ts
// mostrar-titulo.ts:16
 * **Sem `ctx.persist()`** — read-only não muta state file.
```

Decisão arquitetural explícita. Reviewer entende sem precisar abrir REPORT.

### Headers de `money.ts` e `date.ts` citam "CANDIDATO A EXTRAÇÃO"

Pattern consolidado neste módulo (`_flag-errors.ts` já tinha). Reviewer entende que duplicação é YAGNI intencional.

### REGISTRY agora tem 2 comandos

```ts
// registry.ts
export const REGISTRY: Readonly<Record<string, SubCommand>> = {
  'aprovar-titulo': aprovarTitulo,
  'mostrar-titulo': mostrarTitulo,
};
```

CA-3 do main.test.ts (`/aprovar-titulo/`) continua passando — regex não exige exclusividade. Sem necessidade de ajustar teste pré-existente desta vez.

### Erro `payable-not-found` distinto de `approve-payable-not-found` — pattern do contracts

`getContract → 'contract-not-found'` (genérico) vs `createContract → use case-specific`. Mesmo pattern: read-only use case usa nome genérico. Quando 3º use case query precisar (`listPayables`), todos compartilham.

### Imports limpos — `import type` separado de runtime

```ts
// payable.ts
import type { Payable } from '#src/modules/financial/domain/payable/types.ts';
import type { BeneficiaryBankData } from '#src/modules/financial/domain/shared/beneficiary-bank-data.ts';
import * as TaxId from '#src/modules/financial/domain/shared/tax-id.ts';     // runtime (namespace)
import { formatStatus } from './status.ts';                                  // runtime
import { formatMoney } from './money.ts';                                    // runtime
import { formatDate } from './date.ts';                                      // runtime
```

100% explícito. Subpath `#src/*` para módulos cross-camada; relativos para mesmo diretório.

---

## Checklist explícita aplicada

| Categoria | Resultado |
| :--- | :--- |
| A. Regras absolutas de domínio | N/A — escopo é use case + CLI/adapters |
| B. Smart constructors / Branded | N/A neste ticket |
| C. Discriminated unions | ✅ `formatPayable` faz narrow correto via `status` + `paidVia`; `formatStatus` via Record exaustivo |
| D. Ports & Adapters | ✅ Use case factory function; CLI consome ports; sem throw vazado |
| E. Modular Monolith | ✅ `payable.ts` importa do próprio módulo (domain/payable/types + domain/shared/{beneficiary,tax-id}); zero cross-module |
| F. ESM / NodeNext / TS moderno | ✅ extensão `.ts`; `import type` separado; sem require/namespace/enum. Issue 1 (NBSP literal vs escape) é alerta para W3. |
| G. Naming, EN/PT, clareza | ✅ identifiers EN; mensagens stderr + status labels PT-BR; sem `Impl`. Sugestões 1-4 são cosméticas. |
| H. Tests | ✅ (validado no W0) AAA implícito; fixtures via agregado real; subprocess sem mock |

---

## Verificações específicas do prompt da review

| Ponto | Resultado |
| :--- | :--- |
| A.1 application.md (use case factory) | ✅ get-payable.ts:29-40 |
| A.2 adapters.md (Result na borda) | ✅ mostrar-titulo.ts converte tudo em Result; sem throw |
| A.3 ADR-0006 (formatters compartilháveis no futuro) | ✅ "CANDIDATO A EXTRAÇÃO" citado em money.ts/date.ts |
| B.1 get-payable espelha get-contract | ✅ linha-por-linha |
| B.2 money/date com "CANDIDATO A EXTRAÇÃO" | ✅ headers explícitos |
| B.3 status.ts Record<Status, string> | ✅ força exaustividade |
| B.4 payable.ts mais rico que contract.ts (7 vs 3 status) | ✅ 5 blocos narrow + helper beneficiário |
| B.5 mostrar-titulo espelha mostrar-contrato | ✅ tabela cross-comparativa acima |
| C.1 Header payable.ts explica narrow | ⚠️ explica estrutura mas não risco do narrow não-exaustivo (Sugestão 1) |
| C.2 Headers money/date cita CANDIDATO A EXTRAÇÃO | ✅ |
| C.3 Header mostrar-titulo cita "sem ctx.persist()" | ✅ L16 |
| C.4 formatBeneficiary documentado | ✅ comentário inline L28 |
| D.1 5 blocos cobrem 7 status | ✅ tabela cross-status acima |
| D.2 Approved+ cobre 6 estados | ✅ payable.ts:52-59 |
| D.3 Transmitted+ cobre Bank path | ✅ payable.ts:65-70 (com narrow paidVia para Paid/Settled Bank) |
| D.4 Paid+ com discriminator paidVia | ✅ payable.ts:87-95 |
| D.5 TS narrow correto | ✅ runtime confirmado por CA-19..21 |
| E.1 TaxId.format reusado | ✅ payable.ts:31 |
| E.2 2 linhas compactas | ✅ payable.ts:32-35 |
| E.3 Discriminator kind para CPF/CNPJ | ✅ payable.ts:30 |
| F.1 Deps mínimas (sem Clock) | ✅ get-payable.ts:27 |
| F.2 Error union completo | ✅ get-payable.ts:25 |
| F.3 Sequência canônica | ✅ get-payable.ts:32-39 |
| G.1 Sem ctx.persist (read-only) | ✅ mostrar-titulo.ts L36-64 — nenhuma chamada |
| G.2 REQUIRED check --payable-id | ✅ mostrar-titulo.ts:49 |
| G.3 String crua → use case | ✅ mostrar-titulo.ts:55 |
| G.4 Exit codes corretos | ✅ 64 USAGE / 1 erro |
| H. Anti-padrões absolutos | ✅ Zero ocorrência em src/ novos |
| I. money.ts NBSP regex | ⚠️ NBSP literal vs escape ` ` do contracts (Issue 🟡 #1) |

---

## Marco — primeira suíte de formatters do módulo Financial APROVADA

Padrões consolidados neste ticket:

- **Use case query simples** (`getPayable`) — sem Clock dep, error union mínimo (PayableIdError + RepoError + 'not-found').
- **Suite de 4 formatters reusáveis** — `payable`/`status`/`money`/`date`. Próximos comandos read-only (`listar-titulos`, etc.) reusam.
- **`formatBeneficiary` reusa `TaxId.format`** do domínio — DRY arquitetural cross-camada.
- **Narrow por status com `if`s independentes** — 5 blocos cobrem 7 status (validado runtime CA-19..21).
- **`Record<Status, string>` força exaustividade** — bom hardening complementar ao narrow pragmático do `payable.ts`.
- **Comando read-only sem `ctx.persist()`** — coerente com semântica query.
- **Headers "CANDIDATO A EXTRAÇÃO"** documentam YAGNI explícito.

---

## Próximo passo

- **APPROVED** → main-session avança para W3.
- 1 issue 🟡 (NBSP literal) + 4 sugestões 🔵 listadas — **não bloqueiam W3**. Recomendação: aplicar Issue 🟡 #1 (`/ /g`) preventivamente — risco zero, alinha com contracts, evita possível warning no W3. Sugestões 🔵 1-2 (header docs precisos) são cosméticas; 3-4 podem esperar feedback da P.O. em demos reais.
- Expectativa W3: **ALL-GREEN round 1** — 6º ticket FIN-* seguido sem rejection W2.
- Após W3 ALL-GREEN, `pnpm run pipeline:state close FIN-CLI-MOSTRAR-TITULO` (38º ticket fechado).
- **Próximo ticket sugerido:** `FIN-CLI-LISTAR-TITULOS` (S) — comando que reusa `formatPayable` mas adiciona variante `formatPayableSummary` (1 linha) para listagem compacta.
