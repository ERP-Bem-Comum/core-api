# FIN-APPROVE-AUTHORITY-ENFORCE — escopo

**Issue:** [#609](https://github.com/ERP-Bem-Comum/core-api/issues/609) · **Size:** M · **Branch:** `fix/609-approve-authority-enforce`

---

## Problema

`approveDocument` (`src/modules/financial/application/use-cases/approve-document.ts`) **não recebe**
`ApproverAuthority` e **não chama** `checkApprover`. `Document.approve` (`document.ts:248-279`) só
troca o status e grava `approvedBy`. A rota (`plugin.ts:754-758`) exige apenas a permissão genérica
`payable:approve`.

`checkApprover`/`escalate` são chamados **somente** em `submit-draft.ts:63,70` e
`save-document.ts:265,273` — ou seja, na **indicação/escalação**, quando o documento é submetido.

Resultado: a alçada é **roteamento** (quem *deveria* aprovar), não **controle de acesso** (quem
*pode* aprovar).

## Escopo — FATIADO

Este ticket cobre **apenas o furo de valor**. A issue #609 descreve dois:

| Furo | Neste ticket? | Motivo |
| --- | --- | --- |
| **Valor** — alçada não validada no ato de aprovar | ✅ **sim** | Defeito puro, sem ambiguidade |
| **Identidade** — `approverRef` ignorado (A aprova documento indicado para B) | ❌ **não** | Exige decisão de produto (CA4 da issue) |

O furo de identidade não é implementável sem a P.O. decidir entre: só o indicado aprova / qualquer
um com alçada aprova e a trilha registra / manter como sugestão. Fica para ticket próprio.

**Também fora:** cascata no ato de aprovar (o `escalate` é do submit), mudança na política opt-in
(#299), e qualquer alteração no RBAC.

## Critérios de aceite

| # | Dado | Quando | Então |
| --- | --- | --- | --- |
| **CA1** | valor líquido > alçada do usuário autenticado | ele chama `approve` | **422** com `approver-limit-exceeded`; documento permanece `Open` |
| **CA2** | usuário com alçada suficiente | aprova | fluxo atual preservado, sem regressão |
| **CA3** | papel **sem** `approval_limit_cents` (alçada opt-in não configurada) | aprova | **aprova** — regra binária da P.O. (#299) preservada |
| **CA4** | usuário sem `canApprove` na autoridade lida | aprova | `approver-missing-permission` |
| **CA5** | reader não injetado (composição sem o port) | aprova | comportamento atual — gate opt-in, igual ao `submit-draft` |
| **CA6** | a suíte atual | executa | verde; nenhum teste passa a exigir alçada configurada |

### Por que 422 e não 403

A issue #609 pedia 403. **Corrigido aqui:** `writeErrorStatus` (`error-mapping.ts:109-116`) não tem
categoria 403 — o default é 422, e `approver-limit-exceeded` **já sai como 422** pelo `submit-draft`.
Usar 403 nesta rota produziria o mesmo slug de erro com status diferente conforme o caminho, o que é
pior que o status "errado". Se 403 for desejado, é mudança transversal do `error-mapping`, em ticket
próprio.

## Definition of Done

- [ ] W0 RED cobrindo CA1–CA6 antes de tocar `src/`
- [ ] W1 GREEN com implementação mínima
- [ ] W2 read-only aprovado
- [ ] W3 verde: `typecheck` + `format:check` + `lint` + `test`
- [ ] Contagem de testes ≥ baseline
- [ ] Decisão do furo de identidade encaminhada à P.O. (não implementada aqui)

## Notas de execução

- **Reaproveitar o padrão do `submit-draft.ts:59-63`**: `approverAuthorityReader` opcional nas deps,
  gate `!== undefined`. É o que preserva o CA5 e não quebra os testes existentes.
- A validação é contra o **usuário autenticado** (`cmd.approvedBy`), não contra o `approverRef` —
  essa é a diferença em relação ao `submit-draft`, que valida o indicado.
- `checkApprover` já trata `limit === null` → aprova (CA3 sai de graça).
- Nenhum erro novo precisa ser criado: `ApprovalError` já existe e já tem mensagem PT-BR mapeada
  (`error-mapping.ts:230-231`).
