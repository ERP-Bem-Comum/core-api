# W2 — REVIEW — COLLABORATORS-HTTP-EDIT

> Skill: `code-reviewer` (audit read-only). **Round 1 — APPROVED.**

## Veredito: ✅ APPROVED

| Regra | Status | Evidência |
| :--- | :--- | :--- |
| Domínio puro | ✅ | `Collaborator.edit` valida cadastrais; preserva pessoais+estado via spread; Result/immutable. |
| RBAC do vital | ✅ | regra no use case (cpf mudou + !canEditSensitive → 403); email não-vital com unicidade (409). |
| ADR-0006/0024/0027/0033 | ✅ | reusa `makeHasPermission`; PUT /api/v1; Zod (updateCollaboratorBodySchema = create cadastral). |
| Result→HTTP | ✅ | sendWriteError; 403 sensitive-forbidden, 409 cpf/email-duplicate, 404, 400, 422. |
| Consistência | ✅ | espelha FINANCIERS/SUPPLIERS-HTTP-EDIT. PUT cadastral fiel ao legado (pessoais via complete-registration). |

## Achados
- Hook `hasPermission` obrigatório em CollaboratorsHttpHooks → 6 testes de collaborator ajustados.

## Observações
- PUT NÃO edita campos pessoais (decisão: fiéis ao legado UpdateCollaborator; pessoais via complete-registration). Se a P.O. quiser editar pessoais por PUT, é ajuste futuro.
- email tratado como não-vital (só CPF é vital) — consistente com a decisão "vital = identidade natural".

## Gate
lint/typecheck/format verdes.

## Próximo passo
W3.
