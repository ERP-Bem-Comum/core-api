# FIN-AGG-PAYABLE-PAYMENT — Conclusão da máquina de estados (Paid + Settled + 3 transições)

> **Size:** M · **Status:** open · **Criado por:** main-session (Opus 4.7)
> **Predecessores:** FIN-AGG-PAYABLE-CORE, FIN-AGG-PAYABLE-TRANSMISSION (closed-green ALL-GREEN)
> **Sucessor previsto:** `FIN-PORT-PAYABLE-REPO` (S) — primeiro ticket da camada Application
>
> **Terceiro M do agregado Payable — completa a máquina de estados de 7 estados.**

---

## 1. Contexto

Este ticket fecha o agregado `Payable` adicionando os 2 estados terminais que cobrem o fluxo "saída bancária real → conciliação humana":

```
Approved   → Paid       (RegistrarPagamentoManual — OPERADOR, fora da remessa)
Transmitted → Paid      (ProcessarSaidaBancaria — SISTEMA, retorno CNAB confirmando débito)
Overdue    → Paid       (ProcessarSaidaBancaria tardia — handbook §6 "Atrasado → Pago")
Paid       → Settled    (AutorizarLiquidacao — GESTOR, R6 Crivo Humano)
```

**Citações literais do handbook (`04-titulos-liquidacao-context.md`):**

- `:45` — `RegistrarPagamentoManual: Operador | Título em Aprovado | Pula remessa e define status como Pago. | TituloPagoManualmente`
- `:46` — `ProcessarSaidaBancaria: Sistema | Retorno da VAN/Extrato | Se confirmado, status vai de Transmitido para Pago. | SaidaBancariaConfirmada`
- `:50` — `AutorizarLiquidacao: Gestor | Título em Pago | Efetiva a baixa final no sistema (Crivo Humano). | TituloLiquidado`
- `:54` — **R1 (Soberania da Aprovação):** "Somente títulos com perfil `Aprovado` podem ser incluídos em arquivos de remessa **ou marcados como Pago**." — enforce em `registerManualPayment`.
- `:58` — **R5 (Diferenciação Retorno vs. Saída):** "O status `PAGO` só é atingido após a confirmação da **Saída Bancária** (extrato/retorno de liquidação)." — enforce no design: campo `bankPaymentDate` obrigatório em `PaidFromBank`.
- `:59` — **R6 (Controle de Liquidação):** "A mudança de `PAGO` para `LIQUIDADO` **nunca é automática**. (...) exige a autorização do Gestor." — enforce no design: `authorizeSettlement` requer `settledBy: UserRef` obrigatório.
- `:95` — fluxo "Atrasado → Pago: SaidaBancariaConfirmada (tardia)" — `processBankOutflow` aceita Transmitted OU Overdue.

### 1.1. Subset deste ticket

| Estado novo | Transição de entrada | Saída coberta |
| :--- | :--- | :--- |
| `Paid` | `registerManualPayment` (Approved → Paid Manual) | `authorizeSettlement` (Paid → Settled) |
| `Paid` | `processBankOutflow` (Transmitted/Overdue → Paid Bank) | idem |
| `Settled` | `authorizeSettlement` | — (estado terminal) |

**Máquina de estados de 7 estados completa** após este ticket. Próximos tickets saem do domínio puro para a camada Application (ports, use cases, CLI).

---

## 2. Decisões de modelagem

### 2.1. `PaidPayable` e `SettledPayable` como unions internas (D1)

`Paid` pode vir de 2 caminhos com **campos diferentes obrigatórios**:

- **Manual** (`Approved → Paid`): apenas `paidAt + paymentRegisteredBy`. NÃO tem `fitid`/`bankPaymentDate`.
- **Banco** (`Transmitted/Overdue → Paid`): herda `TransmissionRecord` + `paidAt + fitid + bankPaymentDate`.

DO C§29 proíbe campos opcionais para "variar payload por estado" — deve ser variantes da union.

**Decisão:** discriminator interno `paidVia: 'Manual' | 'Bank'`:

