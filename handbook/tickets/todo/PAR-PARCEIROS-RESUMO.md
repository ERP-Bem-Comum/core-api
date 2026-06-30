# Resumo — Parceiros (front v2) → Core-API

> Handoff **consolidado** da rodada de alinhamento ao legado dos submódulos de **Parceiros**
> (Colaboradores, Fornecedores, ACTs, Financiadores) + **Estados e Municípios**. Verificado em tela
> (`https://app.localhost`) contra `core-api@dev` em 2026-06-09. Índice dos tickets: `README.md`.

## 1. O que foi entregue no FRONT (sem depender de backend)

### Padrão unificado dos 4 submódulos de Parceiros
- **Grids**: linha clicável (sem coluna "Ações"), **"Itens por página"** (5/10/25), filtros no padrão
  funil + painel, badges de status, CNPJ sem quebra de linha.
- **Forms de inclusão**: card com faixa de título, layout expandido (4 colunas), padrão consistente.
- **Detalhe com edição inline** (Fornecedor/ACT/Financiador, espelhando Colaborador): campos como inputs
  preenchidos (desabilitados) → **Editar** habilita na própria tela → **Salvar/Cancelar/Voltar/Inativar**.
- **Máscaras** CPF `xxx.xxx.xxx-xx`, CNPJ `xx.xxx.xxx/xxxx-xx`, telefone `(xx) xxxxx-xxxx` (átomo `Input`
  com prop `mask`: exibe mascarado, emite dígitos).
- **Fornecedores**: form sem checkboxes (Banco+PIX numa seção).
- **ACT → "Acordo de Cooperação Técnica"**: form em 3 seções; grid `Nº/Parceiro/Título/Status`.
- **Financiador**: grid `Razão Social/Representante Legal/CNPJ/Telefone/Status` (surfaçou `legalRepresentative`).
- **Estados e Municípios** (unificado): redesenho dual-list (Lista Geral + Adicionados) por seção, com
  busca e contadores; **Estados 100% funcional** (add/remover/persistência).
- **Renames** diversos (Novo Colaborador/Fornecedor/Financiador, "Dados do Financiador", etc.).

### Bug de borda corrigido no FRONT (sem ação de backend)
- **`resultFetch` (`external/`)**: `200` sem corpo (PUT/deactivate/reactivate do core-api) virava erro
  `'server'`. Corrigido (2xx vazio = sucesso). Destravou **Salvar/Inativar/Reativar** de todos os parceiros.
  *Opcional no backend: padronizar `204 No Content`.*

## 2. O que o BACKEND precisa fazer (consolidado)

| # | Ticket | Prioridade | Resumo | Impacto no front (hoje) |
|---|---|---|---|---|
| 1 | [PAR-ACT-ACORDO](./PAR-ACT-ACORDO.md) | 🔴 Alta | Reformular o agregado **ACT** (pessoa-física → **Acordo institucional**): `actNumber`, `initialValidityMonths`, `hasFinancialTransfer`, `bankAccount`/`pixKey`, `cnpj`, `corporateName`, `fantasyName`; reaproveitar name(título)/occupationArea(área)/role(representante)/email; **remover CPF/vínculo/início**; list item com `actNumber`+`corporateName`; filtros `tipo(repasse)`+`área`; migração. | **Criar ACT não salva**; campos novos são placeholders *gated*; grid Nº/Parceiro = `—`; filtros Tipo/Área desabilitados |
| 2 | [PAR-GEO-ADDED-MUNICIPALITIES](../done/PAR-GEO-ADDED-MUNICIPALITIES.md) | ✅ Entregue | Endpoint p/ listar **municípios parceiros de todos os estados** (`GET /partner-municipalities` exige UF). | Painel "Municípios Parceiros Adicionados" é **placeholder** |
| 3 | [PAR-SUPPLIER-AVALIACAO](../done/PAR-SUPPLIER-AVALIACAO.md) | ✅ Entregue | Fornecedor: `serviceRating` (definir escala/enum) + `ratingComment`. | 2 campos *gated* no form/detalhe |
| 4 | [PAR-GRID-FILTROS-EXPORT](./PAR-GRID-FILTROS-EXPORT.md) | 🟨 Baixa | Filtros (Fornecedor "Status de contrato"; ACT "Tipo/Área"), coluna **Contratos/Aditivos** (contagem) e **export CSV** dos 4 submódulos. | Filtros *gated*; coluna `—`; "Exportar" sem wiring |
| 5 | [PAR-COLLABORATOR-GRID-GAPS](./PAR-COLLABORATOR-GRID-GAPS.md) | 🟨 Baixa | Colaborador: filtros do painel + coluna Contratos/Aditivos + import/export. | Filtros *gated*; coluna `—` |

### Decisões pendentes (tech lead + P.O.)
- **ACT**: CPF→CNPJ (o Acordo é com instituição), migração dos registros, numeração do instrumento, vigência.
- **Enums do cadastro completo de Colaborador** (gênero/raça/categoria alimentar/escolaridade): hoje texto
  livre no front por falta de listas canônicas — viram `<select>` quando o backend/legado as definir.
- **`registration` (pré/completo)** é conceito **só de Colaborador** — removido do detalhe de ACT no front.

## 3. Observações de modelagem
- **Estados/Municípios** adotam o modelo **toggle `isPartner`** do core-api (não o CRUD do legado
  `ERP-BACKEND`). Estados não dependem de backend; só os municípios "todos os estados" (item #2).
- Municípios podem ser adicionados **independentemente** do estado ser parceiro (confirmado no legado),
  por isso o item #2 precisa de endpoint próprio (não dá para inferir varrendo estados parceiros).
