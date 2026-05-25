# FIN-AGG-PAYABLE-TRANSMISSION — Expansão do agregado Payable (Transmitted/Rejected/Overdue + 4 transições)

> **Size:** M · **Status:** open · **Criado por:** main-session (Opus 4.7)
> **Predecessores:** FIN-AGG-PAYABLE-CORE (closed-green ALL-GREEN — Open/Approved/approve já implementados)
> **Sucessor previsto:** `FIN-AGG-PAYABLE-PAYMENT` (M) — `Paid`/`Settled` + transições finais
> **Segundo M do agregado Payable.** Continua a máquina de estados — adiciona 3 variantes à union `Payable` e 4 transições.

---

## 1. Contexto

Após `FIN-AGG-PAYABLE-CORE` entregar `Open` e `Approved`, este ticket adiciona o **caminho da remessa CNAB** descrito no handbook §6:

```
Approved → Transmitted (GerarRemessa — OPERADOR)
Transmitted → Rejected (RegistrarRecusa — SISTEMA Retorno CNAB)
Transmitted → Overdue (MarcarComoAtrasado — D+1 sem retorno)
Rejected → Approved (ResetarParaAprovado — OPERADOR após corrigir)
```

**Citações literais do handbook:**

- `04-titulos-liquidacao-context.md:42` — `GerarRemessa: Operador | Títulos em Aprovado | Agrupa em CNAB e muda para Transmitido. | TituloTransmitido`
- `04-titulos-liquidacao-context.md:46` — `RegistrarRecusa: Sistema (Retorno) | Arquivo de Retorno com erro | Muda status para Recusado. | TituloRecusado`
- `04-titulos-liquidacao-context.md:45` — `MarcarComoAtrasado: Sistema/Operador | D+1 e status Transmitido | Identifica que a saída bancária não ocorreu. | PagamentoAtrasado`
- `04-titulos-liquidacao-context.md:47` — `ResetarParaAprovado: Operador | Título em Recusado | Volta para Aprovado para nova tentativa. | TituloResetado`
- `04-titulos-liquidacao-context.md:60` — **R5 (Status Atrasado):** "Se após a data prevista de pagamento o título permanecer como `Transmitido` (sem retorno de saída bancária), o sistema o sinaliza como `ATRASADO` para ação imediata do operador."
- `04-titulos-liquidacao-context.md:80` — fluxo "Caminho de Recusa e Recuperação": `RECUSADO → APROVADO (ResetarParaAprovado)`.

### 1.1. Subset deste ticket

| Estado | Origem (transição) | Saída coberta |
| :--- | :--- | :--- |
| `Transmitted` | `transmit(approved, remittanceId, at)` | → Rejected, → Overdue |
| `Rejected` | `registerRejection(transmitted, reason, at)` | → Approved (reset) |
| `Overdue` | `markOverdue(transmitted, at)` | — (sem saída neste ticket) |

**Estado destino terminal não coberto:** `Transmitted → Paid` (via `processBankOutflow`) e `Overdue → Paid` (confirmação tardia) ficam em `FIN-AGG-PAYABLE-PAYMENT`.

---

## 2. Decisões de modelagem

### 2.1. Tipos refinados — composição via helper type

Para evitar duplicação dos campos `approvedAt + approvedBy + transmittedAt + remittanceId` em 3 estados, introduzo um helper type interno `TransmissionRecord`:

```ts
// types.ts (interno, não exportado)
type ApprovalRecord = Readonly<{
  approvedAt: Date;
  approvedBy: UserRef;
}>;

type TransmissionRecord = ApprovalRecord & Readonly<{
  transmittedAt: Date;
  remittanceId: RemittanceId;
}>;

// Estados refinados
export type ApprovedPayable = PayableCore & ApprovalRecord & Readonly<{ status: 'Approved' }>; // refactor
export type TransmittedPayable = PayableCore & TransmissionRecord & Readonly<{ status: 'Transmitted' }>;
export type RejectedPayable = PayableCore & TransmissionRecord & Readonly<{
  status: 'Rejected';
  rejectedAt: Date;
  rejectionReason: string;
}>;
export type OverduePayable = PayableCore & TransmissionRecord & Readonly<{
  status: 'Overdue';
  markedOverdueAt: Date;
}>;

export type Payable = OpenPayable | ApprovedPayable | TransmittedPayable | RejectedPayable | OverduePayable;
```

### 2.2. Decisões deliberadas

