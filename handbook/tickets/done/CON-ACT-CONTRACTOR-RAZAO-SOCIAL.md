# CON-ACT-CONTRACTOR-RAZAO-SOCIAL — Identificação do ACT como contratado deve ser a Razão Social

**Status**: todo (aguardando backend)
**Origem**: solicitação da stakeholder (web-app v2) — grid/detalhe/inclusão de **contratos** quando o contratado é um **ACT**.

> ---
> **🔄 Estado verificado no core-api — 2026-06-15** · revisão pós-handoff (conteúdo abaixo = visão do front em 2026-06-09/14).
>
> - **Já implementado:** nada do que o ticket pede. O snapshot do contratado segue com `{ name, document, updatedAt, bankAccount?, pixKey? }` (`contractorSnapshotSchema` em `src/modules/contracts/adapters/http/schemas.ts:403-409`). `corporateName`/`fantasyName` **não existem em nenhum arquivo** do módulo `contracts` (grep zero hits). Para ACT, `snapshot.name` continua sendo o nome do objeto do acordo: o construtor `viewToSnapshot` (`src/modules/contracts/adapters/http/contractor-composition.ts:41-50`) só preenche bankAccount/pixKey no ramo `supplier`; ACT cai no `else` (linha `50`) com apenas name/document/updatedAt.
> - **Escopo real restante:** o dado-fonte existe em Parceiros — o agregado `Act` tem `corporateName` **e** `fantasyName` (`src/modules/partners/domain/act/types.ts:23-37`), mas o mapper `actToView` **não os expõe**: a `ActView` (`src/modules/partners/public-api/contractor-view.mapper.ts:59-68`) não carrega `corporateName`/`fantasyName` (a `FinancierView` carrega `corporateName`, linhas `33-43`, mas a de ACT não). Logo, entregar a opção 1 ou 2 do ticket exige: (a) expor `corporateName`/`fantasyName` na `ActView` + `actToView`; (b) propagar pela `ContractorReadPort`; (c) ajustar `viewToSnapshot` e o `contractorSnapshotSchema`; (d) fazer o mesmo no agregador de busca/seleção de contratado. O ticket **CONTRACTS-CONTRACTOR-METADATA-DOMAIN** (`.claude/.pipeline/CONTRACTS-CONTRACTOR-METADATA-DOMAIN/`, closed-green 2026-06-06) **não cobre** isto — escopo dele foi `contractor.{type,id}` + `observations`/`email`/`telephone`, sem `corporateName`.
> - **Veredito:** NÃO FEITO (0% no lado Contracts; mitigado pelo fato de o dado já existir no agregado Act de Parceiros, faltando só expô-lo e propagá-lo).
> ---

## Problema

Quando o contratado de um contrato é um **ACT**, a identificação exibida (grid de contratos, tela de detalhe e bloco "Contratado" da inclusão) usa o **nome do objeto do acordo** (ex.: "Acordo de Cooperação de educação"). A stakeholder quer que a identificação seja a **Razão Social** da instituição parceira (campo `corporateName` em "Dados da Instituição Parceira" do ACT).

O front exibe `contractor.snapshot.name`. Hoje o `core-api` envia, no snapshot do contratado, **apenas**:

```jsonc
"snapshot": { "name": "string", "document": "string", "bankAccount": ..., "pixKey": ... }
```

Para ACT, `name` = nome do objeto. **Não há** `corporateName`/razão social no snapshot → o front não consegue exibir a razão social (nem no grid, nem no detalhe, nem na inclusão pós-persistência).

> O grid de **ACT no módulo de Parceiros** já mostra a Razão Social (`corporateName`) — este ticket é só sobre o ACT **como contratado em Contratos**.

## Pedido ao backend

Para contratado do tipo **act**, no snapshot do contratado (criação + GET detalhe/lista de contratos), **uma das opções**:

1. **(preferido)** Gravar `snapshot.name` = **Razão Social** (`corporateName`) do ACT — assim o front não muda; OU
2. Acrescentar `snapshot.corporateName` (+ opcional `fantasyName`) ao snapshot do contratado; o front passa a exibir `corporateName ?? name` para ACT.

Também alinhar o **agregador de busca de contratado** (usado na inclusão): para ACT, o item retornado deve permitir identificar pela Razão Social (mesmo critério acima), para a seleção já exibir a razão social.

## Aceite
- Grid de contratos, detalhe e inclusão exibem a **Razão Social** do ACT como identificação do contratado.
- Consistência entre o que aparece na inclusão (seleção) e o que fica persistido (detalhe).

## Notas / estado do front
- Front pronto para exibir: o tipo `Contractor` já tem `corporateName?`/`fantasyName?`. Quando o backend enviar (opção 2) ou ajustar o `name` (opção 1), o front reflete sem retrabalho.
- Sem este backend, o front mantém o nome do objeto (dado atual) — não há razão social disponível no snapshot.
