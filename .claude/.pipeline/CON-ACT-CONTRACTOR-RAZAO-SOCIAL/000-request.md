# 000-request — CON-ACT-CONTRACTOR-RAZAO-SOCIAL

> Card de origem: `handbook/tickets/todo/CON-ACT-CONTRACTOR-RAZAO-SOCIAL.md` (handoff do front; estado
> revisado 2026-06-15). Branch: `feat/usr-me-photo-display` (continuação, #36).

## Escopo

Quando o contratado de um contrato é um **ACT**, a identificação exibida deve ser a **Razão Social**
(`corporateName`) da instituição parceira — hoje o front recebe `snapshot.name` = nome do objeto do acordo.

**Adotamos a opção 1 do card (gravar `snapshot.name` = `corporateName` para ACT)**, decidida por evidência
no código do front (critério: "o mais confortável para o front"):

- O fallback de exibição do front é `name ?? corporateName ?? fantasyName` (`name` **primeiro**) —
  `contract-row.component.tsx:93`, `contract-list.view-model.ts:188`. Como `name` nunca é nulo, a **opção 2**
  (campos aditivos) **não** mostraria a razão social sem inverter o fallback **e** ampliar o BFF
  (`mapContractorToDomain`/`PartnerSnapshot` só conhecem `{id,name,document}`).
- Com a **opção 1**, o front exibe `name` (já faz) e passa a ver a razão social — **zero mudança no front**.
- O front **não usa** o nome do objeto do ACT em nenhuma tela (verificado) → sobrescrever `name` não causa
  perda funcional.

**Direção cross-módulo:** `contracts → partners`, pela `ContractorReadPort`/`ContractorView` (ADR-0032,
composição na borda) — **já existente, sem ciclo**. O dado-fonte já existe no agregado `Act`
(`src/modules/partners/domain/act/types.ts`); só falta expô-lo na view e usá-lo como `name`.

## Mudanças

1. **Partners (public-api)** — `src/modules/partners/public-api/contractor-view.mapper.ts`:
   `ActView` (`:59-68`) + `actToView` (`:111-120`) ganham `corporateName` (de `Act`). Molde da
   `FinancierView`, que já carrega `corporateName` (`:38,90`).
2. **Contracts (snapshot)** — `src/modules/contracts/adapters/http/contractor-composition.ts`:
   `viewToSnapshot` (`:41-50`) — no ramo **act**, `name = view.corporateName ?? view.name` (razão social
   como identificação). Demais tipos inalterados. `ContractorSnapshot` e `contractorSnapshotSchema`
   **não mudam** (sem campo novo).
3. **Partners (agregador de seleção)** — `src/modules/partners/adapters/http/partner-aggregate-query.ts`:
   `actItem` → `name = act.corporateName ?? act.name`, para a inclusão de contrato selecionar o ACT pela
   razão social (`PartnerListItem`/schema do `GET /partners` **não mudam** — `name` já existe).

## Fora de escopo

- **Opção 2** (campos `corporateName`/`fantasyName` aditivos no snapshot) — rejeitada: exigiria inverter o
  fallback do front (3 lugares) + ampliar o BFF; mais trabalho no front que a opção 1.
- `fantasyName` no snapshot — não necessário (o front exibe só `name`).
- Mudar o agregado `Act` (já tem `corporateName`).
- Coluna de contagem Contratos/Aditivos e gaps de grid (**adiados** — decisão de painel 2026-06-15,
  saída read-model/ADR-0022).
- Lista `GET /contracts`: confirmar no W0 se compõe o snapshot do contratado; se **não** compõe, fica fora.

## Critérios de aceitação

1. `GET /contracts/:id` (detalhe) com contratado **act** → `contractor.snapshot.name` = Razão Social
   (`corporateName`) do Act.
2. `POST /contracts` (criação) com contratado **act** → resposta com `snapshot.name` = razão social.
3. Agregador de seleção (`GET /partners`) → item de **act** tem `name` = razão social (a inclusão exibe a
   razão social na seleção).
4. Contratado **supplier**/**collaborator**/**financier** → `snapshot.name` inalterado (nome do parceiro),
   **sem regressão**.
5. **Degradação graciosa** preservada: falha/timeout do read de Parceiros → `snapshot: null` (FR-006).
6. Gate W3 verde (typecheck + format:check + lint + test) — regressão zero.

## Size

S — aditivo na view + ajuste de mapeamento; sem novo port, sem campo novo no contrato de resposta.
Toca `partners/public-api` + `contracts/adapters/http` (interação pela direção já sancionada — ADR-0032).
