# Request — PAR-GRID-FILTROS-EXPORT

> Handoff do **front (web-app v2)** para o **core-api**. Padrão `000-request.md`.
> Origem: alinhamento dos grids de **Fornecedores / ACTs / Financiadores** ao legado. Verificado 2026-06-09.
> Consolida gaps menores de **filtros**, **coluna Contratos/Aditivos** e **export CSV** (o de Colaboradores
> está em [PAR-COLLABORATOR-GRID-GAPS](./PAR-COLLABORATOR-GRID-GAPS.md)).

> ---
> **🔄 Estado verificado no core-api — 2026-06-15** · revisão pós-handoff (conteúdo abaixo = visão do front em 2026-06-09/14).
>
> - **Já implementado:**
>   - **Export CSV — 4/4 prontos.** Supplier `GET /api/v1/suppliers/export` (`src/modules/partners/adapters/http/supplier-plugin.ts:144-165`, ticket `PARTNERS-SUPPLIER-EXPORT-HTTP` closed-green), Act `GET /api/v1/acts/export` (`act-plugin.ts:131-152`), Collaborator `GET /api/v1/collaborators/export` (`plugin.ts:152-176`), Financier `GET /api/v1/financiers/export` (`financier-plugin.ts:113-135`) — os 3 últimos via `PARTNERS-EXPORT-PARITY-HTTP` (closed-green, W1 2026-06-07). **Todo o item 3 do ticket está entregue.**
>   - **Filtros de ACT — ambos prontos.** `hasFinancialTransfer` ("Com/Sem Repasse") e `occupationArea` ("Área de Atuação", enum `PARC|DDI|DCE|EPV`) existem em `act-schemas.ts:63-71` (linhas `69`/`70`) e filtram de fato em `act-list-query.ts:15-24`. **2 dos 3 filtros do item 1 estão entregues.**
> - **Escopo real restante:**
>   - **Filtro "Status de contrato" no Supplier — AUSENTE.** `ListSuppliers` só tem `search`/`active`/`categories` (`supplier-schemas.ts:17-24`). Depende de vínculo supplier↔contrato, que não existe (gap legítimo, cross-módulo).
>   - **Coluna Contratos/Aditivos (contagem) — AUSENTE nos 4 tipos.** Nenhum read-record/DTO de lista traz `contractsCount`/`amendmentsCount` (`supplier-reader.ts:14-19`, `act-reader.ts:13-18`, `collaborator-reader.ts:17-22`, `financier-reader.ts:11-15`; DTOs mapeiam 1:1 sem agregação). Exige projeção cross-módulo de Contracts — é o gap funcional principal não-entregue (item 2 inteiro).
> - **Veredito:** PARCIAL (~70% feito) — export 100% e filtros de ACT 100%; faltam o filtro "status de contrato" do Supplier e a coluna de contagem Contratos/Aditivos (ambos dependem de vínculo/projeção com o módulo Contracts).
> ---

> **🧭 Decisão (2026-06-15) — itens cross-módulo ADIADOS.** A coluna Contratos/Aditivos (4 tipos) e o filtro
> "status de contrato" (Supplier) exigem `partners → contracts`. Painel arquitetural unânime (DDD + dados +
> Clean/YAGNI): **não** fazer por port síncrono — criaria ciclo `contracts ⇄ partners`, contra ADR-0006.
> Saída canônica = **read-model materializado via outbox (ADR-0022)**, conforme
> `handbook/architecture/adr/0032-transient-http-composition-read-until-bff.md:87`. Adiado por YAGNI (front
> não bloqueado). Implementar como read-model quando virar requisito firme. Export (4/4) e filtros de ACT
> já entregues.

## Título
Grids de Parceiros — filtros faltantes, contagem Contratos/Aditivos e export CSV

## Gaps por tema

### 1. Filtros sem suporte no `List…Input` (hoje **gated**/desabilitados no front)
| Submódulo | Filtro (UI) | Backend |
|---|---|---|
| Fornecedor | **Status de contrato** | adicionar ao `ListSuppliersInput` (depende de vínculo supplier↔contrato) |
| ACT | **Tipo: Com/Sem Repasse** | filtro por `hasFinancialTransfer` (ver [PAR-ACT-ACORDO](./PAR-ACT-ACORDO.md)) |
| ACT | **Área de Atuação** | filtro por `occupationArea` no `ListActsInput` (combo já populado) |

Filtros **reais já ligados** (não precisam de backend): busca textual + Status (ativo/inativo) +
Categoria de serviço (Fornecedor).

### 2. Coluna **Contratos/Aditivos** (contagem) — hoje `—`
- **Fornecedor** e **ACT** (e Colaborador, já no outro ticket): o **list item** não traz a contagem de
  contratos/aditivos do parceiro. → incluir `contractsCount`/`amendmentsCount` (ou um agregado) no list item.

### 3. **Export CSV** (botões "Exportar" presentes, sem wiring)
- Fornecedor, ACT, Financiador (e Colaborador): confirmar/expor endpoint de **export CSV** por tipo de
  parceiro (Supplier já tem passthrough — confirmar). → o front liga o botão quando o endpoint existir.

## Critérios de Aceitação
1. Os filtros listados filtram a lista de fato (input + where/índices no repo).
2. A coluna Contratos/Aditivos exibe a contagem real (Fornecedor/ACT).
3. "Exportar" gera o CSV ponta a ponta nos 4 submódulos.

## Nota técnica (front)
- Os selects gated do painel de filtros já vêm populados (ex.: Área de Atuação com `PARC/DDI/DCE/EPV`) e
  desabilitados com `title` "Disponível quando o backend suportar este filtro". É só habilitar + ligar à query.
