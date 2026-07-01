# FIN-SUBMIT-APPROVER-CASCADE — escopo

> Issue #297 (follow-up da feature 028/#289, épico #89). Módulo **financial**. Size **M**.
> Pipeline W0→W3. Leva a **cascata de alçada** (US3) ao caminho **submit Draft→Open**, hoje só no create.

## Problema (paridade incompleta, não bug)

A cascata automática de alçada opera só no lançamento direto (`save-document.ts:236-267`): indicado insuficiente → `escalate` → reencaminha ao próximo apto + evento `ApproverEscalated`. No **submit** (`submit-draft.ts:47-54`) só há o gate do POLICY (`checkApprover`) — alçada insuficiente **bloqueia** (`approver-limit-exceeded`) em vez de **encaminhar**. Hoje o usuário precisa trocar o aprovador no rascunho à mão.

## Causa-raiz

`Document.submit(draft)` (`document.ts:580`) re-deriva o aprovador do rascunho ao delegar para `create()` (`approverRef: draft.approverRef`, linha 614). O use-case não tem gancho para injetar o aprovador **efetivo** encaminhado nem chamar `escalate`.

## Decisão de design (registrada)

- **Override opcional no agregado:** `Document.submit(draft, approverRefOverride?)` — quando presente, usa o efetivo em vez de `draft.approverRef`. Mínimo, sem novo método, sem migration.
- **Cascata no use-case espelha o create:** `submit-draft.ts` faz `checkApprover` → em `approver-limit-exceeded`, `reader.list()` + `escalate` → re-submit com o efetivo → emite `ApproverEscalated` no outbox. Reusa `escalate` (`approval-policy.ts`) + `ApproverAuthorityReader` + evento `ApproverEscalated` já existentes. **Sem migration.**
- **Só `approver-limit-exceeded` aciona a cascata** — demais erros (`approver-not-found`/`approver-missing-permission`) propagam direto, igual ao create.
- **`ApproverEscalated` vai só ao outbox**, não à timeline (espelha o create; o evento não é marco de estado — `events.ts:91-98`).

## Escopo (in)

1. **Domínio** (`document.ts`): `submit` ganha 2º parâmetro opcional `approverRefOverride?: UserRef`; `approverRef: approverRefOverride ?? draft.approverRef` no `create`.
2. **Application** (`submit-draft.ts`): bloco de cascata espelhando `save-document.ts` — `escalate` + re-submit + `ApproverEscalated`; união `SubmitDraftError` ganha `UserRef.UserRefError`.

## Fora de escopo

- Mudar o comportamento do **create** (já entregue na 028/PR #296) — regressão zero.
- Migration / novo evento (o `ApproverEscalated` já existe e já vai ao outbox).
- Mudar o POLICY (`checkApprover`/`escalate`) — funções puras reutilizadas como estão.

## Critérios de aceite

- **CA1 (encaminha):** Draft c/ aprovador insuficiente **E** existe outro apto (`payable:approve` + alçada ≥ líquido) → submit grava o `approverRef` **efetivo** + emite `ApproverEscalated` (indicado→efetivo). Paridade com CA6 do create.
- **CA2 (nenhum apto):** nenhum aprovador com alçada suficiente e **>1** candidato → `no-approver-with-sufficient-limit`; documento **permanece Draft**; sem evento. (HTTP: 422 PT.)
- **CA3 (suficiente):** aprovador do rascunho já suficiente → submete (Draft→Open) **sem** escalar (sem `ApproverEscalated`). Guard de regressão.

## Pipeline pré-estruturada (agentes por wave)

| Wave | Atividade | Especialista |
| :--- | :--- | :--- |
| W0 | testes RED (use-case CA1/CA2 + CA3 regressão) | skill **`tdd-strategist`** |
| W1 | override no `submit` + cascata no `submit-draft` | skill **`ts-domain-modeler`** (agregado) + **`ports-and-adapters`** (use-case) |
| W2 | audit read-only | skill **`code-reviewer`** |
| W3 | gate (`typecheck`+`format`+`lint`+`test`) | skill **`ts-quality-checker`** |

## Definition of Done

Gate W3 verde. Submit encaminha ao próximo aprovador apto com `ApproverEscalated`, paridade com o create; regressão zero no create. Fecha #297.