```ts
type PaidFromManualBody = ApprovalRecord & Readonly<{
  paidAt: Date;
  paidVia: 'Manual';
  paymentRegisteredBy: UserRef; // Operador que registrou
}>;

type PaidFromBankBody = TransmissionRecord & Readonly<{
  paidAt: Date;
  paidVia: 'Bank';
  fitid: FITID;
  bankPaymentDate: Date; // data extraída do extrato (≠ paidAt — quando sistema processou)
}>;

export type PaidFromManualPayable = PayableCore & PaidFromManualBody & Readonly<{ status: 'Paid' }>;
export type PaidFromBankPayable = PayableCore & PaidFromBankBody & Readonly<{ status: 'Paid' }>;
export type PaidPayable = PaidFromManualPayable | PaidFromBankPayable;

export type SettledFromManualPayable = PayableCore & PaidFromManualBody & Readonly<{
  status: 'Settled';
  settledAt: Date;
  settledBy: UserRef;
}>;
export type SettledFromBankPayable = PayableCore & PaidFromBankBody & Readonly<{
  status: 'Settled';
  settledAt: Date;
  settledBy: UserRef;
}>;
export type SettledPayable = SettledFromManualPayable | SettledFromBankPayable;
```

**Union pública `Payable` mantém 7 discriminadores `status`** (Open/Approved/Transmitted/Rejected/Overdue/Paid/Settled). Quem narrowa via `if (p.status === 'Paid')` recebe `PaidPayable` (union de 2); pode narrowar mais com `p.paidVia` se precisar de `fitid`.

### 2.2. Decisões deliberadas

| # | Decisão | Justificativa |
| :--- | :--- | :--- |
| **D1** | `paidVia` discriminator interno (union em `PaidPayable`/`SettledPayable`). | DO C§29 — sem optional. Idêntico ao pattern de `TaxId = CPF \| CNPJ` com `kind`. |
| **D2** | `paymentRegisteredBy: UserRef` em `PaidFromManualBody`. | Handbook §4 RegistrarPagamentoManual atribui ao "Operador" — diferente do "Aprovador" (R1). Auditoria exige registrar quem. |
| **D3** | `processBankOutflow` aceita Transmitted **E** Overdue. | Handbook §6: "Atrasado → Pago: SaidaBancariaConfirmada (tardia)". Sistema processa retorno indiferente ao estado intermediário. |
| **D4** | `bankPaymentDate` (data do banco no extrato) **separada** de `paidAt` (data do sistema processar). | R5: "PAGO só é atingido após confirmação da Saída Bancária". `bankPaymentDate` é evidência factual; `paidAt` é metadata operacional. |
| **D5** | `settledBy: UserRef` **obrigatório** em `authorizeSettlement`. | R6 explícito — "exige a autorização do Gestor". |
| **D6** | Sub-tipo `Paid` preserva trilha. Manual mantém `ApprovalRecord` (approvedAt/approvedBy); Bank mantém `TransmissionRecord` (+ transmittedAt + remittanceId). | Auditoria — depois de settled, ainda é possível reconstruir caminho. |
| **D7** | `authorizeSettlement(paid, settledBy, settledAt)` preserva sub-type via type-level mapping. `PaidFromManual → SettledFromManual`, `PaidFromBank → SettledFromBank`. | Symmetry — auditoria total. |
| **D8** | NÃO valida `bankPaymentDate >= transmittedAt`. Apenas `isValidDate`. | Banco pode informar qualquer data no extrato; sistema só registra. Não cabe ao domínio validar consistência do extrato (escopo de adapter de Integração Bancária). |
| **D9** | Erros separados `PayableNotPaid`, `PayableNotTransmittedOrOverdue` (precondicional). | Padrão dos NotX já estabelecido. `NotTransmittedOrOverdue` com payload `currentStatus` é claro. |
| **D10** | NÃO enforça R4 (Anti-Duplicidade FITID) no domínio. | FITID duplicado em runtime é responsabilidade do **Repository** (UNIQUE constraint MySQL) e do **adapter de Integração Bancária** (descarte silencioso na importação OFX). Não cabe ao agregado. |
| **D11** | 3 novos refinement constructors públicos: `parsePaid`, `parseSettled`. NÃO expõe `parsePaidFromManual` etc. | Quem precisa do sub-tipo narrowa via `if (p.paidVia === 'Manual')` após o `parsePaid`. Mantém API pequena. |
| **D12** | Threshold de refactor da union de erros (21 → ~29 → 30) — provavelmente excedido neste ticket. | Comentário em errors.ts (Sug 3 do W2 anterior) sinaliza ação. Decisão: **não fazer refactor agora**, registrar como tech-debt para o próximo ticket de Application caso a union encoste em 35. |

