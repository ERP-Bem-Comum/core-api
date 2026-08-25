# PAR-COLLABORATOR-TERRITORY — Território (UF + município) no cadastro de Colaborador

**Status**: todo (aguardando backend)
**Origem**: solicitação do front (web-app v2) — form de **Novo Colaborador** (pré-cadastro) e tela de **detalhe**.
**Relacionado**: a feature 024 introduziu geografia de **parceria** (quais UFs/municípios a organização atende, via `/api/v1/partner-states` e `/api/v1/partner-municipalities`). Este ticket é diferente: pede **território do próprio colaborador** (onde ele atua/reside), persistido no agregado Collaborator.

> ---
> **🔄 Estado verificado no core-api — 2026-06-15** · revisão pós-handoff (o conteúdo abaixo reflete a visão do front em 2026-06-09/14).
>
> - **Já implementado:** nada para o **colaborador**. O campo `territory{uf, municipality}` NÃO existe no agregado (`src/modules/partners/domain/collaborator/types.ts:25-54` — `PersonalFields` + `CollaboratorCore` não têm UF/município), nem na tabela `par_collaborators` (`src/modules/partners/adapters/persistence/schemas/mysql.ts:146-198`), nem no DTO de borda (`src/modules/partners/adapters/http/schemas.ts:105-166` — `collaboratorDetailSchema`, `createCollaboratorBodySchema` e `updateCollaboratorBodySchema` sem `territory`). A geografia que existe é da **parceria** (`par_states`/`par_municipalities`, `mysql.ts:235-281`), entregue pelo ticket de pipeline `PARTNERS-TERRITORY` — cujo escopo é literalmente "Estados/Municípios parceiros" (`.claude/.pipeline/PARTNERS-TERRITORY/000-request.md:1`), **não** o território do colaborador individual.
> - **Escopo real restante:** TUDO. Adicionar `territory{uf, municipality}` (nullable) ao agregado Collaborator, à tabela `par_collaborators` (+ migration), ao `createCollaboratorBodySchema`/`updateCollaboratorBodySchema` e ao `collaboratorDetailSchema`, ligar nos use-cases `register-collaborator`/`edit-collaborator` e no mapper `collaborator.mapper.ts` + `collaborator-dto.ts`.
> - **Veredito:** NÃO FEITO
> ---

## Problema

O cadastro de **Colaborador** (`POST/PUT /api/v1/collaborators`) **não aceita nem retorna** território (UF/município). O contrato atual de criação tem 7 campos (name, email, cpf, occupationArea, role, startOfContract, employmentRelationship) e o detalhe acrescenta só os campos do cadastro completo — **nenhum** campo de estado/município/IBGE.

O front quer coletar no **pré-cadastro**:
- **UF** (dropdown dos estados);
- **Município** (campo aberto, texto livre).

Hoje é impossível: o backend não tem onde guardar. Construir o campo no front sem persistência = **campo morto** (a seleção não vai a lugar nenhum).

**Estado atual do front:** o campo Território **NÃO foi adicionado** (descartado por decisão da stakeholder — "o que precisa de backend a gente descarta"). Quando este ticket for entregue, o front adiciona UF (dropdown) + município (input) no pré-cadastro e exibe no detalhe, com validação na borda.

## Pedido ao backend

Adicionar **território opcional** ao agregado/rotas de **Collaborator**:

```jsonc
"territory": {
  "uf": "string",          // sigla de 2 letras, ex.: "SP" (enum das 27 UFs)
  "municipality": "string" // nome do município (texto livre) OU ibgeCode se preferir normalizar
} // | null
```

- **POST/PUT** `/api/v1/collaborators`: aceitar `territory` (nullable; default null).
- **GET** detalhe/lista: retornar `territory` (ou null).
- Decisão em aberto p/ o backend: município como **texto livre** (mais simples) ou **referência a IBGE** (normalizado, alinhado ao módulo de geografia). O front aceita os dois — preferência por texto livre no pré-cadastro, dado que é entrada rápida.

## Compat
- Aditivo/opcional → não quebra cadastros existentes (`territory` ausente = null).

## Aceite
- POST/PUT de Collaborator aceitam `territory` (UF + município) e persistem.
- GET retorna `territory`.
- Front: adicionar UF (dropdown) + município (input) no pré-cadastro (`collaborator-form`), exibir no detalhe (`collaborator-detail-content`), ligar no controller + mapeador (`core-api-collaborators.ts`) + schemas de borda (io-schemas + response) + i18n.

## Notas
- UF dropdown pode reusar a lista canônica de estados (mesma fonte da geografia de parceria), mas o **vínculo é com o colaborador**, não com a parceria da organização.
- Sem este backend, o front **não** envia `territory` (evita 422 por campo desconhecido).
