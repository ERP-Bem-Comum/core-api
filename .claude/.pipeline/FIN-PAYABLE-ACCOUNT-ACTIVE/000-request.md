# FIN-PAYABLE-ACCOUNT-ACTIVE — escopo

> Issue #293 (sub-issue da #89 "Lançar Documento"), item **"Pagar da Conta"**. Módulo **financial**. Size **S**.
> Pipeline W0→W3. Endurecimento da regra **"contas ativas"** no seletor de pagamento e no lançamento.

## Estado herdado (NÃO refazer)

O núcleo do seletor "Pagar da Conta" **já existe** (fatia **#89c F1**):

- `GET /financial/cedente-accounts` (`plugin.ts:1120`) lista as contas **com `currentBalanceCents`** (saldo = abertura + Σ extratos) via `listCedenteAccountsWithBalance` (`application/use-cases/list-cedente-accounts-with-balance.ts`). → CA1/CA2 da #293 atendidos.
- Bind via `contaDebitoRef` no `save-document` (`save-document.ts:138-144`) — valida a conta por **existência** (`findById`). → CA3 da #293 atendido.

## Gap real (único)

A regra **"contas ativas"** não é enforçada em lado nenhum:

1. `listCedenteAccountsWithBalance` chama `store.list()` **sem filtrar status** → conta `Closed` aparece no seletor de pagamento.
2. `save-document.ts:138-144` valida a conta-débito **só por existência** → aceita lançar pagamento contra conta `Closed`.

O agregado já modela `CedenteAccountStatus = 'Active' | 'Closed'` e expõe o predicado puro `isActive` (`domain/cedente/cedente-account.ts:55`). Não há domínio novo a criar — só **aplicar** o predicado.

## Decisão de design (registrada)

- **Filtro no use-case, predicado no domínio.** `listCedenteAccountsWithBalance` ganha param opcional `{ onlyActive?: boolean }`; quando `true`, filtra o resultado com o `isActive` do domínio. A *decisão* de "o que é ativo" continua no domínio; o use-case só aplica. (Regra application: "se um `if` decide estado de negócio, mover para `domain/`" — aqui o estado é decidido por `isActive`, no domínio.)
- **Backward-compatible na borda.** A rota `GET /financial/cedente-accounts` ganha querystring opcional `status?: 'active' | 'all'`. **Ausente → comportamento atual (todas as contas)**, para não quebrar a view de gestão (CRUD/encerramento, que precisa ver `Closed`). O seletor de pagamento do front passa `?status=active`.
- **Guard no lançamento.** No bloco de validação da conta-débito do `save-document`, após `findById` retornar conta não-nula, rejeitar se `!isActive` com erro novo `cedente-account-closed` (kebab EN), status **422** (mesma classe de `cedente-account-not-found`), mensagem PT no `error-mapping.ts`.

## Escopo (in)

1. **Application** (`list-cedente-accounts-with-balance.ts`): param opcional `{ onlyActive?: boolean }`; filtra com `isActive` quando `true`. Default = inclui todas (sem regressão).
2. **Application** (`save-document.ts`): no bloco `contaDebitoRef` (138-144), `return err('cedente-account-closed')` quando a conta encontrada não é `isActive`.
3. **Domínio** (`SaveDocumentError`): adicionar o membro `'cedente-account-closed'` à união.
4. **Borda** (`adapters/http`):
   - `GET /financial/cedente-accounts`: querystring Zod `status?: 'active' | 'all'`; handler passa `onlyActive: req.query.status === 'active'`.
   - `error-mapping.ts`: registrar `cedente-account-closed` (lista de códigos + mensagem PT + status 422).

## Fora de escopo

- **Coluna de saldo** já entregue (#89c F1) — não tocar o cálculo.
- Projeção de saldo via conciliação (#59/#60) — segue como dependência futura registrada na #293.
- Remover/alterar a listagem geral (management precisa de `Closed`) — só adicionar o filtro opt-in.
- Bloquear **edição** de documento já vinculado a conta depois encerrada — o guard é no caminho de criação/submit do `save-document`; edge de "conta encerrada após vínculo" fica fora (registrar se aparecer).

## Critérios de aceite

- **CA1** `listCedenteAccountsWithBalance({ onlyActive: true })` **exclui** contas `Closed` do resultado.
- **CA2** `listCedenteAccountsWithBalance()` (sem flag) mantém o comportamento atual (inclui `Closed`) — backward-compat.
- **CA3** (borda) `GET /financial/cedente-accounts?status=active` (autenticado, `bank-account:read`) → 200 **sem** contas `Closed`; **sem** querystring → 200 com todas (compat).
- **CA4** `saveDocument` com `contaDebitoRef` de conta `Closed` → `err('cedente-account-closed')`.
- **CA5** `saveDocument` com `contaDebitoRef` de conta `Active` → segue normal (não regride o caminho atual).
- **CA6** (borda) lançar documento com conta-débito encerrada → **422** + mensagem PT (`error-mapping`).

## Pipeline pré-estruturada (agentes por wave)

| Wave | Atividade | Especialista |
| :--- | :--- | :--- |
| W0 | testes RED (use-case CA1/CA2 + save-document CA4/CA5 + rota CA3/CA6) | skill **`tdd-strategist`** |
| W1 | filtro no use-case + guard no save + união de erro | skill **`ports-and-adapters`** |
| W1 | querystring `status` + schema Zod + error-mapping | agente **`fastify-server-expert`** ↔ **`zod-expert`** |
| W2 | audit read-only | skill **`code-reviewer`** |
| W3 | gate (`typecheck`+`format`+`lint`+`test`) | skill **`ts-quality-checker`** |

## Definition of Done

Gate W3 verde. Seletor de pagamento filtra `Active` sob `?status=active` sem quebrar a listagem geral; `save-document` rejeita conta-débito `Closed` com 422/PT. Fecha #293.