| # | Decisão | Justificativa |
| :--- | :--- | :--- |
| **D1** | `TransmissionRecord` helper interno (não exportado). | DRY — 3 estados compartilham `approvedAt + approvedBy + transmittedAt + remittanceId`. Helper deixa explícita a "hereditariedade" do estado. |
| **D2** | `ApprovedPayable` refatorado para usar `ApprovalRecord` (não inline). | Coerência com novo padrão. Ajuste retrocompatível — campos `approvedAt`/`approvedBy` permanecem iguais. |
| **D3** | `rejectionReason: string` em `RejectedPayable` — não opcional. | Handbook §4 diz "Arquivo de Retorno com erro" — sempre há razão. Validação: `trim() não-vazio`. |
| **D4** | `Reset` zera `transmittedAt`, `remittanceId`, `rejectedAt`, `rejectionReason` ao voltar para `Approved`. Mantém `approvedAt + approvedBy` originais. | Title "renasce" para tentar outra remessa. `Rejected → Approved` deve produzir mesmo shape de `ApprovedPayable` que `Open → Approved`. |
| **D5** | Evento `PayableResetToApproved` carrega `previousRejectionReason: string` e `previousRemittanceId: RemittanceId`. | Auditoria — caso de uso `listar histórico de tentativas` precisa desses dados. |
| **D6** | `markOverdue` exige `at > dueDate` (handbook R5). | Não faz sentido marcar overdue antes de vencer. |
| **D7** | Erros por transição: `PayableNotApproved`, `PayableNotTransmitted`, `PayableNotRejected` (novos). `PayableNotOpen` já existe. | Specificidade > genericidade — diagnóstico claro de qual estado faltou. Inflar union de 7 → 16 é aceitável para clareza. |
| **D8** | Erros temporais seguem split estabelecido em FIN-AGG-PAYABLE-CORE: `PayableInvalid*Date` (malformação) + `Payable*DateBefore*` (timing). | Padrão validado no ticket anterior. |
| **D9** | `rejectionReason` aceita até 500 chars (typical CNAB return field). Erro `PayableRejectionReasonInvalid`. | Codes Bradesco CNAB 240 são descritivos. 500 é margem. |
| **D10** | `transmit(approved, remittanceId, at)` recebe `remittanceId: RemittanceId` injetado. Não gera novo. | O `RemittanceId` representa o ARQUIVO CNAB do qual o título faz parte. Arquivo é gerado em batch (use case do BC Integração Bancária); a transição apenas registra a associação. |
| **D11** | `parseTransmitted`, `parseRejected`, `parseOverdue` adicionados. | DO D§21 — refinement constructors completos para os 3 novos estados. |
| **D12** | **Atrasado → Pago** (confirmação tardia, handbook §6) **fora do escopo** — vai em `FIN-AGG-PAYABLE-PAYMENT`. | Coesão temática: este ticket é "saída para o banco" (Approved → Transmitted/Rejected/Overdue + recovery). Próximo é "saída bancária real" (Paid/Settled). |

---

## 3. Escopo

### 3.1. Arquivos editados

| Arquivo | Operação | Linhas |
| :--- | :--- | :--- |
| `src/modules/financial/domain/payable/types.ts` | edit | 85 → ~160 |
| `src/modules/financial/domain/payable/events.ts` | edit | 23 → ~65 |
| `src/modules/financial/domain/payable/errors.ts` | edit | 105 → ~230 |
| `src/modules/financial/domain/payable/payable.ts` | edit | 113 → ~280 |

### 3.2. Novos artefatos

- 3 estados refinados: `TransmittedPayable`, `RejectedPayable`, `OverduePayable`.
- 4 eventos: `PayableTransmitted`, `PayableRejected`, `PayableMarkedOverdue`, `PayableResetToApproved`.
- 9 novos errors (D7-D9): 3 `NotX`, 4 temporais (split), 1 reason-required, 1 reason-too-long.
- 4 novas transições: `transmit`, `registerRejection`, `markOverdue`, `resetToApproved`.
- 3 novos refinement constructors: `parseTransmitted`, `parseRejected`, `parseOverdue`.

### 3.3. Refactor compatível

- `ApprovedPayable` agora usa helper `ApprovalRecord` — mesmo shape final, build não quebra. 35 testes do core continuam passando.

---

## 4. Critérios de aceitação

### 4.1. Tipos (CA-1..CA-6)

| # | Critério |
| :--- | :--- |
| CA-1 | `TransmittedPayable` tem `status: 'Transmitted'`, herda `approvedAt + approvedBy`, adiciona `transmittedAt + remittanceId` |
| CA-2 | `RejectedPayable` adiciona `rejectedAt + rejectionReason` sobre TransmissionRecord |
| CA-3 | `OverduePayable` adiciona `markedOverdueAt` sobre TransmissionRecord |
| CA-4 | `Payable` union agora tem 5 variantes |
| CA-5 | `PayableStatus = 'Open' \| 'Approved' \| 'Transmitted' \| 'Rejected' \| 'Overdue'` |
| CA-6 | `PayableEvent` union agora tem 6 variants (2 originais + 4 novos) |

