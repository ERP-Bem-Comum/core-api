# Request — PAR-GEO-ADDED-MUNICIPALITIES

> Handoff do **front (web-app v2)** para o **core-api**. Padrão `000-request.md`.
> Origem: redesenho de **Estados e Municípios** (dual-list "Lista Geral" + "Parceiros Adicionados"),
> fiel ao legado. Verificado em 2026-06-09.

## Título
Listar **municípios parceiros de TODOS os estados** (painel "Municípios Parceiros Adicionados")

## Contexto
A tela foi redesenhada em 2 seções (Estados, Municípios), cada uma com **Lista Geral** (esquerda) e
**Parceiros Adicionados** (direita). Para **Estados** funciona 100% (o `GET /partner-states` já traz as 27
UFs com `isPartner` → o front divide em "geral" e "adicionados"). Para **Municípios**, o painel
"Adicionados" precisa listar os municípios parceiros **de qualquer estado** — e isso **não existe** no
core-api.

## Estado atual (verificado)
- `GET /partner-municipalities?uf=XX` — **exige** a UF; devolve só os municípios daquela UF (com `isPartner`).
- **Não há** endpoint para listar os municípios marcados como parceiros **across-states**.
- Municípios podem ser adicionados **independentemente** do estado ser parceiro (no print, *Arapiraca/AL*
  aparece adicionado sem AL estar nos estados parceiros) → não dá para inferir varrendo os estados parceiros.

## Gap (o que falta no backend)
- **`GET /partner-municipalities/added`** (ou tornar o `uf` opcional em `GET /partner-municipalities`,
  retornando todos os `isPartner = true`) — lista paginável/buscável dos municípios parceiros de todos os
  estados, com `{ ibgeCode, uf, name }`.

## Critérios de Aceitação
1. Endpoint retorna todos os municípios marcados como parceiros (qualquer UF).
2. Suporta busca por nome (e idealmente paginação) — pode haver muitos.
3. O front liga o painel "Municípios Parceiros Adicionados" a ele (hoje é placeholder pendente deste item).

## Nota técnica (front)
- Interim: o painel "Adicionados" de **Municípios** está como **placeholder** ("disponível quando o backend
  listar municípios parceiros de todos os estados"). A **adição/remoção** de municípios segue funcional na
  **Lista Geral** (por UF, via `POST/DELETE /partner-municipalities/:ibgeCode`).
- **Estados** não dependem deste ticket (dual-list completo já implementado).