---

## 3. Escopo

### 3.1. Arquivos editados

| Arquivo | Antes → Depois (estimado) |
| :--- | :--- |
| `payable/types.ts` | 134 → ~210 |
| `payable/events.ts` | 51 → ~85 |
| `payable/errors.ts` | 226 → ~310 |
| `payable/payable.ts` | 314 → ~470 |

### 3.2. Novos artefatos

- **4 sub-estados internos** (DO C§29): `PaidFromManualPayable`, `PaidFromBankPayable`, `SettledFromManualPayable`, `SettledFromBankPayable`. Helper internos: `PaidFromManualBody`, `PaidFromBankBody`.
- **2 unions internas exportadas:** `PaidPayable`, `SettledPayable`.
- **3 eventos novos:** `PayablePaidManually`, `PayableBankOutflowConfirmed`, `PayableSettled`.
- **8 erros novos:**
  - `PayableNotPaid` (precond para authorizeSettlement)
  - `PayableNotTransmittedOrOverdue` (precond para processBankOutflow)
  - `PayableInvalidManualPaymentDate`
  - `PayableManualPaymentDateBeforeApprovedAt(approvedAt, attemptedAt)`
  - `PayableInvalidBankOutflowDate` (occurredAt do processBankOutflow)
  - `PayableBankOutflowDateBeforeTransmittedAt(transmittedAt, attemptedAt)`
  - `PayableInvalidBankPaymentDate` (bankPaymentDate metadata)
  - `PayableInvalidSettlementDate`
  - `PayableSettlementDateBeforePaidAt(paidAt, attemptedAt)`

Total: **9 erros novos** (recontagem). Union total: 21 + 9 = **30 variants** — encosta no threshold de refactor.

- **3 transições novas:** `registerManualPayment`, `processBankOutflow`, `authorizeSettlement`.
- **2 refinement constructors novos:** `parsePaid`, `parseSettled`.

---

## 4. Critérios de aceitação

### 4.1. Tipos (CA-1..CA-6)

| # | Critério |
| :--- | :--- |
| CA-1 | `PaidPayable = PaidFromManualPayable \| PaidFromBankPayable` (union interna) |
| CA-2 | `PaidFromManualPayable` herda `ApprovalRecord` + `paidVia: 'Manual'` + `paymentRegisteredBy` — SEM `fitid`/`bankPaymentDate` |
| CA-3 | `PaidFromBankPayable` herda `TransmissionRecord` + `paidVia: 'Bank'` + `fitid` + `bankPaymentDate` — COM os 2 últimos obrigatórios |
| CA-4 | `SettledPayable = SettledFromManualPayable \| SettledFromBankPayable` preserva sub-tipo |
| CA-5 | `Payable` union expandida — 7 variants externas (status) |
| CA-6 | `PayableEvent` union expandida — 9 variants totais (6 anteriores + 3 novas) |

### 4.2. `registerManualPayment()` (CA-7..CA-11)

| # | Critério |
| :--- | :--- |
| CA-7 | `registerManualPayment(approved, paymentRegisteredBy, paidAt)` → ok com `PaidFromManualPayable` + `PayablePaidManually` event |
| CA-8 | Rejeita não-Approved → `PayableNotApproved(currentStatus)` |
| CA-9 | Rejeita malformação date → `PayableInvalidManualPaymentDate` |
| CA-10 | Rejeita `paidAt < approvedAt` → `PayableManualPaymentDateBeforeApprovedAt(approvedAt, paidAt)` |
| CA-11 | Payable resultante tem `paidVia: 'Manual'` e NÃO tem `fitid`/`bankPaymentDate` (verificado via `'fitid' in payable === false`) |