### 4.2. `transmit()` (CA-7..CA-11)

| # | Critério |
| :--- | :--- |
| CA-7 | `transmit(approved, remittanceId, at)` → ok com TransmittedPayable + PayableTransmitted event |
| CA-8 | Rejeita não-Approved → `PayableNotApproved(currentStatus)` |
| CA-9 | Rejeita malformação date → `PayableInvalidTransmissionDate` |
| CA-10 | Rejeita `at < approvedAt` → `PayableTransmissionDateBeforeApprovedAt(approvedAt, attemptedAt)` |
| CA-11 | Evento carrega `payableId + occurredAt + remittanceId` |

### 4.3. `registerRejection()` (CA-12..CA-17)

| # | Critério |
| :--- | :--- |
| CA-12 | `registerRejection(transmitted, reason, at)` → ok com RejectedPayable + PayableRejected event |
| CA-13 | Rejeita não-Transmitted → `PayableNotTransmitted(currentStatus)` |
| CA-14 | Rejeita malformação date → `PayableInvalidRejectionDate` |
| CA-15 | Rejeita `at < transmittedAt` → `PayableRejectionDateBeforeTransmittedAt(transmittedAt, attemptedAt)` |
| CA-16 | Rejeita reason vazia/whitespace → `PayableRejectionReasonRequired` |
| CA-17 | Rejeita reason > 500 chars → `PayableRejectionReasonTooLong` |

### 4.4. `markOverdue()` (CA-18..CA-21)

| # | Critério |
| :--- | :--- |
| CA-18 | `markOverdue(transmitted, at)` → ok com OverduePayable + PayableMarkedOverdue event |
| CA-19 | Rejeita não-Transmitted → `PayableNotTransmitted` |
| CA-20 | Rejeita malformação date → `PayableInvalidOverdueDate` |
| CA-21 | Rejeita `at <= dueDate` (R5 — só faz sentido após vencer) → `PayableOverdueBeforeDueDate(dueDate, attemptedAt)` |

### 4.5. `resetToApproved()` (CA-22..CA-26)

| # | Critério |
| :--- | :--- |
| CA-22 | `resetToApproved(rejected, at)` → ok com ApprovedPayable + PayableResetToApproved event |
| CA-23 | Mantém `approvedAt + approvedBy` originais |
| CA-24 | Drop de `transmittedAt + remittanceId + rejectedAt + rejectionReason` (campos AUSENTES no Approved final) |
| CA-25 | Evento carrega `previousRejectionReason + previousRemittanceId` (auditoria — D5) |
| CA-26 | Rejeita não-Rejected → `PayableNotRejected` |

### 4.6. Refinement constructors (CA-27..CA-29)

| # | Critério |
| :--- | :--- |
| CA-27 | `parseTransmitted(payable)` aceita só Transmitted; rejeita outros com `PayableNotTransmitted` |
| CA-28 | `parseRejected(payable)` aceita só Rejected |
| CA-29 | `parseOverdue(payable)` aceita só Overdue |

### 4.7. Operacionais (CA-30..CA-33)

| # | Critério |
| :--- | :--- |
| CA-30 | `pnpm run typecheck` verde |
| CA-31 | `pnpm run format:check` verde |
| CA-32 | `pnpm test` verde — todos os 38 testes do FIN-AGG-PAYABLE-CORE seguem GREEN |
| CA-33 | `pnpm run lint` verde |

### 4.8. Refactor compatível (CA-34)

| # | Critério |
| :--- | :--- |
| CA-34 | `ApprovedPayable` refatorado para `& ApprovalRecord` — shape final inalterado, testes do core sem mudança |

---

## 5. Estratégia de teste (W0)

**~30 testes novos** em arquivos existentes (todos sob `tests/modules/financial/domain/payable/`):

| Arquivo | Testes novos | Detalhamento |
| :--- | ---: | :--- |
| `types.test.ts` | +2 | Type-level smoke dos 3 novos estados (`TransmittedPayable`/`RejectedPayable`/`OverduePayable` extends checks) |
| `events.test.ts` | +4 | Shape de PayableTransmitted, PayableRejected, PayableMarkedOverdue, PayableResetToApproved |
| `errors.test.ts` | +9 | 1 teste por constructor + exhaustive switch com 16 variants |
| `payable.test.ts` | +18 | 4 transições × ~4-5 testes cada (happy + 2-3 invariantes + parse refinement) |
| **Total** | **+33** | |

