# Discovery — Épico #246 · Go-Live faseado do financeiro (single-org)

> Documento de **entendimento** (não-normativo) do épico [#246](https://github.com/ERP-Bem-Comum/core-api/issues/246). Mapeia as 6 fases, dependências e sequenciamento para fundamentar o fatiamento em features/tickets. A **Fase 1** está especificada em [`spec.md`](./spec.md); as demais ficam aqui como mapa até virarem specs próprias.

**Refinement**: 2026-06-23 (P.O. Alessandra + TL Gabriel · facilitação Claude). **Capacidade**: ~18 pts/sprint. **Meta**: Go-Live 1 operacional em ~4 sprints; épico total ≈ 10–12 sprints.

---

## Estratégia macro

Go-live **faseado**: por o núcleo operacional (Contas a Pagar + Conciliação) no ar cedo (Go-Live 1) e tratar Relatórios/Dashboard/Orçamento como **incrementos pós-go-live**. Single-org — multi-tenant (#53) é explicitamente adiado.

```
GO-LIVE 1 (~4 sprints, label go-live)          INCREMENTOS (label pos-go-live)
┌─────────────────────────────┐                ┌──────────────────────────────┐
│ Fase 1 · Núcleo operacional │  ──────────▶   │ Fase 3 · OCR                 │
│   Contas a Pagar            │                │ Fase 4 · Relatórios & Dash   │
│   Conciliação               │                │ Fase 5 · Plano Orçamentário  │
│ Fase 2 · Prontidão prod     │                │ Fase 6 · Reports c/ orçamento│
│   E-mail/auth + QA/deploy   │                └──────────────────────────────┘
└─────────────────────────────┘
```

---

## Mapa das fases

| Fase  | Tema                                 | Issues                                                                                                 | Label         | Status / dependência                                                                                                                           |
| ----- | ------------------------------------ | ------------------------------------------------------------------------------------------------------ | ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| **1** | **Núcleo · Contas a Pagar**          | #95 #115 #197 #162 #164 #167 #229 #110 #111 #89                                                        | `go-live`     | **Esta spec (025)**. #232/#231 (cadeia paidAt) anexadas como US1.                                                                              |
| **1** | **Núcleo · Conciliação**             | #141 #143 #146 #203 #161 #207 #172 #144                                                                | `go-live`     | **Esta spec (025)**. Depende da 016/017/cedente já entregues.                                                                                  |
| **2** | **Prontidão de produção**            | #117 #135 #131 #132 #133 + QA/deploy (TL)                                                              | `go-live`     | Spec à parte. E-mail = reset de senha. Umbler SMTP-only (ver memória `notif-email-135-operational`; #132 webhook inviável c/ Umbler → Resend). |
| **3** | **OCR**                              | #62 #145                                                                                               | `pos-go-live` | Mock-first + adapter real. Relaciona feature 018 (`FIN-DOCUMENTO-INGESTAO`).                                                                   |
| **4** | **Relatórios & Dashboard**           | #112 #114 #169 + tasks #235–#243                                                                       | `pos-go-live` | **Gate = #235** (read-model opção B, ADR-0048 R-4). Já fatiado em camadas 0–2.                                                                 |
| **5** | **Plano Orçamentário**               | #113                                                                                                   | `pos-go-live` | Pólo mais longo; portar do legado.                                                                                                             |
| **6** | **Reports dependentes de orçamento** | REP-3 (Realizado/Geral)                                                                                | `pos-go-live` | Depende da Fase 5.                                                                                                                             |
| **—** | **Fora do go-live (deferidos)**      | #58 #59 #61 (CNAB) · #179 (receivables) · #53 (multi-tenant) · #63 (cross-módulo) · #129 #130 (dívida) | —             | Pós ou nunca no go-live.                                                                                                                       |

---

## Decisões-âncora (do refinement)

1. **Faseado** — Go-Live 1 cedo; resto incremental.
2. **Single-org** — #53 (multi-tenant) adiado.
3. **E-mail no go-live** — reset de senha exige envio transacional (Fase 2).
4. **CSV/PDF client-side** (ou geração leve) — sem lib pesada de relatório.
5. **Categorização via ACL** (spike #233 → ADR-0048) — reusar feature 020, **não** portar a hierarquia legada; mapa `installments → payables` (`PAGO → 'Paid'`).
6. **Read-model opção B** (#235) — projeção própria do Dashboard/Reports alimentada por outbox (ADR-0015/0022), não query direta no transacional.

---

## Sequenciamento sugerido (caminho crítico do Go-Live 1)

```
Sprint 1-2 ── Fase 1 Contas a Pagar    Sprint 3 ── Fase 1 Conciliação    Sprint 4 ── Fase 2 prontidão
  US1 paidAt (#232/#231) ◀ começar       US2 diferença/parcial (#141)       e-mail/reset (#117/#135)
  US6 grid (#229/#164/#167/#162)         US2 transferências (#143)          QA + deploy (TL)
  US4 lançar (#115/#197/#89⊂)            US3 nomes/reopen (#207/#172/#203)  ───▶ 🚩 GO-LIVE 1
  US5 detalhe (#95)                      US7 export Nibo/PDF (#146/#144)
  US8 backfill (#111 / #110 em Partners) US2 bounds (#161)
```

**Por que `US1` (paidAt) primeiro**: continuação direta do ticket fechado hoje (`FIN-59a-2-MANUAL-PAYMENT-HTTP`/#228); menor atrito (3 arquivos já quentes); ancora o match de toda a Conciliação (US2/US3). Sem ela, a conciliação opera sobre datas que não fecham.

---

## Riscos — RESOLVIDOS no clarify (Session 2026-06-23, ver `spec.md` §Clarifications)

- ✅ **R-1 (#197)**: `competencia` = VO `Competencia` branded; `contaDebitoRef` = ref para `fin_cedente_accounts` (by-identity #160). Desbloqueia US4.
- ✅ **R-2 (#162)**: bulk due-date com **falha por item** (resultado por id).
- ✅ **R-3 (#164)**: "visões salvas" **no core-api** (`fin_saved_views`, filtros em colunas/serial, sem JSON — ADR-0020). Fica no go-live.
- ✅ **R-4 (#146/#144)**: export Nibo/PDF **adiado pós-go-live** — sai da Fase 1 (US7 deferida).
- ✅ **R-5 (#207/#172)**: `reconciledByName`/`closedByName` no response via read-model `fin_user_view` (outbox do auth, molde `fin_supplier_view`).
- ✅ **R-6 (#89)**: OCR/CBS-IBS/divergência de alíquota **fora** do go-live (Fase 3) — confirmado.
- ✅ **R-7 (isolamento)**: #110 (Partners) em ticket/sessão separada (ADR-0014) — confirmado.

> Efeito no escopo: US7 (export) sai do Go-Live 1; US6 ganha `fin_saved_views`; US3 ganha `fin_user_view` (novo consumidor de eventos do auth). #146/#144 movem para "Incrementos pós-go-live".