### 4.3. `processBankOutflow()` (CA-12..CA-19)

| # | Critério |
| :--- | :--- |
| CA-12 | `processBankOutflow(transmitted, fitid, bankPaymentDate, occurredAt)` → ok `PaidFromBankPayable` |
| CA-13 | `processBankOutflow(overdue, fitid, bankPaymentDate, occurredAt)` → ok `PaidFromBankPayable` (D3 — confirmação tardia) |
| CA-14 | Rejeita Open/Approved/Rejected/Paid/Settled → `PayableNotTransmittedOrOverdue(currentStatus)` |
| CA-15 | Rejeita malformação `occurredAt` → `PayableInvalidBankOutflowDate` |
| CA-16 | Rejeita malformação `bankPaymentDate` → `PayableInvalidBankPaymentDate` |
| CA-17 | Rejeita `occurredAt < transmittedAt` → `PayableBankOutflowDateBeforeTransmittedAt(transmittedAt, attemptedAt)` |
| CA-18 | Payable resultante tem `paidVia: 'Bank'` + `fitid` + `bankPaymentDate` |
| CA-19 | Evento `PayableBankOutflowConfirmed` carrega `fitid + bankPaymentDate` |

### 4.4. `authorizeSettlement()` (CA-20..CA-25)

| # | Critério |
| :--- | :--- |
| CA-20 | `authorizeSettlement(paid, settledBy, settledAt)` → ok `SettledPayable` + `PayableSettled` event |
| CA-21 | Rejeita não-Paid → `PayableNotPaid(currentStatus)` |
| CA-22 | Rejeita malformação → `PayableInvalidSettlementDate` |
| CA-23 | Rejeita `settledAt < paidAt` → `PayableSettlementDateBeforePaidAt(paidAt, attemptedAt)` |
| CA-24 | Sub-tipo preservado: `PaidFromManual → SettledFromManual` (não-Bank) |
| CA-25 | Sub-tipo preservado: `PaidFromBank → SettledFromBank` (preserva `fitid`, `bankPaymentDate`, transmissão) |

### 4.5. Refinement constructors (CA-26..CA-27)

| # | Critério |
| :--- | :--- |
| CA-26 | `parsePaid` aceita PaidPayable (qualquer sub-tipo); rejeita outros com `PayableNotPaid` |
| CA-27 | `parseSettled` aceita SettledPayable; rejeita outros |

### 4.6. Operacionais (CA-28..CA-31)

| # | Critério |
| :--- | :--- |
| CA-28 | `pnpm run typecheck` verde |
| CA-29 | `pnpm run format:check` verde |
| CA-30 | `pnpm test` verde — 63 testes anteriores continuam GREEN |
| CA-31 | `pnpm run lint` verde |

### 4.7. Threshold de refactor (CA-32)

| # | Critério |
| :--- | :--- |
| CA-32 | Union `PayableError` chega a ~30 variants — comentário no errors.ts mantém threshold 30 atualizado ou marca tech-debt para refactor de grouping no próximo ticket de Application |

---

## 5. Estratégia de teste (W0)

Cobertura: **~40 testes novos** (recordista para os agregados):

| Arquivo | Δ |
| :--- | :--- |
| `types.test.ts` | +3 (PaidPayable narrowing, SettledPayable preserva sub-type, Manual/Bank shape) |
| `events.test.ts` | +3 (PayablePaidManually, PayableBankOutflowConfirmed, PayableSettled) |
| `errors.test.ts` | +5 (constructors + exhaustive switch 21→30) |
| `payable.test.ts` | +~28 (3 transições × ~7 + 2 parseX + happy paths para each sub-type) |

**Fixtures encadeadas:**

