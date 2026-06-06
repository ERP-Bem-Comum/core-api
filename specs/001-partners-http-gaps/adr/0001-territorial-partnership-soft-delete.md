# ADR-0001 (feature): Parceria territorial como Entity persistida com soft-delete (resolve D9 do ADR-0031)

**Feature**: `specs/001-partners-http-gaps/` · **Status**: Proposto
**Data**: 2026-06-06 · **Consultor**: `/acdg-skills:software-architect` + `/acdg-skills:ddd-architect`
**Relacionado**: ADR-0031 (módulo `partners`, **questão aberta D9**), ADR-0014 (isolamento `par_*`), ADR-0020 (MySQL/Drizzle), ADR-0033 (`/api/v1` espelho legado)

## Contexto

O ADR-0031 deixou **aberta a decisão D9**: _"partner-states/municipalities: hard delete (legado) vs
soft-delete padronizado"_. Hoje a geografia no core-api é só **catálogo read-only** (`listStates`,
`listMunicipalitiesByUf`) — **sem tabela, sem toggle**. O frontend (épico `008-partners`) precisa
marcar/desmarcar estados e municípios como parceiros com persistência, e opera em **mock total** até a
decisão. O RECON (`recon.md`) confirmou que o módulo já tem um **padrão consolidado de soft-delete**
(`active` + `deactivated_at` + CHECK de coerência) em `parFinanciers`/`parSuppliers`/`parCollaborators`.

## Decisão

1. A parceria territorial é modelada como **Entity persistida** (`PartnerState` por `uf`,
   `PartnerMunicipality` por `ibgeCode`), **cada associação um agregado pequeno**, com **soft-delete
   padronizado** (`active` + `deactivated_at` + CHECK `(active=FALSE) = (deactivated_at IS NOT NULL)`) —
   **idêntico ao padrão existente** do módulo. Desmarcar = inativar; marcar = criar/reativar (idempotente).
2. Novas tabelas `par_states` / `par_municipalities` (prefixo `par_*`, ADR-0014), migrations geradas por
   Drizzle Kit (ADR-0020). O **catálogo geográfico** (`domain/geography/`) permanece read-only imutável; a
   parceria o **referencia** por `StateAbbreviation`/`IbgeCode` (branded já existentes).
3. Esta decisão **resolve a D9** no escopo da feature. Deve ser **promovida a um ADR do handbook** que
   feche formalmente a D9 do ADR-0031 (registrado em `handbook/CHANGELOG.md`) na entrega.

**Fundamentação canônica** (agregados pequenos, consistência em fronteiras):

> Chapter 10: Aggregates
> Aggregates are probably the least well understood among DDD's tactical tools. Yet, if we apply some rules of thumb, Aggregates can be made simpler and quicker to implement. You will learn how to cut through the complexity barrier to use Aggregates that create consistency boundaries around small object clusters... The result of their efforts led to a deeper understanding of their Core Domain. We look in on how the team corrected their mistakes through the proper application of transactional and eventual consistency...
> — *(Linha 470, p. 1, Vaughn Vernon, *Implementing Domain-Driven Design*)*

Cada toggle territorial é uma transação isolada sobre um agregado de 1 raiz — a "consistency boundary around
small object clusters" de Vernon. Não há agregado territorial grande agrupando UFs/municípios.

## Por que soft-delete (e não hard delete do legado)

- **Consistência de padrão**: o módulo inteiro usa soft-delete; hard delete seria a exceção, aumentando a
  carga cognitiva e divergindo do CHECK já estabelecido.
- **Auditabilidade**: `deactivated_at` preserva quando a parceria foi desfeita (o legado perdia esse fato).
- **Reversibilidade barata**: reativar = `active=true` (sem reinserir/recriar histórico).
- **Custo aceito**: linhas inativas acumulam; mitigado por índice em `active` e volume baixíssimo
  (≤27 UFs; municípios na casa de milhares no máximo).

## Consequências

- **Positivas**: destrava US-002 (estados/municípios) no front (sai do mock); padrão único de soft-delete no
  módulo; D9 fechada; troca mock→real no front sem tocar UI/ViewModel.
- **Negativas / custo**: 2 tabelas + migrations + repos (drizzle + in-memory) + plugin novo; divergência
  consciente com o `domain.md` do front (que modelou como VO de referência — lá sem persistência).
- **Reversibilidade**: a Entity é pequena; migrar para hard delete depois seria um DROP de colunas + ajuste
  de repo, isolado da borda.

## Alternativas consideradas

| Alternativa                                   | Por que rejeitada                                                                     |
| --------------------------------------------- | ------------------------------------------------------------------------------------- |
| **Hard delete** (espelho do legado)           | Quebra o padrão de soft-delete do módulo; perde auditoria; ganho marginal.            |
| **VO de referência** (como o front)           | Sem persistência não há ciclo de vida; mas o backend precisa persistir → vira Entity. |
| **Agregado territorial único** (lista de UFs) | Viola "small aggregates"; cria contenção e invariante inexistente entre UFs.          |
| **Esperar D9 ser decidida fora da feature**   | Bloqueia a entrega; a feature é o lugar natural para fechá-la.                        |