**Total cumulativo** após este ticket: 38 + 33 = **71 testes** do agregado Payable.

### Fixtures novas

```ts
const VALID_REMITTANCE_ID = RemittanceId.generate();
const TRANSMISSION_DATE = D('2026-05-26T00:00:00Z'); // > approvedAt (25/05)
const REJECTION_DATE = D('2026-05-27T00:00:00Z');
const VALID_REJECTION_REASON = 'Agencia/conta invalida (motivo Bradesco AG)';
const OVERDUE_DATE = D('2026-06-16T00:00:00Z'); // > dueDate (15/06)

// Helper transmitted/rejected fixtures
const transmittedPayable = () => {
  const approved = approvePayable();
  const r = Payable.transmit(approved, VALID_REMITTANCE_ID, TRANSMISSION_DATE);
  if (!r.ok) throw new Error(`fixture transmittedPayable broken: ${JSON.stringify(r.error)}`);
  return r.value.payable;
};
```

---

## 6. Padronizações invariantes (lembrete)

### 6.1. Lições consolidadas

| Lição | Origem | Aplicação aqui |
| :--- | :--- | :--- |
| Sem indexed access em arrays | FIN-VO-TAX-ID W3 | sem loops |
| Sem shadowing de built-ins | FIN-VO-FITID W3 | helpers `classify`/`labelOf` |
| Sem async sem await | FIN-CLI-WIRE W3 | transições síncronas |
| Sem template `T \| undefined` | FIN-CLI-WIRE W3 | sem template suspeitos |
| Split malformação vs timing | FIN-AGG-PAYABLE-CORE W2/W3 | aplicar nas 4 novas transições |
| Tagged errors com evidência (D23) | regra de domínio | `Payable*Before*(state, attempted)` |
| `as <Brand>` único no return final | regra de domínio | preservar |

### 6.2. Cross-ticket — TS forçará atualização

A union `Payable` expande de 2 → 5 variants. **Consumers com `switch` exhaustivo sobre `Payable['status']` no projeto inteiro precisarão atualizar** ou compilação quebra. Boa propriedade.

Não há consumers ainda além dos próprios testes do agregado.

---

## 7. Pipeline previsto

| Wave | Skill | Outcome |
| :--- | :--- | :--- |
| **W0** | `tdd-strategist` | RED — ~33 testes novos falham por `cannot read property 'transmit' of undefined` (transições novas no objeto `Payable`) |
| **W1** | `main-session` | GREEN — atualiza 4 arquivos com adição compatível |
| **W2** | `code-reviewer` | APPROVED — split malformação/timing aplicado, refinement constructors completos, `ApprovedPayable` refactor compatível |
| **W3** | `ts-quality-checker` | ALL-GREEN round 1 (expectativa — lições consolidadas) |

---

## 8. Riscos e mitigações

| Risco | Mitigação |
| :--- | :--- |
| Refactor de `ApprovedPayable` para `& ApprovalRecord` quebrar testes do core | Shape final idêntico — teste type-level pega divergência se houver |
| Inflação da union `PayableError` (7 → 16) | Trade-off aceito (D7) — specificidade > genericidade. Refactor para erro genérico fica como tech-debt futura se ficar caótico |
| `markOverdue` confunde com `dueDate` (campo de PayableCore) | Erro `PayableOverdueBeforeDueDate` carrega ambos dueDate e attemptedAt — diagnóstico claro |
| `resetToApproved` perdendo campos sem rastreabilidade | D5 — evento `PayableResetToApproved` carrega `previousRejectionReason + previousRemittanceId` para auditoria |
| 16 variantes na union de erros torna match exhaustive longo | Aceitável — cada match tem 1 linha. Total ~16 linhas no switch é razoável. |
| `RemittanceId` ainda não usado em production code (até agora só existia o branded) | Este ticket é o primeiro consumer real |

---

## 9. Próximos tickets

```
FIN-AGG-PAYABLE-CORE         (M) ✅ closed-green
FIN-AGG-PAYABLE-TRANSMISSION (M) ← este
  └─ FIN-AGG-PAYABLE-PAYMENT (M) — Paid/Settled + processBankOutflow + authorizeSettlement + (Atrasado → Pago)
      └─ FIN-PORT-PAYABLE-REPO (S)
          └─ FIN-USECASE-APPROVE-PAYABLE (S) — primeiro use case na application
              └─ FIN-CLI-APROVAR-TITULO (S) — primeiro comando real na CLI
```

Após este ticket, o agregado terá **5 dos 7 estados** completos. Restam apenas os 2 estados finais (`Paid`, `Settled`) que cobrem o ciclo de "saída bancária real → conciliação".
