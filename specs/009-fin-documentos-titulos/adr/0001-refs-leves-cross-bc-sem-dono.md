# ADR-0001 (feature 009): Referências cross-BC leves (UUID) sem módulo dono

**Status**: Proposed

**Data**: 2026-06-15

**Feature**: `specs/009-fin-documentos-titulos/`

**Decisores**: Gabriel (P.O./arquiteto) + agente Financeiro

> **Numeração**: local à feature. Se aceito, promover a `handbook/architecture/adr/` com número global livre
> (≥0040 — 0038/0039 já em uso em outras branches) e registrar em `handbook/CHANGELOG.md`.

## Contexto

O agregado `Document` referencia **fornecedor, contrato, plano orçamentário, categoria e programa**
(`gestao-documentos.md:25-30`). Fornecedor (`SupplierRef`, `partners/public-api`) e Programa (`ProgramsReadPort`,
`programs/public-api`) têm dono. **Plano Orçamentário e Categoria não têm módulo dono** — não existe
`handbook/domain_questions/orcamento/` nem modelagem de Orçamento (verificado). O `/speckit-clarify` (Q1) decidiu
seguir a fatia 1 com refs leves; (Q2) validar apenas formato. Precedente vivo: `contracts.budgetPlanId`/`programId`
como UUID leve (`contracts/domain/contract/types.ts:33-37`). Aplicam-se ADR-0006 (public-api), ADR-0014 (isolamento),
ADR-0031 (refs por ID branded).

## Decisão

O Financeiro guarda **contrato, plano orçamentário, categoria e programa como referências UUID opcionais** (branded
primitivo: `ContractRef`/`BudgetPlanRef`/`CategoryRef`/`ProgramRef`), com **smart constructor que valida apenas o
formato (UUID v4)** — sem cross-check de existência nesta fatia. **Fornecedor** é obrigatório, reusando `SupplierRef`
de `partners/public-api`. Nenhum domínio alheio é importado (ADR-0006). O módulo **Orçamento** (dono de plano/categoria)
será um SDD próprio na fatia de Conciliação, quando passa a ter função real (consolidação de gasto).

## Citação canônica _(obrigatória — princípio IX)_

> **[CITAÇÃO PENDENTE]** — trecho ≥4 linhas (Vernon, _Implementing DDD_ — referência entre agregados por identidade)
> via `skills_citar` (`/acdg-skills:software-architect`), indisponível nesta sessão interativa.

## Alternativas consideradas

- **Criar o módulo Orçamento agora** — rejeitada: não há fonte de domínio; exigiria elicitar um BC inteiro do zero
  (big design up front) para preencher um campo que, na fatia 1, é só classificação.
- **Refs obrigatórias com cross-check de existência** — rejeitada: acopla a fatia ao `partners` read port e a um
  Orçamento inexistente; trava lançamentos.

## Consequências

- **Positivas**: desbloqueia a fatia; mantém `fin_*` isolado; domínio puro (só formato, sem I/O).
- **Negativas / trade-offs**: refs órfãs temporárias — integridade referencial de plano/categoria só quando o Orçamento
  existir; a do fornecedor pode ser reforçada na borda HTTP depois.
- **Impacto em BCs / outbox / migrations**: nenhuma FK cross-schema (proibida por ADR-0014); quando o Orçamento existir,
  migrar `BudgetPlanRef`/`CategoryRef` para integridade lógica via read port (sem refactor de domínio).
