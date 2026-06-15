# ADR-0004 (feature 009): Permissões RBAC do Financeiro no catálogo deploy-time do `auth`

**Status**: Proposed

**Data**: 2026-06-15

**Feature**: `specs/009-fin-documentos-titulos/`

**Decisores**: Gabriel (P.O./arquiteto) + agente Financeiro

## Contexto

O `auth` mantém um **catálogo de permissões deploy-time imutável** (`auth/domain/authorization/permission-catalog.ts`),
fonte única consumida por `Role.setPermissions`, `listPermissionsCatalog` e o seed. Os papéis são **dinâmicos** (criados
via `role:create`, `RoleName` branded), não hardcoded. A Fatia 1 exige **separação de funções** (FR-012): o Operador
cria/edita mas **não aprova**; o Aprovador aprova e desfaz aprovação (`titulos-liquidacao.md:10-11`). Hoje o catálogo
não tem permissões do Financeiro.

## Decisão

Declarar as permissões do Financeiro no **catálogo central** (mudança **aditiva**): `fiscal-document:read`,
`fiscal-document:write`, `fiscal-document:cancel`, `payable:read`, `payable:approve` (exclusiva do Aprovador),
`payable:undo-approval`. Os perfis "Operador de Contas a Pagar" e "Aprovador" são **roles compostos** dessas permissões
via RBAC dinâmico — não tipos hardcoded. A borda HTTP exige a permissão correspondente por rota.

## Citação canônica _(obrigatória — princípio IX)_

> **[CITAÇÃO PENDENTE]** — trecho ≥4 linhas (RBAC / separation of duties) via `skills_citar`, indisponível nesta sessão.

## Alternativas consideradas

- **Papéis hardcoded no código** — rejeitada: contraria o desenho de roles dinâmicos do `auth`.
- **Catálogo de permissões local ao módulo Financeiro** — rejeitada: o catálogo é fonte única deploy-time; fragmentar
  quebra `Role.setPermissions ⊆ catálogo`.

## Consequências

- **Positivas**: separação de funções imposta por permissão (Operador ≠ Aprovador); catálogo permanece fonte única.
- **Negativas / trade-offs**: toca um arquivo do `auth` (coordenação cross-módulo) — porém aditivo e deploy-time, sem
  acoplar schemas (respeita ADR-0014).
- **Impacto em BCs / outbox / migrations**: atualizar `CATALOG_RAW` + seed de `auth_permission`. Sem migration de schema.
