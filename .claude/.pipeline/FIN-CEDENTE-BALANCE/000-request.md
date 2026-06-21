# FIN-CEDENTE-BALANCE — saldo atual na listagem de contas-cedente (#89c F1)

> Follow-up F1 do épico Lançar Documento (#64). Decisão: "resolver tudo". Size **S**. Módulo financial.

## Escopo
`GET /financial/cedente-accounts` passa a expor `currentBalanceCents` por conta (dropdown "Pagar da Conta, com saldo").

- Semântica: saldo atual = `openingBalanceCents` + Σ assinado de TODOS os extratos importados (= `closingBalanceCents` do `buildStatementView` sobre todo o histórico). Sem extratos → = abertura. Abertura ausente → 0.
- Novo use-case `listCedenteAccountsWithBalance` (cedenteStore.list + statements.listTransactionsByPeriod por conta, N+1 sobre as poucas contas; clock p/ `to=now`).
- Schema de item de lista `cedenteAccountListItemSchema` (estende o base + currentBalanceCents) — só a LISTA muda; rotas single-account intactas.

## CA
- CA1 lista expõe currentBalanceCents; CA2 sem extratos = abertura; CA3 com extratos = abertura+Σ.