```ts
const manuallyPaidPayable = () => Payable.registerManualPayment(approvedPayable(), OPERATOR, ...);
const bankPaidPayable = () => Payable.processBankOutflow(transmittedPayable(), VALID_FITID, ...);
const overdueThenPaidPayable = () => Payable.processBankOutflow(overduePayable(), ...);
const settledFromBankPayable = () => Payable.authorizeSettlement(bankPaidPayable(), GESTOR, ...);
```

---

## 6. Lições preventivas (consolidadas)

| Lição | Status |
| :--- | :--- |
| Sem indexed access | ✅ N/A |
| Sem shadowing | ✅ helpers `classify` |
| Sem async sem await | ✅ síncronas |
| Sem template `T \| undefined` | ✅ |
| `as <Brand>` único | ✅ apenas `'X' as const` |
| Split malformação/timing | ✅ aplicar nas 3 novas transições |
| Tagged errors com payload D23 | ✅ todos timing errors carregam evidência |
| Refactor compatível (sub-tipo Approved preservado) | ✅ obrigatório — sub-tipos novos NÃO alteram existentes |

---

## 7. Pipeline previsto

| Wave | Skill | Outcome |
| :--- | :--- | :--- |
| **W0** | `tdd-strategist` | RED — ~40 novos falham por `Payable.registerManualPayment is not a function` |
| **W1** | `main-session` | GREEN — 4 arquivos editados, sub-tipos Paid/Settled adicionados |
| **W2** | `code-reviewer` | APPROVED — union 30, threshold registrado, sub-type preservation validada |
| **W3** | `ts-quality-checker` | ALL-GREEN round 1 (esperado — lições consolidadas) |

---

## 8. Riscos e mitigações

| Risco | Mitigação |
| :--- | :--- |
| Complexidade da union interna `PaidPayable` confunde consumers | D11 — refinement só expõe `parsePaid` (não `parsePaidFromManual`). Consumer narrowa interno via `paidVia` se necessário. |
| `authorizeSettlement` exige type-level mapping (PaidFromManual → SettledFromManual) | TS resolve via tipos refinados — `if (p.paidVia === 'Manual')` narrowa branch. Test CA-24/CA-25 valida runtime. |
| Union de erros atinge 30 — encosta no threshold | D12 — não refactor agora. Registrar para próximo ticket. Comentário do W2 anterior já planta o gatilho. |
| `bankPaymentDate` vs `paidAt` confunde caller | D4 — campos separados com semântica clara: bankPaymentDate é "quando o banco diz que pagou"; paidAt é "quando o sistema confirmou". Não é redundância — são duas evidências distintas (D23 pattern). |
| `processBankOutflow` aceita 2 estados de entrada (Transmitted + Overdue) | Erro `PayableNotTransmittedOrOverdue` específico. Internamente, switch sobre `payable.status` decide o construct final (preservando TransmissionRecord). |

---

## 9. Próximos tickets

```
FIN-AGG-PAYABLE-PAYMENT  (M) ← este — completa máquina de estados (7/7)
  └─ FIN-PORT-PAYABLE-REPO (S) — port de persistência Drizzle InMemory
      └─ FIN-USECASE-APPROVE-PAYABLE (S) — primeiro use case (camada application)
          └─ FIN-CLI-APROVAR-TITULO (S) — primeiro comando real na CLI
```

Após este ticket, **sai do domínio puro** (mais de 1.500 linhas de produção em `domain/payable/`) e parte para wiring com Application + persistência + CLI.

---

## 10. Marco arquitetural

| Estado | Status pós-este-ticket |
| :--- | :--- |
| `Open` | ✅ |
| `Approved` | ✅ |
| `Transmitted` | ✅ |
| `Rejected` | ✅ |
| `Overdue` | ✅ |
| **`Paid` (Manual \| Bank)** | **✅** |
| **`Settled` (Manual \| Bank)** | **✅** |

**Máquina de estados 100% implementada** após este ticket. **3º M consecutivo do agregado** — fatia "domínio do Payable" concluída.
