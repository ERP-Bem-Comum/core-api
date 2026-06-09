# Request — PAR-GRID-FILTROS-EXPORT

> Handoff do **front (web-app v2)** para o **core-api**. Padrão `000-request.md`.
> Origem: alinhamento dos grids de **Fornecedores / ACTs / Financiadores** ao legado. Verificado 2026-06-09.
> Consolida gaps menores de **filtros**, **coluna Contratos/Aditivos** e **export CSV** (o de Colaboradores
> está em [PAR-COLLABORATOR-GRID-GAPS](./PAR-COLLABORATOR-GRID-GAPS.md)).

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
