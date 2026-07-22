# W2 — REVIEW (read-only) · FIN-SUBMIT-APPROVER-CASCADE

Skill: **`code-reviewer`**. Round 1. Escopo: `document.ts` + `submit-draft.ts` (+49/−15).

## Veredicto: **APPROVED**

## Checklist por regra

| Regra | Resultado |
| :-- | :-- |
| Domínio puro (`document.ts`) | OK — `submit` ganha param opcional; delega a `create`; sem I/O; `approverRefOverride ?? draft.approverRef`. |
| Application (validar→fetch→domain→persist→publish) | OK — sequência preservada; eventos só após save; cascata entre domain e persist (espelha `save-document.ts`). |
| Reuso de puros | OK — `escalate`/`checkApprover` (`approval-policy.ts`) e evento `ApproverEscalated` reusados; **sem** duplicar regra nem migration. |
| Paridade com o create | OK — mesma lógica: só `approver-limit-exceeded` escala; demais erros propagam; efetivo ≠ indicado (indicado é insuficiente por definição, filtrado por `escalate`). |
| Evento ao outbox, não à timeline | OK — `cascadeEvents` no 4º arg de `repo.save`; timeline usa `outcome.events[0]`. |
| CA2 não persiste | OK — erro de `escalate` retorna antes do `save`; documento fica Draft (teste confirma). |
| Narrowing sob `await` | OK — `indicatedApproverRef` capturado em const antes dos awaits (evita widening `UserRef \| null`). |
| Idioma / sintaxe TS | OK — código EN, comentários PT, erro EN kebab; `import type` p/ tipos, `.ts` nos imports. |
| Não-regressão | OK — único caller de `submit` é o próprio use-case; param opcional; typecheck verde; cluster 29/29. |

## Observações (não-bloqueantes)

- **Duplo `Document.submit`** na escalação (inicial + re-submit) — computação pura barata, espelha o duplo-create do `save-document.ts`. Aceitável; não vale abstrair (YAGNI).

## Testes

3/3 GREEN (CA1/CA2 + CA3 regressão) + cluster vizinho 29/29. Nada a corrigir.
